"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Play, Pause, Square, MapPin, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeWorkout } from "@/lib/db/repository";
import {
  haversineMeters,
  rollingPaceSecPerKm,
  type GpsPoint,
} from "@/lib/training/gps";
import { cn } from "@/lib/utils";

const LiveMap = dynamic(() => import("./LiveMap"), { ssr: false });

type Status = "idle" | "acquiring" | "active" | "paused" | "stopped";

interface RunTrackerProps {
  workoutId: string;
  workoutTitle: string;
  plannedDistanceM: number;
  plannedDurationS: number;
  units: "metric" | "imperial";
}

export function RunTracker({
  workoutId,
  workoutTitle,
  plannedDistanceM,
  plannedDurationS,
  units,
}: RunTrackerProps) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [gpsPoints, setGpsPoints] = useState<GpsPoint[]>([]);
  const [distanceM, setDistanceM] = useState(0);
  const [elapsedS, setElapsedS] = useState(0);
  const [currentPace, setCurrentPace] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref copy of GPS points for use inside geolocation callback (avoids stale closure)
  const pointsRef = useRef<GpsPoint[]>([]);
  const distRef = useRef(0);

  // Keep refs in sync
  useEffect(() => {
    pointsRef.current = gpsPoints;
  }, [gpsPoints]);
  useEffect(() => {
    distRef.current = distanceM;
  }, [distanceM]);

  // Timer
  useEffect(() => {
    if (status === "active") {
      timerRef.current = setInterval(() => setElapsedS((s) => s + 1), 1_000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const onPosition = useCallback((pos: GeolocationPosition) => {
    if (pos.coords.accuracy > 40) return; // filter poor accuracy

    const point: GpsPoint = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      ts: pos.timestamp,
      accuracy: pos.coords.accuracy,
    };

    const prev = pointsRef.current;
    const next = [...prev, point];
    pointsRef.current = next;

    if (prev.length > 0) {
      const delta = haversineMeters(prev[prev.length - 1], point);
      if (delta < 200) {
        // filter impossible GPS jumps
        setDistanceM((d) => d + delta);
      }
    }

    setCurrentPace(rollingPaceSecPerKm(next));
    setGpsPoints(next);

    // Transition from acquiring → active on first good fix
    setStatus((s) => (s === "acquiring" ? "active" : s));
  }, []);

  const onPositionError = useCallback((err: GeolocationPositionError) => {
    const messages: Record<number, string> = {
      1: "Location access denied — please allow GPS in your browser settings.",
      2: "GPS signal unavailable. Try moving outdoors.",
      3: "GPS timed out. Check your signal and try again.",
    };
    setGpsError(messages[err.code] ?? err.message);
    setStatus("idle");
  }, []);

  const startWatch = useCallback(() => {
    watchIdRef.current = navigator.geolocation.watchPosition(
      onPosition,
      onPositionError,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
    );
  }, [onPosition, onPositionError]);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { stopWatch(); }, [stopWatch]);

  function handleStart() {
    if (!navigator.geolocation) {
      setGpsError("GPS is not supported in this browser.");
      return;
    }
    setGpsError(null);
    setStatus("acquiring");
    startWatch();
  }

  function handlePause() {
    stopWatch();
    setStatus("paused");
  }

  function handleResume() {
    startWatch();
    setStatus("active");
  }

  function handleStop() {
    stopWatch();
    setStatus("stopped");
  }

  async function handleSave() {
    setIsSaving(true);
    const track = pointsRef.current;
    const dist = distRef.current;
    try {
      await completeWorkout(workoutId, {
        actualDistanceKm: dist / 1_000,
        actualDurationMin: elapsedS / 60,
        gpsTrack: track.length > 0 ? track : undefined,
      });
      router.push(`/workout/${workoutId}`);
    } catch {
      setIsSaving(false);
      // Surface error in the stopped-state UI
      setGpsError("Failed to save your run. Please try again.");
    }
  }

  function handleDiscard() {
    router.back();
  }

  // ─── Formatters ────────────────────────────────────────────────────────────

  function fmtTime(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  function fmtDist(m: number) {
    if (units === "imperial") return `${(m / 1609.34).toFixed(2)} mi`;
    return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
  }

  function fmtPace(secPerKm: number | null) {
    if (!secPerKm) return "--:--";
    const s = units === "imperial" ? secPerKm * 1.60934 : secPerKm;
    return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
  }

  const plannedDist = units === "imperial"
    ? `${(plannedDistanceM / 1609.34).toFixed(1)} mi`
    : `${(plannedDistanceM / 1000).toFixed(1)} km`;

  // ─── Render ────────────────────────────────────────────────────────────────

  if (status === "idle" || status === "acquiring") {
    return (
      <div className="flex flex-col items-center gap-6 py-8 px-4">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-primary mx-auto mb-3" />
          <h2 className="text-xl font-bold">{workoutTitle}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {plannedDist} · {Math.round(plannedDurationS / 60)} min planned
          </p>
        </div>

        {gpsError && (
          <div className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive max-w-xs text-center">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{gpsError}</span>
          </div>
        )}

        <Button
          size="lg"
          onClick={handleStart}
          disabled={status === "acquiring"}
          className="w-40 h-14 rounded-full text-base font-semibold"
        >
          {status === "acquiring" ? (
            <span className="animate-pulse">Getting GPS…</span>
          ) : (
            <>
              <Play className="h-5 w-5 mr-2 fill-current" />
              Start Run
            </>
          )}
        </Button>

        <button
          onClick={() => router.back()}
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          Log manually instead
        </button>
      </div>
    );
  }

  if (status === "stopped") {
    const avgPace = distanceM > 0 && elapsedS > 0
      ? elapsedS / (distanceM / 1000)
      : null;

    return (
      <div className="flex flex-col gap-6 py-6 px-4">
        <h2 className="text-xl font-bold text-center">Run complete</h2>

        {/* Route preview */}
        {gpsPoints.length > 0 && (
          <div className="rounded-xl overflow-hidden h-48 border">
            <LiveMap points={gpsPoints} className="h-full w-full" />
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard label={units === "imperial" ? "Miles" : "Km"} value={fmtDist(distanceM).replace(" km", "").replace(" mi", "")} />
          <SummaryCard label="Time" value={fmtTime(elapsedS)} />
          <SummaryCard label={units === "imperial" ? "min/mi" : "min/km"} value={fmtPace(avgPace)} />
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? "Saving…" : "Save run"}
          </Button>
          <Button variant="outline" onClick={handleDiscard} disabled={isSaving} className="w-full">
            Discard
          </Button>
        </div>
      </div>
    );
  }

  // active | paused
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Live map — takes most of the screen */}
      <div className="flex-1 relative">
        <LiveMap points={gpsPoints} className="h-full w-full" />
        {status === "paused" && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center text-lg font-semibold">
            Paused
          </div>
        )}
      </div>

      {/* Stats strip */}
      <div className="bg-background border-t px-4 py-3 grid grid-cols-3 gap-2 text-center">
        <StatChip label={units === "imperial" ? "mi" : "km"} value={fmtDist(distanceM).replace(" km", "").replace(" mi", "")} />
        <StatChip label="time" value={fmtTime(elapsedS)} />
        <StatChip label={units === "imperial" ? "min/mi" : "min/km"} value={fmtPace(currentPace)} />
      </div>

      {/* Controls */}
      <div className="bg-background px-4 pb-6 pt-2 flex items-center justify-center gap-6">
        {status === "active" ? (
          <>
            <button
              onClick={handlePause}
              className="h-16 w-16 rounded-full bg-yellow-400 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            >
              <Pause className="h-7 w-7 fill-current" />
            </button>
            <button
              onClick={handleStop}
              className="h-14 w-14 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow active:scale-95 transition-transform"
            >
              <Square className="h-6 w-6 fill-current" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleResume}
              className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            >
              <Play className="h-7 w-7 fill-current" />
            </button>
            <button
              onClick={handleStop}
              className="h-14 w-14 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow active:scale-95 transition-transform"
            >
              <Square className="h-6 w-6 fill-current" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-3 text-center">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
