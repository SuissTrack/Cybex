import { WizardNode } from "@/types/wizard";

export const incomeNodes: Record<string, WizardNode> = {
  income_main: {
    id: "income_main",
    section: "income",
    type: "single_choice",
    question: "Quelle est votre situation professionnelle principale en 2025 ?",
    options: [
      { value: "employee", label: "Salarié(e)" },
      { value: "employee_side", label: "Salarié(e) avec activité accessoire" },
      {
        value: "self_employed",
        label: "Indépendant(e)",
        description: "Hors MVP v1 — redirection vers AFC-GE",
      },
      { value: "retired", label: "Retraité(e) / AVS" },
      { value: "unemployed", label: "Demandeur(se) d'emploi / APG" },
      {
        value: "fonct_intl",
        label: "Fonctionnaire international(e)",
        description: "Exonération partielle possible",
      },
    ],
    next: [
      {
        conditions: [
          { nodeId: "income_main", operator: "in", value: ["employee", "employee_side"] },
        ],
        nextNodeId: "salary_upload",
      },
      {
        conditions: [{ nodeId: "income_main", operator: "eq", value: "retired" }],
        nextNodeId: "pension_income",
      },
      {
        conditions: [{ nodeId: "income_main", operator: "eq", value: "unemployed" }],
        nextNodeId: "unemployment_income",
      },
      {
        conditions: [{ nodeId: "income_main", operator: "eq", value: "self_employed" }],
        nextNodeId: "self_employed_notice",
      },
      {
        conditions: [{ nodeId: "income_main", operator: "eq", value: "fonct_intl" }],
        nextNodeId: "fonct_intl_notice",
      },
      { nextNodeId: "other_income" },
    ],
  },

  self_employed_notice: {
    id: "self_employed_notice",
    section: "income",
    type: "info",
    question: "Activité indépendante — Hors MVP v1",
    hint: `La déclaration pour les indépendants nécessite la comptabilité complète
(bilan, compte de pertes et profits) et est hors périmètre de cette version.

Veuillez utiliser GeTax directement ou contacter un fiduciaire.

Si vous avez également un revenu salarié, retournez en arrière et
sélectionnez "Salarié(e) avec activité accessoire".`,
    next: [{ nextNodeId: "other_income" }],
  },

  fonct_intl_notice: {
    id: "fonct_intl_notice",
    section: "income",
    type: "info",
    question: "Fonctionnaire international(e)",
    hint: `Les fonctionnaires internationaux (ONU, OMS, CICR, etc.) bénéficient
d'une exonération de leur traitement officiel à l'ICC (mais pas toujours à l'IFD).

Vos autres revenus (conjoint, revenus locatifs, fortune) restent imposables.
TaxEasy vous guidera pour les déclarer correctement.`,
    next: [{ nextNodeId: "other_income" }],
  },

  salary_upload: {
    id: "salary_upload",
    section: "income",
    type: "document_upload",
    optional: true,
    question: "Téléchargez votre certificat de salaire 2025",
    hint: `Document recommandé remis par votre employeur en janvier. Il contient :
salaire brut, cotisations LPP, allocations familiales (NOUVEAU 2025 : les
allocations familiales sont intégrées dans le salaire brut sur le certificat),
impôt à la source retenu.`,
    requiredDocuments: ["SALARY_CERT"],
    next: [{ nextNodeId: "salary_amount" }],
  },

  salary_amount: {
    id: "salary_amount",
    section: "income",
    type: "number_chf",
    question: "Quel est votre salaire brut 2025 ? (CHF)",
    hint: `Reportez le montant figurant sur votre certificat de salaire, case A —
allocations familiales incluses (nouveauté 2025).
Si vous avez plusieurs employeurs, additionnez les montants.`,
    min: 0,
    next: [{ nextNodeId: "salary_deductions" }],
  },

  salary_deductions: {
    id: "salary_deductions",
    section: "income",
    type: "number_chf",
    optional: true,
    question: "Total des cotisations sociales prélevées sur votre salaire 2025 ? (CHF)",
    hint: `Additionnez les cases 10.1 à 10.3 de votre certificat de salaire :
- Case 10.1 : cotisations AVS/AI/APG (5.3% du salaire brut)
- Case 10.2 : cotisations chômage AC (1.1% jusqu'à CHF 148'200)
- Case 10.3 : cotisations accident AANP (variable selon employeur)
Ne pas inclure le LPP (case 11) — déclaré séparément via le rachat.
Si inconnu, laissez vide : une estimation sera calculée automatiquement.`,
    min: 0,
    next: [
      {
        conditions: [{ nodeId: "income_main", operator: "eq", value: "employee_side" }],
        nextNodeId: "side_income",
      },
      { nextNodeId: "other_income" },
    ],
  },

  pension_income: {
    id: "pension_income",
    section: "income",
    type: "number_chf",
    question: "Quel est le montant total de vos rentes AVS/AI/LPP perçues en 2025 ? (CHF)",
    hint: `Incluez : rente AVS, rente LPP (2ème pilier), rente d'invalidité AI.
Les attestations annuelles de la caisse AVS et de votre caisse de pension
sont nécessaires. Ces montants sont intégralement imposables.`,
    min: 0,
    next: [{ nextNodeId: "other_income" }],
  },

  unemployment_income: {
    id: "unemployment_income",
    section: "income",
    type: "number_chf",
    question:
      "Quel est le montant total des indemnités perçues en 2025 ? (CHF — chômage, APG, maternité)",
    hint: `Toutes les indemnités de remplacement sont imposables :
chômage (ICh), allocations perte de gain (APG), indemnités maternité/paternité.
Votre caisse de chômage ou employeur vous remettra une attestation annuelle.`,
    min: 0,
    next: [{ nextNodeId: "other_income" }],
  },

  side_income: {
    id: "side_income",
    section: "income",
    type: "number_chf",
    question: "Quel est le revenu brut de votre activité accessoire ? (CHF)",
    hint: `Si < CHF 2'300 : vous pouvez demander l'exonération.
Au-delà, déduction forfaitaire de 20% (min CHF 800, max CHF 2'400) ou frais effectifs.`,
    min: 0,
    next: [{ nextNodeId: "other_income" }],
  },

  other_income: {
    id: "other_income",
    section: "income",
    type: "multi_choice",
    question: "Avez-vous d'autres sources de revenus en 2025 ?",
    options: [
      { value: "dividends", label: "Dividendes / intérêts de titres" },
      { value: "rental", label: "Revenus locatifs" },
      { value: "alimony_received", label: "Pension alimentaire reçue" },
      { value: "social", label: "Prestations sociales (chômage, APG, maternité)" },
      { value: "none", label: "Non" },
    ],
    next: [
      {
        conditions: [{ nodeId: "other_income", operator: "in", value: ["dividends"] }],
        nextNodeId: "dividends_types",
      },
      {
        conditions: [{ nodeId: "other_income", operator: "in", value: ["rental"] }],
        nextNodeId: "rental_type",
      },
      {
        conditions: [{ nodeId: "other_income", operator: "in", value: ["alimony_received"] }],
        nextNodeId: "alimony_received_amount",
      },
      { nextNodeId: "deductions_lpp" },
    ],
  },

  dividends_types: {
    id: "dividends_types",
    section: "income",
    type: "multi_choice",
    question: "Avez-vous des titres suisses ou étrangers ?",
    hint: `Les dividendes suisses sont imposés à 100%.
Les dividendes étrangers nécessitent le formulaire DA-1 pour récupérer l'impôt
à la source étranger.
Les participations qualifiées (≥10%) bénéficient d'une imposition partielle
via les formulaires F5-F6 (réforme RFFA).`,
    options: [
      { value: "swiss_bonds", label: "Obligations / fonds suisses (F2 + F3)" },
      { value: "swiss_shares", label: "Actions suisses (F3 + impôt anticipé)" },
      { value: "foreign_shares", label: "Titres étrangers — dividendes (DA-1 requis)" },
      { value: "crypto", label: "Crypto-monnaies (fortune à déclarer)" },
    ],
    requiredDocuments: ["BANK_STATEMENT"],
    next: [{ nextNodeId: "dividends_amount" }],
  },

  dividends_amount: {
    id: "dividends_amount",
    section: "income",
    type: "number_chf",
    question: "Quel est le montant total de vos dividendes et intérêts perçus en 2025 ? (CHF)",
    hint: `Indiquez le total brut figurant sur votre relevé de portefeuille (formulaire F2/F3).
Dividendes suisses : imposés à 100%.
Dividendes étrangers : imposés à 100% (l'impôt étranger retenu est récupérable via DA-1).
Crypto : valorisez au cours de change officiel AFC au 31.12.2025.`,
    requiredDocuments: ["BANK_STATEMENT"],
    min: 0,
    next: [
      {
        conditions: [{ nodeId: "other_income", operator: "in", value: ["rental"] }],
        nextNodeId: "rental_type",
      },
      {
        conditions: [{ nodeId: "other_income", operator: "in", value: ["alimony_received"] }],
        nextNodeId: "alimony_received_amount",
      },
      { nextNodeId: "deductions_lpp" },
    ],
  },

  rental_type: {
    id: "rental_type",
    section: "income",
    type: "single_choice",
    question: "Type de bien immobilier ?",
    hint: `Propriétaire occupant : vous devez déclarer la valeur locative (fixée par
l'AFC-GE), déductible des intérêts hypothécaires + frais d'entretien réels OU
forfait 20%.
Impôt Immobilier Complémentaire (IIC) applicable si valeur fiscale > CHF 500'000.`,
    options: [
      { value: "rented_out", label: "Immeuble locatif / loué" },
      { value: "owner_occupied", label: "Propriétaire occupant (valeur locative)" },
      { value: "hlm", label: "Immeuble HLM" },
      { value: "commercial", label: "Immeuble commercial" },
    ],
    requiredDocuments: ["REAL_ESTATE"],
    next: [{ nextNodeId: "rental_income_amount" }],
  },

  rental_income_amount: {
    id: "rental_income_amount",
    section: "income",
    type: "number_chf",
    question: "Quel est le montant total des revenus locatifs bruts en 2025 ? (CHF)",
    hint: `Immeuble loué : indiquez le total des loyers encaissés (avant charges).
Propriétaire occupant : indiquez la valeur locative fixée par l'AFC-GE
(figurant sur votre bordereau de taxation précédent ou sur avis AFC).`,
    requiredDocuments: ["REAL_ESTATE"],
    min: 0,
    next: [{ nextNodeId: "rental_expenses_amount" }],
  },

  rental_expenses_amount: {
    id: "rental_expenses_amount",
    section: "income",
    type: "number_chf",
    optional: true,
    question: "Frais déductibles liés à ce bien immobilier en 2025 ? (CHF)",
    hint: `Déductibles : intérêts hypothécaires + frais d'entretien.
Pour les frais d'entretien, vous avez le choix entre :
- Frais effectifs (factures d'artisans, réparations)
- Forfait 20% des revenus locatifs bruts (souvent plus simple)
L'AFC-GE retiendra le montant le plus avantageux.
Si vous optez pour le forfait 20%, indiquez ici le montant calculé.`,
    requiredDocuments: ["REAL_ESTATE"],
    min: 0,
    next: [
      {
        conditions: [{ nodeId: "other_income", operator: "in", value: ["alimony_received"] }],
        nextNodeId: "alimony_received_amount",
      },
      { nextNodeId: "deductions_lpp" },
    ],
  },

  alimony_received_amount: {
    id: "alimony_received_amount",
    section: "income",
    type: "number_chf",
    question: "Quel est le montant total des pensions alimentaires reçues en 2025 ? (CHF)",
    hint: `Les pensions alimentaires reçues de votre ex-conjoint(e) sont intégralement
imposables et doivent être déclarées comme revenu.
Les contributions pour enfants à charge sont également imposables
chez le parent bénéficiaire.`,
    min: 0,
    next: [{ nextNodeId: "deductions_lpp" }],
  },
};
