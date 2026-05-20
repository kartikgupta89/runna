import type { StravaTokens, StravaSummaryActivity } from "./types";
import { getUser, saveStravaTokens } from "@/lib/db/repository";

const STRAVA_API = "https://www.strava.com/api/v3";

export function stravaAuthUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
  if (!clientId) return "";
  const redirectUri = `${window.location.origin}/api/auth/strava/callback`;
  const scope = "activity:read_all,activity:write";
  return (
    `https://www.strava.com/oauth/authorize` +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&approval_prompt=auto` +
    `&scope=${scope}`
  );
}

async function refreshToken(refreshTokenStr: string): Promise<StravaTokens> {
  const res = await fetch("/api/strava/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshTokenStr }),
  });
  if (!res.ok) throw new Error("strava_refresh_failed");
  return res.json();
}

// Returns a valid access token, refreshing if needed.
export async function getValidAccessToken(): Promise<string | null> {
  const user = await getUser();
  if (!user?.stravaAccessToken || !user?.stravaRefreshToken) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if ((user.stravaTokenExpiresAt ?? 0) > nowSec + 60) {
    return user.stravaAccessToken;
  }

  // Token expired — refresh it
  try {
    const tokens = await refreshToken(user.stravaRefreshToken);
    await saveStravaTokens(tokens);
    return tokens.access_token;
  } catch {
    return null;
  }
}

export async function fetchStravaActivities(
  after: number,
  before: number,
): Promise<StravaSummaryActivity[]> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("strava_not_connected");

  const url = `${STRAVA_API}/athlete/activities?after=${after}&before=${before}&per_page=20`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new Error("strava_unauthorized");
  if (!res.ok) throw new Error("Failed to fetch Strava activities");
  return res.json();
}

// Decode Google Encoded Polyline → lat/lng array
export function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  let idx = 0;
  let lat = 0;
  let lng = 0;

  while (idx < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(idx++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(idx++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

// Push a completed workout to Strava as a manual activity (no GPS).
export async function createStravaActivity(params: {
  name: string;
  startDate: Date;
  elapsedSeconds: number;
  distanceMeters: number;
}): Promise<{ id: number }> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("strava_not_connected");

  const res = await fetch(`${STRAVA_API}/activities`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: params.name,
      sport_type: "Run",
      start_date_local: params.startDate.toISOString(),
      elapsed_time: params.elapsedSeconds,
      distance: params.distanceMeters,
    }),
  });
  if (!res.ok) throw new Error("Failed to create Strava activity");
  return res.json();
}
