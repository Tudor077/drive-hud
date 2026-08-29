import * as Brightness from 'expo-brightness';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useKeepAwake } from 'expo-keep-awake';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { RoadView } from '../components/RoadView';
import { RpmBar } from '../components/RpmBar';
import { SpeedLimitSign } from '../components/SpeedLimitSign';
import { SpeedReadout } from '../components/SpeedReadout';
import { Tile } from '../components/Tile';
import { useSpeed } from '../location/useSpeed';
import { useApproach } from '../nav/useApproach';
import { useNavInstruction } from '../nav/useNavInstruction';
import { useObd } from '../obd/useObd';
import { useSettings, useTheme } from '../settings/SettingsContext';
import { useSpeedLimit } from '../speed/useSpeedLimit';
import { compassPoint, distanceLabel, kmhTo, speedFromMs, speedLabel, tempLabel } from '../units';

const REDLINE_RPM = 7000;

const LANE_LABEL = { left: 'KEEP LEFT', center: 'MIDDLE LANE', right: 'KEEP RIGHT' } as const;

export function HudScreen({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { settings } = useSettings();
  const { theme, tint } = useTheme();
  const { width, height } = useWindowDimensions();

  // The whole point of the app is a screen you glance at, never touch.
  useKeepAwake();

  const gps = useSpeed(settings.demoMode);
  const obd = useObd({
    enabled: settings.obdEnabled,
    demoMode: settings.demoMode,
    deviceId: settings.obdDeviceId,
    deviceName: settings.obdDeviceName,
  });
  const navigation = useNavInstruction(settings.navEnabled);
  const nav = navigation.instruction;
  const approach = useApproach(nav?.distanceM ?? null, gps.speedMs);
  const posted = useSpeedLimit(settings.speedLimits, gps.latitude, gps.longitude);

  useEffect(() => {
    if (settings.landscape) {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } else {
      void ScreenOrientation.unlockAsync();
    }
  }, [settings.landscape]);

  useEffect(() => {
    // App-level brightness only, so no permission is needed and the system
    // setting is restored when the app goes away.
    Brightness.setBrightnessAsync(settings.brightness).catch(() => {});
  }, [settings.brightness]);

  const speed = gps.speedMs == null ? null : speedFromMs(gps.speedMs, settings.unit);
  const limit = posted.kmh == null ? null : Math.round(kmhTo(posted.kmh, settings.unit));
  const overPosted = limit != null && speed != null && speed > limit + 2;
  const overSet = settings.speedAlert > 0 && speed != null && speed > settings.speedAlert;

  // With a route running the road fills the screen and the speed gives up the
  // middle to it; on its own the speed is the whole display.
  const speedFont = nav
    ? Math.min(width, height) * 0.2
    : Math.min(width * 0.42, height * 0.5);

  const { readings } = obd;
  const showObd = settings.obdEnabled && obd.status === 'live';

  const tiles: { label: string; value: string; tone?: string }[] = [];
  if (showObd) {
    if (obd.gear != null) tiles.push({ label: 'GEAR', value: String(obd.gear), tone: tint });
    if (readings.coolant != null) {
      tiles.push({
        label: 'COOLANT',
        value: tempLabel(readings.coolant, settings.fahrenheit),
        tone: readings.coolant > 105 ? theme.alert : undefined,
      });
    }
    if (readings.throttle != null) {
      tiles.push({ label: 'THROTTLE', value: `${Math.round(readings.throttle)}%` });
    }
    if (readings.ambient != null) {
      tiles.push({ label: 'OUTSIDE', value: tempLabel(readings.ambient, settings.fahrenheit) });
    }
    if (readings.fuel != null) {
      tiles.push({
        label: 'FUEL',
        value: `${Math.round(readings.fuel)}%`,
        tone: readings.fuel < 12 ? theme.alert : undefined,
      });
    }
    if (readings.voltage != null) {
      tiles.push({
        label: 'BATTERY',
        value: `${readings.voltage.toFixed(1)}V`,
        tone: readings.voltage < 11.9 ? theme.alert : undefined,
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
  if (settings.showTrip) {
    status.push(distanceLabel(gps.trip.distanceM, settings.unit));
    status.push(`MAX ${Math.round(speedFromMs(gps.trip.maxSpeedMs, settings.unit))}`);
  }

  const trip = nav
    ? [
        nav.eta,
        nav.remainingMinutes != null ? formatMinutes(nav.remainingMinutes) : null,
        nav.remainingM != null ? distanceLabel(nav.remainingM, settings.unit) : null,
      ].filter((value): value is string => Boolean(value))
    : [];

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View
        pointerEvents="none"
        style={[styles.mirror, settings.mirrored ? { transform: [{ scaleX: -1 }] } : null]}>
        {nav ? (
          <RoadView
            maneuver={nav.maneuver}
            distanceM={nav.distanceM}
            width={width}
            height={height}
            theme={theme}
            tint={tint}
            boardDistance={approach}
          />
        ) : null}

        {nav ? (
          <View style={styles.header}>
            <Text
              allowFontScaling={false}
              style={[styles.turnDistance, { color: tint, fontSize: Math.min(width, height) * 0.11 }]}>
              {nav.distanceM != null
                ? distanceLabel(nav.distanceM, settings.unit)
                : (nav.distanceText ?? '')}
            </Text>
            {nav.street ? (
              <Text allowFontScaling={false} numberOfLines={1} style={[styles.street, { color: theme.text }]}>
                {nav.street}
              </Text>
            ) : null}
            {nav.lane ? (
              <Text allowFontScaling={false} style={[styles.lane, { color: tint }]}>
                {LANE_LABEL[nav.lane]}
              </Text>
            ) : null}
            {trip.length > 0 ? (
              <Text allowFontScaling={false} style={[styles.trip, { color: theme.dim }]}>
                {trip.join('  ·  ')}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.centre}>
          <View style={styles.speedRow}>
            <SpeedReadout
              value={speed}
              unit={speedLabel(settings.unit)}
              color={tint}
              warning={overSet || overPosted}
              fontSize={speedFont}
              theme={theme}
            />
            {limit != null ? (
              <SpeedLimitSign
                limitKmh={limit}
                over={overPosted}
                size={speedFont * 0.44}
                theme={theme}
              />
            ) : null}
          </View>
        </View>

        <View style={styles.footer}>
          {showObd ? (
            <>
              <RpmBar
                rpm={readings.rpm ?? null}
                redline={REDLINE_RPM}
                color={tint}
                width={Math.min(width * 0.7, 420)}
                theme={theme}
              />
              <View style={styles.tiles}>
                {tiles.map((tile) => (
                  <Tile
                    key={tile.label}
                    label={tile.label}
                    value={tile.value}
                    tone={tile.tone}
                    theme={theme}
                  />
                ))}
              </View>
            </>
          ) : null}
          <Text allowFontScaling={false} style={[styles.status, { color: theme.dim }]}>
            {status.join('  ·  ')}
          </Text>
        </View>
      </View>

      {/* Kept outside the mirrored layer so the tap target never flips. */}
      <Pressable
        onPress={onOpenSettings}
        hitSlop={16}
        style={styles.settingsButton}
        accessibilityLabel="Settings">
        <Text allowFontScaling={false} style={[styles.settingsGlyph, { color: theme.text }]}>
          ⚙
        </Text>
      </Pressable>
    </View>
  );
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mirror: { flex: 1, paddingHorizontal: 14, paddingVertical: 8 },
  header: { alignItems: 'center' },
  turnDistance: { fontWeight: '900', fontVariant: ['tabular-nums'] },
  street: { fontSize: 16, fontWeight: '700' },
  lane: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6, marginTop: 2 },
  trip: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  speedRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  footer: { alignItems: 'center', gap: 8 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  status: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
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
  settingsGlyph: { fontSize: 20 },
});
