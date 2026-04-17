import { describe, it, expect } from "vitest";
import { computeICCBaseTax, computeICCTotal } from "@/lib/tax-calculator/rates/icc-2025";

describe("computeICCBaseTax — barèmes 2025", () => {
  it("revenu 0 → impôt 0", () => {
    expect(computeICCBaseTax(0)).toBe(0);
  });

  it("revenu négatif → impôt 0", () => {
    expect(computeICCBaseTax(-100_000)).toBe(0);
  });

  it("revenu dans la franchise (CHF 17'000) → impôt 0", () => {
    // Tranche 0 : 0 à CHF 17'000 → taux 0%
    expect(computeICCBaseTax(1_700_000)).toBe(0);
  });

  it("CHF 30'000 → dans tranche 8% (CHF 24'001–31'000)", () => {
    // CHF 30'000 = 3'000'000 centimes
    // Tranche 1: CHF 17'001–24'000 = (700'000) × 5% = 35'000 (baseTax tranche 2)
    // Tranche 2: CHF 24'001–31'000 → baseTax=35'000, rate=8%
    // Result = 35'000 + (3'000'000 - 2'400'000) × 0.08 = 35'000 + 48'000 = 83'000
    const result = computeICCBaseTax(3_000_000);
    expect(result).toBe(35_000 + Math.round((3_000_000 - 2_400_000) * 0.08));
  });

  it("CHF 50'000 → dans tranche 12% (CHF 41'001–56'000)", () => {
    // CHF 50'000 = 5'000'000 centimes
    // Tranche 4 (CHF 41'001–56'000): baseTax = 191'000, rate = 12%
    // Result = 191'000 + (5'000'000 - 4'100'000) × 0.12 = 191'000 + 108'000 = 299'000
    const result = computeICCBaseTax(5_000_000);
    expect(result).toBe(191_000 + Math.round((5_000_000 - 4_100_000) * 0.12));
  });

  it("CHF 100'000 → dans la tranche 15.5%", () => {
    // baseTax de la tranche CHF 76'000–103'000 = 651'000
    // (10'000'000 - 7'600'000) × 0.155 = 372'000
    const result = computeICCBaseTax(10_000_000);
    expect(result).toBe(651_000 + Math.round((10_000_000 - 7_600_000) * 0.155));
  });
});

describe("computeICCTotal — splitting et taux communal", () => {
  const GENEVE_VILLE_RATE = 0.455;

  it("célibataire CHF 80'000 — Genève-Ville 45.5%", () => {
    const netIncome = 8_000_000; // CHF 80'000
    const result = computeICCTotal(netIncome, "none", GENEVE_VILLE_RATE);
    expect(result.taxBase).toBe(netIncome);
    // Cantonal doit être positif
    expect(result.cantonalTax).toBeGreaterThan(0);
    // Communal = cantonal × 45.5%
    expect(result.communalTax).toBe(Math.round(result.cantonalTax * GENEVE_VILLE_RATE));
    expect(result.total).toBe(result.cantonalTax + result.communalTax);
  });

  it("marié CHF 120'000 — splitting complet (base = CHF 60'000)", () => {
    const netIncome = 12_000_000; // CHF 120'000
    const result = computeICCTotal(netIncome, "full", GENEVE_VILLE_RATE);
    // taxBase = 50% de 120'000 = 60'000
    expect(result.taxBase).toBe(6_000_000);
    // cantonalTax = impôt sur 60'000 × 2
    const baseTaxOn60k = computeICCBaseTax(6_000_000);
    expect(result.cantonalTax).toBe(Math.round(baseTaxOn60k * 2));
  });

  it("monoparental CHF 80'000 — splitting partiel (55.56%)", () => {
    const netIncome = 8_000_000;
    const result = computeICCTotal(netIncome, "partial", GENEVE_VILLE_RATE);
    // taxBase ≈ 55.56% de 80'000 ≈ 44'448
    expect(result.taxBase).toBeCloseTo(4_444_800, -3);
  });

  it("revenu 0 → tous zéros", () => {
    const result = computeICCTotal(0, "none", GENEVE_VILLE_RATE);
    expect(result.cantonalTax).toBe(0);
    expect(result.communalTax).toBe(0);
    expect(result.total).toBe(0);
  });

  it("Carouge (49.5%) > Genève-Ville (45.5%) pour même revenu", () => {
    const geneve = computeICCTotal(10_000_000, "none", 0.455);
    const carouge = computeICCTotal(10_000_000, "none", 0.495);
    expect(carouge.total).toBeGreaterThan(geneve.total);
  });

  it("Plan-les-Ouates (40%) — impôt communal plus bas que Onex (53%)", () => {
    const plo = computeICCTotal(10_000_000, "none", 0.40);
    const onex = computeICCTotal(10_000_000, "none", 0.53);
    expect(plo.total).toBeLessThan(onex.total);
  });
});
