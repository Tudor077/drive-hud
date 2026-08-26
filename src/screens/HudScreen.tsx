import * as Brightness from 'expo-brightness';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useKeepAwake } from 'expo-keep-awake';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { NavStrip } from '../components/NavStrip';
import { RpmBar } from '../components/RpmBar';
import { SpeedReadout } from '../components/SpeedReadout';
import { Tile } from '../components/Tile';
import { useSpeed } from '../location/useSpeed';
import { useNavInstruction } from '../nav/useNavInstruction';
import { useObd } from '../obd/useObd';
import { useSettings } from '../settings/SettingsContext';
import { TINTS, theme } from '../theme';
import { compassPoint, distanceLabel, speedFromMs, speedLabel, tempLabel } from '../units';

const REDLINE_RPM = 7000;

export function HudScreen({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { settings } = useSettings();
  const { width, height } = useWindowDimensions();
  const color = TINTS[settings.tint];

  // The whole point of the app is a screen you glance at, never touch.
  useKeepAwake();

  const gps = useSpeed(settings.demoMode);
  const obd = useObd({
    enabled: settings.obdEnabled,
    demoMode: settings.demoMode,
    deviceId: settings.obdDeviceId,
    deviceName: settings.obdDeviceName,
  });
  const nav = useNavInstruction(settings.navEnabled);

  useEffect(() => {
    if (settings.landscape) {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } else {
      void ScreenOrientation.unlockAsync();
    }
  }, [settings.landscape]);

  useEffect(() => {
    // App-level brightness only — no permission needed, and it is restored when
    // the app goes away.
    Brightness.setBrightnessAsync(settings.brightness).catch(() => {});
  }, [settings.brightness]);

  const speed = gps.speedMs == null ? null : speedFromMs(gps.speedMs, settings.unit);
  const overLimit = settings.speedAlert > 0 && speed != null && speed > settings.speedAlert;

  const isLandscape = width > height;
  const speedFont = Math.min(width * (isLandscape ? 0.3 : 0.55), height * (isLandscape ? 0.55 : 0.3));

  const { readings } = obd;
  const showObd = settings.obdEnabled && obd.status === 'live';

  const tiles: { label: string; value: string; tone?: string }[] = [];
  if (showObd) {
    if (obd.gear != null) tiles.push({ label: 'GEAR', value: String(obd.gear), tone: color });
    if (readings.coolant != null) {
      tiles.push({
        label: 'COOLANT',
        value: tempLabel(readings.coolant, settings.fahrenheit),
        tone: readings.coolant > 105 ? theme.danger : undefined,
      });
    }
    if (readings.throttle != null) {
      tiles.push({ label: 'THROTTLE', value: `${Math.round(readings.throttle)}%` });
    }
    if (readings.load != null) {
      tiles.push({ label: 'LOAD', value: `${Math.round(readings.load)}%` });
    }
    if (readings.ambient != null) {
      tiles.push({ label: 'OUTSIDE', value: tempLabel(readings.ambient, settings.fahrenheit) });
    }
    if (readings.fuel != null) {
      tiles.push({
        label: 'FUEL',
        value: `${Math.round(readings.fuel)}%`,
        tone: readings.fuel < 12 ? theme.warn : undefined,
      });
    }
    if (readings.voltage != null) {
      tiles.push({
        label: 'BATTERY',
        value: `${readings.voltage.toFixed(1)}V`,
        tone: readings.voltage < 11.9 ? theme.warn : undefined,
      });
    }
  }

  const status: string[] = [];
  if (settings.demoMode) status.push('DEMO');
  if (gps.permission === 'denied') status.push('NO GPS PERMISSION');
  else if (!gps.satellitesFixed && !settings.demoMode) status.push('ACQUIRING GPS');
  else if (gps.accuracyM != null) status.push(`±${Math.round(gps.accuracyM)} m`);
  if (gps.headingDeg != null) status.push(compassPoint(gps.headingDeg));
  if (settings.obdEnabled && obd.status !== 'live') status.push(`OBD ${obd.status.toUpperCase()}`);

  return (
    <View style={styles.root}>
      <View
        pointerEvents="none"
        style={[
          styles.mirror,
          settings.mirrored ? { transform: [{ scaleX: -1 }] } : null,
        ]}>
        {nav.instruction ? (
          <NavStrip
            instruction={nav.instruction}
            color={color}
            unit={settings.unit}
            compact={!isLandscape}
          />
        ) : null}

        <View style={[styles.main, isLandscape ? styles.mainRow : styles.mainColumn]}>
          <SpeedReadout
            value={speed}
            unit={speedLabel(settings.unit)}
            color={color}
            warning={overLimit}
            fontSize={speedFont}
          />

          {showObd ? (
            <View style={styles.side}>
              <RpmBar
                rpm={readings.rpm ?? null}
                redline={REDLINE_RPM}
                color={color}
                width={isLandscape ? width * 0.42 : width * 0.85}
              />
              <View style={styles.tiles}>
                {tiles.map((tile) => (
                  <Tile key={tile.label} label={tile.label} value={tile.value} tone={tile.tone} />
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Text allowFontScaling={false} style={styles.status}>
            {status.join('  ·  ')}
          </Text>
          {settings.showTrip ? (
            <Text allowFontScaling={false} style={styles.status}>
              {distanceLabel(gps.trip.distanceM, settings.unit)}
              {'  ·  MAX '}
              {Math.round(speedFromMs(gps.trip.maxSpeedMs, settings.unit))}
              {'  ·  '}
              {formatDuration(gps.trip.movingSeconds)}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Kept outside the mirrored layer so the tap target never flips. */}
      <Pressable
        onPress={onOpenSettings}
        hitSlop={16}
        style={styles.settingsButton}
        accessibilityLabel="Settings">
        <Text allowFontScaling={false} style={styles.settingsGlyph}>
          ⚙
        </Text>
      </Pressable>
    </View>
  );
}

function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  mirror: { flex: 1, paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  main: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mainRow: { flexDirection: 'row', gap: 20 },
  mainColumn: { flexDirection: 'column', gap: 16 },
  side: { alignItems: 'center', gap: 14 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  footer: { gap: 2 },
  status: {
    color: theme.dim,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  settingsButton: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.35,
  },
  settingsGlyph: { color: theme.text, fontSize: 20 },
});
