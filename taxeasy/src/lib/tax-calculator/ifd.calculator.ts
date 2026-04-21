/**
 * Calculateur IFD (Impôt Fédéral Direct) — 2025
 * Tous les montants en centimes.
 */

import { TaxCalculationInput, IFDResult, IFDDeductions } from "@/types/tax";
import { computeIFD } from "./rates/ifd-2025";
import { computeProvidentDeductions } from "./deductions/provident";
import { computeFamilyDeductions } from "./deductions/family";
import { computeProfessionalDeductions } from "./deductions/professional";
import { computeInsuranceDeductions } from "./deductions/insurance";
import { computeMedicalDeduction } from "./deductions/medical";
import { computeDonationDeduction } from "./deductions/donations";

export function computeIFDResult(input: TaxCalculationInput): IFDResult {
  const isMarriedOrMono = input.familyStatus === "married" || input.isMonoparental;
  const splitting = input.familyStatus === "married" ? "full" : input.isMonoparental ? "partial" : "none";

  // ── 1. Revenu brut ───────────────────────────────────────────────────────
  const grossIncome =
    input.grossSalary +
    input.sideIncome +
    input.pensionIncome +
    input.dividendIncome +
    input.rentalIncome -
    input.rentalExpenses +
    input.alimonyReceived;

  // ── 2. Cotisations sociales ──────────────────────────────────────────────
  const avs = input.avsContributions + input.acContributions + input.aanpContributions;
  const lppMandatory = input.lppMandatoryContributions;
  const netAfterSocial = grossIncome - avs - lppMandatory;

  // ── 3. Frais professionnels IFD ──────────────────────────────────────────
  const proDeductions = computeProfessionalDeductions(
    {
      grossSalary: input.grossSalary,
      expensesMode: input.professionalExpensesMode,
      transportMode: input.transportMode,
      transportDistanceKm: input.transportDistance,
      publicTransportCost: 0,
      teleworkDaysPerWeek: input.teleworkDaysPerWeek,
      mealsDeduction: input.mealsDeduction,
      trainingExpenses: input.trainingExpenses,
    },
    netAfterSocial
  );

  const totalPro =
    proDeductions.professionalExpenses_ifd +
    proDeductions.transport_ifd +
    proDeductions.meals_ifd +
    proDeductions.training_ifd;

  const netAfterPro = Math.max(0, netAfterSocial - totalPro);

  // ── 4. Déductions spécifiques IFD ────────────────────────────────────────
  const provident = computeProvidentDeductions({
    pillar3aContributions: input.pillar3aContributions,
    isEmployee: input.professionalExpensesMode !== "real_expenses",
    netIncome: netAfterPro,
    lppVoluntaryPurchase: input.lppVoluntaryPurchase,
    pillar3bPremiums: input.pillar3bPremiums,
    familyStatus: input.familyStatus,
    childrenCount: input.childrenCount,
  });

  const insurance = computeInsuranceDeductions({
    lamalPremiums: input.lamalPremiums,
    pillar3bPremiums: input.pillar3bPremiums,
    familyStatus: input.familyStatus,
    childrenCount: input.childrenCount,
  });

  const family = computeFamilyDeductions({
    childrenCount: input.childrenCount,
    childcareExpenses: input.childcareExpenses,
    campWeeksCount: 0, // camps non déductibles IFD
    childrenUnder14Count: input.childrenCount,
    spouseIncome: input.spouseIncome,
    familyStatus: input.familyStatus,
  });

  const premedNet =
    netAfterPro -
    provident.pillar3a_ifd -
    provident.lpp_ifd -
    insurance.lamalAnd3b_ifd -
    family.children_ifd -
    family.spouse_ifd;

  const medicalDeduction = computeMedicalDeduction({
    medicalExpenses: input.medicalExpenses,
    netIncome: premedNet,
  });

  const donationDeduction = computeDonationDeduction(input.donationExpenses, premedNet);
  const handicapDeduction = input.handicapDeduction ? 250_000 : 0;

  // ── 5. Revenu net imposable IFD ──────────────────────────────────────────
  const totalDeductions =
    avs +
    lppMandatory +
    totalPro +
    provident.pillar3a_ifd +
    provident.lpp_ifd +
    insurance.lamalAnd3b_ifd +
    family.children_ifd +
    family.spouse_ifd +
    medicalDeduction +
    handicapDeduction +
    donationDeduction +
    (input.alimonyPaid ?? 0);

  const netIncome = Math.max(0, grossIncome - totalDeductions);

  // ── 6. Calcul IFD ────────────────────────────────────────────────────────
  const tax = computeIFD(netIncome, isMarriedOrMono);

  const deductions: IFDDeductions = {
    avs,
    lpp: lppMandatory + provident.lpp_ifd,
    professionalExpenses: proDeductions.professionalExpenses_ifd,
    transport: proDeductions.transport_ifd,
    meals: proDeductions.meals_ifd,
    training: proDeductions.training_ifd,
    pillar3a: provident.pillar3a_ifd,
    lamalAnd3b: insurance.lamalAnd3b_ifd,
    medical: medicalDeduction,
    children: family.children_ifd,
    childcare: 0, // non déductible IFD
    spouseDeduction: family.spouse_ifd,
    donations: donationDeduction,
    alimony: input.alimonyPaid ?? 0,
    handicap: handicapDeduction,
    total: totalDeductions,
  };

  return {
    grossIncome,
    deductions,
    netIncome,
    taxBase: netIncome, // IFD n'applique pas le splitting par tranche
    tax,
    splitting,
  };
}
