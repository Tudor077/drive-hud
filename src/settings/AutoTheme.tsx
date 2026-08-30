import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';

import { ResolvedModeProvider, useSettings } from './SettingsContext';
import { useAutoMode } from './useAutoMode';

/**
 * Resolves 'auto' into a real mode once, above everything else, so the HUD and
 * the settings screen can never disagree about whether it is night.
 *
 * The position it feeds the sun fallback is the last known fix rather than a
 * live watch: the sun does not move fast enough to care, and the HUD is already
 * holding the only GPS subscription this app needs.
 */
export function AutoTheme({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const auto = settings.mode === 'auto';

  useEffect(() => {
    if (!auto) return;
    let cancelled = false;

    const read = () => {
      Location.getLastKnownPositionAsync()
        .then((fix) => {
          if (cancelled || !fix) return;
          setPosition({ latitude: fix.coords.latitude, longitude: fix.coords.longitude });
        })
        .catch(() => {});
    };
    read();
    const timer = setInterval(read, 600000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [auto]);

  const { mode } = useAutoMode(auto, position?.latitude ?? null, position?.longitude ?? null);

  return <ResolvedModeProvider mode={mode}>{children}</ResolvedModeProvider>;
}
