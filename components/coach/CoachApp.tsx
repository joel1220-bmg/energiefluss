"use client";

import { useEffect, useMemo, useState } from "react";
import { evaluate } from "@/lib/engine/evaluate";
import { emptyDraft, isCoreComplete, type Draft } from "@/lib/engine/types";
import { todayIso } from "@/lib/engine/parse";
import { clearDraft, loadDraft, saveDraft } from "@/lib/storage";
import { QuestionForm } from "./QuestionForm";
import { ResultView } from "./ResultView";

export function CoachApp() {
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(todayIso()));
  const [hydrated, setHydrated] = useState(false);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    const stored = loadDraft();
    if (stored) {
      setDraft(stored);
      if (isCoreComplete(stored)) setShowResult(true);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveDraft(draft);
  }, [draft, hydrated]);

  const result = useMemo(() => {
    if (!isCoreComplete(draft)) return null;
    return evaluate(draft);
  }, [draft]);

  function patch(p: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  if (!hydrated) {
    return <p className="px-4 py-12 text-muted">Laden …</p>;
  }

  if (!showResult || !result) {
    return (
      <QuestionForm
        draft={draft}
        onChange={patch}
        onSubmit={() => {
          if (isCoreComplete(draft)) setShowResult(true);
        }}
      />
    );
  }

  return (
    <ResultView
      draft={draft}
      result={result}
      onChange={patch}
      onEditQuestions={() => setShowResult(false)}
      onReset={() => {
        clearDraft();
        setDraft(emptyDraft(todayIso()));
        setShowResult(false);
      }}
    />
  );
}
