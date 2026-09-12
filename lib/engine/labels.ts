import type { BuildingType, Decade, Heating, Insulation, MeasureId } from "./types";

/** Locked product copy. Do not paraphrase in the UI. */
export const COPY = {
  landingLead:
    "In wenigen Minuten eine erste Einschätzung für Ihr Haus — mit sichtbaren Annahmen. Danach können Sie alles genauer machen.",
  cta: "Einschätzung starten",
  privacy: "Ihre Angaben bleiben in diesem Browser.",
  underCta: "Keine zertifizierte Beratung, kein iSFP — dafür sofort Orientierung.",
  qPlz: "In welcher Postleitzahl steht Ihr Haus?",
  qType: "Welcher Gebäudetyp ist es?",
  qDecade: "In welchem Jahrzehnt wurde es ungefähr gebaut?",
  qHeating: "Womit heizen Sie heute?",
  unknownHelp: "Kein Problem — wir rechnen mit einer vorsichtigen Annahme und markieren sie.",
  plzEmpty: "Ohne PLZ bleiben Förderung und regionale Preise grober.",
  resultTail: "erster Blick, noch grob.",
  grantDisclaimer: "Stand Antragstag, keine Zusage.",
  gmodg:
    "Eine Pflicht auf 65 % Erneuerbare beim Heizungstausch im Bestand gibt es seit Sommer 2026 nicht mehr.",
  insulationQ: "Wie schätzen Sie die Dämmung ein?",
  insulationHint: "Baujahr allein reicht nicht — Dämmung entscheidet, ob die Hülle oder eine Wärmepumpe zuerst kommt.",
  ftStrom: "Strompreis (ct/kWh)",
  ftHeiz: "Heizpreis",
  ftCost: "Kostenband (±30 %)",
  ftKlima: "Klimabonus (Selbstnutzung, bis 31.01.2027)",
  ftIncome: "Einkommen für Bonus (Band)",
  ftDone: "Schon erledigt",
  ftRoofFacade: "Dämmung Dach/Fassade",
  ftArea: "Wohnfläche",
} as const;

export const BUILDING_LABEL: Record<BuildingType, string> = {
  EFH: "Einfamilienhaus",
  DHH: "Doppelhaushälfte",
  RH: "Reihenhaus",
  MFH: "kleines Mehrfamilienhaus",
  unknown: "Wohnhaus",
};

export const BUILDING_CHIP: Record<BuildingType, string> = {
  EFH: "Einfamilienhaus",
  DHH: "Doppelhaushälfte",
  RH: "Reihenhaus",
  MFH: "kleines Mehrfamilienhaus",
  unknown: "Weiß ich nicht",
};

export const DECADE_CHIP: Record<Decade, string> = {
  pre1950: "vor 1950",
  "1950-69": "1950–69",
  "1970-89": "1970–89",
  "1990-2001": "1990–2001",
  "2002-15": "2002–15",
  from2016: "ab 2016",
  unknown: "Weiß ich nicht",
};

export const HEATING_CHIP: Record<Heating, string> = {
  gas: "Gas",
  oil: "Öl",
  heatpump: "Wärmepumpe",
  district: "Fernwärme",
  nightstorage: "Strom/Nachtspeicher",
  other: "Sonstiges",
  unknown: "Weiß ich nicht",
};

export const INSULATION_CHIP: Record<Insulation, string> = {
  weak: "Schwach",
  mixed: "Gemischt",
  good: "Gut",
  unknown: "Weiß ich nicht",
};

export const MEASURE_TITLE: Record<MeasureId, string> = {
  hydraulicBalancing: "Hydraulischer Abgleich",
  topFloorCeiling: "Oberste Geschossdecke",
  basementCeiling: "Kellerdecke",
  roofInsulation: "Dachdämmung",
  wdvs: "Fassadendämmung",
  windowTriple: "Fenster (3-fach)",
  heatPumpAirWater: "Luft-Wasser-Wärmepumpe",
  pvWithStorage: "Photovoltaik mit Speicher",
  ventilationCentral: "Lüftung mit Wärmerückgewinnung",
  energyAdvice: "Energieberatung / iSFP",
};

export function decadePhrase(decade: Decade | null): string {
  switch (decade) {
    case "pre1950":
      return "von vor 1950";
    case "1950-69":
      return "aus den 1950ern";
    case "1970-89":
      return "aus den 1970ern";
    case "1990-2001":
      return "aus den 1990ern";
    case "2002-15":
      return "aus den 2000ern";
    case "from2016":
      return "ab 2016";
    default:
      return "unbekannten Baujahrs";
  }
}

export function plzPrefixLabel(plz: string): string {
  const d = (plz || "").replace(/\D/g, "");
  if (d.length >= 2) return `${d.slice(0, 2)}xxx`;
  return "ohne PLZ";
}

export function houseSentence(input: {
  buildingType: BuildingType | null;
  decade: Decade | null;
  heating: Heating | null;
  plz: string;
}): string {
  const typ = BUILDING_LABEL[input.buildingType ?? "unknown"];
  const when = decadePhrase(input.decade);
  const heat = HEATING_CHIP[input.heating ?? "unknown"];
  const heatWord =
    input.heating === "unknown" || input.heating === null
      ? "unbekannter Heizung"
      : input.heating === "other"
        ? "sonstiger Heizung"
        : heat;
  const loc = plzPrefixLabel(input.plz);
  const mid =
    input.decade === "pre1950" || input.decade === "from2016" || input.decade === "unknown" || !input.decade
      ? `${typ} ${when} mit ${heatWord} in ${loc}`
      : `${typ} ${when} mit ${heatWord} in ${loc}`;
  return `${mid} — ${COPY.resultTail}`;
}

export function pathSentence(titles: { jetzt: string[]; bald: string[]; spaeter: string[] }): string {
  const orDash = (xs: string[]) => (xs.length ? xs.join(", ") : "nichts Dringendes");
  return `Am sinnvollsten jetzt: ${orDash(titles.jetzt)} / Bald: ${orDash(titles.bald)} / Später: ${orDash(titles.spaeter)}`;
}
