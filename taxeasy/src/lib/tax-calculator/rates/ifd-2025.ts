/**
 * Barèmes IFD (Impôt Fédéral Direct) 2025
 * Source : LIFD + ordonnance sur le barème fédéral 2025
 *
 * Tous les montants sont en CENTIMES.
 *
 * SPLITTING IFD :
 *  - Célibataire    : barème célibataire à 100%
 *  - Marié          : barème marié/famille (tranches différentes)
 *  - Monoparental   : barème marié/famille (assimilé à couple avec enfant)
 */

import { TaxBracket } from "./icc-2025";

/** Barème IFD 2025 — Célibataires / Personnes seules */
export const IFD_BRACKETS_SINGLE_2025: TaxBracket[] = [
  { from: 0,           to: 1_700_000,  rate: 0.000,  baseTax: 0 },
  { from: 1_700_000,   to: 3_100_000,  rate: 0.0077, baseTax: 0 },
  { from: 3_100_000,   to: 4_100_000,  rate: 0.0088, baseTax: 10_780 },
  { from: 4_100_000,   to: 5_500_000,  rate: 0.0264, baseTax: 19_580 },
  { from: 5_500_000,   to: 7_200_000,  rate: 0.0297, baseTax: 56_540 },
  { from: 7_200_000,   to: 7_800_000,  rate: 0.0594, baseTax: 107_030 },
  { from: 7_800_000,   to: 10_100_000, rate: 0.0660, baseTax: 142_670 },
  { from: 10_100_000,  to: 12_900_000, rate: 0.0770, baseTax: 294_470 },
  { from: 12_900_000,  to: 16_000_000, rate: 0.0880, baseTax: 510_070 },
  { from: 16_000_000,  to: 20_000_000, rate: 0.0990, baseTax: 782_870 },
  { from: 20_000_000,  to: 25_700_000, rate: 0.1045, baseTax: 1_178_870 },
  { from: 25_700_000,  to: 32_900_000, rate: 0.1100, baseTax: 1_775_020 },
  { from: 32_900_000,  to: 42_900_000, rate: 0.1155, baseTax: 2_567_220 },
  { from: 42_900_000,  to: 55_900_000, rate: 0.1210, baseTax: 3_722_720 },
  { from: 55_900_000,  to: 72_500_000, rate: 0.1265, baseTax: 5_296_020 },
  { from: 72_500_000,  to: 90_300_000, rate: 0.1320, baseTax: 7_393_420 },
  { from: 90_300_000,  to: 103_600_000,rate: 0.1340, baseTax: 9_741_020 },
  { from: 103_600_000, to: null,        rate: 0.1150, baseTax: 11_518_220 },
];

/** Barème IFD 2025 — Couples mariés / Familles monoparentales */
export const IFD_BRACKETS_MARRIED_2025: TaxBracket[] = [
  { from: 0,           to: 2_800_000,  rate: 0.000,  baseTax: 0 },
  { from: 2_800_000,   to: 5_000_000,  rate: 0.0077, baseTax: 0 },
  { from: 5_000_000,   to: 6_700_000,  rate: 0.0088, baseTax: 16_940 },
  { from: 6_700_000,   to: 9_000_000,  rate: 0.0264, baseTax: 31_900 },
  { from: 9_000_000,   to: 11_400_000, rate: 0.0297, baseTax: 92_620 },
  { from: 11_400_000,  to: 12_200_000, rate: 0.0594, baseTax: 163_900 },
  { from: 12_200_000,  to: 15_800_000, rate: 0.0660, baseTax: 211_420 },
  { from: 15_800_000,  to: 20_300_000, rate: 0.0770, baseTax: 449_020 },
  { from: 20_300_000,  to: 25_600_000, rate: 0.0880, baseTax: 795_520 },
  { from: 25_600_000,  to: 32_900_000, rate: 0.0990, baseTax: 1_262_320 },
  { from: 32_900_000,  to: 41_900_000, rate: 0.1045, baseTax: 1_985_620 },
  { from: 41_900_000,  to: 55_100_000, rate: 0.1100, baseTax: 2_926_120 },
  { from: 55_100_000,  to: 72_100_000, rate: 0.1155, baseTax: 4_378_120 },
  { from: 72_100_000,  to: 93_500_000, rate: 0.1210, baseTax: 6_342_620 },
  { from: 93_500_000,  to: 120_200_000,rate: 0.1265, baseTax: 8_931_420 },
  { from: 120_200_000, to: 155_600_000,rate: 0.1320, baseTax: 12_307_170 },
  { from: 155_600_000, to: 176_900_000,rate: 0.1340, baseTax: 16_982_370 },
  { from: 176_900_000, to: null,        rate: 0.1150, baseTax: 19_836_970 },
];

/**
 * Calcule l'impôt fédéral direct.
 * @param taxableIncome  Revenu net imposable IFD en centimes
 * @param isMarriedOrMono  true si marié / famille monoparentale
 * @returns Impôt IFD en centimes
 */
export function computeIFD(taxableIncome: number, isMarriedOrMono: boolean): number {
  if (taxableIncome <= 0) return 0;

  const brackets = isMarriedOrMono ? IFD_BRACKETS_MARRIED_2025 : IFD_BRACKETS_SINGLE_2025;

  for (const bracket of brackets) {
    const upper = bracket.to ?? Infinity;
    if (taxableIncome <= upper) {
      const excess = taxableIncome - bracket.from;
      return Math.round(bracket.baseTax + excess * bracket.rate);
    }
  }

  const last = brackets[brackets.length - 1];
  return Math.round(last.baseTax + (taxableIncome - last.from) * last.rate);
}

/** Taux IFD maximum légal (11.5%) */
export const IFD_MAX_RATE = 0.115;
