import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/session";
import { getDeclarationById } from "@/lib/db/queries/declarations";
import { updateDeclarationStatus } from "@/lib/db/queries/declarations";
import { TaxSummary } from "@/components/declaration/TaxSummary";
import { TaxBreakdown } from "@/components/declaration/TaxBreakdown";
import { Button } from "@/components/ui/button";
import { ComputedTax, DeclarationAnswers } from "@/types/declaration";

const ANSWER_LABELS: Record<string, Record<string, string>> = {
  residency_type: { resident_ge: "Résident genevois", tou: "TOU" },
  family_status: {
    single: "Célibataire",
    married: "Marié(e)",
    divorced: "Divorcé(e)",
    widowed: "Veuf/Veuve",
  },
  income_main: {
    employee: "Salarié(e)",
    employee_side: "Salarié(e) + activité accessoire",
    retired: "Retraité(e)",
    unemployed: "Demandeur/euse d'emploi",
  },
  deductions_transport: {
    public_transport: "Transports en commun",
    car: "Voiture",
    bike: "Vélo",
    homeworker: "100 % télétravail",
  },
  deductions_telework: {
    yes_partial: "Télétravail partiel",
    yes_full: "Télétravail complet",
    no: "Non",
  },
  deductions_meals: {
    yes_distance: "Oui (éloignement / horaires)",
    yes_no_kitchen: "Oui (pas de cuisine)",
    no: "Non",
  },
  crv: {
    yes_catholic: "Catholique",
    yes_protestant: "Protestant(e)",
    yes_other: "Autre",
    no: "Non",
  },
};

function formatAnswer(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "number") {
    // Exclude numeric fields that are not centimes
    if (
      key.endsWith("_distance") ||
      key.endsWith("_days") ||
      key === "children_count" ||
      key === "childcare_camps_count"
    ) {
      return String(value);
    }
    // Detect centimes fields
    if (
      key.includes("income") ||
      key.includes("lamal") ||
      key.includes("wealth") ||
      key.includes("deduction") ||
      key.includes("salary") ||
      key.includes("side")
    ) {
      return `CHF ${Math.round(value / 100).toLocaleString("fr-CH")}`;
    }
    return String(value);
  }
  if (Array.isArray(value)) return value.join(", ");
  const label = ANSWER_LABELS[key]?.[value as string];
  return label ?? String(value);
}

const SECTION_KEYS: { label: string; keys: (keyof DeclarationAnswers)[] }[] = [
  { label: "Résidence", keys: ["residency_type"] },
  {
    label: "État civil & famille",
    keys: [
      "family_status",
      "spouse_work",
      "spouse_deduction",
      "monoparental",
      "children",
      "children_count",
      "children_custody",
      "childcare_amount",
      "childcare_camps_count",
    ],
  },
  {
    label: "Revenus",
    keys: [
      "income_main",
      "salary_amount",
      "salary_deductions",
      "pension_income",
      "unemployment_income",
      "side_income",
      "other_income",
      "dividends_types",
      "dividends_amount",
      "rental_type",
      "rental_income_amount",
      "rental_expenses_amount",
      "alimony_received_amount",
    ],
  },
  {
    label: "Déductions",
    keys: [
      "deductions_lpp",
      "deductions_lpp_amount",
      "deductions_3a",
      "deductions_3a_amount",
      "deductions_3b",
      "deductions_3b_amount",
      "deductions_lamal",
      "deductions_pro_expenses",
      "deductions_transport",
      "deductions_transport_distance",
      "deductions_telework",
      "deductions_telework_days",
      "deductions_meals",
      "deductions_training",
      "deductions_training_amount",
      "deductions_medical",
      "deductions_medical_amount",
      "deductions_handicap",
      "deductions_donations",
      "deductions_donations_amount",
      "deductions_alimony",
      "deductions_alimony_amount",
    ],
  },
  {
    label: "Fortune",
    keys: [
      "wealth_bank",
      "wealth_securities",
      "wealth_securities_types",
      "wealth_securities_value",
      "wealth_real_estate",
      "wealth_real_estate_value",
      "wealth_vehicles",
      "wealth_vehicles_value",
      "wealth_other",
      "wealth_other_assets_value",
      "wealth_debts_amount",
    ],
  },
  { label: "CRV", keys: ["crv"] },
];

const KEY_LABELS: Partial<Record<keyof DeclarationAnswers, string>> = {
  residency_type: "Situation de résidence",
  family_status: "Situation familiale",
  spouse_work: "Conjoint(e) actif/ve",
  spouse_deduction: "Revenu conjoint(e)",
  monoparental: "Chef(fe) de famille monoparentale",
  children: "Enfants à charge",
  children_count: "Nombre d'enfants",
  children_custody: "Frais de garde",
  childcare_amount: "Frais de garde (crèche/parascolaire)",
  childcare_camps_count: "Camps de vacances (nb)",
  income_main: "Situation professionnelle",
  salary_amount: "Salaire brut",
  salary_deductions: "Cotisations sociales (AVS/AC/AANP)",
  pension_income: "Rentes AVS/AI/LPP",
  unemployment_income: "Indemnités chômage/APG",
  side_income: "Revenu activité accessoire",
  other_income: "Autres revenus",
  dividends_types: "Types de titres",
  dividends_amount: "Dividendes et intérêts",
  rental_type: "Type de bien immobilier",
  rental_income_amount: "Revenus locatifs bruts",
  rental_expenses_amount: "Charges déductibles (hypothèques + entretien)",
  alimony_received_amount: "Pension alimentaire reçue",
  deductions_lpp: "Rachat LPP",
  deductions_lpp_amount: "Montant rachat LPP",
  deductions_3a: "Pilier 3A",
  deductions_3a_amount: "Montant versé 3A",
  deductions_3b: "Pilier 3B",
  deductions_3b_amount: "Primes 3B",
  deductions_lamal: "Primes LAMal",
  deductions_pro_expenses: "Frais professionnels",
  deductions_transport: "Transport",
  deductions_transport_distance: "Distance domicile-travail (km)",
  deductions_telework: "Télétravail",
  deductions_telework_days: "Jours de télétravail/semaine",
  deductions_meals: "Repas à l'extérieur",
  deductions_training: "Formation continue",
  deductions_training_amount: "Frais de formation",
  deductions_medical: "Frais médicaux",
  deductions_medical_amount: "Montant frais médicaux",
  deductions_handicap: "Déduction invalidité",
  deductions_donations: "Dons",
  deductions_donations_amount: "Montant des dons",
  deductions_alimony: "Pensions alimentaires versées",
  deductions_alimony_amount: "Montant pensions versées",
  wealth_bank: "Comptes bancaires (solde 31.12)",
  wealth_securities: "Titres",
  wealth_securities_types: "Types de titres",
  wealth_securities_value: "Valeur du portefeuille (31.12)",
  wealth_real_estate: "Bien immobilier",
  wealth_real_estate_value: "Valeur fiscale du bien",
  wealth_vehicles: "Véhicules",
  wealth_vehicles_value: "Valeur des véhicules",
  wealth_other: "Autres éléments de fortune",
  wealth_other_assets_value: "Valeur autres actifs (bijoux, créances, 3B)",
  wealth_debts_amount: "Dettes totales",
  crv: "Contribution Religieuse Volontaire",
};

export default async function ReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireAuth();
  const declaration = await getDeclarationById(params.id, session.user.id);

  if (!declaration) notFound();

  const answers = declaration.answers as DeclarationAnswers;
  const computedTax = declaration.computedTax as ComputedTax | null;

  // Server action to mark as completed
  async function markAsCompleted() {
    "use server";
    const s = await requireAuth();
    await updateDeclarationStatus(params.id, s.user.id, "COMPLETED");
    redirect(`/declaration/${params.id}/export`);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href={`/declaration/${params.id}`}
            className="text-sm text-blue-600 hover:underline mb-2 inline-block"
          >
            ← Retour au wizard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Révision — Déclaration {declaration.taxYear}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Vérifiez l&apos;ensemble de vos réponses avant de générer votre dossier.
          </p>
        </div>
      </div>

      {/* Tax summary */}
      {computedTax ? (
        <TaxSummary computedTax={computedTax} />
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          ⚠️ Le calcul fiscal n&apos;est pas encore disponible. Terminez toutes les étapes du wizard.
        </div>
      )}

      {/* Answers review */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Récapitulatif de vos réponses</h2>
        </div>

        <div className="divide-y divide-gray-100">
          {SECTION_KEYS.map((section) => {
            const sectionAnswers = section.keys.filter(
              (k) => answers[k] !== undefined && answers[k] !== null
            );
            if (sectionAnswers.length === 0) return null;

            return (
              <div key={section.label} className="px-6 py-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  {section.label}
                </h3>
                <div className="space-y-2">
                  {sectionAnswers.map((key) => (
                    <div key={key} className="flex items-start justify-between gap-4">
                      <span className="text-sm text-gray-600 flex-shrink-0">
                        {KEY_LABELS[key] ?? key}
                      </span>
                      <span className="text-sm font-medium text-gray-900 text-right">
                        {formatAnswer(key, answers[key])}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed breakdown */}
      {computedTax && (
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">Décomposition fiscale détaillée</h2>
          <TaxBreakdown computedTax={computedTax} />
        </div>
      )}

      {/* Documents */}
      {declaration.documents.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-3">
            Documents joints ({declaration.documents.length})
          </h2>
          <div className="space-y-2">
            {declaration.documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-green-500">✓</span>
                <span>{doc.filename}</span>
                <span className="text-gray-400 text-xs">({doc.type})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-gray-200">
        <Link href={`/declaration/${params.id}`}>
          <Button variant="outline">Modifier une réponse</Button>
        </Link>
        {computedTax && (
          <form action={markAsCompleted}>
            <Button type="submit" className="w-full sm:w-auto">
              Valider et exporter →
            </Button>
          </form>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 text-center">
        Ce récapitulatif est une estimation basée sur les barèmes AFC-GE 2025. L&apos;impôt
        définitif est fixé par l&apos;administration fiscale cantonale.
        Deadline : <strong>31 mars 2026</strong> (prolongation possible jusqu&apos;au 30 juin 2026).
      </p>
    </div>
  );
}
