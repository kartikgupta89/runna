"use client";

import { useState } from "react";
import { wipeAllData } from "@/lib/db/repository";
import { Button } from "@/components/ui/button";
import type { TrainingPlanRow } from "@/lib/db/dexie";

interface DangerZoneProps {
  plan: TrainingPlanRow | undefined;
}

export function DangerZone({ plan }: DangerZoneProps) {
  const [confirm, setConfirm] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleWipe() {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    setIsPending(true);
    try {
      await wipeAllData();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Delete all data and start from scratch. This cannot be undone.
      </p>
      {confirm && (
        <p className="text-sm font-medium text-destructive">
          Are you sure? All your workouts, logs, and plan data will be permanently deleted.
        </p>
      )}
      <Button
        variant="destructive"
        onClick={handleWipe}
        disabled={isPending}
        className="w-full"
      >
        {isPending
          ? "Deleting…"
          : confirm
          ? "Yes, delete everything"
          : "Wipe all data"}
      </Button>
      {confirm && (
        <Button
          variant="outline"
          onClick={() => setConfirm(false)}
          disabled={isPending}
          className="w-full"
        >
          Cancel
        </Button>
      )}
    </div>
  );
}
