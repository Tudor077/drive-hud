/**
 * Fonts are embedded at build time rather than loaded at runtime: the numbers
 * are drawn as SVG, and react-native-svg asks the platform for a family by
 * name, so it has to be registered natively for the name to resolve.
 */
export const FONT = {
  /** Michroma for the big readouts: wide, geometric, counters that stay open
   *  when the glyph is stroked into a hollow one. */
  display: 'Michroma_400Regular',
  /** Small figures — rev counter, tiles — where a wide face would not fit. */
  numeric: 'Rajdhani_700Bold',
  /** Labels and secondary text. */
  label: 'Rajdhani_600SemiBold',
} as const;

/**
 * Michroma's digits, measured out of the font file rather than guessed.
 *
 * Two things came out of measuring. A digit advances up to 1.0 em but paints
 * only 0.665 to 0.875 of one, so the face carries a lot of its own side
 * bearing; and the digits are far from equal in width — "4" is a third wider
 * than "1".
 *
 * Laying them out in one tabular cell therefore meant sizing every cell for
 * "4", and every other digit floated in the difference. Giving each its own
 * cell makes {@link DIGIT_TRACKING} mean what it says: the gap between one
 * digit's ink and the next, with zero meaning they touch.
 *
 * The cost is that the number is no longer tabular, so it shifts a little as it
 * counts. {@link MIN_DIGIT_INK} keeps that in check by stopping the narrow "1"
 * from collapsing to its ink — Michroma draws it narrow precisely because it
 * expects to sit in a wide advance.
 */
export const DIGIT_INK: Record<string, number> = {
  '0': 0.826,
  '1': 0.665,
  '2': 0.812,
  '3': 0.822,
  '4': 0.875,
  '5': 0.802,
  '6': 0.822,
  '7': 0.844,
  '8': 0.822,
  '9': 0.822,
  '.': 0.22,
  ',': 0.22,
};

const MIN_DIGIT_INK = 0.79;

/** Ink from the baseline: top +0.7656, bottom -0.0156. */
export const DIGIT_INK_TOP = 0.7656;
export const DIGIT_INK_BOTTOM = -0.0156;

export function digitInk(character: string): number {
  const ink = DIGIT_INK[character];
  if (ink == null) return MIN_DIGIT_INK;
  return character === '.' || character === ',' ? ink : Math.max(ink, MIN_DIGIT_INK);
}
