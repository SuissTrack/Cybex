/**
 * Parser : Attestation prime LAMal (assurance maladie de base)
 * Extrait la prime annuelle et le subside éventuel.
 */
import { OcrRawResult, ParsedDocument } from "../types";
import { LamalData } from "@/types/document";

function chfToCentimes(str: string): number {
  const cleaned = str.replace(/['\s]/g, "").replace(",", ".");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : Math.round(val * 100);
}

function extractAmount(text: string, patterns: RegExp[]): number {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return chfToCentimes(m[1]);
  }
  return 0;
}

export function parseLamalPremium(raw: OcrRawResult): ParsedDocument | null {
  const text = raw.fullText;
  const fields = raw.fields;

  // Prime annuelle — cherche d'abord la somme totale annuelle
  const annualPremium =
    chfToCentimes(fields["annual_premium"] ?? fields["prime_annuelle"] ?? "") ||
    extractAmount(text, [
      /prime\s+annuelle[:\s]+CHF\s*([\d']+\.?\d*)/i,
      /total\s+annuel[:\s]+CHF\s*([\d']+\.?\d*)/i,
      /jahresprämie[:\s]+CHF\s*([\d']+\.?\d*)/i,
      // Si seulement la prime mensuelle est disponible, multiplier par 12
    ]) ||
    (() => {
      const monthly = extractAmount(text, [
        /prime\s+mensuelle[:\s]+CHF\s*([\d']+\.?\d*)/i,
        /monatsprämie[:\s]+CHF\s*([\d']+\.?\d*)/i,
      ]);
      return monthly > 0 ? monthly * 12 : 0;
    })();

  if (annualPremium === 0) return null;

  // Subside LAMal (aide cantonale genevoise)
  const subsidy =
    chfToCentimes(fields["subsidy"] ?? fields["subside"] ?? "") ||
    extractAmount(text, [
      /subside[:\s]+CHF\s*([\d']+\.?\d*)/i,
      /aide\s+financière[:\s]+CHF\s*([\d']+\.?\d*)/i,
      /subvention[:\s]+CHF\s*([\d']+\.?\d*)/i,
      /beitrag[:\s]+CHF\s*([\d']+\.?\d*)/i,
    ]);

  const insurer =
    fields["insurer"] ||
    fields["assureur"] ||
    (text.match(/assurance[:\s]+([^\n,]+)/i)?.[1] ?? "").trim() ||
    (text.match(/caisse[:\s]+([^\n,]+)/i)?.[1] ?? "").trim() ||
    (text.match(/krankenkasse[:\s]+([^\n,]+)/i)?.[1] ?? "").trim() ||
    "Inconnue";

  const yearMatch = text.match(/\b(202[0-9])\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : 2025;

  const data: LamalData = {
    _type: "lamal",
    annualPremium,
    subsidy,
    insurer: insurer.slice(0, 100),
    year,
  };

  return { data, confidence: raw.confidence };
}
