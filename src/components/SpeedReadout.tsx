import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Theme } from '../theme';
import { FONT } from '../typography';
import { OutlineNumber } from './OutlineNumber';

export function SpeedReadout({
  value,
  unit,
  color,
  fontSize,
  theme,
}: {
  value: number | null;
  unit: string;
  color: string;
  fontSize: number;
  theme: Theme;
}) {
  const display = value == null ? '--' : String(Math.round(value));

  return (
    <View style={styles.wrap}>
      <OutlineNumber value={display} fontSize={fontSize} color={color} />
      <Text
        allowFontScaling={false}
        style={[styles.unit, { color: theme.dim, fontSize: fontSize * 0.13 }]}>
        {unit.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  unit: { fontFamily: FONT.label, letterSpacing: 4, marginTop: -2 },
});
