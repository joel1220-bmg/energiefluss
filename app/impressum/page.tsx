import type { Metadata } from "next";

export const metadata: Metadata = { title: "Impressum · Energiefluss Haus-Coach" };

export default function ImpressumPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 leading-relaxed">
      <h1 className="serif text-3xl text-forest">Impressum</h1>
      <p className="mt-4 text-muted">Platzhalter gemäß § 5 DDG — vor Veröffentlichung ersetzen.</p>
      <p className="mt-6">
        [Anbietername]
        <br />
        [Straße Hausnummer]
        <br />
        [PLZ Ort]
      </p>
      <p className="mt-4">
        Kontakt: [E-Mail-Platzhalter — in dieser App wird keine E-Mail erhoben]
      </p>
      <p className="mt-8 text-sm text-muted">
        Keine zertifizierte Beratung, kein Angebot, keine Förderzusage. Orientierung zu Solarstrom,
        Speicher und E-Auto — maßgeblich sind Angebot und Technik vor Ort.
      </p>
    </article>
  );
}
