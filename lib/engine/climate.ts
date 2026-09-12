import climateJson from "@/data/climate.plz.json";

export type ClimateZone = {
  factor: number;
  hdd: number;
  label: string;
  pvYieldKwhPerKwp: number;
  prefix: string;
};

type ClimateFile = {
  default: { factor: number; hdd: number; label: string; pvYieldKwhPerKwp: number };
  prefixes: Record<string, { factor: number; hdd: number; label: string; pvYieldKwhPerKwp: number }>;
};

const data = climateJson as ClimateFile;

export function lookupClimate(plz: string): ClimateZone {
  const digits = (plz || "").replace(/\D/g, "");
  if (digits.length >= 2) {
    const two = digits.slice(0, 2);
    const hit = data.prefixes[two];
    if (hit) return { ...hit, prefix: two };
  }
  if (digits.length >= 1) {
    const one = digits.slice(0, 1);
    const keys = Object.keys(data.prefixes).filter((k) => k.startsWith(one));
    if (keys.length) {
      const avg =
        keys.reduce((s, k) => s + data.prefixes[k]!.factor, 0) / keys.length;
      const hdd = keys.reduce((s, k) => s + data.prefixes[k]!.hdd, 0) / keys.length;
      const pv =
        keys.reduce((s, k) => s + data.prefixes[k]!.pvYieldKwhPerKwp, 0) / keys.length;
      return {
        factor: Math.round(avg * 100) / 100,
        hdd: Math.round(hdd),
        label: `PLZ ${one}… (Mittel)`,
        pvYieldKwhPerKwp: Math.round(pv),
        prefix: one,
      };
    }
  }
  return { ...data.default, prefix: "" };
}
