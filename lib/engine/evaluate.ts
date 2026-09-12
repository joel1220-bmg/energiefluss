import costsJson from "@/data/costs.de.json";
import {
  computeBafaEbw,
  computeBafaEnvelope,
  computeKfw458,
  wertschoepfungsbonus,
} from "./grants";
import {
  STOREYS,
  currentFuelPrice,
  estimateHeat,
  fabricQualityScore,
  priceOf,
  prices,
  resolveArea,
  resolveUnits,
} from "./heat";
import {
  BUILDING_LABEL,
  COPY,
  DECADE_CHIP,
  HEATING_CHIP,
  INSULATION_CHIP,
  MEASURE_TITLE,
  houseSentence,
  pathSentence,
} from "./labels";
import type {
  Draft,
  Evaluation,
  Fact,
  HeatResult,
  Horizon,
  MeasureId,
  MeasureResult,
  PackageResult,
  Range,
} from "./types";
import { addRange, clamp, emptyDraft, range, round0, scaleRange, sortRange } from "./types";

type CostItem = { value: number; low: number; high: number; unit: string };
const costs = costsJson.items as Record<string, CostItem>;

const GRANT_FOOT = COPY.grantDisclaimer;

function done(draft: Draft, id: MeasureId): boolean {
  return draft.alreadyDone.includes(id);
}

function autoClimateBonus(draft: Draft): boolean {
  if (draft.climateBonus === true) return true;
  if (draft.climateBonus === false) return false;
  const h = draft.heating;
  if (h === "oil" || h === "nightstorage") return true;
  if (h === "gas" && draft.decade !== "from2016") return true;
  return false;
}

export function wpReadiness(draft: Draft): Evaluation["wpReadiness"] {
  if (draft.heating === "heatpump" || done(draft, "heatPumpAirWater")) {
    return {
      score: 100,
      label: "bereits Wärmepumpe",
      recommend: "skip",
      caveat: "Kein Tausch empfohlen — bestehende Anlage nicht überplanen.",
    };
  }
  if (draft.heating === "district") {
    return {
      score: 20,
      label: "Fernwärme",
      recommend: "skip",
      caveat: "Fernwärme bleibt meist der Pfad; WP nur in Sonderfällen.",
    };
  }
  let score = fabricQualityScore(draft);
  if (draft.insulation === "weak") score = Math.min(score, 26);
  if (draft.insulation === "good") score = Math.max(score, 54);
  if (draft.insulation === "unknown") {
    const old =
      draft.decade === "pre1950" ||
      draft.decade === "1950-69" ||
      draft.decade === "1970-89" ||
      draft.decade === "unknown" ||
      !draft.decade;
    if (old) score = Math.min(score, 28);
  }
  if (score < 30) {
    return {
      score,
      label: "Hülle zuerst",
      recommend: "spaeter",
      caveat: "Wärmepumpe erst plausibel, wenn Dämmung und Verteilung mitgehen. Nicht überplanen.",
    };
  }
  if (score < 50) {
    return {
      score,
      label: "Grenzfall",
      recommend: "bald",
      caveat: "WP denkbar, aber Vorlauftemperatur und Hülle vorher klären lassen.",
    };
  }
  return {
    score,
    label: "eher plausibel",
    recommend: "bald",
    caveat: "Trotzdem Heizlast und Hydraulik prüfen — keine Installationszusage.",
  };
}

function qty(draft: Draft) {
  const area = resolveArea(draft).value;
  const type = draft.buildingType ?? "unknown";
  const storeys = STOREYS[type];
  const footprint = area / storeys;
  const perimeter =
    type === "RH" ? 0.5 : type === "DHH" ? 0.75 : type === "MFH" ? 0.7 : 1;
  return {
    area,
    topFloor: footprint,
    roof: footprint * 1.25,
    basement: draft.basement === "none" ? 0 : footprint,
    facade: 4 * Math.sqrt(Math.max(footprint, 20)) * storeys * 2.8 * perimeter * 0.82,
    windows: Math.max(6, Math.round((area * 0.13) / 1.6)),
  };
}

function costBand(item: CostItem, quantity: number, factor: number): Range {
  const q = Math.max(0, quantity);
  return {
    low: item.low * q * factor,
    mid: item.value * q * factor,
    high: item.high * q * factor,
  };
}

function payback(net: Range, saving: Range): Range | null {
  if (saving.mid <= 20) return null;
  const hi = net.high / Math.max(saving.low, 40);
  const mid = net.mid / Math.max(saving.mid, 40);
  const lo = net.low / Math.max(saving.high, 40);
  return sortRange({ low: lo, mid, high: hi });
}

function envelopeGrant(cost: Range, draft: Draft): Range {
  const units = resolveUnits(draft);
  const low = computeBafaEnvelope({
    eligibleCost: cost.low,
    dwellingUnits: units,
    includeIsfp: draft.includeIsfp,
  }).grant;
  const mid = computeBafaEnvelope({
    eligibleCost: cost.mid,
    dwellingUnits: units,
    includeIsfp: draft.includeIsfp,
  }).grant;
  const high = computeBafaEnvelope({
    eligibleCost: cost.high,
    dwellingUnits: units,
    includeIsfp: draft.includeIsfp,
  }).grant;
  return sortRange({ low, mid, high });
}

function kfwGrant(cost: Range, draft: Draft): Range {
  const units = resolveUnits(draft);
  const climate = autoClimateBonus(draft);
  const one = (c: number) =>
    computeKfw458({
      eligibleCost: c,
      dwellingUnits: units,
      asOf: draft.asOf,
      climateBonus: climate,
      incomeBand: draft.incomeBand,
      hasMinorChild: draft.hasMinorChild,
    }).grant;
  return sortRange({ low: one(cost.low), mid: one(cost.mid), high: one(cost.high) });
}

function heatSave(space: Range, frac: number): Range {
  return { low: space.low * frac * 0.7, mid: space.mid * frac, high: space.high * frac * 1.15 };
}

function fuelCostSave(heatKwh: Range, draft: Draft): Range {
  const p = currentFuelPrice(draft);
  const eff = draft.heating === "heatpump" ? 1 : 0.85;
  return {
    low: (heatKwh.low / eff) * p.low,
    mid: (heatKwh.mid / eff) * p.mid,
    high: (heatKwh.high / eff) * p.high,
  };
}

function measure(
  partial: Omit<MeasureResult, "net" | "paybackYears" | "applicable"> & { applicable?: boolean },
): MeasureResult {
  const net = {
    low: Math.max(0, partial.cost.low - partial.grant.high),
    mid: Math.max(0, partial.cost.mid - partial.grant.mid),
    high: Math.max(0, partial.cost.high - partial.grant.low),
  };
  return {
    ...partial,
    applicable: partial.applicable !== false,
    net: sortRange(net),
    paybackYears: payback(sortRange(net), partial.savingEurYear),
  };
}

export function buildMeasures(draft: Draft, heat: HeatResult): MeasureResult[] {
  const q = qty(draft);
  const f = clamp(draft.costFactor, 0.7, 1.3);
  const space = heat.spaceHeatKwh;
  const wp = wpReadiness(draft);
  const oldHeat =
    draft.heating === "gas" ||
    draft.heating === "oil" ||
    draft.heating === "nightstorage" ||
    draft.heating === "other" ||
    draft.heating === "unknown";
  const fabricWeak =
    draft.insulation === "weak" ||
    (draft.insulation === "unknown" &&
      (draft.decade === "pre1950" ||
        draft.decade === "1950-69" ||
        draft.decade === "1970-89" ||
        draft.decade === "unknown" ||
        !draft.decade));
  const fabricGood = draft.insulation === "good" || draft.decade === "from2016";
  const out: MeasureResult[] = [];

  const skip = (id: MeasureId, reason: string): MeasureResult =>
    measure({
      id,
      title: MEASURE_TITLE[id],
      shortTitle: MEASURE_TITLE[id],
      summary: reason,
      horizon: "spaeter",
      cost: range(0, 0, 0),
      grant: range(0, 0, 0),
      savingEurYear: range(0, 0, 0),
      co2kgYear: range(0, 0, 0),
      risk: "",
      grantProgram: "—",
      applicable: false,
      skippedReason: reason,
    });

  // Energy advice
  if (done(draft, "energyAdvice") || draft.decade === "from2016") {
    out.push(skip("energyAdvice", "Bei sehr neuen Häusern oft nicht der erste Schritt."));
  } else {
    const fee = { low: 1300, mid: 1600, high: 2000 };
    const g = computeBafaEbw({ dwellingUnits: resolveUnits(draft), fee: fee.mid });
    const grant = { low: Math.round(fee.low * 0.5), mid: g.grant, high: g.maxGrant };
    out.push(
      measure({
        id: "energyAdvice",
        title: MEASURE_TITLE.energyAdvice,
        shortTitle: "Energieberatung",
        summary:
          "Schaltet den iSFP-Bonus nur oberhalb des Mindestvolumens frei — nicht pauschal +5 % auf alles.",
        horizon: "jetzt",
        cost: scaleRange(fee, f),
        grant: sortRange(grant),
        savingEurYear: range(0, 0, 0),
        co2kgYear: range(0, 0, 0),
        risk: "Kein Ersatz für diese Orientierung. Angebot der Beratung einholen.",
        grantProgram: `BAFA EBW · ${GRANT_FOOT}`,
      }),
    );
  }

  // Hydraulic balancing
  if (done(draft, "hydraulicBalancing") || draft.heating === "heatpump") {
    out.push(skip("hydraulicBalancing", "Bereits erledigt oder bei bestehender WP anders zu bewerten."));
  } else if (oldHeat) {
    const c = costBand(costs.hydraulicBalancing, 1, f);
    const saveK = heatSave(space, 0.08);
    out.push(
      measure({
        id: "hydraulicBalancing",
        title: MEASURE_TITLE.hydraulicBalancing,
        shortTitle: "Hydraulischer Abgleich",
        summary: "Günstig, schnell, oft Voraussetzung für spätere Heizungsförderung.",
        horizon: "jetzt",
        cost: c,
        grant: range(0, 0, 0),
        savingEurYear: fuelCostSave(saveK, draft),
        co2kgYear: { low: saveK.low * 0.2, mid: saveK.mid * 0.2, high: saveK.high * 0.2 },
        risk: "Wirkung hängt von der Verteilung ab — Spanne bewusst breit.",
        grantProgram: "meist ohne eigenen Zuschuss",
      }),
    );
  } else {
    out.push(skip("hydraulicBalancing", "Bei Fernwärme/sonstiger Übergabe nicht der Standardpfad."));
  }

  // Top floor
  const topRelevant =
    !done(draft, "topFloorCeiling") &&
    !done(draft, "roofInsulation") &&
    draft.roof !== "renewed" &&
    q.topFloor > 10;
  if (topRelevant && (fabricWeak || draft.insulation === "mixed" || draft.insulation === "unknown")) {
    const c = costBand(costs.topFloorCeiling, q.topFloor, f);
    const saveK = heatSave(space, 0.1);
    out.push(
      measure({
        id: "topFloorCeiling",
        title: MEASURE_TITLE.topFloorCeiling,
        shortTitle: "Oberste Geschossdecke",
        summary: "Oft der günstigste Hüllenhebel — typisch zuerst bei unsanierten 70er-Häusern.",
        horizon: "jetzt",
        cost: c,
        grant: envelopeGrant(c, draft),
        savingEurYear: fuelCostSave(saveK, draft),
        co2kgYear: { low: saveK.low * 0.2, mid: saveK.mid * 0.2, high: saveK.high * 0.2 },
        risk: "Zugang, vorhandene Dämmstärke und Brandschutz ändern die Spanne.",
        grantProgram: `BAFA Gebäudehülle 15 % · ${GRANT_FOOT}`,
      }),
    );
  } else {
    out.push(skip("topFloorCeiling", "Dach/Decke schon erneuert, nicht zutreffend oder Hülle bereits gut."));
  }

  // Basement
  if (q.basement > 10 && !done(draft, "basementCeiling") && draft.basement !== "renewed" && draft.basement !== "none") {
    const c = costBand(costs.basementCeiling, q.basement, f);
    const saveK = heatSave(space, 0.06);
    out.push(
      measure({
        id: "basementCeiling",
        title: MEASURE_TITLE.basementCeiling,
        shortTitle: "Kellerdecke",
        summary: "Behaglichkeit im Erdgeschoss, überschaubarer Aufwand.",
        horizon: fabricGood ? "spaeter" : "bald",
        cost: c,
        grant: envelopeGrant(c, draft),
        savingEurYear: fuelCostSave(saveK, draft),
        co2kgYear: { low: saveK.low * 0.2, mid: saveK.mid * 0.2, high: saveK.high * 0.2 },
        risk: "Höhe, Leitungen, Feuchte — nicht jedes Kellernetz ist einfach.",
        grantProgram: `BAFA Gebäudehülle 15 % · ${GRANT_FOOT}`,
      }),
    );
  } else {
    out.push(skip("basementCeiling", "Kein Keller, bereits gedämmt oder nicht sinnvoll."));
  }

  // Roof
  if (!done(draft, "roofInsulation") && draft.roof !== "renewed") {
    const c = costBand(costs.roofInsulation, q.roof, f);
    const saveK = heatSave(space, topRelevant ? 0.07 : 0.15);
    out.push(
      measure({
        id: "roofInsulation",
        title: MEASURE_TITLE.roofInsulation,
        shortTitle: "Dachdämmung",
        summary: "Breites Kostenband — erst nach Decke oder wenn das Dach sowieso angefasst wird.",
        horizon: fabricWeak ? "bald" : "spaeter",
        cost: c,
        grant: envelopeGrant(c, draft),
        savingEurYear: fuelCostSave(saveK, draft),
        co2kgYear: { low: saveK.low * 0.2, mid: saveK.mid * 0.2, high: saveK.high * 0.2 },
        risk: "Verfahren (Zwischen-/Aufsparren) verschiebt Kosten stark.",
        grantProgram: `BAFA Gebäudehülle 15 % · ${GRANT_FOOT}`,
      }),
    );
  } else {
    out.push(skip("roofInsulation", "Dach bereits erneuert oder als erledigt markiert."));
  }

  // Facade
  if (!done(draft, "wdvs") && draft.facade !== "renewed" && !fabricGood) {
    const c = costBand(costs.wdvs, q.facade, f);
    const saveK = heatSave(space, 0.22);
    out.push(
      measure({
        id: "wdvs",
        title: MEASURE_TITLE.wdvs,
        shortTitle: "Fassade",
        summary: "Wirksam, aber teuer und störend — typisch später, nicht als Erstes.",
        horizon: "spaeter",
        cost: c,
        grant: envelopeGrant(c, draft),
        savingEurYear: fuelCostSave(saveK, draft),
        co2kgYear: { low: saveK.low * 0.2, mid: saveK.mid * 0.2, high: saveK.high * 0.2 },
        risk: "Gerüst, Details, Feuchte. Band bewusst sehr breit.",
        grantProgram: `BAFA Gebäudehülle 15 % · ${GRANT_FOOT}`,
      }),
    );
  } else {
    out.push(skip("wdvs", "Fassade bereits gut oder als erledigt markiert."));
  }

  // Windows
  if (!done(draft, "windowTriple") && draft.windows !== "renewed" && !fabricGood) {
    const c = costBand(costs.windowTriple, q.windows, f);
    const saveK = heatSave(space, 0.12);
    out.push(
      measure({
        id: "windowTriple",
        title: MEASURE_TITLE.windowTriple,
        shortTitle: "Fenster",
        summary: "Komfortgewinn groß, Amortisation oft lang — später, außer die Fenster sind am Ende.",
        horizon: "spaeter",
        cost: c,
        grant: envelopeGrant(c, draft),
        savingEurYear: fuelCostSave(saveK, draft),
        co2kgYear: { low: saveK.low * 0.2, mid: saveK.mid * 0.2, high: saveK.high * 0.2 },
        risk: "Größe, Denkmalschutz, Anschlussfugen.",
        grantProgram: `BAFA Gebäudehülle 15 % · ${GRANT_FOOT}`,
      }),
    );
  } else {
    out.push(skip("windowTriple", "Fenster bereits erneuert oder Hülle gut."));
  }

  // Heat pump
  if (wp.recommend === "skip") {
    out.push(skip("heatPumpAirWater", wp.caveat));
  } else {
    const c = costBand(costs.heatPumpAirWater, 1, f);
    const grant = kfwGrant(c, draft);
    const hpPrice = priceOf("heatpump", draft.priceHeatpump ?? draft.priceElectricity);
    const elec = {
      low: (space.low + heat.dhwKwh.low) / heat.jaz.high,
      mid: (space.mid + heat.dhwKwh.mid) / heat.jaz.mid,
      high: (space.high + heat.dhwKwh.high) / heat.jaz.low,
    };
    const newCost = {
      low: elec.low * hpPrice.low,
      mid: elec.mid * hpPrice.mid,
      high: elec.high * hpPrice.high,
    };
    const saving = {
      low: Math.max(0, heat.costEurYear.low - newCost.high),
      mid: Math.max(0, heat.costEurYear.mid - newCost.mid),
      high: Math.max(0, heat.costEurYear.high - newCost.low),
    };
    const co2new = elec.mid * prices.co2kgPerKwh.heatpump;
    out.push(
      measure({
        id: "heatPumpAirWater",
        title: MEASURE_TITLE.heatPumpAirWater,
        shortTitle: "Wärmepumpe",
        summary:
          wp.recommend === "spaeter"
            ? "Erst wenn Hülle und Verteilung plausibel sind. Keine WP-Eignung nur aus dem Baujahr ableiten."
            : "Bald denkbar — Heizlast, Vorlauf und Stromtarif vorher klären.",
        horizon: wp.recommend === "spaeter" ? "spaeter" : "bald",
        cost: c,
        grant,
        savingEurYear: sortRange(saving),
        co2kgYear: {
          low: Math.max(0, heat.co2kgYear.low - elec.high * 0.35),
          mid: Math.max(0, heat.co2kgYear.mid - co2new),
          high: Math.max(0, heat.co2kgYear.high - elec.low * 0.35),
        },
        risk: wp.caveat,
        grantProgram: `KfW 458 · ${GRANT_FOOT}`,
      }),
    );
  }

  // PV
  if (draft.hasPv === true || done(draft, "pvWithStorage")) {
    out.push(skip("pvWithStorage", "Photovoltaik bereits vorhanden."));
  } else {
    const c = costBand(costs.pvWithStorage_8to10kWp, 1, f);
    const yieldKwh = 9 * heat.climate.pvYieldKwhPerKwp;
    const self = draft.heating === "heatpump" ? 0.7 : 0.6;
    const elec = priceOf("electricity", draft.priceElectricity);
    const feed = prices.feedInTariffPv.value;
    const savingMid = yieldKwh * self * elec.mid + yieldKwh * (1 - self) * feed;
    out.push(
      measure({
        id: "pvWithStorage",
        title: MEASURE_TITLE.pvWithStorage,
        shortTitle: "Photovoltaik",
        summary: "Dach grob plausibel — Ertrag und Eigenverbrauch sind Annahmen, kein Ertragsgutachten.",
        horizon: fabricWeak ? "bald" : "bald",
        cost: c,
        grant: range(0, 0, 0),
        savingEurYear: {
          low: savingMid * 0.7,
          mid: savingMid,
          high: savingMid * 1.2,
        },
        co2kgYear: {
          low: yieldKwh * self * 0.25,
          mid: yieldKwh * self * 0.35,
          high: yieldKwh * self * 0.4,
        },
        risk: "Ausrichtung, Verschattung, Speichergröße.",
        grantProgram: "kein BEG-Zuschuss (Steuer/EEG separat)",
      }),
    );
  }

  // Ventilation — later only if tightening envelope
  if (done(draft, "ventilationCentral") || fabricGood) {
    out.push(skip("ventilationCentral", "Bei schon guter Hülle oder erledigt nachrangig."));
  } else {
    const c = costBand(costs.ventilationCentral, 1, f);
    const saveK = heatSave(space, 0.08);
    out.push(
      measure({
        id: "ventilationCentral",
        title: MEASURE_TITLE.ventilationCentral,
        shortTitle: "Lüftung",
        summary: "Sinnvoll, wenn die Hülle dicht wird — nicht der erste Schritt.",
        horizon: "spaeter",
        cost: c,
        grant: envelopeGrant(c, draft),
        savingEurYear: fuelCostSave(saveK, draft),
        co2kgYear: { low: saveK.low * 0.2, mid: saveK.mid * 0.2, high: saveK.high * 0.2 },
        risk: "Kanäle, Schall, Nutzung.",
        grantProgram: `BAFA · ${GRANT_FOOT}`,
      }),
    );
  }

  void wertschoepfungsbonus();
  return out;
}

function stackPackage(ids: MeasureId[], all: MeasureResult[]): PackageResult {
  const ms = all.filter((m) => m.applicable && ids.includes(m.id));
  const cost = ms.reduce((a, m) => addRange(a, m.cost), range(0, 0, 0));
  const grant = ms.reduce((a, m) => addRange(a, m.grant), range(0, 0, 0));
  const saving = ms.reduce((a, m) => addRange(a, scaleRange(m.savingEurYear, 0.85)), range(0, 0, 0));
  const co2 = ms.reduce((a, m) => addRange(a, scaleRange(m.co2kgYear, 0.85)), range(0, 0, 0));
  const net = {
    low: Math.max(0, cost.low - grant.high),
    mid: Math.max(0, cost.mid - grant.mid),
    high: Math.max(0, cost.high - grant.low),
  };
  return {
    id: ids.join("+"),
    title: "",
    subtitle: "",
    measureIds: ms.map((m) => m.id),
    cost: sortRange(cost),
    grant: sortRange(grant),
    net: sortRange(net),
    savingEurYear: sortRange(saving),
    paybackYears: payback(sortRange(net), sortRange(saving)),
    co2kgYear: sortRange(co2),
  };
}

export function evaluate(partial: Partial<Draft>): Evaluation {
  const draft: Draft = { ...emptyDraft(partial.asOf ?? "2026-09-12"), ...partial };
  const heat = estimateHeat(draft);
  const wp = wpReadiness(draft);
  const measures = buildMeasures(draft, heat);
  const applicable = measures.filter((m) => m.applicable);
  const path = {
    jetzt: applicable.filter((m) => m.horizon === "jetzt").map((m) => m.id),
    bald: applicable.filter((m) => m.horizon === "bald").map((m) => m.id),
    spaeter: applicable.filter((m) => m.horizon === "spaeter").map((m) => m.id),
  };
  const titleOf = (id: MeasureId) => applicable.find((m) => m.id === id)?.shortTitle ?? MEASURE_TITLE[id];
  const sentence = houseSentence(draft);
  const pathLine = pathSentence({
    jetzt: path.jetzt.map(titleOf),
    bald: path.bald.map(titleOf),
    spaeter: path.spaeter.map(titleOf),
  });

  const pJetzt = stackPackage(path.jetzt, measures);
  pJetzt.id = "jetzt";
  pJetzt.title = "Jetzt";
  pJetzt.subtitle = "Schnelle, günstige Schritte";
  const pBald = stackPackage([...path.jetzt, ...path.bald], measures);
  pBald.id = "bald";
  pBald.title = "Bald";
  pBald.subtitle = "Jetzt plus nächste Stufe";
  const pFull = stackPackage([...path.jetzt, ...path.bald, ...path.spaeter], measures);
  pFull.id = "komplett";
  pFull.title = "Später / Komplett";
  pFull.subtitle = "Gesamtrichtung, nicht als Auftrag lesen";

  const facts = collectFacts(draft, heat);
  const confidence = scoreConfidence(draft, heat);

  const warnings: string[] = [];
  if (!draft.plz) warnings.push(COPY.plzEmpty);
  if (draft.insulation === "unknown") {
    warnings.push("Dämmung unbekannt — Pfad (Hülle zuerst oder WP) bleibt unsicher.");
  }
  if (wp.recommend === "spaeter") warnings.push(wp.caveat);
  warnings.push(COPY.gmodg);

  const nextSteps = [
    {
      id: "print",
      label: "Diese Orientierung sichern",
      detail: "Drucken oder als PDF speichern — bleibt sonst nur in diesem Browser.",
    },
    {
      id: "advice",
      label: "Energieberatung anfragen",
      detail: "BAFA EBW / iSFP, wenn größere Hüllenmaßnahmen folgen.",
    },
    {
      id: "offers",
      label: "Zwei bis drei Angebote",
      detail: "Für den nächsten Jetzt-Schritt, nicht für das Komplettpaket.",
    },
    {
      id: "kfw",
      label: "Förderung vor Auftrag",
      detail: "KfW 458 / BAFA erst beantragen, dann beauftragen. " + GRANT_FOOT,
    },
    {
      id: "load",
      label: "Heizlast grob klären",
      detail: "Bevor eine Wärmepumpe ernst wird: Vorlauf, Heizkörper, Dämmung.",
    },
  ];

  return {
    asOf: draft.asOf,
    houseSentence: sentence,
    pathSentence: pathLine,
    confidence,
    facts,
    heat,
    wpReadiness: wp,
    measures,
    path,
    packages: [pJetzt, pBald, pFull],
    nextSteps,
    warnings,
    gmodgNote: COPY.gmodg,
    grantDisclaimer: GRANT_FOOT,
    wertschoepfungNote: "Wertschöpfungsbonus für EU-WP: geplant Q1 2027, noch nicht aktiv — nicht eingerechnet.",
  };
}

function collectFacts(draft: Draft, heat: HeatResult): Fact[] {
  const facts: Fact[] = [];
  const push = (key: string, label: string, value: string, source: Fact["source"]) =>
    facts.push({ key, label, value, source });
  push("plz", "PLZ", draft.plz || "nicht angegeben", draft.plz ? "entered" : "assumed");
  push(
    "type",
    "Gebäudetyp",
    BUILDING_LABEL[draft.buildingType ?? "unknown"],
    !draft.buildingType || draft.buildingType === "unknown" ? "assumed" : "entered",
  );
  push(
    "decade",
    "Baujahr",
    DECADE_CHIP[draft.decade ?? "unknown"],
    !draft.decade || draft.decade === "unknown" ? "assumed" : "entered",
  );
  push(
    "heating",
    "Heizung",
    HEATING_CHIP[draft.heating ?? "unknown"],
    !draft.heating || draft.heating === "unknown" || draft.heating === "other" ? "assumed" : "entered",
  );
  push(
    "insulation",
    "Dämmung",
    INSULATION_CHIP[draft.insulation],
    draft.insulation === "unknown" ? "assumed" : "entered",
  );
  const area = resolveArea(draft);
  push("area", "Wohnfläche", `${round0(area.value)} m²`, area.assumed ? "assumed" : "entered");
  push("climate", "Klima", `${heat.climate.label} (Faktor ${heat.climate.factor})`, draft.plz ? "entered" : "assumed");
  if (draft.heatingCostEurYear || draft.heatingKwhYear) {
    push("meter", "Verbrauch", "anhand Ihrer Angabe skaliert", "entered");
  }
  return facts;
}

function scoreConfidence(draft: Draft, heat: HeatResult): Evaluation["confidence"] {
  let score = 30;
  const reasons: string[] = ["Vier Kernfragen — Orientierung, keine Bilanz."];
  if (draft.plz) {
    score += 6;
    reasons.push("PLZ für grobes Klima.");
  } else reasons.push(COPY.plzEmpty);
  if (draft.buildingType && draft.buildingType !== "unknown") score += 6;
  else reasons.push("Gebäudetyp angenommen.");
  if (draft.decade && draft.decade !== "unknown") score += 6;
  else reasons.push("Baujahr angenommen (vorsichtig 1970–89).");
  if (draft.insulation !== "unknown") {
    score += 14;
    reasons.push("Dämmung angegeben — wichtig für Hülle vs. Wärmepumpe.");
  } else reasons.push("Ohne Dämmung bleibt der Pfad unsicher.");
  if (draft.livingAreaM2) score += 10;
  if (heat.usedMeteredDemand) {
    score += 14;
    reasons.push("Verbrauchsangabe erhöht die Belastbarkeit.");
  }
  if (draft.roof !== "unknown") score += 3;
  if (draft.windows !== "unknown") score += 3;
  if (draft.incomeBand !== "preferNot") score += 3;
  score = Math.min(76, score);
  const level = score < 42 ? "niedrig" : score < 62 ? "mittel" : "mittelhoch";
  return { level, score, reasons };
}

export const fixtures = {
  efh1974gas: {
    ...emptyDraft(),
    plz: "80331",
    buildingType: "EFH" as const,
    decade: "1970-89" as const,
    heating: "gas" as const,
    livingAreaM2: 140,
    insulation: "unknown" as const,
  },
  dhh1998oil: {
    ...emptyDraft(),
    plz: "44135",
    buildingType: "DHH" as const,
    decade: "1990-2001" as const,
    heating: "oil" as const,
    insulation: "mixed" as const,
  },
  efh2012wpPv: {
    ...emptyDraft(),
    plz: "10115",
    buildingType: "EFH" as const,
    decade: "2002-15" as const,
    heating: "heatpump" as const,
    hasPv: true as const,
    insulation: "good" as const,
  },
};
