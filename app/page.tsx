import Link from "next/link";
import { COPY } from "@/lib/engine/labels";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:pt-16">
      <p className="text-sm font-medium uppercase tracking-[0.14em] text-moss">Haus-Coach</p>
      <h1 className="serif mt-3 max-w-[22ch] text-[2.05rem] leading-[1.15] text-forest sm:text-5xl">
        {COPY.landingLead}
      </h1>
      <p className="mt-5 max-w-xl text-lg text-muted">{COPY.privacy}</p>
      <div className="mt-8 flex flex-col items-start gap-3">
        <Link
          href="/coach"
          className="inline-flex min-h-12 items-center rounded-full bg-forest px-6 text-base font-semibold text-paper shadow-sm hover:bg-forest-deep"
        >
          {COPY.cta}
        </Link>
        <p className="max-w-md text-sm text-muted">{COPY.underCta}</p>
      </div>
      <ol className="mt-14 grid gap-4 sm:grid-cols-3">
        {[
          ["Vier Fragen", "PLZ, Typ, Baujahr, Heizung. Weiß ich nicht ist immer erlaubt."],
          ["Sofort eine Spanne", "Kein falsches Punkt-Euro. Annahmen sichtbar."],
          ["Dann Feinschliff", "Dämmung, Wohnfläche, Preise — live nachziehen."],
        ].map(([t, d]) => (
          <li key={t} className="rounded-2xl border border-line bg-card p-4">
            <p className="serif text-lg text-forest">{t}</p>
            <p className="mt-1 text-sm text-muted">{d}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
