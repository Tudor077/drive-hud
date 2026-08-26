import { BleManager, Characteristic, Device, Subscription } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';

import { ObdError, ObdTransport, asciiToBytes, base64ToString, bytesToBase64 } from './transport';

/** Services every BLE device exposes; an ELM327's serial port is never one. */
const GENERIC_SERVICES = new Set([
  '00001800-0000-1000-8000-00805f9b34fb',
  '00001801-0000-1000-8000-00805f9b34fb',
  '0000180a-0000-1000-8000-00805f9b34fb',
  '0000180f-0000-1000-8000-00805f9b34fb',
]);

let sharedManager: BleManager | null = null;

export function getBleManager(): BleManager {
  if (!sharedManager) sharedManager = new BleManager();
  return sharedManager;
}

/**
 * Android 12 split Bluetooth out of the location permission. `neverForLocation`
 * in the config plugin means we never have to ask for location just to scan.
 */
export async function ensureBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if (Number(Platform.Version) < 31) return true;

  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
  ]);
  return Object.values(result).every((value) => value === PermissionsAndroid.RESULTS.GRANTED);
}

export type ScannedAdapter = { id: string; name: string; rssi: number | null };

/**
 * ELM327 clones advertise under a small set of names. Anything else on the
 * scan is almost certainly a headset or a watch, so it is filtered out.
 */
const ADAPTER_NAME = /obd|elm|vgate|viecar|konnwei|vlink|carista|obdlink|veepeak/i;

export function scanForAdapters(
  onFound: (adapters: ScannedAdapter[]) => void,
  onError: (message: string) => void,
  durationMs = 10000
): () => void {
  const manager = getBleManager();
  const found = new Map<string, ScannedAdapter>();

  manager
    .startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error) {
        onError(error.message);
        return;
      }
      if (!device) return;
      const name = device.name ?? device.localName;
      if (!name || !ADAPTER_NAME.test(name)) return;
      found.set(device.id, { id: device.id, name, rssi: device.rssi });
      onFound([...found.values()].sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999)));
    })
    .catch((error: Error) => onError(error.message));

  const timer = setTimeout(() => manager.stopDeviceScan(), durationMs);

  return () => {
    clearTimeout(timer);
    manager.stopDeviceScan();
  };
}

export class BleObdTransport implements ObdTransport {
  readonly label: string;

  private device: Device | null = null;
  private writeChar: Characteristic | null = null;
  private notifySub: Subscription | null = null;
  private buffer = '';
  private pending: { resolve: (value: string) => void; reject: (error: Error) => void } | null =
    null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** One command at a time: the adapter answers on a single serial line. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly deviceId: string, label: string) {
    this.label = label;
  }

  async connect(): Promise<void> {
    const manager = getBleManager();
    const device = await manager.connectToDevice(this.deviceId, { requestMTU: 185 });
    await device.discoverAllServicesAndCharacteristics();
    this.device = device;

    const services = (await device.services()).filter(
      (service) => !GENERIC_SERVICES.has(service.uuid.toLowerCase())
    );

    for (const service of services) {
      const characteristics = await service.characteristics();
      const notify = characteristics.find((c) => c.isNotifiable || c.isIndicatable);
      const write = characteristics.find(
        (c) => c.isWritableWithResponse || c.isWritableWithoutResponse
      );
      if (!notify || !write) continue;

      this.writeChar = write;
      this.notifySub = notify.monitor((error, characteristic) => {
        if (error) {
          this.fail(new ObdError(error.message));
          return;
        }
        if (characteristic?.value) this.absorb(base64ToString(characteristic.value));
      });
      return;
    }

    await this.disconnect();
    throw new ObdError(
      'This device has no readable serial channel. It may be a Bluetooth Classic adapter, which needs pairing in Android settings and is not supported yet.'
    );
  }

  async disconnect(): Promise<void> {
    this.notifySub?.remove();
    this.notifySub = null;
    this.writeChar = null;
    const device = this.device;
    this.device = null;
    this.fail(new ObdError('Disconnected'));
    if (device) {
      await getBleManager().cancelDeviceConnection(device.id).catch(() => {});
    }
  }

  send(command: string, timeoutMs = 4000): Promise<string> {
    const run = () => this.sendNow(command, timeoutMs);
    // Chain onto the queue but never let one failure poison the next command.
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => {});
    return result;
  }

  private async sendNow(command: string, timeoutMs: number): Promise<string> {
    const characteristic = this.writeChar;
    const device = this.device;
    if (!characteristic || !device) throw new ObdError('Not connected');

    this.buffer = '';
    const reply = new Promise<string>((resolve, reject) => {
      this.pending = { resolve, reject };
      this.timer = setTimeout(() => this.fail(new ObdError(`Timed out: ${command}`)), timeoutMs);
    });

    const payload = bytesToBase64(asciiToBytes(`${command}\r`));
    if (characteristic.isWritableWithResponse) {
      await characteristic.writeWithResponse(payload);
    } else {
      await characteristic.writeWithoutResponse(payload);
    }

    return reply;
  }

  /** The adapter finishes every reply with a `>` prompt; that is our delimiter. */
  private absorb(chunk: string): void {
    this.buffer += chunk;
    if (!this.buffer.includes('>')) return;

    const [reply] = this.buffer.split('>');
    this.buffer = '';
    const pending = this.pending;
    this.pending = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    pending?.resolve(reply.trim());
  }

  private fail(error: Error): void {
    const pending = this.pending;
    this.pending = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    pending?.reject(error);
  }
}
