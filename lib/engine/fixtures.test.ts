import { describe, expect, it } from "vitest";
import { lookupClimate } from "./climate";
import { evaluate, fixtures } from "./evaluate";
import { estimateHeat } from "./heat";
import { COPY, houseSentence } from "./labels";
import { emptyDraft } from "./types";

describe("1974 EFH gas 140m² 80331", () => {
  const ev = evaluate(fixtures.efh1974gas);

  it("uses Munich climate", () => {
    const c = lookupClimate("80331");
    expect(c.prefix).toBe("80");
    expect(c.factor).toBeCloseTo(1.06);
    expect(ev.heat.climate.factor).toBeCloseTo(1.06);
  });

  it("estimates a wide 70s demand band, not a fake point", () => {
    const h = estimateHeat(fixtures.efh1974gas);
    expect(h.specificKwhM2.mid).toBeGreaterThan(140);
    expect(h.specificKwhM2.high).toBeGreaterThan(h.specificKwhM2.low + 40);
    expect(h.spaceHeatKwh.mid).toBeGreaterThan(20000);
  });

  it("puts cheap fabric + balancing now, WP later when insulation unknown", () => {
    expect(ev.path.jetzt).toContain("hydraulicBalancing");
    expect(ev.path.jetzt).toContain("topFloorCeiling");
    expect(ev.wpReadiness.recommend).toBe("spaeter");
    expect(ev.path.spaeter).toContain("heatPumpAirWater");
    expect(ev.path.jetzt).not.toContain("heatPumpAirWater");
  });

  it("uses locked house sentence", () => {
    expect(ev.houseSentence).toBe(
      "Einfamilienhaus aus den 1970ern mit Gas in 80xxx — erster Blick, noch grob.",
    );
    expect(ev.pathSentence.startsWith("Am sinnvollsten jetzt:")).toBe(true);
    expect(ev.gmodgNote).toBe(COPY.gmodg);
    expect(ev.grantDisclaimer).toBe(COPY.grantDisclaimer);
  });

  it("never applies GModG 65% to grants", () => {
    const wp = ev.measures.find((m) => m.id === "heatPumpAirWater");
    expect(wp).toBeTruthy();
    const implied = wp!.grant.mid / Math.max(wp!.cost.mid, 1);
    expect(implied).toBeLessThan(0.65);
    expect(ev.wertschoepfungNote.toLowerCase()).toMatch(/nicht/);
  });
});

describe("1998 DHH oil", () => {
  it("treats mixed fabric as WP-bald, not jetzt", () => {
    const ev = evaluate(fixtures.dhh1998oil);
    expect(ev.path.jetzt).toContain("hydraulicBalancing");
    expect(ev.wpReadiness.recommend).toBe("bald");
    expect(ev.path.bald).toContain("heatPumpAirWater");
    expect(ev.houseSentence).toMatch(/Doppelhaushälfte aus den 1990ern mit Öl/);
  });
});

describe("2012 EFH WP+PV", () => {
  it("does not sell a new pump or PV", () => {
    const ev = evaluate(fixtures.efh2012wpPv);
    const wp = ev.measures.find((m) => m.id === "heatPumpAirWater");
    const pv = ev.measures.find((m) => m.id === "pvWithStorage");
    expect(wp?.applicable).toBe(false);
    expect(pv?.applicable).toBe(false);
    expect(ev.path.jetzt).not.toContain("heatPumpAirWater");
    expect(ev.houseSentence).toMatch(/Wärmepumpe/);
  });
});

describe("copy and softness", () => {
  it("allows empty PLZ and Weiß ich nicht", () => {
    const ev = evaluate({
      ...emptyDraft(),
      buildingType: "unknown",
      decade: "unknown",
      heating: "unknown",
      plz: "",
    });
    expect(ev.houseSentence).toMatch(/ohne PLZ/);
    expect(ev.warnings.some((w) => w === COPY.plzEmpty)).toBe(true);
    expect(ev.measures.some((m) => m.applicable)).toBe(true);
  });

  it("insulation weak vs good flips WP horizon on same 1974 house", () => {
    const weak = evaluate({ ...fixtures.efh1974gas, insulation: "weak" });
    const good = evaluate({ ...fixtures.efh1974gas, insulation: "good" });
    expect(weak.wpReadiness.recommend).toBe("spaeter");
    expect(good.wpReadiness.recommend).toBe("bald");
  });

  it("houseSentence helper matches lock", () => {
    expect(
      houseSentence({
        buildingType: "EFH",
        decade: "1970-89",
        heating: "gas",
        plz: "80331",
      }),
    ).toBe("Einfamilienhaus aus den 1970ern mit Gas in 80xxx — erster Blick, noch grob.");
  });
});
