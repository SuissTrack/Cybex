import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { updateDeclarationAnswers, saveComputedTax } from "@/lib/db/queries/declarations";
import { engine } from "@/lib/decision-tree/engine";
import { DeclarationAnswers } from "@/types/declaration";
import { computeICC } from "@/lib/tax-calculator/icc.calculator";
import { computeIFDResult } from "@/lib/tax-calculator/ifd.calculator";
import { computeFortuneTotal, computeFortuneFranchise } from "@/lib/tax-calculator/rates/fortune-2025";
import { getCommuneRate } from "@/lib/tax-calculator/rates/communes-2025";
import { prisma } from "@/lib/db/client";
import { buildTaxInputFromAnswers } from "@/lib/tax-calculator/input-builder";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { answers, currentNodeId } = body as {
    answers: DeclarationAnswers;
    currentNodeId: string;
  };

  // Validate the node exists
  try {
    engine.getNode(currentNodeId);
  } catch {
    return NextResponse.json({ error: "Node invalide: " + currentNodeId }, { status: 400 });
  }

  // Persist answers (auto-save)
  await updateDeclarationAnswers(id, session.user.id, answers, currentNodeId);

  // If we've reached the summary node, compute and save the tax
  if (currentNodeId === "summary" || engine.isTerminal(currentNodeId)) {
    try {
      const user = await prisma.user.findUnique({ where: { id: session.user.id } });
      const commune = user?.commune ?? "Genève-Ville";
      const taxInput = buildTaxInputFromAnswers(answers, commune);

      const icc = computeICC(taxInput);
      const ifd = computeIFDResult(taxInput);

      const franchise = computeFortuneFranchise(
        taxInput.familyStatus,
        taxInput.childrenCount
      );
      const fortuneResult = computeFortuneTotal(
        taxInput.bankAssets + taxInput.securitiesAssets + taxInput.realEstateValue + taxInput.vehiclesValue + taxInput.otherAssets,
        taxInput.debts,
        franchise,
        getCommuneRate(commune)
      );

      const computedTax = {
        icc,
        ifd,
        fortune: fortuneResult,
        total: icc.total + ifd.tax + fortuneResult.total,
        commune,
        taxYear: 2025,
        computedAt: new Date().toISOString(),
      };

      await saveComputedTax(id, session.user.id, computedTax);
      return NextResponse.json({ saved: true, computedTax });
    } catch (err) {
      console.error("Tax computation error:", err);
      // Don't fail the save — tax computation is best-effort
    }
  }

  return NextResponse.json({ saved: true });
}
