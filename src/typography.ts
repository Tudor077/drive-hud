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
 * Michroma's digits, measured from the font file rather than guessed.
 *
 * The gap between figures came from the difference between these two: a digit
 * advances up to 1.0 em but only paints 0.875 of one, so the face carries about
 * an eighth of an em of its own side bearing. Laying the glyphs out in cells
 * sized by the advance added that built-in space on top of the cell's own, and
 * the number came out airy.
 *
 * Centring each glyph in a cell sized from the *ink* drops the side bearings
 * entirely and leaves the spacing to be set here, deliberately.
 */
export const MICHROMA = {
  /** Widest inked digit, in ems. */
  inkWidth: 0.875,
  /** Ink from baseline: top +0.7656, bottom -0.0156. */
  inkTop: 0.7656,
  inkBottom: -0.0156,
  /** Advance of a full stop, which needs far less room than a digit. */
  dotWidth: 0.22,
} as const;
