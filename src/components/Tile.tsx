import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Theme } from '../theme';

export function Tile({
  label,
  value,
  tone,
  theme,
}: {
  label: string;
  value: string;
  tone?: string;
  theme: Theme;
}) {
  return (
    <View
      style={[styles.tile, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <Text allowFontScaling={false} style={[styles.label, { color: theme.dim }]}>
        {label}
      </Text>
      <Text allowFontScaling={false} style={[styles.value, { color: tone ?? theme.text }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    minWidth: 84,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  value: {
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
