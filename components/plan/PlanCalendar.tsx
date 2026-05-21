"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkoutRow, TrainingPlanRow } from "@/lib/db/dexie";

const PHASE_COLORS: Record<string, string> = {
  base: "bg-blue-100 text-blue-800",
  build: "bg-orange-100 text-orange-800",
  peak: "bg-red-100 text-red-800",
  taper: "bg-purple-100 text-purple-800",
};

const TYPE_DOT: Record<string, string> = {
  easy: "bg-green-400",
  long: "bg-emerald-600",
  tempo: "bg-orange-400",
  intervals: "bg-red-400",
  repetitions: "bg-purple-400",
  marathonPace: "bg-blue-400",
  race: "bg-yellow-500",
  rest: "bg-transparent",
};

const TYPE_SHORT: Record<string, string> = {
  easy: "E",
  long: "L",
  tempo: "T",
  intervals: "I",
  repetitions: "R",
  marathonPace: "M",
  race: "🏁",
  rest: "·",
};

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface PlanCalendarProps {
  plan: TrainingPlanRow;
  workouts: WorkoutRow[];
  units: "metric" | "imperial";
  currentWeekStart?: Date;
  currentWeekWorkouts?: WorkoutRow[];
}

function weekStartDate(planStart: Date, weekNum: number): Date {
  const d = new Date(planStart);
  d.setDate(d.getDate() + (weekNum - 1) * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtShort(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PlanCalendar({ plan, workouts, units, currentWeekStart, currentWeekWorkouts }: PlanCalendarProps) {
  // weekNumber 0 means "before plan start" — shown in PrePlanWeek, not in the regular list
  const weekNums = [...new Set(workouts.map((w) => w.weekNumber))]
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const planStart = new Date(plan.startDate);
  planStart.setHours(0, 0, 0, 0);

  // 0 means plan hasn't started yet — no plan week should show "Current"
  const currentWeek =
    today < planStart
      ? 0
      : Math.floor((today.getTime() - planStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

  const [expandedWeek, setExpandedWeek] = useState<number>(currentWeek > 0 ? currentWeek : 1);

  const showPrePlan = currentWeekStart && currentWeekWorkouts && today < planStart;

  return (
    <div className="divide-y">
      {showPrePlan && (
        <PrePlanWeek
          weekStart={currentWeekStart!}
          workouts={currentWeekWorkouts!}
          planStartDate={plan.startDate}
          today={today}
          units={units}
        />
      )}
      {weekNums.map((weekNum) => {
        const weekWorkouts = workouts
          .filter((w) => w.weekNumber === weekNum)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const phase = weekWorkouts[0]?.phase ?? "base";
        const isCurrent = weekNum === currentWeek;
        const isPast = weekNum < currentWeek;
        const isExpanded = expandedWeek === weekNum;

        const completedCount = weekWorkouts.filter((w) => w.completed && w.type !== "rest").length;
        const totalCount = weekWorkouts.filter((w) => w.type !== "rest").length;
        const weekKm = weekWorkouts.reduce((s, w) => s + w.plannedDistanceMeters / 1000, 0);

        const wStart = weekStartDate(plan.startDate, weekNum);
        const wEnd = new Date(wStart);
        wEnd.setDate(wEnd.getDate() + 6);
        const dateRange = `${fmtShort(wStart)} – ${fmtShort(wEnd)}`;

        return (
          <div key={weekNum}>
            <button
              onClick={() => setExpandedWeek(isExpanded ? -1 : weekNum)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50",
                isCurrent && "bg-primary/5",
              )}
            >
              <div className="flex items-center gap-2.5">
                {isCurrent && (
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Week {weekNum}</span>
                    {isCurrent && (
                      <span className="text-xs text-primary font-medium">Current</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{dateRange}</span>
                </div>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium capitalize",
                    PHASE_COLORS[phase],
                  )}
                >
                  {phase}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  {units === "imperial"
                    ? `${(weekKm * 0.621371).toFixed(0)} mi`
                    : `${weekKm.toFixed(0)} km`}
                </span>
                {isPast && (
                  <span
                    className={cn(
                      "font-medium",
                      completedCount === totalCount ? "text-green-600" : "text-muted-foreground",
                    )}
                  >
                    {completedCount}/{totalCount}
                  </span>
                )}
                <span
                  className={cn(
                    "transition-transform text-muted-foreground",
                    isExpanded ? "rotate-90" : "",
                  )}
                >
                  ›
                </span>
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 pt-1">
                <div className="grid grid-cols-7 gap-1.5">
                  {DAY_HEADERS.map((d, i) => {
                    const cellDate = new Date(wStart);
                    cellDate.setDate(cellDate.getDate() + i);
                    return (
                      <div key={d} className="text-center pb-1">
                        <div className="text-xs text-muted-foreground">{d}</div>
                        <div className="text-[10px] text-muted-foreground/70 tabular-nums">
                          {cellDate.getDate()}
                        </div>
                      </div>
                    );
                  })}
                  {Array.from({ length: 7 }, (_, i) => {
                    const w = weekWorkouts.find((wo) => {
                      const dow = new Date(wo.date).getDay();
                      return ((dow === 0 ? 7 : dow) - 1) === i;
                    });
                    if (!w) {
                      return <div key={i} className="h-16 rounded-lg bg-muted/30" />;
                    }
                    const isToday = new Date(w.date).toDateString() === today.toDateString();
                    return (
                      <Link
                        key={i}
                        href={w.type === "rest" ? "#" : `/workout/${w.id}`}
                        className={cn(
                          "h-16 rounded-lg border flex flex-col items-center justify-center gap-0.5 text-xs transition-colors",
                          w.type === "rest"
                            ? "bg-muted/20 border-dashed cursor-default"
                            : "hover:border-primary/50 hover:bg-muted/50",
                          w.completed && w.type !== "rest"
                            ? "bg-green-50 border-green-200 dark:bg-green-950/20"
                            : "",
                          isToday ? "ring-2 ring-primary ring-offset-1" : "",
                        )}
                        onClick={(e) => w.type === "rest" && e.preventDefault()}
                      >
                        {w.type !== "rest" ? (
                          <>
                            <div
                              className={cn(
                                "h-2.5 w-2.5 rounded-full",
                                TYPE_DOT[w.type] ?? "bg-muted",
                              )}
                            />
                            <span className="font-semibold text-[10px]">
                              {TYPE_SHORT[w.type]}
                            </span>
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {units === "imperial"
                                ? `${(w.plannedDistanceMeters / 1609.34).toFixed(1)}`
                                : `${(w.plannedDistanceMeters / 1000).toFixed(1)}`}
                            </span>
                            {w.completed && (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground text-base">·</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Pre-plan current-week section ───────────────────────────────────────────

function PrePlanWeek({
  weekStart,
  workouts,
  planStartDate,
  today,
  units,
}: {
  weekStart: Date;
  workouts: WorkoutRow[];
  planStartDate: Date;
  today: Date;
  units: "metric" | "imperial";
}) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const dateRange = `${fmtShort(weekStart)} – ${fmtShort(weekEnd)}`;
  const planStartLabel = fmtShort(new Date(planStartDate));

  function workoutForDay(dayIndex: number): WorkoutRow | undefined {
    return workouts.find((w) => {
      const dow = new Date(w.date).getDay();
      return ((dow === 0 ? 7 : dow) - 1) === dayIndex;
    });
  }

  return (
    <div>
      <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200/60 dark:border-amber-800/40">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-semibold text-sm">Current week</span>
            <span className="ml-2 text-xs text-amber-700 dark:text-amber-400 font-medium">Pre-plan</span>
            <div className="text-xs text-muted-foreground mt-0.5">{dateRange}</div>
          </div>
          <p className="text-xs text-muted-foreground text-right">
            Plan starts<br />{planStartLabel}
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Log free runs this week in the Today tab.
        </p>
      </div>

      <div className="px-4 pb-4 pt-2">
        <div className="grid grid-cols-7 gap-1.5">
          {DAY_HEADERS.map((d, i) => {
            const cellDate = new Date(weekStart);
            cellDate.setDate(cellDate.getDate() + i);
            return (
              <div key={d} className="text-center pb-1">
                <div className="text-xs text-muted-foreground">{d}</div>
                <div className="text-[10px] text-muted-foreground/70 tabular-nums">
                  {cellDate.getDate()}
                </div>
              </div>
            );
          })}
          {Array.from({ length: 7 }, (_, i) => {
            const cellDate = new Date(weekStart);
            cellDate.setDate(cellDate.getDate() + i);
            const w = workoutForDay(i);
            const isToday = cellDate.toDateString() === today.toDateString();
            const isFuture = cellDate > today;

            if (!w) {
              return (
                <div
                  key={i}
                  className={cn(
                    "h-16 rounded-lg flex items-center justify-center",
                    isToday
                      ? "ring-2 ring-primary ring-offset-1 bg-muted/30"
                      : isFuture
                      ? "bg-muted/20 border border-dashed"
                      : "bg-muted/30",
                  )}
                >
                  {isToday && (
                    <span className="text-[10px] text-primary font-medium">Today</span>
                  )}
                </div>
              );
            }

            const distKm = (w.actualDistanceMeters ?? w.plannedDistanceMeters) / 1000;
            return (
              <Link
                key={i}
                href={`/workout/${w.id}`}
                className={cn(
                  "h-16 rounded-lg border flex flex-col items-center justify-center gap-0.5 text-xs transition-colors hover:border-primary/50 hover:bg-muted/50",
                  "bg-green-50 border-green-200 dark:bg-green-950/20",
                  isToday ? "ring-2 ring-primary ring-offset-1" : "",
                )}
              >
                <div className={cn("h-2.5 w-2.5 rounded-full", TYPE_DOT["easy"])} />
                <span className="font-semibold text-[10px]">Run</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {units === "imperial"
                    ? `${(distKm * 0.621371).toFixed(1)}`
                    : `${distKm.toFixed(1)}`}
                </span>
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
