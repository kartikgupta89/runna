import type { GoalRace, Phase, Workout } from "./types";
import { calculateVDOT, paceTableForVDOT, type PaceTable } from "./vdot";
import {
  clampPlanWeeks,
  computeWeeklyKm,
  defaultStartKm,
  peakKm,
  phaseForWeek,
  splitPhases,
  type PhaseBlock,
  weeksUntilDate,
} from "./periodization";
import { buildWeek, raceWorkout } from "./workouts";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface PlanInput {
  /** The reference race or time-trial used to establish VDOT. */
  recentRace: { distanceMeters: number; timeSeconds: number };
  goalRace: GoalRace;
  /** Date of the goal race. */
  raceDate: Date;
  /** Monday of the first training week. Defaults to next Monday. */
  startDate?: Date;
  /** Running days per week — 3 to 6. */
  daysPerWeek: number;
  /** Current weekly training volume in km. Defaults to race-specific start. */
  currentWeeklyKm?: number;
  /** Passed through as planId prefix. */
  planId?: string;
}

export interface TrainingWeek {
  weekNumber: number;
  phase: Phase;
  targetKm: number;
  actualKm: number;
  weekStartDate: Date;
  workouts: Workout[];
}

export interface GeneratedPlan {
  planId: string;
  input: PlanInput;
  vdot: number;
  paces: PaceTable;
  phases: PhaseBlock[];
  weeks: TrainingWeek[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nextMonday(from: Date): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 1=Mon …
  const daysUntilMon = day === 1 ? 0 : ((8 - day) % 7) || 7;
  d.setDate(d.getDate() + daysUntilMon);
  return d;
}

function sumDistances(workouts: Workout[]): number {
  return workouts.reduce((t, w) => t + w.plannedDistanceMeters, 0) / 1000;
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generatePlan(input: PlanInput): GeneratedPlan {
  if (input.daysPerWeek < 3 || input.daysPerWeek > 6) {
    throw new Error("daysPerWeek must be between 3 and 6");
  }

  const planId = input.planId ?? `plan-${Date.now()}`;
  const startDate = input.startDate ?? nextMonday(new Date());

  // 1. Establish fitness baseline
  const vdot = calculateVDOT(
    input.recentRace.distanceMeters,
    input.recentRace.timeSeconds,
  );
  const paces = paceTableForVDOT(vdot);

  // 2. Plan length — weeks from startDate to raceDate, clamped to valid range
  const rawWeeks = weeksUntilDate(input.raceDate, startDate);
  const totalWeeks = clampPlanWeeks(rawWeeks, input.goalRace);
  const phases = splitPhases(totalWeeks);

  // 3. Mileage progression
  const startKm = input.currentWeeklyKm ?? defaultStartKm(input.goalRace);
  const maxKm = peakKm(input.goalRace, vdot);
  const weeklyTargets = computeWeeklyKm(totalWeeks, startKm, maxKm, phases);

  // 4. Build each week
  const weeks: TrainingWeek[] = [];
  for (let w = 1; w <= totalWeeks; w++) {
    const phase = phaseForWeek(w, phases);
    const targetKm = weeklyTargets[w - 1];
    const weekStartDate = new Date(startDate);
    weekStartDate.setDate(weekStartDate.getDate() + (w - 1) * 7);

    const workouts = buildWeek({
      planId,
      weekNumber: w,
      phase,
      targetKm,
      paces,
      goalRace: input.goalRace,
      daysPerWeek: input.daysPerWeek,
      weekStartDate,
    });

    weeks.push({
      weekNumber: w,
      phase,
      targetKm,
      actualKm: sumDistances(workouts),
      weekStartDate,
      workouts,
    });
  }

  // 5. Add race day to the final week
  const lastWeek = weeks[weeks.length - 1];
  const raceSunday = lastWeek.workouts.find((w) => w.date.getDay() === 0); // Sunday
  if (raceSunday) {
    // Replace the long run on the final Sunday with a race workout
    const idx = lastWeek.workouts.indexOf(raceSunday);
    lastWeek.workouts[idx] = raceWorkout(
      {
        id: `${planId}-race`,
        planId,
        date: raceSunday.date,
        weekNumber: lastWeek.weekNumber,
        phase: lastWeek.phase,
        paces,
      },
      input.goalRace,
    );
    lastWeek.actualKm = sumDistances(lastWeek.workouts);
  }

  return { planId, input, vdot, paces, phases, weeks };
}
