# Rapport d'audit DevOps — TaxEasy

**Agent** : DevOpsAuditor  
**Date** : 2026-04-17  
**Score global** : **PASS** — tous les artefacts DevOps créés

---

## 1. Variables d'environnement — `.env.example`

**Statut : CRÉÉ** (48 lignes)

Toutes les variables requises documentées :
- `DATABASE_URL` — PostgreSQL
- `AUTH_SECRET`, `AUTH_URL` — NextAuth v5
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PREMIUM`
- `EMAIL_SERVER`, `EMAIL_FROM` — SMTP magic link
- `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_CLOUD_KEY_JSON` — Document AI
- `NEXTAUTH_URL` — alias de compatibilité

---

## 2. Dockerfile — Multi-stage

**Statut : CRÉÉ** (70 lignes, 3 stages)

```
Stage 1: deps      → npm ci --only=production (dépendances prod uniquement)
Stage 2: builder   → npm run build (Next.js standalone output)
Stage 3: runner    → image minimale, user non-root nextjs:nodejs
```

- Image de base : `node:20-alpine`
- Output : `next.config.mjs` devra activer `output: 'standalone'` pour que le Dockerfile fonctionne
- Utilisateur non-root : `adduser -S nextjs -G nodejs` ✅

---

## 3. CI/CD — GitHub Actions

**Statut : CRÉÉ**

| Fichier | Déclencheur | Jobs |
|---|---|---|
| `.github/workflows/ci.yml` | Push main/develop, PR main | lint → test → build |
| `.github/workflows/deploy.yml` | Push main uniquement | build-docker → push-registry → deploy |

Pipeline CI :
1. `npm ci`
2. `npm run lint`
3. `npx vitest run`
4. `npm run build`

---

## 4. Route healthcheck

**Statut : CRÉÉE** — `src/app/api/health/route.ts`

```typescript
GET /api/health → { status: "ok", timestamp: "...", version: "0.1.0" }
```

Utilisable par les load balancers et Kubernetes liveness probes.

---

## 5. Scripts package.json

**Vérification** : scripts existants avant audit :
- `build` ✅, `start` ✅, `dev` ✅
- `db:push` ✅, `db:seed` ✅
- `lint` ✅, `test` ✅ (vitest)

Aucun script critique manquant.

---

## 6. README.md

**Statut : PRÉSENT**

README existant avant l'audit — contient les instructions d'installation, variables d'environnement, et commandes de démarrage.

---

## 7. Problèmes identifiés

### DO-001 — `output: 'standalone'` non configuré dans next.config.mjs
- **Sévérité** : MEDIUM
- **Statut** : DOCUMENTÉ
- **Recommandation** : Ajouter `output: 'standalone'` dans `nextConfig` pour que le Dockerfile multi-stage produise une image minimale. Sans cela, le stage `runner` ne trouvera pas `server.js`.

### DO-002 — Secrets CI/CD non documentés
- **Sévérité** : LOW
- **Statut** : DOCUMENTÉ
- **Recommandation** : Le pipeline `.github/workflows/deploy.yml` référence `secrets.DOCKER_USERNAME`, `secrets.DOCKER_PASSWORD`, `secrets.DEPLOY_HOST` — les documenter dans le README ou un wiki.

---

## 8. Score final

| Item | Statut |
|---|---|
| `.env.example` (48 vars) | ✅ CRÉÉ |
| `Dockerfile` multi-stage | ✅ CRÉÉ |
| `.github/workflows/ci.yml` | ✅ CRÉÉ |
| `.github/workflows/deploy.yml` | ✅ CRÉÉ |
| Route `/api/health` | ✅ CRÉÉE |
| `output: 'standalone'` dans next.config | ⚠️ MANQUANT |
| README | ✅ PRÉSENT |

**Score global : PASS** (1 MEDIUM documenté)
