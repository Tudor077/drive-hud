import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Theme } from '../theme';
import { FONT } from '../typography';

const SEGMENTS = 18;

/**
 * A segmented bar reads better than a needle at a glance, and lit segments on
 * black are exactly what reflects well off a windshield.
 */
export function RpmBar({
  rpm,
  redline,
  color,
  width,
  theme,
}: {
  rpm: number | null;
  redline: number;
  color: string;
  width: number;
  theme: Theme;
}) {
  const ratio = rpm == null ? 0 : Math.max(0, Math.min(1, rpm / redline));
  const lit = Math.round(ratio * SEGMENTS);

  return (
    <View style={[styles.wrap, { width }]}>
      <View style={styles.bar}>
        {Array.from({ length: SEGMENTS }, (_, index) => {
          const isRed = index >= SEGMENTS - 4;
          const on = index < lit;
          return (
            <View
              key={index}
              style={[
                styles.segment,
                {
                  backgroundColor: on ? (isRed ? theme.alert : color) : theme.border,
                  opacity: on ? 1 : 0.45,
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.labels}>
        <Text allowFontScaling={false} style={[styles.caption, { color: theme.dim }]}>
          RPM
        </Text>
        <Text allowFontScaling={false} style={[styles.value, { color }]}>
          {rpm == null ? '----' : Math.round(rpm)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  bar: { flexDirection: 'row', gap: 3, height: 16 },
  segment: { flex: 1, borderRadius: 2 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  caption: { fontSize: 13, fontFamily: FONT.label, letterSpacing: 2 },
  value: { fontSize: 22, fontFamily: FONT.numeric, fontVariant: ['tabular-nums'] },
});
