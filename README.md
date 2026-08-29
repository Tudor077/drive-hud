# Drive HUD

A head-up display for the windshield. Mount the phone flat on the dash, switch on
mirroring, and the screen reflects into your eyeline: speed, the next turn from
whatever navigation app you already use, and live engine data if you have an
OBD-II adapter.

Android is the primary target. iOS runs the speed HUD, but not navigation — see
below.

---

## What it shows

| | Where it comes from | Needs |
| --- | --- | --- |
| Speed, heading, altitude, GPS accuracy | The phone's GNSS receiver | Location permission |
| Posted speed limit | OpenStreetMap, looked up by position | A connection; off by default |
| Trip distance, moving time, top speed | Integrated from the same fixes | — |
| Next manoeuvre, distance, street, side-of-road hint | The ongoing notification Waze or Google Maps posts while navigating | Notification access (Android) |
| RPM, gear, coolant, intake and outside air, throttle, engine load, fuel level, battery voltage | The car's ECU | An ELM327 Bluetooth **LE** adapter |

Speed works with no internet connection and no hardware — GNSS is a receiver,
it costs nothing to listen. That also makes the whole HUD usable abroad without
touching mobile data.

## What it deliberately does not do

**It does not embed Waze.** No app can. Waze has no public SDK for drawing its
map or its route inside another app, and neither does Google Maps. Any HUD that
appears to show Waze is either reading its notification, as this one does, or
sitting on top of it as an overlay.

So the flow is: start the route in Waze as usual, switch to Drive HUD, and the
manoeuvres appear here as Waze announces them. There is an **Open Waze** button
in settings for the handover.

The manoeuvre fills the screen as the road ahead, drawn as a still picture: the
road is straight while the turn is more than 600 m off and the bend tightens as
it comes up, so what you see is the shape of the road rather than an animation
to interpret. The speed sits smaller in the middle of it.

On a bend a **warning board** stands at the corner — the chevron plate you get on
the outside of a real bend. It is treated as an object at a fixed point rather
than an icon: it grows, drifts to the roadside and drops toward you because you
are closing on it, then fades as it sweeps past. Its size follows
`(25 / distance) ^ 0.62` rather than true `1/distance` perspective, which would
put it under a pixel across at 400 m. Between notifications — Waze reposts about
once a second — the distance is carried forward by dead reckoning at your GPS
speed, so the approach is continuous instead of a once-a-second jump. It is **not** placed over a lane, and cannot be: GNSS is accurate to a
few metres, a lane is 3.5 m wide, and no notification carries a lane number.
When an app does spell out a side — "Use the right 2 lanes", "Keep left" — that
appears as a text badge.

This also means navigation is **Android only**. iOS does not let any app read
another app's notifications, and there is no way around it.

**It cannot invent engine data.** A phone has no path to your engine. RPM, gear
and temperatures need an OBD-II adapter in the socket under the dashboard — a
generic ELM327 clone is around €10–20. Without one, those tiles simply do not
appear.

## Day and night

Two palettes, for two different ways of using it. At night the phone lies on the
dash and the windshield reflects it, so black is effectively transparent and only
the lit parts show. In daylight that reflection washes out and the phone is read
directly, where dark ink on white carries further under glare. Each accent colour
has a dark twin for that reason — the colours that glow on black are close to
invisible on white. ⚙ → Display → Mode.

## Install

Grab `DriveHUD.apk` from the latest [release](../../releases/latest), or from
the artifacts of any [Actions run](../../actions). Allow installs from your
browser when Android prompts.

The published APK carries native code for **arm64-v8a only**. Every Android phone
sold for years is 64-bit ARM, and dropping the other three ABIs — one obsolete
32-bit target and two emulator ones — takes most of the download away. To build
for an emulator, add its ABI to `ARCHITECTURES` in the workflow.

It is signed with the standard Expo debug key. That is fine for sideloading and
upgrades in place; it is not suitable for the Play Store. See *Signing* below.

## First run

1. **Allow location.** Asked on launch. "While using the app" is enough.
2. **Turn on mirroring** (⚙ → Display) once the phone is lying on the dash.
3. **Navigation** (⚙ → Navigation): tap *Grant* and enable Drive HUD in the
   Android notification-access list. Android words this as full access to
   notifications, because that is the only granularity it offers — the listener
   here ignores every package that is not a navigation app, and nothing leaves
   the device.
4. **Engine data** (⚙ → Engine data): plug in the adapter, turn the ignition on,
   then *Scan for adapters* and pick yours.

If the navigation strip shows the wrong manoeuvre, or nothing at all, open
⚙ → Navigation and press *Show* next to **Last notification**. It prints the
notification exactly as the app sent it, along with what the parser made of it.
Every navigation app words things differently, and that readout is what makes a
mismatch fixable rather than guesswork.

### Gear

No standard OBD-II PID reports the selected gear; it is not on the bus. What is
on the bus is engine speed and road speed, and their ratio is fixed per gear by
the gearbox and final drive. Drive HUD learns those ratios as you drive and
matches against them, so the gear readout is blank for the first few minutes and
then settles. *Relearn gear ratios* clears them, e.g. after changing cars.

### Bluetooth adapters

Only **Bluetooth LE** adapters are supported. Many cheap ELM327 clones are
Bluetooth *Classic* (they pair with a PIN, usually 1234, from Android's
Bluetooth settings) and those cannot be reached by this app yet. If a scan finds
nothing, check which kind you have — the packaging usually says "BLE 4.0" or
"Bluetooth 4.0" for the supported ones.

The transport sits behind a small interface (`src/obd/transport.ts`), so adding
Classic or Wi-Fi adapters means writing one more implementation, not touching
the protocol code.

## Development

```bash
npm install
npm start          # Metro; open in a dev build
npm test           # parser, gear and unit-conversion tests
npm run typecheck
```

The OBD and GPS layers both have a simulator behind ⚙ → **Demo → Simulate a
drive**, so the HUD can be laid out and judged at a desk: it fakes a two-minute
drive, working up through the gears and back down.

`android/` and `ios/` are generated, not committed. `app.json` plus the config
plugins are the source of truth; `npx expo prebuild` regenerates the native
project. Because there is a custom native module, **Expo Go will not run this
app** — use a dev build or the APK.

### Building an APK

Push, and the [Android APK workflow](.github/workflows/android.yml) builds one
on GitHub's runners. Tag a commit `v1.2.3` to attach it to a release.

Locally, with the Android SDK installed:

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

### Signing

To sign with your own key, add four repository secrets —
`ANDROID_KEYSTORE_BASE64` (the keystore, base64-encoded),
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` — and
the workflow switches over automatically via
`scripts/apply-release-signing.mjs`.

## Layout

```
src/
├── location/    GPS speed and trip totals
├── nav/         notification → instruction parsing, Waze deep links
├── obd/         ELM327 protocol, PID table, BLE transport, gear learning
├── components/  HUD widgets
├── screens/     HUD and settings
└── settings/    persisted preferences
modules/nav-link/  Android native module: the notification listener
tests/             unit tests for the parsing and gear logic
```

## Licence

MIT.
