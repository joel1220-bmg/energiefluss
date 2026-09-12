import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="no-print border-b border-line/80 bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="serif text-lg font-semibold tracking-tight text-forest">Energiefluss</span>
          <span className="text-sm text-muted">Haus-Coach</span>
        </Link>
        <nav aria-label="Service" className="flex gap-3 text-sm text-muted">
          <Link href="/datenschutz" className="hover:text-ink">
            Datenschutz
          </Link>
          <Link href="/impressum" className="hover:text-ink">
            Impressum
          </Link>
        </nav>
      </div>
    </header>
  );
}
