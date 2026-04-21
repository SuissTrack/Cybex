/**
 * CHF currency formatting utilities.
 * Swiss convention: apostrophe as thousands separator (CHF 1'234'567.00)
 * DB stores amounts as integers in centimes: CHF 1'234.55 = 123455
 */

/**
 * Format centimes to CHF display string.
 * @param centimes  Integer amount in centimes
 * @param options   Formatting options
 */
export function formatCHF(
  centimes: number,
  options: { showDecimals?: boolean; showSymbol?: boolean } = {}
): string {
  const { showDecimals = true, showSymbol = true } = options;
  const amount = centimes / 100;

  const formatted = new Intl.NumberFormat("fr-CH", {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  })
    .format(Math.abs(amount))
    .replace(/\u202f/g, "'") // Replace narrow no-break space with apostrophe
    .replace(/\s/g, "'");    // Fallback for other space characters

  const prefix = centimes < 0 ? "-" : "";
  return showSymbol ? `${prefix}CHF\u00a0${formatted}` : `${prefix}${formatted}`;
}

/**
 * Parse a CHF string to centimes.
 * Handles: "1'234.55", "1234.55", "CHF 1'234.55", "1 234,55"
 */
export function parseCHFToCentimes(input: string): number {
  const cleaned = input
    .replace(/CHF/gi, "")
    .replace(/['\s\u202f\u00a0]/g, "") // Remove apostrophes, spaces, NBSP
    .replace(",", ".") // EU decimal separator
    .trim();

  const value = parseFloat(cleaned);
  if (isNaN(value)) return 0;
  return Math.round(value * 100);
}

/**
 * Convert a numeric CHF amount (float) entered in a form to centimes.
 */
export function chfInputToCentimes(chfAmount: number): number {
  return Math.round(chfAmount * 100);
}

/**
 * Convert centimes to CHF float (for calculations).
 */
export function centimesToCHF(centimes: number): number {
  return centimes / 100;
}
