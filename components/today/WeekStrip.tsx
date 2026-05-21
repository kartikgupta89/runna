"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
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
  selectedDate: Date;
  viewWeekStart: Date;
  todayDate: Date;
  onSelectDate: (d: Date) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function WeekStrip({
  workouts,
  selectedDate,
  viewWeekStart,
  todayDate,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
}: WeekStripProps) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(viewWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const todayMidnight = new Date(todayDate);
  todayMidnight.setHours(0, 0, 0, 0);

  function workoutsForDay(d: Date) {
    return workouts.filter((w) => isSameDay(new Date(w.date), d));
  }

  const monthLabel = viewWeekStart.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <div className="border-b bg-background">
      {/* Week navigation row */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <button
          onClick={onPrevWeek}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <span className="text-xs font-medium text-muted-foreground">{monthLabel}</span>
        <button
          onClick={onNextWeek}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Day chips row */}
      <div className="flex items-center justify-between px-4 pb-3">
        {days.map((d, i) => {
          const isToday = isSameDay(d, todayMidnight);
          const isSelected = isSameDay(d, selectedDate);
          const isPast = d < todayMidnight && !isToday;
          const dayWorkouts = workoutsForDay(d);
          const mainWorkout = dayWorkouts.find((w) => w.type !== "rest");

          return (
            <button
              key={i}
              onClick={() => onSelectDate(new Date(d))}
              className="flex flex-1 flex-col items-center gap-1 focus:outline-none"
            >
              <span
                className={cn(
                  "text-xs font-medium",
                  isToday || isSelected ? "text-primary" : "text-muted-foreground",
                )}
              >
                {DAY_LABELS[i]}
              </span>
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  isToday && "bg-primary text-primary-foreground",
                  !isToday && isSelected && "ring-2 ring-primary text-primary bg-primary/10",
                  !isToday && !isSelected && isPast && "opacity-40",
                )}
              >
                {d.getDate()}
              </div>
              <div className="flex gap-0.5 h-2">
                {mainWorkout ? (
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      TYPE_DOT[mainWorkout.type] ?? "bg-muted",
                      mainWorkout.completed ? "opacity-100" : "opacity-60",
                    )}
                  />
                ) : (
                  <div className="h-2 w-2" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
