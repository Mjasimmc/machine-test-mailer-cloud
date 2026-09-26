import { useState, useCallback } from 'react';
import { FormSection, LayoutDirection } from '@saas/shared';

export interface FormSnapshot {
  formLayout: LayoutDirection;
  sections: FormSection[];
  title: string;
}

export function useFormBuilderHistory(initialState: FormSnapshot) {
  const [history, setHistory] = useState<FormSnapshot[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const pushState = useCallback((nextState: FormSnapshot) => {
    setHistory((prev) => {
      // Discard future states if we were in the middle of history
      const trimmed = prev.slice(0, currentIndex + 1);
      // Avoid pushing duplicate identical states
      const last = trimmed[trimmed.length - 1];
      if (
        last &&
        last.formLayout === nextState.formLayout &&
        last.title === nextState.title &&
        JSON.stringify(last.sections) === JSON.stringify(nextState.sections)
      ) {
        return prev;
      }
      const updated = [...trimmed, nextState];
      // Limit history depth to 50 states to prevent memory bloat
      if (updated.length > 50) {
        updated.shift();
      }
      return updated;
    });
    setCurrentIndex((prev) => Math.min(prev + 1, 49));
  }, [currentIndex]);

  const undo = useCallback((): FormSnapshot | null => {
    if (!canUndo) return null;
    const prevIndex = currentIndex - 1;
    setCurrentIndex(prevIndex);
    return history[prevIndex];
  }, [canUndo, currentIndex, history]);

  const redo = useCallback((): FormSnapshot | null => {
    if (!canRedo) return null;
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    return history[nextIndex];
  }, [canRedo, currentIndex, history]);

  const resetHistory = useCallback((state: FormSnapshot) => {
    setHistory([state]);
    setCurrentIndex(0);
  }, []);

  return {
    currentState: history[currentIndex] || initialState,
    canUndo,
    canRedo,
    pushState,
    undo,
    redo,
    resetHistory,
  };
}
