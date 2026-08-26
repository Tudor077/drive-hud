import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Instruction } from '../nav/parseInstruction';
import { theme } from '../theme';
import { SpeedUnit, distanceLabel } from '../units';
import { ManeuverArrow } from './ManeuverArrow';

export function NavStrip({
  instruction,
  color,
  unit,
  compact,
}: {
  instruction: Instruction;
  color: string;
  unit: SpeedUnit;
  compact: boolean;
}) {
  const distance =
    instruction.distanceM != null
      ? distanceLabel(instruction.distanceM, unit)
      : instruction.distanceText;

  return (
    <View style={styles.wrap}>
      <ManeuverArrow maneuver={instruction.maneuver} size={compact ? 46 : 64} color={color} />
      <View style={styles.text}>
        {distance ? (
          <Text
            allowFontScaling={false}
            style={[styles.distance, { color, fontSize: compact ? 26 : 34 }]}>
            {distance}
          </Text>
        ) : null}
        {instruction.street ? (
          <Text allowFontScaling={false} numberOfLines={1} style={styles.street}>
            {instruction.street}
          </Text>
        ) : null}
      </View>
      <Text allowFontScaling={false} style={styles.source}>
        {instruction.source}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  text: { flex: 1, minWidth: 0 },
  distance: { fontWeight: '900', fontVariant: ['tabular-nums'] },
  street: { color: theme.text, fontSize: 15, fontWeight: '600' },
  source: { color: theme.dim, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
});
