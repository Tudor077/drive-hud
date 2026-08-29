import React from 'react';
import { StyleSheet, View } from 'react-native';

import { approachFraction } from '../nav/curve';

/**
 * A thin column showing how much road is left before the turn. It drains from
 * the top as you close in, so the amount of light left is the distance left.
 *
 * Deliberately quiet: it is there to be caught out of the corner of the eye
 * while the road and the speed are being read, not to compete with them.
 */
export function DistanceBar({
  distanceM,
  height,
  color,
}: {
  distanceM: number | null;
  height: number;
  color: string;
}) {
  const remaining = approachFraction(distanceM);

  return (
    <View style={[styles.track, { height, borderColor: color }]}>
      <View
        style={[
          styles.fill,
          { height: `${remaining * 100}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 6,
    borderRadius: 3,
    borderWidth: 1,
    opacity: 0.55,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  fill: { width: '100%', borderRadius: 3 },
});
