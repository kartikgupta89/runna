"use client";

import { useState } from "react";
import { updateUnits } from "@/lib/db/repository";
import { cn } from "@/lib/utils";

interface UnitsToggleProps {
  current: "metric" | "imperial";
}

export function UnitsToggle({ current }: UnitsToggleProps) {
  const [isPending, setIsPending] = useState(false);

  async function toggle(unit: "metric" | "imperial") {
    if (unit === current) return;
    setIsPending(true);
    try {
      await updateUnits(unit);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex rounded-lg border overflow-hidden w-fit">
      {(["metric", "imperial"] as const).map((unit) => (
        <button
          key={unit}
          disabled={isPending}
          onClick={() => toggle(unit)}
          className={cn(
            "px-5 py-2 text-sm font-medium transition-colors",
            current === unit
              ? "bg-primary text-primary-foreground"
              : "bg-background hover:bg-muted text-muted-foreground",
          )}
        >
          {unit === "metric" ? "Metric (km)" : "Imperial (mi)"}
        </button>
      ))}
    </div>
  );
}
