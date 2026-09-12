"use client";

import { useId, useState } from "react";
import type { Draft, Evaluation, Range } from "@/lib/engine/types";
import { COPY, HORIZON_COPY } from "@/lib/engine/labels";
import { formatDeNumber, formatRangeEUR, parseDeNumber } from "@/lib/engine/parse";
import { Accordion, Field, inputClass } from "./ui";

function Band({ r }: { r: Range }) {
  return <span className="tabular-nums">{formatRangeEUR(r.low, r.high)}</span>;
}

function PctBand({ low, high }: { low: number; high: number }) {
  return (
    <span className="tabular-nums">
      {formatDeNumber(Math.round(low * 100))}–{formatDeNumber(Math.round(high * 100))}&nbsp;%
    </span>
  );
}

function Payback({ result }: { result: Evaluation }) {
  const saveLow = Math.max(
    80,
    result.electricityCostNow.low - result.electricityCostWithSystem.high + result.feedInRevenue.low,
  );
  const saveHigh = Math.max(
    80,
    result.electricityCostNow.high - result.electricityCostWithSystem.low + result.feedInRevenue.high,
  );
  const cost = result.recommendPv ? result.costPvBattery : result.costPvBattery;
  const yLow = Math.max(4, Math.round(cost.low / saveHigh));
  const yHigh = Math.min(28, Math.round(cost.high / saveLow));
  return (
    <div className="mt-3 rounded-2xl border border-line bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted">Amortisation grob</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">
        {formatDeNumber(Math.min(yLow, yHigh))}–{formatDeNumber(Math.max(yLow, yHigh))} Jahre
      </p>
      <p className="mt-2 text-sm text-muted">{COPY.paybackNote}</p>
    </div>
  );
}

function HorizonPath({ path }: { path: Evaluation["path"] }) {
  return (
    <div className="mt-4">
      <p className="text-sm text-muted">{HORIZON_COPY.intro}</p>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        {path.map((card) => {
          const tone =
            card.horizon === "jetzt"
              ? "border-forest/30"
              : card.horizon === "bald"
                ? "border-bald/40"
                : "border-spaeter/40";
          return (
            <article key={card.horizon} className={`rounded-2xl border bg-card p-4 ${tone}`}>
              <p className="text-xs font-medium uppercase tracking-wide text-moss">{card.title}</p>
              <p className="mt-1 text-sm font-medium text-ink">{card.sub}</p>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                {card.items.slice(0, 3).map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function ResultView({
  draft,
  result,
  onChange,
  onReset,
  onEditQuestions,
  remember,
  onRemember,
}: {
  draft: Draft;
  result: Evaluation;
  onChange: (patch: Partial<Draft>) => void;
  onReset: () => void;
  onEditQuestions: () => void;
  remember: boolean;
  onRemember: (on: boolean) => void;
}) {
  const [drawer, setDrawer] = useState(false);
  const drawerId = useId();
  const entered = result.facts.filter((f) => f.source === "entered");
  const assumed = result.facts.filter((f) => f.source === "assumed");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm uppercase tracking-[0.12em] text-moss">Ergebnis</p>
      <h1 className="serif mt-2 text-[1.7rem] leading-snug text-forest sm:text-4xl">{result.houseSentence}</h1>
      <p className="mt-3 text-base text-ink">{result.recommendSentence}</p>
      <HorizonPath path={result.path} />
      <p className="mt-3 text-sm text-muted">
        Sicherheit: <strong className="text-ink">{result.confidence.level}</strong>. {COPY.notCertified}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Empfohlene PV</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums leading-tight">
            {result.recommendPv
              ? `${formatDeNumber(result.pvKwp.low, 1)}–${formatDeNumber(result.pvKwp.high, 1)} kWp`
              : "nicht erneut"}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Empfohlener Speicher</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums leading-tight">
            {formatDeNumber(result.batteryKwh.low, 1)}–{formatDeNumber(result.batteryKwh.high, 1)} kWh
          </p>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted">{COPY.unitExplain}</p>
      <p className="mt-1 text-sm text-muted">{result.spanNote}</p>

      <h2 className="serif mt-8 text-2xl text-forest">Kosten (Orientierung)</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {(
          [
            ["PV allein", result.costPvOnly, result.recommendPv],
            ["PV + Speicher", result.costPvBattery, true],
            ["+ Wallbox", result.costPvBatteryWallbox, true],
          ] as const
        ).map(([k, r, show]) => (
          <div key={k} className="rounded-2xl border border-line bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted">{k}</p>
            <p className="mt-1 text-xl font-semibold leading-tight">
              {show && (r.high > 0 || k !== "PV allein") ? <Band r={r} /> : "—"}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">{COPY.vatNote}</p>
      <p className="mt-1 text-sm text-muted">{COPY.plzPriceNote}</p>
      <p className="mt-1 text-xs text-muted">{result.grantDisclaimer} EEG-Einspeisung grob ~{formatDeNumber(result.feedInCt.low, 1)}–{formatDeNumber(result.feedInCt.high, 1)} ct/kWh.</p>

      <h2 className="serif mt-8 text-2xl text-forest">Eigenverbrauch &amp; Autarkie</h2>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-card p-4">
          <dt className="text-xs uppercase tracking-wide text-muted">Eigenverbrauch ohne Speicher</dt>
          <dd className="mt-1 text-xl font-semibold">
            <PctBand low={result.selfConsumptionNoBattery.low} high={result.selfConsumptionNoBattery.high} />
          </dd>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <dt className="text-xs uppercase tracking-wide text-muted">Eigenverbrauch mit Speicher</dt>
          <dd className="mt-1 text-xl font-semibold">
            <PctBand low={result.selfConsumptionWithBattery.low} high={result.selfConsumptionWithBattery.high} />
          </dd>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <dt className="text-xs uppercase tracking-wide text-muted">Autarkie ohne Speicher</dt>
          <dd className="mt-1 text-xl font-semibold">
            <PctBand low={result.autarkyNoBattery.low} high={result.autarkyNoBattery.high} />
          </dd>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <dt className="text-xs uppercase tracking-wide text-muted">Autarkie mit Speicher</dt>
          <dd className="mt-1 text-xl font-semibold">
            <PctBand low={result.autarkyWithBattery.low} high={result.autarkyWithBattery.high} />
          </dd>
        </div>
      </dl>

      <h2 className="serif mt-8 text-2xl text-forest">Stromkosten &amp; Erlöse / Jahr</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Jetzt</p>
          <p className="mt-1 text-xl font-semibold">
            <Band r={result.electricityCostNow} />
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Mit Anlage (Netzbezug)</p>
          <p className="mt-1 text-xl font-semibold">
            <Band r={result.electricityCostWithSystem} />
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Einspeiseerlös grob</p>
          <p className="mt-1 text-xl font-semibold">
            <Band r={result.feedInRevenue} />
          </p>
        </div>
      </div>
      <Payback result={result} />

      <div className="mt-3 rounded-2xl border border-line bg-card p-4">
        <p className="text-xs uppercase tracking-wide text-muted">CO₂ grob vermieden / Jahr</p>
        <p className="mt-1 text-xl font-semibold tabular-nums">
          {formatDeNumber(Math.round(result.co2kgYear.low / 10) * 10)}–
          {formatDeNumber(Math.round(result.co2kgYear.high / 10) * 10)} kg
        </p>
      </div>

      <div className="no-print mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          className="min-h-11 rounded-full bg-forest px-4 text-sm font-semibold text-paper"
          onClick={() => setDrawer(true)}
        >
          Feinschliff — Angaben nachziehen
        </button>
        <button type="button" className="min-h-11 rounded-full border border-line px-4 text-sm" onClick={onEditQuestions}>
          Fragen ändern
        </button>
        <button type="button" className="min-h-11 rounded-full border border-line px-4 text-sm" onClick={() => window.print()}>
          Drucken / PDF
        </button>
        <button type="button" className="min-h-11 rounded-full border border-line px-4 text-sm" onClick={onReset}>
          Entwurf löschen
        </button>
      </div>

      <label className="mt-4 flex min-h-10 items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={remember}
          onChange={(e) => onRemember(e.target.checked)}
        />
        <span>Angaben merken — nur in diesem Browser.</span>
      </label>

      <Accordion title="Was Sie angegeben haben — und was angenommen ist">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium">Eingegeben</p>
            <ul className="mt-2 space-y-1 text-sm">
              {entered.map((f) => (
                <li key={f.key}>
                  {f.label}: {f.value}
                </li>
              ))}
              {entered.length === 0 ? <li className="text-muted">Noch wenig Konkretes.</li> : null}
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium">Angenommen</p>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {assumed.map((f) => (
                <li key={f.key}>
                  {f.label}: {f.value}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Accordion>

      <h2 className="serif mt-12 text-2xl text-forest">Nächste Schritte</h2>
      <ol className="mt-3 list-decimal space-y-3 pl-5">
        {result.nextSteps.map((s) => (
          <li key={s.id}>
            <span className="font-medium">{s.label}</span>
            <span className="block text-sm text-muted">{s.detail}</span>
          </li>
        ))}
      </ol>

      {drawer ? (
        <div className="no-print fixed inset-0 z-40 flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Feinschliff schließen"
            onClick={() => setDrawer(false)}
          />
          <div
            id={drawerId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${drawerId}-title`}
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-paper p-5 sm:rounded-3xl"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id={`${drawerId}-title`} className="serif text-2xl text-forest">
                Feinschliff
              </h2>
              <button type="button" className="min-h-10 rounded-full border border-line px-3 text-sm" onClick={() => setDrawer(false)}>
                Schließen
              </button>
            </div>
            <FineTune draft={draft} result={result} onChange={onChange} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FineTune({
  draft,
  result,
  onChange,
}: {
  draft: Draft;
  result: Evaluation;
  onChange: (p: Partial<Draft>) => void;
}) {
  const ctStrom = draft.priceElectricity != null ? Math.round(draft.priceElectricity * 100) : 32;
  const band = Math.round((draft.costFactor - 1) * 100);
  const pv = draft.pvKwpOverride ?? result.pvKwp.mid;
  const bat = draft.batteryKwhOverride ?? result.batteryKwh.mid;
  const km = draft.evKmYear ?? (result.loads.evActive ? Math.round(result.loads.evKwh / 0.18) : 12000);
  const wp = draft.heatPumpKwhYear ?? (result.loads.wpActive ? result.loads.wpKwh : 4000);

  return (
    <div className="mt-4 flex flex-col gap-5">
      <Field label={`${COPY.ftStrom}: ${ctStrom}`}>
        <input
          type="range"
          min={22}
          max={42}
          value={ctStrom}
          onChange={(e) => onChange({ priceElectricity: Number(e.target.value) / 100 })}
        />
      </Field>
      <Field label={`${COPY.ftPv}: ${formatDeNumber(pv, 1)}`}>
        <input
          type="range"
          min={3}
          max={18}
          step={0.5}
          value={pv}
          onChange={(e) => onChange({ pvKwpOverride: Number(e.target.value) })}
        />
      </Field>
      <Field label={`${COPY.ftBattery}: ${formatDeNumber(bat, 1)}`}>
        <input
          type="range"
          min={3}
          max={25}
          step={0.5}
          value={bat}
          onChange={(e) => onChange({ batteryKwhOverride: Number(e.target.value) })}
        />
      </Field>
      <Field label={COPY.ftBatteryExact} hint="Direkt in kWh, z. B. 10">
        <input
          className={inputClass}
          inputMode="decimal"
          value={draft.batteryKwhOverride ?? draft.existingBatteryKwh ?? ""}
          onChange={(e) => {
            const n = parseDeNumber(e.target.value);
            onChange({ batteryKwhOverride: n, existingBatteryKwh: n });
          }}
          placeholder="z. B. 10"
        />
      </Field>
      <Field label={COPY.ftPvExact} hint="Direkt in kWp, z. B. 8,5">
        <input
          className={inputClass}
          inputMode="decimal"
          value={draft.pvKwpOverride ?? draft.existingPvKwp ?? ""}
          onChange={(e) => {
            const n = parseDeNumber(e.target.value);
            onChange({ pvKwpOverride: n, existingPvKwp: n });
          }}
          placeholder="z. B. 8,5"
        />
      </Field>
      <Field label={`${COPY.ftEvKm}: ${formatDeNumber(km)}`}>
        <input
          type="range"
          min={0}
          max={30000}
          step={500}
          value={km}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange({
              evKmYear: v > 0 ? v : null,
              evKwhYear: null,
              hasEv: v > 0 ? draft.hasEv === "no" ? "yes" : draft.hasEv ?? "yes" : draft.hasEv,
            });
          }}
        />
      </Field>
      <Field label={`${COPY.ftWpKwh}: ${formatDeNumber(wp)}`}>
        <input
          type="range"
          min={0}
          max={12000}
          step={250}
          value={wp}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange({
              heatPumpKwhYear: v > 0 ? v : null,
              hasHeatPump: v > 0 ? "yes" : draft.hasHeatPump === "yes" ? "no" : draft.hasHeatPump,
            });
          }}
        />
      </Field>
      <Field label={`${COPY.ftCost}: ${band > 0 ? "+" : ""}${band} %`}>
        <input
          type="range"
          min={-30}
          max={30}
          step={5}
          value={band}
          onChange={(e) => onChange({ costFactor: 1 + Number(e.target.value) / 100 })}
        />
      </Field>
      <Field label="Haushaltsstrom kWh/Jahr">
        <input
          className={inputClass}
          inputMode="decimal"
          defaultValue={draft.householdKwhYear ?? result.loads.householdKwh}
          onBlur={(e) => onChange({ householdKwhYear: parseDeNumber(e.target.value), householdCostEurYear: null })}
        />
      </Field>
    </div>
  );
}
