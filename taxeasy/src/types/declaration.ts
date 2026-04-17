// All monetary amounts stored as integers in centimes (e.g. CHF 7'258 = 725800)

export type Plan = "FREE" | "BASIC" | "PREMIUM";
export type DeclStatus = "IN_PROGRESS" | "REVIEW_PENDING" | "COMPLETED" | "SUBMITTED";
export type DocType =
  | "SALARY_CERT"
  | "LPP"
  | "PILLAR3A"
  | "PILLAR3B"
  | "BANK_STATEMENT"
  | "LAMAL"
  | "MEDICAL"
  | "DONATION"
  | "REAL_ESTATE"
  | "OTHER";
export type OcrStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED" | "MANUAL_REVIEW";
export type ExportFormat = "PDF" | "GETAX_XML";

export type FamilyStatus = "single" | "married" | "divorced" | "widowed";
export type ResidencyType = "resident_ge" | "tou" | "frontalier" | "other";
export type IncomeMain =
  | "employee"
  | "employee_side"
  | "self_employed"
  | "retired"
  | "unemployed"
  | "fonct_intl";

export interface DeclarationAnswers {
  // Section 1 — Résidence
  residency_type?: ResidencyType;

  // Section 2 — État civil & famille
  family_status?: FamilyStatus;
  spouse_work?: "yes" | "no";
  spouse_deduction?: number; // centimes
  monoparental?: "yes" | "no";
  children?: "yes" | "no";
  children_count?: number;
  children_age_check?: "yes_all" | "yes_some" | "no";
  children_custody?: Array<"daycare_creche" | "parascolaire" | "camps" | "none">;
  childcare_amount?: number; // centimes — crèche, parascolaire
  childcare_camps_count?: number; // nombre de camps/semaines

  // Section 3 — Revenus
  income_main?: IncomeMain;
  salary_uploaded?: boolean;
  salary_amount?: number; // centimes — salaire brut (case A du certificat)
  salary_deductions?: number; // centimes — cotisations sociales (cases 10.1+10.2+10.3)
  lpp_mandatory_amount?: number; // centimes — cotisations LPP obligatoires (case 11)
  pension_income?: number; // centimes — retraités
  unemployment_income?: number; // centimes — chômeurs/APG
  side_income?: number; // centimes
  other_income?: Array<"dividends" | "rental" | "alimony_received" | "social" | "none">;
  dividends_types?: Array<"swiss_bonds" | "swiss_shares" | "foreign_shares" | "crypto">;
  dividends_amount?: number; // centimes
  rental_type?: "rented_out" | "owner_occupied" | "hlm" | "commercial";
  rental_income_amount?: number; // centimes
  rental_expenses_amount?: number; // centimes — intérêts hypothécaires + entretien
  alimony_received_amount?: number; // centimes

  // Section 4 — Déductions
  deductions_lpp?: "yes" | "no";
  deductions_lpp_amount?: number; // centimes
  deductions_3a?: "yes" | "no" | "yes_retroactive";
  deductions_3a_amount?: number; // centimes
  deductions_3b?: "yes" | "no";
  deductions_3b_amount?: number; // centimes
  deductions_lamal?: number; // centimes
  deductions_pro_expenses?: "forfait" | "real_expenses";
  deductions_transport?: "public_transport" | "car" | "bike" | "homeworker";
  deductions_transport_distance?: number; // km
  deductions_telework?: "yes_partial" | "yes_full" | "no";
  deductions_telework_days?: number; // 1–5
  deductions_meals?: "yes_distance" | "yes_no_kitchen" | "no";
  deductions_training?: "yes" | "no";
  deductions_training_amount?: number; // centimes
  deductions_medical?: "yes" | "no";
  deductions_medical_amount?: number; // centimes
  deductions_handicap?: "yes" | "no";
  deductions_donations?: "yes" | "no";
  deductions_donations_amount?: number; // centimes
  deductions_alimony?: "yes" | "no";
  deductions_alimony_amount?: number; // centimes

  // Section 5 — Fortune
  wealth_bank?: number; // centimes
  wealth_securities?: "yes" | "no";
  wealth_securities_types?: Array<"swiss" | "foreign" | "crypto" | "participations">;
  wealth_securities_value?: number; // centimes — valeur du portefeuille au 31.12
  wealth_real_estate?: "yes" | "no";
  wealth_real_estate_value?: number; // centimes — valeur fiscale
  wealth_vehicles?: "yes" | "no";
  wealth_vehicles_value?: number; // centimes — valeur Eurotax
  wealth_other?: Array<"jewelry" | "life_insurance" | "loans" | "debts" | "none">;
  wealth_other_assets_value?: number; // centimes — bijoux + créances + 3B
  wealth_debts_amount?: number; // centimes — dettes totales

  // CRV
  crv?: "yes_catholic" | "yes_protestant" | "yes_other" | "no";
}

export interface Declaration {
  id: string;
  userId: string;
  taxYear: number;
  status: DeclStatus;
  currentNodeId: string;
  answers: DeclarationAnswers;
  computedTax: ComputedTax | null;
  isTOU: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComputedTax {
  icc: ICCResult;
  ifd: IFDResult;
  fortune: FortuneResult;
  total: number; // centimes, ICC + IFD + fortune
  commune: string;
  taxYear: number;
  computedAt: string; // ISO date
}

export interface ICCResult {
  grossIncome: number; // centimes
  deductions: ICCDeductions;
  netIncome: number; // centimes
  taxBase: number; // après splitting
  cantonalTax: number; // centimes
  communalTax: number; // centimes
  communalRate: number; // e.g. 0.455
  total: number; // centimes
  splitting: SplittingMode;
}

export interface IFDResult {
  grossIncome: number; // centimes
  deductions: IFDDeductions;
  netIncome: number; // centimes
  taxBase: number; // après splitting
  tax: number; // centimes
  splitting: SplittingMode;
}

export interface FortuneResult {
  grossFortune: number; // centimes
  franchise: number; // centimes
  netFortune: number; // centimes
  baseTax: number; // centimes
  supplementaryTax: number; // centimes
  communalRate: number;
  total: number; // centimes
}

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
