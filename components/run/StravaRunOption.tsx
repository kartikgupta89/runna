"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, RefreshCw, CheckCircle2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchStravaActivities,
  decodePolyline,
} from "@/lib/strava/client";
import { completeWorkout } from "@/lib/db/repository";
import type { StravaSummaryActivity } from "@/lib/strava/types";
import type { GpsPoint } from "@/lib/training/gps";
import { cn } from "@/lib/utils";

interface StravaRunOptionProps {
  workoutId: string;
  workoutDate: Date;
  units: "metric" | "imperial";
}

type Phase = "idle" | "opened" | "syncing" | "pick" | "done" | "error";

export function StravaRunOption({ workoutId, workoutDate, units }: StravaRunOptionProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [activities, setActivities] = useState<StravaSummaryActivity[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function openStrava() {
    // Try deep link; if Strava isn't installed the browser ignores it
    // Use location.href for fallback too (window.open is blocked outside gesture)
    window.location.href = "strava://";
    setTimeout(() => {
      window.location.href = "https://www.strava.com/dashboard";
    }, 1500);
    setPhase("opened");
  }

  async function syncFromStrava() {
    setPhase("syncing");
    setErrorMsg("");
    try {
      // Fetch activities within a ±12 hour window around the workout date
      const d = new Date(workoutDate);
      d.setHours(0, 0, 0, 0);
      const after = Math.floor(d.getTime() / 1000) - 43200; // -12h
      const before = Math.floor(d.getTime() / 1000) + 86400 + 43200; // +36h

      const all = await fetchStravaActivities(after, before);
      const runs = all.filter(
        (a) =>
          a.sport_type === "Run" ||
          a.type === "Run" ||
          a.sport_type === "TrailRun" ||
          a.sport_type === "VirtualRun",
      );

      if (runs.length === 0) {
        setErrorMsg("No runs found for this date on Strava. Try again after your run syncs.");
        setPhase("opened");
        return;
      }

      if (runs.length === 1) {
        await importActivity(runs[0]);
      } else {
        setActivities(runs);
        setPhase("pick");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      if (msg === "strava_not_connected") {
        setErrorMsg("Strava is not connected. Go to Settings → Strava to connect.");
      } else if (msg === "strava_unauthorized") {
        setErrorMsg("Strava token expired. Reconnect in Settings.");
      } else {
        setErrorMsg("Could not reach Strava. Check your connection and try again.");
      }
      setPhase("error");
    }
  }

  async function importActivity(activity: StravaSummaryActivity) {
    setIsSaving(true);
    try {
      // Spread GPS timestamps evenly across the activity duration
      const startMs = new Date(activity.start_date).getTime();
      const durationMs = activity.elapsed_time * 1000;

      const gpsTrack: GpsPoint[] | undefined = activity.map?.summary_polyline
        ? decodePolyline(activity.map.summary_polyline).map((p, i, arr) => ({
            lat: p.lat,
            lng: p.lng,
            ts: startMs + Math.round((i / Math.max(arr.length - 1, 1)) * durationMs),
          }))
        : undefined;

      await completeWorkout(workoutId, {
        actualDistanceKm: activity.distance / 1000,
        actualDurationMin: activity.moving_time / 60,
        gpsTrack,
        notes: `Synced from Strava: ${activity.name}`,
      });

      setPhase("done");
      setTimeout(() => router.push(`/workout/${workoutId}`), 1200);
    } catch {
      setErrorMsg("Failed to save the run. Please try again.");
      setPhase("error");
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Idle: just the "Open in Strava" button ───────────────────────────────

  if (phase === "idle") {
    return (
      <button
        onClick={openStrava}
        className="w-full rounded-xl border-2 border-[#FC4C02]/30 bg-[#FC4C02]/5 p-4 text-left flex items-center gap-3 hover:border-[#FC4C02]/60 hover:bg-[#FC4C02]/10 transition-colors"
      >
        <div className="h-10 w-10 rounded-full bg-[#FC4C02] flex items-center justify-center shrink-0">
          <StravaIcon />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Open in Strava</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track with Strava GPS · sync back when done
          </p>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
    );
  }

  // ─── Opened: waiting for user to complete run in Strava ──────────────────

  if (phase === "opened") {
    return (
      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-[#FC4C02] flex items-center justify-center shrink-0">
            <StravaIcon />
          </div>
          <div>
            <p className="text-sm font-semibold">Strava opened</p>
            <p className="text-xs text-muted-foreground">
              Start your run in Strava, then come back here
            </p>
          </div>
        </div>

        {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}

        <Button onClick={syncFromStrava} className="w-full gap-2">
          <RefreshCw className="h-4 w-4" />
          I&apos;m done — sync from Strava
        </Button>

        <button
          onClick={() => setPhase("idle")}
          className="w-full text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    );
  }

  // ─── Syncing ──────────────────────────────────────────────────────────────

  if (phase === "syncing") {
    return (
      <div className="rounded-xl border p-4 flex items-center gap-3 text-sm text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
        Fetching your Strava run…
      </div>
    );
  }

  // ─── Pick from multiple activities ───────────────────────────────────────

  if (phase === "pick") {
    return (
      <div className="rounded-xl border p-4 space-y-3">
        <p className="text-sm font-semibold">Multiple runs found — pick one to import</p>
        <div className="space-y-2">
          {activities.map((a) => (
            <button
              key={a.id}
              disabled={isSaving}
              onClick={() => importActivity(a)}
              className={cn(
                "w-full rounded-lg border p-3 text-left hover:border-primary hover:bg-muted/50 transition-colors",
                isSaving && "opacity-50 cursor-not-allowed",
              )}
            >
              <p className="text-sm font-medium">{a.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {fmtDist(a.distance, units)} · {fmtTime(a.moving_time)} ·{" "}
                {new Date(a.start_date).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </button>
          ))}
        </div>
        <button
          onClick={() => setPhase("opened")}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Back
        </button>
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────

  if (phase === "error") {
    const isNotConnected =
      errorMsg.includes("not connected") || errorMsg.includes("token expired");
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
        <p className="text-sm text-destructive">{errorMsg}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPhase("idle")}>
            Try again
          </Button>
          {isNotConnected && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings">Go to Settings</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ─── Done ─────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 p-4 flex items-center gap-3">
      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
      <p className="text-sm font-medium text-green-700 dark:text-green-400">
        Run imported from Strava ✓
      </p>
    </div>
  );
}

function fmtDist(meters: number, units: "metric" | "imperial") {
  if (units === "imperial") return `${(meters / 1609.34).toFixed(2)} mi`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function fmtTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function StravaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" aria-hidden>
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}
