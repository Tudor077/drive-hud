import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { ScannedAdapter, ensureBluetoothPermissions, scanForAdapters } from '../obd/bleTransport';
import { forgetGearModel } from '../obd/useObd';
import { useNavInstruction } from '../nav/useNavInstruction';
import { openWaze } from '../nav/waze';
import { useSettings } from '../settings/SettingsContext';
import { TINTS, TintName, theme } from '../theme';

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const { settings, update } = useSettings();
  const nav = useNavInstruction(settings.navEnabled);

  const [adapters, setAdapters] = useState<ScannedAdapter[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const stopScan = useRef<(() => void) | null>(null);

  useEffect(() => () => stopScan.current?.(), []);

  const startScan = useCallback(async () => {
    setScanError(null);
    setAdapters([]);

    if (Platform.OS === 'web') {
      setScanError('Bluetooth scanning is not available on web.');
      return;
    }
    if (!(await ensureBluetoothPermissions())) {
      setScanError('Bluetooth permission denied.');
      return;
    }

    setScanning(true);
    stopScan.current = scanForAdapters(
      setAdapters,
      (message) => {
        setScanError(message);
        setScanning(false);
      },
      12000
    );
    setTimeout(() => setScanning(false), 12000);
  }, []);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Pressable onPress={onClose} hitSlop={12} style={styles.done}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>

      <Section title="Display">
        <Choice
          label="Units"
          options={[
            { key: 'kmh', label: 'km/h' },
            { key: 'mph', label: 'mph' },
          ]}
          value={settings.unit}
          onChange={(key) => update({ unit: key as 'kmh' | 'mph' })}
        />
        <Toggle
          label="Mirror for windshield"
          hint="Flips the image so it reads correctly in the reflection."
          value={settings.mirrored}
          onChange={(mirrored) => update({ mirrored })}
        />
        <Toggle
          label="Lock landscape"
          value={settings.landscape}
          onChange={(landscape) => update({ landscape })}
        />
        <Toggle
          label="Show trip totals"
          value={settings.showTrip}
          onChange={(showTrip) => update({ showTrip })}
        />
        <Choice
          label="Colour"
          options={(Object.keys(TINTS) as TintName[]).map((key) => ({ key, label: key }))}
          value={settings.tint}
          onChange={(key) => update({ tint: key as TintName })}
        />
        <Stepper
          label="Brightness"
          value={`${Math.round(settings.brightness * 100)}%`}
          onDown={() => update({ brightness: Math.max(0.1, settings.brightness - 0.1) })}
          onUp={() => update({ brightness: Math.min(1, settings.brightness + 0.1) })}
        />
        <Stepper
          label="Speed warning"
          value={settings.speedAlert > 0 ? `${settings.speedAlert}` : 'off'}
          onDown={() => update({ speedAlert: Math.max(0, settings.speedAlert - 5) })}
          onUp={() => update({ speedAlert: Math.min(250, settings.speedAlert + 5) })}
        />
      </Section>

      <Section title="Navigation">
        <Text style={styles.body}>
          Waze cannot be drawn inside another app — no public SDK exists for that. Instead, Drive HUD
          reads the turn-by-turn notification Waze or Google Maps posts while navigating, and shows
          the next manoeuvre here. Start the route in Waze as usual, then come back.
        </Text>
        <Toggle
          label="Show navigation strip"
          value={settings.navEnabled}
          onChange={(navEnabled) => update({ navEnabled })}
        />
        {nav.supported ? (
          <Row
            label="Notification access"
            value={nav.hasPermission ? 'granted' : 'not granted'}
            tone={nav.hasPermission ? theme.accent : theme.warn}
            action={nav.hasPermission ? undefined : 'Grant'}
            onAction={() => nav.openSettings()}
          />
        ) : (
          <Row label="Notification access" value="Android only" tone={theme.dim} />
        )}
        <Button label="Open Waze" onPress={() => void openWaze()} />
      </Section>

      <Section title="Engine data (OBD-II)">
        <Text style={styles.body}>
          RPM, gear and temperatures come from the car, not the phone. Plug an ELM327 Bluetooth LE
          adapter into the OBD-II socket under the dashboard, then pair it here. Gear is worked out
          from the engine-to-road-speed ratio and gets more accurate over the first few minutes of
          driving.
        </Text>
        <Toggle
          label="Enable OBD-II"
          value={settings.obdEnabled}
          onChange={(obdEnabled) => update({ obdEnabled })}
        />
        <Row
          label="Adapter"
          value={settings.obdDeviceName ?? 'none paired'}
          tone={settings.obdDeviceName ? theme.accent : theme.dim}
          action={settings.obdDeviceId ? 'Forget' : undefined}
          onAction={() => update({ obdDeviceId: null, obdDeviceName: null })}
        />
        <Button label={scanning ? 'Scanning…' : 'Scan for adapters'} onPress={() => void startScan()} />
        {scanError ? <Text style={styles.error}>{scanError}</Text> : null}
        {adapters.map((adapter) => (
          <Pressable
            key={adapter.id}
            style={styles.adapter}
            onPress={() => {
              stopScan.current?.();
              setScanning(false);
              update({
                obdDeviceId: adapter.id,
                obdDeviceName: adapter.name,
                obdEnabled: true,
              });
            }}>
            <Text style={styles.adapterName}>{adapter.name}</Text>
            <Text style={styles.adapterMeta}>{adapter.rssi ?? '--'} dBm</Text>
          </Pressable>
        ))}
        <Button label="Relearn gear ratios" onPress={() => void forgetGearModel()} />
      </Section>

      <Section title="Demo">
        <Toggle
          label="Simulate a drive"
          hint="Fakes GPS and engine data so the HUD can be set up indoors."
          value={settings.demoMode}
          onChange={(demoMode) => update({ demoMode })}
        />
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.accentDim, false: theme.border }}
        thumbColor={value ? theme.accent : theme.dim}
      />
    </View>
  );
}

function Choice({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choices}>
        {options.map((option) => (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[styles.chip, value === option.key ? styles.chipOn : null]}>
            <Text style={[styles.chipText, value === option.key ? styles.chipTextOn : null]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Stepper({
  label,
  value,
  onDown,
  onUp,
}: {
  label: string;
  value: string;
  onDown: () => void;
  onUp: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choices}>
        <Pressable onPress={onDown} style={styles.chip}>
          <Text style={styles.chipText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{value}</Text>
        <Pressable onPress={onUp} style={styles.chip}>
          <Text style={styles.chipText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  tone,
  action,
  onAction,
}: {
  label: string;
  value: string;
  tone?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choices}>
        <Text style={[styles.value, tone ? { color: tone } : null]}>{value}</Text>
        {action && onAction ? (
          <Pressable onPress={onAction} style={styles.chip}>
            <Text style={styles.chipText}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 18, paddingBottom: 60, gap: 22 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: theme.text, fontSize: 26, fontWeight: '800' },
  done: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.surface },
  doneText: { color: theme.accent, fontWeight: '800' },
  section: { gap: 10 },
  sectionTitle: {
    color: theme.dim,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
  },
  rowText: { flex: 1, gap: 2 },
  label: { color: theme.text, fontSize: 15, fontWeight: '600' },
  hint: { color: theme.dim, fontSize: 12 },
  body: { color: theme.dim, fontSize: 13, lineHeight: 19 },
  value: { color: theme.text, fontSize: 14, fontWeight: '700' },
  choices: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  chipOn: { borderColor: theme.accent, backgroundColor: theme.accentDim },
  chipText: { color: theme.dim, fontWeight: '700', fontSize: 13 },
  chipTextOn: { color: theme.text },
  stepValue: {
    color: theme.text,
    fontWeight: '800',
    minWidth: 52,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    alignItems: 'center',
  },
  buttonText: { color: theme.text, fontWeight: '700' },
  error: { color: theme.danger, fontSize: 13 },
  adapter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.accentDim,
    backgroundColor: theme.surface,
  },
  adapterName: { color: theme.text, fontWeight: '700' },
  adapterMeta: { color: theme.dim, fontVariant: ['tabular-nums'] },
});
