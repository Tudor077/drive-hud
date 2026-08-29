import React, { useMemo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { Maneuver } from '../nav/parseInstruction';
import { bendProgress, chevronPlacements } from '../nav/curve';
import {
  SAMPLE_DISTANCES,
  SIGN_DRIFTS,
  SIGN_DROPS,
  SIGN_OPACITIES,
  SIGN_SCALES,
  boardDirection,
  hasBoard,
} from '../nav/projection';
import type { Theme } from '../theme';
import { RoadSign } from './RoadSign';

/**
 * The road ahead, filling the screen. It is a still picture: chevrons sit along
 * a curve that is dead straight while the turn is far off and tightens as it
 * comes up, so what the driver sees is the shape of the road rather than a
 * moving animation to interpret.
 *
 * The one thing that does move is the warning board standing at the corner,
 * and only because the car is closing on it.
 */
const CHEVRON_COUNT = 7;

/** One chevron pointing up, in a 100×60 box. */
const CHEVRON = 'M12 48 L50 15 L88 48';

const PIN =
  'M50 12 C34 12 22 25 22 40 C22 61 50 88 50 88 C50 88 78 61 78 40 C78 25 66 12 50 12 Z';

const BEND_SIGN: Record<Maneuver, number> = {
  straight: 0,
  'slight-left': -0.6,
  'slight-right': 0.6,
  left: -1,
  right: 1,
  'sharp-left': -1.35,
  'sharp-right': 1.35,
  uturn: -1.6,
  merge: 0.5,
  exit: 0.8,
  roundabout: 1,
  arrive: 0,
  unknown: 0,
};

const HORIZON = 0.2;

/** How far the vanishing point can swing, as a share of the screen width. */
const MAX_BEND = 0.46;

export function RoadView({
  maneuver,
  distanceM,
  width,
  height,
  theme,
  tint,
  boardDistance,
}: {
  maneuver: Maneuver;
  distanceM: number | null;
  width: number;
  height: number;
  theme: Theme;
  tint: string;
  /** Metres to the turn, falling continuously, for the warning board. */
  boardDistance?: Animated.Value;
}) {
  const isArrival = maneuver === 'arrive';
  const horizonY = height * HORIZON;

  const road = useMemo(() => {
    const bendX = width * MAX_BEND * BEND_SIGN[maneuver] * bendProgress(distanceM);
    const centreX = width / 2;
    const rise = horizonY - height;

    // Edges swept along the same curve as the chevrons, narrowing into the
    // distance, so the whole thing reads as one road rather than a row of marks.
    const left: string[] = [];
    const right: string[] = [];
    for (let step = 0; step <= 24; step += 1) {
      const t = step / 24;
      const x = centreX + t * t * bendX;
      const y = height + t * rise;
      const halfWidth = width * 0.47 * (1 - 0.88 * t);
      left.push(`${x - halfWidth},${y}`);
      right.push(`${x + halfWidth},${y}`);
    }

    return {
      bendX,
      edges: [`M${left.join(' L')}`, `M${right.join(' L')}`],
      places: chevronPlacements({ width, height, horizonY, bendX, count: CHEVRON_COUNT }),
    };
  }, [width, height, horizonY, maneuver, distanceM]);

  const chevronWidth = width * 0.3;

  return (
    <View style={[styles.wrap, { width, height }]} pointerEvents="none">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {road.edges.map((edge) => (
          <Path
            key={edge.slice(0, 24)}
            d={edge}
            stroke={tint}
            strokeWidth={2}
            strokeOpacity={theme.mode === 'day' ? 0.26 : 0.16}
            fill="none"
          />
        ))}

        {isArrival ? (
          <Hologram
            path={PIN}
            width={width * 0.34}
            viewBox="0 0 100 100"
            color={tint}
            x={width / 2}
            y={height * 0.5}
            scale={1}
            angleDeg={0}
          />
        ) : (
          road.places.map((place, index) => (
            <Hologram
              key={index}
              path={CHEVRON}
              width={chevronWidth}
              viewBox="0 0 100 60"
              color={tint}
              x={place.x}
              y={place.y}
              scale={place.scale}
              angleDeg={place.angleDeg}
              // The nearest chevrons carry the message; the far ones are context.
              opacity={0.35 + 0.65 * place.scale}
            />
          ))
        )}
      </Svg>

      {boardDistance && hasBoard(maneuver) ? (
        <Animated.View
          style={[
            styles.board,
            { top: horizonY },
            {
              opacity: byDistance(boardDistance, SIGN_OPACITIES),
              transform: [
                {
                  translateX: byDistance(
                    boardDistance,
                    SIGN_DRIFTS.map((d) => d * width * 0.3 * boardDirection(maneuver))
                  ),
                },
                { translateY: byDistance(boardDistance, SIGN_DROPS.map((d) => d * height * 0.26)) },
                { scale: byDistance(boardDistance, SIGN_SCALES) },
              ],
            },
          ]}>
          <RoadSign width={width * 0.34} color={tint} direction={boardDirection(maneuver)} />
        </Animated.View>
      ) : null}
    </View>
  );
}

function byDistance(distance: Animated.Value, outputRange: number[]) {
  return distance.interpolate({
    inputRange: SAMPLE_DISTANCES,
    outputRange,
    extrapolate: 'clamp',
  });
}

/**
 * One stroke drawn three times, wide and faint through to thin and bright. It
 * reads as bloom around a lit core, and unlike an SVG blur filter it renders
 * identically on every device.
 */
function Hologram({
  path,
  width,
  viewBox,
  color,
  x,
  y,
  scale,
  angleDeg,
  opacity = 1,
}: {
  path: string;
  width: number;
  viewBox: string;
  color: string;
  x: number;
  y: number;
  scale: number;
  angleDeg: number;
  opacity?: number;
}) {
  const [, , boxWidth, boxHeight] = viewBox.split(' ').map(Number);
  const drawWidth = width * scale;
  const drawHeight = (drawWidth * boxHeight) / boxWidth;
  const unit = drawWidth / boxWidth;

  // Place by the centre of the shape, then turn it to lie along the road.
  const transform = `translate(${x} ${y}) rotate(${angleDeg}) translate(${-drawWidth / 2} ${-drawHeight / 2}) scale(${unit})`;

  return (
    <>
      {[
        { stroke: 24, alpha: 0.12 },
        { stroke: 13, alpha: 0.28 },
        { stroke: 5.5, alpha: 1 },
      ].map((layer) => (
        <Path
          key={layer.stroke}
          d={path}
          transform={transform}
          stroke={color}
          strokeWidth={layer.stroke}
          strokeOpacity={layer.alpha * opacity}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0 },
  board: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
