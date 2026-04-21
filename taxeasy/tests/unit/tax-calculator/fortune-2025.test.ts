import { describe, it, expect } from "vitest";
import {
  computeFortuneFranchise,
  computeFortuneTotal,
  FORTUNE_FRANCHISE,
} from "@/lib/tax-calculator/rates/fortune-2025";

describe("computeFortuneFranchise", () => {
  it("célibataire sans enfant → CHF 87'632", () => {
    expect(computeFortuneFranchise("single", 0)).toBe(FORTUNE_FRANCHISE.single);
  });

  it("couple sans enfant → CHF 175'264", () => {
    expect(computeFortuneFranchise("married", 0)).toBe(FORTUNE_FRANCHISE.couple);
  });

  it("couple avec 2 enfants → CHF 175'264 + 2×CHF 43'816 = CHF 262'896", () => {
    const expected = 17_526_400 + 2 * 4_381_600;
    expect(computeFortuneFranchise("married", 2)).toBe(expected);
  });

  it("célibataire avec 1 enfant → CHF 87'632 + CHF 43'816 = CHF 131'448", () => {
    const expected = 8_763_200 + 4_381_600;
    expect(computeFortuneFranchise("single", 1)).toBe(expected);
  });
});

describe("computeFortuneTotal", () => {
  const COMMUNE_RATE = 0.455; // Genève-Ville

  it("fortune nette en-dessous de la franchise → impôt 0", () => {
    // Fortune CHF 80'000, franchise CHF 87'632 → net = 0
    const result = computeFortuneTotal(
      8_000_000,
      0,
      FORTUNE_FRANCHISE.single,
      COMMUNE_RATE
    );
    expect(result.netFortune).toBe(0);
    expect(result.total).toBe(0);
  });

  it("fortune CHF 200'000, célibataire — impôt sur CHF 112'368", () => {
    // Net = 200'000 - 87'632 = 112'368
    const result = computeFortuneTotal(
      20_000_000,
      0,
      FORTUNE_FRANCHISE.single,
      COMMUNE_RATE
    );
    expect(result.netFortune).toBe(20_000_000 - FORTUNE_FRANCHISE.single);
    expect(result.baseTax).toBeGreaterThan(0);
    expect(result.supplementaryTax).toBeGreaterThan(0);
    expect(result.cantonalTax).toBe(result.baseTax + result.supplementaryTax);
    expect(result.communalTax).toBe(Math.round(result.cantonalTax * COMMUNE_RATE));
    expect(result.total).toBe(result.cantonalTax + result.communalTax);
  });

  it("dettes déduites avant franchise", () => {
    // Fortune 500'000, dettes 100'000, franchise 87'632 → net = 312'368
    const result = computeFortuneTotal(
      50_000_000,
      10_000_000,
      FORTUNE_FRANCHISE.single,
      COMMUNE_RATE
    );
    expect(result.netFortune).toBe(
      Math.max(0, 50_000_000 - 10_000_000 - FORTUNE_FRANCHISE.single)
    );
  });

  it("fortune < 0 après dettes → net = 0", () => {
    const result = computeFortuneTotal(
      5_000_000,
      10_000_000,
      FORTUNE_FRANCHISE.single,
      COMMUNE_RATE
    );
    expect(result.netFortune).toBe(0);
    expect(result.total).toBe(0);
  });
});
