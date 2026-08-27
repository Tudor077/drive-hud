import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

import { MARK_COUNT, MARK_RANGE_M } from './projection';

/** Below this the road is treated as barely moving rather than frozen. */
const MIN_FLOW_MS = 1.5;

/**
 * Re-rate the flow only when speed has really changed. Restarting on every GPS
 * fix would mean a restart a second; 8% is far below what the eye can pick out
 * in the spacing of the markings.
 */
const RATE_CHANGE_RATIO = 0.08;

/**
 * One value per road marking, cycling 0 → 1 as the marking travels the length
 * of the visible road and passes the driver. The cycle time is the time the car
 * actually takes to cover that distance, so the flow is tied to road speed
 * rather than to a chosen animation period.
 *
 * Changing speed re-rates the flow without resetting it: each marking finishes
 * the cycle it is partway through at the new rate, so the spacing between them
 * survives every acceleration and every stop.
 */
export function useRoadFlow(speedMs: number | null): Animated.Value[] {
  const cycles = useRef(
    Array.from({ length: MARK_COUNT }, (_, index) => new Animated.Value(index / MARK_COUNT))
  ).current;
  const loops = useRef<(Animated.CompositeAnimation | null)[]>(
    Array.from({ length: MARK_COUNT }, () => null)
  ).current;
  const rate = useRef(0);
  /** Guards callbacks from a superseded rate change. */
  const generation = useRef(0);

  useEffect(() => {
    const speed = Math.max(speedMs ?? 0, MIN_FLOW_MS);
    const settled = rate.current > 0;
    if (settled && Math.abs(speed - rate.current) / rate.current < RATE_CHANGE_RATIO) {
      return;
    }

    rate.current = speed;
    generation.current += 1;
    const mine = generation.current;
    const cycleMs = (MARK_RANGE_M / speed) * 1000;

    cycles.forEach((value, index) => {
      loops[index]?.stop();
      loops[index] = null;

      value.stopAnimation((current) => {
        if (generation.current !== mine) return;

        const finish = Animated.timing(value, {
          toValue: 1,
          duration: Math.max(0, (1 - current) * cycleMs),
          easing: Easing.linear,
          useNativeDriver: true,
        });

        finish.start(({ finished }) => {
          if (!finished || generation.current !== mine) return;
          value.setValue(0);
          const loop = Animated.loop(
            Animated.timing(value, {
              toValue: 1,
              duration: cycleMs,
              easing: Easing.linear,
              useNativeDriver: true,
            })
          );
          loops[index] = loop;
          loop.start();
        });
      });
    });
  }, [speedMs, cycles, loops]);

  useEffect(
    () => () => {
      generation.current += 1;
      loops.forEach((loop) => loop?.stop());
    },
    [loops]
  );

  return cycles;
}
