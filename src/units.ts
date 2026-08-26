export type SpeedUnit = 'kmh' | 'mph';

const MS_TO_KMH = 3.6;
const KMH_TO_MPH = 0.621371;

/** GPS reports metres per second; everything on screen is in the chosen unit. */
export function speedFromMs(metersPerSecond: number, unit: SpeedUnit): number {
  const kmh = metersPerSecond * MS_TO_KMH;
  return unit === 'kmh' ? kmh : kmh * KMH_TO_MPH;
}

export function kmhTo(kmh: number, unit: SpeedUnit): number {
  return unit === 'kmh' ? kmh : kmh * KMH_TO_MPH;
}

export function speedLabel(unit: SpeedUnit): string {
  return unit === 'kmh' ? 'km/h' : 'mph';
}

export function distanceLabel(meters: number, unit: SpeedUnit): string {
  if (unit === 'mph') {
    const feet = meters * 3.28084;
    if (feet < 1000) return `${Math.round(feet / 10) * 10} ft`;
    return `${(meters / 1609.34).toFixed(1)} mi`;
  }
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function tempLabel(celsius: number, useFahrenheit: boolean): string {
  return useFahrenheit
    ? `${Math.round(celsius * 1.8 + 32)}°F`
    : `${Math.round(celsius)}°C`;
}

/** Degrees to the nearest compass point, for the little heading readout. */
export function compassPoint(headingDegrees: number): string {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((headingDegrees % 360) + 360) % 360 / 45) % 8;
  return points[index];
}
