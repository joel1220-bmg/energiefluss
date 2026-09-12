import { z } from "zod";

const tri = z.enum(["yes", "no", "unknown"]);
const ev = z.enum(["yes", "planned", "no", "unknown"]);
const hasPv = z.enum(["none", "yes", "unknown"]);

export const draftSchema = z.object({
  plz: z.string(),
  householdKwhYear: z.number().nullable(),
  householdCostEurYear: z.number().nullable(),
  hasEv: ev.nullable(),
  evKmYear: z.number().nullable(),
  evKwhYear: z.number().nullable(),
  hasHeatPump: tri.nullable(),
  heatPumpKwhYear: z.number().nullable(),
  hasPv: hasPv,
  priceElectricity: z.number().nullable(),
  pvKwpOverride: z.number().nullable(),
  batteryKwhOverride: z.number().nullable(),
  costFactor: z.number(),
  asOf: z.string(),
});

export type DraftInput = z.infer<typeof draftSchema>;
