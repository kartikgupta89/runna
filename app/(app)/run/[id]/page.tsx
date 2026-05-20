"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getUser, getWorkoutById } from "@/lib/db/repository";
import { RunTracker } from "@/components/run/RunTracker";

export default function RunPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useLiveQuery(() => getUser(), [], null);
  const workout = useLiveQuery(() => getWorkoutById(id), [id], null);

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
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-background shrink-0">
        <Link href={`/workout/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-sm font-medium truncate">{workout.title}</span>
      </div>

      <div className="flex-1 overflow-auto">
        <RunTracker
          workoutId={workout.id}
          workoutTitle={workout.title}
          plannedDistanceM={workout.plannedDistanceMeters}
          plannedDurationS={workout.plannedDurationSeconds}
          units={user?.preferredUnits ?? "metric"}
        />
      </div>
    </div>
  );
}
