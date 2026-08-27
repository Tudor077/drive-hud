import React, { useMemo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import type { Maneuver } from '../nav/parseInstruction';
import {
  MARK_RANGE_M,
  SAMPLE_DISTANCES,
  SIGN_DRIFTS,
  SIGN_DROPS,
  SIGN_OPACITIES,
  SIGN_SCALES,
  boardDirection,
  hasBoard,
  markBend,
  markOpacity,
  signDrop,
  signScale,
} from '../nav/projection';
import { useRoadFlow } from '../nav/useRoadFlow';
import { RoadSign } from './RoadSign';

/**
 * A stretch of road in perspective. Everything in it is an object at a real
 * distance, projected by one shared camera: the markings on the road surface
 * and the warning board standing at the corner.
 *
 * The markings are carried toward the driver at road speed, so the flow matches
 * the drive rather than running at a chosen animation rate. The board is fixed
 * at the corner and grows because the car is closing on it.
 *
 * Which way the road bends is drawn at full strength no matter how far off the
 * turn is. Fading the direction in with proximity made left and right look
 * identical until the last few hundred metres, which is the one thing the
 * display must never be unclear about.
 */

/** One chevron pointing up, in a 100×60 box. */
const CHEVRON = 'M12 48 L50 15 L88 48';

const PIN =
  'M50 12 C34 12 22 25 22 40 C22 61 50 88 50 88 C50 88 78 61 78 40 C78 25 66 12 50 12 Z';

/** How far the road markings lean into the bend, at the far end of the view. */
const LEAN: Record<Maneuver, number> = {
  straight: 0,
  'slight-left': -14,
  'slight-right': 14,
  left: -34,
  right: 34,
  'sharp-left': -46,
  'sharp-right': 46,
  uturn: -52,
  merge: 12,
  exit: 20,
  roundabout: 28,
  arrive: 0,
  unknown: 0,
};

const BEND_SIGN: Record<Maneuver, number> = {
  straight: 0,
  'slight-left': -1,
  'slight-right': 1,
  left: -1,
  right: 1,
  'sharp-left': -1,
  'sharp-right': 1,
  uturn: -1,
  merge: 1,
  exit: 1,
  roundabout: 1,
  arrive: 0,
  unknown: 0,
};

/** Where the road meets the sky, as a fraction of the panel height. */
const HORIZON = 0.26;

/** The road surface sits below the board, so it drops away faster. */
const MARK_DROP = 0.42;
const SIGN_DROP = 0.3;

/** Samples of one marking's cycle, from the far end of the road to past you. */
const CYCLE_SAMPLES = Array.from({ length: 13 }, (_, index) => index / 12);

export function ChevronCorridor({
  maneuver,
  width,
  height,
  color,
  speedMs,
  distance,
}: {
  maneuver: Maneuver;
  width: number;
  height: number;
  color: string;
  /** Road speed in m/s. Sets how fast the markings come at you. */
  speedMs: number | null;
  /** Metres to the manoeuvre, falling continuously. Places the warning board. */
  distance?: Animated.Value;
}) {
  const isArrival = maneuver === 'arrive';
  const flow = useRoadFlow(isArrival ? 0 : speedMs);

  const road = useMemo(() => {
    const bend = width * 0.24 * BEND_SIGN[maneuver];
    const horizonY = height * HORIZON;
    const markWidth = width * 0.34;

    // A cycle value of 0 is a marking at the far end of the road, 1 is one that
    // has just swept past the driver. Everything below is that same distance
    // put through the shared projection.
    const distances = CYCLE_SAMPLES.map((cycle) => MARK_RANGE_M * (1 - cycle));

    return {
      markWidth,
      horizonY,
      vanishX: width / 2 + bend,
      x: distances.map((d) => bend * markBend(d)),
      y: distances.map((d) => signDrop(d) * height * MARK_DROP - (markWidth * 0.6) / 2),
      scale: distances.map((d) => signScale(d)),
      rotate: distances.map((d) => `${LEAN[maneuver] * markBend(d)}deg`),
      opacity: distances.map((d) => markOpacity(d)),
    };
  }, [width, height, maneuver]);

  return (
    <View style={[styles.wrap, { width, height }]}>
      {!isArrival ? (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Line
            x1={width * 0.02}
            y1={height}
            x2={road.vanishX}
            y2={road.horizonY}
            stroke={color}
            strokeWidth={2}
            strokeOpacity={0.16}
          />
          <Line
            x1={width * 0.98}
            y1={height}
            x2={road.vanishX}
            y2={road.horizonY}
            stroke={color}
            strokeWidth={2}
            strokeOpacity={0.16}
          />
        </Svg>
      ) : null}

      {isArrival ? (
        <View style={styles.centered}>
          <Hologram path={PIN} width={width * 0.5} viewBox="0 0 100 100" color={color} />
        </View>
      ) : (
        flow.map((cycle, index) => (
          <Animated.View
            key={index}
            pointerEvents="none"
            style={[
              styles.layer,
              { top: road.horizonY },
              {
                opacity: alongCycle(cycle, road.opacity),
                transform: [
                  { translateX: alongCycle(cycle, road.x) },
                  { translateY: alongCycle(cycle, road.y) },
                  { scale: alongCycle(cycle, road.scale) },
                  { rotate: alongCycle(cycle, road.rotate) },
                ],
              },
            ]}>
            <Hologram
              path={CHEVRON}
              width={road.markWidth}
              viewBox="0 0 100 60"
              color={color}
            />
          </Animated.View>
        ))
      )}

      {distance && hasBoard(maneuver) ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.layer,
            { top: road.horizonY },
            {
              opacity: byDistance(distance, SIGN_OPACITIES),
              transform: [
                {
                  translateX: byDistance(
                    distance,
                    SIGN_DRIFTS.map((d) => d * width * 0.34 * boardDirection(maneuver))
                  ),
                },
                { translateY: byDistance(distance, SIGN_DROPS.map((d) => d * height * SIGN_DROP)) },
                { scale: byDistance(distance, SIGN_SCALES) },
              ],
            },
          ]}>
          <RoadSign width={width * 0.46} color={color} direction={boardDirection(maneuver)} />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Maps a marking's 0 → 1 cycle onto values sampled along the road. */
function alongCycle(cycle: Animated.Value, outputRange: number[]): Animated.AnimatedInterpolation<number>;
function alongCycle(cycle: Animated.Value, outputRange: string[]): Animated.AnimatedInterpolation<string>;
function alongCycle(cycle: Animated.Value, outputRange: number[] | string[]) {
  return cycle.interpolate({
    inputRange: CYCLE_SAMPLES,
    outputRange: outputRange as number[],
    extrapolate: 'clamp',
  });
}

/**
 * Animated.interpolate needs an ascending input range, so the projection is
 * sampled over distances rather than evaluated: the value runs downward through
 * them as the car closes in.
 */
function byDistance(distance: Animated.Value, outputRange: number[]) {
  return distance.interpolate({
    inputRange: SAMPLE_DISTANCES,
    outputRange,
    extrapolate: 'clamp',
  });
}

/**
 * The hologram look: one stroke drawn three times, wide and faint through to
 * thin and bright. It reads as bloom around a lit core, and unlike an SVG blur
 * filter it renders identically on every device.
 */
function Hologram({
  path,
  width,
  viewBox,
  color,
}: {
  path: string;
  width: number;
  viewBox: string;
  color: string;
}) {
  const [, , boxWidth, boxHeight] = viewBox.split(' ').map(Number);

  return (
    <Svg width={width} height={(width * boxHeight) / boxWidth} viewBox={viewBox}>
      {[
        { width: 24, opacity: 0.12 },
        { width: 13, opacity: 0.28 },
        { width: 5.5, opacity: 1 },
      ].map((layer) => (
        <Path
          key={layer.width}
          d={path}
          stroke={color}
          strokeWidth={layer.width}
          strokeOpacity={layer.opacity}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  centered: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
