import { AnswerValue } from "@/types/wizard";
import { engine } from "./engine";

/**
 * Given the current answers, returns the current active node
 * (the first unanswered node in the path).
 */
export function resolveCurrentNode(answers: Record<string, AnswerValue>): string {
  const path = engine.buildPath(answers);

  for (const nodeId of path) {
    if (!(nodeId in answers)) {
      return nodeId;
    }
  }

  // All answered — return last node in path
  return path[path.length - 1] ?? "residency_type";
}

/**
 * Returns the list of all answered node IDs in traversal order.
 */
export function getAnsweredPath(answers: Record<string, AnswerValue>): string[] {
  const path = engine.buildPath(answers);
  return path.filter((nodeId) => nodeId in answers);
}
