import { DocType, OcrStatus } from "./declaration";

export interface DocumentRecord {
  id: string;
  userId: string;
  declarationId: string | null;
  type: DocType;
  filename: string;
  storagePath: string;
  ocrStatus: OcrStatus;
  extractedData: ExtractedData | null;
  confidence: number | null;
  uploadedAt: Date;
}

export type ExtractedData =
  | SalaryCertificateData
  | LppAttestationData
  | Pillar3aData
  | Pillar3bData
  | BankStatementData
  | LamalData
  | GenericExtractedData;

export interface SalaryCertificateData {
  _type: "salary_cert";
  // Case A — Salaire brut total (allocations familiales incluses dès 2025)
  grossSalary: number; // centimes
  // dont allocations familiales (sous-case de A, 2025)
  familyAllowances: number; // centimes
  // Case 10.1 — AVS/AI/APG (part employé)
  avsContributions: number; // centimes
  // Case 10.2 — AC (assurance chômage)
  acContributions: number; // centimes
  // Case 10.3 — AANP (accident non professionnel)
  aanpContributions: number; // centimes
  // Case 11 — LPP / 2ème pilier (cotisations obligatoires)
  lppContributions: number; // centimes
  // Case 13 — Impôt à la source retenu
  sourceWithholding: number; // centimes
  // Frais professionnels (cases 13.1 + 13.2 + 13.3)
  expenseReimbursements: number; // centimes
  // Métadonnées
  employer: string;
  employeeName?: string;
  employeeAvsNumber?: string; // format 756.XXXX.XXXX.XX
  activityRate?: number; // 0–100 (taux d'occupation %)
  canton: string;
  year: number;
  // Période d'activité
  periodFrom?: string; // "01.01.2025"
  periodTo?: string;   // "31.12.2025"
}

export interface LppAttestationData {
  _type: "lpp";
  mandatoryContributions: number; // centimes (cotisations obligatoires)
  voluntaryPurchase: number; // centimes (rachat volontaire)
  pensionFund: string;
  year: number;
}

export interface Pillar3aData {
  _type: "pillar3a";
  contributions: number; // centimes
  provider: string;
  year: number;
  isRetroactive: boolean;
  retroactiveYears?: number[];
}

export interface Pillar3bData {
  _type: "pillar3b";
  annualPremium: number; // centimes
  surrenderValue: number; // centimes (valeur de rachat — fortune)
  insurer: string;
  year: number;
}

export interface BankStatementData {
  _type: "bank_statement";
  balance: number; // centimes au 31.12
  grossInterest: number; // centimes
  anticipatoryTax: number; // centimes (impôt anticipé 35%)
  institution: string;
  accountNumber?: string;
  year: number;
}

export interface LamalData {
  _type: "lamal";
  annualPremium: number; // centimes
  subsidy: number; // centimes (subside LAMal)
  insurer: string;
  year: number;
}

export interface GenericExtractedData {
  _type: "generic";
  rawText: string;
  fields: Record<string, string>;
}

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  SALARY_CERT: "Certificat de salaire",
  LPP: "Attestation LPP (2ème pilier)",
  PILLAR3A: "Attestation 3ème pilier A",
  PILLAR3B: "Attestation 3ème pilier B",
  BANK_STATEMENT: "Relevé bancaire / fiscal",
  LAMAL: "Attestation prime LAMal",
  MEDICAL: "Factures médicales",
  DONATION: "Attestation de don",
  REAL_ESTATE: "Documents immobiliers",
  OTHER: "Autre document",
};
