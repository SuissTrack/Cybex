/**
 * Barèmes ICC (Impôt Cantonal et Communal) Genève 2025
 * Réforme 2025 : baisse des taux pour quasi tous les contribuables
 *
 * Tous les montants sont en CENTIMES.
 * Les tranches ci-dessous sont celles du barème cantonal de BASE (impôt cantonal seul).
 * L'impôt communal = impôt cantonal × taux_communal.
 *
 * SPLITTING :
 *  - Célibataire / divorcé / veuf : barème à 100% du revenu
 *  - Marié / partenaire enregistré : barème appliqué à 50% du revenu (splitting complet)
 *  - Famille monoparentale : barème appliqué à 1/1.8 du revenu ≈ 55.556% (splitting partiel)
 */

export interface TaxBracket {
  /** Borne inférieure de la tranche (centimes) */
  from: number;
  /** Borne supérieure de la tranche, null = pas de borne (centimes) */
  to: number | null;
  /** Taux marginal de la tranche (décimal, ex: 0.08 = 8%) */
  rate: number;
  /** Impôt cumulé déjà calculé sur les tranches inférieures (centimes) */
  baseTax: number;
}

/**
 * Barème ICC 2025 — revenu annuel imposable (centimes)
 * Source : Loi sur l'imposition des personnes physiques (LIPP) GE, taux réformés 2025
 *
 * NB : ces tranches s'appliquent au revenu APRÈS splitting.
 */
export const ICC_BRACKETS_2025: TaxBracket[] = [
  { from: 0,          to: 1_700_000,  rate: 0.00,  baseTax: 0 },
  { from: 1_700_000,  to: 2_400_000,  rate: 0.05,  baseTax: 0 },
  { from: 2_400_000,  to: 3_100_000,  rate: 0.08,  baseTax: 35_000 },
  { from: 3_100_000,  to: 4_100_000,  rate: 0.10,  baseTax: 91_000 },
  { from: 4_100_000,  to: 5_600_000,  rate: 0.12,  baseTax: 191_000 },
  { from: 5_600_000,  to: 7_600_000,  rate: 0.14,  baseTax: 371_000 },
  { from: 7_600_000,  to: 10_300_000, rate: 0.155, baseTax: 651_000 },
  { from: 10_300_000, to: 13_800_000, rate: 0.165, baseTax: 1_069_500 },
  { from: 13_800_000, to: 18_100_000, rate: 0.175, baseTax: 1_647_000 },
  { from: 18_100_000, to: 23_300_000, rate: 0.185, baseTax: 2_399_500 },
  { from: 23_300_000, to: 29_800_000, rate: 0.195, baseTax: 3_361_500 },
  { from: 29_800_000, to: 40_300_000, rate: 0.200, baseTax: 4_629_000 },
  { from: 40_300_000, to: null,       rate: 0.210, baseTax: 6_729_000 },
];

/**
 * Calcule l'impôt cantonal de BASE pour un montant imposable donné.
 * @param taxableIncome  Revenu imposable en centimes (APRÈS splitting si applicable)
 * @returns Impôt cantonal de base en centimes
 */
export function computeICCBaseTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;

  for (const bracket of ICC_BRACKETS_2025) {
    const upper = bracket.to ?? Infinity;
    if (taxableIncome <= upper) {
      const excess = taxableIncome - bracket.from;
      return Math.round(bracket.baseTax + excess * bracket.rate);
    }
  }

  // Should never reach here — last bracket has to: null
  const last = ICC_BRACKETS_2025[ICC_BRACKETS_2025.length - 1];
  return Math.round(last.baseTax + (taxableIncome - last.from) * last.rate);
}

/**
 * Calcule l'impôt ICC complet (cantonal + communal) avec splitting.
 *
 * @param netIncome     Revenu net imposable ICC en centimes (avant splitting)
 * @param splitting     Mode de splitting : "none" | "full" | "partial"
 * @param communeRate   Taux communal (ex: 0.455 pour Genève-Ville)
 * @returns             Objet { baseTax, cantonalTax, communalTax, total } en centimes
 */
export function computeICCTotal(
  netIncome: number,
  splitting: "none" | "full" | "partial",
  communeRate: number
): {
  taxBase: number;
  baseTax: number;
  cantonalTax: number;
  communalTax: number;
  total: number;
} {
  if (netIncome <= 0) {
    return { taxBase: 0, baseTax: 0, cantonalTax: 0, communalTax: 0, total: 0 };
  }

  // Apply splitting to find the base income for bracket lookup
  let taxBase: number;
  let multiplier: number;

  switch (splitting) {
    case "full":
      // Married: tax on 50%, then × 2
      taxBase = Math.round(netIncome * 0.5);
      multiplier = 2;
      break;
    case "partial":
      // Monoparental: divide by 1.8 (= 55.555...%), apply bracket, then × 1.8
      taxBase = Math.round(netIncome / 1.8);
      multiplier = 1.8;
      break;
    default:
      // Single, divorced, widowed: no splitting
      taxBase = netIncome;
      multiplier = 1;
  }

  const baseTax = computeICCBaseTax(taxBase);
  const cantonalTax = Math.round(baseTax * multiplier);
  const communalTax = Math.round(cantonalTax * communeRate);

  return {
    taxBase,
    baseTax,
    cantonalTax,
    communalTax,
    total: cantonalTax + communalTax,
  };
}
