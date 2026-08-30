import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { isLight } from '../color';

/**
 * A grid of swatches rather than a hue wheel: picking a colour on a phone
 * mounted in a car is a thing done once, roughly, and a dozen good options
 * chosen for a head-up display beat a million bad ones.
 *
 * The spread runs from the blacks a night display needs to the high-luminance
 * yellows and greens that hold up in sunlight.
 */
export const SWATCHES = [
  '#000000',
  '#0C0C0C',
  '#1A1A1A',
  '#3A3A3A',
  '#8A8A8A',
  '#FFFFFF',
  '#FFFF00',
  '#EAFF00',
  '#C6FF00',
  '#7CFF00',
  '#00FF66',
  '#00FFC8',
  '#00E5FF',
  '#3BA0FF',
  '#B980FF',
  '#FF6BD6',
  '#FF2E2E',
  '#FF0055',
  '#FF6A00',
  '#FFB000',
  '#FFC53B',
  '#3BE8B0',
  '#8B0000',
  '#003B2E',
] as const;

export function ColorGrid({
  value,
  onChange,
  borderColor,
}: {
  value: string;
  onChange: (color: string) => void;
  borderColor: string;
}) {
  return (
    <View style={styles.grid}>
      {SWATCHES.map((swatch) => {
        const selected = swatch.toUpperCase() === value.toUpperCase();
        return (
          <Pressable
            key={swatch}
            onPress={() => onChange(swatch)}
            accessibilityLabel={swatch}
            style={[
              styles.swatch,
              { backgroundColor: swatch, borderColor },
              // The tick has to be visible on the swatch it sits on, so it
              // flips with the swatch's own lightness.
              selected ? { borderWidth: 3, borderColor: isLight(swatch) ? '#000' : '#FFF' } : null,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: 34, height: 34, borderRadius: 8, borderWidth: 1 },
});
