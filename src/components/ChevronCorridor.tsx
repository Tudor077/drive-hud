import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { Maneuver } from '../nav/parseInstruction';
import {
  SAMPLE_DISTANCES,
  SIGN_DRIFTS,
  SIGN_DROPS,
  SIGN_OPACITIES,
  SIGN_SCALES,
  boardDirection,
  hasBoard,
} from '../nav/projection';
import { RoadSign } from './RoadSign';

/**
 * A short stretch of road seen in perspective: chevrons — arrow heads with no
 * shaft — rise out of the vanishing point and sweep toward you, growing and
 * brightening as they come, so the flow itself shows where the road goes rather
 * than an icon describing it.
 *
 * Closing on the turn drives three things at once: the chevrons swell, they run
 * further down the screen — nearer the driver — and the whole stream speeds up.
 * The corridor also leans toward the side the road bends.
 *
 * It is deliberately not tied to a lane. A phone cannot know its lane: GNSS is
 * accurate to a few metres, a lane is 3.5 m wide, and no navigation
 * notification carries a lane number.
 */
const CHEVRON_COUNT = 5;

/** One chevron pointing up, in a 100×60 box. */
const CHEVRON = 'M12 48 L50 15 L88 48';

const PIN =
  'M50 12 C34 12 22 25 22 40 C22 61 50 88 50 88 C50 88 78 61 78 40 C78 25 66 12 50 12 Z';

/** How far a chevron has swung into the turn by the time it reaches you. */
const ANGLE: Record<Maneuver, number> = {
  straight: 0,
  'slight-left': -22,
  'slight-right': 22,
  left: -68,
  right: 68,
  'sharp-left': -92,
  'sharp-right': 92,
  uturn: -110,
  merge: 20,
  exit: 34,
  roundabout: 55,
  arrive: 0,
  unknown: 0,
};

/** Which way the road bends. U-turns go left where traffic drives on the right. */
const TURN_SIGN: Record<Maneuver, number> = {
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

/**
 * Sampling points for the perspective. Position and size follow depth ≈ q^1.7,
 * which bunches the far chevrons up near the vanishing point the way real
 * road markings crowd together in the distance. Animated interpolation is
 * piecewise linear, so the curve is sampled rather than computed.
 */
const STOPS = [0, 0.25, 0.5, 0.75, 1];
const DEPTH = [0, 0.095, 0.308, 0.613, 1];

/** Travel time from the vanishing point to the windscreen, far to near. */
const PERIODS = [2100, 1450, 900];

function flowStep(proximity: number): number {
  if (proximity > 0.75) return 2;
  if (proximity > 0.35) return 1;
  return 0;
}

export function ChevronCorridor({
  maneuver,
  width,
  height,
  color,
  proximity = 0.3,
  distance,
}: {
  maneuver: Maneuver;
  width: number;
  height: number;
  color: string;
  proximity?: number;
  /** Metres to the manoeuvre, falling continuously. Drives the warning board. */
  distance?: Animated.Value;
}) {
  const isArrival = maneuver === 'arrive';
  const step = flowStep(proximity);

  const flows = useRef(
    Array.from({ length: CHEVRON_COUNT }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (isArrival) return;
    const period = PERIODS[step];
    const loops = flows.map((value) =>
      Animated.loop(
        Animated.timing(value, {
          toValue: 1,
          duration: period,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      )
    );

    // Each loop runs at the same period; staggering only the first start is
    // what spaces them evenly down the road, and that phase then holds.
    const timers = loops.map((loop, index) =>
      setTimeout(() => {
        flows[index].setValue(0);
        loop.start();
      }, (index * period) / CHEVRON_COUNT)
    );

    return () => {
      timers.forEach(clearTimeout);
      loops.forEach((loop) => loop.stop());
      flows.forEach((value) => value.setValue(0));
    };
  }, [step, flows, isArrival]);

  const geometry = useMemo(() => {
    // The far end swings toward the turn, so the road visibly bends where the
    // route bends. The near end stays centred on the driver.
    const vanishX = width / 2 + width * 0.22 * TURN_SIGN[maneuver] * proximity;
    const nearX = width / 2;
    const chevronWidth = width * 0.52;
    const chevronHeight = chevronWidth * 0.6;
    const topY = height * 0.06;

    // Both of these grow with proximity: the nearest chevron gets bigger, and
    // the stream runs further down the screen. That is what makes an
    // approaching turn feel like something coming at you rather than a symbol
    // changing state.
    const nearScale = 0.82 + proximity * 0.78;
    const travel = height * (0.74 + proximity * 0.18);

    return {
      vanishX,
      chevronWidth,
      x: DEPTH.map((d) => vanishX + (nearX - vanishX) * d - width / 2),
      y: DEPTH.map((d) => topY + travel * d - chevronHeight / 2),
      scale: DEPTH.map((d) => 0.24 + d * (nearScale - 0.24)),
      rotate: DEPTH.map((d) => `${ANGLE[maneuver] * proximity * d}deg`),
    };
  }, [width, height, maneuver, proximity]);

  return (
    <View style={[styles.wrap, { width, height }]}>
      {!isArrival ? (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          {/* Road edges converging on the vanishing point sell the depth that
              the chevrons alone only imply. */}
          <Line
            x1={width * 0.04}
            y1={height}
            x2={geometry.vanishX}
            y2={height * 0.06}
            stroke={color}
            strokeWidth={2}
            strokeOpacity={0.16}
          />
          <Line
            x1={width * 0.96}
            y1={height}
            x2={geometry.vanishX}
            y2={height * 0.06}
            stroke={color}
            strokeWidth={2}
            strokeOpacity={0.16}
          />
        </Svg>
      ) : null}

      {distance && hasBoard(maneuver) ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.board,
            { top: height * HORIZON },
            {
              opacity: interpolateDistance(distance, SIGN_OPACITIES),
              transform: [
                {
                  translateX: interpolateDistance(
                    distance,
                    SIGN_DRIFTS.map((d) => d * width * 0.34 * boardDirection(maneuver))
                  ),
                },
                {
                  translateY: interpolateDistance(
                    distance,
                    SIGN_DROPS.map((d) => d * height * 0.34)
                  ),
                },
                { scale: interpolateDistance(distance, SIGN_SCALES) },
              ],
            },
          ]}>
          <RoadSign
            width={width * 0.46}
            color={color}
            direction={boardDirection(maneuver)}
          />
        </Animated.View>
      ) : null}

      {isArrival ? (
        <View style={styles.centered}>
          <Hologram path={PIN} width={width * 0.6} viewBox="0 0 100 100" color={color} />
        </View>
      ) : (
        flows.map((value, index) => (
          <Animated.View
            key={index}
            pointerEvents="none"
            style={[
              styles.chevron,
              {
                opacity: value.interpolate({
                  inputRange: [0, 0.12, 0.55, 0.86, 1],
                  outputRange: [0, 0.85, 1, 0.62, 0],
                }),
                transform: [
                  { translateY: value.interpolate({ inputRange: STOPS, outputRange: geometry.y }) },
                  { translateX: value.interpolate({ inputRange: STOPS, outputRange: geometry.x }) },
                  { scale: value.interpolate({ inputRange: STOPS, outputRange: geometry.scale }) },
                  {
                    rotate: value.interpolate({
                      inputRange: STOPS,
                      outputRange: geometry.rotate,
                    }),
                  },
                ],
              },
            ]}>
            <Hologram
              path={CHEVRON}
              width={geometry.chevronWidth}
              viewBox="0 0 100 60"
              color={color}
            />
          </Animated.View>
        ))
      )}
    </View>
  );
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

/** Where the road meets the sky, as a fraction of the panel height. */
const HORIZON = 0.26;

/**
 * Animated.interpolate needs an ascending input range, so the projection is
 * sampled over distances rather than evaluated: the value runs downward through
 * them as the car closes in.
 */
function interpolateDistance(distance: Animated.Value, outputRange: number[]) {
  return distance.interpolate({
    inputRange: SAMPLE_DISTANCES,
    outputRange,
    extrapolate: 'clamp',
  });
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  board: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  centered: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: { position: 'absolute', left: 0, right: 0, top: 0, alignItems: 'center' },
});
