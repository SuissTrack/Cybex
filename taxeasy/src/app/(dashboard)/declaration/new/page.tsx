import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { createDeclaration } from "@/lib/db/queries/declarations";

/**
 * Server action: create a new declaration and redirect to the wizard.
 */
export default async function NewDeclarationPage() {
  const session = await requireAuth();

  const declaration = await createDeclaration(session.user.id, 2025);
  redirect(`/declaration/${declaration.id}`);
}
