/**
 * Déductions famille ICC/IFD — Genève 2025
 * Montants en centimes.
 */

export const FAMILY_LIMITS_2025 = {
  /** Déduction par enfant à charge ICC */
  childICC: 1_300_000, // CHF 13'000
  /** Déduction par enfant à charge IFD */
  childIFD: 650_000, // CHF 6'500
  /** Frais de garde par enfant < 14 ans — ICC seulement */
  childcareMaxPerChild: 2_500_000, // CHF 25'000
  /** Déductible par camp de vacances (GE spécifique 2025) */
  campPerWeek: 25_000, // CHF 250
  /** Déduction conjoint IFD — min */
  spouseDeductionMin: 850_000, // CHF 8'500
  /** Déduction conjoint IFD — max */
  spouseDeductionMax: 1_390_000, // CHF 13'900
  /** Taux déduction conjoint IFD */
  spouseDeductionRate: 0.50,
} as const;

export interface FamilyDeductionInput {
  childrenCount: number;
  childcareExpenses: number; // centimes (crèche, parascolaire, etc.)
  campWeeksCount: number; // nombre de semaines/camps
  childrenUnder14Count: number; // enfants < 14 ans (pour garde)
  spouseIncome: number; // centimes (revenu conjoint, pour déduction IFD)
  familyStatus: "single" | "married" | "divorced" | "widowed";
}

export interface FamilyDeductionResult {
  children_icc: number;
  children_ifd: number;
  childcare_icc: number; // 0 pour IFD
  camps_icc: number; // 0 pour IFD
  spouse_ifd: number; // 0 pour ICC
}

/**
 * Calcule les déductions famille.
 */
export function computeFamilyDeductions(input: FamilyDeductionInput): FamilyDeductionResult {
  // ── Déduction enfants ────────────────────────────────────────────────────
  const children_icc = input.childrenCount * FAMILY_LIMITS_2025.childICC;
  const children_ifd = input.childrenCount * FAMILY_LIMITS_2025.childIFD;

  // ── Frais de garde (ICC uniquement, par enfant < 14 ans) ─────────────────
  const maxChildcare =
    input.childrenUnder14Count * FAMILY_LIMITS_2025.childcareMaxPerChild;
  const childcare_icc = Math.min(input.childcareExpenses, maxChildcare);

  // ── Camps de vacances (ICC uniquement, CHF 250/semaine) ──────────────────
  const camps_icc = input.campWeeksCount * FAMILY_LIMITS_2025.campPerWeek;

  // ── Déduction conjoint IFD ───────────────────────────────────────────────
  let spouse_ifd = 0;
  if (input.familyStatus === "married" && input.spouseIncome > 0) {
    const raw = Math.round(input.spouseIncome * FAMILY_LIMITS_2025.spouseDeductionRate);
    spouse_ifd = Math.max(
      FAMILY_LIMITS_2025.spouseDeductionMin,
      Math.min(raw, FAMILY_LIMITS_2025.spouseDeductionMax)
    );
  }

  return {
    children_icc,
    children_ifd,
    childcare_icc,
    camps_icc,
    spouse_ifd,
  };
}
