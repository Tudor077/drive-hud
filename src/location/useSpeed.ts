import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

export type SpeedState = {
  /** Metres per second, or null until the first usable fix arrives. */
  speedMs: number | null;
  headingDeg: number | null;
  altitudeM: number | null;
  accuracyM: number | null;
  latitude: number | null;
  longitude: number | null;
  satellitesFixed: boolean;
  permission: 'unknown' | 'granted' | 'denied';
  error: string | null;
};

export type Trip = {
  distanceM: number;
  maxSpeedMs: number;
  movingSeconds: number;
};

const EMPTY_TRIP: Trip = { distanceM: 0, maxSpeedMs: 0, movingSeconds: 0 };

/**
 * GPS reports speed directly, which is far steadier than differentiating
 * positions, but it jitters around zero and drops to null indoors. Anything
 * under a walking pace is reported as a standstill so the HUD does not flicker
 * between 0 and 3 while parked.
 */
const STANDSTILL_MS = 0.6;

function haversineMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function useSpeed(demoMode: boolean) {
  const [state, setState] = useState<SpeedState>({
    speedMs: null,
    headingDeg: null,
    altitudeM: null,
    accuracyM: null,
    latitude: null,
    longitude: null,
    satellitesFixed: false,
    permission: 'unknown',
    error: null,
  });
  const [trip, setTrip] = useState<Trip>(EMPTY_TRIP);

  const lastFix = useRef<{ latitude: number; longitude: number; at: number } | null>(null);

  const resetTrip = useCallback(() => {
    setTrip(EMPTY_TRIP);
    lastFix.current = null;
  }, []);

  const accumulate = useCallback(
    (speedMs: number, coords: { latitude: number; longitude: number } | null, at: number) => {
      setTrip((current) => {
        const previous = lastFix.current;
        let distanceM = current.distanceM;
        let movingSeconds = current.movingSeconds;

        if (coords && previous) {
          const step = haversineMeters(previous, coords);
          const elapsed = (at - previous.at) / 1000;
          // Ignore GPS jumps: nothing on a road covers 400 m between two fixes
          // a second apart, and drift while parked would inflate the odometer.
          if (step < 400 && speedMs > STANDSTILL_MS) {
            distanceM += step;
            if (elapsed > 0 && elapsed < 10) movingSeconds += elapsed;
          }
        }
        if (coords) lastFix.current = { ...coords, at };

        return {
          distanceM,
          movingSeconds,
          maxSpeedMs: Math.max(current.maxSpeedMs, speedMs),
        };
      });
    },
    []
  );

  useEffect(() => {
    if (!demoMode) return;

    // A scripted drive so the HUD can be judged on a desk: pull away, cruise,
    // slow for a roundabout, then accelerate onto a motorway.
    const start = Date.now();
    setState((s) => ({ ...s, permission: 'granted', satellitesFixed: true, error: null }));
    const timer = setInterval(() => {
      const t = ((Date.now() - start) / 1000) % 120;
      const kmh =
        t < 20 ? t * 2.5 : t < 50 ? 50 + Math.sin(t / 3) * 4 : t < 65 ? 50 - (t - 50) * 3 : Math.min(128, 5 + (t - 65) * 3);
      const speedMs = Math.max(0, kmh) / 3.6;
      setState((s) => ({
        ...s,
        speedMs,
        headingDeg: (t * 3) % 360,
        altitudeM: 120 + Math.sin(t / 10) * 15,
        accuracyM: 4,
      }));
      // Distance is integrated straight from the simulated speed here; there
      // are no real fixes to measure between.
      setTrip((current) => ({
        ...current,
        distanceM: current.distanceM + speedMs,
        movingSeconds: current.movingSeconds + 1,
        maxSpeedMs: Math.max(current.maxSpeedMs, speedMs),
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [demoMode]);

  useEffect(() => {
    if (demoMode) return;

    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setState((s) => ({ ...s, permission: 'denied' }));
          return;
        }
        setState((s) => ({ ...s, permission: 'granted' }));

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.LocationAccuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 0,
          },
          (location) => {
            const { speed, heading, altitude, accuracy, latitude, longitude } = location.coords;
            const speedMs = speed != null && speed > STANDSTILL_MS ? speed : 0;
            setState((s) => ({
              ...s,
              speedMs,
              headingDeg: heading,
              altitudeM: altitude,
              accuracyM: accuracy,
              latitude,
              longitude,
              satellitesFixed: accuracy != null && accuracy < 50,
              error: null,
            }));
            accumulate(speedMs, { latitude, longitude }, location.timestamp);
          },
          (reason) => {
            if (!cancelled) setState((s) => ({ ...s, error: reason }));
          }
        );
      } catch (error) {
        if (!cancelled) {
          setState((s) => ({ ...s, error: error instanceof Error ? error.message : String(error) }));
        }
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [demoMode, accumulate]);

  return { ...state, trip, resetTrip };
}
