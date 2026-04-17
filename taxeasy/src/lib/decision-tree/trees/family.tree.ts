import { WizardNode } from "@/types/wizard";

export const familyNodes: Record<string, WizardNode> = {
  family_status: {
    id: "family_status",
    section: "family",
    type: "single_choice",
    question: "Quelle est votre situation familiale au 31 décembre 2025 ?",
    hint: "Votre statut au 31.12 détermine votre barème (splitting complet pour mariés/partenaires enregistrés, splitting partiel pour familles monoparentales).",
    options: [
      { value: "single", label: "Célibataire" },
      { value: "married", label: "Marié(e) / Partenaire enregistré(e)" },
      { value: "divorced", label: "Divorcé(e) / Séparé(e)" },
      { value: "widowed", label: "Veuf / Veuve" },
    ],
    next: [
      {
        conditions: [{ nodeId: "family_status", operator: "eq", value: "married" }],
        nextNodeId: "spouse_work",
      },
      { nextNodeId: "monoparental" },
    ],
  },

  spouse_work: {
    id: "spouse_work",
    section: "family",
    type: "single_choice",
    question: "Votre conjoint(e) exerce-t-il/elle une activité lucrative ?",
    hint: "Si oui, chaque conjoint doit joindre son certificat de salaire. Vous bénéficiez tous les deux du splitting (taux appliqué à 50% du revenu cumulé).",
    options: [
      { value: "yes", label: "Oui" },
      { value: "no", label: "Non" },
    ],
    requiredDocuments: ["SALARY_CERT"],
    next: [
      {
        conditions: [{ nodeId: "spouse_work", operator: "eq", value: "yes" }],
        nextNodeId: "spouse_deduction",
      },
      { nextNodeId: "children" },
    ],
  },

  spouse_deduction: {
    id: "spouse_deduction",
    section: "family",
    type: "number_chf",
    question: "Quel est le revenu annuel brut de votre conjoint(e) ? (CHF)",
    hint: "Une déduction IFD est accordée sur le gain du conjoint le moins rémunéré : 50% du revenu, min. CHF 8'500, max. CHF 13'900.",
    min: 0,
    next: [{ nextNodeId: "children" }],
  },

  monoparental: {
    id: "monoparental",
    section: "family",
    type: "single_choice",
    question:
      "Avez-vous des enfants à charge dont vous assurez seul(e) l'entretien principal ?",
    hint: "Si oui, vous bénéficiez du splitting partiel (taux appliqué à 55.56% du revenu) et d'une déduction pour charge de famille.",
    options: [
      { value: "yes", label: "Oui" },
      { value: "no", label: "Non" },
    ],
    next: [{ nextNodeId: "children" }],
  },

  children: {
    id: "children",
    section: "family",
    type: "single_choice",
    question: "Avez-vous des enfants à charge en 2025 ?",
    options: [
      { value: "yes", label: "Oui" },
      { value: "no", label: "Non" },
    ],
    next: [
      {
        conditions: [{ nodeId: "children", operator: "eq", value: "yes" }],
        nextNodeId: "children_count",
      },
      { nextNodeId: "income_main" },
    ],
  },

  children_count: {
    id: "children_count",
    section: "family",
    type: "number",
    question: "Combien d'enfants avez-vous à charge ?",
    hint: "Enfant à charge = moins de 18 ans, OU moins de 25 ans et en formation. Déduction de CHF 13'000 par enfant (ICC) et CHF 6'500 (IFD).",
    min: 1,
    max: 10,
    next: [{ nextNodeId: "children_age_check" }],
  },

  children_age_check: {
    id: "children_age_check",
    section: "family",
    type: "single_choice",
    question: "Vos enfants ont-ils entre 18 et 25 ans et sont-ils encore en formation ?",
    hint: "Un enfant en formation de 18 à 25 ans reste à charge s'il ne dispose pas de revenus/fortune suffisants.",
    options: [
      { value: "yes_all", label: "Oui, tous" },
      { value: "yes_some", label: "Oui, certains" },
      { value: "no", label: "Non" },
    ],
    next: [{ nextNodeId: "children_custody" }],
  },

  children_custody: {
    id: "children_custody",
    section: "family",
    type: "multi_choice",
    question: "Avez-vous des frais de garde ou scolaires pour des enfants de moins de 14 ans ?",
    hint: "Déductibles jusqu'à CHF 25'000 par enfant < 14 ans (ICC). Nouveauté 2025 : les camps sont déductibles à CHF 250/semaine.",
    options: [
      { value: "daycare_creche", label: "Crèche / garderie / maman de jour" },
      { value: "parascolaire", label: "Parascolaire / UAPE" },
      { value: "camps", label: "Camps de vacances (CHF 250 par camp/semaine)" },
      { value: "none", label: "Non" },
    ],
    next: [
      {
        conditions: [
          { nodeId: "children_custody", operator: "in", value: ["daycare_creche", "parascolaire"] },
        ],
        nextNodeId: "childcare_amount",
      },
      {
        conditions: [{ nodeId: "children_custody", operator: "in", value: ["camps"] }],
        nextNodeId: "childcare_camps_count",
      },
      { nextNodeId: "income_main" },
    ],
  },

  childcare_amount: {
    id: "childcare_amount",
    section: "family",
    type: "number_chf",
    question: "Montant total des frais de garde payés en 2025 ? (CHF)",
    hint: `Incluez : crèche, garderie, maman de jour, parascolaire, UAPE.
Déductibles jusqu'à CHF 25'000 par enfant de moins de 14 ans (ICC uniquement).
Conservez les attestations de frais remises par l'établissement.`,
    min: 0,
    next: [
      {
        conditions: [{ nodeId: "children_custody", operator: "in", value: ["camps"] }],
        nextNodeId: "childcare_camps_count",
      },
      { nextNodeId: "income_main" },
    ],
  },

  childcare_camps_count: {
    id: "childcare_camps_count",
    section: "family",
    type: "number",
    question: "Combien de camps de vacances vos enfants ont-ils effectués en 2025 ?",
    hint: `Nouveauté 2025 : CHF 250 déductibles par camp ou semaine de camp.
Comptez chaque camp ou semaine indépendamment.
La déduction est limitée aux enfants de moins de 14 ans.`,
    min: 1,
    max: 20,
    next: [{ nextNodeId: "income_main" }],
  },
};
