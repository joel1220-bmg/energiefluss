"use client";

import type { ReactNode } from "react";

export function ChipGroup<T extends string>({
  legend,
  value,
  onChange,
  options,
  help,
}: {
  legend: string;
  value: T | null;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  help?: string;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="serif text-lg text-forest">{legend}</legend>
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={legend}>
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(o.value)}
              className={`min-h-11 rounded-full border px-3.5 text-sm ${
                selected
                  ? "border-forest bg-forest text-paper"
                  : "border-line bg-card text-ink hover:border-moss"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {help ? <p className="mt-2 text-sm text-muted">{help}</p> : null}
    </fieldset>
  );
}

export function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="rounded-2xl border border-line bg-card px-4 py-3" open={defaultOpen}>
      <summary className="cursor-pointer list-none py-1 text-base font-medium text-forest [&::-webkit-details-marker]:hidden">
        {title}
      </summary>
      <div className="mt-3 border-t border-line/70 pt-3">{children}</div>
    </details>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="mt-1">{children}</div>
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-base text-ink";
