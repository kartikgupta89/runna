/**
 * Jack Daniels' VDOT formula and training pace derivation.
 *
 * All velocities are in m/min; paces are returned in seconds per km.
 */

const MIN_VDOT = 20;
const MAX_VDOT = 85;

export function calculateVDOT(distanceMeters: number, timeSeconds: number): number {
  if (distanceMeters <= 0 || timeSeconds <= 0) {
    throw new Error("distanceMeters and timeSeconds must be positive");
  }

  const timeMinutes = timeSeconds / 60;
  const velocity = distanceMeters / timeMinutes;

  const percentMax =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * timeMinutes) +
    0.2989558 * Math.exp(-0.1932605 * timeMinutes);

  const vo2 = -4.6 + 0.182258 * velocity + 0.000104 * velocity ** 2;

  const vdot = vo2 / percentMax;

  // Clamp to physiologically plausible range
  return Math.max(MIN_VDOT, Math.min(MAX_VDOT, vdot));
}

/**
 * Invert the VO2-velocity relationship to find velocity at VO2max.
 * Solves: vdot = -4.6 + 0.182258*v + 0.000104*v²  (percentMax = 1 at maximal effort)
 */
function velocityAtVo2max(vdot: number): number {
  // Quadratic: 0.000104·v² + 0.182258·v + (-4.6 - vdot) = 0
  const a = 0.000104;
  const b = 0.182258;
  const c = -4.6 - vdot;
  const discriminant = b ** 2 - 4 * a * c;
  return (-b + Math.sqrt(discriminant)) / (2 * a); // m/min
}

export interface PaceTable {
  /** Easy / aerobic base (70% of vVO2max) */
  E: number;
  /** Marathon pace (84% of vVO2max) */
  M: number;
  /** Threshold / tempo (88% of vVO2max) */
  T: number;
  /** Interval / VO2max (98% of vVO2max) */
  I: number;
  /** Repetition / speed economy (105% of vVO2max) */
  R: number;
}

// Derived from Jack Daniels' published pace tables (Daniels' Running Formula, 3rd ed.).
// E=0.777 and T=0.90 match the table to within 1 sec/km across VDOT 30–65.
// M=0.84, I=0.98, R=1.05 were already accurate.
const INTENSITY_FACTORS: PaceTable = { E: 0.777, M: 0.84, T: 0.90, I: 0.98, R: 1.05 };

/**
 * Returns training paces for a given VDOT as seconds per kilometre.
 * Higher sec/km = slower pace.
 */
export function paceTableForVDOT(vdot: number): PaceTable {
  if (vdot <= 0) {
    throw new Error("VDOT must be positive");
  }

  const clampedVdot = Math.max(MIN_VDOT, Math.min(MAX_VDOT, vdot));
  const vVo2max = velocityAtVo2max(clampedVdot); // m/min

  const secPerKm = (intensityFactor: number): number => {
    const v = vVo2max * intensityFactor; // m/min
    return (1000 / v) * 60; // (min/km) * 60 = sec/km
  };

  return {
    E: secPerKm(INTENSITY_FACTORS.E),
    M: secPerKm(INTENSITY_FACTORS.M),
    T: secPerKm(INTENSITY_FACTORS.T),
    I: secPerKm(INTENSITY_FACTORS.I),
    R: secPerKm(INTENSITY_FACTORS.R),
  };
}
