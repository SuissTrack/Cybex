/**
 * Tests intégration ICC — computeICC()
 * Tous les montants en centimes.
 */

import { describe, it, expect } from "vitest";
import { computeICC } from "@/lib/tax-calculator/icc.calculator";
import { TaxCalculationInput } from "@/types/tax";

/** Input de base réutilisable (tous les champs à 0 sauf ce qui est spécifié) */
const BASE_INPUT: TaxCalculationInput = {
  grossSalary: 0,
  sideIncome: 0,
  pensionIncome: 0,
  dividendIncome: 0,
  rentalIncome: 0,
  rentalExpenses: 0,
  alimonyReceived: 0,
  avsContributions: 0,
  acContributions: 0,
  aanpContributions: 0,
  lppMandatoryContributions: 0,
  familyStatus: "single",
  isMonoparental: false,
  childrenCount: 0,
  childcareExpenses: 0,
  campExpenses: 0,
  spouseIncome: 0,
  lppVoluntaryPurchase: 0,
  pillar3aContributions: 0,
  pillar3bPremiums: 0,
  lamalPremiums: 0,
  professionalExpensesMode: "forfait",
  transportMode: "public_transport",
  transportDistance: 0,
  teleworkDaysPerWeek: 0,
  mealsDeduction: false,
  trainingExpenses: 0,
  medicalExpenses: 0,
  donationExpenses: 0,
  alimonyPaid: 0,
  handicapDeduction: false,
  bankAssets: 0,
  securitiesAssets: 0,
  realEstateValue: 0,
  vehiclesValue: 0,
  otherAssets: 0,
  debts: 0,
  commune: "Genève-Ville",
  taxYear: 2025,
};

describe("computeICC — cas intégration", () => {
  // ─── CAS 1 : Célibataire, Genève-Ville, revenu brut CHF 80k ───────────────
  describe("CAS 1 — Célibataire, Genève-Ville, CHF 80k brut", () => {
    const input: TaxCalculationInput = {
      ...BASE_INPUT,
      grossSalary: 8_000_000, // CHF 80'000
      lppMandatoryContributions: 850_000, // CHF 8'500
      pillar3aContributions: 725_800, // CHF 7'258 (plafond salarié)
      lamalPremiums: 500_000, // CHF 5'000
      mealsDeduction: true,
      commune: "Genève-Ville",
    };

    it("revenu net imposable dans la fourchette CHF 52k–55k", () => {
      const result = computeICC(input);
      expect(result.netIncome).toBeGreaterThan(5_200_000); // > CHF 52'000
      expect(result.netIncome).toBeLessThan(5_500_000); // < CHF 55'000
    });

    it("impôt total > 0", () => {
      const result = computeICC(input);
      expect(result.total).toBeGreaterThan(0);
    });

    it("splitting = none (célibataire)", () => {
      const result = computeICC(input);
      expect(result.splitting).toBe("none");
    });

    it("taux communal = 0.455 (Genève-Ville)", () => {
      const result = computeICC(input);
      expect(result.communalRate).toBe(0.455);
    });

    it("taxBase = netIncome (pas de splitting)", () => {
      const result = computeICC(input);
      expect(result.taxBase).toBe(result.netIncome);
    });

    it("impôt cantonal > 0", () => {
      const result = computeICC(input);
      expect(result.cantonalTax).toBeGreaterThan(0);
    });

    it("impôt communal = impôt cantonal × 0.455", () => {
      const result = computeICC(input);
      expect(result.communalTax).toBe(Math.round(result.cantonalTax * 0.455));
    });
  });

  // ─── CAS 2 : Couple marié, 2 enfants, Plan-les-Ouates, CHF 140k ──────────
  describe("CAS 2 — Couple marié, 2 enfants, Plan-les-Ouates, CHF 140k brut", () => {
    const input: TaxCalculationInput = {
      ...BASE_INPUT,
      grossSalary: 14_000_000, // CHF 140'000
      lppMandatoryContributions: 1_500_000, // CHF 15'000
      familyStatus: "married",
      isMonoparental: false,
      childrenCount: 2,
      childcareExpenses: 1_800_000, // CHF 18'000
      spouseIncome: 0,
      pillar3aContributions: 725_800, // CHF 7'258
      lamalPremiums: 1_200_000, // CHF 12'000
      commune: "Plan-les-Ouates",
    };

    it("splitting = full (marié)", () => {
      const result = computeICC(input);
      expect(result.splitting).toBe("full");
    });

    it("taxBase = netIncome / 2 (splitting complet)", () => {
      const result = computeICC(input);
      // taxBase = Math.round(netIncome * 0.5)
      expect(result.taxBase).toBe(Math.round(result.netIncome * 0.5));
    });

    it("impôt total > 0", () => {
      const result = computeICC(input);
      expect(result.total).toBeGreaterThan(0);
    });

    it("déduction enfants = 2 × CHF 13'000 = CHF 26'000", () => {
      const result = computeICC(input);
      expect(result.deductions.children).toBe(2_600_000); // 2 × 1'300'000 centimes
    });

    it("taux communal = 0.40 (Plan-les-Ouates)", () => {
      const result = computeICC(input);
      expect(result.communalRate).toBe(0.40);
    });

    it("impôt communal = impôt cantonal × 0.40", () => {
      const result = computeICC(input);
      expect(result.communalTax).toBe(Math.round(result.cantonalTax * 0.40));
    });
  });

  // ─── CAS 3 : Revenu négatif → impôt 0 ────────────────────────────────────
  describe("CAS 3 — Déductions supérieures au revenu → impôt 0", () => {
    const input: TaxCalculationInput = {
      ...BASE_INPUT,
      grossSalary: 8_000_000, // CHF 80'000
      // LPP absurde — supérieur au revenu brut
      lppMandatoryContributions: 100_000_000, // CHF 1'000'000
      commune: "Genève-Ville",
    };

    it("impôt total = 0", () => {
      const result = computeICC(input);
      expect(result.total).toBe(0);
    });

    it("revenu net imposable = 0 (plancher à 0)", () => {
      const result = computeICC(input);
      expect(result.netIncome).toBe(0);
    });

    it("impôt cantonal = 0", () => {
      const result = computeICC(input);
      expect(result.cantonalTax).toBe(0);
    });

    it("impôt communal = 0", () => {
      const result = computeICC(input);
      expect(result.communalTax).toBe(0);
    });
  });

  // ─── CAS 4 : Monoparental, splitting partiel ──────────────────────────────
  describe("CAS 4 — Famille monoparentale, splitting partiel", () => {
    const input: TaxCalculationInput = {
      ...BASE_INPUT,
      grossSalary: 9_000_000, // CHF 90'000
      lppMandatoryContributions: 900_000, // CHF 9'000
      familyStatus: "divorced",
      isMonoparental: true,
      childrenCount: 1,
      commune: "Genève-Ville",
    };

    it("splitting = partial (monoparental)", () => {
      const result = computeICC(input);
      expect(result.splitting).toBe("partial");
    });

    it("taxBase ≈ netIncome / 1.8 (splitting partiel)", () => {
      const result = computeICC(input);
      // L'implémentation : taxBase = Math.round(netIncome / 1.8)
      const expectedTaxBase = Math.round(result.netIncome / 1.8);
      expect(result.taxBase).toBe(expectedTaxBase);
    });

    it("impôt total > 0", () => {
      const result = computeICC(input);
      expect(result.total).toBeGreaterThan(0);
    });

    it("impôt monoparental < impôt célibataire même revenu", () => {
      const singleInput: TaxCalculationInput = {
        ...input,
        familyStatus: "single",
        isMonoparental: false,
        childrenCount: 0,
      };
      const resultMono = computeICC(input);
      const resultSingle = computeICC(singleInput);
      // Le monoparental bénéficie du splitting partiel — impôt plus bas
      expect(resultMono.total).toBeLessThan(resultSingle.total);
    });
  });

  // ─── CAS 5 : Revenu 0 → tout à 0 ─────────────────────────────────────────
  describe("CAS 5 — Revenu brut 0 → tous les résultats à 0", () => {
    it("tous les montants = 0", () => {
      const result = computeICC({ ...BASE_INPUT });
      expect(result.grossIncome).toBe(0);
      expect(result.netIncome).toBe(0);
      expect(result.total).toBe(0);
      expect(result.cantonalTax).toBe(0);
      expect(result.communalTax).toBe(0);
    });
  });

  // ─── CAS 6 : Cohérence déductions ────────────────────────────────────────
  describe("CAS 6 — Cohérence structurelle du résultat", () => {
    const input: TaxCalculationInput = {
      ...BASE_INPUT,
      grossSalary: 10_000_000, // CHF 100'000
      lppMandatoryContributions: 1_000_000,
      pillar3aContributions: 725_800,
      lamalPremiums: 600_000,
      commune: "Carouge",
    };

    it("grossIncome = grossSalary (pas d'autres revenus)", () => {
      const result = computeICC(input);
      expect(result.grossIncome).toBe(10_000_000);
    });

    it("netIncome = grossIncome - deductions.total", () => {
      const result = computeICC(input);
      const expected = Math.max(0, result.grossIncome - result.deductions.total);
      expect(result.netIncome).toBe(expected);
    });

    it("total = cantonalTax + communalTax", () => {
      const result = computeICC(input);
      expect(result.total).toBe(result.cantonalTax + result.communalTax);
    });

    it("Carouge (49.5%) paie plus que Plan-les-Ouates (40%) pour même revenu", () => {
      const resultCarouge = computeICC({ ...input, commune: "Carouge" });
      const resultPLO = computeICC({ ...input, commune: "Plan-les-Ouates" });
      expect(resultCarouge.total).toBeGreaterThan(resultPLO.total);
    });
  });
});
