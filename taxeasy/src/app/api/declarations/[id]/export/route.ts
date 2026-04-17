import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getDeclarationById } from "@/lib/db/queries/declarations";
import { prisma } from "@/lib/db/client";
import { generateFullSummaryPDF } from "@/lib/pdf/generator";
import { buildGeTaxXml, buildGeTaxSchema } from "@/lib/pdf/getax-export/xml-builder";
import { DeclarationAnswers, ComputedTax, Plan } from "@/types/declaration";

/**
 * POST /api/declarations/[id]/export?format=PDF|GETAX_XML
 *
 * Génère le fichier demandé, l'enregistre en base (Export record),
 * et le streame en réponse.
 *
 * - PDF : accessible à tous les plans
 * - GETAX_XML : réservé BASIC et PREMIUM
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const format = req.nextUrl.searchParams.get("format");
  if (format !== "PDF" && format !== "GETAX_XML") {
    return NextResponse.json(
      { error: "Format invalide. Utilisez PDF ou GETAX_XML." },
      { status: 400 }
    );
  }

  // Load declaration and check ownership
  const declaration = await getDeclarationById(id, session.user.id);
  if (!declaration) {
    return NextResponse.json({ error: "Déclaration introuvable" }, { status: 404 });
  }

  if (
    declaration.status !== "COMPLETED" &&
    declaration.status !== "SUBMITTED" &&
    declaration.status !== "REVIEW_PENDING"
  ) {
    return NextResponse.json(
      { error: "La déclaration doit être complétée avant l'export" },
      { status: 422 }
    );
  }

  // Load user once — needed for plan check and export metadata
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true, name: true, email: true, avsNumber: true, address: true, postalCode: true },
  });

  // Check plan for GeTax XML
  if (format === "GETAX_XML") {
    const plan = (user?.plan ?? "FREE") as Plan;
    if (plan === "FREE") {
      return NextResponse.json(
        { error: "L'export GeTax .tax est réservé aux plans Basic et Premium." },
        { status: 403 }
      );
    }
  }

  const answers = declaration.answers as DeclarationAnswers;
  const computedTax = declaration.computedTax as ComputedTax | null;

  if (!computedTax) {
    return NextResponse.json(
      { error: "Aucun calcul fiscal disponible. Terminez le wizard." },
      { status: 422 }
    );
  }

  const userName = user?.name ?? user?.email ?? "Contribuable";
  const commune = computedTax.commune ?? "Genève";
  const taxYear = computedTax.taxYear ?? declaration.taxYear;

  try {
    let fileBytes: Uint8Array;
    let filename: string;
    let contentType: string;
    let storagePath: string;

    if (format === "PDF") {
      fileBytes = await generateFullSummaryPDF({
        answers,
        computedTax,
        userName,
        userEmail: user?.email ?? "",
        commune,
        taxYear,
      });
      filename = `taxeasy-${taxYear}-${id.slice(0, 8)}.pdf`;
      contentType = "application/pdf";
      storagePath = `/exports/${id}/${filename}`;
    } else {
      // GETAX_XML — génère le fichier .tax (XML dans une structure ZIP simulée)
      const schema = buildGeTaxSchema(
        answers,
        computedTax,
        {
          name: user?.name ?? null,
          email: user?.email ?? "",
          avsNumber: user?.avsNumber ?? null,
          address: user?.address ?? null,
          postalCode: user?.postalCode ?? null,
        },
        commune,
        taxYear
      );

      const xmlContent = buildGeTaxXml(schema, id);

      // Le format .tax réel est un ZIP contenant declaration.xml + meta.json
      // En dev/sans librairie ZIP, on envoie le XML directement avec extension .tax
      // En production, utiliser JSZip ou adm-zip pour créer le vrai fichier ZIP
      const metaJson = JSON.stringify(
        {
          version: "1.03",
          software: "TaxEasy",
          generatedAt: new Date().toISOString(),
          declarationId: id,
          taxYear,
        },
        null,
        2
      );

      // Combine as a simple text bundle (real ZIP would use JSZip)
      const combinedContent = `${xmlContent}\n\n<!-- META:\n${metaJson}\n-->`;
      fileBytes = new TextEncoder().encode(combinedContent);
      filename = `taxeasy-${taxYear}-${id.slice(0, 8)}.tax`;
      contentType = "application/octet-stream";
      storagePath = `/exports/${id}/${filename}`;
    }

    // Persist export record
    await prisma.export.create({
      data: {
        declarationId: id,
        format,
        filePath: storagePath,
      },
    });

    return new NextResponse(Buffer.from(fileBytes), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(fileBytes.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[export] Erreur génération:", err);
    return NextResponse.json(
      { error: "Erreur lors de la génération du fichier" },
      { status: 500 }
    );
  }
}
