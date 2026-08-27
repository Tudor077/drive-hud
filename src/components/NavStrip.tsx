import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Instruction, proximityFromDistance } from '../nav/parseInstruction';
import { theme } from '../theme';
import { SpeedUnit, distanceLabel } from '../units';
import { ChevronCorridor } from './ChevronCorridor';

const LANE_LABEL = {
  left: 'KEEP LEFT',
  center: 'MIDDLE LANE',
  right: 'KEEP RIGHT',
} as const;

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

  const width = compact ? 84 : 108;
  const height = compact ? 92 : 120;

  return (
    <View style={styles.wrap}>
      <ChevronCorridor
        maneuver={instruction.maneuver}
        width={width}
        height={height}
        color={color}
        proximity={proximityFromDistance(instruction.distanceM)}
      />
      <View style={styles.text}>
        {distance ? (
          <Text
            allowFontScaling={false}
            style={[styles.distance, { color, fontSize: compact ? 30 : 40 }]}>
            {distance}
          </Text>
        ) : null}
        {instruction.street ? (
          <Text allowFontScaling={false} numberOfLines={1} style={styles.street}>
            {instruction.street}
          </Text>
        ) : null}
        {instruction.lane ? (
          <Text allowFontScaling={false} style={[styles.lane, { color }]}>
            {LANE_LABEL[instruction.lane]}
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
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  text: { flex: 1, minWidth: 0 },
  distance: { fontWeight: '900', fontVariant: ['tabular-nums'] },
  street: { color: theme.text, fontSize: 15, fontWeight: '600' },
  lane: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6, marginTop: 2 },
  source: { color: theme.dim, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
});
