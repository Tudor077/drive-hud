import { isLight, mix } from './color';

/**
 * The palette is derived from two chosen colours — a background and an ink —
 * rather than listed out. Everything else is a blend of those two, so a colour
 * the driver picks cannot leave part of the display unreadable.
 *
 * Night is red on black: red barely touches the eye's dark adaptation, so the
 * road outside stays as visible as it was, and a black ground is effectively
 * transparent in the windshield reflection.
 *
 * Day inverts that on purpose. In sunlight there is no useful reflection to
 * work with and the screen is read directly, where what wins is raw light and
 * contrast. Yellow is the brightest colour a phone can put out for the power it
 * spends: it carries 93% of white's luminance while lighting two subpixels
 * instead of three, so an OLED's brightness limiter throttles it less than it
 * throttles white. Black ink on it gives nearly the maximum contrast there is.
 */
export type ThemeMode = 'night' | 'day';

/** What the driver chooses. Everything else follows from these two. */
export type Palette = { bg: string; ink: string };

export const DEFAULT_PALETTES: Record<ThemeMode, Palette> = {
  night: { bg: '#000000', ink: '#FF2E2E' },
  day: { bg: '#FFFF00', ink: '#000000' },
};

export type Theme = {
  mode: ThemeMode;
  bg: string;
  /** The colour everything is drawn in. */
  tint: string;
  text: string;
  dim: string;
  border: string;
  surface: string;
  /** Over the limit, too hot, too low — set apart from the tint on purpose. */
  alert: string;
  /**
   * Whether the big figures are filled rather than hollow.
   *
   * Hollow is for a dark ground, where a solid figure would blot out the piece
   * of road behind it in the reflection. On a light ground the whole screen is
   * already a block of light, so there is nothing to see through and filled
   * figures simply read better.
   */
  solidFigures: boolean;
};

export function buildTheme(mode: ThemeMode, palette: Palette): Theme {
  const { bg, ink } = palette;

  return {
    mode,
    bg,
    tint: ink,
    text: ink,
    // Secondary text is the ink faded toward the background rather than a grey,
    // so it stays legible whatever the two colours are.
    dim: mix(ink, bg, 0.45),
    border: mix(ink, bg, 0.75),
    surface: mix(bg, ink, 0.07),
    // A warning has to differ from the ink, and the ink might be any colour, so
    // it is chosen against the background instead: amber reads on a dark
    // ground, a deep red on a light one.
    alert: isLight(bg) ? '#A80000' : '#FFC53B',
    solidFigures: isLight(bg),
  };
}
