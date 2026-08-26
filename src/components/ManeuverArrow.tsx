import React from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { Maneuver } from '../nav/parseInstruction';

/** Arrow bodies drawn in a 100×100 box, so they scale to any HUD size. */
const STRAIGHT = 'M50 8 L78 42 H62 V92 H38 V42 H22 Z';
const TURN_RIGHT =
  'M35 92 V55 C35 40 46 33 60 33 H70 V16 L96 45 L70 74 V57 H60 C55 57 53 60 53 66 V92 Z';
const UTURN =
  'M22 92 V48 C22 20 78 20 78 48 V64 H93 L70 92 L47 64 H62 V48 C62 37 38 37 38 48 V92 Z';
const PIN =
  'M50 8 C33 8 20 22 20 39 C20 64 50 94 50 94 C50 94 80 64 80 39 C80 22 67 8 50 8 Z';

type Shape = { path: string; rotate?: number; flip?: boolean };

const SHAPES: Record<Maneuver, Shape> = {
  straight: { path: STRAIGHT },
  left: { path: TURN_RIGHT, flip: true },
  right: { path: TURN_RIGHT },
  'slight-left': { path: STRAIGHT, rotate: -35 },
  'slight-right': { path: STRAIGHT, rotate: 35 },
  'sharp-left': { path: TURN_RIGHT, flip: true, rotate: -30 },
  'sharp-right': { path: TURN_RIGHT, rotate: 30 },
  uturn: { path: UTURN },
  merge: { path: STRAIGHT, rotate: 25 },
  exit: { path: TURN_RIGHT, rotate: 20 },
  roundabout: { path: TURN_RIGHT },
  arrive: { path: PIN },
  unknown: { path: STRAIGHT },
};

export function ManeuverArrow({
  maneuver,
  size,
  color,
}: {
  maneuver: Maneuver;
  size: number;
  color: string;
}) {
  const shape = SHAPES[maneuver] ?? SHAPES.unknown;
  const transforms = [
    shape.flip ? 'translate(100 0) scale(-1 1)' : null,
    shape.rotate ? `rotate(${shape.rotate} 50 50)` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G transform={transforms || undefined}>
        {maneuver === 'roundabout' ? (
          <Circle cx={44} cy={56} r={26} stroke={color} strokeWidth={11} fill="none" />
        ) : null}
        <Path d={shape.path} fill={color} />
      </G>
      {maneuver === 'arrive' ? <Circle cx={50} cy={39} r={12} fill="#000" /> : null}
    </Svg>
  );
}
