"use client";

import { useId, useState } from "react";
import type { Draft, Evaluation, Insulation, MeasureId, MeasureResult, Range } from "@/lib/engine/types";
import { COPY, INSULATION_CHIP, MEASURE_SHORT, MEASURE_TECHNICAL, MEASURE_TITLE } from "@/lib/engine/labels";
import { formatDeNumber, formatRangeEUR, formatRangeKwh, formatYears, parseDeNumber } from "@/lib/engine/parse";
import { Accordion, ChipGroup, Field, inputClass } from "./ui";

function Band({ r, suffix = "" }: { r: Range; suffix?: string }) {
  return (
    <span className="tabular-nums">
      {formatRangeEUR(r.low, r.high)}
      {suffix}
    </span>
  );
}


function HorizonPath({ measures }: { measures: MeasureResult[] }) {
  const order = ["jetzt", "bald", "spaeter"] as const;
  const label = { jetzt: "Jetzt", bald: "Bald", spaeter: "Später" };
  const sub = {
    jetzt: "Zuerst sinnvoll",
    bald: "Danach angehen",
    spaeter: "Wenn Hülle/Hydraulik passen",
  };
  const empty = { jetzt: "Noch nichts Dringendes", bald: "—", spaeter: "—" };
  return (
    <div className="mt-4">
      <p className="text-sm text-muted">So könnten Sie vorgehen — grobe Reihenfolge, keine Pflicht.</p>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        {order.map((h) => {
          const items = measures.filter((m) => m.applicable && m.horizon === h).slice(0, 3);
          return (
            <article key={h} className="rounded-2xl border border-line bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-moss">{label[h]}</p>
              <p className="mt-1 text-sm text-muted">{sub[h]}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {items.length ? (
                  items.map((m) => <li key={m.id}>{MEASURE_SHORT[m.id]}</li>)
                ) : (
                  <li className="text-muted">{empty[h]}</li>
                )}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function HorizonBadge({ h }: { h: MeasureResult["horizon"] }) {
  const map = {
    jetzt: { t: "Jetzt", c: "bg-jetzt text-paper" },
    bald: { t: "Bald", c: "bg-bald text-paper" },
    spaeter: { t: "Später", c: "bg-spaeter text-paper" },
  }[h];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map.c}`}>{map.t}</span>;
}

function MeasureCard({ m, disclaimer }: { m: MeasureResult; disclaimer: string }) {
  if (!m.applicable) return null;
  return (
    <article className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="serif text-xl text-forest">{m.title}</h3>
        <HorizonBadge h={m.horizon} />
      </div>
      <p className="mt-2 text-sm text-muted">{m.summary}</p>
      {MEASURE_TECHNICAL[m.id] ? (
        <p className="mt-1 text-xs text-muted">{MEASURE_TECHNICAL[m.id]}</p>
      ) : null}
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted">Kosten</dt>
          <dd className="text-lg font-semibold tabular-nums">
            <Band r={m.cost} />
          </dd>
        </div>
        <div>
          <dt className="text-muted">Zuschuss</dt>
          <dd className="text-lg font-semibold tabular-nums">
            <Band r={m.grant} />
          </dd>
        </div>
        <div>
          <dt className="text-muted">Netto</dt>
          <dd className="tabular-nums">
            <Band r={m.net} />
          </dd>
        </div>
        <div>
          <dt className="text-muted">Ersparnis / Jahr</dt>
          <dd className="tabular-nums">
            <Band r={m.savingEurYear} />
          </dd>
        </div>
        <div>
          <dt className="text-muted">Amortisation</dt>
          <dd>
            {m.paybackYears
              ? `${formatYears(m.paybackYears.low).replace(" Jahre", "")}–${formatYears(m.paybackYears.high)}`
              : "kein belastbarer Wert"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">CO₂ / Jahr</dt>
          <dd className="tabular-nums">
            {formatDeNumber(Math.round(m.co2kgYear.low / 10) * 10)}–
            {formatDeNumber(Math.round(m.co2kgYear.high / 10) * 10)} kg
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-muted">
        {m.grantProgram}. {disclaimer}
      </p>
      {m.risk ? <p className="mt-1 text-xs text-warn">Risiko: {m.risk}</p> : null}
    </article>
  );
}

const DONE_OPTIONS: MeasureId[] = [
  "hydraulicBalancing",
  "topFloorCeiling",
  "basementCeiling",
  "roofInsulation",
  "wdvs",
  "windowTriple",
  "heatPumpAirWater",
  "pvWithStorage",
  "energyAdvice",
];

export function ResultView({
  draft,
  result,
  onChange,
  onReset,
  onEditQuestions,
}: {
  draft: Draft;
  result: Evaluation;
  onChange: (patch: Partial<Draft>) => void;
  onReset: () => void;
  onEditQuestions: () => void;
}) {
  const [drawer, setDrawer] = useState(false);
  const drawerId = useId();
  const entered = result.facts.filter((f) => f.source === "entered");
  const assumed = result.facts.filter((f) => f.source === "assumed");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm uppercase tracking-[0.12em] text-moss">Ergebnis</p>
      <h1 className="serif mt-2 text-[1.7rem] leading-snug text-forest sm:text-4xl">{result.houseSentence}</h1>
      <HorizonPath measures={result.measures} />
      <p className="mt-3 text-sm text-muted">
        Sicherheit: <strong className="text-ink">{result.confidence.level}</strong>.
        Keine zertifizierte Beratung.
      </p>
      <p className="mt-2 text-sm text-muted">{result.gmodgNote}</p>

      <section className="mt-8 rounded-2xl border-2 border-forest/20 bg-card p-4">
        <ChipGroup
          legend={COPY.insulationQ}
          value={draft.insulation}
          onChange={(insulation: Insulation) => onChange({ insulation })}
          options={(["weak", "mixed", "good", "unknown"] as Insulation[]).map((value) => ({
            value,
            label: INSULATION_CHIP[value],
          }))}
          help={COPY.insulationHint}
        />
        <div className="no-print mt-4 flex flex-wrap gap-2">
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
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        {(
          [
            ["Wärmebedarf / Jahr", formatRangeKwh(result.heat.spaceHeatKwh.low, result.heat.spaceHeatKwh.high)],
            ["Heizkosten / Jahr", formatRangeEUR(result.heat.costEurYear.low, result.heat.costEurYear.high)],
            ["CO₂ / Jahr", `${formatDeNumber(result.heat.co2kgYear.low)}–${formatDeNumber(result.heat.co2kgYear.high)} kg`],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-line bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted">{k}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums leading-tight">{v}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">Spanne, weil vieles noch angenommen ist.</p>

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

      <div className="no-print mt-6 flex flex-wrap gap-2">
        <button type="button" className="min-h-11 rounded-full border border-line px-4 text-sm" onClick={() => window.print()}>
          Drucken / PDF
        </button>
        <button type="button" className="min-h-11 rounded-full border border-line px-4 text-sm" onClick={onReset}>
          Entwurf löschen
        </button>
      </div>

      <h2 className="serif mt-10 text-2xl text-forest">Maßnahmen</h2>
      <p className="mt-1 text-sm text-muted">Spannen, keine Punktwerte. {result.grantDisclaimer}</p>
      <div className="mt-4 flex flex-col gap-4">
        {result.measures.map((m) => (
          <MeasureCard key={m.id} m={m} disclaimer={result.grantDisclaimer} />
        ))}
      </div>

      <h2 className="serif mt-12 text-2xl text-forest">Drei Pakete im Vergleich</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {result.packages.map((p) => (
          <article key={p.id} className="rounded-2xl border border-line bg-card p-4">
            <h3 className="serif text-xl text-forest">{p.title}</h3>
            <p className="text-sm text-muted">{p.subtitle}</p>
            <p className="mt-3 text-2xl font-semibold tabular-nums leading-tight">
              <Band r={p.net} />
            </p>
            <p className="text-xs text-muted">netto nach grobem Zuschuss</p>
            <ul className="mt-3 space-y-1 text-sm">
              <li>Kosten <Band r={p.cost} /></li>
              <li>Zuschuss <Band r={p.grant} /></li>
              <li>Ersparnis/Jahr <Band r={p.savingEurYear} /></li>
            </ul>
            <p className="mt-2 text-xs text-muted">{result.grantDisclaimer}</p>
          </article>
        ))}
      </div>

      <h2 className="serif mt-12 text-2xl text-forest">Nächste Schritte</h2>
      <ol className="mt-3 list-decimal space-y-3 pl-5">
        {result.nextSteps.map((s) => (
          <li key={s.id}>
            <span className="font-medium">{s.label}</span>
            <span className="block text-sm text-muted">{s.detail}</span>
          </li>
        ))}
      </ol>

      <Accordion title="Mehr Angaben (optional)">
        <Deepen draft={draft} onChange={onChange} />
      </Accordion>

      <p className="mt-8 text-xs text-muted">{result.wertschoepfungNote}</p>

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
            <FineTune draft={draft} onChange={onChange} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Deepen({ draft, onChange }: { draft: Draft; onChange: (p: Partial<Draft>) => void }) {
  return (
    <div className="grid gap-4">
      <Field label="Wohnfläche (m²)">
        <input
          className={inputClass}
          inputMode="decimal"
          defaultValue={draft.livingAreaM2 ?? ""}
          onBlur={(e) => onChange({ livingAreaM2: parseDeNumber(e.target.value) })}
        />
      </Field>
      <Field label="Personen im Haushalt">
        <input
          className={inputClass}
          inputMode="numeric"
          defaultValue={draft.persons ?? ""}
          onBlur={(e) => onChange({ persons: parseDeNumber(e.target.value) })}
        />
      </Field>
      <Field label="Heizkosten €/Jahr" hint="Oder unten kWh — nicht beides nötig.">
        <input
          className={inputClass}
          inputMode="decimal"
          defaultValue={draft.heatingCostEurYear ?? ""}
          onBlur={(e) => onChange({ heatingCostEurYear: parseDeNumber(e.target.value) })}
        />
      </Field>
      <Field label="Heizverbrauch kWh/Jahr">
        <input
          className={inputClass}
          inputMode="decimal"
          defaultValue={draft.heatingKwhYear ?? ""}
          onBlur={(e) => onChange({ heatingKwhYear: parseDeNumber(e.target.value) })}
        />
      </Field>
      <ChipGroup
        legend="Warmwasser elektrisch?"
        value={draft.dhwElectric === "unknown" ? "unknown" : draft.dhwElectric ? "yes" : "no"}
        onChange={(v) =>
          onChange({ dhwElectric: v === "unknown" ? "unknown" : v === "yes" })
        }
        options={[
          { value: "yes", label: "Ja" },
          { value: "no", label: "Nein" },
          { value: "unknown", label: "Weiß ich nicht" },
        ]}
      />
      <ChipGroup
        legend="Photovoltaik vorhanden?"
        value={draft.hasPv === "unknown" ? "unknown" : draft.hasPv ? "yes" : "no"}
        onChange={(v) => onChange({ hasPv: v === "unknown" ? "unknown" : v === "yes" })}
        options={[
          { value: "yes", label: "Ja" },
          { value: "no", label: "Nein" },
          { value: "unknown", label: "Weiß ich nicht" },
        ]}
      />
    </div>
  );
}

function FineTune({ draft, onChange }: { draft: Draft; onChange: (p: Partial<Draft>) => void }) {
  const ctHeat = draft.priceHeating != null ? Math.round(draft.priceHeating * 100) : 12;
  const ctStrom = draft.priceElectricity != null ? Math.round(draft.priceElectricity * 100) : 32;
  const band = Math.round((draft.costFactor - 1) * 100);

  return (
    <div className="mt-4 flex flex-col gap-5">
      <Field label={COPY.ftArea} hint="m² Wohnfläche">
        <input
          className={inputClass}
          inputMode="decimal"
          defaultValue={draft.livingAreaM2 ?? ""}
          onBlur={(e) => onChange({ livingAreaM2: parseDeNumber(e.target.value) })}
        />
      </Field>
      <ChipGroup
        legend={COPY.ftRoofFacade}
        value={`${draft.roof}/${draft.facade}`}
        onChange={(v) => {
          const [roof, facade] = v.split("/") as [Draft["roof"], Draft["facade"]];
          onChange({ roof, facade });
        }}
        options={[
          { value: "original/original", label: "Dach/Fassade schwach" },
          { value: "partial/partial", label: "Gemischt" },
          { value: "renewed/renewed", label: "Dach/Fassade gut" },
          { value: "unknown/unknown", label: "Weiß ich nicht" },
        ]}
      />
      <Field label={`${COPY.ftStrom}: ${ctStrom}`}>
        <input
          type="range"
          min={22}
          max={42}
          value={ctStrom}
          onChange={(e) => onChange({ priceElectricity: Number(e.target.value) / 100 })}
        />
      </Field>
      <Field label={`${COPY.ftHeiz}: ${ctHeat} ct/kWh`}>
        <input
          type="range"
          min={6}
          max={24}
          value={ctHeat}
          onChange={(e) => onChange({ priceHeating: Number(e.target.value) / 100 })}
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
      <ChipGroup
        legend={COPY.ftKlima}
        value={draft.climateBonus === "auto" ? "auto" : draft.climateBonus ? "on" : "off"}
        onChange={(v) =>
          onChange({ climateBonus: v === "auto" ? "auto" : v === "on" })
        }
        options={[
          { value: "auto", label: "Automatisch" },
          { value: "on", label: "Ansetzen" },
          { value: "off", label: "Nicht ansetzen" },
        ]}
      />
      <ChipGroup
        legend={COPY.ftIncome}
        value={draft.incomeBand}
        onChange={(incomeBand) => onChange({ incomeBand })}
        options={[
          { value: "upto30k", label: "bis 30.000 €" },
          { value: "upto40k", label: "bis 40.000 €" },
          { value: "upto50k", label: "bis 50.000 €" },
          { value: "above", label: "darüber" },
          { value: "preferNot", label: "Lieber nicht angeben" },
        ]}
      />
      <fieldset>
        <legend className="text-sm font-medium">{COPY.ftDone}</legend>
        <div className="mt-2 flex flex-col gap-2">
          {DONE_OPTIONS.map((id) => (
            <label key={id} className="flex min-h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.alreadyDone.includes(id)}
                onChange={(e) => {
                  const set = new Set(draft.alreadyDone);
                  if (e.target.checked) set.add(id);
                  else set.delete(id);
                  onChange({ alreadyDone: [...set] });
                }}
              />
              {MEASURE_TITLE[id]}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
