/**
 * Déductions prévoyance ICC/IFD — Genève 2025
 * Montants en centimes.
 */

/** Plafonds prévoyance 2025 */
export const PROVIDENT_LIMITS_2025 = {
  /** Pilier 3A salarié (avec LPP) */
  pillar3a_employee: 725_800, // CHF 7'258
  /** Pilier 3A indépendant (sans LPP) — 20% revenu net, max CHF 36'288 */
  pillar3a_selfEmployed_max: 3_628_800, // CHF 36'288
  pillar3a_selfEmployed_rate: 0.20,
  /** Pilier 3B ICC — célibataire */
  pillar3b_single: 223_200, // CHF 2'232
  /** Pilier 3B ICC — couple */
  pillar3b_married: 334_800, // CHF 3'348
  /** Pilier 3B ICC — supplément par enfant à charge */
  pillar3b_perChild: 90_000, // CHF 900
  /** LPP rachat : pas de plafond */
  lpp_purchase: Infinity,
} as const;

export interface ProvidentDeductionInput {
  pillar3aContributions: number; // centimes versés
  isEmployee: boolean; // true = salarié avec LPP; false = indépendant
  netIncome: number; // centimes (pour calcul 20% indépendant)
  lppVoluntaryPurchase: number; // centimes
  pillar3bPremiums: number; // centimes (ICC uniquement)
  familyStatus: "single" | "married" | "divorced" | "widowed";
  childrenCount: number;
}

export interface ProvidentDeductionResult {
  pillar3a_icc: number;
  pillar3a_ifd: number;
  pillar3b_icc: number; // 0 pour IFD (non déductible séparément)
  lpp_icc: number;
  lpp_ifd: number;
}

/**
 * Calcule les déductions prévoyance applicables.
 * La 3B est UNIQUEMENT déductible à l'ICC (spécificité genevoise).
 */
export function computeProvidentDeductions(
  input: ProvidentDeductionInput
): ProvidentDeductionResult {
  // ── 3A ───────────────────────────────────────────────────────────────────
  const limit3a = input.isEmployee
    ? PROVIDENT_LIMITS_2025.pillar3a_employee
    : Math.min(
        Math.round(input.netIncome * PROVIDENT_LIMITS_2025.pillar3a_selfEmployed_rate),
        PROVIDENT_LIMITS_2025.pillar3a_selfEmployed_max
      );

  const pillar3a = Math.min(input.pillar3aContributions, limit3a);

  // ── 3B (ICC uniquement) ──────────────────────────────────────────────────
  const baseLimit3b =
    input.familyStatus === "married"
      ? PROVIDENT_LIMITS_2025.pillar3b_married
      : PROVIDENT_LIMITS_2025.pillar3b_single;
  const limit3b = baseLimit3b + input.childrenCount * PROVIDENT_LIMITS_2025.pillar3b_perChild;
  const pillar3b_icc = Math.min(input.pillar3bPremiums, limit3b);

  // ── LPP rachat ──────────────────────────────────────────────────────────
  // Intégralement déductible (sans plafond)
  const lpp = Math.max(0, input.lppVoluntaryPurchase);

  return {
    pillar3a_icc: pillar3a,
    pillar3a_ifd: pillar3a, // même plafond ICC et IFD
    pillar3b_icc: pillar3b_icc,
    lpp_icc: lpp,
    lpp_ifd: lpp,
  };
}
