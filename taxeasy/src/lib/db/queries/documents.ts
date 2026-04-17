import { prisma } from "../client";
import { DocType, OcrStatus } from "@/types/declaration";

export async function getDocumentsByDeclaration(declarationId: string, userId: string) {
  return prisma.document.findMany({
    where: { declarationId, userId },
    orderBy: { uploadedAt: "desc" },
  });
}

export async function getDocumentById(id: string, userId: string) {
  return prisma.document.findFirst({
    where: { id, userId },
  });
}

export async function createDocument(data: {
  userId: string;
  declarationId: string | null;
  type: DocType;
  filename: string;
  storagePath: string;
}) {
  return prisma.document.create({
    data: {
      ...data,
      ocrStatus: "PENDING",
    },
  });
}

export async function updateDocumentOcr(
  id: string,
  userId: string,
  ocrStatus: OcrStatus,
  extractedData: object | null,
  confidence: number | null
) {
  return prisma.document.updateMany({
    where: { id, userId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { ocrStatus, extractedData: extractedData as any, confidence },
  });
}

export async function deleteDocument(id: string, userId: string) {
  return prisma.document.deleteMany({
    where: { id, userId },
  });
}
