import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

/** Far enough that nothing is drawn; used when there is no route to follow. */
const OFF_ROUTE_M = 700;

/**
 * Assume at least this closing speed. A board frozen at 300 m because the phone
 * briefly reported no speed looks broken; creeping forward does not.
 */
const MIN_CLOSING_MS = 2.5;

/**
 * The distance to the next manoeuvre, as a continuously falling value.
 *
 * Navigation apps repost their notification roughly once a second, which on its
 * own would make an approaching sign jump in one-second steps. Between updates
 * the distance is carried forward by dead reckoning at the current road speed —
 * the same thing the navigation app is doing — and resnapped whenever a fresh
 * notification lands.
 *
 * Returned as an Animated.Value so the projection runs on the native driver
 * rather than re-rendering the HUD ten times a second.
 */
export function useApproach(
  distanceM: number | null,
  speedMs: number | null
): Animated.Value {
  const distance = useRef(new Animated.Value(OFF_ROUTE_M)).current;

  // Read at resnap time only: speed updates every second too, and restarting
  // the run on each one would throw away the dead reckoning done since.
  const speedRef = useRef(speedMs);
  speedRef.current = speedMs;

  useEffect(() => {
    if (distanceM == null) {
      distance.stopAnimation();
      distance.setValue(OFF_ROUTE_M);
      return;
    }

    const closing = Math.max(speedRef.current ?? 0, MIN_CLOSING_MS);
    distance.stopAnimation();
    distance.setValue(distanceM);

    const run = Animated.timing(distance, {
      toValue: 0,
      duration: (distanceM / closing) * 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    run.start();

    return () => run.stop();
  }, [distanceM, distance]);

  return distance;
}
