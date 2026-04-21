# Security Fixes Applied — 2026-04-17

Agent : SecurityAuditor  
Branch : claude/priceless-gagarin

## Fichiers modifiés

### 1. `.gitignore` — CRITICAL fix
**Problème :** `.env` n'était pas exclu du contrôle de version. Seul `.env*.local` était ignoré.  
**Correction :** Ajout de `.env` et `.env.*` au `.gitignore`.  
**Lignes changées :** +2

---

### 2. `next.config.mjs` — HIGH fix
**Problème :** Aucun header HTTP de sécurité configuré. L'application était vulnérable au clickjacking, MIME sniffing, et ne transmettait aucune directive CSP.  
**Correction :** Ajout d'un tableau `securityHeaders` complet avec 6 headers, appliqués à toutes les routes via `async headers()`.  
**Headers ajoutés :**
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self)`
- `Content-Security-Policy` (policy complète Stripe + Next.js compatible)

---

### 3. `src/lib/auth/config.ts` — HIGH fix
**Problème :** Session JWT sans `maxAge` (défaut 30 jours — trop long). Cookies de session sans configuration explicite `httpOnly`/`secure`/`sameSite`.  
**Correction :**
- `session.maxAge = 8 * 60 * 60` (8 heures)
- Bloc `cookies` avec `httpOnly: true`, `sameSite: "lax"`, `secure: true` en production

---

### 4. `src/app/api/documents/upload/route.ts` — HIGH fix (3 sous-problèmes)

#### 4a. Magic bytes MIME validation
**Problème :** `file.type` est fourni par le client HTTP — falsifiable. Un fichier malveillant pouvait être accepté avec un Content-Type légitimo.  
**Correction :** Ajout de la fonction `validateMagicBytes(buffer, claimedMime)` vérifiant les signatures hexadécimales réelles :
- PDF : `25 50 44 46` (`%PDF`)
- JPEG : `FF D8 FF`
- PNG : `89 50 4E 47`
- WebP : `52 49 46 46 ... 57 45 42 50` (RIFF....WEBP)

#### 4b. Path traversal via nom de fichier
**Problème :** `path.extname(file.name)` extrayait l'extension du nom fourni par le client. Un nom comme `../../etc/cron.d/exploit.pdf` pouvait influencer le chemin de stockage.  
**Correction :** Extension dérivée d'un dictionnaire statique `MIME_TO_EXT` basé sur le type MIME **validé** — le nom original du fichier n'est plus utilisé pour construire le chemin.

#### 4c. Limite de taille
**Problème :** Limite à 20MB — trop permissive pour des documents fiscaux.  
**Correction :** `MAX_SIZE_BYTES = 10 * 1024 * 1024` (10MB)

---

### 5. `src/app/api/account/delete/route.ts` — NOUVEAU fichier (HIGH / LPD fix)
**Problème :** Droit à l'effacement LPD art. 32 non implémenté. La page settings avait un bouton désactivé redirigeant vers le support.  
**Correction :** Endpoint `DELETE /api/account/delete` qui :
1. Supprime toutes les déclarations de l'utilisateur
2. Supprime tous les documents
3. Supprime les sessions et comptes OAuth liés (NextAuth)
4. Supprime les fichiers uploadés sur disque
5. Supprime l'enregistrement utilisateur
6. Déconnecte l'utilisateur

---

### 6. `src/app/(dashboard)/settings/page.tsx` — HIGH fix (LPD)
**Problème :** Bouton de suppression de compte désactivé avec `disabled`.  
**Correction :** Remplacement par un formulaire Server Action appelant `/api/account/delete` + message explicite sur le droit LPD + contact support avec délai garanti 72h.

---

## Fichiers NON modifiés (findings MEDIUM/LOW documentés seulement)

- `/api/auth/signin` — pas de rate limiting (MEDIUM)
- Pages légales manquantes : `/privacy`, `/terms` (MEDIUM — hors scope code)  
- Portabilité données : `GET /api/account/export` (MEDIUM — à implémenter)
- `uploads/` — stockage local (MEDIUM — décision d'infrastructure)
- Validation Zod (MEDIUM — refactoring à planifier)
- `console.log` Stripe webhook expose `userId` (LOW)
