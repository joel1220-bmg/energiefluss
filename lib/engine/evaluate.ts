import costsJson from "@/data/costs.de.json";
import eegJson from "@/data/eeg-2026.json";
import pricesJson from "@/data/energy-prices.de.json";
import { lookupClimate } from "./climate";
import { COPY, HORIZON_COPY, houseSentence, recommendSentence } from "./labels";
import type { Draft, Evaluation, Fact, PathCard, Range } from "./types";
import { clamp, emptyDraft, range, round0, round1, sortRange } from "./types";

type CostItem = { value: number; low: number; high: number; unit: string };
const costs = costsJson.items as Record<string, CostItem>;

type PriceItem = { value: number; low: number; high: number };
const prices = pricesJson as {
  items: Record<string, PriceItem>;
  co2kgPerKwh: Record<string, number>;
};

const eeg = eegJson as {
  teileinspeisung: PriceItem;
};

const DEFAULT_HOUSEHOLD_KWH = 3500;
const DEFAULT_EV_KM = 12000;
const EV_KWH_PER_100KM = 18;
const DEFAULT_EV_KWH = (DEFAULT_EV_KM / 100) * EV_KWH_PER_100KM; // 2160
const DEFAULT_WP_KWH = 4000;
const PV_MIN = 4;
const PV_MAX = 15;

function elecPrice(draft: Draft): Range {
  const item = prices.items.electricity;
  if (draft.priceElectricity && draft.priceElectricity > 0) {
    const m = draft.priceElectricity;
    return { low: m * 0.92, mid: m, high: m * 1.08 };
  }
  return { low: item.low, mid: item.value, high: item.high };
}

function feedIn(): Range {
  const t = eeg.teileinspeisung;
  return { low: t.low, mid: t.value, high: t.high };
}

function resolveHousehold(draft: Draft, priceMid: number): { kwh: number; assumed: boolean } {
  if (draft.householdKwhYear && draft.householdKwhYear > 0) {
    return { kwh: draft.householdKwhYear, assumed: false };
  }
  if (draft.householdCostEurYear && draft.householdCostEurYear > 0 && priceMid > 0) {
    return { kwh: draft.householdCostEurYear / priceMid, assumed: false };
  }
  return { kwh: DEFAULT_HOUSEHOLD_KWH, assumed: true };
}

function resolveEv(draft: Draft): { kwh: number; assumed: boolean; active: boolean } {
  const state = draft.hasEv;
  if (state === "no" || state === null) return { kwh: 0, assumed: false, active: false };

  if (draft.evKwhYear && draft.evKwhYear > 0) {
    return { kwh: draft.evKwhYear, assumed: false, active: true };
  }
  if (draft.evKmYear && draft.evKmYear > 0) {
    return { kwh: (draft.evKmYear / 100) * EV_KWH_PER_100KM, assumed: false, active: true };
  }

  if (state === "yes" || state === "planned") {
    return { kwh: DEFAULT_EV_KWH, assumed: true, active: true };
  }
  // unknown without numbers → no EV load
  return { kwh: 0, assumed: false, active: false };
}

function resolveWp(draft: Draft): { kwh: number; assumed: boolean; active: boolean } {
  if (draft.hasHeatPump !== "yes") return { kwh: 0, assumed: false, active: false };
  if (draft.heatPumpKwhYear && draft.heatPumpKwhYear > 0) {
    return { kwh: draft.heatPumpKwhYear, assumed: false, active: true };
  }
  return { kwh: DEFAULT_WP_KWH, assumed: true, active: true };
}

function pctRange(low: number, high: number): Range {
  return { low, mid: (low + high) / 2, high };
}

function applyOverride(base: Range, override: number | null): Range {
  if (override == null || !(override > 0)) return base;
  return { low: override * 0.9, mid: override, high: override * 1.1 };
}

function bandCost(unitLow: number, unitMid: number, unitHigh: number, qty: number, factor: number): Range {
  return sortRange({
    low: unitLow * qty * factor,
    mid: unitMid * qty * factor,
    high: unitHigh * qty * factor,
  });
}

function buildPath(draft: Draft, loads: Evaluation["loads"], recommendPv: boolean): PathCard[] {
  const jetztItems = recommendPv
    ? [COPY.jetztDach, COPY.jetztErtrag]
    : [COPY.jetztBestehend, COPY.jetztSpeicher];

  const baldItems: string[] = [];
  if (loads.evActive || draft.hasEv === "planned" || draft.hasEv === "unknown") {
    baldItems.push("Wallbox / Laden zu Hause mitdenken");
    if (loads.evActive) baldItems.push("Speicher etwas großzügiger dimensionieren");
  } else {
    baldItems.push("Falls später ein E-Auto kommt: Wallbox vorbereiten");
  }
  baldItems.push(HORIZON_COPY.bald.sub);

  const spaeterItems = [
    HORIZON_COPY.spaeter.sub,
    "Zählerdaten nachziehen für engere Spannen",
  ];
  if (draft.hasEv === "planned") {
    spaeterItems.push("Größerer Speicher, wenn das E-Auto wirklich kommt");
  }

  return [
    { horizon: "jetzt", title: HORIZON_COPY.jetzt.title, sub: HORIZON_COPY.jetzt.sub, items: jetztItems },
    { horizon: "bald", title: HORIZON_COPY.bald.title, sub: HORIZON_COPY.bald.sub, items: baldItems },
    { horizon: "spaeter", title: HORIZON_COPY.spaeter.title, sub: HORIZON_COPY.spaeter.sub, items: spaeterItems },
  ];
}

export function evaluate(partial: Partial<Draft>): Evaluation {
  const draft: Draft = { ...emptyDraft(partial.asOf ?? "2026-09-12"), ...partial };
  const climate = lookupClimate(draft.plz);
  const price = elecPrice(draft);
  const feed = feedIn();
  const factor = clamp(draft.costFactor, 0.7, 1.3);

  const household = resolveHousehold(draft, price.mid);
  const ev = resolveEv(draft);
  const wp = resolveWp(draft);
  const totalKwh = household.kwh + ev.kwh + wp.kwh;

  const yieldK = climate.pvYieldKwhPerKwp || 950;
  const recommendPv = draft.hasPv !== "yes";

  let pvMid = clamp((totalKwh / yieldK) * 1.05, PV_MIN, PV_MAX);
  if (!recommendPv) {
    // virtual size only for battery / generation of existing plant (orientation)
    pvMid = clamp((totalKwh / yieldK) * 1.05, PV_MIN, PV_MAX);
  }
  let pvKwp = sortRange({
    low: round1(pvMid * 0.8),
    mid: round1(pvMid),
    high: round1(pvMid * 1.2),
  });
  pvKwp = applyOverride(pvKwp, draft.pvKwpOverride ?? draft.existingPvKwp);
  pvKwp = {
    low: round1(clamp(pvKwp.low, 2, 20)),
    mid: round1(clamp(pvKwp.mid, 2, 20)),
    high: round1(clamp(pvKwp.high, 2, 20)),
  };

  const batBaseLow = pvKwp.mid * 0.8;
  const batBaseHigh = pvKwp.mid * 1.2;
  const evening = draft.chargesAtHome === "yes";
  const evBonusLow = ev.active ? (evening ? 2 : 1) : 0;
  const evBonusHigh = ev.active ? (evening ? 5 : 3) : 0;
  let batteryKwh = sortRange({
    low: round1(batBaseLow + evBonusLow),
    mid: round1((batBaseLow + batBaseHigh) / 2 + (ev.active ? (evening ? 3 : 2) : 0)),
    high: round1(batBaseHigh + evBonusHigh),
  });
  batteryKwh = applyOverride(batteryKwh, draft.batteryKwhOverride ?? draft.existingBatteryKwh);

  // Self-consumption / autarky — conservative bands
  const scNo = pctRange(0.25, 0.35);
  const scWith = pctRange(0.5, 0.7);

  const generation: Range = {
    low: pvKwp.low * yieldK,
    mid: pvKwp.mid * yieldK,
    high: pvKwp.high * yieldK,
  };

  function autarky(sc: Range, gen: Range): Range {
    const one = (scR: number, g: number) => {
      const self = Math.min(totalKwh, g * scR);
      return totalKwh > 0 ? self / totalKwh : 0;
    };
    return sortRange({
      low: one(sc.low, gen.low),
      mid: one(sc.mid, gen.mid),
      high: one(sc.high, gen.high),
    });
  }

  const autarkyNo = autarky(scNo, generation);
  const autarkyWith = autarky(scWith, generation);

  const pvItem = costs.pvPerKwp;
  const batItem = costs.batteryPerKwh;
  const wallItem = costs.wallbox;

  const costPvOnly = recommendPv
    ? bandCost(pvItem.low, pvItem.value, pvItem.high, pvKwp.mid, factor)
    : range(0, 0, 0);
  const costBattery = bandCost(batItem.low, batItem.value, batItem.high, batteryKwh.mid, factor);
  const costWallbox = scaleFixed(wallItem, factor);
  const costPvBattery = recommendPv
    ? sortRange({
        low: costPvOnly.low + costBattery.low,
        mid: costPvOnly.mid + costBattery.mid,
        high: costPvOnly.high + costBattery.high,
      })
    : costBattery;
  const costPvBatteryWallbox = sortRange({
    low: costPvBattery.low + costWallbox.low,
    mid: costPvBattery.mid + costWallbox.mid,
    high: costPvBattery.high + costWallbox.high,
  });

  // Economics with battery (primary recommendation)
  const selfMid = Math.min(totalKwh, generation.mid * scWith.mid);
  const selfLow = Math.min(totalKwh, generation.low * scWith.low);
  const selfHigh = Math.min(totalKwh, generation.high * scWith.high);
  const gridNow = {
    low: totalKwh * price.low,
    mid: totalKwh * price.mid,
    high: totalKwh * price.high,
  };
  const gridWith = {
    low: Math.max(0, totalKwh - selfHigh) * price.low,
    mid: Math.max(0, totalKwh - selfMid) * price.mid,
    high: Math.max(0, totalKwh - selfLow) * price.high,
  };
  const feedKwh = {
    low: Math.max(0, generation.low - selfHigh),
    mid: Math.max(0, generation.mid - selfMid),
    high: Math.max(0, generation.high - selfLow),
  };
  const feedInRevenue = sortRange({
    low: feedKwh.low * feed.low,
    mid: feedKwh.mid * feed.mid,
    high: feedKwh.high * feed.high,
  });
  // Net Stromkosten with system ≈ grid purchase (feed-in shown separately)
  const electricityCostWithSystem = sortRange(gridWith);

  const co2f = prices.co2kgPerKwh.electricity ?? 0.35;
  const co2kgYear = sortRange({
    low: selfLow * co2f * 0.85,
    mid: selfMid * co2f,
    high: selfHigh * co2f * 1.1,
  });

  const loads: Evaluation["loads"] = {
    householdKwh: round0(household.kwh),
    householdAssumed: household.assumed,
    evKwh: round0(ev.kwh),
    evAssumed: ev.assumed,
    evActive: ev.active,
    wpKwh: round0(wp.kwh),
    wpAssumed: wp.assumed,
    wpActive: wp.active,
    totalKwh: round0(totalKwh),
  };

  const facts = collectFacts(draft, loads, climate.label, price.mid, batteryKwh.mid);
  const confidence = scoreConfidence(draft, loads);
  const warnings: string[] = [];
  if (!draft.plz) warnings.push(COPY.plzHint);
  else warnings.push(COPY.plzPriceNote);
  if (household.assumed) warnings.push(COPY.qHouseholdEmpty);
  if (!recommendPv) warnings.push("Photovoltaik bereits vorhanden — kein zweites Vollsystem empfohlen.");
  warnings.push(COPY.grantDisclaimer);

  const path = buildPath(draft, loads, recommendPv);

  const useMeter = draft.hasPv === "yes" || household.assumed;
  const nextSteps = [
    {
      id: "morning",
      label: useMeter ? COPY.morningStepMeter : COPY.morningStep,
      detail: useMeter ? COPY.morningWhereMeter : COPY.morningWhere,
    },
  ];

  return {
    asOf: draft.asOf,
    houseSentence: houseSentence({
      plz: draft.plz,
      evActive: loads.evActive || draft.hasEv === "planned",
      wpActive: loads.wpActive,
    }),
    recommendSentence: recommendSentence(pvKwp, batteryKwh, recommendPv),
    confidence,
    facts,
    loads,
    climate: {
      factor: climate.factor,
      label: climate.label,
      hdd: climate.hdd,
      pvYieldKwhPerKwp: climate.pvYieldKwhPerKwp,
      prefix: climate.prefix,
    },
    recommendPv,
    pvKwp,
    batteryKwh,
    selfConsumptionNoBattery: scNo,
    selfConsumptionWithBattery: scWith,
    autarkyNoBattery: {
      low: round1(autarkyNo.low * 100) / 100,
      mid: round1(autarkyNo.mid * 100) / 100,
      high: round1(autarkyNo.high * 100) / 100,
    },
    autarkyWithBattery: {
      low: round1(autarkyWith.low * 100) / 100,
      mid: round1(autarkyWith.mid * 100) / 100,
      high: round1(autarkyWith.high * 100) / 100,
    },
    costPvOnly: mapRound(costPvOnly),
    costPvBattery: mapRound(costPvBattery),
    costPvBatteryWallbox: mapRound(costPvBatteryWallbox),
    costWallbox: mapRound(costWallbox),
    electricityCostNow: mapRound(sortRange(gridNow)),
    electricityCostWithSystem: mapRound(electricityCostWithSystem),
    feedInRevenue: mapRound(feedInRevenue),
    feedInCt: {
      low: round1(feed.low * 100),
      mid: round1(feed.mid * 100),
      high: round1(feed.high * 100),
    },
    co2kgYear: mapRound(co2kgYear),
    generationKwh: mapRound(generation),
    path,
    nextSteps,
    warnings,
    grantDisclaimer: COPY.grantDisclaimer,
    spanNote: COPY.spanNote,
  };
}

function scaleFixed(item: CostItem, factor: number): Range {
  return sortRange({
    low: item.low * factor,
    mid: item.value * factor,
    high: item.high * factor,
  });
}

function mapRound(r: Range): Range {
  return { low: round0(r.low), mid: round0(r.mid), high: round0(r.high) };
}

function collectFacts(
  draft: Draft,
  loads: Evaluation["loads"],
  climateLabel: string,
  priceMid: number,
  batteryMid: number,
): Fact[] {
  const facts: Fact[] = [];
  const push = (key: string, label: string, value: string, source: Fact["source"]) =>
    facts.push({ key, label, value, source });

  push("plz", "PLZ", draft.plz || "nicht angegeben", draft.plz ? "entered" : "assumed");
  push(
    "household",
    "Strombedarf Haushalt",
    `${round0(loads.householdKwh)} kWh/Jahr`,
    loads.householdAssumed ? "assumed" : "entered",
  );
  if (draft.householdCostEurYear && !draft.householdKwhYear) {
    push("householdCost", "Stromkosten", `${round0(draft.householdCostEurYear)} €/Jahr`, "entered");
  }
  push(
    "ev",
    "E-Auto",
    loads.evActive
      ? `${round0(loads.evKwh)} kWh/Jahr${loads.evAssumed ? " (Annahme)" : ""}`
      : draft.hasEv === "planned"
        ? "geplant"
        : "kein",
    loads.evAssumed || draft.hasEv === "unknown" || draft.hasEv === null ? "assumed" : "entered",
  );
  push(
    "wp",
    "Wärmepumpe (Last)",
    loads.wpActive
      ? `${round0(loads.wpKwh)} kWh/Jahr${loads.wpAssumed ? " (Annahme)" : ""}`
      : "keine",
    loads.wpAssumed || draft.hasHeatPump === "unknown" || draft.hasHeatPump === null
      ? "assumed"
      : "entered",
  );
  push(
    "hasPv",
    "Bestehende PV",
    draft.hasPv === "yes"
      ? draft.existingPvKwp
        ? `${round1(draft.existingPvKwp)} kWp`
        : "ja, Größe offen"
      : draft.hasPv === "none"
        ? "keine"
        : "unbekannt",
    draft.hasPv === "unknown" || (draft.hasPv === "yes" && !draft.existingPvKwp) ? "assumed" : "entered",
  );
  {
    const have = draft.hasBattery === "yes" ? draft.existingBatteryKwh : null;
    const want = draft.batteryKwhOverride;
    if (have) {
      push("battery", "Speicher", `${round1(have)} kWh`, "entered");
    } else if (want) {
      push("battery", "Speicher", `${round1(want)} kWh (von Ihnen)`, "entered");
    } else {
      push("battery", "Speicher", `ca. ${round1(batteryMid)} kWh`, "assumed");
    }
  }
  if (draft.hasEv === "yes" || draft.hasEv === "planned") {
    push(
      "chargeHome",
      "Laden zu Hause / abends",
      draft.chargesAtHome === "yes" ? "ja" : draft.chargesAtHome === "no" ? "nein" : "unbekannt",
      !draft.chargesAtHome || draft.chargesAtHome === "unknown" ? "assumed" : "entered",
    );
    push(
      "wallbox",
      "Wallbox",
      `${round1(draft.wallboxKw ?? 11)} kW`,
      draft.wallboxKw ? "entered" : "assumed",
    );
  }
  push("climate", "Sonne vor Ort", climateLabel, draft.plz ? "entered" : "assumed");
  push("price", "Strompreis", `${round1(priceMid * 100)} ct/kWh`, draft.priceElectricity ? "entered" : "assumed");
  return facts;
}

function scoreConfidence(draft: Draft, loads: Evaluation["loads"]): Evaluation["confidence"] {
  let score = 28;
  const reasons: string[] = ["Orientierung mit Annahmen — keine Planung."];
  if (draft.plz) {
    score += 8;
    reasons.push("PLZ für groben Ertrag.");
  } else reasons.push(COPY.plzHint);
  if (!loads.householdAssumed) {
    score += 16;
    reasons.push("Haushaltsstrom angegeben.");
  } else reasons.push("Haushaltsstrom angenommen (~3500 kWh).");
  if (draft.hasEv && draft.hasEv !== "unknown") score += 8;
  if (loads.evActive && !loads.evAssumed) score += 10;
  else if (loads.evAssumed) reasons.push("E-Auto-Verbrauch angenommen (12.000 km).");
  if (draft.hasHeatPump && draft.hasHeatPump !== "unknown") score += 6;
  if (loads.wpActive && !loads.wpAssumed) score += 8;
  else if (loads.wpAssumed) reasons.push("Wärmepumpen-Strom angenommen (~4000 kWh).");
  if (draft.hasPv !== "unknown") score += 6;
  score = Math.min(78, score);
  const level = score < 42 ? "noch grob" : score < 62 ? "mittel" : "schon brauchbar";
  return { level, score, reasons };
}

export const fixtures = {
  householdOnly80331: {
    ...emptyDraft(),
    plz: "80331",
    householdKwhYear: 3500,
    hasEv: "no" as const,
    hasHeatPump: "no" as const,
    hasPv: "none" as const,
  },
  householdEv15000km: {
    ...emptyDraft(),
    plz: "80331",
    householdKwhYear: 3500,
    hasEv: "yes" as const,
    evKmYear: 15000,
    hasHeatPump: "no" as const,
    hasPv: "none" as const,
  },
  householdWp4000: {
    ...emptyDraft(),
    plz: "80331",
    householdKwhYear: 3500,
    hasEv: "no" as const,
    hasHeatPump: "yes" as const,
    heatPumpKwhYear: 4000,
    hasPv: "none" as const,
  },
  alreadyHasPv: {
    ...emptyDraft(),
    plz: "80331",
    householdKwhYear: 3500,
    hasEv: "no" as const,
    hasHeatPump: "no" as const,
    hasPv: "yes" as const,
  },
};
