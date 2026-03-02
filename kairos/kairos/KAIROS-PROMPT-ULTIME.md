# PROMPT ULTIME — KAIRÓS

> Plateforme suisse de recherche d'emploi intelligente avec candidature automatisée par IA.

---

## CONTEXTE & VISION

Tu es un ingénieur full-stack senior avec 20 ans d'expérience en architecture SaaS, spécialisé dans les produits B2C freemium à forte rétention. Tu vas construire **Kairós** — une application web qui permet aux demandeurs d'emploi en Suisse de chercher, filtrer, analyser et postuler automatiquement à des dizaines d'offres d'emploi en un clic, grâce à l'IA.

**L'ambition** : devenir le Sonara.ai du marché suisse — un produit premium, minimaliste, et redoutablement efficace qui remplace des heures de recherche manuelle par une expérience fluide et automatisée.

**Marché cible** : Les 180 000+ demandeurs d'emploi inscrits en Suisse (ORP/RAV), les personnes en reconversion professionnelle, et les professionnels en veille active. Marché adressable : CHF 30–50M/an (abonnements).

---

## ARCHITECTURE TECHNIQUE

### Stack

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| Frontend | React 18 + Vite | Performance, écosystème, recrutement facile |
| Styling | Tailwind CSS 3 | Rapidité, cohérence, petit bundle |
| State | Zustand | Léger, pas de boilerplate Redux |
| Backend API | Node.js + Hono (sur Cloudflare Workers) | Edge computing, 0 cold start, gratuit jusqu'à 100K req/jour |
| Base de données | Supabase (PostgreSQL) | Auth intégrée, temps réel, stockage fichiers, gratuit jusqu'à 50K MAU |
| Auth | Supabase Auth (magic link + Google + Swiss ID si possible) | Pas de mot de passe = meilleure conversion |
| IA | API Anthropic Claude (Sonnet) | Lettres de motivation, analyse CV, scoring, résumés |
| Paiements | Stripe | Standard industrie, CHF supporté, portail client |
| Hébergement | Cloudflare Pages (frontend) + Workers (API) | CDN global, HTTPS, déploiement automatique depuis Git |
| Proxy job-room | Cloudflare Worker dédié | Résout le CORS, cache 5 min, 0 coût |
| Emails transactionnels | Resend | DX excellente, 3000 emails/mois gratuits |
| Analytics | Plausible ou PostHog | Privacy-first (RGPD/nLPD Suisse), pas de cookie banner |

### Architecture des données

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│   Frontend   │────▶│  Cloudflare      │────▶│  Sources d'offres    │
│   React/Vite │     │  Workers (API)   │     │                      │
│              │     │                  │     │  • job-room.ch (SECO)│
│              │     │  /api/search     │     │  • jobs.ch (Apify)   │
│              │     │  /api/apply      │     │  • EURES API         │
│              │     │  /api/profile    │     │  • Indeed Publisher   │
│              │     │  /api/billing    │     │                      │
│              │     │        │         │     └──────────────────────┘
│              │     │        ▼         │
│              │     │  ┌────────────┐  │     ┌──────────────────────┐
│              │     │  │ Supabase   │  │     │  Services externes   │
│              │     │  │            │  │     │                      │
│              │     │  │ • users    │  │     │  • Claude API (IA)   │
│              │     │  │ • profiles │  │     │  • Stripe (paiement) │
│              │     │  │ • jobs     │  │     │  • Resend (emails)   │
│              │     │  │ • applies  │  │     │  • Plausible (stats) │
│              │     │  │ • credits  │  │     │                      │
│              │     │  └────────────┘  │     └──────────────────────┘
│              │     └──────────────────┘
└──────────────┘
```

### Schéma de base de données (Supabase / PostgreSQL)

```sql
-- Profils utilisateurs
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  location TEXT,                    -- Ville
  canton TEXT,                      -- Code canton (GE, VD, ZH...)
  job_title TEXT,                   -- Poste actuel ou recherché
  experience_years INTEGER,
  skills TEXT[],                    -- Array de compétences
  languages JSONB,                  -- [{code:"FR", level:"native"}, {code:"DE", level:"B2"}]
  cv_url TEXT,                      -- URL du CV stocké sur Supabase Storage
  cv_parsed JSONB,                  -- CV analysé par IA (structuré)
  preferences JSONB,               -- {remote: true, minSalary: 80000, contractTypes: ["CDI"]}
  plan TEXT DEFAULT 'free',         -- free | pro | premium
  credits INTEGER DEFAULT 5,       -- Candidatures IA restantes
  stripe_customer_id TEXT,
  onboarding_done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Offres d'emploi (cache local depuis les APIs)
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,              -- ID source (job-room, jobs.ch, etc.)
  source TEXT NOT NULL,             -- 'jobroom' | 'jobsch' | 'eures' | 'indeed'
  title TEXT NOT NULL,
  company TEXT,
  location TEXT,
  canton TEXT,
  description TEXT,
  requirements TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'CHF',
  contract_type TEXT,               -- CDI, CDD, stage, freelance
  workload_min INTEGER,
  workload_max INTEGER,
  remote BOOLEAN DEFAULT false,
  languages_required TEXT[],
  url TEXT,                         -- Lien source
  stellennummer TEXT,               -- Numéro SECO
  reporting_obligation BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  raw_data JSONB,                   -- Données brutes de l'API source
  indexed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_jobs_source ON jobs(source);
CREATE INDEX idx_jobs_canton ON jobs(canton);
CREATE INDEX idx_jobs_published ON jobs(published_at DESC);
CREATE INDEX idx_jobs_search ON jobs USING GIN(to_tsvector('french', title || ' ' || COALESCE(company,'') || ' ' || COALESCE(description,'')));

-- Candidatures
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  job_id TEXT REFERENCES jobs(id) NOT NULL,
  status TEXT DEFAULT 'pending',    -- pending | sent | viewed | interview | rejected | accepted
  cover_letter TEXT,                -- Générée par IA
  cover_letter_lang TEXT,           -- fr, de, en, it
  match_score INTEGER,              -- Score de compatibilité IA (0-100)
  match_analysis JSONB,             -- Détail du scoring par critère
  applied_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, job_id)
);

-- Historique des crédits
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  amount INTEGER NOT NULL,          -- +10 (achat) ou -1 (utilisation)
  reason TEXT NOT NULL,             -- 'subscription_renewal' | 'single_apply' | 'bulk_apply' | 'purchase'
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alertes emploi
CREATE TABLE job_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  keywords TEXT[],
  cantons TEXT[],
  contract_types TEXT[],
  min_workload INTEGER DEFAULT 0,
  remote_only BOOLEAN DEFAULT false,
  frequency TEXT DEFAULT 'daily',   -- daily | weekly | instant
  active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## DESIGN SYSTEM — "SWISS EDITORIAL LUXURY"

### Philosophie

L'interface doit évoquer la **précision suisse** croisée avec l'**élégance éditoriale**. Inspirations : Aesop.com, Linear.app, Sonara.ai, Arc Browser. Pas de bruit visuel. Chaque pixel est intentionnel.

### Typographie

| Usage | Police | Pourquoi |
|-------|--------|----------|
| Titres, marque, accents | Instrument Serif (italic) | Caractère éditorial, sophistication |
| Corps, UI, boutons | DM Sans (400, 500, 600, 700) | Lisibilité, modernité, neutralité |
| Données, scores, mono | JetBrains Mono (500, 600) | Précision, technicité |

Le contraste serif/sans crée une tension visuelle élégante qui différencie immédiatement l'app des designs SaaS génériques (Inter, Roboto, gradients violets).

### Palette

```
SURFACES (95% de l'interface)
  --white:   #FFFFFF     Fond cartes
  --snow:    #FAFAFA     Fond global
  --pearl:   #F5F5F7     Sections secondaires
  --mist:    #EFEFEF     Séparateurs
  --silk:    #E8E8EC     Bordures

ENCRE (hiérarchie typographique)
  --ink-00:  #09090B     Titres principaux
  --ink-10:  #18181B     Corps
  --ink-20:  #27272A     Texte secondaire
  --ink-30:  #3F3F46     Labels
  --ink-40:  #52525B     Sous-texte
  --ink-50:  #71717A     Placeholder
  --ink-60:  #A1A1AA     Métadonnées
  --ink-70:  #D4D4D8     Décoratif

ACCENT (une seule couleur, utilisée avec parcimonie)
  --accent:     #2563EB    Boutons primaires, liens, sélections
  --accent-h:   #1D4ED8    Hover
  --accent-l:   #EFF6FF    Background très léger
  --accent-m:   #DBEAFE    Tags, badges
  --accent-b:   #BFDBFE    Bordures focus

SÉMANTIQUE
  --success:    #16A34A    Confirmations, score élevé
  --success-l:  #F0FDF4    Background
  --warning:    #CA8A04    Attention, score moyen
  --warning-l:  #FEFCE8    Background
  --error:      #DC2626    Erreurs, score bas
  --error-l:    #FEF2F2    Background
  --swiss-red:  #FF0000    🇨🇭 Identité suisse (très rare)
```

### Ombres

5 niveaux d'élévation. Les ombres sont **ressenties, pas vues** — ultra-subtiles.

```
--shadow-0: none
--shadow-1: 0 1px 2px rgba(0,0,0, 0.03)                              → Cartes repos
--shadow-2: 0 1px 3px rgba(0,0,0, 0.04), 0 1px 2px rgba(0,0,0, 0.02) → Cartes hover léger
--shadow-3: 0 4px 16px rgba(0,0,0, 0.05), 0 1px 3px rgba(0,0,0, 0.03)→ Cartes hover fort
--shadow-4: 0 12px 40px rgba(0,0,0, 0.07), 0 4px 12px rgba(0,0,0, 0.03) → Dropdowns
--shadow-5: 0 24px 60px rgba(0,0,0, 0.09), 0 8px 24px rgba(0,0,0, 0.04) → Modales
```

### Espacements & Rayons

```
Padding cartes : 26–30px
Padding modales : 32–40px
Gap entre cartes : 12px
Line-height corps : 1.65–1.8
Letter-spacing uppercase labels : 0.08em
Border-radius : 8px (petit), 10px (moyen), 12px (large), 16px (XL), 20px (2XL), 9999px (pill)
```

### Micro-interactions

```
Courbe globale : cubic-bezier(0.25, 0.46, 0.45, 0.94)
Hover carte : translateY(-2px), shadow-1 → shadow-3, bordure gauche 3px couleur entreprise
Entrée cartes : animation staggerée (délai 0.035s × index)
Score circulaire : stroke-dashoffset animé sur 0.9s
Bouton primaire hover : shadow élargie + translateY(-1px)
Indicateur live : animation "breathe" (box-shadow pulsant vert)
Modale : scale(0.97) → scale(1) + backdrop-filter blur(4px)
Barre de progression : repeating-linear-gradient animé
```

---

## FONCTIONNALITÉS DÉTAILLÉES

### 1. Onboarding (première utilisation — 3 étapes max)

**Étape 1 : "Qui êtes-vous ?"**
- Nom, localisation (canton + ville), poste recherché
- Sélection des langues parlées (FR, DE, EN, IT) avec niveau
- Choix du type de contrat : CDI, CDD, freelance, stage

**Étape 2 : "Votre CV"**
- Upload drag & drop (PDF, DOCX, max 5 Mo)
- L'IA (Claude) parse le CV et extrait : compétences, expériences, formation, langues
- L'utilisateur valide et ajuste les données extraites
- Fallback : saisie manuelle des compétences clés

**Étape 3 : "Vos préférences"**
- Cantons de recherche (multi-sélection visuelle avec la carte ou les pills)
- Taux d'activité souhaité (slider 20–100%)
- Salaire minimum souhaité (optionnel, slider en kCHF)
- Remote / hybride / sur site
- Activer les alertes email (quotidiennes par défaut)

**Résultat** : Un profil complet qui permet le scoring IA immédiat.

### 2. Dashboard principal

**Layout** : Sidebar fixe 290px (filtres) + zone principale flexible (offres).

**Header** :
- Logo Kairós (Instrument Serif italic, fond noir, lettre K blanche)
- Indicateur de statut : pastille verte pulsante "Connecté · X offres" ou ambre "Mode démo"
- Source active : badge "🇨🇭 job-room.ch" + icône SECO
- Boutons : "Actualiser", "Postuler en masse ⚡"
- Compteur de crédits restants (Pro/Premium)

**Sidebar** :
- Champ de recherche libre (poste, entreprise, compétence)
- Sélecteur de cantons (pills cliquables, 20 cantons, toggle +10)
- Filtres de date : 24h, 7j, 14j, 30j
- Type de contrat : CDI, CDD, Stage, Freelance
- Taux d'activité : slider ou pills (50%, 80%, 100%)
- Mode de travail : Sur site, Hybride, Remote
- Bouton "Rechercher" pleine largeur
- Carte source officielle (🇨🇭 job-room.ch / SECO)
- Tableau des salaires médians par domaine
- Lien "Créer une alerte" pour la recherche en cours

**Onglets de filtrage rapide** (au-dessus des résultats) :
- "Toutes" (badge avec total)
- "Top match" (score ≥ 88)
- "Remote" (offres télétravail)
- "Reconversion" (offres compatibles avec un changement de métier)
- "Nouvelles" (publiées < 24h)

**Carte d'offre d'emploi** (composant central, répété) :
```
┌─────────────────────────────────────────────────────────┐
│  [Avatar]  Titre du poste                    [Score 94] │
│            Entreprise · Ville, Canton · 80-100%         │
│                                                         │
│  Description tronquée à 2 lignes...                     │
│                                                         │
│  [React] [Spring Boot] [Kubernetes] [🏛 Meldepflicht]  │
│  ─────────────────────────────────────────────────────  │
│  110–140K CHF    CDI    Hybride    31 cand.    5 h      │
│                                   [Détails] [Postuler→] │
└─────────────────────────────────────────────────────────┘
```

- Avatar : initiale de l'entreprise en Instrument Serif, fond teinté couleur marque
- Score : cercle SVG animé, couleur verte/bleue/ambre selon le score
- Hover : élévation, bordure gauche colorée, cursor pointer
- Clic : ouvre le panneau de détail

### 3. Détail d'une offre (modale ou slide-over)

- En-tête : avatar entreprise + titre (Instrument Serif 26px) + score + tags (salaire, contrat, taux, canton, N° stellennummer)
- Description complète (formatée markdown → HTML)
- Section "Compétences requises" (tags colorés)
- Section "Compatibilité avec votre profil" : 4 barres de progression (Compétences, Expérience, Localisation, Rémunération) avec % calculé par IA
- Section "Langues requises" vs "Vos langues" (comparaison visuelle)
- Actions : "Fermer", "Voir sur job-room.ch ↗", "Postuler →"
- Si Pro/Premium : preview de la lettre de motivation IA avant envoi

### 4. Candidature intelligente par IA

**Flux pour une offre unique** :
1. L'utilisateur clique "Postuler"
2. L'IA (Claude Sonnet) génère une lettre de motivation personnalisée en analysant :
   - Le profil de l'utilisateur (CV parsé, compétences, expériences)
   - La description de l'offre (exigences, compétences recherchées)
   - La langue de l'offre (lettre en FR, DE, EN ou IT automatiquement)
3. Preview de la lettre dans la modale avec bouton "Modifier" (textarea éditable)
4. Confirmation → le statut passe à "Postulé ✓"
5. Un crédit est déduit

**Prompt IA pour la lettre** :
```
Tu es un expert en rédaction de lettres de motivation professionnelles en Suisse.

PROFIL DU CANDIDAT :
{cv_parsed}
{skills}
{experience_years} ans d'expérience
Langues : {languages}

OFFRE D'EMPLOI :
Titre : {job.title}
Entreprise : {job.company}
Description : {job.description}
Compétences requises : {job.requirements}

CONSIGNES :
- Rédige en {langue de l'offre}
- Ton professionnel mais humain, pas de formules creuses
- Maximum 250 mots
- Mets en avant les 2-3 compétences les plus pertinentes du candidat
- Mentionne l'entreprise par son nom
- Adapte le niveau de formalité au secteur (finance = formel, tech = direct)
- Termine par une invitation concrète à un entretien
- Format suisse (pas de "Madame, Monsieur" mais "Chère équipe de recrutement" si nom inconnu)
```

**Candidature groupée ("Postuler en masse")** :
1. L'utilisateur sélectionne les offres éligibles (non encore postulées)
2. Modale récapitulative : nombre d'offres, crédits consommés, options (lettre IA ✓, optimisation ATS ✓)
3. Lancement : barre de progression animée, traitement séquentiel (0.4s par offre pour l'UX)
4. Pour chaque offre : génération de la lettre IA → marquage comme postulé
5. Écran de succès : "🎉 X candidatures envoyées !"

### 5. Scoring de compatibilité

Chaque offre reçoit un **score 0–100** calculé par IA en analysant :

```
POIDS DU SCORING :
- Correspondance compétences     : 35%
- Correspondance expérience      : 20%
- Correspondance localisation    : 15%
- Correspondance langues         : 15%
- Correspondance salaire         : 10%
- Correspondance type contrat    : 5%

MÉTHODE :
Pour chaque critère, Claude compare les données du profil avec les exigences
de l'offre et attribue un score partiel. Le score global est la somme pondérée.

AFFICHAGE :
≥ 92 → Vert (--success) — "Excellent match"
≥ 82 → Bleu (--accent) — "Bon match"
≥ 72 → Ambre (--warning) — "Match partiel"
< 72 → Gris (--ink-60) — "Match faible"
```

### 6. Gestion du profil

Page `/profile` avec :
- Informations personnelles (éditable inline)
- CV actuel (preview + bouton re-upload)
- Compétences extraites (ajout/suppression de tags)
- Langues avec niveau (sélecteur visuel)
- Préférences de recherche
- Historique des candidatures (tableau avec statut, date, lien)
- Gestion de l'abonnement (lien vers portail Stripe)
- Solde de crédits + bouton "Acheter des crédits"
- Alertes email (activer/désactiver, fréquence)

### 7. Alertes emploi

- Configurées automatiquement à l'onboarding ou manuellement
- Cron Cloudflare Worker : exécuté toutes les 6h (instant) ou 24h (daily)
- Requête la base `jobs` avec les critères de l'alerte
- Compare avec les offres déjà vues/postulées
- Email via Resend : design épuré, 3–5 offres pertinentes, CTA "Voir sur Kairós"
- Lien de désinscription en un clic

### 8. Page de candidatures

Page `/applications` :
- Vue kanban (colonnes : En attente → Envoyée → Vue → Entretien → Rejetée → Acceptée)
- Ou vue liste avec tri par date/statut/score
- Chaque carte : titre, entreprise, date, score, statut coloré
- Clic → détail de la candidature (lettre envoyée, analyse IA, lien offre)
- Statistiques en haut : total envoyées, taux de réponse, score moyen

---

## MODÈLE DE MONÉTISATION

### Plans

| | Free | Pro (CHF 19/mois) | Premium (CHF 39/mois) |
|---|---|---|---|
| Recherche d'offres | ✓ Illimité | ✓ Illimité | ✓ Illimité |
| Filtres avancés | ✓ | ✓ | ✓ |
| Candidatures IA / mois | 5 | 50 | Illimité |
| Lettre de motivation IA | Basique | Personnalisée + preview | Premium + A/B test |
| Scoring de compatibilité | Score seul | Score + détail par critère | Score + recommandations IA |
| Alertes email | 1 alerte, hebdomadaire | 5 alertes, quotidienne | Illimité, instantanée |
| Candidature groupée | ✗ | ✓ (par 10) | ✓ (illimité) |
| Analyse de CV par IA | 1 analyse | Illimité | Illimité + suggestions |
| Support | Communauté | Email 48h | Prioritaire 24h |
| Pub / watermark | Non | Non | Non |

### Logique de crédits

- Free : 5 crédits/mois (reset le 1er du mois)
- Pro : 50 crédits/mois + possibilité d'acheter des packs (10 crédits = CHF 5)
- Premium : crédits illimités
- 1 candidature simple = 1 crédit
- 1 candidature groupée = 1 crédit × nombre d'offres
- Upgrade : les crédits non utilisés ne sont pas reportés (incitation à utiliser)

### Intégration Stripe

```javascript
// Produits Stripe à créer
const PLANS = {
  pro: {
    price_monthly: 'price_xxx',    // CHF 19/mois
    price_yearly: 'price_xxx',     // CHF 190/an (2 mois offerts)
    credits_per_month: 50,
  },
  premium: {
    price_monthly: 'price_xxx',    // CHF 39/mois
    price_yearly: 'price_xxx',     // CHF 390/an (2 mois offerts)
    credits_per_month: -1,         // illimité
  },
};

// Webhook Stripe → Cloudflare Worker /api/webhooks/stripe
// Events à gérer :
// - checkout.session.completed → créer l'abonnement, attribuer les crédits
// - invoice.paid → renouveler les crédits mensuels
// - customer.subscription.deleted → downgrade vers Free
```

---

## AGRÉGATION DES SOURCES D'OFFRES

### Pipeline d'ingestion (Cloudflare Worker Cron, toutes les 30 min)

```javascript
// Sources, par priorité
const SOURCES = [
  {
    name: 'jobroom',
    endpoint: 'https://www.job-room.ch/api/jobAdvertisements/_search',
    method: 'POST',
    auth: null,  // Pas d'auth nécessaire pour la recherche publique
    format: 'json',
    priority: 1,
  },
  {
    name: 'eures',
    endpoint: 'https://ec.europa.eu/eures/eures-searchengine/page/jv-se/search',
    method: 'POST',
    auth: null,
    format: 'json',
    priority: 2,
  },
  // jobs.ch, Jobup.ch via Apify Actors (si budget le permet)
];

// Processus :
// 1. Fetch chaque source en parallèle
// 2. Normaliser vers le schéma unifié `jobs`
// 3. Déduplication : hash(title_lower + company_lower + canton) → si existe, update, sinon insert
// 4. Marquer les offres expirées (published_at + 60j ou cancellationDate passée)
// 5. Log les stats : nouvelles offres, mises à jour, erreurs
```

### Cloudflare Worker — Proxy job-room.ch

```javascript
// Ce worker résout le CORS pour l'appel direct depuis le navigateur
// POST /search → relaye vers job-room.ch/api/jobAdvertisements/_search
// GET /job/:id → relaye vers job-room.ch/api/jobAdvertisements/:id
// GET /health → vérifie la connectivité

// Headers CORS ajoutés à toutes les réponses :
// Access-Control-Allow-Origin: *
// Access-Control-Allow-Methods: GET, POST, OPTIONS
// Access-Control-Allow-Headers: Content-Type

// Format du body de recherche job-room.ch :
{
  page: 0,
  size: 25,
  sort: "RELEVANCE_DESC",
  body: {
    keyword: "developer",
    professionCodes: [],
    cantonCodes: ["ZH", "GE"],
    communalCodes: [],
    regionCodes: [],
    workloadPercentageMin: 80,
    workloadPercentageMax: 100,
    permanent: null,        // true=CDI, false=CDD, null=tous
    companyName: "",
    onlineSinceDays: 30,
    displayRestricted: false
  }
}
```

---

## PAGES DE L'APPLICATION

### Routes

```
/                    → Landing page (marketing, pricing, CTA)
/login               → Connexion (magic link / Google)
/onboarding          → 3 étapes d'onboarding
/dashboard           → Recherche d'offres (page principale)
/job/:id             → Détail d'une offre (deep link)
/applications        → Mes candidatures (kanban/liste)
/profile             → Mon profil + CV + préférences
/pricing             → Plans et tarifs
/settings            → Paramètres compte + abonnement
/alerts              → Gestion des alertes email
```

### Landing page (/)

La landing page doit convertir. Structure :

1. **Hero** : "Postulez à 50 offres en 5 minutes" + sous-titre + CTA "Commencer gratuitement" + screenshot de l'app
2. **Social proof** : "Rejoint par X demandeurs d'emploi en Suisse" + logos entreprises
3. **3 features** avec icônes : "Toutes les offres suisses", "IA qui postule pour vous", "Scoring intelligent"
4. **Comment ça marche** : 3 étapes visuelles (Upload CV → L'IA analyse → Postulez en masse)
5. **Pricing** : 3 colonnes Free/Pro/Premium avec CTA
6. **Témoignages** : 3 cartes (photo, nom, citation, résultat "Trouvé un emploi en 3 semaines")
7. **FAQ** : 5-6 questions accordéon
8. **Footer CTA** : "Prêt à accélérer votre recherche ?" + bouton
9. **Footer** : liens légaux, CGU, politique de confidentialité, contact

---

## SPÉCIFICITÉS SUISSES

L'app DOIT respecter les particularités du marché suisse :

- **Multilinguisme** : Interface en FR, DE, EN, IT. Détection automatique via le navigateur. Les offres sont affichées dans leur langue originale.
- **26 cantons** : Sélection par pills visuelles, pas par dropdown. Les 10 principaux affichés par défaut, "+16" pour le reste.
- **Taux d'activité** : En Suisse, le temps partiel est très courant (80%, 60%, 50%). C'est un filtre de premier ordre, pas caché.
- **Meldepflicht** (obligation d'annonce) : Badge visible sur les offres concernées. Explication tooltip : "Cette offre est soumise à l'obligation d'annonce. Les demandeurs inscrits au RAV ont un accès prioritaire pendant 5 jours."
- **Stellennummer** : Numéro de référence SECO affiché en petit (JetBrains Mono).
- **Salaires en CHF** : Toujours afficher en CHF, format "110–140K CHF" ou "Selon profil" si non renseigné.
- **nLPD** (nouvelle Loi sur la Protection des Données) : Conforme dès le jour 1. Pas de tracking invasif, pas de vente de données, consentement explicite, droit à l'effacement.
- **RAV/ORP** : Mentionner la compatibilité avec le système de l'assurance chômage suisse.

---

## SÉCURITÉ & CONFORMITÉ

- Row Level Security (RLS) activé sur toutes les tables Supabase
- Chaque utilisateur ne voit que ses propres données
- CV stockés sur Supabase Storage avec access policy par user
- Clés API (Claude, Stripe) stockées en Cloudflare Worker secrets (jamais côté client)
- Rate limiting : 30 req/min par IP sur les Workers
- HTTPS partout (géré par Cloudflare)
- Headers de sécurité : CSP, X-Frame-Options, HSTS

---

## DÉPLOIEMENT & CI/CD

```bash
# Structure du repo
kairos/
├── apps/
│   ├── web/              # React + Vite (frontend)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── stores/   # Zustand
│   │   │   ├── lib/      # API clients, utils
│   │   │   └── styles/
│   │   ├── public/
│   │   └── vite.config.ts
│   └── workers/          # Cloudflare Workers (backend)
│       ├── api/          # API principale
│       ├── proxy/        # Proxy job-room.ch
│       └── cron/         # Ingestion des offres
├── packages/
│   └── shared/           # Types partagés, constantes
├── supabase/
│   ├── migrations/       # SQL migrations
│   └── seed.sql
├── .github/workflows/    # CI/CD
│   ├── deploy-web.yml
│   └── deploy-workers.yml
└── package.json          # Monorepo (pnpm workspaces)
```

**Déploiement** :
- Push sur `main` → déploiement automatique
- Frontend → Cloudflare Pages (build Vite → static)
- Workers → `wrangler deploy` via GitHub Actions
- Database → Supabase CLI migrations

---

## MÉTRIQUES DE SUCCÈS

| Métrique | Objectif Mois 1 | Objectif Mois 6 |
|----------|----------------|----------------|
| Inscriptions | 500 | 5 000 |
| Conversion Free → Pro | 5% | 8% |
| Candidatures envoyées/jour | 200 | 5 000 |
| MRR (Monthly Recurring Revenue) | CHF 500 | CHF 8 000 |
| Rétention M1 | 40% | 55% |
| Score NPS | > 30 | > 50 |

---

## INSTRUCTIONS FINALES

1. **Commence par le Cloudflare Worker proxy** (résout le CORS avec job-room.ch) — c'est le minimum pour avoir des données réelles.
2. **Puis le frontend React complet** avec le design system décrit ci-dessus, connecté au proxy.
3. **Puis l'authentification** (Supabase Auth) et la base de données.
4. **Puis l'intégration Claude** pour le scoring et les lettres de motivation.
5. **Puis Stripe** pour la monétisation.
6. **Puis les alertes email** et le pipeline d'ingestion multi-sources.
7. **Puis la landing page** pour l'acquisition.

À chaque étape, le code doit être **production-ready** : pas de TODO, pas de mock persistant, gestion d'erreurs exhaustive, types TypeScript, tests unitaires sur la logique métier critique (scoring, crédits, billing).

L'app doit fonctionner immédiatement avec les données de démonstration si le proxy n'est pas encore déployé, puis basculer automatiquement sur les données réelles quand il est disponible.

**Construis Kairós.**
