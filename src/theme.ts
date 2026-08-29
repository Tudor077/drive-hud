/**
 * Always black. A HUD is a mirror: the windshield reflects only what the screen
 * lights up, so black is effectively transparent and a light background would
 * throw a bright rectangle back at the driver. There is no light theme, at
 * night or in the day.
 *
 * What the mode changes is the colour of the light.
 *
 * Night is red, the same reason cockpits and chart tables are: red light barely
 * touches the eye's dark adaptation, so the road outside stays as visible as it
 * was. Day is turquoise, which holds up against sunlight far better than red
 * does and reads cleanly through a windshield reflection.
 */
export type ThemeMode = 'night' | 'day';

export type Theme = {
  mode: ThemeMode;
  bg: string;
  surface: string;
  border: string;
  text: string;
  dim: string;
  /** The colour everything is drawn in. */
  tint: string;
  /** Over the limit, too hot, too low — set apart from the tint on purpose. */
  alert: string;
};

export const THEMES: Record<ThemeMode, Theme> = {
  night: {
    mode: 'night',
    bg: '#000000',
    surface: '#140505',
    border: '#3A1414',
    text: '#FF7A7A',
    dim: '#8C3C3C',
    tint: '#FF2E2E',
    // Amber, because a red warning against a red display says nothing.
    alert: '#FFC53B',
  },
  day: {
    mode: 'day',
    bg: '#000000',
    surface: '#04100F',
    border: '#12423E',
    text: '#A6F4EC',
    dim: '#3F857E',
    tint: '#2FE6D6',
    alert: '#FF4438',
  },
};
