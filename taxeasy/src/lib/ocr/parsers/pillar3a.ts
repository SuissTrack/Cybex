/**
 * Parser : Attestation 3ème pilier A
 * Gère les versements annuels et les rachats rétroactifs (nouveauté 2025).
 */
import { OcrRawResult, ParsedDocument } from "../types";
import { Pillar3aData } from "@/types/document";

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

/** Extrait les années de rachat rétroactif mentionnées dans le document */
function extractRetroactiveYears(text: string): number[] {
  const years: number[] = [];

  // Cherche des mentions comme "rachat 2018, 2019, 2020" ou "années 2016-2020"
  const rangeMatch = text.match(/ann[eé]es?\s+(20\d\d)\s*[-–]\s*(20\d\d)/i);
  if (rangeMatch) {
    const from = parseInt(rangeMatch[1]);
    const to = parseInt(rangeMatch[2]);
    for (let y = from; y <= to && y < 2025; y++) years.push(y);
    return years;
  }

  // Années individuelles mentionnées
  const individualYears = text.matchAll(/\b(20(?:1[5-9]|2[0-4]))\b/g);
  const seen = new Set<number>();
  for (const m of individualYears) {
    const y = parseInt(m[1]);
    if (y < 2025 && !seen.has(y)) {
      seen.add(y);
      years.push(y);
    }
  }

  return years.sort();
}

export function parsePillar3a(raw: OcrRawResult): ParsedDocument | null {
  const text = raw.fullText;
  const fields = raw.fields;

  const contributions =
    chfToCentimes(fields["contributions"] ?? fields["versements"] ?? "") ||
    extractAmount(text, [
      /versements? 3[eè]me pilier[:\s]+CHF\s*([\d']+\.?\d*)/i,
      /contributions? pilier 3a[:\s]+CHF\s*([\d']+\.?\d*)/i,
      /3a[:\s]+CHF\s*([\d']+\.?\d*)/i,
      /montant vers[eé][:\s]+CHF\s*([\d']+\.?\d*)/i,
      /säule 3a[:\s]+CHF\s*([\d']+\.?\d*)/i,
    ]);

  if (contributions === 0) return null;

  const provider =
    fields["provider"] ||
    fields["prestataire"] ||
    (text.match(/banque[:\s]+([^\n]+)/i)?.[1] ?? "").trim() ||
    (text.match(/assurance[:\s]+([^\n]+)/i)?.[1] ?? "").trim() ||
    "Inconnu";

  const yearMatch = text.match(/ann[ée]e\s+(\d{4})|exercice\s+(\d{4})|\b(202[0-9])\b/i);
  const year = yearMatch
    ? parseInt(yearMatch[1] ?? yearMatch[2] ?? yearMatch[3])
    : 2025;

  // Détecter un rachat rétroactif (nouveauté GE 2025)
  const isRetroactive =
    /rachat r[eé]troactif|ann[ée]es non cotis[ée]s|nachkauf|lacunes/i.test(text);

  const retroactiveYears = isRetroactive ? extractRetroactiveYears(text) : undefined;

  const data: Pillar3aData = {
    _type: "pillar3a",
    contributions,
    provider: provider.slice(0, 100),
    year,
    isRetroactive,
    retroactiveYears,
  };

  return { data, confidence: raw.confidence };
}
