/** Shared types for the client-side PV + Speicher orientation engine. No I/O, no eval. */

export type TriState = "yes" | "no" | "unknown";
export type EvState = "yes" | "planned" | "no" | "unknown";
export type HasPvState = "none" | "yes" | "unknown";
export type Horizon = "jetzt" | "bald" | "spaeter";
export type ConfidenceLevel = "noch grob" | "mittel" | "schon brauchbar";
export type FieldSource = "entered" | "assumed";

export type Range = { low: number; mid: number; high: number };

export type Draft = {
  plz: string;
  householdKwhYear: number | null;
  householdCostEurYear: number | null;
  hasEv: EvState | null;
  evKmYear: number | null;
  evKwhYear: number | null;
  hasHeatPump: TriState | null;
  heatPumpKwhYear: number | null;
  hasPv: HasPvState;
  /** EUR per kWh override; null = seed price */
  priceElectricity: number | null;
  /** Fine-tune overrides; null = engine recommendation mid */
  pvKwpOverride: number | null;
  batteryKwhOverride: number | null;
  costFactor: number;
  asOf: string;
};

export type Fact = { key: string; label: string; value: string; source: FieldSource };

export type PathCard = {
  horizon: Horizon;
  title: string;
  sub: string;
  items: string[];
};

export type Evaluation = {
  asOf: string;
  houseSentence: string;
  recommendSentence: string;
  confidence: {
    level: ConfidenceLevel;
    score: number;
    reasons: string[];
  };
  facts: Fact[];
  loads: {
    householdKwh: number;
    householdAssumed: boolean;
    evKwh: number;
    evAssumed: boolean;
    evActive: boolean;
    wpKwh: number;
    wpAssumed: boolean;
    wpActive: boolean;
    totalKwh: number;
  };
  climate: {
    factor: number;
    label: string;
    hdd: number;
    pvYieldKwhPerKwp: number;
    prefix: string;
  };
  /** false when existing PV → no second full system */
  recommendPv: boolean;
  pvKwp: Range;
  batteryKwh: Range;
  selfConsumptionNoBattery: Range;
  selfConsumptionWithBattery: Range;
  autarkyNoBattery: Range;
  autarkyWithBattery: Range;
  costPvOnly: Range;
  costPvBattery: Range;
  costPvBatteryWallbox: Range;
  costWallbox: Range;
  electricityCostNow: Range;
  electricityCostWithSystem: Range;
  feedInRevenue: Range;
  feedInCt: Range;
  co2kgYear: Range;
  generationKwh: Range;
  path: PathCard[];
  nextSteps: { id: string; label: string; detail: string }[];
  warnings: string[];
  grantDisclaimer: string;
  spanNote: string;
};

export function emptyDraft(asOf = "2026-09-12"): Draft {
  return {
    plz: "",
    householdKwhYear: null,
    householdCostEurYear: null,
    hasEv: null,
    evKmYear: null,
    evKwhYear: null,
    hasHeatPump: null,
    heatPumpKwhYear: null,
    hasPv: "unknown",
    priceElectricity: null,
    pvKwpOverride: null,
    batteryKwhOverride: null,
    costFactor: 1,
    asOf,
  };
}

/** EV + Wärmepumpe chosen (Weiß ich nicht counts). Strombedarf/PLZ optional. */
export function isCoreComplete(d: Draft): boolean {
  return d.hasEv !== null && d.hasHeatPump !== null;
}

export function range(low: number, mid: number, high: number): Range {
  return { low, mid, high };
}

export function scaleRange(r: Range, f: number): Range {
  return { low: r.low * f, mid: r.mid * f, high: r.high * f };
}

export function addRange(a: Range, b: Range): Range {
  return { low: a.low + b.low, mid: a.mid + b.mid, high: a.high + b.high };
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function round0(n: number): number {
  return Math.round(n);
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function sortRange(r: Range): Range {
  const [low, mid, high] = [r.low, r.mid, r.high].sort((a, b) => a - b);
  return { low, mid, high };
}
