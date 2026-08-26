/**
 * No standard OBD-II PID reports the selected gear — it simply is not on the
 * bus for most cars. What is on the bus is engine speed and road speed, and
 * their ratio is fixed for each gear by the gearbox and final drive. So the
 * gear can be recovered by learning those ratios while you drive.
 *
 * Ratios are stored as rpm per km/h: roughly 95 for first in a typical car,
 * down to about 17 for sixth.
 */
export type GearModel = {
  /** Learned rpm-per-km/h ratios, highest (lowest gear) first. */
  ratios: number[];
  samples: number;
};

export const EMPTY_GEAR_MODEL: GearModel = { ratios: [], samples: 0 };

/** Two ratios closer than this are the same gear seen twice. */
const SAME_GEAR_TOLERANCE = 0.09;
const MAX_GEARS = 8;

function isSteady(speedKmh: number, rpm: number): boolean {
  // Below these, the clutch is likely slipping or the torque converter is open,
  // and the ratio means nothing.
  return speedKmh >= 15 && rpm >= 900;
}

export function currentRatio(speedKmh: number, rpm: number): number | null {
  if (!isSteady(speedKmh, rpm)) return null;
  return rpm / speedKmh;
}

/**
 * Folds one reading into the model: matches an existing ratio and nudges it
 * toward the new sample, or records a new gear if there is room.
 */
export function learn(model: GearModel, speedKmh: number, rpm: number): GearModel {
  const ratio = currentRatio(speedKmh, rpm);
  if (ratio == null) return model;

  const index = model.ratios.findIndex(
    (known) => Math.abs(known - ratio) / known < SAME_GEAR_TOLERANCE
  );

  if (index >= 0) {
    const ratios = [...model.ratios];
    // A slow average keeps one noisy sample from dragging a learned gear away.
    ratios[index] = ratios[index] * 0.95 + ratio * 0.05;
    return { ratios, samples: model.samples + 1 };
  }

  if (model.ratios.length >= MAX_GEARS) return model;

  return {
    ratios: [...model.ratios, ratio].sort((a, b) => b - a),
    samples: model.samples + 1,
  };
}

/** Returns the 1-based gear number, or null when nothing matches confidently. */
export function estimateGear(model: GearModel, speedKmh: number, rpm: number): number | null {
  const ratio = currentRatio(speedKmh, rpm);
  if (ratio == null || model.ratios.length === 0) return null;

  let best = -1;
  let bestError = Infinity;
  model.ratios.forEach((known, index) => {
    const error = Math.abs(known - ratio) / known;
    if (error < bestError) {
      bestError = error;
      best = index;
    }
  });

  if (bestError > SAME_GEAR_TOLERANCE) return null;
  return best + 1;
}
