import { describe, it, expect } from "vitest";
import { evaluateCondition, evaluateConditions } from "@/lib/decision-tree/evaluator";
import { Condition } from "@/types/wizard";

describe("evaluateCondition", () => {
  it("eq — matches equal string", () => {
    const c: Condition = { nodeId: "family_status", operator: "eq", value: "married" };
    expect(evaluateCondition(c, { family_status: "married" })).toBe(true);
    expect(evaluateCondition(c, { family_status: "single" })).toBe(false);
  });

  it("neq — matches not-equal", () => {
    const c: Condition = { nodeId: "family_status", operator: "neq", value: "married" };
    expect(evaluateCondition(c, { family_status: "single" })).toBe(true);
    expect(evaluateCondition(c, { family_status: "married" })).toBe(false);
  });

  it("in — scalar value in allowed list", () => {
    const c: Condition = {
      nodeId: "income_main",
      operator: "in",
      value: ["employee", "employee_side"],
    };
    expect(evaluateCondition(c, { income_main: "employee" })).toBe(true);
    expect(evaluateCondition(c, { income_main: "employee_side" })).toBe(true);
    expect(evaluateCondition(c, { income_main: "retired" })).toBe(false);
  });

  it("in — array answer overlaps with allowed list", () => {
    const c: Condition = {
      nodeId: "other_income_check",
      operator: "in",
      value: ["dividends"],
    };
    expect(
      evaluateCondition(c, { other_income_check: ["dividends", "rental"] })
    ).toBe(true);
    expect(
      evaluateCondition(c, { other_income_check: ["rental", "social"] })
    ).toBe(false);
  });

  it("not_in — scalar not in forbidden list", () => {
    const c: Condition = {
      nodeId: "income_main",
      operator: "not_in",
      value: ["self_employed", "fonct_intl"],
    };
    expect(evaluateCondition(c, { income_main: "employee" })).toBe(true);
    expect(evaluateCondition(c, { income_main: "self_employed" })).toBe(false);
  });

  it("gt / gte / lt / lte — numeric comparisons", () => {
    const answers = { children_count: 3 };
    expect(
      evaluateCondition({ nodeId: "children_count", operator: "gt", value: 2 }, answers)
    ).toBe(true);
    expect(
      evaluateCondition({ nodeId: "children_count", operator: "gt", value: 3 }, answers)
    ).toBe(false);
    expect(
      evaluateCondition({ nodeId: "children_count", operator: "gte", value: 3 }, answers)
    ).toBe(true);
    expect(
      evaluateCondition({ nodeId: "children_count", operator: "lt", value: 5 }, answers)
    ).toBe(true);
    expect(
      evaluateCondition({ nodeId: "children_count", operator: "lte", value: 3 }, answers)
    ).toBe(true);
  });

  it("exists — returns false for missing or empty answer", () => {
    const c: Condition = { nodeId: "salary_uploaded", operator: "exists", value: true };
    expect(evaluateCondition(c, {})).toBe(false);
    expect(evaluateCondition(c, { salary_uploaded: "" })).toBe(false);
    expect(evaluateCondition(c, { salary_uploaded: true })).toBe(true);
  });
});

describe("evaluateConditions (AND logic)", () => {
  it("all conditions must be true", () => {
    const conditions: Condition[] = [
      { nodeId: "family_status", operator: "eq", value: "married" },
      { nodeId: "spouse_work", operator: "eq", value: "yes" },
    ];
    expect(
      evaluateConditions(conditions, { family_status: "married", spouse_work: "yes" })
    ).toBe(true);
    expect(
      evaluateConditions(conditions, { family_status: "married", spouse_work: "no" })
    ).toBe(false);
  });

  it("empty conditions array returns true (unconditional next)", () => {
    expect(evaluateConditions([], {})).toBe(true);
  });
});
