/**
 * The road ahead, drawn as a still picture rather than an animation.
 *
 * Beyond {@link STRAIGHT_UNTIL_M} the road is straight: there is nothing to
 * show yet. Inside it the bend tightens as the turn approaches, so the shape on
 * screen is the shape of the road you are about to drive. Nothing moves — the
 * only thing that changes is how sharp the curve is, which changes as slowly as
 * the distance does.
 */
export const STRAIGHT_UNTIL_M = 600;

/**
 * Bend held back early rather than growing straight off the mark: an exponent
 * above 1 keeps the road visibly straight through most of the approach and puts
 * the tightening where it matters, in the last couple of hundred metres.
 */
const BEND_CURVE = 1.6;

export function bendProgress(distanceM: number | null): number {
  if (distanceM == null) return 0;
  const remaining = Math.max(0, Math.min(STRAIGHT_UNTIL_M, distanceM));
  return ((STRAIGHT_UNTIL_M - remaining) / STRAIGHT_UNTIL_M) ** BEND_CURVE;
}

export type Placement = {
  x: number;
  y: number;
  /** 1 at the driver's end of the road, shrinking toward the horizon. */
  scale: number;
  /** Rotation in degrees; 0 points straight up the screen. */
  angleDeg: number;
};

export type RoadGeometry = {
  width: number;
  height: number;
  horizonY: number;
  /** Sideways offset of the vanishing point. 0 is a straight road. */
  bendX: number;
  count: number;
};

/**
 * Places the chevrons along a quadratic curve from the bottom centre to the
 * vanishing point, each turned to lie along the road.
 *
 * The control point sits halfway up the centre line, which makes the vertical
 * position linear in t and the sideways offset quadratic: the road runs
 * straight ahead and then swings, the way a real bend opens up, instead of
 * leaning from the very first metre.
 */
export function chevronPlacements(geometry: RoadGeometry): Placement[] {
  const { width, height, horizonY, bendX, count } = geometry;
  const centreX = width / 2;
  const rise = horizonY - height;

  return Array.from({ length: count }, (_, index) => {
    // Nudged off both ends so no chevron sits on the bottom edge or vanishes
    // exactly into the horizon; the exponent crowds them toward the distance.
    const t = ((index + 0.35) / (count - 1 + 0.7)) ** 0.8;

    const x = centreX + t * t * bendX;
    const y = height + t * rise;

    // Tangent of the curve at t. dy is constant because y is linear in t.
    const dx = 2 * t * bendX;
    const angleDeg = (Math.atan2(dx, -rise) * 180) / Math.PI;

    return { x, y, scale: 1 - 0.8 * t, angleDeg };
  });
}
