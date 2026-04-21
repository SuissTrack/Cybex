import { WizardNode } from "@/types/wizard";

export const deductionsNodes: Record<string, WizardNode> = {
  deductions_lpp: {
    id: "deductions_lpp",
    section: "deductions",
    type: "single_choice",
    question: "Avez-vous effectué un rachat LPP (2ème pilier) en 2025 ?",
    hint: `Intégralement déductible, sans plafond.
ATTENTION : vous ne pouvez pas retirer ce capital sous forme de capital dans les
3 ans suivant le rachat (rappel d'impôt sinon).`,
    options: [
      { value: "yes", label: "Oui" },
      { value: "no", label: "Non" },
    ],
    requiredDocuments: ["LPP"],
    next: [
      {
        conditions: [{ nodeId: "deductions_lpp", operator: "eq", value: "yes" }],
        nextNodeId: "deductions_lpp_amount",
      },
      { nextNodeId: "deductions_3a" },
    ],
  },

  deductions_lpp_amount: {
    id: "deductions_lpp_amount",
    section: "deductions",
    type: "number_chf",
    question: "Quel est le montant total de votre rachat LPP en 2025 ? (CHF)",
    hint: `Ce montant est intégralement déductible du revenu imposable, sans plafond.
Vous trouverez ce montant sur la confirmation de rachat remise par votre caisse de pension.`,
    requiredDocuments: ["LPP"],
    min: 0,
    next: [{ nextNodeId: "deductions_3a" }],
  },

  deductions_3a: {
    id: "deductions_3a",
    section: "deductions",
    type: "single_choice",
    question: "Avez-vous versé dans un 3ème pilier A en 2025 ?",
    hint: `Plafond 2025 : CHF 7'258 (salarié avec LPP) ou CHF 36'288
(indépendant sans LPP, max 20% revenu net).
NOUVEAU 2025 : rachats rétroactifs possibles pour années non cotisées
(10 dernières années).`,
    options: [
      { value: "yes", label: "Oui" },
      { value: "no", label: "Non" },
      { value: "yes_retroactive", label: "Oui, avec rachat rétroactif (années manquées)" },
    ],
    requiredDocuments: ["PILLAR3A"],
    next: [
      {
        conditions: [
          { nodeId: "deductions_3a", operator: "in", value: ["yes", "yes_retroactive"] },
        ],
        nextNodeId: "deductions_3a_amount",
      },
      { nextNodeId: "deductions_3b" },
    ],
  },

  deductions_3a_amount: {
    id: "deductions_3a_amount",
    section: "deductions",
    type: "number_chf",
    question: "Quel est le montant total versé dans votre pilier 3A en 2025 ? (CHF)",
    hint: `Plafond 2025 : CHF 7'258 (salarié avec LPP) ou CHF 36'288 (indépendant).
Pour les rachats rétroactifs : incluez le montant du rachat dans ce total.
Document : attestation annuelle remise par votre fondation bancaire ou assurance.`,
    requiredDocuments: ["PILLAR3A"],
    min: 0,
    next: [{ nextNodeId: "deductions_3b" }],
  },

  deductions_3b: {
    id: "deductions_3b",
    section: "deductions",
    type: "single_choice",
    question: "Avez-vous un 3ème pilier B (assurance-vie) ?",
    hint: `Spécificité genevoise (+ Fribourg) : les primes 3B sont déductibles à l'ICC.
Montant selon situation :
- Célibataire : CHF 2'232
- Couple : CHF 3'348 (+ CHF 900 par enfant à charge)
Ces déductions se combinent avec les primes LAMal.`,
    options: [
      { value: "yes", label: "Oui" },
      { value: "no", label: "Non" },
    ],
    requiredDocuments: ["PILLAR3B"],
    next: [
      {
        conditions: [{ nodeId: "deductions_3b", operator: "eq", value: "yes" }],
        nextNodeId: "deductions_3b_amount",
      },
      { nextNodeId: "deductions_lamal" },
    ],
  },

  deductions_3b_amount: {
    id: "deductions_3b_amount",
    section: "deductions",
    type: "number_chf",
    question: "Quel est le montant total des primes 3B (assurance-vie) versées en 2025 ? (CHF)",
    hint: `La déduction 3B s'ajoute à celle des primes LAMal (plafond combiné).
Plafond ICC dédié 3B : CHF 2'232 (célibataire), CHF 3'348 (couple).
Document : attestation annuelle de votre assureur.`,
    requiredDocuments: ["PILLAR3B"],
    min: 0,
    next: [{ nextNodeId: "deductions_lamal" }],
  },

  deductions_lamal: {
    id: "deductions_lamal",
    section: "deductions",
    type: "number_chf",
    question: "Quel est le montant total de vos primes LAMal 2025 ? (CHF)",
    hint: `ICC : déductible jusqu'à 2× la prime cantonale moyenne (env. CHF 8'328
pour un adulte en 2025, CHF 16'656 pour un couple).
IFD : combiné avec le 3B jusqu'à CHF 3'500 (célibataire) ou CHF 7'000 (couple).
Déclarez le montant total même si vous bénéficiez d'un subside —
indiquez le subside séparément au code 16.30.`,
    requiredDocuments: ["LAMAL"],
    min: 0,
    next: [{ nextNodeId: "deductions_pro_expenses" }],
  },

  deductions_pro_expenses: {
    id: "deductions_pro_expenses",
    section: "deductions",
    type: "single_choice",
    question: "Comment souhaitez-vous déduire vos frais professionnels ?",
    hint: `Le forfait ICC est plafonné à CHF 4'000, le forfait IFD à CHF 4'000.
Si vous avez des frais élevés (transport, formation), les frais effectifs
sont souvent plus avantageux.`,
    options: [
      { value: "forfait", label: "Forfait automatique (3% du revenu net, max CHF 4'000)" },
      { value: "real_expenses", label: "Frais effectifs (si supérieurs au forfait)" },
    ],
    next: [{ nextNodeId: "deductions_transport" }],
  },

  deductions_transport: {
    id: "deductions_transport",
    section: "deductions",
    type: "single_choice",
    question: "Comment vous rendez-vous au travail ?",
    hint: `Transports en commun : déductibles sur frais réels (abonnement mensuel/annuel).
Voiture : plafonné à CHF 529/an ICC (indépendamment de la distance).
IFD : jusqu'à CHF 3'200 (CHF 0.70/km).`,
    options: [
      { value: "public_transport", label: "Transports en commun (TPG, CFF)" },
      { value: "car", label: "Voiture personnelle" },
      { value: "bike", label: "Vélo / trottinette" },
      { value: "homeworker", label: "100% télétravail" },
    ],
    next: [
      {
        conditions: [{ nodeId: "deductions_transport", operator: "eq", value: "car" }],
        nextNodeId: "deductions_transport_distance",
      },
      { nextNodeId: "deductions_telework" },
    ],
  },

  deductions_transport_distance: {
    id: "deductions_transport_distance",
    section: "deductions",
    type: "number",
    question: "Distance domicile-travail en km (aller simple) ?",
    hint: `Voiture : la déduction ICC est forfaitaire à CHF 529/an (indépendamment
de la distance). Pour l'IFD : CHF 0.70/km, max CHF 3'200/an.
Si les TP sont moins chers, l'AFC applique le tarif TP même pour une voiture.`,
    min: 1,
    max: 500,
    next: [{ nextNodeId: "deductions_telework" }],
  },

  deductions_telework: {
    id: "deductions_telework",
    section: "deductions",
    type: "single_choice",
    question: "Faites-vous du télétravail ?",
    hint: `NOUVEAU guide 2025 : déduction spécifique télétravail.
Si vous travaillez depuis chez vous, les frais de transport sont réduits
proportionnellement aux jours de présence au bureau.`,
    options: [
      { value: "yes_partial", label: "Oui, partiellement (quelques jours/semaine)" },
      { value: "yes_full", label: "Oui, à 100% (toujours depuis chez moi)" },
      { value: "no", label: "Non" },
    ],
    next: [
      {
        conditions: [
          { nodeId: "deductions_telework", operator: "eq", value: "yes_partial" },
        ],
        nextNodeId: "deductions_telework_days",
      },
      { nextNodeId: "deductions_meals" },
    ],
  },

  deductions_telework_days: {
    id: "deductions_telework_days",
    section: "deductions",
    type: "number",
    question: "Combien de jours par semaine travaillez-vous en télétravail ?",
    hint: `Les frais de transport sont calculés sur les jours de présence effective
au bureau uniquement (220 jours/an × % présence au bureau).`,
    min: 1,
    max: 5,
    next: [{ nextNodeId: "deductions_meals" }],
  },

  deductions_meals: {
    id: "deductions_meals",
    section: "deductions",
    type: "single_choice",
    question: "Prenez-vous vos repas à l'extérieur les jours de travail ?",
    hint: `Déduction forfaitaire de CHF 3'200/an si vous déjeunez à l'extérieur.
Non cumulable si l'employeur rembourse les frais.`,
    options: [
      {
        value: "yes_distance",
        label: "Oui, domicile trop éloigné ou horaires décalés",
      },
      {
        value: "yes_no_kitchen",
        label: "Oui, pas de cuisine sur le lieu de travail",
      },
      { value: "no", label: "Non, je rentre manger à la maison" },
    ],
    next: [{ nextNodeId: "deductions_training" }],
  },

  deductions_training: {
    id: "deductions_training",
    section: "deductions",
    type: "single_choice",
    question:
      "Avez-vous eu des frais de formation continue en lien avec votre activité professionnelle actuelle ?",
    hint: `Déductibles jusqu'à CHF 12'000/an si liés à l'emploi actuel (perfectionnement).
Formation reconversion : traitement différent — contactez l'AFC-GE.`,
    options: [
      { value: "yes", label: "Oui" },
      { value: "no", label: "Non" },
    ],
    next: [
      {
        conditions: [{ nodeId: "deductions_training", operator: "eq", value: "yes" }],
        nextNodeId: "deductions_training_amount",
      },
      { nextNodeId: "deductions_medical" },
    ],
  },

  deductions_training_amount: {
    id: "deductions_training_amount",
    section: "deductions",
    type: "number_chf",
    question: "Quel est le montant total de vos frais de formation continue en 2025 ? (CHF)",
    hint: `Plafond déductible : CHF 12'000/an.
Incluez : cours, séminaires, inscriptions, livres et matériel professionnels.
Conservez toutes les factures et justificatifs de paiement.`,
    min: 0,
    next: [{ nextNodeId: "deductions_medical" }],
  },

  deductions_medical: {
    id: "deductions_medical",
    section: "deductions",
    type: "single_choice",
    question: "Avez-vous des frais médicaux non remboursés importants en 2025 ?",
    hint: `Déductibles uniquement pour la part dépassant 5% de votre revenu net.
Incluez : franchise, quote-part, lunettes, dentiste, physiothérapie,
médecines alternatives reconnues.`,
    options: [
      { value: "yes", label: "Oui" },
      { value: "no", label: "Non" },
    ],
    requiredDocuments: ["MEDICAL"],
    next: [
      {
        conditions: [{ nodeId: "deductions_medical", operator: "eq", value: "yes" }],
        nextNodeId: "deductions_medical_amount",
      },
      { nextNodeId: "deductions_handicap" },
    ],
  },

  deductions_medical_amount: {
    id: "deductions_medical_amount",
    section: "deductions",
    type: "number_chf",
    question: "Quel est le montant total de vos frais médicaux non remboursés en 2025 ? (CHF)",
    hint: `Seule la part dépassant 5% de votre revenu net est déductible —
l'AFC applique ce seuil automatiquement.
Incluez : franchise, quote-part, dentiste, lunettes, physiothérapie.
Conservez toutes les factures.`,
    requiredDocuments: ["MEDICAL"],
    min: 0,
    next: [{ nextNodeId: "deductions_handicap" }],
  },

  deductions_handicap: {
    id: "deductions_handicap",
    section: "deductions",
    type: "single_choice",
    question: "Avez-vous ou un membre de votre ménage un handicap reconnu ?",
    hint: `Des déductions spécifiques s'appliquent selon le degré d'invalidité
reconnu par l'AI (assurance-invalidité).`,
    options: [
      { value: "yes", label: "Oui" },
      { value: "no", label: "Non" },
    ],
    next: [{ nextNodeId: "deductions_donations" }],
  },

  deductions_donations: {
    id: "deductions_donations",
    section: "deductions",
    type: "single_choice",
    question: "Avez-vous effectué des dons à des organisations d'utilité publique reconnues ?",
    hint: `Déductibles entre CHF 100 et 20% du revenu net à Genève.
L'organisation doit être reconnue d'utilité publique (liste disponible sur ge.ch).`,
    options: [
      { value: "yes", label: "Oui" },
      { value: "no", label: "Non" },
    ],
    requiredDocuments: ["DONATION"],
    next: [
      {
        conditions: [{ nodeId: "deductions_donations", operator: "eq", value: "yes" }],
        nextNodeId: "deductions_donations_amount",
      },
      { nextNodeId: "deductions_alimony" },
    ],
  },

  deductions_donations_amount: {
    id: "deductions_donations_amount",
    section: "deductions",
    type: "number_chf",
    question: "Quel est le montant total de vos dons en 2025 ? (CHF)",
    hint: `Déductibles entre CHF 100 et 20% du revenu net.
L'organisation doit être reconnue d'utilité publique (liste sur ge.ch).
Conservez les reçus ou attestations de dons remis par les organisations.`,
    requiredDocuments: ["DONATION"],
    min: 100,
    next: [{ nextNodeId: "deductions_alimony" }],
  },

  deductions_alimony: {
    id: "deductions_alimony",
    section: "deductions",
    type: "single_choice",
    question:
      "Versez-vous des pensions alimentaires à un ex-conjoint ou pour des enfants mineurs dont vous n'avez pas la garde ?",
    hint: `Déductibles si versées à votre ex-conjoint(e) ou pour les enfants mineurs
dont l'autre parent a la garde principale.
Non déductibles pour enfants majeurs après le mois des 18 ans.`,
    options: [
      { value: "yes", label: "Oui" },
      { value: "no", label: "Non" },
    ],
    next: [
      {
        conditions: [{ nodeId: "deductions_alimony", operator: "eq", value: "yes" }],
        nextNodeId: "deductions_alimony_amount",
      },
      { nextNodeId: "wealth_bank" },
    ],
  },

  deductions_alimony_amount: {
    id: "deductions_alimony_amount",
    section: "deductions",
    type: "number_chf",
    question: "Quel est le montant total des pensions alimentaires versées en 2025 ? (CHF)",
    hint: `Intégralement déductibles si versées à votre ex-conjoint(e) ou pour des
enfants mineurs dont l'autre parent a la garde principale.
Conservez les justificatifs de paiement (virements, quittances).`,
    min: 0,
    next: [{ nextNodeId: "wealth_bank" }],
  },
};
