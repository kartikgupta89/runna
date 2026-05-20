export interface GpsPoint {
  lat: number;
  lng: number;
  ts: number; // Unix timestamp ms
  accuracy?: number;
}

/** Straight-line distance between two GPS points in metres (Haversine formula). */
export function haversineMeters(a: GpsPoint, b: GpsPoint): number {
  const R = 6_371_000;
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** Total GPS-track distance in metres. */
export function totalDistanceMeters(points: GpsPoint[]): number {
  let dist = 0;
  for (let i = 1; i < points.length; i++) {
    dist += haversineMeters(points[i - 1], points[i]);
  }
  return dist;
}

/**
 * Rolling-window pace (sec/km) from the last `windowSec` seconds of the track.
 * Returns null when there isn't enough data yet.
 */
export function rollingPaceSecPerKm(
  points: GpsPoint[],
  windowSec = 30,
): number | null {
  if (points.length < 2) return null;
  const cutoff = points[points.length - 1].ts - windowSec * 1_000;
  const window = points.filter((p) => p.ts >= cutoff);
  if (window.length < 2) return null;
  let dist = 0;
  for (let i = 1; i < window.length; i++) {
    dist += haversineMeters(window[i - 1], window[i]);
  }
  if (dist < 10) return null; // not enough movement to estimate pace
  const elapsed = (window[window.length - 1].ts - window[0].ts) / 1_000;
  return elapsed / (dist / 1_000);
}
