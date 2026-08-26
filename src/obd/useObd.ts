import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { BleObdTransport, ensureBluetoothPermissions } from './bleTransport';
import { DemoObdTransport } from './demoTransport';
import { ObdSession, ObdStatus } from './elm327';
import { EMPTY_GEAR_MODEL, GearModel, estimateGear, learn } from './gear';
import { ObdReadings } from './pids';
import { ObdTransport } from './transport';

const GEAR_KEY = 'drive-hud:gears:v1';

/** Wipes the learned gearbox ratios, e.g. after switching cars. */
export function forgetGearModel(): Promise<void> {
  return AsyncStorage.removeItem(GEAR_KEY).catch(() => {});
}

export type ObdState = {
  status: ObdStatus;
  message: string | null;
  readings: ObdReadings;
  gear: number | null;
  gearsLearned: number;
  forgetGears: () => void;
};

export function useObd(options: {
  enabled: boolean;
  demoMode: boolean;
  deviceId: string | null;
  deviceName: string | null;
}): ObdState {
  const { enabled, demoMode, deviceId, deviceName } = options;

  const [status, setStatus] = useState<ObdStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [readings, setReadings] = useState<ObdReadings>({});
  const [gearModel, setGearModel] = useState<GearModel>(EMPTY_GEAR_MODEL);

  const sessionRef = useRef<ObdSession | null>(null);
  const modelRef = useRef<GearModel>(EMPTY_GEAR_MODEL);
  modelRef.current = gearModel;

  useEffect(() => {
    AsyncStorage.getItem(GEAR_KEY)
      .then((raw) => {
        if (raw) setGearModel(JSON.parse(raw) as GearModel);
      })
      .catch(() => {});
  }, []);

  const forgetGears = useCallback(() => {
    setGearModel(EMPTY_GEAR_MODEL);
    AsyncStorage.removeItem(GEAR_KEY).catch(() => {});
  }, []);

  useEffect(() => {
    if (!enabled || (!demoMode && !deviceId)) {
      setStatus('idle');
      setReadings({});
      return;
    }

    let cancelled = false;

    (async () => {
      let transport: ObdTransport;
      if (demoMode) {
        transport = new DemoObdTransport();
      } else {
        const allowed = await ensureBluetoothPermissions();
        if (cancelled) return;
        if (!allowed) {
          setStatus('error');
          setMessage('Bluetooth permission denied.');
          return;
        }
        transport = new BleObdTransport(deviceId as string, deviceName ?? 'Adapter');
      }

      const session = new ObdSession(
        transport,
        (next) => {
          if (cancelled) return;
          setReadings(next);

          if (next.rpm != null && next.speed != null) {
            const learned = learn(modelRef.current, next.speed, next.rpm);
            if (learned !== modelRef.current) {
              modelRef.current = learned;
              setGearModel(learned);
              AsyncStorage.setItem(GEAR_KEY, JSON.stringify(learned)).catch(() => {});
            }
          }
        },
        (nextStatus, nextMessage) => {
          if (cancelled) return;
          setStatus(nextStatus);
          setMessage(nextMessage ?? null);
        }
      );

      sessionRef.current = session;
      await session.start();
    })();

    return () => {
      cancelled = true;
      void sessionRef.current?.stop();
      sessionRef.current = null;
    };
  }, [enabled, demoMode, deviceId, deviceName]);

  const gear =
    readings.rpm != null && readings.speed != null
      ? estimateGear(gearModel, readings.speed, readings.rpm)
      : null;

  return {
    status,
    message,
    readings,
    gear,
    gearsLearned: gearModel.ratios.length,
    forgetGears,
  };
}
