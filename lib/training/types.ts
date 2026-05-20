export type GoalRace = "fivek" | "tenk" | "halfMarathon" | "marathon";

export type WorkoutType =
  | "easy"
  | "long"
  | "tempo"
  | "intervals"
  | "repetitions"
  | "marathonPace"
  | "rest"
  | "race";

export type Phase = "base" | "build" | "peak" | "taper";

export interface User {
  id: string;
  name: string;
  age?: number;
  weightKg?: number;
  preferredUnits: "metric" | "imperial";
  currentVDOT: number;
  createdAt: Date;
}

export interface FitnessTest {
  id: string;
  userId: string;
  date: Date;
  distanceMeters: number;
  timeSeconds: number;
  vdotResult: number;
  source: "race" | "timeTrial" | "estimated";
}

export interface TrainingPlan {
  id: string;
  userId: string;
  name: string;
  goalRace: GoalRace;
  goalTimeSeconds?: number;
  raceDate: Date;
  startDate: Date;
  daysPerWeek: number;
  startingVDOT: number;
  active: boolean;
  createdAt: Date;
}

export interface WorkoutSegment {
  kind: "warmup" | "work" | "recovery" | "cooldown" | "main";
  description: string;
  distanceMeters?: number;
  durationSeconds?: number;
  paceTarget?: {
    paceType: "E" | "M" | "T" | "I" | "R";
    minSecPerKm: number;
    maxSecPerKm: number;
  };
  repeats?: number;
}

export interface Workout {
  id: string;
  planId: string;
  date: Date;
  weekNumber: number;
  phase: Phase;
  type: WorkoutType;
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
}
