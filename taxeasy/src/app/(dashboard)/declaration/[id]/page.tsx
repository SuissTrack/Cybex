import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { getDeclarationById } from "@/lib/db/queries/declarations";
import { WizardShell } from "@/components/wizard/WizardShell";
import { AnswerValue } from "@/types/wizard";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DeclarationWizardPage({ params }: Props) {
  const session = await requireAuth();
  const { id } = await params;

  const declaration = await getDeclarationById(id, session.user.id);
  if (!declaration) notFound();

  const answers = (declaration.answers ?? {}) as Record<string, AnswerValue>;
  const currentNodeId = declaration.currentNodeId ?? "residency_type";

  return (
    <main className="min-h-screen bg-gray-50">
      <WizardShell
        declarationId={declaration.id}
        initialAnswers={answers}
        initialNodeId={currentNodeId}
      />
    </main>
  );
}
