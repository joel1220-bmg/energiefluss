"use client";

import { useEffect, useMemo, useState } from "react";
import { evaluate } from "@/lib/engine/evaluate";
import { emptyDraft, isCoreComplete, type Draft } from "@/lib/engine/types";
import { todayIso } from "@/lib/engine/parse";
import { clearDraft, loadDraft, loadRemember, saveDraft, setRemember } from "@/lib/storage";
import { QuestionForm } from "./QuestionForm";
import { ResultView } from "./ResultView";

export function CoachApp() {
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(todayIso()));
  const [hydrated, setHydrated] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [remember, setRememberState] = useState(false);

  useEffect(() => {
    const allowed = loadRemember();
    setRememberState(allowed);
    if (allowed) {
      const stored = loadDraft();
      if (stored) {
        setDraft(stored);
        if (isCoreComplete(stored)) setShowResult(true);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (remember) saveDraft(draft);
  }, [draft, hydrated, remember]);

  const result = useMemo(() => {
    if (!isCoreComplete(draft)) return null;
    return evaluate(draft);
  }, [draft]);

  function patch(p: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function toggleRemember(on: boolean) {
    setRememberState(on);
    setRemember(on);
    if (on) saveDraft(draft);
  }

  if (!hydrated) {
    return <p className="px-4 py-12 text-muted">Laden …</p>;
  }

  if (!showResult || !result) {
    return (
      <QuestionForm
        draft={draft}
        onChange={patch}
        remember={remember}
        onRemember={toggleRemember}
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
      remember={remember}
      onRemember={toggleRemember}
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
