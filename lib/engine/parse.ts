/** German-number parsing and formatting. Accepts 1.200 and 1200. */

export function parseDeNumber(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  let s = input.trim().replace(/\s/g, "").replace(/€/g, "").replace(/%/g, "");
  if (!s || s === "-" || s === "–") return null;
  s = s.replace(/−/g, "-");
  const neg = s.startsWith("-");
  if (neg) s = s.slice(1);
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = s.split(",");
    if (parts.length === 2 && parts[1]!.length === 3 && parts[0]!.length <= 3 && !parts[0]!.includes(".")) {
      // 1,200 → thousands (rare DE); still treat as decimal if we only have one comma
      // Standard DE: comma is decimal. 1,200 would be 1.2 if 3 digits? No: 1,2 = 1.2; 1,200 = 1.200
      s = s.replace(",", ".");
    } else {
      s = s.replace(",", ".");
    }
  } else if (hasDot) {
    const parts = s.split(".");
    if (parts.length === 2 && parts[1]!.length === 3 && parts[0]!.length > 0 && parts[0]!.length <= 3) {
      // 1.200 → 1200 (DE thousands)
      s = parts.join("");
    } else if (parts.length > 2) {
      s = parts.join("");
    }
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

export function formatDeNumber(n: number, decimals = 0): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatEUR(n: number, decimals = 0): string {
  return `${formatDeNumber(n, decimals)}\u00a0€`;
}

export function formatRangeEUR(low: number, high: number, decimals = 0): string {
  const a = Math.round(low);
  const b = Math.round(high);
  if (Math.abs(b - a) < 1) return formatEUR(a, decimals);
  return `${formatDeNumber(a, decimals)}–${formatDeNumber(b, decimals)}\u00a0€`;
}

export function formatKwh(n: number): string {
  return `${formatDeNumber(Math.round(n))}\u00a0kWh`;
}

export function formatRangeKwh(low: number, high: number): string {
  return `${formatDeNumber(Math.round(low))}–${formatDeNumber(Math.round(high))}\u00a0kWh`;
}

export function formatYears(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n > 40) return "> 40 Jahre";
  return `${formatDeNumber(n, n < 10 ? 1 : 0)}\u00a0Jahre`;
}

export function todayIso(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
