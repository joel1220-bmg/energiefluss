# Energiefluss Haus-Coach

Erste Einschätzung für **Solarstrom, Speicher und E-Auto** an Ihrem Haus. Keine zertifizierte Beratung — Orientierung zu Größe, Speicher und groben Kosten-/Eigenverbrauchsspannen.

Alle Zahlen entstehen im Browser (`lib/engine`). Kein Konto, keine Datenbank, kein Netzaufruf für die Rechnung. Kein LLM.

## Starten

```bash
npm install
npm test
npm run build
npm run dev
```

Öffnen: [http://localhost:3000](http://localhost:3000)

## Routen

| Pfad | Inhalt |
| --- | --- |
| `/` | Landing — Solar / Speicher / E-Auto |
| `/coach` | Fragen → Ergebnis → Feinschliff |
| `/datenschutz` | Platzhalter |
| `/impressum` | Platzhalter |

## Dimensionierung (kurz)

- Last = Haushalt + E-Auto + Wärmepumpe (nur als Stromlast)
- Spezifischer Ertrag aus `climate.plz.json` (kWh/kWp), Default ~950
- PV-kWp ≈ clamp(Last / Ertrag × 1,05, 4, 15), Spanne ±20 %
- Speicher ≈ 0,8–1,2 kWh je kWp, +1–3 kWh bei E-Auto
- Bestehende PV → kein zweites Vollsystem
- EEG-Teileinspeisung Seed in `eeg-2026.json`

## JSON

- `data/climate.plz.json` — PLZ-Ertrag
- `data/costs.de.json` — €/kWp, €/kWh Speicher, Wallbox
- `data/energy-prices.de.json` — Strompreis ~32 ct, CO₂
- `data/eeg-2026.json` — Einspeisung Seed
- `data/funding.beg-2026-07.json` — ungenutzt in v1 (behalten)

## Technik

Next.js App Router, TypeScript, Tailwind 4, Zod, Vitest. CSP, System-Fonts, Sie-Form, remember-opt-in. Windows-taugliche npm-Scripts (kein `VAR=1 cmd`).
