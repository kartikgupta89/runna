import type { GoalRace, Phase } from "./types";

export interface PhaseBlock {
  phase: Phase;
  startWeek: number; // 1-indexed, inclusive
  endWeek: number;   // 1-indexed, inclusive
}

// ─── Plan-length constraints ─────────────────────────────────────────────────

const PLAN_WEEK_RANGE: Record<GoalRace, [min: number, max: number]> = {
  fivek: [8, 12],
  tenk: [10, 14],
  halfMarathon: [12, 16],
  marathon: [16, 20],
};

/** Clamp requested weeks to the valid range for the goal race. */
export function clampPlanWeeks(weeks: number, goalRace: GoalRace): number {
  const [min, max] = PLAN_WEEK_RANGE[goalRace];
  return Math.max(min, Math.min(max, weeks));
}

/** Weeks from `from` until `raceDate`, floored. */
export function weeksUntilDate(raceDate: Date, from: Date = new Date()): number {
  const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
  return Math.floor((raceDate.getTime() - from.getTime()) / MS_PER_WEEK);
}

// ─── Phase splitting ──────────────────────────────────────────────────────────

/**
 * Splits totalWeeks into base / build / peak / taper blocks.
 * Proportions: base 25%, build 35%, peak 25%, taper 15% (min 2 weeks).
 */
export function splitPhases(totalWeeks: number): PhaseBlock[] {
  const taperWeeks = Math.max(2, Math.round(totalWeeks * 0.15));
  const remaining = totalWeeks - taperWeeks;

  // Among the non-taper weeks, keep the 25:35:25 ratio (base:build:peak = 5:7:5)
  const baseWeeks = Math.max(1, Math.round(remaining * (5 / 17)));
  const buildWeeks = Math.max(1, Math.round(remaining * (7 / 17)));
  const peakWeeks = Math.max(1, remaining - baseWeeks - buildWeeks);

  let cursor = 1;
  const blocks: PhaseBlock[] = [];
  for (const [phase, count] of [
    ["base", baseWeeks],
    ["build", buildWeeks],
    ["peak", peakWeeks],
    ["taper", taperWeeks],
  ] as [Phase, number][]) {
    blocks.push({ phase, startWeek: cursor, endWeek: cursor + count - 1 });
    cursor += count;
  }
  return blocks;
}

/** Return the phase for a given 1-indexed week number. */
export function phaseForWeek(weekNumber: number, phases: PhaseBlock[]): Phase {
  for (const b of phases) {
    if (weekNumber >= b.startWeek && weekNumber <= b.endWeek) return b.phase;
  }
  return phases[phases.length - 1].phase;
}

// ─── Mileage targets ──────────────────────────────────────────────────────────

const DEFAULT_START_KM: Record<GoalRace, number> = {
  fivek: 25,
  tenk: 35,
  halfMarathon: 45,
  marathon: 55,
};

/** Peak weekly km at VDOT 45 (mid-pack), scaled ±1% per VDOT point. */
const PEAK_KM_BASE: Record<GoalRace, number> = {
  fivek: 50,
  tenk: 65,
  halfMarathon: 75,
  marathon: 85,
};

export function defaultStartKm(goalRace: GoalRace): number {
  return DEFAULT_START_KM[goalRace];
}

export function peakKm(goalRace: GoalRace, vdot: number): number {
  const base = PEAK_KM_BASE[goalRace];
  const scale = 1 + (vdot - 45) * 0.01;
  return base * Math.max(0.75, Math.min(1.25, scale));
}

// ─── Weekly-mileage progression ───────────────────────────────────────────────

/**
 * Returns targetKm for every week of the plan (index 0 = week 1).
 *
 * Rules:
 *   - Non-recovery weeks: +10% of the *progression* km, capped at peakKm
 *   - Recovery weeks (every 4th): 70% of the progression km
 *   - Taper weeks: linearly reduce from 65% → 35% of achieved peak
 */
export function computeWeeklyKm(
  totalWeeks: number,
  startKm: number,
  maxKm: number,
  phases: PhaseBlock[],
): number[] {
  const taperBlock = phases.find((b) => b.phase === "taper")!;
  const taperWeekCount = taperBlock.endWeek - taperBlock.startWeek + 1;

  let progressKm = startKm; // the "trajectory" value — not reset by recovery weeks
  let achievedPeak = startKm;
  const result: number[] = [];

  for (let w = 1; w <= totalWeeks; w++) {
    const phase = phaseForWeek(w, phases);

    if (phase === "taper") {
      const i = w - taperBlock.startWeek; // 0-based index within taper
      const frac = taperWeekCount > 1 ? i / (taperWeekCount - 1) : 0;
      // Linear from 65% → 35% of achievedPeak
      result.push(achievedPeak * (0.65 - frac * 0.30));
      continue;
    }

    const isRecovery = w % 4 === 0;

    if (isRecovery) {
      result.push(progressKm * 0.7);
    } else {
      progressKm = Math.min(progressKm * 1.1, maxKm);
      achievedPeak = Math.max(achievedPeak, progressKm);
      result.push(progressKm);
    }
  }

  return result;
}
