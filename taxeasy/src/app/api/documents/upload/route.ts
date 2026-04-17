import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { createDocument, updateDocumentOcr } from "@/lib/db/queries/documents";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { DocType } from "@/types/declaration";
import { processDocument } from "@/lib/ocr/client";
import { SalaryCertificateData } from "@/types/document";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

// Reduced from 20MB to 10MB — recommended maximum for tax documents
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Validate file magic bytes to prevent MIME spoofing.
 * The client-supplied `file.type` can be forged; we verify the actual bytes.
 */
function validateMagicBytes(buffer: Buffer, claimedMime: string): boolean {
  if (buffer.length < 4) return false;

  const b = buffer;

  switch (claimedMime) {
    case "application/pdf":
      // %PDF-
      return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;

    case "image/jpeg":
      // FF D8 FF
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

    case "image/png":
      // 89 50 4E 47
      return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;

    case "image/webp":
      // RIFF....WEBP
      return (
        buffer.length >= 12 &&
        b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
        b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
      );

    default:
      return false;
  }
}

/**
 * Converts OCR result from a salary certificate into DeclarationAnswers pre-fills.
 * Only returns fields with confidence-worthy values (> 0).
 */
function extractSalaryCertAnswers(
  data: SalaryCertificateData
): Record<string, number> {
  const answers: Record<string, number> = {};

  // Case A — Salaire brut total (allocations familiales incluses en 2025)
  if (data.grossSalary > 0) {
    answers["salary_amount"] = data.grossSalary;
  }

  // Cases 10.1 + 10.2 + 10.3 — Cotisations sociales groupées
  const socialTotal = data.avsContributions + data.acContributions + data.aanpContributions;
  if (socialTotal > 0) {
    answers["salary_deductions"] = socialTotal;
  }

  // Case 11 — LPP / 2ème pilier (cotisations obligatoires)
  if (data.lppContributions > 0) {
    answers["lpp_mandatory_amount"] = data.lppContributions;
  }

  return answers;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const docType = formData.get("type") as DocType | null;
  const declarationId = formData.get("declarationId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Type de fichier non supporté. Utilisez PDF, JPEG ou PNG." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (max 10 MB)" },
      { status: 400 }
    );
  }

  const validDocTypes: DocType[] = [
    "SALARY_CERT", "LPP", "PILLAR3A", "PILLAR3B", "BANK_STATEMENT",
    "LAMAL", "MEDICAL", "DONATION", "REAL_ESTATE", "OTHER",
  ];
  const type: DocType = validDocTypes.includes(docType as DocType)
    ? (docType as DocType)
    : "OTHER";

  // Read file bytes once — used for storage AND OCR
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Validate magic bytes to prevent MIME spoofing (client-supplied file.type is untrustworthy)
  if (!validateMagicBytes(buffer, file.type)) {
    return NextResponse.json(
      { error: "Le contenu du fichier ne correspond pas au type déclaré." },
      { status: 400 }
    );
  }

  // Generate a secure storage path — always use UUID + known extension, NEVER trust the original filename
  // This prevents path traversal attacks (e.g. filename = "../../etc/passwd")
  const fileId = crypto.randomUUID();
  const MIME_TO_EXT: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };
  const ext = MIME_TO_EXT[file.type] ?? ".bin";
  const safeFilename = `${fileId}${ext}`;
  const storagePath = `/uploads/${session.user.id}/${safeFilename}`;

  // Write to local filesystem in dev; swap for S3 in prod
  if (process.env.NODE_ENV !== "production") {
    const uploadDir = path.join(process.cwd(), "uploads", session.user.id);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, safeFilename), buffer);
  }

  // Create document record (status: PENDING initially)
  const document = await createDocument({
    userId: session.user.id,
    declarationId: declarationId ?? null,
    type,
    filename: file.name,
    storagePath,
  });

  // ── OCR synchrone ──────────────────────────────────────────────────────────
  // Traitement immédiat pour pré-remplir le wizard dès le retour de l'upload.
  // En production, on peut déplacer ça en arrière-plan si nécessaire.
  let extractedAnswers: Record<string, number> | null = null;
  let ocrConfidence = 0;
  let ocrStatus: "done" | "manual_review" = "manual_review";

  try {
    const ocrResult = await processDocument(buffer, file.type, type);
    ocrStatus = ocrResult.status;
    ocrConfidence = ocrResult.confidence;

    // Persister le résultat OCR dans le document
    await updateDocumentOcr(
      document.id,
      session.user.id,
      ocrResult.status === "done" ? "DONE" : "MANUAL_REVIEW",
      ocrResult.extractedData ?? null,
      ocrResult.confidence
    );

    // Extraire les réponses pré-remplissables selon le type de document
    if (ocrResult.status === "done" && ocrResult.extractedData) {
      if (type === "SALARY_CERT" && ocrResult.extractedData._type === "salary_cert") {
        extractedAnswers = extractSalaryCertAnswers(
          ocrResult.extractedData as SalaryCertificateData
        );
      }
      // Autres types : LPP, PILLAR3A, LAMAL — à implémenter ici
    }
  } catch (err) {
    // OCR non-bloquant : l'upload réussit même si l'OCR échoue
    console.error("[ocr] Erreur lors du traitement:", err);
  }

  return NextResponse.json(
    {
      document,
      // Réponses pré-remplissables transmises au wizard (null si OCR insuffisant)
      extractedAnswers,
      ocrConfidence,
      ocrStatus,
    },
    { status: 201 }
  );
}
