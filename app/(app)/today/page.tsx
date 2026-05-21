"use client";

import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  getUser,
  getActivePlan,
  getWorkoutsForDate,
  getWorkoutsForDateRange,
} from "@/lib/db/repository";
import { WeekStrip } from "@/components/today/WeekStrip";
import { TodayWorkoutCard, RestDayCard } from "@/components/today/TodayWorkoutCard";
import { UnplannedRunCard } from "@/components/today/UnplannedRunCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - ((dow === 0 ? 7 : dow) - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekNumForDate(planStart: Date, date: Date): number {
  const start = new Date(planStart);
  start.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (d < start) return 0;
  return Math.floor((d.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
}

export default function TodayPage() {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [viewWeekStart, setViewWeekStart] = useState<Date>(() => getMondayOf(today));

  function prevWeek() {
    setViewWeekStart((d) => {
      const prev = new Date(d);
      prev.setDate(prev.getDate() - 7);
      return prev;
    });
  }

  function nextWeek() {
    setViewWeekStart((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 7);
      return next;
    });
  }

  function handleSelectDate(d: Date) {
    const selected = new Date(d);
    selected.setHours(0, 0, 0, 0);
    setSelectedDate(selected);
  }

  const viewWeekEnd = useMemo(() => {
    const d = new Date(viewWeekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [viewWeekStart]);

  const user = useLiveQuery(() => getUser(), [], null);
  const plan = useLiveQuery(() => getActivePlan(), [], null);

  const weekWorkouts = useLiveQuery(
    () => getWorkoutsForDateRange(viewWeekStart, viewWeekEnd),
    [viewWeekStart.getTime()],
    null,
  );

  const selectedDateWorkouts = useLiveQuery(
    () => getWorkoutsForDate(selectedDate),
    [selectedDate.getTime()],
    null,
  );

  if (user === null || plan === null || weekWorkouts === null || selectedDateWorkouts === null) {
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

  const totalPlanWeeks = Math.ceil(
    (plan.raceDate.getTime() - plan.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
  );
  const rawWeekNum = weekNumForDate(plan.startDate, selectedDate);
  const selectedWeekNum = Math.max(0, Math.min(rawWeekNum, totalPlanWeeks));

  const mainWorkout = selectedDateWorkouts.find((w) => w.type !== "rest");
  const isRestDay =
    selectedDateWorkouts.length > 0 && selectedDateWorkouts.every((w) => w.type === "rest");
  const hasNoWorkout = selectedDateWorkouts.length === 0;

  const isToday =
    selectedDate.getFullYear() === today.getFullYear() &&
    selectedDate.getMonth() === today.getMonth() &&
    selectedDate.getDate() === today.getDate();

  const isPastOrToday = selectedDate <= today;

  const dateLabel = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <WeekStrip
        workouts={weekWorkouts}
        selectedDate={selectedDate}
        viewWeekStart={viewWeekStart}
        todayDate={today}
        onSelectDate={handleSelectDate}
        onPrevWeek={prevWeek}
        onNextWeek={nextWeek}
      />

      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{dateLabel}</p>
            {isToday ? (
              <h1 className="text-xl font-bold mt-0.5">
                Hey {user?.name?.split(" ")[0] ?? ""} 👋
              </h1>
            ) : (
              <h1 className="text-xl font-bold mt-0.5">
                {isPastOrToday ? "Past run" : "Upcoming"}
              </h1>
            )}
          </div>
          {selectedWeekNum > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Week</p>
              <p className="text-lg font-bold">{selectedWeekNum}</p>
            </div>
          )}
        </div>

        {mainWorkout ? (
          <TodayWorkoutCard
            workout={mainWorkout}
            units={user?.preferredUnits ?? "metric"}
          />
        ) : isRestDay ? (
          <RestDayCard />
        ) : null}

        {isPastOrToday && (
          <UnplannedRunCard
            key={selectedDate.toISOString()}
            date={selectedDate}
            todayDate={today}
            units={user?.preferredUnits ?? "metric"}
            compact={!hasNoWorkout}
          />
        )}

        {/* Show all completed workouts for the day (e.g. multiple unplanned runs) */}
        {selectedDateWorkouts.filter((w) => w.type !== "rest" && w !== mainWorkout).length > 0 && (
          <div className="space-y-2">
            {selectedDateWorkouts
              .filter((w) => w.type !== "rest" && w !== mainWorkout)
              .map((w) => (
                <TodayWorkoutCard
                  key={w.id}
                  workout={w}
                  units={user?.preferredUnits ?? "metric"}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
