import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { Theme } from '../theme';

/**
 * The round posted-limit sign, drawn the way it appears on the road so it is
 * recognised without being read. Its colours stay the sign's own in both
 * modes — a red ring is what makes it a speed limit rather than a number.
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
  const face = over ? theme.danger : theme.mode === 'day' ? '#FFFFFF' : '#F2F6FA';
  const ring = theme.danger;
  const ink = over ? '#FFFFFF' : '#101418';

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx={50} cy={50} r={46} fill={face} />
        <Circle cx={50} cy={50} r={38} stroke={ring} strokeWidth={15} fill="none" />
      </Svg>
      <Text
        allowFontScaling={false}
        style={[styles.value, { color: ink, fontSize: size * 0.4, lineHeight: size * 0.44 }]}>
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
