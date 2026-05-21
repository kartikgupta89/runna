"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteFitnessTest } from "@/lib/db/repository";
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteFitnessTest(id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-2">
      {tests.map((test) => (
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
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-bold text-lg">{test.vdotResult.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">VDOT</p>
            </div>
            <button
              onClick={() => handleDelete(test.id)}
              disabled={deletingId === test.id}
              className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
              aria-label="Delete fitness test"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
