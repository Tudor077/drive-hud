/**
 * OpenStreetMap's `maxspeed` tag is free text with conventions, not a number.
 * It carries units, country-coded implicit limits, and a few words. Anything
 * that is not a definite posted number is treated as unknown: showing a guessed
 * limit on a windshield is worse than showing none.
 */
const MPH_TO_KMH = 1.609344;

/** Implicit limits worth resolving. Urban and rural defaults vary too much by
 *  country to guess, so only the unambiguous ones are mapped. */
const IMPLICIT: Record<string, number> = {
  'ro:urban': 50,
  'gr:urban': 50,
  'de:urban': 50,
  'it:urban': 50,
  'fr:urban': 50,
  'ro:rural': 90,
  'gr:rural': 90,
  'ro:motorway': 130,
  'gr:motorway': 130,
  'it:motorway': 130,
  'fr:motorway': 130,
  'ro:trunk': 100,
  walk: 7,
  'ro:living_street': 20,
};

export function parseMaxspeed(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();

  // An unlimited stretch has no number to show.
  if (value === 'none' || value === 'unlimited' || value === 'signals' || value === 'variable') {
    return null;
  }

  const implicit = IMPLICIT[value];
  if (implicit) return implicit;

  const mph = value.match(/^(\d+(?:\.\d+)?)\s*mph$/);
  if (mph) return Math.round(Number(mph[1]) * MPH_TO_KMH);

  const kmh = value.match(/^(\d+(?:\.\d+)?)\s*(?:km\/h|kmh|kph)?$/);
  if (kmh) {
    const limit = Number(kmh[1]);
    // Anything outside this is a tagging mistake, not a road sign.
    return limit >= 5 && limit <= 200 ? Math.round(limit) : null;
  }

  return null;
}

/** Road types worth asking about; footpaths and tracks are noise here. */
const DRIVABLE =
  '^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$';

export function overpassQuery(latitude: number, longitude: number, radiusM = 30): string {
  const lat = latitude.toFixed(5);
  const lon = longitude.toFixed(5);
  return `[out:json][timeout:8];way(around:${radiusM},${lat},${lon})["highway"~"${DRIVABLE}"]["maxspeed"];out tags 5;`;
}

type OverpassElement = { tags?: Record<string, string> };

export function pickLimit(response: unknown): number | null {
  const elements = (response as { elements?: OverpassElement[] } | null)?.elements;
  if (!Array.isArray(elements)) return null;

  for (const element of elements) {
    const limit = parseMaxspeed(element?.tags?.maxspeed);
    if (limit != null) return limit;
  }
  return null;
}
