import { DocType } from "./declaration";

export type NodeType =
  | "single_choice"
  | "multi_choice"
  | "number_chf"
  | "number"
  | "date"
  | "document_upload"
  | "info"
  | "summary";

export type AnswerValue = string | number | string[] | boolean;

export interface NodeOption {
  value: string;
  label: string;
  description?: string;
}

export interface Condition {
  nodeId: string;
  operator: "eq" | "neq" | "in" | "not_in" | "gt" | "lt" | "gte" | "lte" | "exists";
  value: AnswerValue;
}

export interface NextNodeRule {
  conditions?: Condition[];
  nextNodeId: string;
}

export interface WizardNode {
  id: string;
  section: WizardSection;
  type: NodeType;
  question: string;
  hint?: string;
  options?: NodeOption[];
  requiredDocuments?: DocType[];
  next: NextNodeRule[]; // evaluated in order; first matching rule wins
  min?: number;
  max?: number;
  optional?: boolean;
}

export type WizardSection =
  | "residency"
  | "family"
  | "income"
  | "deductions"
  | "wealth"
  | "summary";

export const WIZARD_SECTION_LABELS: Record<WizardSection, string> = {
  residency: "Résidence",
  family: "Famille",
  income: "Revenus",
  deductions: "Déductions",
  wealth: "Fortune",
  summary: "Récapitulatif",
};

export interface WizardState {
  declarationId: string;
  currentNodeId: string;
  answers: Record<string, AnswerValue>;
  history: string[]; // stack of visited nodeIds for back navigation
  completedSections: WizardSection[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

export interface WizardProgress {
  section: WizardSection;
  totalNodes: number;
  completedNodes: number;
  percentage: number;
}
