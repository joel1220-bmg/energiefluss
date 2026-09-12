import { describe, expect, it } from "vitest";
import { lookupClimate } from "./climate";
import { evaluate, fixtures } from "./evaluate";
import { COPY, houseSentence } from "./labels";
import { emptyDraft } from "./types";

describe("household-only 3500 kWh 80331", () => {
  const ev = evaluate(fixtures.householdOnly80331);

  it("uses Munich climate yield", () => {
    const c = lookupClimate("80331");
    expect(c.prefix).toBe("80");
    expect(c.pvYieldKwhPerKwp).toBe(1050);
    expect(ev.climate.pvYieldKwhPerKwp).toBe(1050);
  });

  it("sizes PV for household load only", () => {
    expect(ev.loads.totalKwh).toBe(3500);
    expect(ev.loads.evKwh).toBe(0);
    expect(ev.loads.wpKwh).toBe(0);
    expect(ev.recommendPv).toBe(true);
    // 3500/1050*1.05 ≈ 3.5 → clamped to 4
    expect(ev.pvKwp.mid).toBeGreaterThanOrEqual(4);
    expect(ev.pvKwp.mid).toBeLessThanOrEqual(15);
    expect(ev.pvKwp.high).toBeGreaterThan(ev.pvKwp.low);
  });

  it("house sentence ohne E-Auto", () => {
    expect(ev.houseSentence).toBe(
      "Für Ihren Haushalt in 80xxx ohne E-Auto — erster Blick auf Solarstrom und Speicher, noch grob.",
    );
    expect(ev.grantDisclaimer).toBe(COPY.grantDisclaimer);
  });
});

describe("household + EV 15000 km", () => {
  it("adds EV load and bumps battery", () => {
    const ev = evaluate(fixtures.householdEv15000km);
    expect(ev.loads.evActive).toBe(true);
    expect(ev.loads.evKwh).toBe(2700); // 15000 * 0.18
    expect(ev.loads.totalKwh).toBe(3500 + 2700);
    expect(ev.houseSentence).toMatch(/mit E-Auto/);
    const noEv = evaluate(fixtures.householdOnly80331);
    expect(ev.batteryKwh.mid).toBeGreaterThan(noEv.batteryKwh.mid);
    expect(ev.pvKwp.mid).toBeGreaterThan(noEv.pvKwp.mid);
  });
});

describe("household + WP 4000 kWh", () => {
  it("treats Wärmepumpe as load only", () => {
    const ev = evaluate(fixtures.householdWp4000);
    expect(ev.loads.wpActive).toBe(true);
    expect(ev.loads.wpKwh).toBe(4000);
    expect(ev.loads.totalKwh).toBe(7500);
    expect(ev.houseSentence).toMatch(/Wärmepumpe als Stromlast/);
    // Must not recommend installing a heat pump
    expect(JSON.stringify(ev.path)).not.toMatch(/Wärmepumpe einbauen|WP install/i);
    expect(ev.recommendSentence).toMatch(/kWp/);
  });
});

describe("already has PV", () => {
  it("does not recommend a second full PV", () => {
    const ev = evaluate(fixtures.alreadyHasPv);
    expect(ev.recommendPv).toBe(false);
    expect(ev.costPvOnly.mid).toBe(0);
    expect(ev.recommendSentence).toMatch(/Bestehende PV|kein zweites/i);
    expect(ev.batteryKwh.mid).toBeGreaterThan(0);
  });
});

describe("defaults and softness", () => {
  it("assumes 3500 kWh when empty", () => {
    const ev = evaluate({
      ...emptyDraft(),
      hasEv: "no",
      hasHeatPump: "no",
      hasPv: "none",
    });
    expect(ev.loads.householdAssumed).toBe(true);
    expect(ev.loads.householdKwh).toBe(3500);
  });

  it("assumes 2160 kWh EV when Ja without numbers", () => {
    const ev = evaluate({
      ...emptyDraft(),
      householdKwhYear: 3500,
      hasEv: "yes",
      hasHeatPump: "no",
    });
    expect(ev.loads.evAssumed).toBe(true);
    expect(ev.loads.evKwh).toBe(2160);
  });

  it("assumes 4000 kWh WP when Ja without numbers", () => {
    const ev = evaluate({
      ...emptyDraft(),
      householdKwhYear: 3500,
      hasEv: "no",
      hasHeatPump: "yes",
    });
    expect(ev.loads.wpAssumed).toBe(true);
    expect(ev.loads.wpKwh).toBe(4000);
  });

  it("houseSentence helper matches lock", () => {
    expect(
      houseSentence({ plz: "80331", evActive: true, wpActive: true }),
    ).toBe(
      "Für Ihren Haushalt in 80xxx mit E-Auto und Wärmepumpe als Stromlast — erster Blick auf Solarstrom und Speicher, noch grob.",
    );
  });

  it("feed-in comes from EEG seed as ct range", () => {
    const ev = evaluate(fixtures.householdOnly80331);
    expect(ev.feedInCt.low).toBeGreaterThanOrEqual(7);
    expect(ev.feedInCt.high).toBeLessThanOrEqual(9);
  });
});
