import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Instruction } from '../nav/parseInstruction';
import { useApproach } from '../nav/useApproach';
import { theme } from '../theme';
import { SpeedUnit, distanceLabel } from '../units';
import { ChevronCorridor } from './ChevronCorridor';

const LANE_LABEL = {
  left: 'KEEP LEFT',
  center: 'MIDDLE LANE',
  right: 'KEEP RIGHT',
} as const;

export function NavPanel({
  instruction,
  color,
  unit,
  speedMs,
  width,
  height,
}: {
  instruction: Instruction;
  color: string;
  unit: SpeedUnit;
  /** Road speed, used to carry the approach forward between notifications. */
  speedMs: number | null;
  width: number;
  height: number;
}) {
  const distance = useApproach(instruction.distanceM, speedMs);
  const label =
    instruction.distanceM != null
      ? distanceLabel(instruction.distanceM, unit)
      : instruction.distanceText;

  const compact = height < 190;

  return (
    <View style={[styles.wrap, { width }]}>
      <ChevronCorridor
        maneuver={instruction.maneuver}
        width={width - 20}
        height={height - (compact ? 54 : 72)}
        color={color}
        speedMs={speedMs}
        distance={distance}
      />
      <View style={styles.text}>
        {label ? (
          <Text
            allowFontScaling={false}
            style={[styles.distance, { color, fontSize: compact ? 28 : 38 }]}>
            {label}
          </Text>
        ) : null}
        {instruction.street ? (
          <Text allowFontScaling={false} numberOfLines={1} style={styles.street}>
            {instruction.street}
          </Text>
        ) : null}
        <View style={styles.meta}>
          {instruction.lane ? (
            <Text allowFontScaling={false} style={[styles.lane, { color }]}>
              {LANE_LABEL[instruction.lane]}
            </Text>
          ) : null}
          <Text allowFontScaling={false} style={styles.source}>
            {instruction.source}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  text: { alignSelf: 'stretch', alignItems: 'center' },
  distance: { fontWeight: '900', fontVariant: ['tabular-nums'] },
  street: { color: theme.text, fontSize: 14, fontWeight: '600' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 3 },
  lane: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  source: { color: theme.dim, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
});
