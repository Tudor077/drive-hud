import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { THEMES, Theme, ThemeMode } from '../theme';
import { SpeedUnit } from '../units';

export type Settings = {
  unit: SpeedUnit;
  fahrenheit: boolean;
  /** Flip horizontally so the reflection in the windshield reads correctly. */
  mirrored: boolean;
  landscape: boolean;
  mode: ThemeMode;
  brightness: number;
  /** Warn above this speed, in the chosen unit. 0 disables the warning. */
  speedAlert: number;
  /** Look the limit up from OpenStreetMap. Off by default: it uses data. */
  speedLimits: boolean;
  obdEnabled: boolean;
  /** Remembered adapter, so the next drive reconnects without a scan. */
  obdDeviceId: string | null;
  obdDeviceName: string | null;
  demoMode: boolean;
  navEnabled: boolean;
  showTrip: boolean;
};

const DEFAULTS: Settings = {
  unit: 'kmh',
  fahrenheit: false,
  mirrored: false,
  landscape: true,
  mode: 'night',
  brightness: 1,
  speedAlert: 0,
  speedLimits: false,
  obdEnabled: false,
  obdDeviceId: null,
  obdDeviceName: null,
  demoMode: false,
  navEnabled: true,
  showTrip: true,
};

const STORAGE_KEY = 'drive-hud:settings:v1';

type SettingsContextValue = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  ready: boolean;
};

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULTS,
  update: () => {},
  ready: false,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          // Merge over the defaults so a settings file written by an older
          // version keeps working after new keys are added.
          setSettings({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, update, ready }), [settings, update, ready]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}

/** The palette for the mode currently chosen. */
export function useTheme(): { theme: Theme; tint: string } {
  const { settings } = useSettings();
  const theme = THEMES[settings.mode];
  return useMemo(() => ({ theme, tint: theme.tint }), [theme]);
}
