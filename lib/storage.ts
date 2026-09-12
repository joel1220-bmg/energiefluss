import { emptyDraft, type Draft } from "@/lib/engine/types";
import { draftSchema } from "@/lib/schema";

export const STORAGE_KEY = "energiefluss-draft-v1";

export function loadDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = draftSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    return { ...emptyDraft(), ...parsed.data };
  } catch {
    return null;
  }
}

export function saveDraft(draft: Draft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* private mode / quota */
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
