import { describe, it, expect } from "vitest";
import { computeProvidentDeductions, PROVIDENT_LIMITS_2025 } from "@/lib/tax-calculator/deductions/provident";
import { computeFamilyDeductions, FAMILY_LIMITS_2025 } from "@/lib/tax-calculator/deductions/family";
import { computeProfessionalDeductions, PROFESSIONAL_LIMITS_2025 } from "@/lib/tax-calculator/deductions/professional";
import { computeInsuranceDeductions, INSURANCE_LIMITS_2025 } from "@/lib/tax-calculator/deductions/insurance";
import { computeMedicalDeduction } from "@/lib/tax-calculator/deductions/medical";
import { computeDonationDeduction } from "@/lib/tax-calculator/deductions/donations";

// ── PRÉVOYANCE ──────────────────────────────────────────────────────────────
describe("computeProvidentDeductions", () => {
  it("salarié 3A dans les limites — déduit intégralement", () => {
    const result = computeProvidentDeductions({
      pillar3aContributions: 700_000, // CHF 7'000 < CHF 7'258
      isEmployee: true,
      netIncome: 10_000_000,
      lppVoluntaryPurchase: 0,
      pillar3bPremiums: 0,
      familyStatus: "single",
      childrenCount: 0,
    });
    expect(result.pillar3a_icc).toBe(700_000);
    expect(result.pillar3a_ifd).toBe(700_000);
  });

  it("salarié 3A au-delà du plafond CHF 7'258 — plafonné", () => {
    const result = computeProvidentDeductions({
      pillar3aContributions: 900_000, // CHF 9'000 > CHF 7'258
      isEmployee: true,
      netIncome: 10_000_000,
      lppVoluntaryPurchase: 0,
      pillar3bPremiums: 0,
      familyStatus: "single",
      childrenCount: 0,
    });
    expect(result.pillar3a_icc).toBe(PROVIDENT_LIMITS_2025.pillar3a_employee); // 725'800
    expect(result.pillar3a_ifd).toBe(PROVIDENT_LIMITS_2025.pillar3a_employee);
  });

  it("3B célibataire — plafond CHF 2'232", () => {
    const result = computeProvidentDeductions({
      pillar3aContributions: 0,
      isEmployee: true,
      netIncome: 10_000_000,
      lppVoluntaryPurchase: 0,
      pillar3bPremiums: 300_000, // CHF 3'000 > plafond CHF 2'232
      familyStatus: "single",
      childrenCount: 0,
    });
    expect(result.pillar3b_icc).toBe(PROVIDENT_LIMITS_2025.pillar3b_single); // 223'200
  });

  it("3B couple avec 2 enfants — plafond CHF 3'348 + 2×CHF 900 = CHF 5'148", () => {
    const result = computeProvidentDeductions({
      pillar3aContributions: 0,
      isEmployee: true,
      netIncome: 10_000_000,
      lppVoluntaryPurchase: 0,
      pillar3bPremiums: 1_000_000, // largement au-dessus
      familyStatus: "married",
      childrenCount: 2,
    });
    const expected = 334_800 + 2 * 90_000; // CHF 5'148 → 514'800 centimes
    expect(result.pillar3b_icc).toBe(expected);
  });

  it("LPP rachat — intégralement déductible sans plafond", () => {
    const result = computeProvidentDeductions({
      pillar3aContributions: 0,
      isEmployee: true,
      netIncome: 10_000_000,
      lppVoluntaryPurchase: 5_000_000, // CHF 50'000
      pillar3bPremiums: 0,
      familyStatus: "single",
      childrenCount: 0,
    });
    expect(result.lpp_icc).toBe(5_000_000);
  });
});

// ── FAMILLE ─────────────────────────────────────────────────────────────────
describe("computeFamilyDeductions", () => {
  it("2 enfants à charge — ICC CHF 26'000, IFD CHF 13'000", () => {
    const result = computeFamilyDeductions({
      childrenCount: 2,
      childcareExpenses: 0,
      campWeeksCount: 0,
      childrenUnder14Count: 2,
      spouseIncome: 0,
      familyStatus: "single",
    });
    expect(result.children_icc).toBe(2 * FAMILY_LIMITS_2025.childICC); // 2'600'000
    expect(result.children_ifd).toBe(2 * FAMILY_LIMITS_2025.childIFD); // 1'300'000
  });

  it("frais de garde CHF 30'000 pour 1 enfant — plafonné à CHF 25'000", () => {
    const result = computeFamilyDeductions({
      childrenCount: 1,
      childcareExpenses: 3_000_000, // CHF 30'000
      campWeeksCount: 0,
      childrenUnder14Count: 1,
      spouseIncome: 0,
      familyStatus: "single",
    });
    expect(result.childcare_icc).toBe(FAMILY_LIMITS_2025.childcareMaxPerChild); // 2'500'000
  });

  it("3 semaines de camp — CHF 750 déductibles (3 × CHF 250)", () => {
    const result = computeFamilyDeductions({
      childrenCount: 1,
      childcareExpenses: 0,
      campWeeksCount: 3,
      childrenUnder14Count: 1,
      spouseIncome: 0,
      familyStatus: "single",
    });
    expect(result.camps_icc).toBe(3 * 25_000); // 75'000 centimes
  });

  it("déduction conjoint IFD — 50% de CHF 65'000 = CHF 32'500, plafonné à CHF 13'900", () => {
    const result = computeFamilyDeductions({
      childrenCount: 0,
      childcareExpenses: 0,
      campWeeksCount: 0,
      childrenUnder14Count: 0,
      spouseIncome: 6_500_000, // CHF 65'000
      familyStatus: "married",
    });
    // 50% × 65'000 = 32'500 > max 13'900 → plafonné
    expect(result.spouse_ifd).toBe(FAMILY_LIMITS_2025.spouseDeductionMax); // 1'390'000
  });

  it("déduction conjoint IFD — 50% de CHF 12'000 = CHF 6'000, relevé au min CHF 8'500", () => {
    const result = computeFamilyDeductions({
      childrenCount: 0,
      childcareExpenses: 0,
      campWeeksCount: 0,
      childrenUnder14Count: 0,
      spouseIncome: 1_200_000, // CHF 12'000
      familyStatus: "married",
    });
    // 50% × 12'000 = 6'000 < min 8'500 → relevé au min
    expect(result.spouse_ifd).toBe(FAMILY_LIMITS_2025.spouseDeductionMin); // 850'000
  });
});

// ── FRAIS PROFESSIONNELS ─────────────────────────────────────────────────────
describe("computeProfessionalDeductions", () => {
  it("forfait 3% sur CHF 100'000 → CHF 3'000 (< plafond)", () => {
    const result = computeProfessionalDeductions(
      {
        grossSalary: 10_000_000,
        expensesMode: "forfait",
        transportMode: "public_transport",
        transportDistanceKm: 0,
        publicTransportCost: 0,
        teleworkDaysPerWeek: 0,
        mealsDeduction: false,
        trainingExpenses: 0,
      },
      10_000_000
    );
    expect(result.professionalExpenses_icc).toBe(300_000); // CHF 3'000
  });

  it("forfait plafonné à CHF 4'000 pour revenu élevé", () => {
    const result = computeProfessionalDeductions(
      {
        grossSalary: 30_000_000,
        expensesMode: "forfait",
        transportMode: "public_transport",
        transportDistanceKm: 0,
        publicTransportCost: 0,
        teleworkDaysPerWeek: 0,
        mealsDeduction: false,
        trainingExpenses: 0,
      },
      30_000_000
    );
    expect(result.professionalExpenses_icc).toBe(PROFESSIONAL_LIMITS_2025.forfaitMax_icc); // 400'000
  });

  it("transport voiture ICC — forfait CHF 529 (sans télétravail)", () => {
    const result = computeProfessionalDeductions(
      {
        grossSalary: 10_000_000,
        expensesMode: "forfait",
        transportMode: "car",
        transportDistanceKm: 30,
        publicTransportCost: 0,
        teleworkDaysPerWeek: 0,
        mealsDeduction: false,
        trainingExpenses: 0,
      },
      10_000_000
    );
    expect(result.transport_icc).toBe(PROFESSIONAL_LIMITS_2025.carTransport_icc); // 52'900
  });

  it("transport voiture avec 3j télétravail — ICC réduit de 40%", () => {
    const result = computeProfessionalDeductions(
      {
        grossSalary: 10_000_000,
        expensesMode: "forfait",
        transportMode: "car",
        transportDistanceKm: 30,
        publicTransportCost: 0,
        teleworkDaysPerWeek: 3,
        mealsDeduction: false,
        trainingExpenses: 0,
      },
      10_000_000
    );
    // 2 jours bureau sur 5 → 40% du forfait
    const expected = Math.round(PROFESSIONAL_LIMITS_2025.carTransport_icc * (2 / 5));
    expect(result.transport_icc).toBe(expected);
  });

  it("repas extérieur — CHF 3'200 déductibles", () => {
    const result = computeProfessionalDeductions(
      {
        grossSalary: 10_000_000,
        expensesMode: "forfait",
        transportMode: "public_transport",
        transportDistanceKm: 0,
        publicTransportCost: 0,
        teleworkDaysPerWeek: 0,
        mealsDeduction: true,
        trainingExpenses: 0,
      },
      10_000_000
    );
    expect(result.meals_icc).toBe(PROFESSIONAL_LIMITS_2025.meals); // 320'000
  });

  it("formation CHF 15'000 — plafonnée à CHF 12'000", () => {
    const result = computeProfessionalDeductions(
      {
        grossSalary: 10_000_000,
        expensesMode: "forfait",
        transportMode: "public_transport",
        transportDistanceKm: 0,
        publicTransportCost: 0,
        teleworkDaysPerWeek: 0,
        mealsDeduction: false,
        trainingExpenses: 1_500_000,
      },
      10_000_000
    );
    expect(result.training_icc).toBe(PROFESSIONAL_LIMITS_2025.trainingMax); // 1'200'000
  });
});

// ── FRAIS MÉDICAUX ──────────────────────────────────────────────────────────
describe("computeMedicalDeduction", () => {
  it("frais < 5% du revenu net — rien déductible", () => {
    // 5% de CHF 80'000 = CHF 4'000 → CHF 3'000 de frais → 0
    expect(computeMedicalDeduction({ medicalExpenses: 300_000, netIncome: 8_000_000 })).toBe(0);
  });

  it("frais > 5% — seule la partie dépassant le seuil est déductible", () => {
    // 5% de CHF 80'000 = CHF 4'000, frais = CHF 6'500 → déductible = CHF 2'500
    const result = computeMedicalDeduction({ medicalExpenses: 650_000, netIncome: 8_000_000 });
    expect(result).toBe(250_000); // CHF 2'500
  });
});

// ── DONS ────────────────────────────────────────────────────────────────────
describe("computeDonationDeduction", () => {
  it("don < CHF 100 — non déductible", () => {
    expect(computeDonationDeduction(5_000, 10_000_000)).toBe(0);
  });

  it("don CHF 500 — déductible intégralement (< 20% revenu)", () => {
    expect(computeDonationDeduction(50_000, 10_000_000)).toBe(50_000);
  });

  it("don CHF 50'000 sur revenu CHF 100'000 — plafonné à 20% = CHF 20'000", () => {
    const result = computeDonationDeduction(5_000_000, 10_000_000);
    expect(result).toBe(2_000_000); // CHF 20'000
  });
});
