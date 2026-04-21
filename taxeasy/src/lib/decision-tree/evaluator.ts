import { Condition, AnswerValue } from "@/types/wizard";

/**
 * Evaluates a single condition against the current answers map.
 * Returns true if the condition is satisfied.
 */
export function evaluateCondition(
  condition: Condition,
  answers: Record<string, AnswerValue>
): boolean {
  const actual = answers[condition.nodeId];

  switch (condition.operator) {
    case "exists":
      return actual !== undefined && actual !== null && actual !== "";

    case "eq":
      return actual === condition.value;

    case "neq":
      return actual !== condition.value;

    case "in": {
      const allowed = condition.value as string[];
      if (Array.isArray(actual)) {
        // multi_choice: check any overlap
        return actual.some((v) => allowed.includes(v as string));
      }
      return allowed.includes(actual as string);
    }

    case "not_in": {
      const forbidden = condition.value as string[];
      if (Array.isArray(actual)) {
        return !actual.some((v) => forbidden.includes(v as string));
      }
      return !forbidden.includes(actual as string);
    }

    case "gt":
      return typeof actual === "number" && actual > (condition.value as number);

    case "gte":
      return typeof actual === "number" && actual >= (condition.value as number);

    case "lt":
      return typeof actual === "number" && actual < (condition.value as number);

    case "lte":
      return typeof actual === "number" && actual <= (condition.value as number);

    default:
      return false;
  }
}

/**
 * Evaluates all conditions in an array — all must be true (AND logic).
 */
export function evaluateConditions(
  conditions: Condition[],
  answers: Record<string, AnswerValue>
): boolean {
  return conditions.every((c) => evaluateCondition(c, answers));
}
