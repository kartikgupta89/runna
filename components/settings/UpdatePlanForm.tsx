"use client";

import { useState } from "react";
import { reRunFitnessTest } from "@/lib/db/repository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const RACE_DISTANCES_M: Record<string, number> = {
  "5K": 5000,
  "10K": 10000,
  "Half Marathon": 21097.5,
  "Marathon": 42195,
  "Custom": 0,
};

const RACE_OPTIONS = [
  { value: "fivek", label: "5K" },
  { value: "tenk", label: "10K" },
  { value: "halfMarathon", label: "Half Marathon" },
  { value: "marathon", label: "Marathon" },
] as const;

function parseDuration(raw: string): number | null {
  const parts = raw.trim().split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

interface UpdatePlanFormProps {
  onDone?: () => void;
}

export function UpdatePlanForm({ onDone }: UpdatePlanFormProps) {
  const [racePreset, setRacePreset] = useState("10K");
  const [customDistanceKm, setCustomDistanceKm] = useState("");
  const [raceTime, setRaceTime] = useState("");
  const [source, setSource] = useState<"race" | "timeTrial" | "estimated">("race");
  const [goalRace, setGoalRace] = useState<"fivek" | "tenk" | "halfMarathon" | "marathon">("halfMarathon");
  const [raceDateIso, setRaceDateIso] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState("4");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [done, setDone] = useState(false);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 56);
  const minIso = minDate.toISOString().split("T")[0];

  async function handleSubmit() {
    const distM =
      racePreset === "Custom"
        ? parseFloat(customDistanceKm) * 1000
        : RACE_DISTANCES_M[racePreset];
    if (!distM || distM <= 0) {
      setError("Enter a valid race distance");
      return;
    }
    const timeS = parseDuration(raceTime);
    if (!timeS || timeS <= 0) {
      setError("Enter finish time as H:MM:SS or MM:SS");
      return;
    }
    if (!raceDateIso) {
      setError("Select your race date");
      return;
    }
    if (raceDateIso < minIso) {
      setError("Race date must be at least 8 weeks away");
      return;
    }
    const days = parseInt(daysPerWeek);
    if (isNaN(days) || days < 3 || days > 6) {
      setError("Days per week must be 3–6");
      return;
    }

    setError(null);
    setIsPending(true);
    try {
      await reRunFitnessTest({
        distanceM: distM,
        timeS,
        source,
        goalRace,
        raceDateIso,
        daysPerWeek: days,
      });
      setDone(true);
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsPending(false);
    }
  }

  if (done) {
    return (
      <p className="text-sm text-green-600 font-medium">
        New training plan generated ✓
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter a recent race or time trial to recalculate your fitness and generate a fresh plan.
        Your profile and Strava connection will be kept.
      </p>

      {/* Recent performance */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Recent race distance</Label>
          <Select value={racePreset} onValueChange={setRacePreset}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(RACE_DISTANCES_M).map((k) => (
                <SelectItem key={k} value={k}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {racePreset === "Custom" && (
          <div className="space-y-1.5">
            <Label htmlFor="upd-custom-dist">Distance (km)</Label>
            <Input
              id="upd-custom-dist"
              type="number"
              step="0.1"
              placeholder="e.g. 8.5"
              value={customDistanceKm}
              onChange={(e) => setCustomDistanceKm(e.target.value)}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="upd-time">Finish time (H:MM:SS or MM:SS)</Label>
          <Input
            id="upd-time"
            placeholder="e.g. 55:30"
            value={raceTime}
            onChange={(e) => setRaceTime(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Source</Label>
          <Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="race">Race</SelectItem>
              <SelectItem value="timeTrial">Time trial</SelectItem>
              <SelectItem value="estimated">Estimated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Goal race */}
      <div className="space-y-1.5">
        <Label>Goal race</Label>
        <div className="grid grid-cols-2 gap-2">
          {RACE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setGoalRace(value)}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors text-sm font-semibold",
                goalRace === value
                  ? "border-primary bg-primary/5 text-primary"
                  : "hover:border-primary/50 hover:bg-muted/50",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Race date & days */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="upd-date">Race date</Label>
          <Input
            id="upd-date"
            type="date"
            min={minIso}
            value={raceDateIso}
            onChange={(e) => setRaceDateIso(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Days per week</Label>
          <Select value={daysPerWeek} onValueChange={setDaysPerWeek}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[3, 4, 5, 6].map((d) => (
                <SelectItem key={d} value={String(d)}>{d} days/week</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={handleSubmit} disabled={isPending} className="w-full">
        {isPending ? "Generating plan…" : "Generate new plan"}
      </Button>
    </div>
  );
}
