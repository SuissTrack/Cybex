/**
 * Calculateur ICC (Impôt Cantonal et Communal) — Genève 2025
 * Tous les montants en centimes.
 */

import { TaxCalculationInput, ICCResult, ICCDeductions, SplittingMode } from "@/types/tax";
import { computeICCTotal } from "./rates/icc-2025";
import { getCommuneRate } from "./rates/communes-2025";
import { computeProvidentDeductions } from "./deductions/provident";
import { computeFamilyDeductions } from "./deductions/family";
import { computeProfessionalDeductions } from "./deductions/professional";
import { computeInsuranceDeductions } from "./deductions/insurance";
import { computeMedicalDeduction } from "./deductions/medical";
import { computeDonationDeduction } from "./deductions/donations";

function getSplittingMode(input: TaxCalculationInput): SplittingMode {
  if (input.familyStatus === "married") return "full";
  if (input.isMonoparental) return "partial";
  return "none";
}

export function computeICC(input: TaxCalculationInput): ICCResult {
  const communeRate = getCommuneRate(input.commune);
  const splitting = getSplittingMode(input);

  // ── 1. Revenu brut ───────────────────────────────────────────────────────
  const grossIncome =
    input.grossSalary +
    input.sideIncome +
    input.pensionIncome +
    input.dividendIncome +
    input.rentalIncome -
    input.rentalExpenses +
    input.alimonyReceived;

  // ── 2. Cotisations sociales obligatoires ────────────────────────────────
  const avs =
    input.avsContributions + input.acContributions + input.aanpContributions;
  const lppMandatory = input.lppMandatoryContributions;

  const netAfterSocial = grossIncome - avs - lppMandatory;

  // ── 3. Frais professionnels + transport + repas + formation ─────────────
  const proDeductions = computeProfessionalDeductions(
    {
      grossSalary: input.grossSalary,
      expensesMode: input.professionalExpensesMode,
      transportMode: input.transportMode,
      transportDistanceKm: input.transportDistance,
      publicTransportCost: 0, // Not stored separately — absorbed in forfait
      teleworkDaysPerWeek: input.teleworkDaysPerWeek,
      mealsDeduction: input.mealsDeduction,
      trainingExpenses: input.trainingExpenses,
    },
    netAfterSocial
  );

  const totalPro =
    proDeductions.professionalExpenses_icc +
    proDeductions.transport_icc +
    proDeductions.meals_icc +
    proDeductions.training_icc;

  const netAfterPro = Math.max(0, netAfterSocial - totalPro);

  // ── 4. Déductions spécifiques ────────────────────────────────────────────
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
    campWeeksCount: Math.round(input.campExpenses / 25_000), // CHF 250 = 25_000 centimes
    childrenUnder14Count: input.childrenCount, // conservative: assume all under 14
    spouseIncome: input.spouseIncome,
    familyStatus: input.familyStatus,
  });

  // Pre-medical net for threshold computation
  const premedNet =
    netAfterPro -
    provident.pillar3a_icc -
    provident.pillar3b_icc -
    provident.lpp_icc -
    insurance.lamal_icc -
    family.children_icc -
    family.childcare_icc -
    family.camps_icc;

  const medicalDeduction = computeMedicalDeduction({
    medicalExpenses: input.medicalExpenses,
    netIncome: premedNet,
  });

  const donationDeduction = computeDonationDeduction(input.donationExpenses, premedNet);

  const handicapDeduction = input.handicapDeduction ? 250_000 : 0; // CHF 2'500 base AI

  // ── 5. Revenu net imposable ICC ──────────────────────────────────────────
  const totalDeductions =
    avs +
    lppMandatory +
    totalPro +
    provident.pillar3a_icc +
    provident.pillar3b_icc +
    provident.lpp_icc +
    insurance.lamal_icc +
    family.children_icc +
    family.childcare_icc +
    family.camps_icc +
    medicalDeduction +
    handicapDeduction +
    donationDeduction +
    (input.alimonyPaid ?? 0);

  const netIncome = Math.max(0, grossIncome - totalDeductions);

  // ── 6. Calcul impôt ──────────────────────────────────────────────────────
  const taxResult = computeICCTotal(netIncome, splitting, communeRate);

  const deductions: ICCDeductions = {
    avs,
    lpp: lppMandatory + provident.lpp_icc,
    professionalExpenses: proDeductions.professionalExpenses_icc,
    transport: proDeductions.transport_icc,
    meals: proDeductions.meals_icc,
    training: proDeductions.training_icc,
    pillar3a: provident.pillar3a_icc,
    pillar3b: provident.pillar3b_icc,
    lamal: insurance.lamal_icc,
    medical: medicalDeduction,
    children: family.children_icc,
    childcare: family.childcare_icc + family.camps_icc,
    donations: donationDeduction,
    alimony: input.alimonyPaid ?? 0,
    handicap: handicapDeduction,
    total: totalDeductions,
  };

  return {
    grossIncome,
    deductions,
    netIncome,
    taxBase: taxResult.taxBase,
    cantonalTax: taxResult.cantonalTax,
    communalTax: taxResult.communalTax,
    communalRate: communeRate,
    total: taxResult.total,
    splitting,
  };
}
