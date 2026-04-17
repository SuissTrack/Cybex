import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import {
  getDeclarationById,
  updateDeclarationStatus,
  deleteDeclaration,
} from "@/lib/db/queries/declarations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    const declaration = await getDeclarationById(id, session.user.id);

    if (!declaration) {
      return NextResponse.json({ error: "Déclaration introuvable" }, { status: 404 });
    }

    return NextResponse.json({ declaration });
  } catch (err) {
    console.error("[declaration GET] Erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { status } = body as { status?: string };

  const validStatuses = ["IN_PROGRESS", "REVIEW_PENDING", "COMPLETED", "SUBMITTED"];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  if (status) {
    await updateDeclarationStatus(
      id,
      session.user.id,
      status as "IN_PROGRESS" | "REVIEW_PENDING" | "COMPLETED" | "SUBMITTED"
    );
  }

  const updated = await getDeclarationById(id, session.user.id);
  if (!updated) {
    return NextResponse.json({ error: "Déclaration introuvable" }, { status: 404 });
  }

  return NextResponse.json({ declaration: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  await deleteDeclaration(id, session.user.id);
  return NextResponse.json({ success: true });
}
