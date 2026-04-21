/**
 * Converts DeclarationAnswers (from wizard) into TaxCalculationInput.
 * All amounts stored in DB as centimes.
 */
import { DeclarationAnswers } from "@/types/declaration";
import { TaxCalculationInput } from "@/types/tax";

/**
 * Estimates AVS+AC+AANP contributions when not explicitly provided.
 * Rates 2025: AVS/AI/APG 5.3% + AC 1.1% (up to CHF 148'200) + AANP ~0.3%
 */
function estimateSocialContributions(grossSalary: number): number {
  const avsRate = 0.053;
  const acCeiling = 14_820_000; // CHF 148'200 in centimes
  const acRate = 0.011;
  const aanpRate = 0.003;
  const avs = Math.round(grossSalary * avsRate);
  const ac = Math.round(Math.min(grossSalary, acCeiling) * acRate);
  const aanp = Math.round(grossSalary * aanpRate);
  return avs + ac + aanp;
}

export function buildTaxInputFromAnswers(
  answers: DeclarationAnswers,
  commune: string
): TaxCalculationInput {
  const familyStatus = answers.family_status ?? "single";
  const isMonoparental = answers.monoparental === "yes";
  const childrenCount = answers.children === "yes" ? (answers.children_count ?? 0) : 0;

  const grossSalary = (answers.salary_amount ?? 0) + (answers.unemployment_income ?? 0);

  // Use declared social contributions, or estimate from salary if not provided
  const socialContributions =
    answers.salary_deductions != null
      ? answers.salary_deductions
      : answers.salary_amount
      ? estimateSocialContributions(answers.salary_amount)
      : 0;

  const childcareExpenses = answers.childcare_amount ?? 0;
  // CHF 250 per camp/week = 25'000 centimes
  const campExpenses = (answers.childcare_camps_count ?? 0) * 25_000;

  return {
    // Revenus (centimes)
    grossSalary,
    sideIncome: answers.side_income ?? 0,
    pensionIncome: answers.pension_income ?? 0,
    dividendIncome: answers.dividends_amount ?? 0,
    rentalIncome: answers.rental_income_amount ?? 0,
    rentalExpenses: answers.rental_expenses_amount ?? 0,
    alimonyReceived: answers.alimony_received_amount ?? 0,

    // Cotisations sociales (centimes) — saisies ou estimées
    avsContributions: socialContributions,
    acContributions: 0, // Inclus dans avsContributions ci-dessus
    aanpContributions: 0, // Inclus dans avsContributions ci-dessus
    lppMandatoryContributions: answers.lpp_mandatory_amount ?? 0,

    // Famille
    familyStatus,
    isMonoparental,
    childrenCount,
    childcareExpenses,
    campExpenses,
    spouseIncome: answers.spouse_deduction ?? 0,

    // Prévoyance
    lppVoluntaryPurchase: answers.deductions_lpp_amount ?? 0,
    pillar3aContributions: answers.deductions_3a_amount ?? 0,
    pillar3bPremiums: answers.deductions_3b_amount ?? 0,

    // Assurances
    lamalPremiums: answers.deductions_lamal ?? 0,

    // Frais professionnels
    professionalExpensesMode: answers.deductions_pro_expenses ?? "forfait",
    transportMode: answers.deductions_transport ?? "public_transport",
    transportDistance: answers.deductions_transport_distance ?? 0,
    teleworkDaysPerWeek: answers.deductions_telework_days ?? 0,
    mealsDeduction: answers.deductions_meals !== "no",
    trainingExpenses: answers.deductions_training_amount ?? 0,

    // Divers
    medicalExpenses: answers.deductions_medical_amount ?? 0,
    donationExpenses: answers.deductions_donations_amount ?? 0,
    alimonyPaid: answers.deductions_alimony_amount ?? 0,
    handicapDeduction: answers.deductions_handicap === "yes",

    // Fortune (centimes)
    bankAssets: answers.wealth_bank ?? 0,
    securitiesAssets: answers.wealth_securities_value ?? 0,
    realEstateValue: answers.wealth_real_estate_value ?? 0,
    vehiclesValue: answers.wealth_vehicles_value ?? 0,
    otherAssets: answers.wealth_other_assets_value ?? 0,
    debts: answers.wealth_debts_amount ?? 0,

    commune,
    taxYear: 2025,
  };
}
