/**
 * Déductions frais médicaux ICC/IFD — Genève 2025
 * Seuil : 5% du revenu net (identique ICC et IFD)
 * Montants en centimes.
 */

/** Seuil franchise frais médicaux : 5% du revenu net */
export const MEDICAL_THRESHOLD_RATE = 0.05;

export interface MedicalDeductionInput {
  medicalExpenses: number; // centimes (dépenses non remboursées)
  netIncome: number; // centimes (revenu net imposable, avant déduction médicale)
}

/**
 * Calcule la déduction frais médicaux.
 * Déductible = montant dépassant 5% du revenu net.
 * Identique pour ICC et IFD.
 */
export function computeMedicalDeduction(input: MedicalDeductionInput): number {
  if (input.medicalExpenses <= 0 || input.netIncome <= 0) return 0;
  const threshold = Math.round(input.netIncome * MEDICAL_THRESHOLD_RATE);
  return Math.max(0, input.medicalExpenses - threshold);
}
