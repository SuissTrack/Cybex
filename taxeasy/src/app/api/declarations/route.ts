import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { createDeclaration, getDeclarationsByUser } from "@/lib/db/queries/declarations";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const declarations = await getDeclarationsByUser(session.user.id);
    return NextResponse.json({ declarations });
  } catch (err) {
    console.error("[declarations GET] Erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const taxYear: number = body.taxYear ?? 2025;

    if (taxYear < 2020 || taxYear > 2030) {
      return NextResponse.json({ error: "Année fiscale invalide" }, { status: 400 });
    }

    const declaration = await createDeclaration(session.user.id, taxYear);
    return NextResponse.json({ declaration }, { status: 201 });
  } catch (err) {
    console.error("[declarations POST] Erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
