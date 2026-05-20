"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { WorkoutRow } from "@/lib/db/dexie";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

const TYPE_DOT: Record<string, string> = {
  easy: "bg-green-400",
  long: "bg-emerald-500",
  tempo: "bg-orange-400",
  intervals: "bg-red-400",
  repetitions: "bg-purple-400",
  marathonPace: "bg-blue-400",
  race: "bg-yellow-400",
  rest: "bg-muted-foreground/30",
};

interface WeekStripProps {
  workouts: WorkoutRow[];
  todayDate: Date;
}

export function WeekStrip({ workouts, todayDate }: WeekStripProps) {
  // Build Mon-Sun for the current week
  const monday = new Date(todayDate);
  const day = monday.getDay(); // 0=Sun, 1=Mon...
  monday.setDate(monday.getDate() - ((day === 0 ? 7 : day) - 1));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });

  function workoutsForDay(d: Date) {
    return workouts.filter((w) => {
      const wd = new Date(w.date);
      return (
        wd.getFullYear() === d.getFullYear() &&
        wd.getMonth() === d.getMonth() &&
        wd.getDate() === d.getDate()
      );
    });
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
      {days.map((d, i) => {
        const isToday =
          d.getDate() === todayDate.getDate() &&
          d.getMonth() === todayDate.getMonth() &&
          d.getFullYear() === todayDate.getFullYear();
        const todayMidnight = new Date(todayDate);
        todayMidnight.setHours(0, 0, 0, 0);
        const isPast = d < todayMidnight;
        const dayWorkouts = workoutsForDay(d);
        const mainWorkout = dayWorkouts.find((w) => w.type !== "rest");
        const isRest = !mainWorkout && dayWorkouts.length > 0;

        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span
              className={cn(
                "text-xs font-medium",
                isToday ? "text-primary" : "text-muted-foreground",
              )}
            >
              {DAY_LABELS[i]}
            </span>
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                isToday ? "bg-primary text-primary-foreground" : "",
                !isToday && isPast ? "opacity-40" : "",
              )}
            >
              {d.getDate()}
            </div>
            <div className="flex gap-0.5">
              {mainWorkout ? (
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    TYPE_DOT[mainWorkout.type] ?? "bg-muted",
                    mainWorkout.completed ? "opacity-100" : "opacity-60",
                  )}
                />
              ) : isRest ? (
                <div className="h-2 w-2" />
              ) : (
                <div className="h-2 w-2" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
