"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {
  getUser,
  getActivePlan,
  getWorkoutsForDate,
  getWorkoutsForWeek,
} from "@/lib/db/repository";
import { WeekStrip } from "@/components/today/WeekStrip";
import { TodayWorkoutCard, RestDayCard } from "@/components/today/TodayWorkoutCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function currentWeekNumber(startDate: Date, today: Date): number {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const now = new Date(today);
  now.setHours(0, 0, 0, 0);
  if (now < start) return 0;
  return Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
}

export default function TodayPage() {
  const today = new Date();

  const user = useLiveQuery(() => getUser(), [], null);
  const plan = useLiveQuery(() => getActivePlan(), [], null);
  const todayWorkouts = useLiveQuery(() => getWorkoutsForDate(today), [], null);

  const totalPlanWeeks = plan && plan !== null
    ? Math.ceil((plan.raceDate.getTime() - plan.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
    : 0;
  const rawWeekNum = plan && plan !== null ? currentWeekNumber(plan.startDate, today) : 0;
  const currentWeekNum = Math.min(rawWeekNum, totalPlanWeeks);
  const weekWorkouts = useLiveQuery(
    () => (plan && plan !== null && currentWeekNum > 0
      ? getWorkoutsForWeek(plan.id, currentWeekNum)
      : Promise.resolve([] as import("@/lib/db/dexie").WorkoutRecord[])),
    [plan?.id, currentWeekNum],
    null,
  );

  if (user === null || plan === null || todayWorkouts === null || weekWorkouts === null) {
    return null;
  }

  if (!plan) {
    return (
      <div className="px-4 py-8">
        <EmptyState
          icon={<CalendarDays className="h-10 w-10" />}
          title="No active plan"
          description="Complete setup to generate your personalised training plan."
          action={
            <Button asChild>
              <Link href="/setup">Set up plan</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const mainWorkout = todayWorkouts.find((w) => w.type !== "rest");
  const isRestDay = todayWorkouts.every((w) => w.type === "rest") || todayWorkouts.length === 0;

  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <WeekStrip workouts={weekWorkouts} todayDate={today} />

      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {dateLabel}
            </p>
            <h1 className="text-xl font-bold mt-0.5">
              Hey {user?.name?.split(" ")[0] ?? ""} 👋
            </h1>
          </div>
          {currentWeekNum > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Week</p>
              <p className="text-lg font-bold">{currentWeekNum}</p>
            </div>
          )}
        </div>

        {mainWorkout ? (
          <TodayWorkoutCard workout={mainWorkout} units={user?.preferredUnits ?? "metric"} />
        ) : isRestDay ? (
          <RestDayCard />
        ) : (
          <EmptyState
            title="No workout today"
            description="Enjoy your unscheduled day off."
          />
        )}

        {weekWorkouts.filter((w) => {
          const wd = new Date(w.date);
          wd.setHours(0, 0, 0, 0);
          const td = new Date(today);
          td.setHours(0, 0, 0, 0);
          return wd > td && w.type !== "rest";
        }).length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">This week</h2>
            <div className="space-y-2">
              {weekWorkouts
                .filter((w) => {
                  const wd = new Date(w.date);
                  wd.setHours(0, 0, 0, 0);
                  const td = new Date(today);
                  td.setHours(0, 0, 0, 0);
                  return wd > td && w.type !== "rest";
                })
                .map((w) => (
                  <TodayWorkoutCard key={w.id} workout={w} units={user?.preferredUnits ?? "metric"} />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
