import type { NavNotification } from '../../modules/nav-link/src/NavLink.types';

export type Maneuver =
  | 'left'
  | 'right'
  | 'slight-left'
  | 'slight-right'
  | 'sharp-left'
  | 'sharp-right'
  | 'straight'
  | 'uturn'
  | 'roundabout'
  | 'exit'
  | 'merge'
  | 'arrive'
  | 'unknown';

export type Instruction = {
  maneuver: Maneuver;
  /** Metres to the manoeuvre, when the notification spelled it out. */
  distanceM: number | null;
  distanceText: string | null;
  street: string | null;
  source: string;
};

/**
 * Navigation apps write their notification in the phone's language, so the
 * manoeuvre has to be recognised by wording. English, Romanian and Greek are
 * covered; anything unrecognised still shows its text, just without an arrow.
 */
const KEYWORDS: [Maneuver, RegExp][] = [
  ['uturn', /\bu-?turn|întoarce|αναστροφ/i],
  ['roundabout', /roundabout|rotund|sens girato|κυκλικ/i],
  ['exit', /\bexit\b|ieși|ieșire|έξοδο/i],
  ['merge', /\bmerge\b|încadr|συγχών/i],
  ['arrive', /arriv|destination|ai ajuns|destinaț|άφιξη|προορισμ/i],
  ['sharp-left', /sharp left|strâns.*stânga|απότομα αριστερ/i],
  ['sharp-right', /sharp right|strâns.*dreapta|απότομα δεξ/i],
  ['slight-left', /slight.*left|keep left|ușor.*stânga|ține stânga|ελαφρ.*αριστερ|αριστερά/i],
  ['slight-right', /slight.*right|keep right|ușor.*dreapta|ține dreapta|ελαφρ.*δεξ/i],
  ['left', /\bleft\b|stânga|αριστερ/i],
  ['right', /\bright\b|dreapta|δεξ/i],
  ['straight', /straight|continue|înainte|continuă|ευθεία|συνεχ/i],
];

/**
 * `300 m`, `1,2 km`, `0.4 mi`, `500 ft`, `200 μ` — comma or dot decimals.
 *
 * The trailing guard is a Unicode letter lookahead rather than `\b`, which is
 * ASCII-only and so would refuse to end a match on the Greek `μ`. It also keeps
 * an ETA like `5 min` from being read as 5 metres.
 */
const DISTANCE = /(\d+(?:[.,]\d+)?)\s*(km|mi|ft|χλμ|m|μ)\.?(?![\p{L}])/iu;

function toMeters(value: number, unit: string): number {
  switch (unit.toLowerCase()) {
    case 'km':
    case 'χλμ':
      return value * 1000;
    case 'mi':
      return value * 1609.34;
    case 'ft':
      return value * 0.3048;
    default:
      return value;
  }
}

const SOURCES: Record<string, string> = {
  'com.waze': 'Waze',
  'com.google.android.apps.maps': 'Maps',
  'com.google.android.apps.navlite': 'Maps Go',
  'net.osmand': 'OsmAnd',
  'net.osmand.plus': 'OsmAnd',
  'com.sygic.aura': 'Sygic',
  'com.tomtom.gplay.navapp': 'TomTom',
};

export function parseInstruction(notification: NavNotification): Instruction | null {
  const fields = [
    notification.title,
    notification.text,
    notification.bigText,
    notification.subText,
    notification.infoText,
  ].filter((value): value is string => Boolean(value && value.trim()));

  if (fields.length === 0) return null;

  const joined = fields.join(' · ');

  let maneuver: Maneuver = 'unknown';
  for (const [candidate, pattern] of KEYWORDS) {
    if (pattern.test(joined)) {
      maneuver = candidate;
      break;
    }
  }

  const match = joined.match(DISTANCE);
  const distanceM = match ? toMeters(Number(match[1].replace(',', '.')), match[2]) : null;

  // The street is the wordiest field that is not just a distance or an ETA.
  const street =
    fields
      .filter((field) => !DISTANCE.test(field) || field.replace(DISTANCE, '').trim().length > 3)
      .sort((a, b) => b.length - a.length)[0] ?? null;

  return {
    maneuver,
    distanceM,
    distanceText: match ? `${match[1]} ${match[2]}` : null,
    street: street?.trim() ?? null,
    source: SOURCES[notification.package] ?? 'Navigation',
  };
}
