"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/hooks/useWizard";
import { useWizardStore } from "@/stores/wizard.store";
import { StepRenderer } from "./StepRenderer";
import { WizardNavigation } from "./WizardNavigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AnswerValue, WIZARD_SECTION_LABELS } from "@/types/wizard";

interface Props {
  declarationId: string;
  initialAnswers: Record<string, AnswerValue>;
  initialNodeId: string;
}

export function WizardShell({ declarationId, initialAnswers, initialNodeId }: Props) {
  const store = useWizardStore();
  const router = useRouter();
  const { currentNode, currentAnswer, isTerminal, canGoBack, isSaving, error, submitAnswer, goBack } =
    useWizard();

  const [localValue, setLocalValue] = useState<AnswerValue>(currentAnswer ?? "");

  // Initialize store from server data — intentionally only on declarationId change
  // (initialAnswers/initialNodeId are stable server props, re-running would reset user input)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    store.setDeclaration(declarationId, initialAnswers, initialNodeId);
  }, [declarationId]);

  // Reset local value when node changes
  useEffect(() => {
    setLocalValue(currentAnswer ?? "");
  }, [currentNode.id, currentAnswer]);

  async function handleNext() {
    // Terminal node (summary): redirect to review page
    if (isTerminal) {
      router.push(`/declaration/${declarationId}/review`);
      return;
    }
    // Info nodes: advance without a meaningful answer
    if (currentNode.type === "info") {
      await submitAnswer("__info_acknowledged__");
      return;
    }
    await submitAnswer(localValue);
  }

  const sectionLabel = WIZARD_SECTION_LABELS[currentNode.section];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <Badge variant="secondary" className="text-xs uppercase tracking-wide">
          {sectionLabel}
        </Badge>
        {isSaving && (
          <span className="text-xs text-gray-400">
            <span className="animate-pulse">●</span> Sauvegarde automatique
          </span>
        )}
      </div>

      {/* Question */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{currentNode.question}</h2>
        {currentNode.hint && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
            <p className="text-sm text-amber-800 whitespace-pre-line leading-relaxed">
              {currentNode.hint}
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step content */}
      <StepRenderer
        node={currentNode}
        value={localValue}
        declarationId={declarationId}
        onChange={setLocalValue}
        onDocumentUploaded={(extractedAnswers) => {
          // Marquer le nœud comme "traité" — l'utilisateur peut continuer
          setLocalValue("__uploaded__");
          // Pré-remplir les réponses extraites par OCR dans le store
          if (extractedAnswers) {
            Object.entries(extractedAnswers).forEach(([key, value]) => {
              store.setAnswer(key, value);
            });
          }
        }}
      />

      {/* Navigation */}
      <WizardNavigation
        currentNode={currentNode}
        canGoBack={canGoBack}
        isSaving={isSaving}
        isTerminal={isTerminal}
        onBack={goBack}
        onNext={handleNext}
      />
    </div>
  );
}
