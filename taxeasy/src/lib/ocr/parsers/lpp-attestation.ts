/**
 * Parser : Attestation LPP / 2ème pilier
 * Extrait les cotisations obligatoires et les rachats volontaires.
 */
import { OcrRawResult, ParsedDocument } from "../types";
import { LppAttestationData } from "@/types/document";

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

export function parseLppAttestation(raw: OcrRawResult): ParsedDocument | null {
  const text = raw.fullText;
  const fields = raw.fields;

  const mandatoryContributions =
    chfToCentimes(fields["mandatory_contributions"] ?? fields["cotisations_obligatoires"] ?? "") ||
    extractAmount(text, [
      /cotisations obligatoires[:\s]+CHF\s*([\d']+\.?\d*)/i,
      /beiträge pflicht[:\s]+CHF\s*([\d']+\.?\d*)/i,
      /contributions obligatoires[:\s]+CHF\s*([\d']+\.?\d*)/i,
      /part salarié[:\s]+CHF\s*([\d']+\.?\d*)/i,
    ]);

  // Un montant de cotisations obligatoires est requis pour confirmer qu'il s'agit bien d'une attestation LPP
  if (mandatoryContributions === 0) return null;

  const voluntaryPurchase =
    chfToCentimes(fields["voluntary_purchase"] ?? fields["rachat_volontaire"] ?? "") ||
    extractAmount(text, [
      /rachat\s+volontaire[:\s]+CHF\s*([\d']+\.?\d*)/i,
      /einkauf[:\s]+CHF\s*([\d']+\.?\d*)/i,
      /rachats? lpp[:\s]+CHF\s*([\d']+\.?\d*)/i,
    ]);

  const pensionFund =
    fields["pension_fund"] ||
    fields["caisse_pension"] ||
    (text.match(/caisse de pension[:\s]+([^\n]+)/i)?.[1] ?? "").trim() ||
    (text.match(/fondation de prévoyance[:\s]+([^\n]+)/i)?.[1] ?? "").trim() ||
    "Inconnue";

  const yearMatch = text.match(/\b(202[0-9])\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : 2025;

  const data: LppAttestationData = {
    _type: "lpp",
    mandatoryContributions,
    voluntaryPurchase,
    pensionFund: pensionFund.slice(0, 100),
    year,
  };

  return { data, confidence: raw.confidence };
}
