"use client";

import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import nextDynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, MapPin, ExternalLink } from "lucide-react";
import { getUser, getWorkoutById } from "@/lib/db/repository";
import { WorkoutDetail } from "@/components/workout/WorkoutDetail";
import { LogForm } from "@/components/workout/LogForm";
import { StravaRunOption } from "@/components/run/StravaRunOption";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GpsPoint } from "@/lib/training/gps";

const RouteMap = nextDynamic(() => import("@/components/workout/RouteMap"), { ssr: false });

const TYPE_CONFIG: Record<
  string,
  {
    label: string;
    variant: "blue" | "green" | "orange" | "red" | "purple" | "default" | "secondary";
  }
> = {
  easy: { label: "Easy Run", variant: "green" },
  long: { label: "Long Run", variant: "green" },
  tempo: { label: "Tempo", variant: "orange" },
  intervals: { label: "Intervals", variant: "red" },
  repetitions: { label: "Reps", variant: "purple" },
  marathonPace: { label: "Marathon Pace", variant: "blue" },
  race: { label: "Race Day", variant: "default" },
  rest: { label: "Rest Day", variant: "secondary" },
};

export default function WorkoutPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useLiveQuery(() => getUser(), [], null);
  const workout = useLiveQuery(() => getWorkoutById(id), [id], null);

  if (user === null || workout === null) return null;
  if (!workout) return <div className="p-8 text-center text-muted-foreground">Workout not found</div>;

  const config = TYPE_CONFIG[workout.type] ?? { label: workout.type, variant: "default" as const };
  const gpsTrack = workout.gpsTrack as GpsPoint[] | null;
  const isLoggable = workout.type !== "rest";

  const dateLabel = new Date(workout.date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={config.variant}>{config.label}</Badge>
            </div>
            <h1 className="text-lg font-bold leading-tight">{workout.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Week {workout.weekNumber} · {dateLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        <WorkoutDetail workout={workout} units={user?.preferredUnits ?? "metric"} />

        {isLoggable && !workout.completed && (
          <Button asChild className="w-full gap-2" size="lg">
            <Link href={`/run/${workout.id}`}>
              <MapPin className="h-4 w-4" />
              Start / Track Run
            </Link>
          </Button>
        )}

        {/* View on Strava link when this workout was synced from Strava */}
        {workout.stravaActivityId && (
          <a
            href={`https://www.strava.com/activities/${workout.stravaActivityId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl border border-[#FC4C02]/30 bg-[#FC4C02]/5 py-3 text-sm font-semibold text-[#FC4C02] hover:bg-[#FC4C02]/10 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            View on Strava
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}

        {/* Sync from Strava on the detail page (for re-sync or if skipped the run screen) */}
        {isLoggable && (
          <StravaRunOption
            workoutId={workout.id}
            workoutDate={workout.date}
            units={user?.preferredUnits ?? "metric"}
          />
        )}

        {gpsTrack && gpsTrack.length > 1 && (
          <div>
            <h2 className="text-sm font-semibold mb-2">Route</h2>
            <div className="rounded-xl overflow-hidden border h-56">
              <RouteMap points={gpsTrack} className="h-full w-full" />
            </div>
          </div>
        )}

        {isLoggable && (
          <>
            <Separator />
            <div>
              <h2 className="text-sm font-semibold mb-3">
                {workout.completed ? "Run log" : "Log manually"}
              </h2>
              <LogForm workout={workout} units={user?.preferredUnits ?? "metric"} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
