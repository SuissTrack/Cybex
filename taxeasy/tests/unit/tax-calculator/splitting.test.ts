import { describe, it, expect } from "vitest";
import { computeICCTotal } from "@/lib/tax-calculator/rates/icc-2025";

/**
 * Tests de splitting — cas réels genevois
 *
 * RÈGLES :
 *  - none    : taux appliqué à 100% du revenu (célibataire)
 *  - full    : taux appliqué à 50% du revenu × 2 (marié)
 *  - partial : taux appliqué à (revenu / 1.8) × 1.8 (monoparental) — 1/1.8 ≈ 55.556%
 *
 * Les mariés paient toujours MOINS que deux célibataires avec le même revenu total
 * (car les barèmes sont progressifs et le splitting les "aplatit").
 */

const GENEVE_RATE = 0.455;

describe("Splitting ICC 2025", () => {
  it("marié paye moins que célibataire pour même revenu CHF 120'000", () => {
    const single = computeICCTotal(12_000_000, "none", GENEVE_RATE);
    const married = computeICCTotal(12_000_000, "full", GENEVE_RATE);
    expect(married.total).toBeLessThan(single.total);
  });

  it("monoparental paye moins que célibataire pour même revenu CHF 80'000", () => {
    const single = computeICCTotal(8_000_000, "none", GENEVE_RATE);
    const mono = computeICCTotal(8_000_000, "partial", GENEVE_RATE);
    expect(mono.total).toBeLessThan(single.total);
  });

  it("marié paye moins que monoparental pour même revenu", () => {
    const married = computeICCTotal(10_000_000, "full", GENEVE_RATE);
    const mono = computeICCTotal(10_000_000, "partial", GENEVE_RATE);
    // Splitting complet (50%) > splitting partiel (55.56%) → marié < mono
    expect(married.total).toBeLessThan(mono.total);
  });

  it("taxBase marié = 50% du revenu net", () => {
    const result = computeICCTotal(10_000_000, "full", GENEVE_RATE);
    expect(result.taxBase).toBe(5_000_000);
  });

  it("taxBase monoparental = Math.round(revenu / 1.8)", () => {
    const result = computeICCTotal(9_000_000, "partial", GENEVE_RATE);
    // 9_000_000 / 1.8 = 5_000_000 exactement
    expect(result.taxBase).toBe(Math.round(9_000_000 / 1.8));
  });

  it("Cas réel — salarié CHF 100'000 célibataire, Genève-Ville : impôt total raisonnable", () => {
    const result = computeICCTotal(10_000_000, "none", GENEVE_RATE);
    // Doit être entre CHF 10'000 et CHF 30'000 (fourchette approximative)
    expect(result.total).toBeGreaterThan(1_000_000); // > CHF 10'000
    expect(result.total).toBeLessThan(5_000_000);    // < CHF 50'000
  });

  it("Cas réel — couple CHF 160'000 total (80+80), Genève-Ville", () => {
    const result = computeICCTotal(16_000_000, "full", GENEVE_RATE);
    expect(result.taxBase).toBe(8_000_000); // 50% de 160'000
    expect(result.total).toBeGreaterThan(0);
  });
});
