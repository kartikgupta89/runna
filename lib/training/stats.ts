import type { WorkoutRow } from "@/lib/db/dexie";

export interface WeeklyMileage {
  weekNumber: number;
  plannedKm: number;
  actualKm: number;
}

/** Aggregate planned vs actual km by week, excluding rest days. */
export function computeWeeklyMileage(workouts: WorkoutRow[]): WeeklyMileage[] {
  const map = new Map<number, WeeklyMileage>();

  for (const w of workouts) {
    if (w.type === "rest") continue;
    if (!map.has(w.weekNumber)) {
      map.set(w.weekNumber, { weekNumber: w.weekNumber, plannedKm: 0, actualKm: 0 });
    }
    const entry = map.get(w.weekNumber)!;
    entry.plannedKm += w.plannedDistanceMeters / 1000;
    if (w.completed && w.actualDistanceMeters) {
      entry.actualKm += w.actualDistanceMeters / 1000;
    }
  }

  return Array.from(map.values()).sort((a, b) => a.weekNumber - b.weekNumber);
}

/** Fraction of non-rest workouts that are marked complete (0–1). */
export function computeCompletionRate(workouts: WorkoutRow[]): number {
  const schedulable = workouts.filter((w) => w.type !== "rest" && w.type !== "race");
  if (schedulable.length === 0) return 0;
  return schedulable.filter((w) => w.completed).length / schedulable.length;
}

/** Calendar days remaining until race date (0 if past). */
export function daysUntilRace(raceDate: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const race = new Date(raceDate);
  race.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((race.getTime() - now.getTime()) / 86_400_000));
}
