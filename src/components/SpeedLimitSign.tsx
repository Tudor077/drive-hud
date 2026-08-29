import React from 'react';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

import type { Theme } from '../theme';
import { FONT } from '../typography';

/**
 * The round posted-limit sign: a ring around a number, so it reads as a limit
 * rather than as another figure on the screen.
 *
 * The real sign has a white face, which a HUD cannot use — white is a lit disc
 * bounced off the windshield straight back at the driver. The face stays empty
 * and the ring carries the meaning instead.
 */
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

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={46} stroke={colour} strokeWidth={3} strokeOpacity={0.3} fill="none" />
      <Circle cx={50} cy={50} r={38} stroke={colour} strokeWidth={9} fill="none" />
      <SvgText
        x={50}
        y={65}
        fontSize={42}
        fontFamily={FONT.display}
        textAnchor="middle"
        fill="none"
        stroke={colour}
        strokeWidth={2.6}
        strokeLinejoin="round">
        {String(limitKmh)}
      </SvgText>
    </Svg>
  );
}
