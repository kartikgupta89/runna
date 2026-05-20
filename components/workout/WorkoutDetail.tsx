import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PaceRangeDisplay } from "@/components/shared/PaceDisplay";
import type { WorkoutRow } from "@/lib/db/dexie";
import type { WorkoutSegment } from "@/lib/training/types";
import { cn } from "@/lib/utils";

const SEGMENT_KIND_LABEL: Record<string, string> = {
  warmup: "Warm-up",
  cooldown: "Cool-down",
  work: "Work",
  recovery: "Recovery",
  main: "Main",
};

const PACE_TYPE_LABEL: Record<string, string> = {
  E: "Easy",
  M: "Marathon",
  T: "Threshold",
  I: "Interval",
  R: "Repetition",
};

interface WorkoutDetailProps {
  workout: WorkoutRow;
  units: "metric" | "imperial";
}

export function WorkoutDetail({ workout, units }: WorkoutDetailProps) {
  const segments = workout.segments as WorkoutSegment[];
  const distKm = workout.plannedDistanceMeters / 1000;
  const durationMin = Math.round(workout.plannedDurationSeconds / 60);

  return (
    <div className="space-y-4">
      {/* Stats row */}
      {workout.type !== "rest" && (
        <div className="flex gap-4 py-2">
          {distKm > 0 && (
            <StatChip
              label={units === "imperial" ? "miles" : "km"}
              value={
                units === "imperial"
                  ? (distKm * 0.621371).toFixed(1)
                  : distKm.toFixed(1)
              }
            />
          )}
          {durationMin > 0 && <StatChip label="min" value={String(durationMin)} />}
          <StatChip label="phase" value={workout.phase} className="capitalize" />
        </div>
      )}

      {/* Description */}
      {workout.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">{workout.description}</p>
      )}

      {/* Segments */}
      {segments.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Structure</h3>
          <div className="rounded-xl border divide-y overflow-hidden">
            {segments.map((seg, i) => (
              <SegmentRow key={i} segment={seg} units={units} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SegmentRow({
  segment,
  units,
}: {
  segment: WorkoutSegment;
  units: "metric" | "imperial";
}) {
  const kindLabel = SEGMENT_KIND_LABEL[segment.kind] ?? segment.kind;

  return (
    <div className="flex items-start justify-between px-4 py-3 gap-3 text-sm">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "text-xs font-medium px-1.5 py-0.5 rounded",
              segment.kind === "warmup" || segment.kind === "cooldown"
                ? "bg-muted text-muted-foreground"
                : segment.kind === "work"
                ? "bg-orange-100 text-orange-800"
                : segment.kind === "recovery"
                ? "bg-blue-100 text-blue-800"
                : "bg-primary/10 text-primary",
            )}
          >
            {kindLabel}
          </span>
          {segment.repeats && segment.repeats > 1 && (
            <span className="text-xs text-muted-foreground">×{segment.repeats}</span>
          )}
        </div>
        <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
          {segment.description}
        </p>
      </div>
      <div className="text-right shrink-0 space-y-0.5">
        {segment.distanceMeters && segment.distanceMeters > 0 && (
          <p className="text-xs font-medium">
            {units === "imperial"
              ? `${(segment.distanceMeters / 1609.34).toFixed(2)} mi`
              : segment.distanceMeters >= 1000
              ? `${(segment.distanceMeters / 1000).toFixed(1)} km`
              : `${segment.distanceMeters} m`}
          </p>
        )}
        {segment.durationSeconds && segment.durationSeconds > 0 && (
          <p className="text-xs text-muted-foreground">
            {segment.durationSeconds >= 60
              ? `${Math.round(segment.durationSeconds / 60)} min`
              : `${segment.durationSeconds} s`}
          </p>
        )}
        {segment.paceTarget && (
          <div className="text-xs">
            <span className="text-muted-foreground mr-1">
              {PACE_TYPE_LABEL[segment.paceTarget.paceType] ?? segment.paceTarget.paceType}
            </span>
            <PaceRangeDisplay
              minSecPerKm={segment.paceTarget.minSecPerKm}
              maxSecPerKm={segment.paceTarget.maxSecPerKm}
              units={units}
              className="text-xs"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <span className={cn("text-xl font-bold tabular-nums", className)}>{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
