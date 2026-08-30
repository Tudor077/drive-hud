/**
 * Where the sun is, from a position and a time.
 *
 * Used as the fallback for switching between day and night when the phone has
 * no ambient light sensor, or reports nothing from it. It is a clock that knows
 * about latitude and the season, which is a great deal better than a fixed hour:
 * at Athens' latitude sunset moves by more than three hours across the year.
 *
 * Low-precision NOAA formulas, good to about a hundredth of a degree — orders
 * of magnitude better than a decision between "light out" and "dark out" needs.
 */

const RAD = Math.PI / 180;

/** Days since J2000.0, the epoch the formulas below are written against. */
function daysSinceEpoch(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5 - 2451545.0;
}

/**
 * The sun's angle above the horizon, in degrees. Negative is below it.
 */
export function solarAltitude(date: Date, latitude: number, longitude: number): number {
  const n = daysSinceEpoch(date);

  const meanLongitude = (280.46 + 0.9856474 * n) % 360;
  const meanAnomaly = ((357.528 + 0.9856003 * n) % 360) * RAD;

  // Ecliptic longitude: the mean position corrected for the Earth's elliptical
  // orbit, which is what makes solar noon drift against the clock.
  const eclipticLongitude =
    (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * RAD;

  const obliquity = (23.439 - 0.0000004 * n) * RAD;

  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));
  const rightAscension = Math.atan2(
    Math.cos(obliquity) * Math.sin(eclipticLongitude),
    Math.cos(eclipticLongitude)
  );

  const siderealHours = (18.697374558 + 24.06570982441908 * n) % 24;
  const localSidereal = (siderealHours + 24) % 24 + longitude / 15;
  const hourAngle = (localSidereal * 15 - (rightAscension / RAD)) * RAD;

  const lat = latitude * RAD;
  const altitude = Math.asin(
    Math.sin(lat) * Math.sin(declination) +
      Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle)
  );

  return altitude / RAD;
}

/**
 * The sun is this far below the horizon before the display should go to night.
 *
 * Sunset itself is too early: the sky stays bright enough to read against for a
 * while after it, and flipping to night colours while it is still light out is
 * more jarring than being a few minutes late. This is roughly the point where
 * headlights go on.
 */
export const NIGHT_ALTITUDE = -4;

export function isDaylight(date: Date, latitude: number, longitude: number): boolean {
  return solarAltitude(date, latitude, longitude) > NIGHT_ALTITUDE;
}
