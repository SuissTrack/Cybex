/**
 * Barèmes Impôt sur la Fortune ICC Genève 2025
 * Source : LIPP-V (Loi sur l'imposition des personnes physiques — Fortune), GE
 *
 * DEUX composantes à additionner :
 *  1. Impôt de base fortune
 *  2. Impôt supplémentaire fortune
 *
 * Puis appliquer le taux communal (idem ICC revenu).
 * PAS d'IFD sur la fortune.
 *
 * Tous les montants sont en CENTIMES.
 */

import { TaxBracket } from "./icc-2025";

/** Franchises fortune 2025 (indexées) */
export const FORTUNE_FRANCHISE = {
  single: 8_763_200,    // CHF 87'632
  couple: 17_526_400,   // CHF 175'264
  perChild: 4_381_600,  // CHF 43'816
} as const;

/** Barème impôt de BASE sur la fortune (centimes) */
export const FORTUNE_BASE_BRACKETS_2025: TaxBracket[] = [
  { from: 0,            to: 20_000_000,  rate: 0.0010, baseTax: 0 },
  { from: 20_000_000,   to: 50_000_000,  rate: 0.0015, baseTax: 20_000 },
  { from: 50_000_000,   to: 100_000_000, rate: 0.0020, baseTax: 65_000 },
  { from: 100_000_000,  to: 200_000_000, rate: 0.0025, baseTax: 165_000 },
  { from: 200_000_000,  to: 500_000_000, rate: 0.0030, baseTax: 415_000 },
  { from: 500_000_000,  to: null,        rate: 0.0035, baseTax: 1_315_000 },
];

/** Barème impôt SUPPLÉMENTAIRE sur la fortune (centimes) */
export const FORTUNE_SUPPLEMENTARY_BRACKETS_2025: TaxBracket[] = [
  { from: 0,            to: 20_000_000,  rate: 0.00050, baseTax: 0 },
  { from: 20_000_000,   to: 50_000_000,  rate: 0.00075, baseTax: 10_000 },
  { from: 50_000_000,   to: 100_000_000, rate: 0.00100, baseTax: 32_500 },
  { from: 100_000_000,  to: 200_000_000, rate: 0.00125, baseTax: 82_500 },
  { from: 200_000_000,  to: 500_000_000, rate: 0.00150, baseTax: 207_500 },
  { from: 500_000_000,  to: null,        rate: 0.00175, baseTax: 657_500 },
];

function applyBrackets(fortune: number, brackets: TaxBracket[]): number {
  if (fortune <= 0) return 0;
  for (const bracket of brackets) {
    const upper = bracket.to ?? Infinity;
    if (fortune <= upper) {
      return Math.round(bracket.baseTax + (fortune - bracket.from) * bracket.rate);
    }
  }
  const last = brackets[brackets.length - 1];
  return Math.round(last.baseTax + (fortune - last.from) * last.rate);
}

/**
 * Calcule la franchise fortune nette selon la situation familiale.
 */
export function computeFortuneFranchise(
  familyStatus: "single" | "married" | "divorced" | "widowed",
  childrenCount: number
): number {
  const base =
    familyStatus === "married"
      ? FORTUNE_FRANCHISE.couple
      : FORTUNE_FRANCHISE.single;
  return base + childrenCount * FORTUNE_FRANCHISE.perChild;
}

/**
 * Calcule l'impôt sur la fortune ICC (sans impôt communal).
 * @param grossFortune  Fortune brute totale en centimes
 * @param debts         Dettes à déduire en centimes
 * @param franchise     Franchise applicable en centimes
 * @returns Impôt de base + supplémentaire fortune (avant taux communal)
 */
export function computeFortuneTax(
  grossFortune: number,
  debts: number,
  franchise: number
): {
  grossFortune: number;
  debts: number;
  franchise: number;
  netFortune: number;
  baseTax: number;
  supplementaryTax: number;
  cantonalTotal: number;
} {
  const netFortune = Math.max(0, grossFortune - debts - franchise);
  const baseTax = applyBrackets(netFortune, FORTUNE_BASE_BRACKETS_2025);
  const supplementaryTax = applyBrackets(netFortune, FORTUNE_SUPPLEMENTARY_BRACKETS_2025);

  return {
    grossFortune,
    debts,
    franchise,
    netFortune,
    baseTax,
    supplementaryTax,
    cantonalTotal: baseTax + supplementaryTax,
  };
}

/**
 * Calcule l'impôt fortune complet (cantonal + communal).
 */
export function computeFortuneTotal(
  grossFortune: number,
  debts: number,
  franchise: number,
  communeRate: number
): {
  netFortune: number;
  baseTax: number;
  supplementaryTax: number;
  cantonalTax: number;
  communalTax: number;
  total: number;
} {
  const result = computeFortuneTax(grossFortune, debts, franchise);
  const communalTax = Math.round(result.cantonalTotal * communeRate);

  return {
    netFortune: result.netFortune,
    baseTax: result.baseTax,
    supplementaryTax: result.supplementaryTax,
    cantonalTax: result.cantonalTotal,
    communalTax,
    total: result.cantonalTotal + communalTax,
  };
}
