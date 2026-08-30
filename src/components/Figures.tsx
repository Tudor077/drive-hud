import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Text as SvgText } from 'react-native-svg';

import {
  DIGIT_INK_BOTTOM,
  DIGIT_INK_TOP,
  DIGIT_STROKE,
  FONT,
  cellWidthEm,
} from '../typography';

/**
 * The big readouts, hollow or solid depending on the light.
 *
 * At night a solid number is a solid block of light, and the bigger it is the
 * more of the road it hides in the windshield reflection — so the figures are
 * drawn hollow and the road shows through them. In daylight that reflection is
 * fighting the sun rather than sitting on a dark road, and a hollow figure
 * loses: there the figures are filled, for every bit of brightness they can
 * put on the glass.
 *
 * Both are drawn with the same stroke so the metrics do not change between
 * them, and switching modes cannot reflow the layout.
 *
 * Each character is centred in a cell sized from its own measured ink, so the
 * tracking below is the whole of the spacing — at zero the digits touch. Laying
 * them out as a run of text instead would inherit the face's side bearings,
 * which are generous in a display font and looked it.
 *
 * React Native's own Text cannot stroke, so the digits are drawn as SVG.
 */

const WEIGHT = DIGIT_STROKE;

const INK_HEIGHT = DIGIT_INK_TOP - DIGIT_INK_BOTTOM;

export function Figures({
  value,
  fontSize,
  color,
  filled = false,
}: {
  value: string;
  fontSize: number;
  color: string;
  filled?: boolean;
}) {
  const stroke = fontSize * WEIGHT;

  // Tall enough for the ink plus its stroke, with the leftover split evenly
  // above and below so the figures sit centred in whatever row holds them.
  const inked = fontSize * (INK_HEIGHT + WEIGHT);
  const height = inked + fontSize * 0.05;
  const baseline = (height - inked) / 2 + fontSize * (DIGIT_INK_TOP + WEIGHT / 2);

  return (
    <View style={styles.row}>
      {value.split('').map((character, index) => {
        const width = fontSize * cellWidthEm(character);

        return (
          <Svg key={`${character}-${index}`} width={width} height={height}>
            <SvgText
              x={width / 2}
              y={baseline}
              fontSize={fontSize}
              fontFamily={FONT.display}
              textAnchor="middle"
              fill={filled ? color : 'none'}
              stroke={color}
              strokeWidth={stroke}
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
