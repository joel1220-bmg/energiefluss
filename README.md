# Energiefluss Haus-Coach

Orientierung für Bestandsgebäude in Deutschland. Ersetzt den ersten Termin beim Energieberater **nicht** — und ist **kein** zertifizierter iSFP.

Alle Zahlen entstehen im Browser (`lib/engine`). Kein Konto, keine Datenbank, kein Netzaufruf für die Rechnung.

## Starten

```bash
npm install
npm test
npm run dev
```

Produktion:

```bash
npm run build
npm start
```

Öffnen: [http://localhost:3000](http://localhost:3000)

## Routen

| Pfad | Inhalt |
| --- | --- |
| `/` | Start — vier Fragen versprochen, sichtbare Annahmen |
| `/coach` | Eine Reise: vier Angaben → Ergebnis → Feinschliff |
| `/datenschutz` | Platzhalter |
| `/impressum` | Platzhalter |

## Schätzung vs. offizieller Nachweis

| Diese App | Nicht diese App |
| --- | --- |
| Grobe Spannen, Regeln, Seed-JSON | Heizlast, iSFP, TPB, EEE |
| KfW 458 / BAFA grob, Stand JSON | Antrag, Merkblatt, Kundenportal |
| Keine 65-%-Pflicht in der Förderung | GModG nur als Hinweis |

GModG-Text (nur Tooltip/Hinweis, **nicht** in der Förderformel):

> Eine Pflicht auf 65 % Erneuerbare beim Heizungstausch im Bestand gibt es seit Sommer 2026 nicht mehr.

Zuschüsse immer als Spanne plus: „Stand Antragstag, keine Zusage.“

## JSON aktualisieren

Dateien in `data/`:

- `funding.beg-2026-07.json` — KfW 458, BAFA Hülle, EBW (`meta.asOf`)
- `costs.de.json` — Kostenbänder
- `energy-prices.de.json` — grobe Arbeitspreise + CO₂
- `climate.plz.json` — PLZ-Präfixe, Heizfaktor, PV-Ertrag

Nach Änderung:

```bash
npm test
npm run build
```

Keine Förderlogik in Komponenten schreiben. Nur `lib/engine`. Kein `eval`, kein LLM im Rechenkern.

Wertschöpfungsbonus (EU-WP, geplant Q1 2027) bleibt inaktiv, bis das JSON ihn einschaltet.

## Tests / Fixtures

`npm test` (Vitest):

- 1974 EFH Gas, 140 m², 80331 — Jetzt Abgleich + Decke, WP später
- 1998 DHH Öl — WP bald, nicht jetzt
- 2012 EFH WP+PV — keine neue WP, keine PV
- KfW-Staffel, iSFP nur oberhalb 30.000 €, deutsche Zahlen (`1.200` und `1200`)

## Technik

Next.js App Router, TypeScript, Tailwind 4, Zod, Vitest. CSP ohne Tracker. 390 px primär.
