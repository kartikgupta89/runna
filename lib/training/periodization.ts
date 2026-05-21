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
  fivek: 20,
  tenk: 25,
  halfMarathon: 40,
  marathon: 50,
};

/** Peak weekly km at VDOT 45 (mid-pack), scaled ±1% per VDOT point. */
const PEAK_KM_BASE: Record<GoalRace, number> = {
  fivek: 35,   // long run ~11 km at peak
  tenk: 50,    // long run ~16 km at peak
  halfMarathon: 65, // long run ~21 km at peak (≈ race distance)
  marathon: 80,
};

/**
 * Default starting weekly km, scaled by VDOT so beginners don't start
 * with elite-level volume. VDOT 45 = 100% of base; ±2.5% per VDOT point,
 * clamped between 60% and 125%.
 */
export function defaultStartKm(goalRace: GoalRace, vdot: number): number {
  const base = DEFAULT_START_KM[goalRace];
  const scale = Math.max(0.6, Math.min(1.25, 1 + (vdot - 45) * 0.025));
  return Math.round(base * scale);
}

export function peakKm(goalRace: GoalRace, vdot: number): number {
  const base = PEAK_KM_BASE[goalRace];
  // ±2% per VDOT point, clamped between 60% and 125%
  const scale = Math.max(0.6, Math.min(1.25, 1 + (vdot - 45) * 0.02));
  return base * scale;
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
      // Week 1 starts exactly at startKm; subsequent building weeks grow 10%
      if (w > 1) progressKm = Math.min(progressKm * 1.1, maxKm);
      achievedPeak = Math.max(achievedPeak, progressKm);
      result.push(progressKm);
    }
  }

  return result;
}
