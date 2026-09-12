/** Shared types for the client-side orientation engine. No I/O, no eval. */

export type BuildingType = "EFH" | "DHH" | "RH" | "MFH" | "unknown";
export type Decade =
  | "pre1950"
  | "1950-69"
  | "1970-89"
  | "1990-2001"
  | "2002-15"
  | "from2016"
  | "unknown";
export type Heating =
  | "gas"
  | "oil"
  | "heatpump"
  | "district"
  | "nightstorage"
  | "other"
  | "unknown";
export type Insulation = "weak" | "mixed" | "good" | "unknown";
export type Condition = "original" | "partial" | "renewed" | "none" | "unknown";
export type Goal = "cost" | "comfort" | "climate" | "independence";
export type IncomeBand = "upto30k" | "upto40k" | "upto50k" | "above" | "preferNot";
export type Horizon = "jetzt" | "bald" | "spaeter";
export type ConfidenceLevel = "niedrig" | "mittel" | "mittelhoch";

export type MeasureId =
  | "hydraulicBalancing"
  | "topFloorCeiling"
  | "basementCeiling"
  | "roofInsulation"
  | "wdvs"
  | "windowTriple"
  | "heatPumpAirWater"
  | "pvWithStorage"
  | "ventilationCentral"
  | "energyAdvice";

export type Range = { low: number; mid: number; high: number };

export type FieldSource = "entered" | "assumed";

export type Draft = {
  plz: string;
  buildingType: BuildingType | null;
  decade: Decade | null;
  heating: Heating | null;
  insulation: Insulation;
  livingAreaM2: number | null;
  persons: number | null;
  heatingCostEurYear: number | null;
  heatingKwhYear: number | null;
  dhwElectric: boolean | "unknown";
  roof: Condition;
  facade: Condition;
  windows: Condition;
  basement: Condition;
  hasPv: boolean | "unknown";
  goals: Goal[];
  incomeBand: IncomeBand;
  hasMinorChild: boolean;
  climateBonus: boolean | "auto";
  costFactor: number;
  priceHeating: number | null;
  priceElectricity: number | null;
  priceHeatpump: number | null;
  alreadyDone: MeasureId[];
  asOf: string;
  includeIsfp: boolean;
  dwellingUnits: number | null;
};

export type Fact = { key: string; label: string; value: string; source: FieldSource };

export type MeasureResult = {
  id: MeasureId;
  title: string;
  shortTitle: string;
  summary: string;
  horizon: Horizon;
  cost: Range;
  grant: Range;
  net: Range;
  savingEurYear: Range;
  paybackYears: Range | null;
  co2kgYear: Range;
  risk: string;
  grantProgram: string;
  applicable: boolean;
  skippedReason?: string;
};

export type PackageResult = {
  id: string;
  title: string;
  subtitle: string;
  measureIds: MeasureId[];
  cost: Range;
  grant: Range;
  net: Range;
  savingEurYear: Range;
  paybackYears: Range | null;
  co2kgYear: Range;
};

export type HeatResult = {
  spaceHeatKwh: Range;
  dhwKwh: Range;
  fuelKwh: Range;
  costEurYear: Range;
  co2kgYear: Range;
  specificKwhM2: Range;
  efficiency: number;
  jaz: Range;
  usedMeteredDemand: boolean;
  climate: {
    factor: number;
    label: string;
    hdd: number;
    pvYieldKwhPerKwp: number;
    prefix: string;
  };
};

export type Evaluation = {
  asOf: string;
  houseSentence: string;
  pathSentence: string;
  confidence: {
    level: ConfidenceLevel;
    score: number;
    reasons: string[];
  };
  facts: Fact[];
  heat: HeatResult;
  wpReadiness: {
    score: number;
    label: string;
    recommend: Horizon | "skip";
    caveat: string;
  };
  measures: MeasureResult[];
  path: { jetzt: MeasureId[]; bald: MeasureId[]; spaeter: MeasureId[] };
  packages: PackageResult[];
  nextSteps: { id: string; label: string; detail: string }[];
  warnings: string[];
  gmodgNote: string;
  grantDisclaimer: string;
  wertschoepfungNote: string;
};

export function emptyDraft(asOf = "2026-09-12"): Draft {
  return {
    plz: "",
    buildingType: null,
    decade: null,
    heating: null,
    insulation: "unknown",
    livingAreaM2: null,
    persons: null,
    heatingCostEurYear: null,
    heatingKwhYear: null,
    dhwElectric: "unknown",
    roof: "unknown",
    facade: "unknown",
    windows: "unknown",
    basement: "unknown",
    hasPv: "unknown",
    goals: [],
    incomeBand: "preferNot",
    hasMinorChild: false,
    climateBonus: "auto",
    costFactor: 1,
    priceHeating: null,
    priceElectricity: null,
    priceHeatpump: null,
    alreadyDone: [],
    asOf,
    includeIsfp: true,
    dwellingUnits: null,
  };
}

/** Four answers are enough; Weiß ich nicht counts. PLZ may be empty. */
export function isCoreComplete(d: Draft): boolean {
  return d.buildingType !== null && d.decade !== null && d.heating !== null;
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
