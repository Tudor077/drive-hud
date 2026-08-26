import { AppState } from 'react-native';
import { useCallback, useEffect, useState } from 'react';

import { NavLink } from './navLink';
import { Instruction, parseInstruction } from './parseInstruction';

/** Navigation apps refresh constantly; a stale card means the drive is over. */
const STALE_AFTER_MS = 30000;

export function useNavInstruction(enabled: boolean) {
  const [instruction, setInstruction] = useState<Instruction | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  const refreshPermission = useCallback(() => {
    if (!NavLink.available) return;
    try {
      setHasPermission(NavLink.hasPermission());
    } catch {
      setHasPermission(false);
    }
  }, []);

  useEffect(() => {
    refreshPermission();
    // Access is granted in Settings, so re-check whenever we come back.
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') refreshPermission();
    });
    return () => subscription.remove();
  }, [refreshPermission]);

  useEffect(() => {
    if (!enabled || !NavLink.available || !hasPermission) {
      setInstruction(null);
      return;
    }

    const last = NavLink.getLastInstruction();
    if (last && Date.now() - last.postedAt < STALE_AFTER_MS) {
      setInstruction(parseInstruction(last));
    }

    const update = NavLink.addListener('onNavigationUpdate', (payload) => {
      setInstruction(parseInstruction(payload));
    });
    const cleared = NavLink.addClearedListener(() => setInstruction(null));

    return () => {
      update.remove();
      cleared.remove();
    };
  }, [enabled, hasPermission]);

  return {
    instruction,
    hasPermission,
    supported: NavLink.available,
    openSettings: () => NavLink.openPermissionSettings(),
    refreshPermission,
  };
}
