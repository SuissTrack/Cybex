import Link from "next/link";

/* ─── Shared primitives ─────────────────────────────────────────── */

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
      {children}
    </span>
  );
}

function SectionTitle({
  label,
  title,
  subtitle,
}: {
  label?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center mb-12">
      {label && (
        <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">
          {label}
        </p>
      )}
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
        {title}
      </h2>
      {subtitle && (
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">{subtitle}</p>
      )}
    </div>
  );
}

/* ─── Hero ──────────────────────────────────────────────────────── */

function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32">
      {/* Background gradient */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-50 via-white to-indigo-50"
      />
      <div
        aria-hidden
        className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-blue-100/40 blur-3xl -z-10"
      />

      <div className="max-w-6xl mx-auto px-4 text-center">
        <Badge>🇨🇭 Conforme AFC-GE 2025 — Mis à jour pour les nouveaux barèmes</Badge>

        <h1 className="mt-6 text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
          Votre déclaration d&apos;impôt{" "}
          <span className="text-blue-600">genevoise</span>
          <br />
          en 20 minutes
        </h1>

        <p className="mt-6 text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
          TaxEasy guide les contribuables genevois à travers chaque étape de
          leur déclaration 2025. Calcul ICC + IFD en temps réel, export GeTax
          .tax, et zéro jargon fiscal.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg shadow-blue-200"
          >
            Commencer ma déclaration →
          </Link>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto text-gray-600 hover:text-gray-900 font-medium px-8 py-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
          >
            Comment ça marche
          </a>
        </div>

        {/* Social proof */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
          <span className="flex items-center gap-2">
            <span className="text-green-500">✓</span> Données chiffrées — jamais partagées
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-500">✓</span> Délai 31 mars 2026 (30 juin avec prolongation)
          </span>
          <span className="flex items-center gap-2">
            <span className="text-green-500">✓</span> Compatible GeTax 1.03
          </span>
        </div>
      </div>

      {/* App preview mockup */}
      <div className="mt-16 max-w-4xl mx-auto px-4">
        <div className="rounded-2xl border border-gray-200 shadow-2xl shadow-gray-200/80 bg-white overflow-hidden">
          {/* Browser chrome */}
          <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <div className="ml-3 flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-400 font-mono">
              app.taxeasy.ch/declaration/wizard
            </div>
          </div>
          {/* Wizard preview */}
          <div className="p-8 md:p-12">
            <div className="max-w-lg mx-auto">
              {/* Progress */}
              <div className="flex items-center justify-between mb-6 text-xs text-gray-400">
                <span>Section 3 / 5 — Revenus</span>
                <span>Étape 2 / 7</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full mb-8">
                <div className="h-1.5 bg-blue-500 rounded-full w-[42%]" />
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Quel est votre salaire brut 2025 ?
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Reportez le montant figurant sur votre certificat de salaire,
                case A — allocations familiales incluses (nouveauté 2025).
              </p>

              {/* Number input mockup */}
              <div className="border-2 border-blue-500 rounded-xl px-4 py-3 flex items-center gap-3 bg-blue-50/30">
                <span className="text-gray-400 font-semibold">CHF</span>
                <span className="text-gray-900 font-semibold text-lg">
                  95&apos;000
                </span>
                <span className="text-blue-400 animate-pulse">|</span>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Montant saisi : CHF 95&apos;000 → calculé en temps réel
              </p>

              {/* Live tax preview */}
              <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
                  Estimation en temps réel
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">ICC + IFD estimé</span>
                  <span className="text-xl font-bold text-gray-900">CHF 18&apos;240</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Mise à jour à chaque réponse · Résultat final à l&apos;étape récapitulatif
                </p>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  disabled
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-400 cursor-default"
                >
                  ← Retour
                </button>
                <button className="flex-1 bg-blue-600 text-white text-sm font-semibold py-2 rounded-lg">
                  Continuer →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Logos / trust ─────────────────────────────────────────────── */

function TrustBand() {
  const logos = [
    { name: "AFC-GE", sub: "Barèmes officiels 2025" },
    { name: "GeTax 1.03", sub: "Format d'export natif" },
    { name: "Document AI", sub: "OCR automatique" },
    { name: "Stripe", sub: "Paiement sécurisé" },
    { name: "ISO 27001", sub: "Sécurité données" },
  ];

  return (
    <section className="border-y border-gray-100 bg-gray-50/50 py-10">
      <div className="max-w-6xl mx-auto px-4">
        <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-8">
          Technologies & conformités
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
          {logos.map((l) => (
            <div key={l.name} className="text-center">
              <div className="text-sm font-bold text-gray-700">{l.name}</div>
              <div className="text-xs text-gray-400">{l.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features ──────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: "🧭",
    title: "Assistant pas-à-pas",
    description:
      "Un arbre de décision intelligent adapté à votre situation. Chaque question est pré-remplie selon vos réponses précédentes — zéro doublon, zéro oubli.",
  },
  {
    icon: "📸",
    title: "OCR automatique",
    description:
      "Prenez en photo votre certificat de salaire, attestation LPP, pilier 3A ou LAMal. L'IA extrait automatiquement tous les montants — vérification manuelle toujours disponible.",
  },
  {
    icon: "🧮",
    title: "Calcul ICC + IFD en temps réel",
    description:
      "Barèmes 2025 réformés intégrés. Calcul instantané de l'impôt cantonal, communal et fédéral, avec splitting complet (mariés) ou partiel (monoparental).",
  },
  {
    icon: "🏘️",
    title: "Taux des 45 communes",
    description:
      "De Genève-Ville (45.5%) à Avully (55%), chaque coefficient communal est intégré pour un calcul précis selon votre domicile.",
  },
  {
    icon: "📄",
    title: "Export GeTax .tax",
    description:
      "Génère le fichier .tax compatible GeTax v1.03 avec tous les codes officiels AFC-GE. Importez directement dans GeTax sans ressaisie.",
  },
  {
    icon: "💡",
    title: "Optimisations suggérées",
    description:
      "Rachat LPP, rachats rétroactifs 3A, déduction garde vs frais réels — TaxEasy identifie les déductions que vous pourriez manquer.",
  },
] as const;

function FeaturesSection() {
  return (
    <section id="features" className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <SectionTitle
          label="Fonctionnalités"
          title="Tout ce qu'il faut pour déclarer en confiance"
          subtitle="Conçu spécifiquement pour les contribuables genevois, avec les règles exactes du guide AFC-GE 2025."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50 transition-all"
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How it works ──────────────────────────────────────────────── */

const STEPS = [
  {
    number: "01",
    title: "Créez votre compte",
    description:
      "Inscription en 30 secondes avec votre email. Pas de carte de crédit requise pour commencer.",
  },
  {
    number: "02",
    title: "Répondez aux questions",
    description:
      "L'assistant vous guide selon votre situation : célibataire, marié, avec enfants, propriétaire... Téléchargez vos documents en cours de route.",
  },
  {
    number: "03",
    title: "Vérifiez votre récapitulatif",
    description:
      "Revue complète de toutes vos réponses, estimation ICC + IFD + fortune, et liste des documents joints.",
  },
  {
    number: "04",
    title: "Exportez et soumettez",
    description:
      "Téléchargez le fichier GeTax .tax et importez-le directement sur ge.ch. Deadline : 31 mars 2026.",
  },
] as const;

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <SectionTitle
          label="Comment ça marche"
          title="De zéro à GeTax en 4 étapes"
          subtitle="Pas besoin d'être expert fiscal. TaxEasy connaît les règles genevoise à votre place."
        />

        <div className="relative">
          {/* Connecting line (desktop) */}
          <div
            aria-hidden
            className="hidden md:block absolute top-8 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-100 via-blue-300 to-blue-100 mx-20"
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {STEPS.map((s, i) => (
              <div key={s.number} className="relative text-center">
                {/* Step circle */}
                <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center mx-auto mb-4 relative z-10 shadow-lg shadow-blue-200">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 2025 novelties callout */}
        <div className="mt-16 bg-blue-600 rounded-2xl p-8 text-white">
          <h3 className="text-xl font-bold mb-4 text-center">
            ✨ Nouveautés 2025 intégrées
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              "Allocations familiales intégrées au salaire brut",
              "Rachats rétroactifs 3A (10 ans)",
              "Nouveaux barèmes ICC réformés (baisse des taux)",
              "Camps de vacances déductibles CHF 250/semaine",
              "Revalorisation immobilier fiscal +12%",
              "CRV (Contribution Religieuse Volontaire)",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <span className="text-blue-300 mt-0.5 flex-shrink-0">✓</span>
                <span className="text-sm text-blue-100">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ───────────────────────────────────────────────────── */

const PLANS = [
  {
    name: "Gratuit",
    price: "CHF 0",
    period: "pour toujours",
    description: "Pour découvrir TaxEasy",
    highlight: false,
    cta: "Commencer gratuitement",
    features: [
      "1 déclaration par an",
      "Wizard complet avec calcul ICC + IFD",
      "Export PDF récapitulatif",
      "OCR automatique (1 document)",
      "Suggestions d'optimisation de base",
    ],
    missing: ["Export GeTax .tax", "Historique multi-années", "Support prioritaire"],
  },
  {
    name: "Basic",
    price: "CHF 19",
    period: "par an",
    description: "Pour les contribuables solo",
    highlight: false,
    cta: "Choisir Basic",
    features: [
      "1 déclaration par an",
      "Export GeTax .tax inclus",
      "OCR illimité",
      "Optimisations avancées (LPP, 3A, 3B)",
      "Formulaires F2, F3, DA-1",
      "Support email",
    ],
    missing: ["Historique multi-années", "Support prioritaire"],
  },
  {
    name: "Premium",
    price: "CHF 39",
    period: "par an",
    description: "Pour les familles et situations complexes",
    highlight: true,
    cta: "Choisir Premium",
    features: [
      "Déclarations illimitées",
      "Export GeTax .tax + PDF complets",
      "OCR illimité tous documents",
      "Splitting conjoint + monoparental",
      "Revenus locatifs + dividendes + DA-1",
      "Historique 5 ans",
      "Support prioritaire 24h",
    ],
    missing: [],
  },
] as const;

function PricingSection() {
  return (
    <section id="pricing" className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <SectionTitle
          label="Tarifs"
          title="Simple, transparent, genevois"
          subtitle="Pas d'abonnement mensuel. Vous payez une fois par an, uniquement si vous avez besoin des fonctionnalités avancées."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border-2 p-8 relative ${
                plan.highlight
                  ? "border-blue-500 bg-blue-600 text-white shadow-2xl shadow-blue-200"
                  : "border-gray-200 bg-white"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-orange-400 to-pink-500 text-white text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow-md">
                    ⭐ Plus populaire
                  </span>
                </div>
              )}

              <h3
                className={`font-bold text-xl mb-1 ${plan.highlight ? "text-white" : "text-gray-900"}`}
              >
                {plan.name}
              </h3>
              <p
                className={`text-sm mb-4 ${plan.highlight ? "text-blue-200" : "text-gray-400"}`}
              >
                {plan.description}
              </p>

              <div className="mb-6">
                <span
                  className={`text-4xl font-extrabold ${plan.highlight ? "text-white" : "text-gray-900"}`}
                >
                  {plan.price}
                </span>
                <span
                  className={`text-sm ml-1 ${plan.highlight ? "text-blue-200" : "text-gray-400"}`}
                >
                  {plan.period}
                </span>
              </div>

              <Link
                href="/login"
                className={`block text-center font-semibold py-3 px-6 rounded-xl mb-6 transition-colors ${
                  plan.highlight
                    ? "bg-white text-blue-600 hover:bg-blue-50"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {plan.cta}
              </Link>

              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <span
                      className={`flex-shrink-0 mt-0.5 ${plan.highlight ? "text-blue-200" : "text-green-500"}`}
                    >
                      ✓
                    </span>
                    <span className={plan.highlight ? "text-blue-100" : "text-gray-600"}>
                      {f}
                    </span>
                  </li>
                ))}
                {plan.missing.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <span className="flex-shrink-0 mt-0.5 text-gray-300">✕</span>
                    <span className="text-gray-300 line-through">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-gray-400 mt-8">
          Tous les prix en CHF TTC · Paiement sécurisé via Stripe ·
          Remboursement sous 14 jours
        </p>
      </div>
    </section>
  );
}

/* ─── FAQ ────────────────────────────────────────────────────────── */

const FAQ = [
  {
    q: "TaxEasy remplace-t-il GeTax ?",
    a: "Non — TaxEasy est un assistant qui vous guide dans la saisie de votre déclaration, puis génère un fichier .tax que vous importez dans GeTax (l'outil officiel de l'AFC-GE). La soumission finale passe toujours par GeTax ou ge.ch.",
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "Oui. Toutes les données fiscales sont chiffrées en base de données. Vos documents ne sont jamais accessibles publiquement. Nous ne partageons aucune donnée avec des tiers. Nos serveurs sont hébergés en Suisse.",
  },
  {
    q: "Pour quelles situations TaxEasy est-il adapté ?",
    a: "TaxEasy couvre la grande majorité des situations : salariés, retraités, familles avec enfants, propriétaires, contribuables avec placements et dividendes. Les indépendants et les fonctionnaires internationaux sont notifiés des limitations actuelles.",
  },
  {
    q: "Que faire si je suis imposé(e) à la source et souhaite faire une TOU ?",
    a: "TaxEasy vous guide dès le début pour les contribuables souhaitant faire une Taxation Ordinaire Ultérieure (TOU). Le délai de dépôt est identique : 31 mars 2026.",
  },
  {
    q: "Puis-je utiliser TaxEasy si je suis frontalier franco-genevois ?",
    a: "Pas encore — le cas des frontaliers est complexe (Convention Franco-Suisse). Cette fonctionnalité est prévue pour une version future. TaxEasy vous indiquera les ressources appropriées.",
  },
] as const;

function FAQSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4">
        <SectionTitle
          label="FAQ"
          title="Questions fréquentes"
        />

        <div className="space-y-4">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group bg-white border border-gray-200 rounded-xl overflow-hidden"
            >
              <summary className="cursor-pointer flex items-center justify-between px-6 py-5 font-semibold text-gray-900 hover:bg-gray-50 transition-colors list-none">
                {item.q}
                <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl font-light ml-4 flex-shrink-0">
                  +
                </span>
              </summary>
              <div className="px-6 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA finale ─────────────────────────────────────────────────── */

function FinalCTASection() {
  const DEADLINE = "31 mars 2026";
  const now = new Date();
  const deadline = new Date("2026-03-31");
  const daysLeft = Math.max(
    0,
    Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  return (
    <section className="py-20">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-12 text-white shadow-2xl shadow-blue-200">
          {daysLeft > 0 && (
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-full px-4 py-2 mb-6 text-sm font-semibold">
              ⏰ Plus que{" "}
              <span className="font-extrabold">{daysLeft} jours</span> avant
              la deadline du {DEADLINE}
            </div>
          )}

          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
            Prêt(e) à déclarer sans stress ?
          </h2>
          <p className="text-lg text-blue-200 mb-8 max-w-xl mx-auto">
            Rejoignez les contribuables genevois qui ont simplifié leur
            déclaration d&apos;impôt 2025. Gratuit pour commencer.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto bg-white text-blue-600 hover:bg-blue-50 font-bold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg"
            >
              Démarrer gratuitement →
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto border-2 border-white/40 text-white hover:bg-white/10 font-semibold px-8 py-4 rounded-xl transition-colors"
            >
              J&apos;ai déjà un compte
            </Link>
          </div>

          <p className="mt-6 text-sm text-blue-200">
            Pas de carte de crédit · Remboursement sous 14 jours ·
            Données hébergées en Suisse
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── Page ───────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <TrustBand />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <FAQSection />
      <FinalCTASection />
    </>
  );
}
