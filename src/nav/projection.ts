import type { Maneuver } from './parseInstruction';

/**
 * Where to draw a warning board that stands at the corner, as a function of how
 * far away it still is. The board is a fixed object in the world: it grows,
 * drifts to the roadside and drops toward the driver purely because the car is
 * closing on it, the way the real chevron boards on the outside of a bend do.
 *
 * True perspective is size ∝ 1/distance, which is unusable here: a 1.5 m board
 * 400 m off would be under a pixel tall. So the fall-off is compressed with an
 * exponent. It keeps the shape of real perspective — barely moving when far,
 * rushing at the end — while staying legible from the moment the turn is
 * announced. That is a deliberate design choice, not a physical camera.
 */

/** Distance at which the board is drawn at unit size. */
const REFERENCE_M = 25;

/** Below this the board is level with the driver and sweeping past. */
const NEAREST_M = 4;

/** 1 would be true perspective; less compresses the far end into view. */
const FALLOFF = 0.62;

/** The board fades up over this last stretch of its approach. */
const APPEAR_FROM_M = 500;
const APPEAR_OVER_M = 150;

/**
 * Scale at which the board is on top of the driver and fades out. The fade must
 * finish at or below the scale the NEAREST_M floor produces, or the board never
 * fully disappears and hangs in the driver's eyeline at low opacity.
 */
const PASSING_SCALE = 2.2;
const PASSING_FADE = 0.8;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** Apparent size, 1 at {@link REFERENCE_M} and growing without bound after. */
export function signScale(distanceM: number): number {
  return (REFERENCE_M / Math.max(distanceM, NEAREST_M)) ** FALLOFF;
}

/**
 * How far down the view the board has come, 0 at the horizon. It tracks scale
 * because both are the same projection: a nearer object is bigger *and* lower.
 */
export function signDrop(distanceM: number): number {
  return signScale(distanceM);
}

/** How far the board has swung toward the roadside as the car reaches it. */
export function signDrift(distanceM: number): number {
  return signScale(distanceM);
}

export function signOpacity(distanceM: number): number {
  const appearing = clamp01((APPEAR_FROM_M - distanceM) / APPEAR_OVER_M);
  const passing = clamp01((signScale(distanceM) - PASSING_SCALE) / PASSING_FADE);
  return appearing * (1 - passing);
}

/**
 * Distances sampled for Animated.interpolate, which is piecewise linear and
 * needs an ascending input range. Closely spaced near the driver, where the
 * projection changes fastest.
 */
export const SAMPLE_DISTANCES = [0, 4, 8, 14, 25, 40, 65, 110, 180, 300, 450, 700];

export const SIGN_SCALES = SAMPLE_DISTANCES.map(signScale);
export const SIGN_DROPS = SAMPLE_DISTANCES.map(signDrop);
export const SIGN_DRIFTS = SAMPLE_DISTANCES.map(signDrift);
export const SIGN_OPACITIES = SAMPLE_DISTANCES.map(signOpacity);

/** Boards stand on bends. A straight or an arrival has nothing to warn about. */
const BOARD_MANEUVERS = new Set<Maneuver>([
  'left',
  'right',
  'slight-left',
  'slight-right',
  'sharp-left',
  'sharp-right',
  'uturn',
  'roundabout',
  'exit',
]);

export function hasBoard(maneuver: Maneuver): boolean {
  return BOARD_MANEUVERS.has(maneuver);
}

/** Which way the chevrons on the board point, and which side it drifts to. */
export function boardDirection(maneuver: Maneuver): -1 | 1 {
  return maneuver.includes('left') || maneuver === 'uturn' ? -1 : 1;
}

/**
 * Road markings are objects in the same world as the board, so they use the
 * same projection. They sit a fixed distance apart along the road and are
 * carried toward the driver at road speed, which is what makes the flow match
 * the drive: at 72 km/h one passes every 1.2 seconds because that is how long
 * 24 m takes, not because a period was picked to look right.
 */
export const MARK_COUNT = 6;
export const MARK_RANGE_M = 120;
export const MARK_SPACING_M = MARK_RANGE_M / MARK_COUNT;

/** Markings fade in over the far end of their range rather than popping in. */
const MARK_APPEAR_OVER_M = 34;

export function markOpacity(distanceM: number): number {
  const appearing = clamp01((MARK_RANGE_M - distanceM) / MARK_APPEAR_OVER_M);
  const passing = clamp01((signScale(distanceM) - PASSING_SCALE) / PASSING_FADE);
  return appearing * (1 - passing);
}

/**
 * How far a marking has swung toward the outside of the bend. Unlike the board
 * this is not scaled by how near the turn is: which way the road goes has to
 * read at any distance, or left and right look identical until the last 400 m.
 */
export function markBend(distanceM: number): number {
  return clamp01(distanceM / MARK_RANGE_M);
}
