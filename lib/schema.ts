import { z } from "zod";

const measureId = z.enum([
  "hydraulicBalancing",
  "topFloorCeiling",
  "basementCeiling",
  "roofInsulation",
  "wdvs",
  "windowTriple",
  "heatPumpAirWater",
  "pvWithStorage",
  "ventilationCentral",
  "energyAdvice",
]);

const condition = z.enum(["original", "partial", "renewed", "none", "unknown"]);

export const draftSchema = z.object({
  plz: z.string(),
  buildingType: z.enum(["EFH", "DHH", "RH", "MFH", "unknown"]).nullable(),
  decade: z
    .enum(["pre1950", "1950-69", "1970-89", "1990-2001", "2002-15", "from2016", "unknown"])
    .nullable(),
  heating: z
    .enum(["gas", "oil", "heatpump", "district", "nightstorage", "other", "unknown"])
    .nullable(),
  insulation: z.enum(["weak", "mixed", "good", "unknown"]),
  livingAreaM2: z.number().nullable(),
  persons: z.number().nullable(),
  heatingCostEurYear: z.number().nullable(),
  heatingKwhYear: z.number().nullable(),
  dhwElectric: z.union([z.boolean(), z.literal("unknown")]),
  roof: condition,
  facade: condition,
  windows: condition,
  basement: condition,
  hasPv: z.union([z.boolean(), z.literal("unknown")]),
  goals: z.array(z.enum(["cost", "comfort", "climate", "independence"])),
  incomeBand: z.enum(["upto30k", "upto40k", "upto50k", "above", "preferNot"]),
  hasMinorChild: z.boolean(),
  climateBonus: z.union([z.boolean(), z.literal("auto")]),
  costFactor: z.number(),
  priceHeating: z.number().nullable(),
  priceElectricity: z.number().nullable(),
  priceHeatpump: z.number().nullable(),
  alreadyDone: z.array(measureId),
  asOf: z.string(),
  includeIsfp: z.boolean(),
  dwellingUnits: z.number().nullable(),
});

export type DraftInput = z.infer<typeof draftSchema>;
