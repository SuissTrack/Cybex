import { WizardNode } from "@/types/wizard";

export const wealthNodes: Record<string, WizardNode> = {
  wealth_bank: {
    id: "wealth_bank",
    section: "wealth",
    type: "number_chf",
    question: "Solde total de tous vos comptes bancaires/postaux au 31.12.2025 ? (CHF)",
    hint: `À déclarer obligatoirement même sans intérêts (formulaire F2).
Franchise fortune 2025 :
- Célibataire : CHF 87'632
- Couple : CHF 175'264
- Par enfant à charge : CHF 43'816`,
    min: 0,
    next: [{ nextNodeId: "wealth_securities" }],
  },

  wealth_securities: {
    id: "wealth_securities",
    section: "wealth",
    type: "single_choice",
    question: "Possédez-vous des titres (actions, obligations, fonds) ?",
    hint: `À déclarer à la valeur vénale au 31.12.2025 (formulaire F3).
L'impôt anticipé (35%) sur intérêts/dividendes suisses est récupérable
via le formulaire F4.`,
    options: [
      { value: "yes", label: "Oui" },
      { value: "no", label: "Non" },
    ],
    next: [
      {
        conditions: [{ nodeId: "wealth_securities", operator: "eq", value: "yes" }],
        nextNodeId: "wealth_securities_types",
      },
      { nextNodeId: "wealth_real_estate" },
    ],
  },

  wealth_securities_types: {
    id: "wealth_securities_types",
    section: "wealth",
    type: "multi_choice",
    question: "Type de titres ?",
    hint: `Crypto : valorisées au cours de change officiel AFC au 31.12.2025.
Participations ≥ 10% : peuvent bénéficier de l'imposition partielle
RFFA (formulaires F5-F6).`,
    options: [
      { value: "swiss", label: "Titres suisses" },
      { value: "foreign", label: "Titres étrangers" },
      { value: "crypto", label: "Crypto-monnaies (valeur marchande au 31.12)" },
      { value: "participations", label: "Participations dans des sociétés non cotées" },
    ],
    requiredDocuments: ["BANK_STATEMENT"],
    next: [{ nextNodeId: "wealth_securities_value" }],
  },

  wealth_securities_value: {
    id: "wealth_securities_value",
    section: "wealth",
    type: "number_chf",
    question: "Valeur totale de votre portefeuille de titres au 31.12.2025 ? (CHF)",
    hint: `Indiquez la valeur vénale totale au 31.12.2025 selon votre relevé bancaire
(formulaire F3 — "Valeur fiscale" ou "cours de clôture").
Pour les crypto : utilisez le cours officiel AFC disponible sur admin.ch.
Pour les fonds : valeur liquidative au 31.12.`,
    requiredDocuments: ["BANK_STATEMENT"],
    min: 0,
    next: [{ nextNodeId: "wealth_real_estate" }],
  },

  wealth_real_estate: {
    id: "wealth_real_estate",
    section: "wealth",
    type: "single_choice",
    question: "Êtes-vous propriétaire d'un bien immobilier à Genève ?",
    hint: `Valeur fiscale 2025 : revalorisée de +12% par rapport à 2024 (réforme cantonale).
L'IIC (Impôt Immobilier Complémentaire) s'applique si valeur fiscale > CHF 500'000.`,
    options: [
      { value: "yes", label: "Oui" },
      { value: "no", label: "Non" },
    ],
    next: [
      {
        conditions: [{ nodeId: "wealth_real_estate", operator: "eq", value: "yes" }],
        nextNodeId: "wealth_real_estate_value",
      },
      { nextNodeId: "wealth_vehicles" },
    ],
  },

  wealth_real_estate_value: {
    id: "wealth_real_estate_value",
    section: "wealth",
    type: "number_chf",
    question: "Quelle est la valeur fiscale de votre bien immobilier au 31.12.2025 ? (CHF)",
    hint: `La valeur fiscale figure sur votre dernier bordereau ICC ou sur une estimation
de l'AFC-GE. Elle est revalorisée de +12% en 2025 par rapport à 2024.
Elle diffère de la valeur de marché (généralement inférieure).
L'IIC s'applique si la valeur fiscale dépasse CHF 500'000.`,
    requiredDocuments: ["REAL_ESTATE"],
    min: 0,
    next: [{ nextNodeId: "wealth_vehicles" }],
  },

  wealth_vehicles: {
    id: "wealth_vehicles",
    section: "wealth",
    type: "single_choice",
    question: "Possédez-vous un ou plusieurs véhicules ?",
    hint: `Valeur vénale du véhicule au 31.12.2025 à déclarer comme fortune.
Référence : valeur Eurotax (disponible sur eurotax.ch).`,
    options: [
      { value: "yes", label: "Oui" },
      { value: "no", label: "Non" },
    ],
    next: [
      {
        conditions: [{ nodeId: "wealth_vehicles", operator: "eq", value: "yes" }],
        nextNodeId: "wealth_vehicles_value",
      },
      { nextNodeId: "wealth_other" },
    ],
  },

  wealth_vehicles_value: {
    id: "wealth_vehicles_value",
    section: "wealth",
    type: "number_chf",
    question: "Valeur vénale totale de vos véhicules au 31.12.2025 ? (CHF)",
    hint: `Utilisez la valeur Eurotax (eurotax.ch) ou la cote officielle Touring Club.
Si plusieurs véhicules, additionnez les valeurs.
Voitures, motos, bateaux de plaisance > CHF 5'000 sont à déclarer.`,
    min: 0,
    next: [{ nextNodeId: "wealth_other" }],
  },

  wealth_other: {
    id: "wealth_other",
    section: "wealth",
    type: "multi_choice",
    question: "Avez-vous d'autres éléments de fortune à déclarer ?",
    options: [
      { value: "jewelry", label: "Bijoux / objets de valeur > CHF 10'000" },
      { value: "life_insurance", label: "Valeur de rachat assurance-vie 3B" },
      { value: "loans", label: "Créances (argent prêté)" },
      { value: "debts", label: "Dettes (à déduire de la fortune brute)" },
      { value: "none", label: "Non" },
    ],
    next: [
      {
        conditions: [
          { nodeId: "wealth_other", operator: "in", value: ["jewelry", "life_insurance", "loans"] },
        ],
        nextNodeId: "wealth_other_assets_value",
      },
      {
        conditions: [{ nodeId: "wealth_other", operator: "in", value: ["debts"] }],
        nextNodeId: "wealth_debts_amount",
      },
      { nextNodeId: "crv" },
    ],
  },

  wealth_other_assets_value: {
    id: "wealth_other_assets_value",
    section: "wealth",
    type: "number_chf",
    optional: true,
    question: "Valeur totale de ces autres actifs au 31.12.2025 ? (CHF)",
    hint: `Additionnez :
- Bijoux et objets de valeur (valeur assurée ou de remplacement)
- Valeur de rachat de votre assurance-vie 3B (attestation de l'assureur)
- Créances : argent prêté à des tiers (montant principal restant dû)
À déclarer uniquement si la valeur totale dépasse CHF 10'000.`,
    min: 0,
    next: [
      {
        conditions: [{ nodeId: "wealth_other", operator: "in", value: ["debts"] }],
        nextNodeId: "wealth_debts_amount",
      },
      { nextNodeId: "crv" },
    ],
  },

  wealth_debts_amount: {
    id: "wealth_debts_amount",
    section: "wealth",
    type: "number_chf",
    question: "Montant total de vos dettes au 31.12.2025 ? (CHF)",
    hint: `Les dettes sont déduites de votre fortune brute pour obtenir la fortune nette.
Incluez : hypothèques restantes, emprunts bancaires, dettes privées documentées.
N'incluez pas : crédits à la consommation < CHF 500, découverts temporaires.`,
    min: 0,
    next: [{ nextNodeId: "crv" }],
  },

  crv: {
    id: "crv",
    section: "wealth",
    type: "single_choice",
    question: "Souhaitez-vous verser une contribution religieuse volontaire (CRV) ?",
    hint: `Spécificité genevoise : la CRV est volontaire depuis 2020.
Elle est collectée avec l'impôt cantonal si vous le souhaitez.`,
    options: [
      { value: "yes_catholic", label: "Oui — Église catholique romaine" },
      { value: "yes_protestant", label: "Oui — Église protestante" },
      { value: "yes_other", label: "Oui — Autre communauté religieuse" },
      { value: "no", label: "Non" },
    ],
    next: [{ nextNodeId: "summary" }],
  },

  summary: {
    id: "summary",
    section: "summary",
    type: "summary",
    question: "Récapitulatif de votre déclaration 2025",
    hint: `Voici le résumé de toutes vos réponses, l'estimation fiscale (ICC + IFD),
la liste des documents manquants, et les optimisations potentielles.`,
    next: [],
  },
};
