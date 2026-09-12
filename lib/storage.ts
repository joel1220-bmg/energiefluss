import { emptyDraft, type Draft } from "@/lib/engine/types";
import { draftSchema } from "@/lib/schema";

export const STORAGE_KEY = "energiefluss-draft-v1";
export const REMEMBER_KEY = "energiefluss-remember-v1";

export function loadRemember(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(REMEMBER_KEY) === "1";
  } catch {
    return false;
  }
}

export function setRemember(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (on) window.localStorage.setItem(REMEMBER_KEY, "1");
    else {
      window.localStorage.removeItem(REMEMBER_KEY);
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* private mode / quota */
  }
}

export function loadDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  if (!loadRemember()) return null;
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
  if (!loadRemember()) return;
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
