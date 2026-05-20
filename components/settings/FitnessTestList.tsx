import type { FitnessTestRow } from "@/lib/db/dexie";

interface FitnessTestListProps {
  tests: FitnessTestRow[];
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export function FitnessTestList({ tests }: FitnessTestListProps) {
  return (
    <div className="space-y-2">
      {tests.slice(0, 5).map((test) => (
        <div
          key={test.id}
          className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 text-sm"
        >
          <div>
            <p className="font-medium">
              {formatDistance(test.distanceMeters)} in {formatTime(test.timeSeconds)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">
              {new Date(test.date).toLocaleDateString()} · {test.source}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">{test.vdotResult.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">VDOT</p>
          </div>
        </div>
      ))}
    </div>
  );
}
