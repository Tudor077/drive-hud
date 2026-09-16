import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

/** Far enough that nothing is drawn; used when there is no manoeuvre to follow. */
const OFF_ROUTE_M = 700;

/**
 * Assume at least this closing speed. A board frozen at 300 m because the phone
 * briefly reported no speed looks broken; creeping forward does not.
 */
const MIN_CLOSING_MS = 2.5;

/** How often the reckoned distance is recomputed for the drawing that uses it. */
const TICK_MS = 500;

/**
 * The distance to the next manoeuvre, as a value that only ever falls.
 *
 * Navigation apps stop giving a figure in the last stretch — they switch to
 * "Now", or to the manoeuvre name alone — and they repost about once a second
 * in between. Treating a missing figure as "no manoeuvre" straightened the road
 * and dropped the warning board at the exact moment the turn arrived.
 *
 * So the figure is not read as state. A fresh one resnaps it; between them, and
 * after they stop, it is carried down by dead reckoning at the current road
 * speed. It only resets when the manoeuvre itself goes away.
 *
 * Returned twice over: an Animated.Value, so the board's projection runs on the
 * native driver, and a plain number for the road geometry, which is redrawn
 * rather than animated.
 */
export function useTurnDistance(
  active: boolean,
  distanceM: number | null,
  speedMs: number | null
): { metres: number | null; animated: Animated.Value } {
  const animated = useRef(new Animated.Value(OFF_ROUTE_M)).current;
  const [metres, setMetres] = useState<number | null>(null);

  /** Where the last real figure put us, and when. */
  const anchor = useRef<{ base: number; at: number } | null>(null);

  // Read at resnap time only: speed updates every second too, and restarting
  // the run on each one would throw away the reckoning done since.
  const speedRef = useRef(speedMs);
  speedRef.current = speedMs;

  useEffect(() => {
    if (active) return;
    anchor.current = null;
    animated.stopAnimation();
    animated.setValue(OFF_ROUTE_M);
    setMetres(null);
  }, [active, animated]);

  useEffect(() => {
    if (!active || distanceM == null) return;

    anchor.current = { base: distanceM, at: Date.now() };
    setMetres(distanceM);

    const closing = Math.max(speedRef.current ?? 0, MIN_CLOSING_MS);
    animated.stopAnimation();
    animated.setValue(distanceM);

    const run = Animated.timing(animated, {
      toValue: 0,
      duration: (distanceM / closing) * 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    run.start();

    return () => run.stop();
  }, [active, distanceM, animated]);

  useEffect(() => {
    if (!active) return;

    const tick = () => {
      const from = anchor.current;
      if (!from) return;
      const closing = Math.max(speedRef.current ?? 0, MIN_CLOSING_MS);
      const travelled = (closing * (Date.now() - from.at)) / 1000;
      const remaining = Math.max(0, from.base - travelled);
      // Only a whole metre is worth a redraw; the road is drawn, not animated.
      setMetres((current) => (current == null || Math.abs(current - remaining) >= 1 ? remaining : current));
    };

    const timer = setInterval(tick, TICK_MS);
    return () => clearInterval(timer);
  }, [active]);

  return { metres, animated };
}
