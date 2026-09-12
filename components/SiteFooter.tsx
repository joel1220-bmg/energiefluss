import Link from "next/link";
import { COPY } from "@/lib/engine/labels";

export function SiteFooter() {
  return (
    <footer className="no-print mt-16 border-t border-line bg-forest-deep text-paper">
      <div className="mx-auto max-w-3xl px-4 py-8 text-sm leading-relaxed">
        <p className="serif text-base text-white">Energiefluss Haus-Coach</p>
        <p className="mt-2 text-paper/80">{COPY.privacy}</p>
        <p className="mt-2 text-paper/70">{COPY.underCta}</p>
        <p className="mt-3 text-paper/60">
          Rechenkern nur im Browser. Keine Konten, keine Tracker, keine Newsletter.
        </p>
        <ul className="mt-4 flex flex-wrap gap-4">
          <li>
            <Link className="underline decoration-paper/30 underline-offset-2 hover:decoration-paper" href="/datenschutz">
              Datenschutz
            </Link>
          </li>
          <li>
            <Link className="underline decoration-paper/30 underline-offset-2 hover:decoration-paper" href="/impressum">
              Impressum
            </Link>
          </li>
        </ul>
        <p className="mt-6 text-xs text-paper/45">Stand Orientierung 2026-09-12 · {COPY.grantDisclaimer}</p>
      </div>
    </footer>
  );
}
