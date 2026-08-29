import { useEffect, useRef, useState } from 'react';

import { overpassQuery, pickLimit } from './maxspeed';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

/** Ask again once the car has left the stretch the last answer covered. */
const REFRESH_DISTANCE_M = 150;

/** Overpass is a free, shared service; this stays well inside polite use. */
const MIN_INTERVAL_MS = 25000;

const REQUEST_TIMEOUT_MS = 9000;

function metresBetween(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude));
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type SpeedLimit = {
  /** Posted limit in km/h, or null when nothing is known for this road. */
  kmh: number | null;
  looking: boolean;
  error: string | null;
};

/**
 * The posted speed limit for the road under the car, from OpenStreetMap.
 *
 * No phone knows this on its own and there is no offline source on the device,
 * so it costs a network request — which is why it is off unless switched on.
 * Requests are small, throttled, and only made after the car has moved on from
 * the last stretch asked about.
 *
 * A missing limit is left missing. OSM coverage is patchy, and a guessed number
 * on a windshield is worse than none.
 */
export function useSpeedLimit(
  enabled: boolean,
  latitude: number | null,
  longitude: number | null
): SpeedLimit {
  const [limit, setLimit] = useState<SpeedLimit>({ kmh: null, looking: false, error: null });
  const lastAsked = useRef<{ latitude: number; longitude: number; at: number } | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!enabled) {
      lastAsked.current = null;
      setLimit({ kmh: null, looking: false, error: null });
      return;
    }
    if (latitude == null || longitude == null || inFlight.current) return;

    const here = { latitude, longitude };
    const previous = lastAsked.current;
    const now = Date.now();
    if (previous) {
      if (now - previous.at < MIN_INTERVAL_MS) return;
      if (metresBetween(previous, here) < REFRESH_DISTANCE_M) return;
    }

    lastAsked.current = { ...here, at: now };
    inFlight.current = true;
    setLimit((current) => ({ ...current, looking: true }));

    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), REQUEST_TIMEOUT_MS);

    fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(overpassQuery(latitude, longitude))}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: abort.signal,
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))))
      .then((body) => {
        // A road with no maxspeed tag is a real answer: clear the old limit
        // rather than leaving the previous road's number on screen.
        setLimit({ kmh: pickLimit(body), looking: false, error: null });
      })
      .catch((error: Error) => {
        setLimit({
          kmh: null,
          looking: false,
          error: error.name === 'AbortError' ? 'timed out' : error.message,
        });
      })
      .finally(() => {
        clearTimeout(timer);
        inFlight.current = false;
      });

    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [enabled, latitude, longitude]);

  return limit;
}
