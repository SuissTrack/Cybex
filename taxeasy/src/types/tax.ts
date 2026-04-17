// Tax calculation types — all amounts in centimes

export interface TaxBracket {
  from: number; // centimes
  to: number | null; // null = unbounded
  rate: number; // e.g. 0.08 = 8%
  baseTax: number; // centimes — tax already computed on lower brackets
}

export interface ICCBrackets {
  single: TaxBracket[];
  married: TaxBracket[]; // splitting complet (50%)
  monoparental: TaxBracket[]; // splitting partiel (55.56%)
}

export interface IFDBrackets {
  single: TaxBracket[];
  married: TaxBracket[];
  monoparental: TaxBracket[];
}

export interface FortuneBracket {
  from: number; // centimes
  to: number | null;
  baseRate: number; // pour impôt de base
  supplementaryRate: number; // pour impôt supplémentaire
}

export interface CommuneRate {
  name: string;
  rate: number; // e.g. 0.455 = 45.5%
}

export interface TaxCalculationInput {
  // Revenus (centimes)
  grossSalary: number;
  sideIncome: number;
  pensionIncome: number;
  dividendIncome: number;
  rentalIncome: number;
  rentalExpenses: number;
  alimonyReceived: number;

  // Cotisations sociales (centimes) — du certificat de salaire
  avsContributions: number;
  acContributions: number;
  aanpContributions: number;
  lppMandatoryContributions: number;

  // Déductions famille
  familyStatus: "single" | "married" | "divorced" | "widowed";
  isMonoparental: boolean;
  childrenCount: number;
  childcareExpenses: number; // centimes
  campExpenses: number; // centimes
  spouseIncome: number; // centimes (pour déduction conjoint IFD)

  // Déductions prévoyance (centimes)
  lppVoluntaryPurchase: number;
  pillar3aContributions: number;
  pillar3bPremiums: number;

  // Déductions assurances (centimes)
  lamalPremiums: number;

  // Déductions professionnelles
  professionalExpensesMode: "forfait" | "real_expenses";
  transportMode: "public_transport" | "car" | "bike" | "homeworker";
  transportDistance: number; // km aller simple
  teleworkDaysPerWeek: number;
  mealsDeduction: boolean;
  trainingExpenses: number; // centimes

  // Déductions diverses (centimes)
  medicalExpenses: number;
  donationExpenses: number;
  alimonyPaid: number;
  handicapDeduction: boolean;

  // Fortune (centimes)
  bankAssets: number;
  securitiesAssets: number;
  realEstateValue: number;
  vehiclesValue: number;
  otherAssets: number;
  debts: number;

  // Contexte
  commune: string;
  taxYear: number;
}

export interface DeductionBreakdown {
  label: string;
  icc: number; // centimes
  ifd: number; // centimes
  note?: string;
}

export interface TaxOptimizationSuggestion {
  type:
    | "pillar3a"
    | "pillar3b"
    | "lpp_purchase"
    | "real_expenses"
    | "other";
  potentialSaving: number; // centimes
  description: string;
  actionLabel: string;
}

// ─── Résultats des calculateurs ──────────────────────────────────────────────

export type SplittingMode = "none" | "full" | "partial";

export interface ICCDeductions {
  avs: number;
  lpp: number;
  professionalExpenses: number;
  transport: number;
  meals: number;
  training: number;
  pillar3a: number;
  pillar3b: number;
  lamal: number;
  medical: number;
  children: number;
  childcare: number;
  donations: number;
  alimony: number;
  handicap: number;
  total: number;
}

export interface ICCResult {
  grossIncome: number;
  deductions: ICCDeductions;
  netIncome: number;
  taxBase: number;
  cantonalTax: number;
  communalTax: number;
  communalRate: number;
  total: number;
  splitting: SplittingMode;
}

export interface IFDDeductions {
  avs: number;
  lpp: number;
  professionalExpenses: number;
  transport: number;
  meals: number;
  training: number;
  pillar3a: number;
  lamalAnd3b: number;
  medical: number;
  children: number;
  childcare: number;
  spouseDeduction: number;
  donations: number;
  alimony: number;
  handicap: number;
  total: number;
}

export interface IFDResult {
  grossIncome: number;
  deductions: IFDDeductions;
  netIncome: number;
  taxBase: number;
  tax: number;
  splitting: SplittingMode;
}
