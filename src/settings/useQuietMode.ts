import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { NavLink } from '../nav/navLink';

/**
 * Silences notification banners while the HUD is on screen.
 *
 * Android drops a heads-up banner over whatever is in front when a notification
 * arrives, which on a windshield means a message from someone lands across the
 * road view at the moment you are reading it. Do Not Disturb stops that.
 *
 * It stops the *display*, not the posting, so the navigation listener carries on
 * receiving Waze and Maps exactly as before — which is the whole reason to do it
 * this way rather than by suppressing the notifications themselves.
 *
 * The driver's own setting is restored when the HUD goes away, including when
 * the app is backgrounded, so a phone left in a pocket is not left silent.
 */
export function useQuietMode(enabled: boolean): { granted: boolean; openSettings: () => void } {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    const check = () => {
      try {
        setGranted(NavLink.hasQuietAccess());
      } catch {
        setGranted(false);
      }
    };
    check();
    // Access is granted from a Settings screen, so re-check on the way back.
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') check();
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!enabled || !granted) return;

    NavLink.setQuiet(true);

    const subscription = AppState.addEventListener('change', (next) => {
      NavLink.setQuiet(next === 'active');
    });

    return () => {
      subscription.remove();
      NavLink.setQuiet(false);
    };
  }, [enabled, granted]);

  return { granted, openSettings: () => NavLink.openQuietSettings() };
}
