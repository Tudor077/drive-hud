import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';

export function SpeedReadout({
  value,
  unit,
  color,
  warning,
  fontSize,
}: {
  value: number | null;
  unit: string;
  color: string;
  warning: boolean;
  fontSize: number;
}) {
  const display = value == null ? '--' : String(Math.round(value));
  const tone = warning ? theme.danger : color;

  return (
    <View style={styles.wrap}>
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={[
          styles.value,
          {
            color: tone,
            fontSize,
            // Digits are drawn tight so the number fills the mirror; the
            // negative letter spacing keeps three digits from crowding.
            lineHeight: fontSize * 1.02,
            letterSpacing: -fontSize * 0.04,
          },
        ]}>
        {display}
      </Text>
      <Text allowFontScaling={false} style={[styles.unit, { color: tone, fontSize: fontSize * 0.14 }]}>
        {unit.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  value: {
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    textAlign: 'center',
  },
  unit: {
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: -4,
  },
});
