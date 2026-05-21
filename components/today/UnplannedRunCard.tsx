"use client";

import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addUnplannedWorkout, getWorkoutsForDate } from "@/lib/db/repository";
import { fetchStravaActivities, decodePolyline } from "@/lib/strava/client";
import type { StravaSummaryActivity } from "@/lib/strava/types";
import type { GpsPoint } from "@/lib/training/gps";
import { cn } from "@/lib/utils";

interface UnplannedRunCardProps {
  date: Date;
  todayDate: Date;
  units: "metric" | "imperial";
  onAdded?: () => void;
  /** When true, hides the "No workout planned" header — used when a workout already exists */
  compact?: boolean;
}

type Mode = "idle" | "manual" | "strava-syncing" | "strava-pick";

function parseDuration(raw: string): number | null {
  const parts = raw.trim().split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

export function UnplannedRunCard({ date, todayDate, units, onAdded, compact }: UnplannedRunCardProps) {
  const [mode, setMode] = useState<Mode>("idle");
  const [distanceRaw, setDistanceRaw] = useState("");
  const [durationRaw, setDurationRaw] = useState("");
  const [notes, setNotes] = useState("");
  const [activities, setActivities] = useState<StravaSummaryActivity[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const todayMidnight = new Date(todayDate);
  todayMidnight.setHours(0, 0, 0, 0);
  const dateMidnight = new Date(date);
  dateMidnight.setHours(0, 0, 0, 0);
  const isPastOrToday = dateMidnight <= todayMidnight;

  async function saveManual() {
    setIsSaving(true);
    setErrorMsg("");
    try {
      const distVal = parseFloat(distanceRaw);
      if (isNaN(distVal) || distVal <= 0) {
        setErrorMsg("Enter a valid distance");
        setIsSaving(false);
        return;
      }
      const distKm = units === "imperial" ? distVal * 1.60934 : distVal;

      let durationMin: number | undefined;
      if (durationRaw.trim()) {
        const secs = parseDuration(durationRaw);
        if (secs === null || secs <= 0) {
          setErrorMsg("Enter duration as MM:SS or H:MM:SS");
          setIsSaving(false);
          return;
        }
        durationMin = secs / 60;
      }

      await addUnplannedWorkout({
        date,
        distanceKm: distKm,
        durationMin,
        notes: notes.trim() || undefined,
      });
      onAdded?.();
    } catch {
      setErrorMsg("Failed to save run. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function syncStrava() {
    setMode("strava-syncing");
    setErrorMsg("");
    try {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const after = Math.floor(d.getTime() / 1000) - 3600;
      const before = Math.floor(d.getTime() / 1000) + 86400 + 3600;
      const all = await fetchStravaActivities(after, before);
      const allRuns = all.filter(
        (a) =>
          a.sport_type === "Run" ||
          a.type === "Run" ||
          a.sport_type === "TrailRun" ||
          a.sport_type === "VirtualRun",
      );

      // Filter out activities already imported on this day
      const existingWorkouts = await getWorkoutsForDate(date);
      const importedIds = new Set(
        existingWorkouts
          .map((w) => w.stravaActivityId)
          .filter((id): id is number => id !== undefined),
      );
      const runs = allRuns.filter((a) => !importedIds.has(a.id));

      if (allRuns.length > 0 && runs.length === 0) {
        setErrorMsg("All Strava activities for this day are already imported.");
        setMode("idle");
        return;
      }
      if (runs.length === 0) {
        setErrorMsg("No runs found for this date on Strava.");
        setMode("idle");
        return;
      }
      if (runs.length === 1) {
        await importStravaActivity(runs[0]);
      } else {
        setActivities(runs);
        setMode("strava-pick");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "strava_not_connected") {
        setErrorMsg("Strava not connected. Go to Settings → Strava to connect.");
      } else if (msg === "strava_unauthorized") {
        setErrorMsg("Strava token expired. Reconnect in Settings.");
      } else {
        setErrorMsg("Could not reach Strava. Check your connection.");
      }
      setMode("idle");
    }
  }

  async function importStravaActivity(activity: StravaSummaryActivity) {
    setIsSaving(true);
    try {
      const startMs = new Date(activity.start_date).getTime();
      const durationMs = activity.elapsed_time * 1000;
      const gpsTrack: GpsPoint[] | undefined = activity.map?.summary_polyline
        ? decodePolyline(activity.map.summary_polyline).map((p, i, arr) => ({
            lat: p.lat,
            lng: p.lng,
            ts: startMs + Math.round((i / Math.max(arr.length - 1, 1)) * durationMs),
          }))
        : undefined;

      await addUnplannedWorkout({
        date,
        title: activity.name,
        distanceKm: activity.distance / 1000,
        durationMin: activity.moving_time / 60,
        notes: `Synced from Strava: ${activity.name}`,
        gpsTrack,
        stravaActivityId: activity.id,
      });
      onAdded?.();
    } catch {
      setErrorMsg("Failed to save the run. Please try again.");
      setMode("idle");
    } finally {
      setIsSaving(false);
    }
  }

  if (mode === "strava-syncing") {
    return (
      <div className="rounded-2xl border border-dashed p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Fetching from Strava…
      </div>
    );
  }

  if (mode === "strava-pick") {
    return (
      <div className="rounded-2xl border p-4 space-y-3">
        <p className="text-sm font-semibold">Pick a run to import</p>
        <div className="space-y-2">
          {activities.map((a) => (
            <button
              key={a.id}
              disabled={isSaving}
              onClick={() => importStravaActivity(a)}
              className={cn(
                "w-full rounded-lg border p-3 text-left hover:border-primary hover:bg-muted/50 transition-colors",
                isSaving && "opacity-50 cursor-not-allowed",
              )}
            >
              <p className="text-sm font-medium">{a.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {units === "imperial"
                  ? `${(a.distance / 1609.34).toFixed(2)} mi`
                  : `${(a.distance / 1000).toFixed(2)} km`}{" "}
                · {Math.floor(a.moving_time / 60)}:
                {String(a.moving_time % 60).padStart(2, "0")}
              </p>
            </button>
          ))}
        </div>
        <button
          onClick={() => setMode("idle")}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (mode === "manual") {
    return (
      <div className="rounded-2xl border p-5 space-y-4">
        <h3 className="text-sm font-semibold">Log a run</h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="unplanned-dist">
              Distance ({units === "imperial" ? "miles" : "km"})
            </Label>
            <Input
              id="unplanned-dist"
              type="number"
              step="0.1"
              placeholder={units === "imperial" ? "e.g. 3.1" : "e.g. 5.0"}
              value={distanceRaw}
              onChange={(e) => setDistanceRaw(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="unplanned-dur">Duration (MM:SS or H:MM:SS)</Label>
            <Input
              id="unplanned-dur"
              placeholder="e.g. 28:30"
              value={durationRaw}
              onChange={(e) => setDurationRaw(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="unplanned-notes">Notes (optional)</Label>
            <Input
              id="unplanned-notes"
              placeholder="How did it feel?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setMode("idle"); setErrorMsg(""); }}
            className="flex-1"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={saveManual}
            disabled={isSaving || !distanceRaw}
            className="flex-1"
          >
            {isSaving ? "Saving…" : "Save Run"}
          </Button>
        </div>
      </div>
    );
  }

  // idle state
  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-muted-foreground"
            onClick={() => { setMode("manual"); setErrorMsg(""); }}
          >
            <Plus className="h-3.5 w-3.5" />
            Log another run
          </Button>
          {isPastOrToday && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 text-[#FC4C02] border-[#FC4C02]/30 hover:border-[#FC4C02]/60 hover:bg-[#FC4C02]/5"
              onClick={syncStrava}
            >
              <StravaIcon />
              Sync Strava
            </Button>
          )}
        </div>
        {errorMsg && <p className="text-sm text-destructive text-center">{errorMsg}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed p-5 space-y-3">
      <p className="text-sm text-muted-foreground text-center">No workout planned</p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => { setMode("manual"); setErrorMsg(""); }}
        >
          <Plus className="h-3.5 w-3.5" />
          Log run
        </Button>
        {isPastOrToday && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-[#FC4C02] border-[#FC4C02]/30 hover:border-[#FC4C02]/60 hover:bg-[#FC4C02]/5"
            onClick={syncStrava}
          >
            <StravaIcon />
            Sync Strava
          </Button>
        )}
      </div>
      {errorMsg && <p className="text-sm text-destructive text-center">{errorMsg}</p>}
    </div>
  );
}

function StravaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}
