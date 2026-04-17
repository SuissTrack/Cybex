import { WizardNode, WizardSection, AnswerValue } from "@/types/wizard";

export type { WizardNode, WizardSection, AnswerValue };

export interface EvaluationContext {
  answers: Record<string, AnswerValue>;
}

export interface NavigationResult {
  nextNodeId: string;
  isTerminal: boolean;
}

export interface TreeMap {
  [nodeId: string]: WizardNode;
}
