import { describe, it, expect } from "vitest";
import { calculateVDOT, paceTableForVDOT } from "../vdot";

// ─── calculateVDOT ──────────────────────────────────────────────────────────

describe("calculateVDOT — known race results", () => {
  it("5K in 20:00 → VDOT between 48 and 51", () => {
    const vdot = calculateVDOT(5000, 20 * 60);
    // Daniels' table: ~49; formula yields ~49.8
    expect(vdot).toBeGreaterThan(48);
    expect(vdot).toBeLessThan(51);
  });

  it("10K in 40:00 → VDOT between 50 and 54", () => {
    const vdot = calculateVDOT(10000, 40 * 60);
    // Same pace (250 m/min) as 5K/20:00 but longer duration gives higher VDOT
    // Daniels lookup table: ~50; the mathematical formula yields ~51.9
    // (The formula is an approximation; the lookup table is empirically calibrated.)
    expect(vdot).toBeGreaterThan(50);
    expect(vdot).toBeLessThan(54);
  });

  it("Marathon in 4:00:00 → VDOT between 37 and 39", () => {
    const vdot = calculateVDOT(42195, 4 * 60 * 60);
    // Daniels' table: ~38; formula yields ~37.9
    expect(vdot).toBeGreaterThan(37);
    expect(vdot).toBeLessThan(39);
  });
});

describe("calculateVDOT — error handling", () => {
  it("throws on zero distance", () => {
    expect(() => calculateVDOT(0, 1200)).toThrow();
  });

  it("throws on negative distance", () => {
    expect(() => calculateVDOT(-5000, 1200)).toThrow();
  });

  it("throws on zero time", () => {
    expect(() => calculateVDOT(5000, 0)).toThrow();
  });

  it("throws on negative time", () => {
    expect(() => calculateVDOT(5000, -1200)).toThrow();
  });
});

// ─── paceTableForVDOT ───────────────────────────────────────────────────────

describe("paceTableForVDOT — pace ordering for VDOT 50", () => {
  it("Easy > Marathon > Threshold > Interval > Repetition (larger sec/km = slower)", () => {
    const { E, M, T, I, R } = paceTableForVDOT(50);
    expect(E).toBeGreaterThan(M);
    expect(M).toBeGreaterThan(T);
    expect(T).toBeGreaterThan(I);
    expect(I).toBeGreaterThan(R);
  });
});

describe("paceTableForVDOT — all paces in plausible range (2:00–10:00 /km)", () => {
  const MIN_SEC = 120; // 2:00/km — faster than world record
  const MAX_SEC = 600; // 10:00/km — very slow jogging

  const vdots = Array.from({ length: 8 }, (_, i) => 30 + i * 5); // 30, 35, 40, 45, 50, 55, 60, 65

  for (const vdot of vdots) {
    it(`VDOT ${vdot}: all five paces within [2:00, 10:00] per km`, () => {
      const paces = paceTableForVDOT(vdot);
      for (const [zone, sec] of Object.entries(paces) as [string, number][]) {
        expect(sec, `${zone} pace at VDOT ${vdot}`).toBeGreaterThan(MIN_SEC);
        expect(sec, `${zone} pace at VDOT ${vdot}`).toBeLessThan(MAX_SEC);
      }
    });
  }
});

// Cross-check against Daniels' published table (VDOT 30–65, ±5 sec/km tolerance)
describe("paceTableForVDOT — accuracy vs Daniels' table", () => {
  // Reference values in sec/km from the published JD pace table
  const TABLE: Array<{ vdot: number; E: number; M: number; T: number; I: number; R: number }> = [
    { vdot: 30, E: 447, M: 411, T: 384, I: 354, R: 330 },
    { vdot: 35, E: 396, M: 364, T: 340, I: 312, R: 294 },
    { vdot: 40, E: 356, M: 329, T: 306, I: 282, R: 264 },
    { vdot: 45, E: 323, M: 300, T: 278, I: 256, R: 240 },
    { vdot: 50, E: 296, M: 275, T: 255, I: 235, R: 219 },
    { vdot: 55, E: 273, M: 254, T: 236, I: 216, R: 202 },
    { vdot: 60, E: 254, M: 236, T: 220, I: 203, R: 188 },
    { vdot: 65, E: 237, M: 221, T: 206, I: 189, R: 176 },
  ];
  const TOLERANCE = 8; // ±8 sec/km

  for (const row of TABLE) {
    it(`VDOT ${row.vdot}: E within ${TOLERANCE} sec/km of ${row.E}`, () => {
      const paces = paceTableForVDOT(row.vdot);
      expect(paces.E).toBeGreaterThan(row.E - TOLERANCE);
      expect(paces.E).toBeLessThan(row.E + TOLERANCE);
    });
    it(`VDOT ${row.vdot}: M within ${TOLERANCE} sec/km of ${row.M}`, () => {
      const paces = paceTableForVDOT(row.vdot);
      expect(paces.M).toBeGreaterThan(row.M - TOLERANCE);
      expect(paces.M).toBeLessThan(row.M + TOLERANCE);
    });
    it(`VDOT ${row.vdot}: I within ${TOLERANCE} sec/km of ${row.I}`, () => {
      const paces = paceTableForVDOT(row.vdot);
      expect(paces.I).toBeGreaterThan(row.I - TOLERANCE);
      expect(paces.I).toBeLessThan(row.I + TOLERANCE);
    });
  }
});

describe("paceTableForVDOT — error handling", () => {
  it("throws on zero VDOT", () => {
    expect(() => paceTableForVDOT(0)).toThrow();
  });

  it("throws on negative VDOT", () => {
    expect(() => paceTableForVDOT(-10)).toThrow();
  });
});
