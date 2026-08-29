import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { parseInstruction } from '../nav/parseInstruction';
import { useNavInstruction } from '../nav/useNavInstruction';
import { openWaze } from '../nav/waze';
import { useSettings, useTheme } from '../settings/SettingsContext';
import { TINTS, ThemeMode, TintName, type Theme } from '../theme';

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const { theme, tint } = useTheme();
  const styles = useStyles();
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
          <Text style={[styles.doneText, { color: tint }]}>Done</Text>
        </Pressable>
      </View>

      <Section title="Display">
        <Choice
          label="Mode"
          options={[
            { key: 'night', label: 'night' },
            { key: 'day', label: 'day' },
          ]}
          value={settings.mode}
          onChange={(key) => update({ mode: key as ThemeMode })}
        />
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
          reads the turn-by-turn notification Waze or Google Maps posts while navigating, and draws
          the road ahead from it: straight while the turn is far off, bending harder as it comes up.
          Start the route in Waze as usual, then come back.
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
            tone={nav.hasPermission ? tint : theme.warn}
            action={nav.hasPermission ? undefined : 'Grant'}
            onAction={() => nav.openSettings()}
          />
        ) : (
          <Row label="Notification access" value="Android only" tone={theme.dim} />
        )}
        <Button label="Open Waze" onPress={() => void openWaze()} />
        <NavDebug nav={nav} />
      </Section>

      <Section title="Speed limit">
        <Text style={styles.body}>
          A phone has no idea what the limit is, and there is no offline source on the device. This
          looks the road up in OpenStreetMap, so it needs a connection — a few kilobytes every
          hundred and fifty metres or so, never while it is switched off. Coverage is patchy: where
          OpenStreetMap has no limit recorded, no sign is shown rather than a guess.
        </Text>
        <Toggle
          label="Look up the limit"
          hint="Off by default, because it uses mobile data."
          value={settings.speedLimits}
          onChange={(speedLimits) => update({ speedLimits })}
        />
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
          tone={settings.obdDeviceName ? tint : theme.dim}
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

/**
 * What the navigation app actually sent, verbatim. Every app words its
 * notification differently and some hide it in extras of their own, so when the
 * strip shows the wrong thing — or nothing — this is the only way to see why.
 */
function NavDebug({ nav }: { nav: ReturnType<typeof useNavInstruction> }) {
  const { theme, tint } = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const raw = nav.raw;

  if (!nav.supported) return null;

  const lines: string[] = [];
  if (raw) {
    const parsed = parseInstruction(raw);
    lines.push(`package: ${raw.package}`);
    lines.push(`age: ${Math.round((Date.now() - raw.postedAt) / 1000)}s ago`);
    for (const key of ['title', 'text', 'bigText', 'subText', 'infoText', 'summaryText', 'ticker'] as const) {
      if (raw[key]) lines.push(`${key}: ${raw[key]}`);
    }
    for (const [key, value] of Object.entries(raw.extras ?? {})) {
      lines.push(`extras.${key}: ${value}`);
    }
    lines.push('');
    lines.push(
      parsed
        ? `parsed: ${parsed.maneuver} · ${parsed.distanceText ?? 'no distance'} · ${parsed.street ?? 'no street'}${parsed.lane ? ` · ${parsed.lane}` : ''}`
        : 'parsed: nothing — no readable text in the notification'
    );
  }

  return (
    <View style={styles.section}>
      <Row
        label="Listener running"
        value={nav.connected ? 'yes' : 'no'}
        tone={nav.connected ? tint : theme.warn}
      />
      <Row
        label="Last notification"
        value={raw ? raw.package : 'none seen yet'}
        tone={raw ? tint : theme.dim}
        action={raw ? (open ? 'Hide' : 'Show') : undefined}
        onAction={() => setOpen((value) => !value)}
      />
      {open && lines.length > 0 ? (
        <Text selectable style={styles.debug}>
          {lines.join('\n')}
        </Text>
      ) : null}
      {!raw ? (
        <Text style={styles.body}>
          Nothing has arrived yet. Start a route in Waze or Google Maps, leave it running, then come
          back here. If this still says none while a route is running, the app is not posting a
          notification this listener can see.
        </Text>
      ) : null}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme, tint } = useTheme();
  const styles = useStyles();
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
  const { theme, tint } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: tint, false: theme.border }}
        thumbColor={value ? tint : theme.dim}
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
  const { theme, tint } = useTheme();
  const styles = useStyles();
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
  const { theme, tint } = useTheme();
  const styles = useStyles();
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
  const { theme, tint } = useTheme();
  const styles = useStyles();
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
  const { theme, tint } = useTheme();
  const styles = useStyles();
  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const buildStyles = (theme: Theme) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 18, paddingBottom: 60, gap: 22 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: theme.text, fontSize: 26, fontWeight: '800' },
  done: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.surface },
  doneText: { fontWeight: '800' },
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
  chipOn: { borderColor: theme.text, backgroundColor: theme.border },
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
  debug: {
    color: theme.text,
    fontSize: 11,
    fontFamily: Platform.select({ android: 'monospace', default: 'Menlo' }),
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bg,
  },
  adapter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  adapterName: { color: theme.text, fontWeight: '700' },
  adapterMeta: { color: theme.dim, fontVariant: ['tabular-nums'] },
  });

const STYLE_CACHE = new Map<ThemeMode, ReturnType<typeof buildStyles>>();

function useStyles() {
  const { theme } = useTheme();
  return useMemo(() => {
    const cached = STYLE_CACHE.get(theme.mode);
    if (cached) return cached;
    const built = buildStyles(theme);
    STYLE_CACHE.set(theme.mode, built);
    return built;
  }, [theme]);
}
