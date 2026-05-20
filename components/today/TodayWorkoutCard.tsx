import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatPace } from "@/lib/training/paces";
import type { WorkoutRow } from "@/lib/db/dexie";

const TYPE_CONFIG: Record<
  string,
  { label: string; badgeVariant: "blue" | "green" | "orange" | "red" | "purple" | "default" | "secondary" }
> = {
  easy: { label: "Easy Run", badgeVariant: "green" },
  long: { label: "Long Run", badgeVariant: "green" },
  tempo: { label: "Tempo", badgeVariant: "orange" },
  intervals: { label: "Intervals", badgeVariant: "red" },
  repetitions: { label: "Reps", badgeVariant: "purple" },
  marathonPace: { label: "Marathon Pace", badgeVariant: "blue" },
  race: { label: "Race Day", badgeVariant: "default" },
  rest: { label: "Rest Day", badgeVariant: "secondary" },
};

interface TodayWorkoutCardProps {
  workout: WorkoutRow;
  units?: "metric" | "imperial";
}

export function TodayWorkoutCard({ workout, units = "metric" }: TodayWorkoutCardProps) {
  const config = TYPE_CONFIG[workout.type] ?? { label: workout.type, badgeVariant: "default" as const };
  const isRest = workout.type === "rest";

  const distKm = workout.plannedDistanceMeters / 1000;
  const durationMin = Math.round(workout.plannedDurationSeconds / 60);

  return (
    <Link
      href={`/workout/${workout.id}`}
      className={cn(
        "block rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md active:scale-[0.99]",
        workout.completed && "border-green-200 bg-green-50/50 dark:bg-green-950/20",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant={config.badgeVariant as "blue" | "green" | "orange" | "red" | "purple" | "default" | "secondary"}>{config.label}</Badge>
            {workout.completed && (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            )}
          </div>
          <h3 className="font-semibold text-base leading-tight truncate">{workout.title}</h3>
          {workout.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {workout.description}
            </p>
          )}
          {!isRest && (
            <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
              {distKm > 0 && (
                <span>
                  <span className="font-semibold text-foreground">
                    {units === "imperial"
                      ? (distKm * 0.621371).toFixed(1)
                      : distKm.toFixed(1)}
                  </span>{" "}
                  {units === "imperial" ? "mi" : "km"}
                </span>
              )}
              {durationMin > 0 && (
                <span>
                  <span className="font-semibold text-foreground">{durationMin}</span> min
                </span>
              )}
            </div>
          )}
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
      </div>
    </Link>
  );
}

export function RestDayCard() {
  return (
    <div className="rounded-2xl border border-dashed bg-card/50 p-8 text-center">
      <p className="text-2xl mb-2">🛋️</p>
      <p className="font-semibold">Rest Day</p>
      <p className="text-sm text-muted-foreground mt-1">
        Recovery is part of the training — take it easy today.
      </p>
    </div>
  );
}
