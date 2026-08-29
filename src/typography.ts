/**
 * Fonts are embedded at build time rather than loaded at runtime: the numbers
 * are drawn as SVG, and react-native-svg asks the platform for a family by
 * name, so it has to be registered natively for the name to resolve.
 */
export const FONT = {
  /**
   * Bungee Outline for the big readouts. It is drawn as an outline rather than
   * being a solid face with a stroke laid over it, which is the difference
   * between hollow letterforms and thickened ones: stroking a solid glyph
   * fattens every stem and squeezes the counters shut, and the bigger the
   * number the worse it gets. Here the ring is the letter.
   */
  display: 'BungeeOutline_400Regular',
  /** Small figures — rev counter, tiles — where a hollow face would close up. */
  numeric: 'Rajdhani_700Bold',
  /** Labels and secondary text. */
  label: 'Rajdhani_600SemiBold',
} as const;
