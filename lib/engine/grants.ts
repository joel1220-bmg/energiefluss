import fundingJson from "@/data/funding.beg-2026-07.json";
import type { IncomeBand } from "./types";

/** KfW 458 + BAFA envelope + EBW. GModG 65% is intentionally absent. Wertschöpfung inactive. */

export type FundingData = typeof fundingJson;

export const funding = fundingJson;

export type Kfw458Input = {
  eligibleCost: number;
  dwellingUnits: number;
  asOf: string;
  climateBonus: boolean;
  incomeBand: IncomeBand;
  hasMinorChild: boolean;
};

export type Kfw458Result = {
  rate: number;
  uncappedRate: number;
  climateRate: number;
  incomeRate: number;
  capRate: number;
  costCap: number;
  eligibleCost: number;
  grant: number;
  program: "kfw458";
  wertschoepfungApplied: false;
};

export type BafaEnvelopeInput = {
  eligibleCost: number;
  dwellingUnits: number;
  includeIsfp: boolean;
};

export type BafaEnvelopeResult = {
  baseGrant: number;
  isfpGrant: number;
  grant: number;
  effectiveRate: number;
  costCap: number;
  minInvestmentForBonus: number;
  bonusApplied: boolean;
  program: "bafaEnvelope";
};

function cmpIso(a: string, b: string): number {
  return a.localeCompare(b);
}

export function climateSpeedBonusRate(asOf: string): number {
  const schedule = funding.kfw458.rates.climateSpeedBonus.schedule;
  for (const row of schedule) {
    if (cmpIso(asOf, row.validFrom) < 0) continue;
    if (row.validTo && cmpIso(asOf, row.validTo) > 0) continue;
    return row.rate;
  }
  return 0;
}

/** Unit-1 eligible-cost cap, −750 € each Feb 1 / Aug 1 from 2027-02-01. */
export function kfwUnit1Cap(asOf: string): number {
  const spec = funding.kfw458.eligibleCostCaps.unit1;
  const base = spec.value;
  const step = spec.stepDownEUR;
  const anchor = spec.stepScheduleAnchor;
  if (cmpIso(asOf, anchor) < 0) return base;
  let steps = 0;
  let y = 2027;
  let monthDay: "02-01" | "08-01" = "02-01";
  while (true) {
    const stamp = `${y}-${monthDay}`;
    if (cmpIso(asOf, stamp) < 0) break;
    steps += 1;
    if (monthDay === "02-01") monthDay = "08-01";
    else {
      monthDay = "02-01";
      y += 1;
    }
    if (steps > 40) break;
  }
  return Math.max(0, base - steps * step);
}

export function kfwCostCap(asOf: string, units: number): number {
  const n = Math.max(1, Math.round(units));
  let cap = kfwUnit1Cap(asOf);
  const u2 = funding.kfw458.eligibleCostCaps.units2to6.value;
  const u7 = funding.kfw458.eligibleCostCaps.units7plus.value;
  for (let i = 2; i <= n; i++) {
    cap += i <= 6 ? u2 : u7;
  }
  return cap;
}

export function incomeThresholds(hasMinorChild: boolean): { max: number; rate: number }[] {
  const bump = hasMinorChild ? funding.kfw458.rates.incomeBonus.familySurcharge.value : 0;
  return funding.kfw458.rates.incomeBonus.tiers.map((t) => ({
    max: t.maxTaxableIncomeEUR + bump,
    rate: t.rate.value,
  }));
}

export function incomeBonusRate(band: IncomeBand, hasMinorChild: boolean): number {
  if (band === "preferNot" || band === "above") return 0;
  const representative: Record<Exclude<IncomeBand, "preferNot" | "above">, number> = {
    upto30k: 30000,
    upto40k: 40000,
    upto50k: 50000,
  };
  const income = representative[band];
  const tiers = incomeThresholds(hasMinorChild);
  for (const t of tiers) {
    if (income <= t.max) return t.rate;
  }
  return 0;
}

export function kfwCapRate(incomeRate: number): number {
  return incomeRate >= 0.4
    ? funding.kfw458.rates.capRate.lowIncome.value
    : funding.kfw458.rates.capRate.default.value;
}

export function computeKfw458(input: Kfw458Input): Kfw458Result {
  const climateRate = input.climateBonus ? climateSpeedBonusRate(input.asOf) : 0;
  const incomeRate = incomeBonusRate(input.incomeBand, input.hasMinorChild);
  const uncapped = funding.kfw458.rates.base.value + climateRate + incomeRate;
  const capRate = kfwCapRate(incomeRate);
  const rate = Math.min(uncapped, capRate);
  const costCap = kfwCostCap(input.asOf, input.dwellingUnits);
  const eligibleCost = Math.min(Math.max(0, input.eligibleCost), costCap);
  const grant = Math.round(eligibleCost * rate);
  return {
    rate,
    uncappedRate: uncapped,
    climateRate,
    incomeRate,
    capRate,
    costCap,
    eligibleCost,
    grant,
    program: "kfw458",
    wertschoepfungApplied: false,
  };
}

export function isfpMinInvestment(units: number): number {
  const n = Math.max(1, Math.round(units));
  const one = funding.bafaBegEmEnvelope.iSfpBonus.minEligibleInvestment.oneUnit.value;
  if (n <= 1) return one;
  // 30k + 15k per further unit up to 6 (seed multiUnitRule)
  const extra = Math.min(n - 1, 5) * 15000;
  return one + extra;
}

export function bafaEnvelopeCap(units: number, withBonus: boolean): number {
  const n = Math.max(1, Math.round(units));
  const u1 = withBonus ? 60000 : 30000;
  const u2 = withBonus ? 30000 : 15000;
  const u7 = withBonus ? 15000 : 15000;
  let cap = u1;
  for (let i = 2; i <= n; i++) cap += i <= 6 ? u2 : u7;
  return cap;
}

export function computeBafaEnvelope(input: BafaEnvelopeInput): BafaEnvelopeResult {
  const minInv = isfpMinInvestment(input.dwellingUnits);
  const wantBonus = input.includeIsfp && input.eligibleCost >= minInv;
  const costCap = bafaEnvelopeCap(input.dwellingUnits, wantBonus || input.includeIsfp);
  // Raised cap only if iSFP path is chosen; bonus still only above min volume.
  const capped = Math.min(Math.max(0, input.eligibleCost), costCap);
  const baseRate = funding.bafaBegEmEnvelope.baseRate.value;
  const bonusRate = funding.bafaBegEmEnvelope.iSfpBonus.rate.value;
  const baseGrant = capped * baseRate;
  let isfpGrant = 0;
  if (wantBonus) {
    isfpGrant = Math.max(0, capped - minInv) * bonusRate;
  }
  const grant = Math.round(baseGrant + isfpGrant);
  return {
    baseGrant: Math.round(baseGrant),
    isfpGrant: Math.round(isfpGrant),
    grant,
    effectiveRate: capped > 0 ? grant / capped : 0,
    costCap,
    minInvestmentForBonus: minInv,
    bonusApplied: wantBonus,
    program: "bafaEnvelope",
  };
}

export function computeBafaEbw(opts: {
  dwellingUnits: number;
  fee: number;
  wegPresentation?: boolean;
}): { grant: number; maxGrant: number; rate: number } {
  const rate = funding.bafaEbw.rate.value;
  const max =
    opts.dwellingUnits >= 3
      ? funding.bafaEbw.maxGrant.mfh3plus.value
      : funding.bafaEbw.maxGrant.efhZfh.value;
  const extra = opts.wegPresentation ? funding.bafaEbw.maxGrant.wegPresentationBonus.value : 0;
  const grant = Math.min(opts.fee * rate, max) + extra;
  return { grant: Math.round(grant), maxGrant: max + extra, rate };
}

/** Planned Q1 2027 — must stay 0 until JSON marks it active. */
export function wertschoepfungsbonus(): number {
  return 0;
}

export function gmodgNotInGrantMath(): true {
  return true;
}
