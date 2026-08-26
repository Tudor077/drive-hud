/**
 * The handful of OBD-II PIDs a HUD actually wants. Every one of these is a
 * standard mode-01 PID, so any car built after roughly 2001 (petrol) or 2004
 * (diesel, EU) answers the ones its ECU supports; the rest come back NO DATA
 * and are simply dropped from the display.
 *
 * Decoders take the payload bytes, i.e. what is left after the `41 XX` echo.
 * Formulas are from the SAE J1979 standard PID table.
 */
export type ObdKey =
  | 'rpm'
  | 'speed'
  | 'coolant'
  | 'intake'
  | 'ambient'
  | 'throttle'
  | 'load'
  | 'fuel'
  | 'voltage';

export type Pid = {
  key: ObdKey;
  command: string;
  label: string;
  /** How often to ask. The bus is serial and slow, so this is a real budget. */
  refreshMs: number;
  decode: (bytes: number[]) => number | null;
};

const byteAt = (bytes: number[], index: number): number | null =>
  bytes.length > index ? bytes[index] : null;

export const PIDS: Pid[] = [
  {
    key: 'rpm',
    command: '010C',
    label: 'RPM',
    refreshMs: 120,
    decode: (b) => (b.length >= 2 ? (b[0] * 256 + b[1]) / 4 : null),
  },
  {
    key: 'speed',
    command: '010D',
    label: 'OBD speed',
    refreshMs: 250,
    decode: (b) => byteAt(b, 0),
  },
  {
    key: 'throttle',
    command: '0111',
    label: 'Throttle',
    refreshMs: 250,
    decode: (b) => (b.length >= 1 ? (b[0] * 100) / 255 : null),
  },
  {
    key: 'load',
    command: '0104',
    label: 'Engine load',
    refreshMs: 500,
    decode: (b) => (b.length >= 1 ? (b[0] * 100) / 255 : null),
  },
  {
    key: 'coolant',
    command: '0105',
    label: 'Coolant',
    refreshMs: 2000,
    decode: (b) => (b.length >= 1 ? b[0] - 40 : null),
  },
  {
    key: 'intake',
    command: '010F',
    label: 'Intake air',
    refreshMs: 3000,
    decode: (b) => (b.length >= 1 ? b[0] - 40 : null),
  },
  {
    key: 'ambient',
    command: '0146',
    label: 'Outside',
    refreshMs: 5000,
    decode: (b) => (b.length >= 1 ? b[0] - 40 : null),
  },
  {
    key: 'fuel',
    command: '012F',
    label: 'Fuel',
    refreshMs: 10000,
    decode: (b) => (b.length >= 1 ? (b[0] * 100) / 255 : null),
  },
];

/** Battery voltage is an adapter command, not a PID, and is parsed separately. */
export const VOLTAGE_COMMAND = 'ATRV';
export const VOLTAGE_REFRESH_MS = 5000;

export type ObdReadings = Partial<Record<ObdKey, number>>;

/**
 * Turns an ELM327 reply into payload bytes.
 *
 * With echo, spaces and headers switched off during init, a reply to `010C`
 * looks like `410C1AF8`. Multi-line and multi-ECU replies still turn up, so
 * every line is checked and the first one that echoes the expected mode and PID
 * wins. `NO DATA`, `?`, `STOPPED` and bus errors decode to null.
 */
export function parsePidResponse(raw: string, command: string): number[] | null {
  const expected = `4${command.slice(1, 2)}${command.slice(2, 4)}`.toUpperCase();

  for (const line of raw.split(/[\r\n]+/)) {
    const cleaned = line.replace(/\s+/g, '').toUpperCase();
    if (!cleaned || cleaned === '>' ) continue;
    if (/NODATA|STOPPED|UNABLETOCONNECT|CANERROR|BUSINIT|ERROR|SEARCHING|\?/.test(cleaned)) {
      continue;
    }

    const start = cleaned.indexOf(expected);
    if (start === -1) continue;

    const payload = cleaned.slice(start + expected.length);
    if (!/^[0-9A-F]*$/.test(payload) || payload.length < 2) continue;

    const bytes: number[] = [];
    for (let i = 0; i + 1 < payload.length; i += 2) {
      bytes.push(parseInt(payload.slice(i, i + 2), 16));
    }
    return bytes;
  }
  return null;
}

/** `ATRV` answers with something like `12.5V`. */
export function parseVoltage(raw: string): number | null {
  const match = raw.match(/(\d{1,2}\.\d)\s*V/i);
  return match ? Number(match[1]) : null;
}
