/**
 * Everything above this line speaks ELM327 text commands; everything below it
 * moves bytes. Keeping them apart means the same protocol code drives a real
 * Bluetooth adapter or the built-in simulator.
 */
export interface ObdTransport {
  readonly label: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  /** Sends one command and resolves with the reply, minus the `>` prompt. */
  send(command: string, timeoutMs?: number): Promise<string>;
}

export class ObdError extends Error {}

/** Hermes ships no atob/btoa, and the payloads here are tiny. */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? '=' : B64[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? '=' : B64[b2 & 63];
  }
  return out;
}

export function base64ToString(input: string): string {
  const clean = input.replace(/[^A-Za-z0-9+/]/g, '');
  let out = '';
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      (B64.indexOf(clean[i]) << 18) |
      (B64.indexOf(clean[i + 1]) << 12) |
      ((clean[i + 2] ? B64.indexOf(clean[i + 2]) : 0) << 6) |
      (clean[i + 3] ? B64.indexOf(clean[i + 3]) : 0);
    out += String.fromCharCode((n >> 16) & 0xff);
    if (clean[i + 2]) out += String.fromCharCode((n >> 8) & 0xff);
    if (clean[i + 3]) out += String.fromCharCode(n & 0xff);
  }
  return out;
}

export function asciiToBytes(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i += 1) bytes.push(text.charCodeAt(i) & 0xff);
  return bytes;
}
