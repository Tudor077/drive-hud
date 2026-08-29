import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { Theme } from '../theme';

/**
 * The round posted-limit sign: a ring around a number, so it reads as a limit
 * rather than as another figure on the screen.
 *
 * The real sign has a white face, which a HUD cannot use — white is a lit
 * rectangle bounced off the windshield straight back at the driver. The face
 * stays empty and the ring carries the meaning instead.
 */
export function SpeedLimitSign({
  limitKmh,
  over,
  size,
  theme,
}: {
  limitKmh: number;
  /** Driving above it: the sign fills in, the way a warning would. */
  over: boolean;
  size: number;
  theme: Theme;
}) {
  // Over the limit the whole sign switches to the alert colour, which is
  // deliberately not the tint: at night the display is already red.
  const colour = over ? theme.alert : theme.tint;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx={50} cy={50} r={45} stroke={colour} strokeWidth={4} strokeOpacity={0.35} fill="none" />
        <Circle cx={50} cy={50} r={37} stroke={colour} strokeWidth={11} fill="none" />
      </Svg>
      <Text
        allowFontScaling={false}
        style={[styles.value, { color: colour, fontSize: size * 0.38, lineHeight: size * 0.42 }]}>
        {limitKmh}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  value: {
    position: 'absolute',
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
});
