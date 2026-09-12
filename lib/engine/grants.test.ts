import { describe, expect, it } from "vitest";
import {
  climateSpeedBonusRate,
  computeBafaEbw,
  computeBafaEnvelope,
  computeKfw458,
  gmodgNotInGrantMath,
  kfwUnit1Cap,
  wertschoepfungsbonus,
} from "./grants";

describe("KfW 458", () => {
  it("uses 16% climate bonus and 28k cap on 2026-09-12", () => {
    expect(climateSpeedBonusRate("2026-09-12")).toBe(0.16);
    expect(kfwUnit1Cap("2026-09-12")).toBe(28000);
    const r = computeKfw458({
      eligibleCost: 33500,
      dwellingUnits: 1,
      asOf: "2026-09-12",
      climateBonus: true,
      incomeBand: "preferNot",
      hasMinorChild: false,
    });
    expect(r.rate).toBeCloseTo(0.46);
    expect(r.grant).toBe(12880);
    expect(r.wertschoepfungApplied).toBe(false);
  });

  it("caps 80% for lowest income band", () => {
    const r = computeKfw458({
      eligibleCost: 33500,
      dwellingUnits: 1,
      asOf: "2026-09-12",
      climateBonus: true,
      incomeBand: "upto30k",
      hasMinorChild: false,
    });
    expect(r.uncappedRate).toBeCloseTo(0.86);
    expect(r.rate).toBeCloseTo(0.8);
    expect(r.grant).toBe(22400);
  });

  it("raises income thresholds by 10k with a child", () => {
    const r = computeKfw458({
      eligibleCost: 28000,
      dwellingUnits: 1,
      asOf: "2026-09-12",
      climateBonus: true,
      incomeBand: "upto40k",
      hasMinorChild: true,
    });
    // 40k + child bump 10k → still in 40% tier (threshold 40k)
    expect(r.incomeRate).toBeCloseTo(0.4);
  });

  it("steps climate bonus and unit1 cap on 2027-02-01", () => {
    expect(climateSpeedBonusRate("2027-02-01")).toBe(0.12);
    expect(kfwUnit1Cap("2027-02-01")).toBe(27250);
    const r = computeKfw458({
      eligibleCost: 40000,
      dwellingUnits: 1,
      asOf: "2027-02-01",
      climateBonus: true,
      incomeBand: "preferNot",
      hasMinorChild: false,
    });
    expect(r.rate).toBeCloseTo(0.42);
    expect(r.grant).toBe(Math.round(27250 * 0.42));
  });

  it("climate bonus 0 from 2028-08-01", () => {
    expect(climateSpeedBonusRate("2028-08-01")).toBe(0);
    expect(kfwUnit1Cap("2028-08-01")).toBe(25000);
  });

  it("does not include Effizienzbonus or GModG 65%", () => {
    expect(gmodgNotInGrantMath()).toBe(true);
    const r = computeKfw458({
      eligibleCost: 28000,
      dwellingUnits: 1,
      asOf: "2026-09-12",
      climateBonus: true,
      incomeBand: "preferNot",
      hasMinorChild: false,
    });
    expect(r.rate).toBeLessThan(0.65);
    expect(wertschoepfungsbonus()).toBe(0);
  });
});

describe("BAFA envelope iSFP", () => {
  it("keeps 15% and adds 5pp only above 30k for EFH", () => {
    const below = computeBafaEnvelope({
      eligibleCost: 20000,
      dwellingUnits: 1,
      includeIsfp: true,
    });
    expect(below.bonusApplied).toBe(false);
    expect(below.grant).toBe(3000);

    const mid = computeBafaEnvelope({
      eligibleCost: 40000,
      dwellingUnits: 1,
      includeIsfp: true,
    });
    expect(mid.bonusApplied).toBe(true);
    expect(mid.grant).toBe(6500); // 15%*40k + 5%*10k

    const high = computeBafaEnvelope({
      eligibleCost: 60000,
      dwellingUnits: 1,
      includeIsfp: true,
    });
    expect(high.grant).toBe(10500); // 15%*60k + 5%*30k — not 20%
    expect(high.effectiveRate).toBeCloseTo(0.175);
  });

  it("without iSFP stays 15% even on large volume", () => {
    const r = computeBafaEnvelope({
      eligibleCost: 60000,
      dwellingUnits: 1,
      includeIsfp: false,
    });
    expect(r.bonusApplied).toBe(false);
    expect(r.costCap).toBe(30000);
    expect(r.grant).toBe(4500); // 15% of 30k cap, not 20% of 60k
  });
});

describe("BAFA EBW", () => {
  it("caps EFH at 650", () => {
    const r = computeBafaEbw({ dwellingUnits: 1, fee: 1700 });
    expect(r.grant).toBe(650);
  });
  it("caps MFH at 850 plus optional WEG 250", () => {
    const r = computeBafaEbw({ dwellingUnits: 4, fee: 2000, wegPresentation: true });
    expect(r.grant).toBe(1100);
  });
});
