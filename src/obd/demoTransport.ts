import { ObdTransport } from './transport';

const hex = (value: number) => Math.max(0, Math.min(255, Math.round(value)))
  .toString(16)
  .toUpperCase()
  .padStart(2, '0');

/**
 * A fake ELM327 so the OBD half of the HUD can be seen working without a car.
 * It models a two-minute loop: pull away in first, work up through the gears,
 * cruise, brake for a junction, then accelerate again — with the engine warming
 * up over the first minute.
 */
export class DemoObdTransport implements ObdTransport {
  readonly label = 'Simulator';

  private startedAt = 0;

  async connect(): Promise<void> {
    this.startedAt = Date.now();
  }

  async disconnect(): Promise<void> {}

  async send(command: string): Promise<string> {
    const normalized = command.replace(/\s+/g, '').toUpperCase();
    await new Promise((resolve) => setTimeout(resolve, 25));

    if (normalized.startsWith('AT')) {
      if (normalized === 'ATRV') return `${(13.9 + Math.sin(this.t / 7) * 0.3).toFixed(1)}V`;
      if (normalized === 'ATZ') return 'ELM327 v1.5';
      return 'OK';
    }

    const { speedKmh, rpm } = this.driveState();

    switch (normalized) {
      case '010C':
        return `410C${hex(Math.floor((rpm * 4) / 256))}${hex((rpm * 4) % 256)}`;
      case '010D':
        return `410D${hex(speedKmh)}`;
      case '0111':
        return `4111${hex((this.throttle / 100) * 255)}`;
      case '0104':
        return `4104${hex(((this.throttle * 0.7 + 18) / 100) * 255)}`;
      case '0105':
        return `4105${hex(Math.min(92, 18 + this.t * 1.4) + 40)}`;
      case '010F':
        return `410F${hex(31 + 40)}`;
      case '0146':
        return `4146${hex(29 + 40)}`;
      case '012F':
        return `412F${hex((Math.max(8, 64 - this.t / 30) / 100) * 255)}`;
      default:
        return 'NO DATA';
    }
  }

  private get t(): number {
    return (Date.now() - this.startedAt) / 1000;
  }

  private get throttle(): number {
    const phase = this.t % 120;
    if (phase < 20) return 45;
    if (phase < 50) return 18;
    if (phase < 65) return 0;
    return 62;
  }

  private driveState(): { speedKmh: number; rpm: number } {
    const phase = this.t % 120;
    const speedKmh =
      phase < 20
        ? phase * 2.5
        : phase < 50
          ? 50 + Math.sin(phase / 3) * 4
          : phase < 65
            ? Math.max(0, 50 - (phase - 50) * 3)
            : Math.min(128, 5 + (phase - 65) * 3);

    // Pick the tallest gear whose ratio keeps the engine above idle-plus.
    const ratios = [95, 52, 34, 25, 20, 17];
    const gearIndex = ratios.findIndex((ratio) => speedKmh * ratio < 3200);
    const ratio = ratios[gearIndex === -1 ? ratios.length - 1 : gearIndex];
    const rpm = speedKmh < 2 ? 780 : Math.max(820, speedKmh * ratio);

    return { speedKmh: Math.round(speedKmh), rpm: Math.round(rpm) };
  }
}
