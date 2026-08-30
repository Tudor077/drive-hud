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

The manoeuvre is drawn as the road ahead, as a still picture: straight while the
turn is more than 600 m off, the bend tightening as it comes up, so what you see
is the shape of the road rather than an animation to interpret. A thin bar down
the side drains with the distance left to it.

The road and the speed hold their own halves of the screen — side by side in
landscape, stacked in portrait — so no chevron is ever drawn across the digits.
Numbers are hollow at night: a solid figure is a solid block of light, and on a
windshield the bigger it is the more road it hides in the reflection. In daylight
they are filled, because there the reflection is fighting the sun rather than
sitting on a dark road, and a hollow figure loses that fight. They are set in
Michroma, whose wide geometric counters stay open when the glyph is stroked into
a hollow one. Labels and the smaller figures stay in Rajdhani, which fits where a
wide face would not.

Each figure is centred in a cell sized from its own ink, measured out of the font
file. Michroma's digits are far from equal — "4" paints 0.875 em, "1" only
0.665 — so a tabular layout has to size every cell for the widest and leaves
every other digit floating in the difference. Per-digit cells make the tracking
constant mean the literal gap between one digit's ink and the next, with zero
meaning they touch. The number is not tabular as a result and shifts a little as
it counts; a floor under the narrow "1" keeps that small.

Fonts are embedded at build time — react-native-svg resolves a family by asking
the platform, so a runtime-loaded font would never reach the digits.

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

## Quiet while driving

Android drops a heads-up banner over whatever is in front when a notification
arrives. On a windshield that means someone's message lands across the road view
at the moment you are reading it. Drive HUD switches **Do Not Disturb** on while
it is in front and restores whatever you had when you leave, including when the
app is backgrounded — a phone left in a pocket is not left silent.

It holds back the *display*, not the notification, so the navigation listener
keeps receiving Waze and Maps exactly as before and the road view carries on
reading them. That is why this rather than a vendor "game mode": those would mean
declaring a head-up display to be a game, and only work on the handsets whose
maker shipped one.

It needs Do Not Disturb access, granted from a Settings screen like the
notification listener. ⚙ → Quiet while driving.

## Day and night

**Night is red on black.** Red barely touches the eye's dark adaptation, so the
road outside stays as visible as it was, and black is effectively transparent in
the windshield reflection — only the lit parts come back at you.

**Day is black on yellow**, which inverts that on purpose. In sunlight there is
no useful reflection to work with: the screen is read directly, and what wins is
raw light. Yellow is the brightest colour a phone can put out for the power it
spends — it carries 93% of white's luminance while lighting two subpixels instead
of three, so an OLED's brightness limiter throttles it less than it throttles
white. Black on it gives 19.6:1 contrast, against a theoretical maximum of 21.

This has not been measured on a real handset in real sun. It is reasoned from the
sRGB luminance coefficients and how OLED panels behave, which is why **every
colour is yours to change**: ⚙ → Colours picks a background and an ink for each
mode, and everything else on the display is mixed from those two, so no choice
can leave part of it unreadable. The contrast ratio of the pair is shown as you
pick, with a warning under 7:1.

Figures fill on a light ground and go hollow on a dark one, following the same
logic: hollow exists so the road shows through in a dark reflection, and a light
screen has no reflection to see through.

**Switching is automatic** by default. The ambient light sensor leads, because it
is the only thing that knows about a tunnel at noon or a multi-storey car park.
Where a phone has no sensor, the sun's position from your GPS fix takes over — a
clock that knows about latitude and the season, rather than a fixed hour: at these
latitudes sunset moves by over three hours across the year. There is a fifteen
second settling time and a wide dead band between the two thresholds, so a line of
trees cannot make it flicker. ⚙ → Display → Mode also has plain night and day.

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
