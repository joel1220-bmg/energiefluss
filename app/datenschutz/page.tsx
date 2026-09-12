import type { Metadata } from "next";

export const metadata: Metadata = { title: "Datenschutz · Energiefluss Haus-Coach" };

export default function DatenschutzPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 leading-relaxed">
      <h1 className="serif text-3xl text-forest">Datenschutz</h1>
      <p className="mt-4 text-muted">Platzhalter — vor Veröffentlichung durch eine Rechtsberatung ersetzen.</p>
      <h2 className="serif mt-8 text-xl">Verantwortliche Stelle</h2>
      <p className="mt-2">[Name, Anschrift, Kontakt — Platzhalter]</p>
      <h2 className="serif mt-8 text-xl">Verarbeitung</h2>
      <p className="mt-2">
        Der Haus-Coach rechnet ausschließlich in Ihrem Browser. Nur wenn Sie „Angaben merken“
        ankreuzen, speichert dieser Browser den Entwurf in <code>localStorage</code>. Ohne Haken
        wird nichts geschrieben. Es gibt kein Nutzerkonto, keinen Server für Ihre Hausdaten, keinen
        Newsletter und keine Tracker oder Werbung.
      </p>
      <h2 className="serif mt-8 text-xl">Ihre Rechte</h2>
      <p className="mt-2">
        Sie können den Entwurf jederzeit im Coach zurücksetzen. Darüber hinaus gelten die Rechte nach DSGVO
        (Auskunft, Löschung usw.) gegenüber der verantwortlichen Stelle.
      </p>
    </article>
  );
}
