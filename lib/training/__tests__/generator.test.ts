import { describe, it, expect } from "vitest";
import { generatePlan } from "../generator";
import type { GeneratedPlan } from "../generator";

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const MONDAY_JAN_6 = new Date("2025-01-06T00:00:00.000Z");

/** 5K plan: 10 weeks out, 4 days/week, 20:00 5K reference. */
function make5kPlan(): GeneratedPlan {
  const raceDate = new Date(MONDAY_JAN_6);
  raceDate.setDate(raceDate.getDate() + 10 * 7); // 10 weeks later
  return generatePlan({
    recentRace: { distanceMeters: 5000, timeSeconds: 20 * 60 },
    goalRace: "fivek",
    raceDate,
    startDate: MONDAY_JAN_6,
    daysPerWeek: 4,
    planId: "test-5k",
  });
}

/** Marathon plan: 16 weeks out, 4 days/week, 4:00 marathon reference. */
function makeMarathonPlan(): GeneratedPlan {
  const raceDate = new Date(MONDAY_JAN_6);
  raceDate.setDate(raceDate.getDate() + 16 * 7);
  return generatePlan({
    recentRace: { distanceMeters: 42195, timeSeconds: 4 * 60 * 60 },
    goalRace: "marathon",
    raceDate,
    startDate: MONDAY_JAN_6,
    daysPerWeek: 4,
    currentWeeklyKm: 35,
    planId: "test-marathon",
  });
}

/** 10K plan: 12 weeks out, 4 days/week, 45:00 10K reference. */
function make10kPlan(): GeneratedPlan {
  const raceDate = new Date(MONDAY_JAN_6);
  raceDate.setDate(raceDate.getDate() + 12 * 7);
  return generatePlan({
    recentRace: { distanceMeters: 10000, timeSeconds: 45 * 60 },
    goalRace: "tenk",
    raceDate,
    startDate: MONDAY_JAN_6,
    daysPerWeek: 4,
    planId: "test-10k",
  });
}

/** Half-marathon plan: 12 weeks out, 5 days/week, 1:55 half reference. */
function makeHalfPlan(): GeneratedPlan {
  const raceDate = new Date(MONDAY_JAN_6);
  raceDate.setDate(raceDate.getDate() + 12 * 7);
  return generatePlan({
    recentRace: { distanceMeters: 21097, timeSeconds: 115 * 60 },
    goalRace: "halfMarathon",
    raceDate,
    startDate: MONDAY_JAN_6,
    daysPerWeek: 5,
    planId: "test-half",
  });
}

const HARD_TYPES = new Set(["tempo", "intervals", "repetitions", "marathonPace"]);

// ─── Structure ────────────────────────────────────────────────────────────────

describe("plan structure", () => {
  it("5K plan has exactly 10 weeks", () => {
    expect(make5kPlan().weeks).toHaveLength(10);
  });

  it("marathon plan has exactly 16 weeks", () => {
    expect(makeMarathonPlan().weeks).toHaveLength(16);
  });

  it("every week has 7 workout slots (one per day of the week)", () => {
    for (const week of makeMarathonPlan().weeks) {
      expect(week.workouts).toHaveLength(7);
    }
  });

  it("phases appear in order: base → build → peak → taper", () => {
    const plan = makeMarathonPlan();
    const phaseOrder = plan.phases.map((b) => b.phase);
    expect(phaseOrder).toEqual(["base", "build", "peak", "taper"]);
  });

  it("phase blocks are contiguous and cover all weeks", () => {
    const plan = makeMarathonPlan();
    let expectedStart = 1;
    for (const block of plan.phases) {
      expect(block.startWeek).toBe(expectedStart);
      expectedStart = block.endWeek + 1;
    }
    expect(expectedStart - 1).toBe(plan.weeks.length);
  });

  it("each week's phase matches the phase block it falls in", () => {
    const plan = makeMarathonPlan();
    for (const week of plan.weeks) {
      const block = plan.phases.find(
        (b) => week.weekNumber >= b.startWeek && week.weekNumber <= b.endWeek,
      );
      expect(week.phase).toBe(block?.phase);
    }
  });

  it("taper has at least 2 weeks", () => {
    const taperBlock = makeMarathonPlan().phases.find((b) => b.phase === "taper")!;
    expect(taperBlock.endWeek - taperBlock.startWeek + 1).toBeGreaterThanOrEqual(2);
  });
});

// ─── Mileage progression ──────────────────────────────────────────────────────

describe("mileage progression", () => {
  it("recovery weeks (every 4th) are lower than the preceding non-recovery week", () => {
    const plan = makeMarathonPlan();
    const nonTaper = plan.weeks.filter((w) => w.phase !== "taper");
    for (let i = 3; i < nonTaper.length; i += 4) {
      const recovery = nonTaper[i];
      const preceding = nonTaper[i - 1];
      expect(recovery.targetKm).toBeLessThan(preceding.targetKm);
    }
  });

  it("consecutive building weeks never exceed a 10% increase", () => {
    const plan = makeMarathonPlan();
    const buildingWeeks = plan.weeks.filter(
      (w, i) => w.phase !== "taper" && (i + 1) % 4 !== 0,
    );
    for (let i = 1; i < buildingWeeks.length; i++) {
      const prev = buildingWeeks[i - 1];
      const curr = buildingWeeks[i];
      // Allow bounce-back after a recovery week (curr might jump from low recovery)
      if (prev.targetKm > curr.targetKm * 0.5) {
        // Only check the 10% rule when prev is not a recovery trough
        expect(curr.targetKm).toBeLessThanOrEqual(prev.targetKm * 1.11);
      }
    }
  });

  it("taper weeks are all below the peak mileage week", () => {
    const plan = makeMarathonPlan();
    const peakWeekKm = Math.max(...plan.weeks.map((w) => w.targetKm));
    const taperWeeks = plan.weeks.filter((w) => w.phase === "taper");
    for (const tw of taperWeeks) {
      expect(tw.targetKm).toBeLessThan(peakWeekKm);
    }
  });

  it("the last 2 weeks are both lower than the plan's peak mileage week", () => {
    const plan = makeMarathonPlan();
    const peakKm = Math.max(...plan.weeks.map((w) => w.targetKm));
    const last2 = plan.weeks.slice(-2);
    for (const w of last2) {
      expect(w.targetKm).toBeLessThan(peakKm);
    }
  });

  it("16-week marathon plan peaks between 55 and 100 km/week (mid-pack)", () => {
    const plan = makeMarathonPlan();
    const peakKm = Math.max(...plan.weeks.map((w) => w.targetKm));
    expect(peakKm).toBeGreaterThan(55);
    expect(peakKm).toBeLessThan(100);
  });

  it("10K plan: no single long run exceeds 16 km", () => {
    const plan = make10kPlan();
    for (const week of plan.weeks) {
      const longRun = week.workouts.find((w) => w.type === "long");
      if (longRun) {
        const km = longRun.plannedDistanceMeters / 1000;
        expect(km, `week ${week.weekNumber} long run ${km.toFixed(1)} km`).toBeLessThanOrEqual(16);
      }
    }
  });

  it("5K plan: no single long run exceeds 13 km", () => {
    const plan = make5kPlan();
    for (const week of plan.weeks) {
      const longRun = week.workouts.find((w) => w.type === "long");
      if (longRun) {
        const km = longRun.plannedDistanceMeters / 1000;
        expect(km, `week ${week.weekNumber} long run ${km.toFixed(1)} km`).toBeLessThanOrEqual(13);
      }
    }
  });
});

// ─── Workout scheduling ───────────────────────────────────────────────────────

describe("workout scheduling", () => {
  it("the long run is always on Sunday (JS getDay() === 0)", () => {
    const plan = makeMarathonPlan();
    for (const week of plan.weeks.slice(0, -1)) { // exclude race week
      const longRun = week.workouts.find((w) => w.type === "long");
      if (longRun) {
        expect(longRun.date.getDay(), `week ${week.weekNumber} long run`).toBe(0);
      }
    }
  });

  it("no two consecutive calendar days within a week are both hard workouts", () => {
    const plan = make5kPlan();
    for (const week of plan.weeks) {
      const hardDayIndices = week.workouts
        .filter((w) => HARD_TYPES.has(w.type))
        .map((w) => w.date.getDay()); // 0=Sun, 1=Mon …

      for (let i = 1; i < hardDayIndices.length; i++) {
        const diff = Math.abs(hardDayIndices[i] - hardDayIndices[i - 1]);
        expect(diff, `week ${week.weekNumber}: hard days on consecutive days`).toBeGreaterThan(1);
      }
    }
  });

  it("5-day plan has 5 non-rest workouts per week", () => {
    const plan = makeHalfPlan();
    for (const week of plan.weeks) {
      const runDays = week.workouts.filter((w) => w.type !== "rest");
      expect(runDays).toHaveLength(5);
    }
  });

  it("4-day plan has 4 non-rest workouts per week", () => {
    const plan = makeMarathonPlan();
    for (const week of plan.weeks) {
      const runDays = week.workouts.filter((w) => w.type !== "rest");
      expect(runDays).toHaveLength(4);
    }
  });

  it("the final week contains a race-day workout", () => {
    const plan = makeMarathonPlan();
    const lastWeek = plan.weeks[plan.weeks.length - 1];
    const race = lastWeek.workouts.find((w) => w.type === "race");
    expect(race).toBeDefined();
  });

  it("base-phase weeks have no tempo/interval workouts (all easy and long)", () => {
    const plan = make5kPlan();
    const baseWeeks = plan.weeks.filter((w) => w.phase === "base");
    for (const week of baseWeeks) {
      const hardWorkouts = week.workouts.filter((w) => HARD_TYPES.has(w.type));
      expect(hardWorkouts).toHaveLength(0);
    }
  });

  it("peak-phase weeks include at least one interval or tempo workout", () => {
    const plan = make5kPlan();
    const peakWeeks = plan.weeks.filter((w) => w.phase === "peak");
    for (const week of peakWeeks) {
      const hard = week.workouts.filter((w) => HARD_TYPES.has(w.type));
      expect(hard.length).toBeGreaterThan(0);
    }
  });
});

// ─── Paces ────────────────────────────────────────────────────────────────────

describe("workout paces", () => {
  it("all workouts with a pace target reference a valid pace type (E/M/T/I/R)", () => {
    const plan = makeMarathonPlan();
    const validTypes = new Set(["E", "M", "T", "I", "R"]);
    for (const week of plan.weeks) {
      for (const workout of week.workouts) {
        for (const seg of workout.segments) {
          if (seg.paceTarget) {
            expect(validTypes.has(seg.paceTarget.paceType)).toBe(true);
          }
        }
      }
    }
  });

  it("all pace targets have min < max", () => {
    const plan = makeMarathonPlan();
    for (const week of plan.weeks) {
      for (const workout of week.workouts) {
        for (const seg of workout.segments) {
          if (seg.paceTarget) {
            expect(seg.paceTarget.minSecPerKm).toBeLessThan(seg.paceTarget.maxSecPerKm);
          }
        }
      }
    }
  });

  it("VDOT calculated from 4:00 marathon reference is between 37 and 39", () => {
    expect(makeMarathonPlan().vdot).toBeGreaterThan(37);
    expect(makeMarathonPlan().vdot).toBeLessThan(39);
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe("generatePlan — error handling", () => {
  it("throws when daysPerWeek < 3", () => {
    expect(() =>
      generatePlan({
        recentRace: { distanceMeters: 5000, timeSeconds: 1200 },
        goalRace: "fivek",
        raceDate: new Date("2025-06-01"),
        daysPerWeek: 2,
      }),
    ).toThrow();
  });

  it("throws when daysPerWeek > 6", () => {
    expect(() =>
      generatePlan({
        recentRace: { distanceMeters: 5000, timeSeconds: 1200 },
        goalRace: "fivek",
        raceDate: new Date("2025-06-01"),
        daysPerWeek: 7,
      }),
    ).toThrow();
  });
});
