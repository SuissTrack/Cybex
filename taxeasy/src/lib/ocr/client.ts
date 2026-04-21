/**
 * OCR Client — selects provider based on environment,
 * routes document to the correct parser, falls back gracefully.
 */
import { OcrProvider, OcrRawResult, ParsedDocument } from "./types";
import { MockOcrProvider } from "./providers/mock";
import { parseSalaryCertificate } from "./parsers/salary-certificate";
import { parseLppAttestation } from "./parsers/lpp-attestation";
import { parsePillar3a } from "./parsers/pillar3a";
import { parseLamalPremium } from "./parsers/lamal-premium";
import { DocType } from "@/types/declaration";
import { GenericExtractedData } from "@/types/document";

function getProvider(): OcrProvider {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.GOOGLE_PROJECT_ID &&
    process.env.GOOGLE_PROCESSOR_ID
  ) {
    // Lazy load to avoid bundling Google SDK in dev
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GoogleDocumentAIProvider } = require("./providers/google-document-ai") as { GoogleDocumentAIProvider: new () => OcrProvider };
    return new GoogleDocumentAIProvider();
  }
  return new MockOcrProvider();
}

/**
 * Parses a raw OCR result into structured data based on document type.
 * Returns null if parsing fails (triggers manual review).
 */
function parseDocument(raw: OcrRawResult, docType: DocType): ParsedDocument | null {
  switch (docType) {
    case "SALARY_CERT":
      return parseSalaryCertificate(raw);
    case "LPP":
      return parseLppAttestation(raw);
    case "PILLAR3A":
      return parsePillar3a(raw);
    case "LAMAL":
      return parseLamalPremium(raw);
    // Parsers à implémenter :
    // case "PILLAR3B": return parsePillar3b(raw);
    // case "BANK_STATEMENT": return parseBankStatement(raw);
    default:
      return null;
  }
}

export interface OcrResult {
  extractedData: ParsedDocument["data"] | null;
  confidence: number;
  status: "done" | "manual_review";
  rawText: string;
}

/**
 * Process a document through OCR and return structured extracted data.
 */
export async function processDocument(
  fileBuffer: Buffer,
  mimeType: string,
  docType: DocType
): Promise<OcrResult> {
  const provider = getProvider();

  let raw: OcrRawResult;
  try {
    raw = await provider.extractRaw(fileBuffer, mimeType);
  } catch (err) {
    console.error("OCR provider error:", err);
    return {
      extractedData: null,
      confidence: 0,
      status: "manual_review",
      rawText: "",
    };
  }

  const parsed = parseDocument(raw, docType);

  if (!parsed || parsed.confidence < 0.5) {
    // Low confidence → always fall back to manual review
    const fallback: GenericExtractedData = {
      _type: "generic",
      rawText: raw.fullText,
      fields: raw.fields,
    };
    return {
      extractedData: fallback,
      confidence: raw.confidence,
      status: "manual_review",
      rawText: raw.fullText,
    };
  }

  return {
    extractedData: parsed.data,
    confidence: parsed.confidence,
    status: "done",
    rawText: raw.fullText,
  };
}
