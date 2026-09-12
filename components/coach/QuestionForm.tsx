"use client";

import type { BuildingType, Decade, Draft, Heating } from "@/lib/engine/types";
import { BUILDING_CHIP, COPY, DECADE_CHIP, HEATING_CHIP } from "@/lib/engine/labels";
import { ChipGroup, inputClass } from "./ui";

const TYPES: BuildingType[] = ["EFH", "DHH", "RH", "MFH", "unknown"];
const DECADES: Decade[] = [
  "pre1950",
  "1950-69",
  "1970-89",
  "1990-2001",
  "2002-15",
  "from2016",
  "unknown",
];
const HEATS: Heating[] = [
  "gas",
  "oil",
  "heatpump",
  "district",
  "nightstorage",
  "other",
  "unknown",
];

export function QuestionForm({
  draft,
  onChange,
  onSubmit,
  remember,
  onRemember,
}: {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  onSubmit: () => void;
  remember: boolean;
  onRemember: (on: boolean) => void;
}) {
  const unknownUsed =
    draft.buildingType === "unknown" || draft.decade === "unknown" || draft.heating === "unknown";
  const ready = draft.buildingType !== null && draft.decade !== null && draft.heating !== null;

  return (
    <form
      className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onSubmit();
      }}
    >
      <div>
        <h1 className="serif text-3xl text-forest">Vier Angaben, dann die erste Spanne</h1>
        <p className="mt-2 text-muted">{COPY.privacy}</p>
      </div>

      <div>
        <label htmlFor="plz" className="serif text-lg text-forest">
          {COPY.qPlz}
        </label>
        <input
          id="plz"
          name="plz"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          pattern="[0-9]{5}"
          value={draft.plz}
          onChange={(e) => onChange({ plz: e.target.value.replace(/\D/g, "").slice(0, 5) })}
          className={`${inputClass} mt-3 max-w-[10rem] tracking-widest`}
          placeholder="12345"
          aria-describedby="plz-help"
        />
        <p id="plz-help" className="mt-2 text-sm text-muted">
          {draft.plz.length === 0 ? COPY.plzEmpty : draft.plz.length < 5 ? "Fünf Ziffern, sobald Sie sie kennen." : " "}
        </p>
      </div>

      <ChipGroup
        legend={COPY.qType}
        value={draft.buildingType}
        onChange={(buildingType) => onChange({ buildingType })}
        options={TYPES.map((value) => ({ value, label: BUILDING_CHIP[value] }))}
        help={draft.buildingType === "unknown" ? COPY.unknownHelp : undefined}
      />

      <ChipGroup
        legend={COPY.qDecade}
        value={draft.decade}
        onChange={(decade) => onChange({ decade })}
        options={DECADES.map((value) => ({ value, label: DECADE_CHIP[value] }))}
        help={draft.decade === "unknown" ? COPY.unknownHelp : undefined}
      />

      <ChipGroup
        legend={COPY.qHeating}
        value={draft.heating}
        onChange={(heating) => onChange({ heating })}
        options={HEATS.map((value) => ({ value, label: HEATING_CHIP[value] }))}
        help={
          draft.heating === "unknown" || draft.heating === "other" ? COPY.unknownHelp : undefined
        }
      />

      {unknownUsed ? <p className="text-sm text-muted">{COPY.unknownHelp}</p> : null}

      <label className="flex min-h-10 items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={remember}
          onChange={(e) => onRemember(e.target.checked)}
        />
        <span>
          Angaben merken — nur in diesem Browser, kein Konto.
          {!remember ? " Ohne Haken bleibt nichts gespeichert." : ""}
        </span>
      </label>

      <button
        type="submit"
        disabled={!ready}
        className="min-h-12 rounded-full bg-forest px-6 text-base font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-40"
      >
        Einschätzung anzeigen
      </button>
    </form>
  );
}
