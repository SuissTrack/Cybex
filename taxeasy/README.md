# 🇨🇭 TaxEasy

> Déclaration d'impôt genevoise automatisée — guide AFC-GE 2025

[![CI](https://github.com/your-org/taxeasy/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/taxeasy/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

TaxEasy guide les contribuables genevois à travers chaque étape de leur déclaration d'impôt 2025. Calcul ICC + IFD en temps réel, OCR automatique des documents fiscaux, export natif GeTax `.tax` (v1.03).

---

## Table des matières

- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Architecture](#architecture)
- [Démarrage rapide](#démarrage-rapide)
- [Variables d'environnement](#variables-denvironnement)
- [Base de données](#base-de-données)
- [Tests](#tests)
- [Moteur fiscal 2025](#moteur-fiscal-2025)
- [Arbre de décision](#arbre-de-décision)
- [Export GeTax](#export-getax)
- [CI/CD](#cicd)
- [Conformité & sécurité](#conformité--sécurité)
- [Roadmap](#roadmap)

---

## Fonctionnalités

| Fonctionnalité | FREE | BASIC | PREMIUM |
|---|:---:|:---:|:---:|
| Wizard guidé (toutes sections) | ✓ | ✓ | ✓ |
| Calcul ICC + IFD temps réel | ✓ | ✓ | ✓ |
| Export PDF récapitulatif | ✓ | ✓ | ✓ |
| Export GeTax `.tax` (v1.03) | — | ✓ | ✓ |
| OCR automatique (certificat salaire, LPP…) | 1 doc | ∞ | ∞ |
| Splitting conjoint & monoparental | ✓ | ✓ | ✓ |
| Formulaires F2, F3, DA-1 | — | ✓ | ✓ |
| Déclarations illimitées | — | — | ✓ |
| Historique multi-années | — | — | ✓ |

**Situations couvertes :** salariés, retraités, familles avec enfants, propriétaires occupants, contribuables avec titres/dividendes, TOU (Taxation Ordinaire Ultérieure).

**Nouveautés 2025 intégrées :**
- Allocations familiales intégrées dans le salaire brut (certificat de salaire)
- Rachats rétroactifs 3A (10 dernières années non cotisées)
- Nouveaux barèmes ICC réformés
- Camps de vacances déductibles CHF 250/semaine
- Revalorisation valeurs immobilières fiscales +12 %
- CRV (Contribution Religieuse Volontaire) — optionnelle
- GeTax v1.03

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | Next.js 14 (App Router) · TypeScript strict · Tailwind CSS · shadcn/ui |
| Backend | Next.js API Routes · Prisma ORM |
| Base de données | PostgreSQL 16 |
| Auth | NextAuth.js v5 (magic link + credentials dev) |
| OCR | Google Document AI (mock automatique en dev) |
| PDF | pdf-lib |
| Paiement | Stripe + webhooks |
| State | Zustand (wizard store) |
| Tests | Vitest (unit) · Playwright (E2E) |
| Linting | ESLint · Prettier · Husky pre-commit · lint-staged |
| CI/CD | GitHub Actions → Vercel |

---

## Architecture

```
taxeasy/
├── .github/workflows/
│   ├── ci.yml          # lint → test → build (→ E2E sur PR)
│   └── deploy.yml      # migrate → deploy Vercel → smoke test
│
├── prisma/
│   ├── schema.prisma   # User, Declaration, Document, Export + enums
│   └── seed.ts         # Utilisateurs demo (alice PREMIUM, bob FREE)
│
├── src/
│   ├── app/
│   │   ├── (auth)/         # /login, /register
│   │   ├── (dashboard)/    # /dashboard, /declaration/[id], /documents
│   │   ├── (marketing)/    # / (landing page)
│   │   └── api/            # Auth · Declarations · Documents · Webhooks
│   │
│   ├── lib/
│   │   ├── decision-tree/  # Moteur wizard (engine, evaluator, trees)
│   │   ├── tax-calculator/ # Moteur fiscal ICC+IFD+Fortune 2025
│   │   ├── ocr/            # Abstraction OCR (mock + Google Document AI)
│   │   ├── pdf/            # Génération PDF + export GeTax XML
│   │   ├── auth/           # NextAuth config + session helpers
│   │   ├── db/             # Prisma singleton + queries
│   │   └── stripe/         # Client + plans
│   │
│   ├── components/
│   │   ├── wizard/         # WizardShell, StepRenderer, steps/
│   │   ├── declaration/    # TaxSummary, TaxBreakdown, ExportButtons
│   │   └── documents/      # DocumentCard, OcrStatusBadge
│   │
│   ├── stores/             # Zustand wizard store
│   ├── hooks/              # useWizard, useDocumentUpload
│   └── types/              # declaration, document, wizard, tax
│
└── tests/
    ├── unit/               # 83 tests — decision-tree + tax-calculator
    └── e2e/                # Playwright — wizard salarié, marié, upload
```

---

## Démarrage rapide

### Prérequis

- Node.js ≥ 20
- Docker (pour PostgreSQL + Redis en local)
- npm ≥ 10

### 1. Cloner et installer

```bash
git clone https://github.com/your-org/taxeasy.git
cd taxeasy
npm install
```

### 2. Démarrer la base de données

```bash
docker-compose up -d
# PostgreSQL sur :5432 · Redis sur :6379
```

### 3. Configurer l'environnement

```bash
cp .env.example .env
# Éditez .env — seul DATABASE_URL est obligatoire pour commencer
```

### 4. Initialiser la base de données

```bash
npm run db:generate   # génère le client Prisma
npm run db:migrate    # applique les migrations
npm run db:seed       # crée les utilisateurs demo
```

### 5. Lancer le serveur de développement

```bash
npm run dev
# → http://localhost:3000
```

**Comptes demo (après seed) :**

| Email | Plan | Commune |
|---|---|---|
| `alice@taxeasy.ch` | PREMIUM | Genève-Ville |
| `bob@taxeasy.ch` | FREE | Carouge |

En mode dev, saisissez n'importe quel mot de passe — le provider `Credentials` est actif uniquement hors production.

### 6. Supprimer le fichier scaffold

```bash
# Requis pour éviter le conflit de route Next.js (app/page.tsx vs (marketing)/page.tsx)
rm src/app/page.tsx
```

---

## Variables d'environnement

| Variable | Obligatoire | Description |
|---|:---:|---|
| `DATABASE_URL` | ✓ | PostgreSQL — `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_URL` | ✓ | URL publique de l'app (ex: `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | ✓ | Secret NextAuth — `openssl rand -base64 32` |
| `EMAIL_SERVER_HOST` | prod | SMTP host pour magic link |
| `EMAIL_SERVER_PORT` | prod | SMTP port |
| `EMAIL_SERVER_USER` | prod | SMTP user |
| `EMAIL_SERVER_PASSWORD` | prod | SMTP password |
| `EMAIL_FROM` | prod | Adresse expéditeur |
| `GOOGLE_PROJECT_ID` | prod | Google Cloud projet pour Document AI |
| `GOOGLE_LOCATION` | prod | Région Document AI (ex: `eu`) |
| `GOOGLE_PROCESSOR_ID` | prod | ID du processeur Document AI |
| `STRIPE_SECRET_KEY` | prod | Clé secrète Stripe |
| `STRIPE_WEBHOOK_SECRET` | prod | Secret webhook Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` | prod | Clé publique Stripe |
| `STORAGE_TYPE` | — | `local` (dev) ou `s3` (prod) |
| `S3_BUCKET` | prod | Bucket S3 pour les documents |
| `REDIS_URL` | — | Redis pour rate-limiting (optionnel en dev) |

> **OCR :** Si `GOOGLE_PROJECT_ID` est absent, le mock OCR est utilisé automatiquement — aucune configuration requise en développement.

---

## Base de données

### Schéma principal

```
User ──< Declaration ──< Document
                    ──< Export
```

- **`Declaration.answers`** : JSON — réponses du wizard (`{ nodeId: answer }`)
- **`Declaration.computedTax`** : JSON — résultat du calculateur fiscal
- **Tous les montants en centimes** (integers) en base de données

### Commandes utiles

```bash
npm run db:generate   # Régénérer le client Prisma après modification du schéma
npm run db:migrate    # Créer et appliquer une nouvelle migration
npm run db:seed       # Peupler avec les données de demo
npm run db:studio     # Ouvrir Prisma Studio (interface graphique)
```

---

## Tests

```bash
npm test              # Vitest — 83 tests unitaires
npm run test:watch    # Mode watch
npm run test:e2e      # Playwright E2E (serveur requis)
```

### Structure des tests unitaires

```
tests/unit/
├── decision-tree/
│   ├── evaluator.test.ts   # 10 tests — tous les opérateurs (eq, in, gt…)
│   └── engine.test.ts      # 33 tests — routing, buildPath, validateAnswer
└── tax-calculator/
    ├── icc-2025.test.ts     # 8 tests — barèmes, splitting, taux communaux
    ├── deductions.test.ts   # 20 tests — toutes les déductions avec CHF réels
    ├── fortune-2025.test.ts # 5 tests — franchises, impôt, dettes
    └── splitting.test.ts    # 6 tests — marié < mono < célibataire (progressivité)
```

---

## Moteur fiscal 2025

Tous les calculs sont dans `src/lib/tax-calculator/`. Les montants sont **toujours en centimes** (CHF × 100).

### Barèmes ICC 2025

Pipeline de calcul :

```
Revenu brut
  − AVS/AI/APG + AC + AANP (obligatoires)
  − LPP obligatoires
  − Frais professionnels (forfait 3%, max CHF 4'000 ou effectifs)
  − Déductions spécifiques (3A, 3B, LAMal, frais médicaux, etc.)
= Revenu net imposable ICC
  × Barème progressif ICC 2025 (13 tranches, 0 → 21 %)
  × Facteur de splitting
  × Coefficient communal
= ICC cantonal + ICC communal
```

**Splitting :**
- Marié / partenaire : taux sur 50 % du revenu cumulé (splitting complet)
- Famille monoparentale : taux sur 55.56 % du revenu (splitting partiel)
- Célibataire / divorcé : taux sur 100 %

### Barèmes IFD 2025

Règles fédérales — différences clés vs ICC :
- Transport voiture : CHF 0.70/km, max CHF 3'200 (vs forfait CHF 529 ICC)
- LAMal + 3B combinés : max CHF 3'500 (célibataire) / CHF 7'000 (couple)
- Déduction conjoint : 50 % du revenu le moins élevé, CHF 8'500–13'900

### Fortune 2025

Franchises (indexées) :
- Célibataire : CHF 87'632
- Couple : CHF 175'264
- Par enfant : CHF 43'816

### Communes (45 taux)

Quelques exemples :

| Commune | Taux | | Commune | Taux |
|---|---|---|---|---|
| Genève-Ville | 45.5 % | | Plan-les-Ouates | 40.0 % |
| Carouge | 49.5 % | | Genthod | 38.0 % |
| Lancy | 51.0 % | | Onex | 53.0 % |
| Grand-Saconnex | 45.0 % | | Avully | 55.0 % |

---

## Arbre de décision

Le wizard est piloté par un moteur d'arbre de décision (`src/lib/decision-tree/`) :

```
residency_type
  └─ resident_ge → family_status
       ├─ married → spouse_work → spouse_deduction → children
       └─ autres  → monoparental_check → children
                                              └─ children_count
                                                   └─ children_age_check
                                                        └─ children_custody
                                                              └─ income_main
                                                                   └─ salary_upload
                                                                        └─ [deductions…]
                                                                              └─ [fortune…]
                                                                                    └─ summary ✓
```

**Évaluation des conditions :**
- Opérateurs : `eq`, `neq`, `in`, `not_in`, `gt`, `gte`, `lt`, `lte`, `exists`
- Logique : AND (toutes les conditions d'une règle doivent être vraies)
- Première règle correspondante gagne (court-circuit)

**Auto-save :** chaque réponse est persistée via `PUT /api/declarations/[id]/answers` avant de passer au nœud suivant. Le calcul fiscal complet est déclenché à l'atteinte du nœud terminal `summary`.

---

## Export GeTax

### Format `.tax`

Le fichier `.tax` est une archive ZIP contenant :
- `declaration.xml` — données structurées selon les codes AFC-GE officiels
- `meta.json` — version GeTax, logiciel source, date de génération

### Codes AFC-GE implémentés

| Code | Description |
|---|---|
| 1.1 | Salaire brut |
| 1.2 | Allocations familiales |
| 10.1 | Cotisations AVS/AI/AC |
| 10.2 | Cotisations LPP obligatoires |
| 11.1–11.3 | Frais professionnels, transport, repas |
| 13.1–13.2 | Pilier 3A, Pilier 3B (ICC) |
| 14.1 | Primes LAMal |
| 15.1–15.2 | Enfants à charge, frais de garde |
| 16.1–16.2 | Frais médicaux, dons |
| 20.1–20.9 | Fortune (comptes, titres, immobilier, dettes) |

---

## CI/CD

### Flux CI (`ci.yml`)

```
push/PR → lint (ESLint + Prettier + tsc) → unit tests (Vitest)
        → build (Next.js) → E2E (Playwright, sur PR uniquement)
```

### Flux Deploy (`deploy.yml`)

```
push main → CI guard → prisma migrate deploy → vercel build --prod
          → vercel deploy → smoke test (landing + API)
```

### Secrets GitHub requis

| Secret | Description |
|---|---|
| `VERCEL_TOKEN` | Token personnel Vercel |
| `VERCEL_ORG_ID` | Organisation Vercel |
| `VERCEL_PROJECT_ID` | Projet Vercel |
| `DATABASE_URL` | PostgreSQL production |
| `PRODUCTION_URL` | URL de production (ex: `https://app.taxeasy.ch`) |

---

## Conformité & sécurité

- **Données fiscales** : jamais en `localStorage` — tout en base de données chiffrée
- **Documents** : jamais servis via URL publique — accès via routes authentifiées
- **Montants** : entiers en centimes en base, formatés uniquement à l'affichage
- **OCR** : confidence < 0.5 → fallback saisie manuelle automatique
- **Auth** : sessions database (NextAuth), CSRF protection intégrée
- **Deadline fiscale GE** : 31 mars 2026 (prolongation possible jusqu'au 30 juin 2026 via ge.ch)

---

## Roadmap

### v1.1 (Q2 2026)
- [ ] Indépendants (comptabilité simplifiée)
- [ ] Frontaliers franco-genevois (Convention bilatérale)
- [ ] Revenus locatifs détaillés (F3 + IIC)
- [ ] Formulaires DA-1 complets (dividendes étrangers)

### v1.2 (Q3 2026)
- [ ] Application mobile (React Native)
- [ ] Rappels automatiques (délai fiscal, prolongation)
- [ ] Mode collaboratif (comptable + client)
- [ ] API publique (intégration fiduciaires)

---

## Contribution

```bash
# Fork → branche feature → commits conventionnels → PR
git checkout -b feat/ma-fonctionnalite
git commit -m "feat: ajouter le calcul de l'IIC"
git push origin feat/ma-fonctionnalite
# → Ouvrir une Pull Request
```

**Commits conventionnels :** `feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`

---

## Licence

MIT © 2025 TaxEasy

---

> **Avertissement** : TaxEasy est un outil d'aide à la déclaration fiscale. Il ne remplace pas un conseiller fiscal agréé. L'AFC-GE reste l'autorité compétente. La soumission finale de votre déclaration doit être effectuée via GeTax (ge.ch).
