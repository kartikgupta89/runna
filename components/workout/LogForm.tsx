"use client";

import { useState } from "react";
import { completeWorkout, uncompleteWorkout, type LogInput } from "@/lib/db/repository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WorkoutRow } from "@/lib/db/dexie";

interface LogFormProps {
  workout: WorkoutRow;
  units: "metric" | "imperial";
}

export function LogForm({ workout, units }: LogFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [distKm, setDistKm] = useState(
    workout.actualDistanceMeters
      ? String(
          units === "imperial"
            ? (workout.actualDistanceMeters / 1609.34).toFixed(2)
            : (workout.actualDistanceMeters / 1000).toFixed(2),
        )
      : "",
  );
  const [durMin, setDurMin] = useState(
    workout.actualDurationSeconds
      ? String(Math.round(workout.actualDurationSeconds / 60))
      : "",
  );
  const [effort, setEffort] = useState(
    workout.perceivedEffort ? String(workout.perceivedEffort) : "",
  );
  const [notes, setNotes] = useState(workout.notes ?? "");

  async function handleComplete() {
    const distanceKmValue = distKm
      ? units === "imperial"
        ? parseFloat(distKm) * 1.60934
        : parseFloat(distKm)
      : undefined;

    const log: LogInput = {
      actualDistanceKm: distanceKmValue || undefined,
      actualDurationMin: durMin ? parseFloat(durMin) : undefined,
      perceivedEffort: effort ? parseInt(effort) : undefined,
      notes: notes || undefined,
    };
    setIsPending(true);
    try {
      await completeWorkout(workout.id, log);
    } finally {
      setIsPending(false);
    }
  }

  async function handleUncomplete() {
    setIsPending(true);
    try {
      await uncompleteWorkout(workout.id);
    } finally {
      setIsPending(false);
    }
  }

  if (workout.completed) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-green-50 border border-green-200 dark:bg-green-950/20 p-4 space-y-2">
          <p className="text-sm font-semibold text-green-700 dark:text-green-400">Completed ✓</p>
          {workout.actualDistanceMeters && (
            <p className="text-sm text-muted-foreground">
              Distance:{" "}
              <span className="font-medium text-foreground">
                {units === "imperial"
                  ? `${(workout.actualDistanceMeters / 1609.34).toFixed(2)} mi`
                  : `${(workout.actualDistanceMeters / 1000).toFixed(2)} km`}
              </span>
            </p>
          )}
          {workout.actualDurationSeconds && (
            <p className="text-sm text-muted-foreground">
              Duration:{" "}
              <span className="font-medium text-foreground">
                {Math.round(workout.actualDurationSeconds / 60)} min
              </span>
            </p>
          )}
          {workout.actualAvgPaceSecPerKm && (
            <p className="text-sm text-muted-foreground">
              Avg pace:{" "}
              <span className="font-mono font-medium text-foreground">
                {formatPaceStr(
                  units === "imperial"
                    ? workout.actualAvgPaceSecPerKm * 1.60934
                    : workout.actualAvgPaceSecPerKm,
                )}{" "}
                {units === "imperial" ? "/mi" : "/km"}
              </span>
            </p>
          )}
          {workout.perceivedEffort && (
            <p className="text-sm text-muted-foreground">
              Effort: <span className="font-medium text-foreground">{workout.perceivedEffort}/10</span>
            </p>
          )}
          {workout.notes && (
            <p className="text-sm text-muted-foreground italic">"{workout.notes}"</p>
          )}
        </div>
        <Button
          variant="outline"
          onClick={handleUncomplete}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? "Updating…" : "Mark as incomplete"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="dist">
            Distance ({units === "imperial" ? "miles" : "km"})
          </Label>
          <Input
            id="dist"
            type="number"
            step="0.01"
            placeholder={
              units === "imperial"
                ? `${(workout.plannedDistanceMeters / 1609.34).toFixed(1)}`
                : `${(workout.plannedDistanceMeters / 1000).toFixed(1)}`
            }
            value={distKm}
            onChange={(e) => setDistKm(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dur">Duration (min)</Label>
          <Input
            id="dur"
            type="number"
            step="1"
            placeholder={String(Math.round(workout.plannedDurationSeconds / 60))}
            value={durMin}
            onChange={(e) => setDurMin(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="effort">Perceived effort (1–10)</Label>
        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setEffort(String(n))}
              className={
                effort === String(n)
                  ? "h-8 w-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
                  : "h-8 w-8 rounded-full border text-xs font-semibold hover:bg-muted"
              }
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          placeholder="How did it feel? Any conditions worth noting?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[80px] resize-none"
        />
      </div>

      <Button onClick={handleComplete} disabled={isPending} className="w-full">
        {isPending ? "Saving…" : "Mark as complete"}
      </Button>
    </div>
  );
}

function formatPaceStr(secPerKm: number): string {
  const s = Math.round(secPerKm);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
