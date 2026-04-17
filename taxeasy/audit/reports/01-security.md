# Rapport d'audit sécurité — TaxEasy

**Date :** 2026-04-17  
**Auditeur :** SecurityAuditor (agent IA)  
**Périmètre :** `src/` — API routes, auth, upload, configuration  
**Score global : FAIL — 4 HIGH corrigés, 2 MEDIUM documentés**

---

## Résumé exécutif

L'application présente une architecture globalement saine : Prisma avec filtrage systématique par `userId` (aucun IDOR natif détecté), pas de secrets hardcodés dans le code source, signature Stripe correctement vérifiée. Les problèmes majeurs identifiés concernaient la configuration défensive (headers HTTP absents, cookies de session non durcis, validation MIME insuffisante, `.env` non exclu du git).

---

## 1.1 — Authentification & Sessions

### NEXTAUTH_SECRET configuré ?
**✅ PASS** — `AUTH_SECRET` présent dans `.env` (Auth.js v5 utilise `AUTH_SECRET`, pas `NEXTAUTH_SECRET`). Les deux sont présents.

### maxAge défini ?
**❌ FAIL — corrigé (HIGH)**  
La session JWT n'avait pas de `maxAge` explicite. Sans cette valeur, Auth.js utilise 30 jours par défaut — trop long pour une application fiscale manipulant des données sensibles.

**Correction appliquée dans `src/lib/auth/config.ts` :**
```ts
session: {
  strategy: "jwt",
  maxAge: 8 * 60 * 60, // 8 heures
},
```

### Cookies httpOnly / secure / sameSite ?
**❌ FAIL — corrigé (HIGH)**  
Aucune configuration explicite des cookies de session. Les valeurs par défaut d'Auth.js sont correctes en production mais ne sont pas garanties en cas d'évolution de la bibliothèque.

**Correction appliquée dans `src/lib/auth/config.ts` :**
```ts
cookies: {
  sessionToken: {
    name: "__Secure-next-auth.session-token",
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    },
  },
},
```

### Rate limiting sur /api/auth/* ?
**⚠️ WARNING (MEDIUM — non corrigé dans ce PR)**  
Aucun rate limiting sur les endpoints de magic link. Un attaquant peut spammer `POST /api/auth/signin` avec n'importe quelle adresse email, causant un abus SMTP et une énumération d'emails.

**Recommandation :** Intégrer `@upstash/ratelimit` ou le rate limiting Vercel Edge sur `/api/auth/signin`.

### Expiration des magic links ?
**✅ PASS** — Nodemailer provider utilise le token en base avec expiration par défaut de 24h (géré par PrismaAdapter + `VerificationToken`).

### Protection dashboard sans session ?
**✅ PASS** — `src/app/(dashboard)/layout.tsx` appelle `requireAuth()` qui redirige vers `/login` si pas de session.

---

## 1.2 — Autorisation & Isolation (IDOR)

### GET/PATCH/DELETE /api/declarations/[id]/route.ts
**✅ PASS** — Chaque opération filtre par `session.user.id` via `getDeclarationById(id, session.user.id)` et `deleteDeclaration(id, session.user.id)`. Prisma utilise `findFirst({ where: { id, userId } })` — un user ne peut pas accéder aux données d'un autre.

### PUT /api/declarations/[id]/answers/route.ts
**✅ PASS** — `updateDeclarationAnswers(id, session.user.id, ...)` utilise `updateMany({ where: { id, userId } })`.

### POST /api/declarations/[id]/export/route.ts
**✅ PASS** — `getDeclarationById(params.id, session.user.id)` vérifie la propriété avant génération.

### POST /api/documents/upload/route.ts
**✅ PASS** — Document créé avec `userId: session.user.id`. Les queries `updateDocumentOcr` et `deleteDocument` filtrent par `userId`.

### Conclusion IDOR
**Aucun IDOR détecté.** Toutes les queries DB scoped au `userId` de la session courante.

---

## 1.3 — Upload de fichiers

### Validation MIME type (magic bytes)
**❌ FAIL — corrigé (HIGH)**  
Le code vérifiait `file.type` — une valeur fournie par le **client** qui peut être falsifiée. Un attaquant pouvait uploader un fichier malveillant avec `Content-Type: application/pdf` mais un contenu HTML/JS/shell.

**Correction appliquée dans `src/app/api/documents/upload/route.ts` :**
- Ajout de la fonction `validateMagicBytes()` qui vérifie les 4-12 premiers octets réels du buffer
- Appelée après lecture du buffer, avant écriture sur disque

### Limite taille fichier
**❌ FAIL — corrigé (HIGH)**  
La limite était de 20MB. Pour des documents fiscaux (PDF, JPEG), 10MB est amplement suffisant et réduit la surface d'attaque DoS.

**Correction :** `MAX_SIZE_BYTES = 10 * 1024 * 1024` (10MB)

### Path traversal dans les noms de fichiers
**❌ FAIL — corrigé (HIGH)**  
Le code utilisait `path.extname(file.name)` pour récupérer l'extension depuis le nom original du fichier, qui peut contenir `../../../etc/passwd.pdf`. Même si `safeFilename` préfixe avec un UUID, l'extension était issue du nom client.

**Correction :** Extension dérivée du MIME type validé via dictionnaire statique `MIME_TO_EXT`, le nom original n'est plus utilisé pour construire le chemin de stockage.

### Fichiers servis en URL publique ?
**⚠️ WARNING (MEDIUM)**  
Le dossier `uploads/` est situé dans `process.cwd()` (racine du projet). Dans le déploiement Next.js standard (Vercel/Node), ce répertoire n'est **pas** servi statiquement. Cependant :
- En dev, si un proxy sert statiquement la racine, les fichiers pourraient être exposés
- En production, recommander le stockage sur S3/R2 avec URLs signées

**Non corrigé dans ce PR** (nécessite un choix d'infrastructure).

---

## 1.4 — API & Injections

### Injection SQL
**✅ PASS** — Prisma ORM utilisé partout. Aucune query SQL brute détectée.

### Validation Zod sur les bodies API
**⚠️ WARNING (MEDIUM)**  
Les bodies sont validés manuellement (vérification de type, whitelist de valeurs) mais sans schema Zod formel. Le risque est faible grâce au typage TypeScript, mais Zod apporterait des messages d'erreur standardisés et une validation plus robuste.

**Recommandation :** Ajouter Zod pour les routes `POST /api/declarations` et `PUT /api/declarations/[id]/answers`.

### Headers sécurité dans next.config.mjs
**❌ FAIL — corrigé (HIGH)**  
Aucun header de sécurité configuré. Manquaient : `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`, `Permissions-Policy`, `Content-Security-Policy`.

**Correction appliquée dans `next.config.mjs` :**
- `X-Frame-Options: DENY` — anti-clickjacking
- `X-Content-Type-Options: nosniff` — anti-MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Permissions-Policy` — caméra, micro, géolocalisation désactivés
- `Content-Security-Policy` — restrict scripts, styles, frames, objects

### Secrets hardcodés
**✅ PASS** — Aucun secret (`sk_live`, `sk_test`, `AIza`, `password=...`) détecté dans le code source. Toutes les clés passent par `process.env`.

### .env dans .gitignore
**❌ FAIL — corrigé (CRITICAL)**  
Le `.gitignore` excluait `.env*.local` mais **pas** `.env`. Le fichier `.env` contenant `AUTH_SECRET`, `DATABASE_URL` et autres secrets était potentiellement commitable.

**Correction dans `.gitignore` :**
```
.env
.env.*
.env*.local
```

---

## 1.5 — Conformité LPD

### CGU / Politique de confidentialité
**⚠️ WARNING (MEDIUM)**  
Aucune page `/privacy` ni `/terms` détectée dans `src/app/`. La landing page mentionne "données chiffrées — jamais partagées" et "hébergés en Suisse" mais sans document légal formel.

**Recommandation :** Créer `/privacy` et `/terms` avant mise en production (obligation légale LPD).

### Mécanisme de suppression de compte (droit à l'effacement — LPD art. 32)
**❌ FAIL — corrigé (HIGH)**  
La page settings avait un bouton désactivé "contactez le support". Le droit à l'effacement LPD exige un mécanisme automatisé ou un délai garanti de 30 jours.

**Corrections appliquées :**
1. Nouveau endpoint `DELETE /api/account/delete` créé dans `src/app/api/account/delete/route.ts`
   - Supprime déclarations, documents, exports, sessions NextAuth, fichiers locaux, puis l'utilisateur
   - Déconnecte l'utilisateur après suppression
2. Page settings mise à jour avec bouton fonctionnel + message LPD explicite + délai 72h mentionné

### Export données personnelles (portabilité)
**⚠️ WARNING (MEDIUM)**  
Aucun endpoint d'export des données personnelles (JSON/CSV). Requis par la LPD pour la portabilité.

**Recommandation :** Créer `GET /api/account/export` retournant un ZIP des données utilisateur.

### Tracking tiers sur pages post-login
**✅ PASS** — Aucun Google Analytics, Meta Pixel, ou autre tracker tiers détecté dans le code. La landing page ne charge que Next.js/Tailwind.

---

## 1.6 — Données sensibles en transit

### Montants fiscaux en query params GET
**✅ PASS** — Le seul paramètre GET dans les routes API est `format` dans `/api/declarations/[id]/export?format=PDF`. Aucun montant fiscal en query param.

### console.log avec données sensibles
**⚠️ WARNING (LOW)**  
`/api/webhooks/stripe/route.ts` ligne 61 : `console.log([stripe-webhook] Plan ${plan} activé pour user ${userId})` — expose `userId` dans les logs. Non critique (c'est un ID interne, pas de données fiscales), mais mieux vaut anonymiser.

**Non corrigé** (LOW priority).

### Stack traces dans les réponses d'erreur
**✅ PASS** — Les routes retournent des messages d'erreur génériques (`{ error: "Erreur lors de la génération..." }`). Les `console.error(err)` vont dans les logs serveur, pas dans la réponse HTTP.

---

## Récapitulatif des findings

| # | Sévérité | Statut | Fichier(s) | Description |
|---|----------|--------|------------|-------------|
| 1 | CRITICAL | ✅ Corrigé | `.gitignore` | `.env` non exclu — secrets potentiellement committables |
| 2 | HIGH | ✅ Corrigé | `next.config.mjs` | Headers sécurité absents (CSP, X-Frame-Options, HSTS…) |
| 3 | HIGH | ✅ Corrigé | `src/lib/auth/config.ts` | Session sans maxAge, cookies sans httpOnly/secure/sameSite |
| 4 | HIGH | ✅ Corrigé | `src/app/api/documents/upload/route.ts` | MIME validé côté client uniquement (magic bytes absents) |
| 5 | HIGH | ✅ Corrigé | `src/app/api/documents/upload/route.ts` | Path traversal via `path.extname(file.name)` |
| 6 | HIGH | ✅ Corrigé | `src/app/api/documents/upload/route.ts` | Limite upload 20MB → réduite à 10MB |
| 7 | HIGH | ✅ Corrigé | `src/app/api/account/delete/route.ts` (nouveau) | Droit à l'effacement LPD non implémenté |
| 8 | MEDIUM | ⚠️ Documenté | `/api/auth/signin` | Pas de rate limiting sur magic link |
| 9 | MEDIUM | ⚠️ Documenté | `src/app/(marketing)/` | Pas de page Politique de confidentialité / CGU |
| 10 | MEDIUM | ⚠️ Documenté | — | Pas d'export portabilité données (LPD) |
| 11 | MEDIUM | ⚠️ Documenté | `uploads/` | Fichiers stockés localement — passer à S3/R2 + URLs signées en prod |
| 12 | MEDIUM | ⚠️ Documenté | API routes | Validation Zod absente sur bodies (validation manuelle présente) |
| 13 | LOW | ⚠️ Documenté | `webhooks/stripe/route.ts` | `console.log` expose `userId` dans les logs |

**CRITICAL : 1 corrigé / 1 total**  
**HIGH : 6 corrigés / 6 total**  
**MEDIUM : 0 corrigé / 5 total (documentation uniquement)**  
**LOW : 0 corrigé / 1 total**

---

## Score final

> **FAIL** — les 7 findings CRITICAL/HIGH ont été corrigés automatiquement dans ce run. L'application peut passer en production après résolution des MEDIUM (rate limiting, pages légales, portabilité données) dans un prochain sprint.
