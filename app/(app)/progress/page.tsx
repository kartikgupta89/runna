"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {
  getUser,
  getActivePlan,
  getAllWorkoutsForPlan,
  getFitnessTests,
} from "@/lib/db/repository";
import { computeWeeklyMileage, computeCompletionRate, daysUntilRace } from "@/lib/training/stats";
import { StatsRow } from "@/components/progress/StatsRow";
import { MileageChart } from "@/components/progress/MileageChart";
import { VdotTrendChart } from "@/components/progress/VdotTrendChart";
import { EmptyState } from "@/components/shared/EmptyState";
import { ChartLine } from "lucide-react";

export default function ProgressPage() {
  const user = useLiveQuery(() => getUser(), [], null);
  const plan = useLiveQuery(() => getActivePlan(), [], null);
  const fitnessTests = useLiveQuery(() => getFitnessTests(), [], null);
  const workouts = useLiveQuery(
    () => (plan ? getAllWorkoutsForPlan(plan.id) : Promise.resolve([] as import("@/lib/db/dexie").WorkoutRecord[])),
    [plan?.id],
    null,
  );

  if (user === null || plan === null || fitnessTests === null || workouts === null) return null;

  if (!plan) {
    return (
      <div className="px-4 py-8">
        <EmptyState
          icon={<ChartLine className="h-10 w-10" />}
          title="No plan yet"
          description="Set up a training plan to track your progress."
        />
      </div>
    );
  }

  const weeklyMileage = computeWeeklyMileage(workouts);
  const completionRate = computeCompletionRate(workouts);
  const daysLeft = daysUntilRace(plan.raceDate);

  const today = new Date();
  const currentWeek = Math.max(
    1,
    Math.floor(
      (today.getTime() - new Date(plan.startDate).getTime()) / (7 * 24 * 60 * 60 * 1000),
    ) + 1,
  );
  const totalWeeks = Math.max(...workouts.map((w) => w.weekNumber), 1);

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 pb-2 border-b">
        <h1 className="text-xl font-bold">Progress</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{plan.name}</p>
      </div>

      <StatsRow
        completionRate={completionRate}
        daysUntilRace={daysLeft}
        totalWeeks={totalWeeks}
        currentWeek={Math.min(currentWeek, totalWeeks)}
      />

      <div className="px-4 space-y-6">
        {weeklyMileage.length > 0 ? (
          <MileageChart data={weeklyMileage} units={user?.preferredUnits ?? "metric"} />
        ) : (
          <EmptyState
            title="No mileage data yet"
            description="Complete your first workout to see your progress here."
          />
        )}

        {fitnessTests.length > 0 && (
          <VdotTrendChart tests={fitnessTests} />
        )}
      </div>
    </div>
  );
}
