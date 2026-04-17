/**
 * Déductions professionnelles ICC/IFD — Genève 2025
 * Montants en centimes.
 */

export const PROFESSIONAL_LIMITS_2025 = {
  /** Forfait frais pro ICC : 3% du revenu net, max CHF 4'000 */
  forfaitRate: 0.03,
  forfaitMax_icc: 400_000, // CHF 4'000
  forfaitMax_ifd: 400_000, // CHF 4'000
  /** Transport voiture ICC — forfait annuel */
  carTransport_icc: 52_900, // CHF 529
  /** Transport voiture IFD — CHF 0.70/km, max CHF 3'200 */
  carTransportRate_ifd: 0.70, // CHF/km
  carTransportMax_ifd: 320_000, // CHF 3'200
  /** Repas hors domicile — forfait annuel */
  meals: 320_000, // CHF 3'200
  /** Formation continue — max */
  trainingMax: 1_200_000, // CHF 12'000
  /** Jours travaillés par an */
  workingDaysPerYear: 220,
} as const;

export interface ProfessionalDeductionInput {
  grossSalary: number; // centimes (pour calcul forfait)
  expensesMode: "forfait" | "real_expenses";
  transportMode: "public_transport" | "car" | "bike" | "homeworker";
  transportDistanceKm: number; // aller simple
  publicTransportCost: number; // centimes/an (abonnement réel)
  teleworkDaysPerWeek: number; // 0–5
  mealsDeduction: boolean;
  trainingExpenses: number; // centimes réels
}

export interface ProfessionalDeductionResult {
  professionalExpenses_icc: number;
  professionalExpenses_ifd: number;
  transport_icc: number;
  transport_ifd: number;
  meals_icc: number;
  meals_ifd: number;
  training_icc: number;
  training_ifd: number;
}

/**
 * Facteur présence bureau selon télétravail (0–1).
 * 5j/semaine → 1.0, 4j télétravail/semaine → 1j bureau → 0.2, etc.
 */
function officePresenceFactor(teleworkDaysPerWeek: number): number {
  const officeDays = Math.max(0, 5 - teleworkDaysPerWeek);
  return officeDays / 5;
}

export function computeProfessionalDeductions(
  input: ProfessionalDeductionInput,
  netSalary: number // centimes (après cotisations sociales)
): ProfessionalDeductionResult {
  const presenceFactor = officePresenceFactor(input.teleworkDaysPerWeek);

  // ── Forfait frais pro ───────────────────────────────────────────────────
  const forfait_icc = Math.min(
    Math.round(netSalary * PROFESSIONAL_LIMITS_2025.forfaitRate),
    PROFESSIONAL_LIMITS_2025.forfaitMax_icc
  );
  const forfait_ifd = Math.min(
    Math.round(netSalary * PROFESSIONAL_LIMITS_2025.forfaitRate),
    PROFESSIONAL_LIMITS_2025.forfaitMax_ifd
  );

  const professionalExpenses_icc =
    input.expensesMode === "forfait" ? forfait_icc : 0; // real = géré séparément
  const professionalExpenses_ifd =
    input.expensesMode === "forfait" ? forfait_ifd : 0;

  // ── Transport ────────────────────────────────────────────────────────────
  let transport_icc = 0;
  let transport_ifd = 0;

  if (input.transportMode === "homeworker") {
    transport_icc = 0;
    transport_ifd = 0;
  } else if (input.transportMode === "public_transport") {
    const adjustedCost = Math.round(input.publicTransportCost * presenceFactor);
    transport_icc = adjustedCost;
    transport_ifd = adjustedCost; // frais réels pour IFD aussi
  } else if (input.transportMode === "car") {
    transport_icc = Math.round(PROFESSIONAL_LIMITS_2025.carTransport_icc * presenceFactor);
    const rawIfd = Math.round(
      input.transportDistanceKm * 2 * // aller-retour
        PROFESSIONAL_LIMITS_2025.workingDaysPerYear *
        presenceFactor *
        (PROFESSIONAL_LIMITS_2025.carTransportRate_ifd * 100) // CHF → centimes
    );
    transport_ifd = Math.min(rawIfd, PROFESSIONAL_LIMITS_2025.carTransportMax_ifd);
  } else if (input.transportMode === "bike") {
    transport_icc = 0;
    transport_ifd = 0;
  }

  // ── Repas ────────────────────────────────────────────────────────────────
  const meals_icc = input.mealsDeduction
    ? Math.round(PROFESSIONAL_LIMITS_2025.meals * presenceFactor)
    : 0;
  const meals_ifd = meals_icc;

  // ── Formation continue ──────────────────────────────────────────────────
  const training_icc = Math.min(input.trainingExpenses, PROFESSIONAL_LIMITS_2025.trainingMax);
  const training_ifd = training_icc;

  return {
    professionalExpenses_icc,
    professionalExpenses_ifd,
    transport_icc,
    transport_ifd,
    meals_icc,
    meals_ifd,
    training_icc,
    training_ifd,
  };
}
