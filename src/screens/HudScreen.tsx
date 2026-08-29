import * as Brightness from 'expo-brightness';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useKeepAwake } from 'expo-keep-awake';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { RoadView } from '../components/RoadView';
import { RpmBar } from '../components/RpmBar';
import { DistanceBar } from '../components/DistanceBar';
import { OutlineNumber } from '../components/OutlineNumber';
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

/**
 * The over-limit frame is red in both modes, as asked. At night it sits against
 * a red display, so it is drawn thick: what carries the warning is a border
 * appearing where there was none, not the hue.
 */
const OVER_LIMIT_RED = '#FF1E1E';
const OVER_LIMIT_BORDER = 8;

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

  const isLandscape = width > height;

  // The road and the speed each get their own half rather than sharing the
  // middle: chevrons drawn across the digits made both harder to read, and in
  // landscape the speed sat right where the near end of the road is.
  const roadWidth = isLandscape ? width * 0.55 : width;
  const roadHeight = isLandscape ? height : height * 0.55;
  const speedWidth = isLandscape ? width - roadWidth : width;
  const speedHeight = isLandscape ? height : height - roadHeight;

  const speedFont = nav
    ? Math.min(speedWidth * 0.52, speedHeight * 0.46)
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

  const turn = nav?.distanceM != null
    ? distanceLabel(nav.distanceM, settings.unit)
    : (nav?.distanceText ?? '');
  const [turnValue, turnUnit] = turn.split(' ');

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: theme.bg },
        overPosted || overSet
          ? { borderWidth: OVER_LIMIT_BORDER, borderColor: OVER_LIMIT_RED }
          : null,
      ]}>
      <View
        pointerEvents="none"
        style={[
          styles.mirror,
          isLandscape ? styles.row : styles.column,
          settings.mirrored ? { transform: [{ scaleX: -1 }] } : null,
        ]}>
        {nav ? (
          <View style={{ width: roadWidth, height: roadHeight }}>
            <View style={styles.distanceBar}>
              <DistanceBar
                distanceM={nav.distanceM}
                height={roadHeight * 0.6}
                color={tint}
              />
            </View>
            <RoadView
              maneuver={nav.maneuver}
              distanceM={nav.distanceM}
              width={roadWidth}
              height={roadHeight}
              theme={theme}
              tint={tint}
              boardDistance={approach}
            />
            {/* Sits in the sky above the horizon, clear of every chevron. */}
            <View style={styles.header}>
              {turnValue ? (
                <View style={styles.turnRow}>
                  <OutlineNumber
                    value={turnValue}
                    fontSize={Math.min(roadWidth, roadHeight) * 0.15}
                    color={tint}
                  />
                  <Text
                    allowFontScaling={false}
                    style={[styles.turnUnit, { color: theme.dim }]}>
                    {turnUnit ?? ''}
                  </Text>
                </View>
              ) : null}
              {nav.street ? (
                <Text
                  allowFontScaling={false}
                  numberOfLines={1}
                  style={[styles.street, { color: theme.text }]}>
                  {nav.street}
                </Text>
              ) : null}
              {nav.lane ? (
                <Text allowFontScaling={false} style={[styles.lane, { color: tint }]}>
                  {LANE_LABEL[nav.lane]}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={[styles.speedZone, nav ? { width: speedWidth, height: speedHeight } : styles.fill]}>
          <View style={styles.centre}>
            <SpeedReadout
              value={speed}
              unit={speedLabel(settings.unit)}
              color={overPosted || overSet ? theme.alert : tint}
              fontSize={speedFont}
              theme={theme}
            />
            {limit != null ? (
              <SpeedLimitSign
                limitKmh={limit}
                over={overPosted}
                size={speedFont * 0.7}
                theme={theme}
              />
            ) : null}
          </View>

          {trip.length > 0 ? (
            <Text allowFontScaling={false} style={[styles.trip, { color: theme.dim }]}>
              {trip.join('  ·  ')}
            </Text>
          ) : null}

          {showObd ? (
            <>
              <RpmBar
                rpm={readings.rpm ?? null}
                redline={REDLINE_RPM}
                color={tint}
                width={Math.min(speedWidth * 0.86, 420)}
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
  mirror: { flex: 1 },
  row: { flexDirection: 'row' },
  column: { flexDirection: 'column' },
  fill: { flex: 1 },
  header: { position: 'absolute', top: 6, left: 0, right: 0, alignItems: 'center' },
  distanceBar: {
    position: 'absolute',
    left: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  turnRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  turnUnit: { fontSize: 14, fontWeight: '800', letterSpacing: 1.2, paddingBottom: 6 },
  street: { fontSize: 15, fontWeight: '700' },
  lane: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6, marginTop: 2 },
  speedZone: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  trip: { fontSize: 12, fontWeight: '600' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  status: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textAlign: 'center' },
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
