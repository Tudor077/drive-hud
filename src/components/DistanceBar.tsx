import React from 'react';
import { StyleSheet, View } from 'react-native';

import { approachFraction } from '../nav/curve';

/**
 * A column showing how much road is left before the turn: it drains from the
 * top as you close in, so the amount of light left is the distance left.
 *
 * A bright cap rides the top of the fill, because on a windshield a plain block
 * of colour loses its edge in the reflection and the edge is the reading.
 */
const TRACK_WIDTH = 14;
const CAP_HEIGHT = 4;

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
  const fillHeight = Math.max(0, height * remaining);

  return (
    <View style={[styles.track, { height, borderColor: color }]}>
      <View style={[styles.fill, { height: fillHeight, backgroundColor: color, opacity: 0.55 }]}>
        {fillHeight > CAP_HEIGHT ? (
          <View style={[styles.cap, { backgroundColor: color }]} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    borderRadius: TRACK_WIDTH / 2,
    borderWidth: 1.5,
    opacity: 0.9,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  fill: { width: '100%', justifyContent: 'flex-start' },
  cap: { height: CAP_HEIGHT, width: '100%' },
});
