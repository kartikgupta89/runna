"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  getUser,
  getActivePlan,
  getAllWorkoutsForPlan,
  getWorkoutsForDateRange,
} from "@/lib/db/repository";
import { PlanCalendar } from "@/components/plan/PlanCalendar";
import { EmptyState } from "@/components/shared/EmptyState";
import { daysUntilRace } from "@/lib/training/stats";
import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const RACE_LABELS: Record<string, string> = {
  fivek: "5K",
  tenk: "10K",
  halfMarathon: "Half Marathon",
  marathon: "Marathon",
};

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - ((dow === 0 ? 7 : dow) - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function PlanPage() {
  const user = useLiveQuery(() => getUser(), [], null);
  const plan = useLiveQuery(() => getActivePlan(), [], null);
  const workouts = useLiveQuery(
    () => (plan ? getAllWorkoutsForPlan(plan.id) : Promise.resolve([] as import("@/lib/db/dexie").WorkoutRecord[])),
    [plan?.id],
    null,
  );

  // Current calendar week — always loaded so we can show the pre-plan week
  const [currentWeekStart, currentWeekEnd] = useMemo(() => {
    const monday = getMondayOf(new Date());
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return [monday, sunday];
  }, []);

  const currentWeekWorkouts = useLiveQuery(
    () => getWorkoutsForDateRange(currentWeekStart, currentWeekEnd),
    [currentWeekStart.getTime()],
    null,
  );

  if (user === null || plan === null || workouts === null || currentWeekWorkouts === null) return null;

  if (!plan) {
    return (
      <div className="px-4 py-8">
        <EmptyState
          icon={<CalendarDays className="h-10 w-10" />}
          title="No active plan"
          description="Complete setup to generate your training plan."
          action={
            <Button asChild>
              <Link href="/setup">Set up plan</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const daysLeft = daysUntilRace(plan.raceDate);
  const raceLabel = RACE_LABELS[plan.goalRace] ?? plan.goalRace;

  return (
    <div>
      <div className="px-4 py-4 border-b">
        <h1 className="text-xl font-bold">{plan.name}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {raceLabel} · {daysLeft > 0 ? `${daysLeft} days to go` : "Race day!"}
        </p>
        <div className="flex gap-4 mt-3 text-sm">
          <Stat label="Weeks" value={String([...new Set(workouts.map((w) => w.weekNumber))].length)} />
          <Stat
            label="Workouts"
            value={String(workouts.filter((w) => w.type !== "rest").length)}
          />
          <Stat
            label="Completed"
            value={String(workouts.filter((w) => w.completed && w.type !== "rest").length)}
          />
        </div>
      </div>

      <PlanCalendar
        plan={plan}
        workouts={workouts}
        units={user?.preferredUnits ?? "metric"}
        currentWeekStart={currentWeekStart}
        currentWeekWorkouts={currentWeekWorkouts}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
