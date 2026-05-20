"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getUser, getWorkoutById } from "@/lib/db/repository";
import { RunTracker } from "@/components/run/RunTracker";
import { StravaRunOption } from "@/components/run/StravaRunOption";

type Mode = "choose" | "runna" | "strava";

export default function RunPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useLiveQuery(() => getUser(), [], null);
  const workout = useLiveQuery(() => getWorkoutById(id), [id], null);
  const [mode, setMode] = useState<Mode>("choose");

  useEffect(() => {
    if (workout === null) return;
    if (!workout) return;
    if (workout.type === "rest" || workout.completed) {
      router.replace(`/workout/${id}`);
    }
  }, [workout, id, router]);

  if (user === null || workout === null) return null;
  if (!workout || workout.type === "rest" || workout.completed) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-background shrink-0">
        <Link
          href={`/workout/${id}`}
          className="text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            if (mode !== "choose") {
              e.preventDefault();
              setMode("choose");
            }
          }}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-sm font-medium truncate">{workout.title}</span>
      </div>

      {/* Mode: choose */}
      {mode === "choose" && (
        <div className="flex-1 overflow-auto px-4 py-6 space-y-4 max-w-lg mx-auto w-full">
          <div className="text-center mb-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              How do you want to track this run?
            </p>
          </div>

          {/* Runna GPS option */}
          <button
            onClick={() => setMode("runna")}
            className="w-full rounded-xl border-2 border-primary/30 bg-primary/5 p-4 text-left flex items-center gap-3 hover:border-primary/60 hover:bg-primary/10 transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shrink-0 text-primary-foreground font-bold text-sm">
              R
            </div>
            <div>
              <p className="font-semibold text-sm">Track with Runna</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Built-in GPS · live map · auto-logged
              </p>
            </div>
          </button>

          {/* Strava option */}
          <StravaRunOption
            workoutId={workout.id}
            workoutDate={workout.date}
            units={user?.preferredUnits ?? "metric"}
          />

          <p className="text-xs text-center text-muted-foreground pt-2">
            Or{" "}
            <Link href={`/workout/${id}`} className="underline underline-offset-2">
              log manually
            </Link>{" "}
            after your run
          </p>
        </div>
      )}

      {/* Mode: Runna GPS tracker */}
      {mode === "runna" && (
        <div className="flex-1 overflow-auto">
          <RunTracker
            workoutId={workout.id}
            workoutTitle={workout.title}
            plannedDistanceM={workout.plannedDistanceMeters}
            plannedDurationS={workout.plannedDurationSeconds}
            units={user?.preferredUnits ?? "metric"}
          />
        </div>
      )}
    </div>
  );
}
