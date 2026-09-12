import type { EvState, HasPvState, TriState } from "./types";

/** Locked product copy. Do not paraphrase in the UI. */
export const COPY = {
  landingLead:
    "Erste Einschätzung für Solarstrom, Speicher und E-Auto an Ihrem Haus — mit sichtbaren Annahmen. Danach können Sie alles genauer machen.",
  cta: "Einschätzung starten",
  privacy: "Ihre Angaben bleiben in diesem Browser.",
  underCta:
    "Keine zertifizierte Beratung — Orientierung zu Größe, Speicher und groben Kosten-/Eigenverbrauchsspannen.",
  landingTileFour: "Wenige Angaben",
  landingTileFourBody: "Strombedarf, E-Auto, Wärmepumpe als Last, optional PLZ. Weiß ich nicht ist immer erlaubt.",
  landingTileSize: "Größe",
  landingTileSizeBody: "Empfohlene PV in kWp und Speicher in kWh — als Spanne, kein Punktwert.",
  landingTileCost: "Kosten / Spanne",
  landingTileCostBody: "Brutto-Kosten, Eigenverbrauch und Autarkie grob — Orientierung, kein Angebot.",
  qPlz: "In welcher Postleitzahl steht Ihr Haus?",
  plzHint: "Ohne PLZ bleiben Ertrag und Standort grober.",
  qHousehold: "Wie hoch ist Ihr Strombedarf im Haushalt?",
  qHouseholdHint: "kWh/Jahr oder €/Jahr · Weiß ich nicht.",
  qHouseholdEmpty: "Ohne Angabe rechnen wir mit einem typischen Haushalt und markieren das.",
  qEv: "Haben Sie ein E-Auto — oder planen Sie eines?",
  qEvKm: "Falls E-Auto: Wie viel fahren Sie ungefähr?",
  qEvKmHint: "km/Jahr oder kWh/Jahr · Weiß ich nicht.",
  qWp: "Heizen Sie mit einer Wärmepumpe?",
  qWpHelp: "Nur als zusätzlicher Strombedarf — wir empfehlen hier keine Wärmepumpe.",
  qPv: "Haben Sie schon eine Photovoltaik-Anlage?",
  qPvKwp: "Wie groß ist Ihre Photovoltaik-Anlage?",
  qPvKwpHint: "kWp, so wie auf dem Wechselrichter oder im Angebot.",
  qBattery: "Haben Sie schon einen Stromspeicher?",
  qBatteryKwh: "Wie groß ist Ihr Speicher — oder welchen möchten Sie?",
  qBatteryKwhHint: "kWh direkt eintragen. Leer = wir schätzen.",
  unknownHelp: "Kein Problem — wir rechnen mit einer vorsichtigen Annahme und markieren sie.",
  resultTail: "erster Blick auf Solarstrom und Speicher, noch grob.",
  recommendLead: "Empfohlen grob:",
  recommendTail: "Kosten und Eigenverbrauch als Spanne — keine Punktwerte, keine Zusage.",
  grantDisclaimer: "Orientierung, kein Angebot.",
  notCertified: "Keine zertifizierte Beratung.",
  spanNote: "Spanne, weil vieles noch angenommen ist.",
  ftStrom: "Strompreis (ct/kWh)",
  ftPv: "PV-Leistung (kWp)",
  ftBattery: "Speicher (kWh)",
  ftPvExact: "PV kWp eintippen",
  ftBatteryExact: "Speicher kWh eintippen",
  ftEvKm: "E-Auto km/Jahr",
  ftWpKwh: "Wärmepumpe kWh/Jahr",
  ftCost: "Kostenband (±30 %)",
} as const;

export const EV_CHIP: Record<EvState, string> = {
  yes: "Ja, fährt schon",
  planned: "Geplant",
  no: "Nein",
  unknown: "Weiß ich nicht",
};

export const TRI_CHIP: Record<TriState, string> = {
  yes: "Ja",
  no: "Nein",
  unknown: "Weiß ich nicht",
};

export const HAS_PV_CHIP: Record<HasPvState, string> = {
  none: "Keine",
  yes: "Ja, schon vorhanden",
  unknown: "Weiß ich nicht",
};

export const HORIZON_COPY = {
  intro: "So könnten Sie vorgehen — grobe Reihenfolge, keine Pflicht.",
  jetzt: {
    title: "Jetzt",
    sub: "Angebot mit kWp/Speicher-Spanne einholen",
    empty: "—",
  },
  bald: {
    title: "Bald",
    sub: "E-Auto-Laden / Wallbox mitdenken",
    empty: "—",
  },
  spaeter: {
    title: "Später",
    sub: "Feinschliff mit Verbrauchsdaten vom Zähler",
    empty: "—",
  },
} as const;

export function plzPrefixLabel(plz: string): string {
  const d = (plz || "").replace(/\D/g, "");
  if (d.length >= 2) return `${d.slice(0, 2)}xxx`;
  return "";
}

export function houseSentence(input: {
  plz: string;
  evActive: boolean;
  wpActive: boolean;
}): string {
  const loc = plzPrefixLabel(input.plz);
  const where = loc ? ` in ${loc}` : "";
  const ev = input.evActive ? " mit E-Auto" : " ohne E-Auto";
  const wp = input.wpActive ? " und Wärmepumpe als Stromlast" : "";
  return `Für Ihren Haushalt${where}${ev}${wp} — ${COPY.resultTail}`;
}

export function recommendSentence(pv: { low: number; high: number }, bat: { low: number; high: number }, recommendPv: boolean): string {
  if (!recommendPv) {
    return `Bestehende PV — kein zweites Vollsystem. Speicher grob ca. ${fmt1(bat.low)}–${fmt1(bat.high)}\u00a0kWh. ${COPY.recommendTail}`;
  }
  return `${COPY.recommendLead} ca. ${fmt1(pv.low)}–${fmt1(pv.high)}\u00a0kWp und ${fmt1(bat.low)}–${fmt1(bat.high)}\u00a0kWh Speicher. ${COPY.recommendTail}`;
}

function fmt1(n: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(n);
}
