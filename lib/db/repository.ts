import { db, type WorkoutRecord, type UserRecord } from "./dexie";
import { calculateVDOT } from "@/lib/training/vdot";
import { generatePlan } from "@/lib/training/generator";
import type { GoalRace } from "@/lib/training/types";
import type { GeneratedPlan } from "@/lib/training/generator";
import type { GpsPoint } from "@/lib/training/gps";

export const USER_ID = "default-user";

// ─── Input types (previously inferred from Zod schemas in server actions) ─────

export interface SetupInput {
  name: string;
  age?: number;
  preferredUnits: "metric" | "imperial";
  recentRaceDistanceM: number;
  recentRaceTimeS: number;
  goalRace: "fivek" | "tenk" | "halfMarathon" | "marathon";
  raceDateIso: string;
  daysPerWeek: number;
  currentWeeklyKm?: number;
}

export interface LogInput {
  actualDistanceKm?: number;
  actualDurationMin?: number;
  perceivedEffort?: number;
  notes?: string;
  gpsTrack?: GpsPoint[];
}

export interface FitnessTestInput {
  distanceM: number;
  timeS: number;
  source: "race" | "timeTrial" | "estimated";
  goalRace: "fivek" | "tenk" | "halfMarathon" | "marathon";
  raceDateIso: string;
  daysPerWeek: number;
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export function getUser() {
  return db.users.get(USER_ID);
}

export function getFitnessTests() {
  return db.fitnessTests
    .where("userId")
    .equals(USER_ID)
    .sortBy("date")
    .then((r) => r.reverse());
}

export function getActivePlan() {
  return db.trainingPlans
    .where("userId")
    .equals(USER_ID)
    .filter((p) => p.active)
    .first();
}

export function getAllWorkoutsForPlan(planId: string) {
  return db.workouts.where("planId").equals(planId).sortBy("date");
}

export function getWorkoutsForWeek(planId: string, weekNumber: number) {
  return db.workouts
    .where("[planId+weekNumber]")
    .equals([planId, weekNumber])
    .sortBy("date");
}

export function getWorkoutsForDate(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return db.workouts.where("date").between(start, end, true, true).toArray();
}

export function getWorkoutById(id: string) {
  return db.workouts.get(id);
}

export function getWorkoutsForDateRange(from: Date, to: Date) {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);
  return db.workouts.where("date").between(start, end, true, true).sortBy("date");
}

export interface UnplannedWorkoutInput {
  date: Date;
  title?: string;
  distanceKm?: number;
  durationMin?: number;
  perceivedEffort?: number;
  notes?: string;
  gpsTrack?: GpsPoint[];
}

export async function addUnplannedWorkout(input: UnplannedWorkoutInput): Promise<string> {
  const plan = await getActivePlan();
  const planId = plan?.id ?? "unplanned";

  let weekNumber = 0;
  if (plan) {
    const start = new Date(plan.startDate);
    start.setHours(0, 0, 0, 0);
    const d = new Date(input.date);
    d.setHours(0, 0, 0, 0);
    weekNumber = d < start ? 0 : Math.floor((d.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  }

  const id = crypto.randomUUID();
  const distanceMeters = input.distanceKm ? input.distanceKm * 1000 : 0;
  const durationSeconds = input.durationMin ? Math.round(input.durationMin * 60) : 0;
  const avgPaceSecPerKm =
    distanceMeters > 0 && durationSeconds > 0
      ? durationSeconds / (distanceMeters / 1000)
      : undefined;

  const workoutDate = new Date(input.date);
  workoutDate.setHours(12, 0, 0, 0);

  await db.workouts.add({
    id,
    planId,
    date: workoutDate,
    weekNumber,
    phase: "base",
    type: "easy",
    title: input.title ?? "Unplanned Run",
    description: "",
    segments: [],
    plannedDistanceMeters: distanceMeters,
    plannedDurationSeconds: durationSeconds,
    completed: true,
    completedAt: new Date(),
    actualDistanceMeters: distanceMeters || undefined,
    actualDurationSeconds: durationSeconds || undefined,
    actualAvgPaceSecPerKm: avgPaceSecPerKm,
    perceivedEffort: input.perceivedEffort,
    notes: input.notes,
    gpsTrack: input.gpsTrack,
  });

  return id;
}

// ─── Writes ───────────────────────────────────────────────────────────────────

export async function markWorkoutComplete(id: string, data: {
  actualDistanceMeters?: number;
  actualDurationSeconds?: number;
  actualAvgPaceSecPerKm?: number;
  perceivedEffort?: number;
  notes?: string;
  gpsTrack?: GpsPoint[];
}) {
  await db.workouts.update(id, { completed: true, completedAt: new Date(), ...data });
}

export async function markWorkoutIncomplete(id: string) {
  await db.workouts.update(id, {
    completed: false,
    completedAt: undefined,
    actualDistanceMeters: undefined,
    actualDurationSeconds: undefined,
    actualAvgPaceSecPerKm: undefined,
    perceivedEffort: undefined,
    notes: undefined,
    gpsTrack: undefined,
  });
}

export async function deleteAllData() {
  await db.transaction("rw", db.users, db.fitnessTests, db.trainingPlans, db.workouts, async () => {
    await db.workouts.clear();
    await db.trainingPlans.clear();
    await db.fitnessTests.clear();
    await db.users.clear();
  });
}

// ─── Plan seeding (from lib/db/seed.ts) ───────────────────────────────────────

const GOAL_LABEL: Record<string, string> = {
  fivek: "5K",
  tenk: "10K",
  halfMarathon: "Half Marathon",
  marathon: "Marathon",
};

export async function seedPlan(plan: GeneratedPlan): Promise<void> {
  const { input, vdot } = plan;

  await db.trainingPlans.add({
    id: plan.planId,
    userId: USER_ID,
    name: `${GOAL_LABEL[input.goalRace] ?? input.goalRace} Plan`,
    goalRace: input.goalRace,
    raceDate: input.raceDate,
    startDate: input.startDate ?? new Date(),
    daysPerWeek: input.daysPerWeek,
    startingVDOT: vdot,
    active: true,
    createdAt: new Date(),
  });

  const rows: WorkoutRecord[] = plan.weeks.flatMap((week) =>
    week.workouts.map((w) => ({
      id: w.id,
      planId: plan.planId,
      date: w.date,
      weekNumber: w.weekNumber,
      phase: w.phase,
      type: w.type,
      title: w.title,
      description: w.description,
      segments: w.segments,
      plannedDistanceMeters: w.plannedDistanceMeters,
      plannedDurationSeconds: w.plannedDurationSeconds,
      completed: false,
    })),
  );

  await db.workouts.bulkAdd(rows);
}

// ─── High-level mutations (previously in server actions) ─────────────────────

function nextMonday(from: Date): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const daysUntil = day === 1 ? 0 : ((8 - day) % 7) || 7;
  d.setDate(d.getDate() + daysUntil);
  return d;
}

export async function setupUser(input: SetupInput): Promise<void> {
  const vdot = calculateVDOT(input.recentRaceDistanceM, input.recentRaceTimeS);
  const raceDate = new Date(`${input.raceDateIso}T00:00:00`);
  const startDate = nextMonday(new Date());
  const planId = crypto.randomUUID();

  await db.transaction("rw", db.users, db.fitnessTests, db.trainingPlans, db.workouts, async () => {
    await db.users.put({
      id: USER_ID,
      name: input.name,
      age: input.age,
      preferredUnits: input.preferredUnits,
      currentVDOT: vdot,
      createdAt: new Date(),
    });

    await db.fitnessTests.add({
      id: crypto.randomUUID(),
      userId: USER_ID,
      date: new Date(),
      distanceMeters: input.recentRaceDistanceM,
      timeSeconds: input.recentRaceTimeS,
      vdotResult: vdot,
      source: "race",
    });

    // Deactivate any existing plans
    const existing = await db.trainingPlans.where("userId").equals(USER_ID).toArray();
    await Promise.all(existing.map((p) => db.trainingPlans.update(p.id, { active: false })));

    const plan = generatePlan({
      planId,
      recentRace: { distanceMeters: input.recentRaceDistanceM, timeSeconds: input.recentRaceTimeS },
      goalRace: input.goalRace as GoalRace,
      raceDate,
      startDate,
      daysPerWeek: input.daysPerWeek,
      currentWeeklyKm: input.currentWeeklyKm,
    });

    await seedPlan(plan);
  });
}

export async function completeWorkout(id: string, input: LogInput): Promise<void> {
  const actualDistanceMeters = input.actualDistanceKm ? input.actualDistanceKm * 1000 : undefined;
  const actualDurationSeconds = input.actualDurationMin ? Math.round(input.actualDurationMin * 60) : undefined;
  const actualAvgPaceSecPerKm =
    actualDistanceMeters && actualDurationSeconds
      ? actualDurationSeconds / (actualDistanceMeters / 1000)
      : undefined;

  await markWorkoutComplete(id, {
    actualDistanceMeters,
    actualDurationSeconds,
    actualAvgPaceSecPerKm,
    perceivedEffort: input.perceivedEffort,
    notes: input.notes,
    gpsTrack: input.gpsTrack,
  });
}

export async function uncompleteWorkout(id: string): Promise<void> {
  await markWorkoutIncomplete(id);
}

export async function updateProfile(data: { name: string; age?: number; preferredUnits: "metric" | "imperial" }): Promise<void> {
  await db.users.update(USER_ID, data);
}

export async function updateUnits(unit: "metric" | "imperial"): Promise<void> {
  await db.users.update(USER_ID, { preferredUnits: unit });
}

export async function reRunFitnessTest(input: FitnessTestInput): Promise<void> {
  const vdot = calculateVDOT(input.distanceM, input.timeS);
  const planId = crypto.randomUUID();
  const startDate = nextMonday(new Date());

  await db.transaction("rw", db.users, db.fitnessTests, db.trainingPlans, db.workouts, async () => {
    await db.users.update(USER_ID, { currentVDOT: vdot });

    await db.fitnessTests.add({
      id: crypto.randomUUID(),
      userId: USER_ID,
      date: new Date(),
      distanceMeters: input.distanceM,
      timeSeconds: input.timeS,
      vdotResult: vdot,
      source: input.source,
    });

    const existing = await db.trainingPlans.where("userId").equals(USER_ID).toArray();
    await Promise.all(existing.map((p) => db.trainingPlans.update(p.id, { active: false })));

    const plan = generatePlan({
      planId,
      recentRace: { distanceMeters: input.distanceM, timeSeconds: input.timeS },
      goalRace: input.goalRace as GoalRace,
      raceDate: new Date(`${input.raceDateIso}T00:00:00`),
      startDate,
      daysPerWeek: input.daysPerWeek,
    });

    await seedPlan(plan);
  });
}

export async function wipeAllData(): Promise<void> {
  await deleteAllData();
}

// ─── Strava token management ──────────────────────────────────────────────────

import type { StravaTokens } from "@/lib/strava/types";

export async function saveStravaTokens(tokens: StravaTokens): Promise<void> {
  await db.users.update(USER_ID, {
    stravaAccessToken: tokens.access_token,
    stravaRefreshToken: tokens.refresh_token,
    stravaTokenExpiresAt: tokens.expires_at,
    stravaAthleteId: tokens.athlete_id,
    stravaAthleteName: tokens.athlete_name,
  });
}

export async function clearStravaTokens(): Promise<void> {
  await db.users.update(USER_ID, {
    stravaAccessToken: undefined,
    stravaRefreshToken: undefined,
    stravaTokenExpiresAt: undefined,
    stravaAthleteId: undefined,
    stravaAthleteName: undefined,
  });
}

export async function saveStravaActivityId(workoutId: string, stravaId: number): Promise<void> {
  await db.workouts.update(workoutId, { stravaActivityId: stravaId });
}
