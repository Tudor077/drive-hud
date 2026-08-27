import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

/**
 * The chevron warning board that stands on the outside of a bend: a plate
 * carrying three arrow heads pointing the way the road goes. Drawn in the same
 * stacked-stroke hologram style as everything else, so it reads as projected
 * onto the road rather than pasted on the screen.
 */
const BOX_WIDTH = 120;
const BOX_HEIGHT = 64;

/** Three chevrons across the plate, pointing right; mirrored for a left bend. */
const CHEVRON_X = [30, 56, 82];

const LAYERS = [
  { width: 16, opacity: 0.1 },
  { width: 9, opacity: 0.24 },
  { width: 4, opacity: 1 },
];

export function RoadSign({
  width,
  color,
  direction,
}: {
  width: number;
  color: string;
  /** 1 for a right-hand bend, -1 for a left-hand one. */
  direction: -1 | 1;
}) {
  const height = (width * BOX_HEIGHT) / BOX_WIDTH;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${BOX_WIDTH} ${BOX_HEIGHT}`}>
      {LAYERS.map((layer) => (
        <Rect
          key={`plate-${layer.width}`}
          x={4}
          y={4}
          width={BOX_WIDTH - 8}
          height={BOX_HEIGHT - 8}
          rx={9}
          stroke={color}
          strokeWidth={layer.width * 0.55}
          strokeOpacity={layer.opacity * 0.8}
          fill="none"
        />
      ))}
      {CHEVRON_X.map((x) =>
        LAYERS.map((layer) => (
          <Path
            key={`${x}-${layer.width}`}
            d={`M ${x} 19 L ${x + 14} 32 L ${x} 45`}
            stroke={color}
            strokeWidth={layer.width}
            strokeOpacity={layer.opacity}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            transform={direction === -1 ? `translate(${BOX_WIDTH} 0) scale(-1 1)` : undefined}
          />
        ))
      )}
    </Svg>
  );
}
