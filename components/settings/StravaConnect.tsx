"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { clearStravaTokens } from "@/lib/db/repository";
import { stravaAuthUrl } from "@/lib/strava/client";
import type { UserRecord } from "@/lib/db/dexie";

interface StravaConnectProps {
  user: UserRecord;
}

function StravaConnectInner({ user }: StravaConnectProps) {
  const [isPending, setIsPending] = useState(false);
  const searchParams = useSearchParams();
  const stravaStatus = searchParams.get("strava");

  const isConnected = !!user.stravaAccessToken;
  const clientIdSet = !!process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;

  async function handleDisconnect() {
    setIsPending(true);
    try {
      await clearStravaTokens();
    } finally {
      setIsPending(false);
    }
  }

  function handleConnect() {
    const url = stravaAuthUrl();
    if (url) window.location.href = url;
  }

  if (!clientIdSet) {
    return (
      <p className="text-sm text-muted-foreground">
        Add <code className="bg-muted px-1 rounded text-xs">NEXT_PUBLIC_STRAVA_CLIENT_ID</code> and{" "}
        <code className="bg-muted px-1 rounded text-xs">STRAVA_CLIENT_SECRET</code> to your Vercel
        environment variables to enable Strava integration.
      </p>
    );
  }

  if (isConnected) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
          <span className="text-sm font-medium">
            Connected{user.stravaAthleteName ? ` as ${user.stravaAthleteName}` : ""}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          disabled={isPending}
        >
          {isPending ? "Disconnecting…" : "Disconnect Strava"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {stravaStatus === "error" && (
        <p className="text-sm text-destructive">Connection failed — please try again.</p>
      )}
      <Button onClick={handleConnect} className="bg-[#FC4C02] hover:bg-[#e04400] text-white gap-2">
        <StravaIcon />
        Connect with Strava
      </Button>
      <p className="text-xs text-muted-foreground">
        Allows opening Strava for GPS tracking and syncing your runs back to Runna.
      </p>
    </div>
  );
}

export function StravaConnect({ user }: StravaConnectProps) {
  return (
    <Suspense fallback={null}>
      <StravaConnectInner user={user} />
    </Suspense>
  );
}

function StravaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}
