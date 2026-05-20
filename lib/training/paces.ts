const SEC_PER_KM_TO_MILE = 1.60934;

/**
 * Formats a pace in seconds per kilometre to "M:SS" string.
 * e.g. 330 → "5:30"
 */
export function formatPace(secPerKm: number): string {
  if (secPerKm <= 0) {
    throw new Error("secPerKm must be positive");
  }
  const totalSec = Math.round(secPerKm);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Returns a pace band around a target pace.
 */
export function paceRange(
  secPerKm: number,
  toleranceSec: number
): { min: number; max: number } {
  return {
    min: secPerKm - toleranceSec,
    max: secPerKm + toleranceSec,
  };
}

/**
 * Converts a pace in seconds per kilometre to seconds per mile.
 */
export function secPerKmToSecPerMile(secPerKm: number): number {
  return secPerKm * SEC_PER_KM_TO_MILE;
}
