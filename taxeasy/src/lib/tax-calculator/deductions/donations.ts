/**
 * Déductions dons ICC/IFD — Genève 2025
 * Montants en centimes.
 */

export const DONATION_LIMITS_2025 = {
  /** Minimum déductible */
  min: 10_000, // CHF 100
  /** Maximum : 20% du revenu net */
  maxRate: 0.20,
} as const;

/**
 * Calcule la déduction dons (identique ICC et IFD).
 * @param donationExpenses  Montant total des dons en centimes
 * @param netIncome         Revenu net imposable en centimes
 * @returns Déduction applicable en centimes
 */
export function computeDonationDeduction(
  donationExpenses: number,
  netIncome: number
): number {
  if (donationExpenses < DONATION_LIMITS_2025.min) return 0;
  const maxDeduction = Math.round(netIncome * DONATION_LIMITS_2025.maxRate);
  return Math.min(donationExpenses, maxDeduction);
}
