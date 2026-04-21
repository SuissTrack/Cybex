import { TreeMap } from "../types";
import { residencyNodes } from "./residency.tree";
import { familyNodes } from "./family.tree";
import { incomeNodes } from "./income.tree";
import { deductionsNodes } from "./deductions.tree";
import { wealthNodes } from "./wealth.tree";

/**
 * Complete merged node map — all sections.
 * Node IDs must be globally unique across all trees.
 */
export const allNodes: TreeMap = {
  ...residencyNodes,
  ...familyNodes,
  ...incomeNodes,
  ...deductionsNodes,
  ...wealthNodes,
};

export { residencyNodes, familyNodes, incomeNodes, deductionsNodes, wealthNodes };
