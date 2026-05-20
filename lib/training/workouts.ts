import type { GoalRace, Phase, Workout, WorkoutSegment, WorkoutType } from "./types";
import type { PaceTable } from "./vdot";

const PACE_TOLERANCE = 15; // ±15 sec/km around target pace

let _idCounter = 0;
function nextId(planId: string, week: number, day: number): string {
  return `${planId}-w${week}-d${day}-${++_idCounter}`;
}

function paceTarget(
  paceType: "E" | "M" | "T" | "I" | "R",
  centre: number,
): WorkoutSegment["paceTarget"] {
  return {
    paceType,
    minSecPerKm: centre - PACE_TOLERANCE,
    maxSecPerKm: centre + PACE_TOLERANCE,
  };
}

/** km × sec/km = seconds */
function durationSec(km: number, secPerKm: number): number {
  return km * secPerKm;
}

/** (minutes × 60) / sec/km = km */
function kmFromMinutes(minutes: number, secPerKm: number): number {
  return (minutes * 60) / secPerKm;
}

// ─── Individual workout builders ──────────────────────────────────────────────

export interface WorkoutParams {
  id: string;
  planId: string;
  date: Date;
  weekNumber: number;
  phase: Phase;
  paces: PaceTable;
}

function restWorkout(p: WorkoutParams): Workout {
  return {
    ...p,
    type: "rest",
    title: "Rest",
    description: "Rest — recovery is part of training.",
    segments: [],
    plannedDistanceMeters: 0,
    plannedDurationSeconds: 0,
    completed: false,
  };
}

function easyWorkout(p: WorkoutParams, distanceKm: number, strides = false): Workout {
  const km = Math.max(3, distanceKm); // minimum 3 km
  const segments: WorkoutSegment[] = [
    {
      kind: "main",
      description: "Easy run — conversational effort",
      distanceMeters: Math.round(km * 1000),
      paceTarget: paceTarget("E", p.paces.E),
    },
  ];

  if (strides) {
    segments.push({
      kind: "work",
      description: "4 × 100 m strides at R pace — relaxed but fast, full recovery between each",
      distanceMeters: 400,
      repeats: 4,
      paceTarget: paceTarget("R", p.paces.R),
    });
  }

  const totalDist = Math.round(km * 1000) + (strides ? 400 : 0);
  return {
    ...p,
    type: "easy",
    title: strides ? `Easy ${km.toFixed(1)} km + strides` : `Easy ${km.toFixed(1)} km`,
    description: strides
      ? "Easy aerobic run followed by short strides to maintain leg speed."
      : "Easy aerobic run building cardiovascular base.",
    segments,
    plannedDistanceMeters: totalDist,
    plannedDurationSeconds: Math.round(durationSec(km, p.paces.E) + (strides ? 12 * 60 : 0)),
    completed: false,
  };
}

function longWorkout(p: WorkoutParams, distanceKm: number): Workout {
  const km = Math.max(8, distanceKm);
  const segment: WorkoutSegment = {
    kind: "main",
    description: "Long run — easy, conversational effort throughout",
    distanceMeters: Math.round(km * 1000),
    paceTarget: paceTarget("E", p.paces.E),
  };
  return {
    ...p,
    type: "long",
    title: `Long run ${km.toFixed(1)} km`,
    description: "Builds aerobic endurance and mental toughness.",
    segments: [segment],
    plannedDistanceMeters: Math.round(km * 1000),
    plannedDurationSeconds: Math.round(durationSec(km, p.paces.E)),
    completed: false,
  };
}

function tempoWorkout(p: WorkoutParams, workMinutes: number): Workout {
  const warmupKm = kmFromMinutes(10, p.paces.E);
  const workKm = kmFromMinutes(workMinutes, p.paces.T);
  const cooldownKm = kmFromMinutes(10, p.paces.E);
  const totalKm = warmupKm + workKm + cooldownKm;

  const segments: WorkoutSegment[] = [
    {
      kind: "warmup",
      description: "10 min easy warmup",
      durationSeconds: 10 * 60,
      paceTarget: paceTarget("E", p.paces.E),
    },
    {
      kind: "work",
      description: `${workMinutes} min at threshold — comfortably hard, 7/10 effort`,
      durationSeconds: workMinutes * 60,
      paceTarget: paceTarget("T", p.paces.T),
    },
    {
      kind: "cooldown",
      description: "10 min easy cooldown",
      durationSeconds: 10 * 60,
      paceTarget: paceTarget("E", p.paces.E),
    },
  ];

  return {
    ...p,
    type: "tempo",
    title: `Tempo ${workMinutes} min T-pace`,
    description: "Builds lactate threshold — the key to racing faster.",
    segments,
    plannedDistanceMeters: Math.round(totalKm * 1000),
    plannedDurationSeconds: Math.round((workMinutes + 20) * 60),
    completed: false,
  };
}

function shortTempoWorkout(p: WorkoutParams): Workout {
  return tempoWorkout(p, 15);
}

function intervalsWorkout(
  p: WorkoutParams,
  reps: number,
  repDistanceM: number,
): Workout {
  const warmupKm = kmFromMinutes(15, p.paces.E);
  const cooldownKm = kmFromMinutes(10, p.paces.E);
  const repKm = repDistanceM / 1000;
  // Recovery = same duration as the rep at E pace (equal-time jog)
  const repDurSec = durationSec(repKm, p.paces.I);
  const recoveryDistKm = repDurSec / p.paces.E;
  const totalKm =
    warmupKm + reps * repKm + (reps - 1) * recoveryDistKm + cooldownKm;

  const segments: WorkoutSegment[] = [
    {
      kind: "warmup",
      description: "15 min easy warmup",
      durationSeconds: 15 * 60,
      paceTarget: paceTarget("E", p.paces.E),
    },
    {
      kind: "work",
      description: `${reps} × ${repDistanceM} m at interval pace`,
      distanceMeters: repDistanceM,
      repeats: reps,
      paceTarget: paceTarget("I", p.paces.I),
    },
    {
      kind: "recovery",
      description: "Equal-time jog recovery between reps",
      durationSeconds: Math.round(repDurSec),
      paceTarget: paceTarget("E", p.paces.E),
    },
    {
      kind: "cooldown",
      description: "10 min easy cooldown",
      durationSeconds: 10 * 60,
      paceTarget: paceTarget("E", p.paces.E),
    },
  ];

  return {
    ...p,
    type: "intervals",
    title: `${reps} × ${repDistanceM} m intervals`,
    description: "Builds VO2max — the ceiling on your aerobic potential.",
    segments,
    plannedDistanceMeters: Math.round(totalKm * 1000),
    plannedDurationSeconds: Math.round(
      15 * 60 + reps * repDurSec + (reps - 1) * repDurSec + 10 * 60,
    ),
    completed: false,
  };
}

function marathonPaceWorkout(p: WorkoutParams, workMinutes: number): Workout {
  const warmupKm = kmFromMinutes(10, p.paces.E);
  const workKm = kmFromMinutes(workMinutes, p.paces.M);
  const cooldownKm = kmFromMinutes(10, p.paces.E);
  const totalKm = warmupKm + workKm + cooldownKm;

  const segments: WorkoutSegment[] = [
    {
      kind: "warmup",
      description: "10 min easy warmup",
      durationSeconds: 10 * 60,
      paceTarget: paceTarget("E", p.paces.E),
    },
    {
      kind: "work",
      description: `${workMinutes} min at marathon race pace`,
      durationSeconds: workMinutes * 60,
      paceTarget: paceTarget("M", p.paces.M),
    },
    {
      kind: "cooldown",
      description: "10 min easy cooldown",
      durationSeconds: 10 * 60,
      paceTarget: paceTarget("E", p.paces.E),
    },
  ];

  return {
    ...p,
    type: "marathonPace",
    title: `Marathon-pace ${workMinutes} min`,
    description: "Builds race-specific endurance at goal marathon effort.",
    segments,
    plannedDistanceMeters: Math.round(totalKm * 1000),
    plannedDurationSeconds: Math.round((workMinutes + 20) * 60),
    completed: false,
  };
}

function raceWorkout(p: WorkoutParams, goalRace: GoalRace): Workout {
  const distM: Record<GoalRace, number> = {
    fivek: 5000,
    tenk: 10000,
    halfMarathon: 21097,
    marathon: 42195,
  };
  const dist = distM[goalRace];
  const label: Record<GoalRace, string> = {
    fivek: "5 K",
    tenk: "10 K",
    halfMarathon: "Half Marathon",
    marathon: "Marathon",
  };

  return {
    ...p,
    type: "race",
    title: `Race Day — ${label[goalRace]}`,
    description: "Race day! Trust your training and run your plan.",
    segments: [
      {
        kind: "main",
        description: `${label[goalRace]} race`,
        distanceMeters: dist,
      },
    ],
    plannedDistanceMeters: dist,
    plannedDurationSeconds: 0, // runner-dependent
    completed: false,
  };
}

// ─── Day-slot definition & schedule builder ───────────────────────────────────

type SlotKind =
  | "rest"
  | "easy"
  | "easy_strides"
  | "long"
  | "tempo"
  | "short_tempo"
  | "intervals"
  | "marathon_pace";

interface DaySlot {
  dayOfWeek: number; // 0=Mon … 6=Sun
  kind: SlotKind;
}

function primaryQuality(phase: Phase, goalRace: GoalRace): SlotKind {
  if (phase === "base") return "easy_strides";
  if (phase === "taper") return "easy_strides";
  if (phase === "build") return "tempo";
  // peak
  return goalRace === "fivek" || goalRace === "tenk" ? "intervals" : "tempo";
}

function secondarySlot(phase: Phase, goalRace: GoalRace): SlotKind {
  if (phase === "base") return "easy";
  if (phase === "build") return "easy";
  if (phase === "taper") return "short_tempo";
  // peak
  return goalRace === "fivek" || goalRace === "tenk" ? "tempo" : "marathon_pace";
}

/**
 * Returns a 7-element slot array (Mon–Sun) for the given phase / days / goal.
 * Long run is always pinned to Sunday (index 6).
 * Hard days are never consecutive.
 */
export function weekSlots(
  phase: Phase,
  daysPerWeek: number,
  goalRace: GoalRace,
): DaySlot[] {
  const slots: DaySlot[] = Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    kind: "rest" as SlotKind,
  }));

  slots[6].kind = "long"; // Sunday always long

  // Tue (1): primary quality/easy
  slots[1].kind = primaryQuality(phase, goalRace);

  if (daysPerWeek >= 4) {
    slots[3].kind = secondarySlot(phase, goalRace); // Thu
    slots[5].kind = "easy"; // Sat
  } else {
    // 3-day: Sat easy instead of Thu
    slots[5].kind = "easy";
  }

  if (daysPerWeek >= 5) slots[2].kind = "easy"; // Wed
  if (daysPerWeek >= 6) slots[0].kind = "easy"; // Mon

  return slots;
}

// ─── Week builder ─────────────────────────────────────────────────────────────

const HARD_KINDS: Set<SlotKind> = new Set([
  "tempo",
  "short_tempo",
  "intervals",
  "marathon_pace",
]);

function isHardKind(k: SlotKind): boolean {
  return HARD_KINDS.has(k);
}

export interface BuildWeekParams {
  planId: string;
  weekNumber: number;
  phase: Phase;
  targetKm: number;
  paces: PaceTable;
  goalRace: GoalRace;
  daysPerWeek: number;
  weekStartDate: Date; // Monday
}

export function buildWeek(params: BuildWeekParams): Workout[] {
  const { planId, weekNumber, phase, targetKm, paces, goalRace, daysPerWeek, weekStartDate } = params;

  const slots = weekSlots(phase, daysPerWeek, goalRace);

  // ── Figure out quality workout distances ────────────────────────────────
  const qualityKm = (kind: SlotKind): number => {
    switch (kind) {
      case "tempo":
        // 10 min warmup E + 20 min T + 10 min cooldown E
        return kmFromMinutes(10, paces.E) + kmFromMinutes(20, paces.T) + kmFromMinutes(10, paces.E);
      case "short_tempo":
        // 10 min warmup E + 15 min T + 10 min cooldown E
        return kmFromMinutes(10, paces.E) + kmFromMinutes(15, paces.T) + kmFromMinutes(10, paces.E);
      case "intervals": {
        // 15 min warmup + 5 × 1000 m work + 4 equal-time jog recoveries + 10 min cooldown
        const repDurSec = 1.0 * paces.I; // 1 km at I pace
        const recoveryKm = repDurSec / paces.E; // equal-time jog at E pace
        return (
          kmFromMinutes(15, paces.E) +
          5 * 1.0 +
          4 * recoveryKm +
          kmFromMinutes(10, paces.E)
        );
      }
      case "marathon_pace":
        // 10 min warmup E + 30 min M + 10 min cooldown E
        return kmFromMinutes(10, paces.E) + kmFromMinutes(30, paces.M) + kmFromMinutes(10, paces.E);
      default:
        return 0;
    }
  };

  // Fraction of weekly km for the long run (phase-dependent)
  const longFractions: Record<Phase, number> = { base: 0.30, build: 0.32, peak: 0.33, taper: 0.35 };
  const longMaxMins: Record<Phase, number> = { base: 90, build: 105, peak: 120, taper: 70 };
  const longMinMins: Record<Phase, number> = { base: 60, build: 75, peak: 90, taper: 45 };

  const rawLongKm = targetKm * longFractions[phase];
  const rawLongMins = rawLongKm * paces.E / 60;
  const clampedLongMins = Math.max(longMinMins[phase], Math.min(longMaxMins[phase], rawLongMins));
  const longKm = clampedLongMins * 60 / paces.E;

  // Total km used by quality workouts
  const qualitySlots = slots.filter((s) => isHardKind(s.kind));
  const totalQualityKm = qualitySlots.reduce((sum, s) => sum + qualityKm(s.kind), 0);

  // Remaining km distributed equally among easy-run days
  const easySlots = slots.filter((s) => s.kind === "easy" || s.kind === "easy_strides");
  const usedKm = longKm + totalQualityKm;
  const remainingKm = Math.max(0, targetKm - usedKm);
  const easyKmEach = easySlots.length > 0 ? remainingKm / easySlots.length : 0;

  // ── Build Workout objects ───────────────────────────────────────────────
  return slots.map((slot) => {
    const date = new Date(weekStartDate);
    date.setDate(date.getDate() + slot.dayOfWeek);

    const wp: WorkoutParams = {
      id: nextId(planId, weekNumber, slot.dayOfWeek),
      planId,
      date,
      weekNumber,
      phase,
      paces,
    };

    switch (slot.kind) {
      case "rest":
        return restWorkout(wp);
      case "easy":
        return easyWorkout(wp, easyKmEach);
      case "easy_strides":
        return easyWorkout(wp, easyKmEach, true);
      case "long":
        return longWorkout(wp, longKm);
      case "tempo":
        return tempoWorkout(wp, 20);
      case "short_tempo":
        return shortTempoWorkout(wp);
      case "intervals":
        return intervalsWorkout(wp, 5, 1000);
      case "marathon_pace":
        return marathonPaceWorkout(wp, 30);
    }
  });
}

export { raceWorkout };
export type { WorkoutType };
