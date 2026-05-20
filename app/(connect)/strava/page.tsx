"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveStravaTokens } from "@/lib/db/repository";

function StravaConnectInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<"saving" | "error">("saving");

  useEffect(() => {
    const at = params.get("at");
    const rt = params.get("rt");
    const ea = params.get("ea");
    const aid = params.get("aid");
    const name = params.get("name") ?? "";

    if (!at || !rt || !ea || !aid) {
      setStatus("error");
      return;
    }

    saveStravaTokens({
      access_token: at,
      refresh_token: rt,
      expires_at: parseInt(ea),
      athlete_id: parseInt(aid),
      athlete_name: name,
    })
      .then(() => router.replace("/settings?strava=connected"))
      .catch(() => setStatus("error"));
  }, [params, router]);

  if (status === "error") {
    return (
      <div className="text-center space-y-2">
        <p className="font-semibold text-destructive">Strava connection failed</p>
        <button
          className="text-sm text-muted-foreground underline"
          onClick={() => router.replace("/settings")}
        >
          Back to settings
        </button>
      </div>
    );
  }

  return (
    <div className="text-center text-muted-foreground text-sm">
      Connecting Strava…
    </div>
  );
}

export default function StravaConnectPage() {
  return (
    <Suspense fallback={<div className="text-center text-muted-foreground text-sm">Connecting Strava…</div>}>
      <StravaConnectInner />
    </Suspense>
  );
}
