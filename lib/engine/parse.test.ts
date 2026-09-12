import { describe, expect, it } from "vitest";
import { formatDeNumber, formatRangeEUR, parseDeNumber } from "./parse";

describe("parseDeNumber", () => {
  it("accepts 1.200 as thousands", () => {
    expect(parseDeNumber("1.200")).toBe(1200);
  });
  it("accepts 1200", () => {
    expect(parseDeNumber("1200")).toBe(1200);
  });
  it("accepts 1.200,50", () => {
    expect(parseDeNumber("1.200,50")).toBe(1200.5);
  });
  it("accepts 12,5", () => {
    expect(parseDeNumber("12,5")).toBe(12.5);
  });
  it("accepts empty as null", () => {
    expect(parseDeNumber("")).toBeNull();
    expect(parseDeNumber("  ")).toBeNull();
  });
  it("rejects junk", () => {
    expect(parseDeNumber("abc")).toBeNull();
  });
});

describe("formatDeNumber", () => {
  it("uses German grouping", () => {
    expect(formatDeNumber(1200)).toBe("1.200");
  });
  it("range never a single exact mid", () => {
    const s = formatRangeEUR(27000, 40000);
    expect(s).toMatch(/27.000/);
    expect(s).toMatch(/40.000/);
    expect(s).toMatch(/–/);
  });
});
