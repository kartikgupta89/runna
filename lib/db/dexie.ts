import Dexie, { type EntityTable } from "dexie";
import type { WorkoutSegment } from "@/lib/training/types";
import type { GpsPoint } from "@/lib/training/gps";

// ─── Record interfaces (mirror the previous Drizzle schema) ───────────────────

export interface UserRecord {
  id: string;
  name: string;
  age?: number;
  weightKg?: number;
  preferredUnits: "metric" | "imperial";
  currentVDOT: number;
  createdAt: Date;
}

export interface FitnessTestRecord {
  id: string;
  userId: string;
  date: Date;
  distanceMeters: number;
  timeSeconds: number;
  vdotResult: number;
  source: "race" | "timeTrial" | "estimated";
}

export interface TrainingPlanRecord {
  id: string;
  userId: string;
  name: string;
  goalRace: "fivek" | "tenk" | "halfMarathon" | "marathon";
  goalTimeSeconds?: number;
  raceDate: Date;
  startDate: Date;
  daysPerWeek: number;
  startingVDOT: number;
  active: boolean;
  createdAt: Date;
}

export interface WorkoutRecord {
  id: string;
  planId: string;
  date: Date;
  weekNumber: number;
  phase: "base" | "build" | "peak" | "taper";
  type:
    | "easy"
    | "long"
    | "tempo"
    | "intervals"
    | "repetitions"
    | "marathonPace"
    | "rest"
    | "race";
  title: string;
  description: string;
  segments: WorkoutSegment[];
  plannedDistanceMeters: number;
  plannedDurationSeconds: number;
  completed: boolean;
  completedAt?: Date;
  actualDistanceMeters?: number;
  actualDurationSeconds?: number;
  actualAvgPaceSecPerKm?: number;
  perceivedEffort?: number;
  notes?: string;
  gpsTrack?: GpsPoint[];
}

// Re-export with the old Row suffixes so UI components need only a path change
export type UserRow = UserRecord;
export type FitnessTestRow = FitnessTestRecord;
export type TrainingPlanRow = TrainingPlanRecord;
export type WorkoutRow = WorkoutRecord;

// ─── Database class ───────────────────────────────────────────────────────────

export class RunningCoachDB extends Dexie {
  users!: EntityTable<UserRecord, "id">;
  fitnessTests!: EntityTable<FitnessTestRecord, "id">;
  trainingPlans!: EntityTable<TrainingPlanRecord, "id">;
  workouts!: EntityTable<WorkoutRecord, "id">;

  constructor() {
    super("RunningCoachDB");
    this.version(1).stores({
      users: "id",
      fitnessTests: "id, userId",
      trainingPlans: "id, userId",
      // Compound index [planId+weekNumber] enables efficient week queries
      workouts: "id, planId, date, weekNumber, [planId+weekNumber]",
    });
  }
}

export const db = new RunningCoachDB();
