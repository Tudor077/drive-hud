import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Text as SvgText } from 'react-native-svg';

import { FONT } from '../typography';

/**
 * Hollow digits: stroked outline, no fill.
 *
 * On a windshield a solid number is a solid block of light, and the bigger it
 * is the more of the road it hides in the reflection. An outline puts the same
 * shape on the glass while leaving the middle of it transparent.
 *
 * Each character gets its own fixed-width cell rather than being laid out as a
 * string. Two reasons: a stroked glyph is wider than the glyph itself, so
 * adjacent outlines collide at any weight worth reading at speed; and the width
 * of a run of text depends on which font actually resolved, which a guessed
 * multiplier gets wrong the moment a fallback steps in. Fixed cells also make
 * the digits tabular, so the number does not shuffle sideways as it changes.
 *
 * React Native's own Text cannot stroke, so the digits are drawn as SVG.
 */

/** Cell width as a share of the font size. Wide enough for any digit plus its stroke. */
const CELL = 0.66;

/** Narrower cell for a decimal point, which needs almost none. */
const DOT_CELL = 0.3;

const STROKE = 0.04;

export function OutlineNumber({
  value,
  fontSize,
  color,
}: {
  value: string;
  fontSize: number;
  color: string;
}) {
  const strokeWidth = fontSize * STROKE;
  const height = fontSize * 1.08 + strokeWidth * 2;
  const characters = value.split('');

  return (
    <View style={styles.row}>
      {characters.map((character, index) => {
        const width =
          (character === '.' || character === ',' ? DOT_CELL : CELL) * fontSize + strokeWidth;

        return (
          <Svg key={`${character}-${index}`} width={width} height={height}>
            <SvgText
              x={width / 2}
              y={fontSize * 0.78 + strokeWidth}
              fontSize={fontSize}
              fontFamily={FONT.display}
              textAnchor="middle"
              fill="none"
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
