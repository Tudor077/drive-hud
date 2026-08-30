import React from 'react';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

import type { Theme } from '../theme';
import { DIGIT_INK_BOTTOM, DIGIT_INK_TOP, FONT, digitInk } from '../typography';

/**
 * The round posted-limit sign: a ring around a number, so it reads as a limit
 * rather than as another figure on the screen.
 *
 * The real sign has a white face, which a HUD cannot use — white is a lit disc
 * bounced off the windshield straight back at the driver. The face stays empty
 * and the ring carries the meaning instead.
 */
const RING_RADIUS = 38;
const RING_WIDTH = 8;

/** Clear width inside the ring, in the 100-unit box, with a margin. */
const CLEAR_WIDTH = (RING_RADIUS - RING_WIDTH / 2) * 2 * 0.94;

export function SpeedLimitSign({
  limitKmh,
  over,
  size,
  theme,
}: {
  limitKmh: number;
  /** Driving above it: the sign switches to the alert colour. */
  over: boolean;
  size: number;
  theme: Theme;
}) {
  // Deliberately not the tint: at night the whole display is already red.
  const colour = over ? theme.alert : theme.tint;
  const figures = String(limitKmh);

  // Sized from the measured ink so a three-figure limit fits the ring instead
  // of running out through it.
  const inkWidth = figures.split('').reduce((total, digit) => total + digitInk(digit) + 0.05, 0);
  const fontSize = Math.min(34, CLEAR_WIDTH / inkWidth);
  const baseline =
    50 + (fontSize * (DIGIT_INK_TOP - DIGIT_INK_BOTTOM)) / 2 + fontSize * DIGIT_INK_BOTTOM;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={46} stroke={colour} strokeWidth={3} strokeOpacity={0.3} fill="none" />
      <Circle cx={50} cy={50} r={RING_RADIUS} stroke={colour} strokeWidth={RING_WIDTH} fill="none" />
      <SvgText
        x={50}
        y={baseline}
        fontSize={fontSize}
        fontFamily={FONT.display}
        textAnchor="middle"
        fill={theme.solidFigures ? colour : 'none'}
        stroke={colour}
        strokeWidth={fontSize * 0.055}
        strokeLinejoin="round">
        {figures}
      </SvgText>
    </Svg>
  );
}
