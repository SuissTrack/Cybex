/**
 * Google Document AI OCR provider.
 * Requires GOOGLE_PROJECT_ID, GOOGLE_PROCESSOR_ID, GOOGLE_APPLICATION_CREDENTIALS.
 */
import { OcrProvider, OcrRawResult } from "../types";

export class GoogleDocumentAIProvider implements OcrProvider {
  private readonly projectId: string;
  private readonly processorId: string;
  private readonly location: string;

  constructor() {
    this.projectId = process.env.GOOGLE_PROJECT_ID ?? "";
    this.processorId = process.env.GOOGLE_PROCESSOR_ID ?? "";
    this.location = "eu"; // Europe for GDPR compliance
  }

  async extractRaw(fileBuffer: Buffer, mimeType: string): Promise<OcrRawResult> {
    if (!this.projectId || !this.processorId) {
      throw new Error(
        "Google Document AI not configured. Set GOOGLE_PROJECT_ID and GOOGLE_PROCESSOR_ID."
      );
    }

    // Lazy-load the Google client (optional prod dependency, not installed in dev)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore – @google-cloud/documentai is an optional production dependency
    const { DocumentProcessorServiceClient } = await import("@google-cloud/documentai");

    const client = new DocumentProcessorServiceClient();
    const name = `projects/${this.projectId}/locations/${this.location}/processors/${this.processorId}`;

    const [result] = await client.processDocument({
      name,
      rawDocument: {
        content: fileBuffer.toString("base64"),
        mimeType,
      },
    });

    const document = result.document;
    if (!document) throw new Error("Google Document AI returned no document");

    const fullText = document.text ?? "";
    const fields: Record<string, string> = {};
    let totalConfidence = 0;
    let fieldCount = 0;

    // Extract form fields
    for (const page of document.pages ?? []) {
      for (const field of page.formFields ?? []) {
        const key = extractText(field.fieldName, fullText);
        const value = extractText(field.fieldValue, fullText);
        const conf = field.fieldValue?.confidence ?? 0;

        if (key && value) {
          fields[normalizeKey(key)] = value;
          totalConfidence += conf;
          fieldCount++;
        }
      }
    }

    return {
      fullText,
      fields,
      confidence: fieldCount > 0 ? totalConfidence / fieldCount : 0,
      provider: "google-document-ai",
    };
  }
}

function extractText(
  element: { textAnchor?: { textSegments?: Array<{ startIndex?: string | number; endIndex?: string | number }> } } | null | undefined,
  fullText: string
): string {
  if (!element?.textAnchor?.textSegments) return "";
  return element.textAnchor.textSegments
    .map((seg) => {
      const start = Number(seg.startIndex ?? 0);
      const end = Number(seg.endIndex ?? 0);
      return fullText.slice(start, end);
    })
    .join("")
    .trim();
}

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}
