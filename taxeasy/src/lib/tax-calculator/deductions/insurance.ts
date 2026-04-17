/**
 * Déductions assurances (LAMal + 3B combiné IFD) — Genève 2025
 * Montants en centimes.
 */

export const INSURANCE_LIMITS_2025 = {
  /** ICC : 2× prime cantonale moyenne adulte (env. CHF 8'328 en 2025) */
  lamal_icc_adult: 832_800, // CHF 8'328
  /** IFD : LAMal + 3B cumulés — célibataire */
  lamalAnd3b_ifd_single: 350_000, // CHF 3'500
  /** IFD : LAMal + 3B cumulés — couple */
  lamalAnd3b_ifd_married: 700_000, // CHF 7'000
  /** IFD : supplément par enfant */
  lamalAnd3b_ifd_perChild: 90_000, // CHF 900 (prime LAMal enfant incluse)
} as const;

export interface InsuranceDeductionInput {
  lamalPremiums: number; // centimes (total annuel, avant subside)
  pillar3bPremiums: number; // centimes (inclus dans 3B, mais plafond combiné IFD)
  familyStatus: "single" | "married" | "divorced" | "widowed";
  childrenCount: number;
}

export interface InsuranceDeductionResult {
  lamal_icc: number;
  lamalAnd3b_ifd: number;
}

/**
 * LAMal ICC : jusqu'à 2× la prime cantonale moyenne par adulte.
 * LAMal + 3B IFD : plafond combiné selon situation familiale.
 */
export function computeInsuranceDeductions(
  input: InsuranceDeductionInput
): InsuranceDeductionResult {
  // ICC : LAMal déductible jusqu'au plafond (2× prime moyenne par adulte)
  const adultMultiplier = input.familyStatus === "married" ? 2 : 1;
  const lamal_icc = Math.min(input.lamalPremiums, INSURANCE_LIMITS_2025.lamal_icc_adult * adultMultiplier);

  // IFD : LAMal + 3B cumulés
  const combined = input.lamalPremiums + input.pillar3bPremiums;
  const ifdBase =
    input.familyStatus === "married"
      ? INSURANCE_LIMITS_2025.lamalAnd3b_ifd_married
      : INSURANCE_LIMITS_2025.lamalAnd3b_ifd_single;
  const ifdLimit =
    ifdBase + input.childrenCount * INSURANCE_LIMITS_2025.lamalAnd3b_ifd_perChild;

  return {
    lamal_icc,
    lamalAnd3b_ifd: Math.min(combined, ifdLimit),
  };
}
