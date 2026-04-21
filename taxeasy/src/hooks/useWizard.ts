"use client";

import { useCallback } from "react";
import { useWizardStore } from "@/stores/wizard.store";
import { engine } from "@/lib/decision-tree/engine";
import { AnswerValue } from "@/types/wizard";

export function useWizard() {
  const store = useWizardStore();

  /**
   * Submit an answer for the current node and advance to the next.
   * Auto-saves to the API after each step.
   */
  const submitAnswer = useCallback(
    async (value: AnswerValue) => {
      const { currentNodeId, answers, declarationId } = store;

      // Validate
      const error = engine.validateAnswer(currentNodeId, value);
      if (error) {
        store.setError(error);
        return false;
      }

      // Update local state
      store.setAnswer(currentNodeId, value);
      store.setError(null);

      const updatedAnswers = { ...answers, [currentNodeId]: value };

      // Determine next node
      let nextNodeId: string;
      try {
        const result = engine.getNextNode(currentNodeId, updatedAnswers);
        nextNodeId = result.nextNodeId;
      } catch {
        store.setError("Erreur de navigation. Veuillez réessayer.");
        return false;
      }

      // Auto-save to API (non-blocking UI)
      store.setSaving(true);
      try {
        await fetch(`/api/declarations/${declarationId}/answers`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: updatedAnswers, currentNodeId: nextNodeId }),
        });
      } catch {
        // Don't block progression on save failure — show warning toast instead
        console.warn("Auto-save failed, will retry on next step");
      } finally {
        store.setSaving(false);
      }

      store.goToNode(nextNodeId);
      return true;
    },
    [store]
  );

  const goBack = useCallback(() => {
    store.goBack();
  }, [store]);

  const currentNode = engine.getNode(store.currentNodeId);
  const isTerminal = engine.isTerminal(store.currentNodeId);
  const currentAnswer = store.answers[store.currentNodeId];
  const canGoBack = store.history.length > 0;

  return {
    currentNode,
    currentAnswer,
    answers: store.answers,
    isTerminal,
    canGoBack,
    isSaving: store.isSaving,
    isLoading: store.isLoading,
    error: store.error,
    submitAnswer,
    goBack,
    history: store.history,
  };
}
