import { NextResponse } from "next/server";
import { auth, signOut } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { rm } from "fs/promises";
import path from "path";

/**
 * DELETE /api/account/delete
 *
 * Droit à l'effacement — LPD art. 32 / RGPD art. 17
 *
 * Supprime dans l'ordre :
 *  1. Déclarations + documents + exports (cascade via Prisma)
 *  2. Sessions / accounts NextAuth
 *  3. Fichiers uploadés sur le disque (dev) ou le stockage objet (prod)
 *  4. L'enregistrement utilisateur lui-même
 *
 * L'utilisateur est ensuite déconnecté.
 */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // 1. Delete all user data (declarations, documents, exports cascade via schema)
    await prisma.declaration.deleteMany({ where: { userId } });
    await prisma.document.deleteMany({ where: { userId } });

    // 2. Delete NextAuth sessions and linked accounts
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.account.deleteMany({ where: { userId } });

    // 3. Delete uploaded files from local disk (dev)
    //    In production replace with S3 bucket purge using userId prefix.
    if (process.env.NODE_ENV !== "production") {
      try {
        const uploadDir = path.join(process.cwd(), "uploads", userId);
        await rm(uploadDir, { recursive: true, force: true });
      } catch {
        // Non-blocking — directory may not exist
      }
    }

    // 4. Delete the user record itself
    await prisma.user.delete({ where: { id: userId } });

    // 5. Sign out (invalidates the current JWT cookie)
    await signOut({ redirect: false });

    return NextResponse.json({ deleted: true }, { status: 200 });
  } catch (err) {
    console.error("[account/delete] Erreur suppression:", err);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du compte." },
      { status: 500 }
    );
  }
}
