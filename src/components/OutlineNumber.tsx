import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Text as SvgText } from 'react-native-svg';

import { FONT } from '../typography';

/**
 * Hollow digits, set in a face that is drawn as an outline rather than stroked
 * into one. On a windshield a solid number is a solid block of light, and the
 * bigger it is the more of the road it hides in the reflection.
 *
 * Each character gets its own fixed-width cell rather than being laid out as a
 * string, so nothing depends on knowing how wide a run of text will be in a
 * font that may not be the one that loads. It also makes the digits tabular:
 * the number does not shuffle sideways as it counts.
 *
 * React Native's own Text cannot do any of this, so the digits are drawn as SVG.
 */

/** Cell width as a share of the font size. Bungee is a wide face. */
const CELL = 0.88;

/** Narrower cell for a decimal point, which needs almost none. */
const DOT_CELL = 0.34;

/**
 * A touch of stroke on top of the outline. The face's own line is a hairline,
 * which goes spindly at the size a speed readout is drawn; this thickens the
 * ring evenly without closing anything, because the counters are the hollow
 * inside rather than the gaps in a stem.
 */
const WEIGHT = 0.014;

export function OutlineNumber({
  value,
  fontSize,
  color,
}: {
  value: string;
  fontSize: number;
  color: string;
}) {
  const strokeWidth = fontSize * WEIGHT;
  const height = fontSize * 1.12 + strokeWidth * 2;

  return (
    <View style={styles.row}>
      {value.split('').map((character, index) => {
        const isDot = character === '.' || character === ',';
        const width = (isDot ? DOT_CELL : CELL) * fontSize + strokeWidth;

        return (
          <Svg key={`${character}-${index}`} width={width} height={height}>
            <SvgText
              x={width / 2}
              y={fontSize * 0.82 + strokeWidth}
              fontSize={fontSize}
              fontFamily={FONT.display}
              textAnchor="middle"
              fill={color}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinejoin="round">
              {character}
            </SvgText>
          </Svg>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
