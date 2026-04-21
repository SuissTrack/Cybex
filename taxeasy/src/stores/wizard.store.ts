import { create } from "zustand";
import { WizardState, AnswerValue } from "@/types/wizard";
import { engine } from "@/lib/decision-tree/engine";

interface WizardActions {
  setDeclaration: (declarationId: string, answers: Record<string, AnswerValue>, currentNodeId: string) => void;
  setAnswer: (nodeId: string, value: AnswerValue) => void;
  goToNode: (nodeId: string) => void;
  goBack: () => void;
  setLoading: (isLoading: boolean) => void;
  setSaving: (isSaving: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const INITIAL_STATE: WizardState = {
  declarationId: "",
  currentNodeId: "residency_type",
  answers: {},
  history: [],
  completedSections: [],
  isLoading: false,
  isSaving: false,
  error: null,
};

export const useWizardStore = create<WizardState & WizardActions>()((set, get) => ({
  ...INITIAL_STATE,

  setDeclaration(declarationId, answers, currentNodeId) {
    const path = engine.buildPath(answers);
    const currentIdx = path.indexOf(currentNodeId);
    const history = currentIdx > 0 ? path.slice(0, currentIdx) : [];
    set({ declarationId, answers, currentNodeId, history });
  },

  setAnswer(nodeId, value) {
    set((state) => ({
      answers: { ...state.answers, [nodeId]: value },
    }));
  },

  goToNode(nodeId) {
    set((state) => ({
      history: [...state.history, state.currentNodeId],
      currentNodeId: nodeId,
    }));
  },

  goBack() {
    const { history } = get();
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    set((state) => ({
      history: state.history.slice(0, -1),
      currentNodeId: prev,
    }));
  },

  setLoading: (isLoading) => set({ isLoading }),
  setSaving: (isSaving) => set({ isSaving }),
  setError: (error) => set({ error }),
  reset: () => set(INITIAL_STATE),
}));
