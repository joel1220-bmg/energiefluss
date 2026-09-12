"use client";

import type { Draft, EvState, HasPvState, TriState } from "@/lib/engine/types";
import { COPY, EV_CHIP, HAS_PV_CHIP, TRI_CHIP } from "@/lib/engine/labels";
import { parseDeNumber } from "@/lib/engine/parse";
import { ChipGroup, Field, inputClass } from "./ui";

const EVS: EvState[] = ["yes", "planned", "no", "unknown"];
const TRIS: TriState[] = ["yes", "no", "unknown"];
const PVS: HasPvState[] = ["none", "yes", "unknown"];

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
  const showEvDetail = draft.hasEv === "yes" || draft.hasEv === "planned" || draft.hasEv === "unknown";
  const ready = draft.hasEv !== null && draft.hasHeatPump !== null;
  const unknownUsed =
    draft.hasEv === "unknown" ||
    draft.hasHeatPump === "unknown" ||
    (!draft.householdKwhYear && !draft.householdCostEurYear);

  return (
    <form
      className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onSubmit();
      }}
    >
      <div>
        <h1 className="serif text-3xl text-forest">Erste Einschätzung — Solar, Speicher, E-Auto</h1>
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
          {draft.plz.length === 0 ? COPY.plzHint : draft.plz.length < 5 ? "Fünf Ziffern, sobald Sie sie kennen." : " "}
        </p>
      </div>

      <fieldset>
        <legend className="serif text-lg text-forest">{COPY.qHousehold}</legend>
        <p className="mt-1 text-sm text-muted">{COPY.qHouseholdHint}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="kWh / Jahr">
            <input
              className={inputClass}
              inputMode="decimal"
              value={draft.householdKwhYear ?? ""}
              onChange={(e) => {
                const n = parseDeNumber(e.target.value);
                onChange({ householdKwhYear: n, householdCostEurYear: n ? null : draft.householdCostEurYear });
              }}
              placeholder="z. B. 3500"
            />
          </Field>
          <Field label="€ / Jahr" hint="Eines reicht.">
            <input
              className={inputClass}
              inputMode="decimal"
              value={draft.householdCostEurYear ?? ""}
              onChange={(e) => {
                const n = parseDeNumber(e.target.value);
                onChange({ householdCostEurYear: n, householdKwhYear: n ? null : draft.householdKwhYear });
              }}
              placeholder="z. B. 1200"
            />
          </Field>
        </div>
        {!draft.householdKwhYear && !draft.householdCostEurYear ? (
          <p className="mt-2 text-sm text-muted">{COPY.qHouseholdEmpty}</p>
        ) : null}
      </fieldset>

      <ChipGroup
        legend={COPY.qEv}
        value={draft.hasEv}
        onChange={(hasEv) =>
          onChange({
            hasEv,
            ...(hasEv === "no" ? { evKmYear: null, evKwhYear: null } : {}),
          })
        }
        options={EVS.map((value) => ({ value, label: EV_CHIP[value] }))}
        help={draft.hasEv === "unknown" ? COPY.unknownHelp : undefined}
      />

      {showEvDetail ? (
        <fieldset>
          <legend className="serif text-lg text-forest">{COPY.qEvKm}</legend>
          <p className="mt-1 text-sm text-muted">{COPY.qEvKmHint}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="km / Jahr">
              <input
                className={inputClass}
                inputMode="decimal"
                value={draft.evKmYear ?? ""}
                onChange={(e) => {
                  const n = parseDeNumber(e.target.value);
                  onChange({ evKmYear: n, evKwhYear: n ? null : draft.evKwhYear });
                }}
                placeholder="z. B. 12000"
              />
            </Field>
            <Field label="kWh / Jahr" hint="Eines reicht.">
              <input
                className={inputClass}
                inputMode="decimal"
                value={draft.evKwhYear ?? ""}
                onChange={(e) => {
                  const n = parseDeNumber(e.target.value);
                  onChange({ evKwhYear: n, evKmYear: n ? null : draft.evKmYear });
                }}
                placeholder="z. B. 2160"
              />
            </Field>
          </div>
          {!draft.evKmYear && !draft.evKwhYear && (draft.hasEv === "yes" || draft.hasEv === "planned") ? (
            <p className="mt-2 text-sm text-muted">{COPY.unknownHelp}</p>
          ) : null}
        </fieldset>
      ) : null}

      <ChipGroup
        legend={COPY.qWp}
        value={draft.hasHeatPump}
        onChange={(hasHeatPump) =>
          onChange({
            hasHeatPump,
            ...(hasHeatPump !== "yes" ? { heatPumpKwhYear: null } : {}),
          })
        }
        options={TRIS.map((value) => ({ value, label: TRI_CHIP[value] }))}
        help={COPY.qWpHelp}
      />

      {draft.hasHeatPump === "yes" ? (
        <Field label="Wärmepumpe Strom kWh/Jahr (optional)" hint={COPY.unknownHelp}>
          <input
            className={inputClass}
            inputMode="decimal"
            value={draft.heatPumpKwhYear ?? ""}
            onChange={(e) => onChange({ heatPumpKwhYear: parseDeNumber(e.target.value) })}
            placeholder="z. B. 4000"
          />
        </Field>
      ) : null}

      <ChipGroup
        legend={COPY.qPv}
        value={draft.hasPv}
        onChange={(hasPv) =>
          onChange({
            hasPv,
            ...(hasPv !== "yes" ? { existingPvKwp: null } : {}),
          })
        }
        options={PVS.map((value) => ({ value, label: HAS_PV_CHIP[value] }))}
      />

      {draft.hasPv === "yes" ? (
        <Field label={COPY.qPvKwp} hint={COPY.qPvKwpHint}>
          <input
            className={inputClass}
            inputMode="decimal"
            value={draft.existingPvKwp ?? ""}
            onChange={(e) => onChange({ existingPvKwp: parseDeNumber(e.target.value) })}
            placeholder="z. B. 8,5"
          />
        </Field>
      ) : null}

      <ChipGroup
        legend={COPY.qBattery}
        value={draft.hasBattery}
        onChange={(hasBattery) =>
          onChange({
            hasBattery,
            ...(hasBattery !== "yes" ? { existingBatteryKwh: null } : {}),
          })
        }
        options={TRIS.map((value) => ({ value, label: TRI_CHIP[value] }))}
      />

      {draft.hasBattery === "yes" || draft.hasBattery === "unknown" ? (
        <Field label={COPY.qBatteryKwh} hint={COPY.qBatteryKwhHint}>
          <input
            className={inputClass}
            inputMode="decimal"
            value={draft.existingBatteryKwh ?? ""}
            onChange={(e) => {
              const n = parseDeNumber(e.target.value);
              onChange({ existingBatteryKwh: n, batteryKwhOverride: n });
            }}
            placeholder="z. B. 10"
          />
        </Field>
      ) : null}

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
