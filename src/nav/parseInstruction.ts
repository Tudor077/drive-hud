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

/**
 * Which side of the road to be on. This is only ever as good as the wording the
 * navigation app chose: there is no lane number anywhere in a notification, and
 * a phone cannot work out its own lane — GNSS is accurate to a few metres and a
 * lane is 3.5 m wide. So this is a side, never "lane 3 of 4".
 */
export type LaneHint = 'left' | 'center' | 'right';

export type Instruction = {
  maneuver: Maneuver;
  lane: LaneHint | null;
  /** Metres to the manoeuvre, when the notification spelled it out. */
  distanceM: number | null;
  distanceText: string | null;
  street: string | null;
  source: string;
};

/**
 * Every navigation notification carries an estimated time of arrival, and in
 * several languages it is worded with the verb "arrive": "Arrive at 14:35".
 * Left in, that turns every single instruction on a route into an arrival.
 * Strip the ETA before reading the wording, and match arrival on having
 * actually arrived rather than on the word alone.
 */
const ETA_PHRASE =
  /\b(?:arriv\S*|arrival|eta|sosire|sose\S*|άφιξη)\b[^·|,;]{0,12}\d{1,2}[:.]\d{2}\s*(?:am|pm)?/gi;
const CLOCK_TIME = /\b\d{1,2}[:.]\d{2}\b/g;

export function stripEta(text: string): string {
  return text.replace(ETA_PHRASE, ' ').replace(CLOCK_TIME, ' ');
}

/**
 * Navigation apps write their notification in the phone's language, so the
 * manoeuvre has to be recognised by wording. English, Romanian and Greek are
 * covered; anything unrecognised still shows its text, just without an arrow.
 *
 * Order matters: the first match wins, so the specific readings come before the
 * general ones — a roundabout exit is a roundabout, not an exit, and "keep
 * right to take exit 12" is an exit, not a lane change.
 */
const KEYWORDS: [Maneuver, RegExp][] = [
  [
    'arrive',
    /you have arrived|arriving now|arrive at your destination|destination (?:is )?(?:on the (?:left|right)|ahead|reached)|a[țt]i ajuns|ai ajuns|φτάσατε|έχετε φτάσει/i,
  ],
  ['uturn', /\bu-?turn|întoarce|αναστροφ/i],
  ['roundabout', /roundabout|rotund|sens girato|κυκλικ/i],
  ['exit', /\bexit\b|ieși|ieșire|έξοδο/i],
  // Romanian "merge" means "it goes", so only the English phrasal use counts.
  ['merge', /\bmerge (?:onto|left|right|with)\b|încadr|συγχών/i],
  ['sharp-left', /sharp left|strâns.*stânga|απότομα αριστερ/i],
  ['sharp-right', /sharp right|strâns.*dreapta|απότομα δεξ/i],
  ['slight-left', /slight.*left|keep left|ușor.*stânga|ține stânga|ελαφρ.*αριστερ|αριστερά/i],
  ['slight-right', /slight.*right|keep right|ușor.*dreapta|ține dreapta|ελαφρ.*δεξ/i],
  ['left', /\bleft\b|stânga|αριστερ/i],
  ['right', /\bright\b|dreapta|δεξ/i],
  ['straight', /straight|continue|înainte|continuă|ευθεία|συνεχ/i],
];

/**
 * Lane wording, as Google Maps in particular phrases it: "Use the right 2 lanes
 * to turn right", "Keep left at the fork". Waze says it far less often.
 */
// Greek endings are matched with \S rather than \w: JavaScript's \w is ASCII
// only, so it stops dead at the accented vowel in "δεξιά".
const LANE_HINTS: [LaneHint, RegExp][] = [
  ['center', /middle lane|centre lane|center lane|banda din mijloc|μεσαία λωρίδα/i],
  [
    'right',
    /(?:use|take|keep|stay in|stay on)\b[^.;]{0,24}\bright\b|right\s+\d*\s*lanes?|banda din dreapta|ține dreapta|δεξι\S*\s+λωρίδ/i,
  ],
  [
    'left',
    /(?:use|take|keep|stay in|stay on)\b[^.;]{0,24}\bleft\b|left\s+\d*\s*lanes?|banda din stânga|ține stânga|αριστερ\S*\s+λωρίδ/i,
  ],
];

export function parseLane(text: string): LaneHint | null {
  for (const [lane, pattern] of LANE_HINTS) {
    if (pattern.test(text)) return lane;
  }
  return null;
}

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
  // The fields a well-behaved notification fills in, in the order a driver
  // would read them.
  const standard = [
    notification.title,
    notification.text,
    notification.bigText,
    notification.subText,
    notification.infoText,
    notification.summaryText,
    notification.ticker,
  ].filter((value): value is string => Boolean(value && value.trim()));

  // Apps that draw their own notification layout leave those empty, so fall
  // back to whatever strings they did carry.
  const fromExtras = Object.values(notification.extras ?? {}).filter(
    (value) => value.trim() && !standard.includes(value)
  );

  const fields = [...standard, ...fromExtras];
  if (fields.length === 0) return null;

  const joined = stripEta(fields.join(' · '));

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
  const named = (standard.length > 0 ? standard : fromExtras)
    .map((field) => stripEta(field).trim())
    .filter((field) => field && (!DISTANCE.test(field) || field.replace(DISTANCE, '').trim().length > 3))
    .sort((a, b) => b.length - a.length);

  return {
    maneuver,
    lane: parseLane(joined),
    distanceM,
    distanceText: match ? `${match[1]} ${match[2]}` : null,
    street: named[0] ?? null,
    source: SOURCES[notification.package] ?? 'Navigation',
  };
}
