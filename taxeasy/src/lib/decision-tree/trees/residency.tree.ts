import { WizardNode } from "@/types/wizard";

export const residencyNodes: Record<string, WizardNode> = {
  residency_type: {
    id: "residency_type",
    section: "residency",
    type: "single_choice",
    question: "Quelle est votre situation de résidence au 31 décembre 2025 ?",
    options: [
      { value: "resident_ge", label: "Résident(e) genevois(e)" },
      {
        value: "tou",
        label: "Imposé(e) à la source — je souhaite faire une TOU",
        description: "Taxation Ordinaire Ultérieure",
      },
      { value: "frontalier", label: "Frontalier(ère) franco-genevois(e)" },
      { value: "other", label: "Autre" },
    ],
    next: [
      {
        conditions: [{ nodeId: "residency_type", operator: "eq", value: "resident_ge" }],
        nextNodeId: "family_status",
      },
      {
        conditions: [{ nodeId: "residency_type", operator: "eq", value: "tou" }],
        nextNodeId: "tou_notice",
      },
      {
        conditions: [{ nodeId: "residency_type", operator: "eq", value: "frontalier" }],
        nextNodeId: "frontalier_notice",
      },
      {
        nextNodeId: "out_of_scope",
      },
    ],
  },

  tou_notice: {
    id: "tou_notice",
    section: "residency",
    type: "info",
    question: "Taxation Ordinaire Ultérieure (TOU)",
    hint: `Si vous êtes imposé(e) à la source et souhaitez effectuer une TOU,
vous devez déposer votre déclaration au plus tard le 31 mars 2026
(ou le 30 juin 2026 si vous obtenez un délai).

Formulaire DRIS/TOU disponible sur ge.ch/impots.

Cette application vous guidera dans la saisie de votre déclaration TOU.`,
    next: [{ nextNodeId: "family_status" }],
  },

  frontalier_notice: {
    id: "frontalier_notice",
    section: "residency",
    type: "info",
    question: "Frontaliers franco-genevois",
    hint: `TaxEasy ne couvre pas encore la situation des frontaliers franco-genevois
dans cette version.

Veuillez contacter l'AFC-GE ou utiliser GeTax directement.`,
    next: [{ nextNodeId: "summary" }],
  },

  out_of_scope: {
    id: "out_of_scope",
    section: "residency",
    type: "info",
    question: "Situation non couverte",
    hint: `Cette application est destinée aux contribuables genevois résidents.

Pour les autres situations (expatriés, non-résidents, autres cantons),
veuillez vous adresser directement à l'AFC-GE.`,
    next: [{ nextNodeId: "summary" }],
  },
};
