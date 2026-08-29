/**
 * Rajdhani, embedded at build time rather than loaded at runtime: the digits
 * are drawn as SVG, and react-native-svg asks the platform for a family by
 * name, so it has to be registered natively for the name to resolve.
 *
 * It is a squared-off display face built for instrument panels — even stroke
 * weight, open counters, and digits that stay distinct at a glance, which is
 * what an outlined number needs. The platform default at weight 900 fell back
 * to whatever each device felt like and looked it.
 */
export const FONT = {
  /** Numbers and anything read at speed. */
  display: 'Rajdhani_700Bold',
  /** Labels and secondary text. */
  label: 'Rajdhani_600SemiBold',
} as const;

/**
 * Rajdhani's digits are narrower than the system default, so the box an
 * outlined number needs is narrower too.
 */
export const DIGIT_ASPECT = 0.52;
