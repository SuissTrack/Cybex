import { describe, it, expect } from "vitest";
import { DecisionTreeEngine } from "@/lib/decision-tree/engine";
import { allNodes } from "@/lib/decision-tree/trees/index";

const engine = new DecisionTreeEngine(allNodes);

describe("DecisionTreeEngine.getNode", () => {
  it("returns a known node", () => {
    const node = engine.getNode("residency_type");
    expect(node.id).toBe("residency_type");
    expect(node.section).toBe("residency");
  });

  it("throws for unknown node", () => {
    expect(() => engine.getNode("nonexistent_node")).toThrow("Node not found: nonexistent_node");
  });
});

describe("DecisionTreeEngine.getNextNode", () => {
  it("resident_ge → family_status", () => {
    const { nextNodeId } = engine.getNextNode("residency_type", {
      residency_type: "resident_ge",
    });
    expect(nextNodeId).toBe("family_status");
  });

  it("tou → tou_notice (terminal)", () => {
    const result = engine.getNextNode("residency_type", { residency_type: "tou" });
    expect(result.nextNodeId).toBe("tou_notice");
  });

  it("married → spouse_work", () => {
    const { nextNodeId } = engine.getNextNode("family_status", {
      residency_type: "resident_ge",
      family_status: "married",
    });
    expect(nextNodeId).toBe("spouse_work");
  });

  it("single → monoparental", () => {
    const { nextNodeId } = engine.getNextNode("family_status", {
      family_status: "single",
    });
    expect(nextNodeId).toBe("monoparental");
  });

  it("spouse_work yes → spouse_deduction", () => {
    const { nextNodeId } = engine.getNextNode("spouse_work", {
      spouse_work: "yes",
    });
    expect(nextNodeId).toBe("spouse_deduction");
  });

  it("spouse_work no → children", () => {
    const { nextNodeId } = engine.getNextNode("spouse_work", {
      spouse_work: "no",
    });
    expect(nextNodeId).toBe("children");
  });

  it("children yes → children_count", () => {
    const { nextNodeId } = engine.getNextNode("children", { children: "yes" });
    expect(nextNodeId).toBe("children_count");
  });

  it("children no → income_main", () => {
    const { nextNodeId } = engine.getNextNode("children", { children: "no" });
    expect(nextNodeId).toBe("income_main");
  });

  it("employee → salary_upload", () => {
    const { nextNodeId } = engine.getNextNode("income_main", { income_main: "employee" });
    expect(nextNodeId).toBe("salary_upload");
  });

  it("employee_side → salary_upload", () => {
    const { nextNodeId } = engine.getNextNode("income_main", {
      income_main: "employee_side",
    });
    expect(nextNodeId).toBe("salary_upload");
  });

  it("salary_upload with employee_side → salary_amount", () => {
    const { nextNodeId } = engine.getNextNode("salary_upload", {
      income_main: "employee_side",
    });
    expect(nextNodeId).toBe("salary_amount");
  });

  it("salary_upload with employee → salary_amount", () => {
    const { nextNodeId } = engine.getNextNode("salary_upload", {
      income_main: "employee",
    });
    expect(nextNodeId).toBe("salary_amount");
  });

  it("other_income with dividends → dividends_types", () => {
    const { nextNodeId } = engine.getNextNode("other_income", {
      other_income: ["dividends"],
    });
    expect(nextNodeId).toBe("dividends_types");
  });

  it("other_income with rental (no dividends) → rental_type", () => {
    const { nextNodeId } = engine.getNextNode("other_income", {
      other_income: ["rental"],
    });
    expect(nextNodeId).toBe("rental_type");
  });

  it("car transport → deductions_transport_distance", () => {
    const { nextNodeId } = engine.getNextNode("deductions_transport", {
      deductions_transport: "car",
    });
    expect(nextNodeId).toBe("deductions_transport_distance");
  });

  it("telework yes_partial → deductions_telework_days", () => {
    const { nextNodeId } = engine.getNextNode("deductions_telework", {
      deductions_telework: "yes_partial",
    });
    expect(nextNodeId).toBe("deductions_telework_days");
  });

  it("crv → summary", () => {
    const result = engine.getNextNode("crv", { crv: "no" });
    expect(result.nextNodeId).toBe("summary");
    expect(result.isTerminal).toBe(true);
  });
});

describe("DecisionTreeEngine.buildPath — happy path salarié marié", () => {
  const answers: Record<string, unknown> = {
    residency_type: "resident_ge",
    family_status: "married",
    spouse_work: "yes",
    spouse_deduction: 6500000,
    children: "yes",
    children_count: 2,
    children_age_check: "no",
    children_custody: ["daycare_creche"],
    childcare_amount: 1_800_000,
    income_main: "employee",
    salary_upload: "__uploaded__",
    salary_amount: 10_000_000,
    salary_deductions: 0,
    other_income: ["none"],
    deductions_lpp: "no",
    deductions_3a: "yes",
    deductions_3a_amount: 725_800,
    deductions_3b: "yes",
    deductions_3b_amount: 223_200,
    deductions_lamal: 832800,
    deductions_pro_expenses: "forfait",
    deductions_transport: "public_transport",
    deductions_telework: "no",
    deductions_meals: "no",
    deductions_training: "no",
    deductions_medical: "no",
    deductions_handicap: "no",
    deductions_donations: "no",
    deductions_alimony: "no",
    wealth_bank: 5000000,
    wealth_securities: "no",
    wealth_real_estate: "no",
    wealth_vehicles: "yes",
    wealth_vehicles_value: 3_000_000,
    wealth_other: ["none"],
    crv: "no",
  };

  it("path includes expected key nodes in order", () => {
    const path = engine.buildPath(answers as Record<string, string>);
    const idx = (id: string) => path.indexOf(id);

    expect(idx("residency_type")).toBeLessThan(idx("family_status"));
    expect(idx("family_status")).toBeLessThan(idx("spouse_work"));
    expect(idx("spouse_work")).toBeLessThan(idx("children"));
    expect(idx("children")).toBeLessThan(idx("income_main"));
    expect(idx("income_main")).toBeLessThan(idx("deductions_lpp"));
    expect(idx("deductions_lpp")).toBeLessThan(idx("wealth_bank"));
    expect(idx("wealth_bank")).toBeLessThan(idx("crv"));
    expect(path).toContain("summary");
  });

  it("does NOT include monoparental for married user", () => {
    const path = engine.buildPath(answers as Record<string, string>);
    expect(path).not.toContain("monoparental");
  });
});

describe("DecisionTreeEngine.validateAnswer", () => {
  it("returns error for missing required answer", () => {
    const err = engine.validateAnswer("family_status", "");
    expect(err).toContain("obligatoire");
  });

  it("returns null for valid answer", () => {
    expect(engine.validateAnswer("family_status", "married")).toBeNull();
  });

  it("returns error for number below min", () => {
    const err = engine.validateAnswer("children_count", 0);
    expect(err).toContain("minimale");
  });

  it("returns error for number above max", () => {
    const err = engine.validateAnswer("children_count", 11);
    expect(err).toContain("maximale");
  });

  it("returns null for valid number in range", () => {
    expect(engine.validateAnswer("children_count", 3)).toBeNull();
  });
});
