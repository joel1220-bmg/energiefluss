import pricesJson from "@/data/energy-prices.de.json";
import { lookupClimate } from "./climate";
import type { BuildingType, Decade, Draft, Heating, HeatResult, Range } from "./types";
import { round0 } from "./types";

type PriceItem = { value: number; low: number; high: number };
type PricesFile = {
  items: Record<string, PriceItem>;
  feedInTariffPv: PriceItem;
  co2kgPerKwh: Record<string, number>;
};

export const prices = pricesJson as PricesFile;

export const SPECIFIC_SPACE_HEAT: Record<Decade, Range> = {
  pre1950: { low: 170, mid: 220, high: 290 },
  "1950-69": { low: 150, mid: 200, high: 260 },
  "1970-89": { low: 120, mid: 165, high: 220 },
  "1990-2001": { low: 80, mid: 115, high: 155 },
  "2002-15": { low: 50, mid: 75, high: 110 },
  from2016: { low: 30, mid: 48, high: 75 },
  unknown: { low: 100, mid: 150, high: 220 },
};

export const TYPE_FACTOR: Record<BuildingType, number> = {
  EFH: 1,
  DHH: 0.88,
  RH: 0.8,
  MFH: 0.72,
  unknown: 1,
};

export const DEFAULT_AREA: Record<BuildingType, number> = {
  EFH: 140,
  DHH: 120,
  RH: 110,
  MFH: 220,
  unknown: 140,
};

export const DEFAULT_PERSONS: Record<BuildingType, number> = {
  EFH: 3,
  DHH: 3,
  RH: 2,
  MFH: 6,
  unknown: 3,
};

export const DEFAULT_UNITS: Record<BuildingType, number> = {
  EFH: 1,
  DHH: 1,
  RH: 1,
  MFH: 4,
  unknown: 1,
};

export const STOREYS: Record<BuildingType, number> = {
  EFH: 1.8,
  DHH: 1.8,
  RH: 2.2,
  MFH: 3,
  unknown: 1.8,
};

export const DHW_KWH_PER_PERSON: Range = { low: 600, mid: 800, high: 1100 };

export function resolvedDecade(d: Decade | null): Exclude<Decade, "unknown"> {
  return !d || d === "unknown" ? "1970-89" : d;
}

export function resolvedType(t: BuildingType | null): Exclude<BuildingType, "unknown"> {
  return !t || t === "unknown" ? "EFH" : t;
}

export function resolvedHeating(h: Heating | null): Heating {
  return !h || h === "unknown" || h === "other" ? "gas" : h;
}

export function heatingEfficiency(heating: Heating, decade: Decade): number {
  const h = heating === "other" || heating === "unknown" ? "gas" : heating;
  if (h === "heatpump") return 1;
  if (h === "nightstorage") return 0.98;
  if (h === "district") return 0.95;
  const dec = resolvedDecade(decade);
  const old = dec === "pre1950" || dec === "1950-69" || dec === "1970-89";
  const mid = dec === "1990-2001";
  if (h === "oil") return old ? 0.78 : mid ? 0.84 : 0.88;
  return old ? 0.82 : mid ? 0.88 : 0.93;
}

export function fabricQualityScore(draft: Draft): number {
  const decade = draft.decade ?? "unknown";
  let s = 0;
  if (decade === "from2016") s += 40;
  else if (decade === "2002-15") s += 32;
  else if (decade === "1990-2001") s += 22;
  else if (decade === "1970-89") s += 10;
  else if (decade === "1950-69") s += 4;
  else if (decade === "unknown") s += 10;

  // Insulation quality dominates Baujahr for WP-vs-Hülle.
  if (draft.insulation === "good") s += 28;
  else if (draft.insulation === "mixed") s += 12;
  else if (draft.insulation === "weak") s += 0;
  else {
    const add = (c: Draft["roof"], pts: number) => {
      if (c === "renewed") s += pts;
      else if (c === "partial") s += Math.round(pts * 0.45);
    };
    add(draft.roof, 10);
    add(draft.facade, 14);
    add(draft.windows, 8);
    add(draft.basement, 4);
  }

  if (draft.alreadyDone.includes("wdvs")) s += 16;
  if (draft.alreadyDone.includes("roofInsulation")) s += 10;
  if (draft.alreadyDone.includes("topFloorCeiling")) s += 8;
  if (draft.alreadyDone.includes("windowTriple")) s += 10;
  if (draft.alreadyDone.includes("basementCeiling")) s += 6;
  if (draft.insulation === "weak") s = Math.min(s, 26);
  return Math.min(100, s);
}

export function jazFor(draft: Draft, climateFactor: number): Range {
  const q = fabricQualityScore(draft);
  let mid = 2.6;
  if (q >= 70) mid = 3.9;
  else if (q >= 50) mid = 3.6;
  else if (q >= 32) mid = 3.2;
  else if (q >= 18) mid = 2.9;
  else mid = 2.55;
  const climateAdj = (climateFactor - 1) * 0.35;
  mid = Math.max(2.2, mid - climateAdj);
  return { low: r1(mid - 0.35), mid: r1(mid), high: r1(mid + 0.4) };
}

function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function impliedFabricReduction(draft: Draft): number {
  if (draft.insulation === "weak") return 1;
  if (draft.insulation === "mixed") return 0.86;
  if (draft.insulation === "good") return 0.7;

  let remain = 1;
  if (draft.alreadyDone.includes("roofInsulation") || draft.roof === "renewed") remain *= 0.85;
  else if (draft.alreadyDone.includes("topFloorCeiling") || draft.roof === "partial") remain *= 0.92;
  if (draft.alreadyDone.includes("wdvs") || draft.facade === "renewed") remain *= 0.78;
  else if (draft.facade === "partial") remain *= 0.9;
  if (draft.alreadyDone.includes("windowTriple") || draft.windows === "renewed") remain *= 0.88;
  else if (draft.windows === "partial") remain *= 0.94;
  if (draft.alreadyDone.includes("basementCeiling") || draft.basement === "renewed") remain *= 0.94;
  else if (draft.basement === "partial") remain *= 0.97;
  return remain;
}

export function resolveArea(draft: Draft): { value: number; assumed: boolean } {
  if (draft.livingAreaM2 && draft.livingAreaM2 > 0) return { value: draft.livingAreaM2, assumed: false };
  return { value: DEFAULT_AREA[draft.buildingType ?? "unknown"], assumed: true };
}

export function resolvePersons(draft: Draft): { value: number; assumed: boolean } {
  if (draft.persons && draft.persons > 0) return { value: draft.persons, assumed: false };
  return { value: DEFAULT_PERSONS[draft.buildingType ?? "unknown"], assumed: true };
}

export function resolveUnits(draft: Draft): number {
  if (draft.dwellingUnits && draft.dwellingUnits > 0) return draft.dwellingUnits;
  return DEFAULT_UNITS[draft.buildingType ?? "unknown"];
}

export function fuelKey(heating: Heating): keyof PricesFile["items"] {
  if (heating === "heatpump" || heating === "nightstorage") return "electricity";
  if (heating === "district") return "district";
  if (heating === "oil") return "oil";
  return "gas";
}

export function priceOf(key: keyof PricesFile["items"], override: number | null | undefined): Range {
  const item = prices.items[key] ?? prices.items.gas;
  if (override && override > 0) return { low: override * 0.92, mid: override, high: override * 1.08 };
  return { low: item.low, mid: item.value, high: item.high };
}

export function currentFuelPrice(draft: Draft): Range {
  const heating = draft.heating ?? "unknown";
  if (heating === "heatpump") return priceOf("heatpump", draft.priceHeatpump ?? draft.priceElectricity);
  return priceOf(fuelKey(heating), draft.priceHeating);
}

export function estimateHeat(draft: Draft): HeatResult {
  const decade = draft.decade ?? "unknown";
  const type = draft.buildingType ?? "unknown";
  const heating = draft.heating ?? "unknown";
  const climate = lookupClimate(draft.plz);
  const area = resolveArea(draft);
  const persons = resolvePersons(draft);
  const spec = SPECIFIC_SPACE_HEAT[decade];
  const tf = TYPE_FACTOR[type];
  const fabric = impliedFabricReduction(draft);
  const space: Range = {
    low: spec.low * area.value * tf * climate.factor * fabric,
    mid: spec.mid * area.value * tf * climate.factor * fabric,
    high: spec.high * area.value * tf * climate.factor * fabric,
  };
  const dhwElectric = draft.dhwElectric === true;
  const dhw: Range = dhwElectric
    ? { low: 0, mid: 0, high: 0 }
    : {
        low: DHW_KWH_PER_PERSON.low * persons.value,
        mid: DHW_KWH_PER_PERSON.mid * persons.value,
        high: DHW_KWH_PER_PERSON.high * persons.value,
      };
  const eff = heatingEfficiency(heating, decade);
  const jaz = jazFor(draft, climate.factor);
  let usedMeteredDemand = false;

  let heatNeed: Range = {
    low: space.low + dhw.low,
    mid: space.mid + dhw.mid,
    high: space.high + dhw.high,
  };

  if (draft.heatingKwhYear && draft.heatingKwhYear > 0) {
    const fuel = draft.heatingKwhYear;
    const heatMid = heating === "heatpump" ? fuel * jaz.mid : fuel * eff;
    const scale = heatMid / Math.max(heatNeed.mid, 1);
    heatNeed = { low: heatNeed.low * scale, mid: heatMid, high: heatNeed.high * scale };
    usedMeteredDemand = true;
  } else if (draft.heatingCostEurYear && draft.heatingCostEurYear > 0) {
    const p = currentFuelPrice(draft);
    const fuel = draft.heatingCostEurYear / p.mid;
    const heatMid = heating === "heatpump" ? fuel * jaz.mid : fuel * eff;
    const scale = heatMid / Math.max(heatNeed.mid, 1);
    heatNeed = { low: heatNeed.low * scale, mid: heatMid, high: heatNeed.high * scale };
    usedMeteredDemand = true;
  }

  const denom = space.mid + dhw.mid || 1;
  const spaceShare = heatNeed.mid > 0 ? space.mid / denom : 0.85;
  const spaceHeat: Range = {
    low: heatNeed.low * spaceShare,
    mid: heatNeed.mid * spaceShare,
    high: heatNeed.high * spaceShare,
  };
  const dhwOut: Range = {
    low: heatNeed.low - spaceHeat.low,
    mid: heatNeed.mid - spaceHeat.mid,
    high: heatNeed.high - spaceHeat.high,
  };

  let fuelKwh: Range;
  if (heating === "heatpump") {
    fuelKwh = {
      low: heatNeed.low / jaz.high,
      mid: heatNeed.mid / jaz.mid,
      high: heatNeed.high / jaz.low,
    };
  } else {
    fuelKwh = {
      low: heatNeed.low / eff,
      mid: heatNeed.mid / eff,
      high: heatNeed.high / eff,
    };
  }

  const usedPrice = currentFuelPrice(draft);
  const cost: Range = {
    low: fuelKwh.low * usedPrice.low,
    mid: fuelKwh.mid * usedPrice.mid,
    high: fuelKwh.high * usedPrice.high,
  };
  const co2key = heating === "unknown" || heating === "other" ? "gas" : heating;
  const co2f = prices.co2kgPerKwh[co2key] ?? prices.co2kgPerKwh.gas;
  const co2: Range = {
    low: fuelKwh.low * co2f,
    mid: fuelKwh.mid * co2f,
    high: fuelKwh.high * co2f,
  };

  return {
    spaceHeatKwh: mapR(spaceHeat, round0),
    dhwKwh: mapR(dhwOut, round0),
    fuelKwh: mapR(fuelKwh, round0),
    costEurYear: mapR(cost, round0),
    co2kgYear: mapR(co2, round0),
    specificKwhM2: mapR(
      {
        low: spaceHeat.low / area.value,
        mid: spaceHeat.mid / area.value,
        high: spaceHeat.high / area.value,
      },
      round0,
    ),
    efficiency: eff,
    jaz,
    usedMeteredDemand,
    climate: {
      factor: climate.factor,
      label: climate.label,
      hdd: climate.hdd,
      pvYieldKwhPerKwp: climate.pvYieldKwhPerKwp,
      prefix: climate.prefix,
    },
  };
}

function mapR(r: Range, fn: (n: number) => number): Range {
  return { low: fn(r.low), mid: fn(r.mid), high: fn(r.high) };
}
