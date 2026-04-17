import { prisma } from "../client";
import { DeclarationAnswers } from "@/types/declaration";

export async function getDeclarationsByUser(userId: string) {
  return prisma.declaration.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      documents: { select: { id: true, type: true, ocrStatus: true } },
      exports: { select: { id: true, format: true, createdAt: true } },
    },
  });
}

export async function getDeclarationById(id: string, userId: string) {
  return prisma.declaration.findFirst({
    where: { id, userId },
    include: {
      documents: true,
      exports: true,
    },
  });
}

export async function createDeclaration(userId: string, taxYear: number = 2025) {
  return prisma.declaration.create({
    data: {
      userId,
      taxYear,
      status: "IN_PROGRESS",
      currentNodeId: "residency_type",
      answers: {},
    },
  });
}

export async function updateDeclarationAnswers(
  id: string,
  userId: string,
  answers: DeclarationAnswers,
  currentNodeId: string
) {
  return prisma.declaration.updateMany({
    where: { id, userId },
    data: {
      answers: answers as object,
      currentNodeId,
      updatedAt: new Date(),
    },
  });
}

export async function updateDeclarationStatus(
  id: string,
  userId: string,
  status: "IN_PROGRESS" | "REVIEW_PENDING" | "COMPLETED" | "SUBMITTED"
) {
  return prisma.declaration.updateMany({
    where: { id, userId },
    data: { status },
  });
}

export async function saveComputedTax(
  id: string,
  userId: string,
  computedTax: object
) {
  return prisma.declaration.updateMany({
    where: { id, userId },
    data: { computedTax },
  });
}

export async function deleteDeclaration(id: string, userId: string) {
  return prisma.declaration.deleteMany({
    where: { id, userId },
  });
}
