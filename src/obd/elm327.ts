import {
  ObdKey,
  ObdReadings,
  PIDS,
  VOLTAGE_COMMAND,
  VOLTAGE_REFRESH_MS,
  parsePidResponse,
  parseVoltage,
} from './pids';
import { ObdTransport } from './transport';

export type ObdStatus = 'idle' | 'connecting' | 'initialising' | 'live' | 'error';

/**
 * Adapter setup, in order: reset, then silence everything that would otherwise
 * have to be parsed away (echo, linefeeds, spaces, headers), then let the
 * adapter negotiate the car's protocol itself.
 */
const INIT_SEQUENCE = ['ATZ', 'ATE0', 'ATL0', 'ATS0', 'ATH0', 'ATSP0'];

/** After this many NO DATA replies, stop asking — the ECU does not support it. */
const UNSUPPORTED_AFTER = 3;

export class ObdSession {
  private running = false;
  private lastRead = new Map<string, number>();
  private misses = new Map<ObdKey, number>();
  private unsupported = new Set<ObdKey>();
  private readings: ObdReadings = {};

  constructor(
    private readonly transport: ObdTransport,
    private readonly onReadings: (readings: ObdReadings) => void,
    private readonly onStatus: (status: ObdStatus, message?: string) => void
  ) {}

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    try {
      this.onStatus('connecting');
      await this.transport.connect();

      this.onStatus('initialising');
      for (const command of INIT_SEQUENCE) {
        if (!this.running) return;
        // ATZ resets the chip and is the slowest of the lot.
        await this.transport.send(command, command === 'ATZ' ? 8000 : 4000);
      }

      // Ask for engine speed once: this is what makes the adapter negotiate a
      // protocol, and it can take several seconds on the first try.
      await this.transport.send('010C', 12000).catch(() => '');

      if (!this.running) return;
      this.onStatus('live');
      void this.pollLoop();
    } catch (error) {
      this.running = false;
      this.onStatus('error', error instanceof Error ? error.message : String(error));
      await this.transport.disconnect().catch(() => {});
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.transport.disconnect().catch(() => {});
    this.onStatus('idle');
  }

  private due(key: string, refreshMs: number, now: number): boolean {
    return now - (this.lastRead.get(key) ?? 0) >= refreshMs;
  }

  private async pollLoop(): Promise<void> {
    while (this.running) {
      const now = Date.now();
      let didWork = false;

      for (const pid of PIDS) {
        if (!this.running) return;
        if (this.unsupported.has(pid.key)) continue;
        if (!this.due(pid.key, pid.refreshMs, now)) continue;

        didWork = true;
        this.lastRead.set(pid.key, Date.now());
        try {
          const raw = await this.transport.send(pid.command);
          const bytes = parsePidResponse(raw, pid.command);
          const value = bytes ? pid.decode(bytes) : null;

          if (value == null) {
            this.noteMiss(pid.key);
          } else {
            this.misses.delete(pid.key);
            this.readings = { ...this.readings, [pid.key]: value };
            this.onReadings(this.readings);
          }
        } catch (error) {
          // A dropped link is fatal for the session; a single slow reply is not.
          if (!this.running) return;
          this.onStatus('error', error instanceof Error ? error.message : String(error));
          this.running = false;
          await this.transport.disconnect().catch(() => {});
          return;
        }
      }

      if (this.due(VOLTAGE_COMMAND, VOLTAGE_REFRESH_MS, now)) {
        didWork = true;
        this.lastRead.set(VOLTAGE_COMMAND, Date.now());
        const raw = await this.transport.send(VOLTAGE_COMMAND).catch(() => '');
        const voltage = parseVoltage(raw);
        if (voltage != null) {
          this.readings = { ...this.readings, voltage };
          this.onReadings(this.readings);
        }
      }

      if (!didWork) await new Promise((resolve) => setTimeout(resolve, 40));
    }
  }

  private noteMiss(key: ObdKey): void {
    const misses = (this.misses.get(key) ?? 0) + 1;
    this.misses.set(key, misses);
    if (misses >= UNSUPPORTED_AFTER) this.unsupported.add(key);
  }
}
