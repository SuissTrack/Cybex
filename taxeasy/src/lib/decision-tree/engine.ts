import { WizardNode, WizardSection, AnswerValue } from "@/types/wizard";
import { TreeMap, NavigationResult } from "./types";
import { evaluateConditions } from "./evaluator";
import { allNodes } from "./trees/index";

const TERMINAL_NODES = new Set(["summary", "out_of_scope", "frontalier_notice"]);

export class DecisionTreeEngine {
  private readonly tree: TreeMap;

  constructor(tree: TreeMap = allNodes) {
    this.tree = tree;
  }

  getNode(nodeId: string): WizardNode {
    const node = this.tree[nodeId];
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    return node;
  }

  /**
   * Determines the next node given the current node and current answers (including
   * the answer just given for the current node).
   */
  getNextNode(currentNodeId: string, answers: Record<string, AnswerValue>): NavigationResult {
    const node = this.getNode(currentNodeId);

    for (const rule of node.next) {
      const conditionsMet =
        !rule.conditions || rule.conditions.length === 0
          ? true
          : evaluateConditions(rule.conditions, answers);

      if (conditionsMet) {
        return {
          nextNodeId: rule.nextNodeId,
          isTerminal: TERMINAL_NODES.has(rule.nextNodeId),
        };
      }
    }

    throw new Error(
      `No matching next rule for node "${currentNodeId}" with answers: ${JSON.stringify(answers)}`
    );
  }

  /**
   * Returns the ordered list of node IDs the user has visited,
   * given the full answer history.
   */
  buildPath(answers: Record<string, AnswerValue>): string[] {
    const path: string[] = ["residency_type"];
    let current = "residency_type";

    while (!TERMINAL_NODES.has(current)) {
      if (!(current in answers)) break;

      try {
        const { nextNodeId } = this.getNextNode(current, answers);
        path.push(nextNodeId);
        current = nextNodeId;
      } catch {
        break;
      }
    }

    return path;
  }

  /**
   * Returns progress info per section.
   */
  getSectionProgress(
    currentNodeId: string,
    answers: Record<string, AnswerValue>
  ): Record<WizardSection, { visited: number; total: number }> {
    const counts: Record<WizardSection, { visited: number; total: number }> = {
      residency: { visited: 0, total: 0 },
      family: { visited: 0, total: 0 },
      income: { visited: 0, total: 0 },
      deductions: { visited: 0, total: 0 },
      wealth: { visited: 0, total: 0 },
      summary: { visited: 0, total: 0 },
    };

    const visitedPath = this.buildPath(answers);

    for (const nodeId of Object.keys(this.tree)) {
      const node = this.tree[nodeId];
      counts[node.section].total++;
    }

    for (const nodeId of visitedPath) {
      const node = this.tree[nodeId];
      if (node && nodeId in answers) {
        counts[node.section].visited++;
      }
    }

    return counts;
  }

  isTerminal(nodeId: string): boolean {
    return TERMINAL_NODES.has(nodeId);
  }

  /**
   * Validates an answer value for a given node.
   */
  validateAnswer(nodeId: string, value: AnswerValue): string | null {
    const node = this.getNode(nodeId);

    if (node.optional) return null;

    if (value === undefined || value === null || value === "") {
      return "Ce champ est obligatoire.";
    }

    if (node.type === "number" || node.type === "number_chf") {
      const num = typeof value === "number" ? value : Number(value);
      if (isNaN(num) || num < 0) return "Veuillez entrer un montant valide.";
      if (node.min !== undefined && num < node.min) {
        return `La valeur minimale est ${node.min}.`;
      }
      if (node.max !== undefined && num > node.max) {
        return `La valeur maximale est ${node.max}.`;
      }
    }

    if (node.type === "multi_choice" && Array.isArray(value) && value.length === 0) {
      return "Veuillez sélectionner au moins une option.";
    }

    return null;
  }
}

// Singleton for use in server and client code
export const engine = new DecisionTreeEngine();
