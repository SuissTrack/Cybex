"use client";

import { Button } from "@/components/ui/button";
import { WizardNode } from "@/types/wizard";

interface Props {
  currentNode: WizardNode;
  canGoBack: boolean;
  isSaving: boolean;
  isTerminal: boolean;
  onBack: () => void;
  onNext: () => void;
}

export function WizardNavigation({
  currentNode,
  canGoBack,
  isSaving,
  isTerminal,
  onBack,
  onNext,
}: Props) {
  const isInfoNode = currentNode.type === "info";

  return (
    <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-100">
      <Button
        variant="ghost"
        onClick={onBack}
        disabled={!canGoBack}
        className="text-gray-600"
      >
        ← Retour
      </Button>

      <div className="flex items-center gap-3">
        {isSaving && (
          <span className="text-xs text-gray-400 animate-pulse">Sauvegarde…</span>
        )}
        <Button
          onClick={onNext}
          disabled={isSaving}
          className="min-w-32"
        >
          {isTerminal
            ? "Terminer"
            : isInfoNode
            ? "Continuer →"
            : "Suivant →"}
        </Button>
      </div>
    </div>
  );
}
