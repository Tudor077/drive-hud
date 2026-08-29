import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Text as SvgText } from 'react-native-svg';

import { FONT, MICHROMA } from '../typography';

/**
 * Hollow digits. On a windshield a solid number is a solid block of light, and
 * the bigger it is the more of the road it hides in the reflection.
 *
 * Each character is centred in its own cell rather than laid out as a run of
 * text. That makes the digits tabular — the number does not shuffle sideways as
 * it counts — and it means the spacing is set here from the measured ink rather
 * than inherited from the face's own side bearings, which are generous in a
 * display font and looked it.
 *
 * React Native's own Text cannot stroke, so the digits are drawn as SVG.
 */

/** Stroke weight as a share of the font size. */
const WEIGHT = 0.032;

/** Air between one digit's ink and the next. The whole of the spacing. */
const TRACKING = 0.035;

const INK_HEIGHT = MICHROMA.inkTop - MICHROMA.inkBottom;

export function OutlineNumber({
  value,
  fontSize,
  color,
}: {
  value: string;
  fontSize: number;
  color: string;
}) {
  const stroke = fontSize * WEIGHT;

  // Tall enough for the ink plus its stroke, with the leftover split evenly
  // above and below so the figures sit centred in whatever row holds them.
  const height = fontSize * (INK_HEIGHT + WEIGHT) + fontSize * 0.05;
  const baseline =
    (height - fontSize * (INK_HEIGHT + WEIGHT)) / 2 + fontSize * (MICHROMA.inkTop + WEIGHT / 2);

  return (
    <View style={styles.row}>
      {value.split('').map((character, index) => {
        const isDot = character === '.' || character === ',';
        const ink = isDot ? MICHROMA.dotWidth : MICHROMA.inkWidth;
        const width = fontSize * (ink + WEIGHT + TRACKING);

        return (
          <Svg key={`${character}-${index}`} width={width} height={height}>
            <SvgText
              x={width / 2}
              y={baseline}
              fontSize={fontSize}
              fontFamily={FONT.display}
              textAnchor="middle"
              fill="none"
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
