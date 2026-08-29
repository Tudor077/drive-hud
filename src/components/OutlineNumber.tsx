import React from 'react';
import Svg, { Text as SvgText } from 'react-native-svg';

/**
 * Hollow digits: stroked outline, no fill.
 *
 * On a windshield a solid number is a solid block of light, and the bigger it
 * is the more of the road it hides in the reflection. An outline puts the same
 * shape on the glass while leaving the middle of it transparent.
 *
 * React Native's own Text cannot stroke, so the digits are drawn as SVG.
 */
const DIGIT_WIDTH = 0.62;

export function OutlineNumber({
  value,
  fontSize,
  color,
  weight = 0.055,
}: {
  value: string;
  fontSize: number;
  color: string;
  /** Stroke width as a share of the font size. */
  weight?: number;
}) {
  const strokeWidth = fontSize * weight;
  const width = value.length * fontSize * DIGIT_WIDTH + strokeWidth * 2;
  const height = fontSize * 1.06 + strokeWidth * 2;

  return (
    <Svg width={width} height={height}>
      <SvgText
        x={width / 2}
        y={fontSize * 0.79 + strokeWidth}
        fontSize={fontSize}
        fontWeight="900"
        textAnchor="middle"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round">
        {value}
      </SvgText>
    </Svg>
  );
}
