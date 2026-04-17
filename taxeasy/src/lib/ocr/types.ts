import { ExtractedData } from "@/types/document";

export interface OcrProvider {
  /**
   * Extracts raw text and key-value pairs from a document.
   * @param fileBuffer  Raw file bytes
   * @param mimeType    MIME type of the document
   * @returns           Raw OCR result
   */
  extractRaw(fileBuffer: Buffer, mimeType: string): Promise<OcrRawResult>;
}

export interface OcrRawResult {
  fullText: string;
  fields: Record<string, string>;
  confidence: number; // 0–1
  provider: "google-document-ai" | "mock";
}

export interface ParsedDocument {
  data: ExtractedData;
  confidence: number;
}

export type DocumentParser = (raw: OcrRawResult) => ParsedDocument | null;

export interface OcrServiceConfig {
  provider: "google-document-ai" | "mock";
}
