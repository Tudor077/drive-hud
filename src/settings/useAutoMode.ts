import { LightSensor } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';

import { isDaylight } from '../sun';
import type { ThemeMode } from '../theme';

/**
 * Above this it is daylight, below it is night, and in between nothing changes.
 * The gap is what stops the display flickering under a line of trees.
 */
const DAY_LUX = 3000;
const NIGHT_LUX = 400;

/** Shortest time between switches, so a tunnel mouth cannot make it strobe. */
const SETTLE_MS = 15000;

/**
 * Which mode the conditions call for.
 *
 * The ambient light sensor leads, because it is the only thing that knows about
 * a tunnel at noon or a multi-storey car park. Where a phone has no sensor — or
 * reports nothing from it — the sun's position from the GPS fix takes over,
 * which is a clock that knows about latitude and the season rather than a fixed
 * hour: at these latitudes sunset moves by over three hours across the year.
 */
export function useAutoMode(
  enabled: boolean,
  latitude: number | null,
  longitude: number | null
): { mode: ThemeMode; source: 'sensor' | 'sun' | 'default' } {
  const [mode, setMode] = useState<ThemeMode>('night');
  const [source, setSource] = useState<'sensor' | 'sun' | 'default'>('default');
  const changedAt = useRef(0);
  const modeRef = useRef<ThemeMode>('night');
  modeRef.current = mode;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const settle = (next: ThemeMode, from: 'sensor' | 'sun') => {
      if (cancelled) return;
      setSource(from);
      if (next === modeRef.current) return;
      const now = Date.now();
      if (now - changedAt.current < SETTLE_MS) return;
      changedAt.current = now;
      setMode(next);
    };

    let subscription: { remove: () => void } | null = null;

    LightSensor.isAvailableAsync()
      .then((available) => {
        if (cancelled || !available) return false;
        LightSensor.setUpdateInterval(2000);
        subscription = LightSensor.addListener(({ illuminance }) => {
          if (illuminance >= DAY_LUX) settle('day', 'sensor');
          else if (illuminance <= NIGHT_LUX) settle('night', 'sensor');
          else setSource('sensor');
        });
        return true;
      })
      .catch(() => false);

    // The sun runs regardless: it is the answer when there is no sensor, and it
    // is what fills the gap before the first reading arrives.
    const fromSun = () => {
      if (subscription || latitude == null || longitude == null) return;
      settle(isDaylight(new Date(), latitude, longitude) ? 'day' : 'night', 'sun');
    };
    fromSun();
    const timer = setInterval(fromSun, 60000);

    return () => {
      cancelled = true;
      clearInterval(timer);
      subscription?.remove();
    };
  }, [enabled, latitude, longitude]);

  return { mode, source };
}
