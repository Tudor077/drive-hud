import assert from 'node:assert/strict';
import test from 'node:test';

import { isDaylight, solarAltitude } from '../src/sun.ts';

/** Highest the sun gets that day, found by sweeping the whole day. */
function noonAltitude(date: string, latitude: number, longitude: number): number {
  let best = -90;
  for (let minute = 0; minute < 24 * 60; minute += 2) {
    const at = new Date(`${date}T00:00:00Z`);
    at.setUTCMinutes(minute);
    best = Math.max(best, solarAltitude(at, latitude, longitude));
  }
  return best;
}

test('the sun stands overhead at the equator on an equinox', () => {
  const altitude = noonAltitude('2026-03-20', 0, 0);
  assert.ok(Math.abs(altitude - 90) < 1, `expected about 90°, got ${altitude.toFixed(2)}`);
});

test('midsummer noon matches the textbook angle', () => {
  // 90 − latitude + the Earth's tilt, for Athens and for Bucharest.
  for (const [latitude, longitude] of [
    [37.98, 23.73],
    [44.43, 26.1],
  ]) {
    const expected = 90 - latitude + 23.44;
    const actual = noonAltitude('2026-06-21', latitude, longitude);
    assert.ok(
      Math.abs(actual - expected) < 1,
      `at ${latitude}° expected ${expected.toFixed(1)}°, got ${actual.toFixed(1)}`
    );
  }
});

test('midwinter noon is as much lower as midsummer was higher', () => {
  const summer = noonAltitude('2026-06-21', 44.43, 26.1);
  const winter = noonAltitude('2026-12-21', 44.43, 26.1);
  assert.ok(Math.abs(summer - winter - 2 * 23.44) < 1.5, `${summer} vs ${winter}`);
});

test('the sun is below the horizon at local midnight', () => {
  // Athens sits about 1.6 hours of longitude east of Greenwich.
  assert.ok(solarAltitude(new Date('2026-06-21T22:25:00Z'), 37.98, 23.73) < 0);
  assert.ok(solarAltitude(new Date('2026-12-21T22:25:00Z'), 37.98, 23.73) < 0);
});

test('the polar summer never gets dark, the polar winter never gets light', () => {
  const midsummer = new Date('2026-06-21T00:00:00Z');
  const midwinter = new Date('2026-12-21T12:00:00Z');
  assert.equal(isDaylight(midsummer, 78, 15), true, 'Svalbard in June');
  assert.equal(isDaylight(midwinter, 78, 15), false, 'Svalbard in December');
});

test('a summer afternoon in Athens is daylight, the small hours are not', () => {
  assert.equal(isDaylight(new Date('2026-07-15T13:00:00Z'), 37.98, 23.73), true);
  assert.equal(isDaylight(new Date('2026-07-15T01:00:00Z'), 37.98, 23.73), false);
});
