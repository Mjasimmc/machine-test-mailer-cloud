import { useState, useCallback } from 'react';
import { FormSection, LayoutDirection } from '@saas/shared';

export interface FormSnapshot {
  formLayout: LayoutDirection;
  sections: FormSection[];
  title: string;
}

interface HistoryState {
  past: FormSnapshot[];
  present: FormSnapshot;
  future: FormSnapshot[];
}

export function useFormBuilderHistory(initialState: FormSnapshot) {
  const [state, setState] = useState<HistoryState>({
    past: [],
    present: initialState,
    future: [],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const pushState = useCallback((nextState: FormSnapshot) => {
    setState((prev) => {
      // Avoid pushing identical state
      if (
        prev.present.formLayout === nextState.formLayout &&
        prev.present.title === nextState.title &&
        (prev.present.sections === nextState.sections ||
          JSON.stringify(prev.present.sections) === JSON.stringify(nextState.sections))
      ) {
        return prev;
      }

      const newPast = [...prev.past, prev.present];
      if (newPast.length > 50) {
        newPast.shift();
      }

      return {
        past: newPast,
        present: nextState,
        future: [],
      };
    });
  }, []);

  const undo = useCallback((): FormSnapshot | null => {
    let restored: FormSnapshot | null = null;
    setState((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, prev.past.length - 1);
      restored = previous;

      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
    return restored;
  }, []);

  const redo = useCallback((): FormSnapshot | null => {
    let next: FormSnapshot | null = null;
    setState((prev) => {
      if (prev.future.length === 0) return prev;
      const nextPresent = prev.future[0];
      const newFuture = prev.future.slice(1);
      next = nextPresent;

      return {
        past: [...prev.past, prev.present],
        present: nextPresent,
        future: newFuture,
      };
    });
    return next;
  }, []);

  const resetHistory = useCallback((newState: FormSnapshot) => {
    setState({
      past: [],
      present: newState,
      future: [],
    });
  }, []);

  return {
    currentState: state.present,
    canUndo,
    canRedo,
    pushState,
    undo,
    redo,
    resetHistory,
  };
}
