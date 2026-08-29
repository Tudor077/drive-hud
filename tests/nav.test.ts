import assert from 'node:assert/strict';
import test from 'node:test';

import { parseInstruction, parseLane, stripEta } from '../src/nav/parseInstruction.ts';
import { compassPoint, distanceLabel, speedFromMs } from '../src/units.ts';

const notification = (fields: Record<string, unknown>) => ({
  package: 'com.waze',
  title: null,
  text: null,
  subText: null,
  bigText: null,
  infoText: null,
  summaryText: null,
  ticker: null,
  extras: {},
  postedAt: Date.now(),
  ongoing: true,
  ...fields,
}) as Parameters<typeof parseInstruction>[0];

test('reads an English Waze instruction', () => {
  const parsed = parseInstruction(notification({ title: 'Turn right', text: '300 m · Leof. Siggrou' }))!;
  assert.equal(parsed.maneuver, 'right');
  assert.equal(parsed.distanceM, 300);
  assert.equal(parsed.source, 'Waze');
});

test('handles kilometres with a comma decimal', () => {
  const parsed = parseInstruction(notification({ title: 'Continue', text: '1,2 km' }))!;
  assert.equal(parsed.maneuver, 'straight');
  assert.equal(parsed.distanceM, 1200);
});

test('reads a Romanian instruction', () => {
  const parsed = parseInstruction(notification({ title: 'Virează la stânga', text: '450 m' }))!;
  assert.equal(parsed.maneuver, 'left');
  assert.equal(parsed.distanceM, 450);
});

test('reads a Greek instruction', () => {
  const parsed = parseInstruction(notification({ title: 'Στρίψτε δεξιά', text: '200 μ' }))!;
  assert.equal(parsed.maneuver, 'right');
  assert.equal(parsed.distanceM, 200);
});

test('recognises a roundabout ahead of the plain turn words it contains', () => {
  const parsed = parseInstruction(notification({ title: 'At the roundabout, take the 2nd exit' }))!;
  assert.equal(parsed.maneuver, 'roundabout');
});

test('keeps the street name rather than the distance', () => {
  const parsed = parseInstruction(notification({ title: '300 m', text: 'Ethnikis Antistaseos' }))!;
  assert.equal(parsed.street, 'Ethnikis Antistaseos');
});

test('still shows something when the wording is unknown', () => {
  const parsed = parseInstruction(notification({ title: 'Wegen Sie sich ein', text: '80 m' }))!;
  assert.equal(parsed.maneuver, 'unknown');
  assert.equal(parsed.distanceM, 80);
});

test('gives up on an empty notification', () => {
  assert.equal(parseInstruction(notification({})), null);
});

test('converts and labels units', () => {
  assert.equal(Math.round(speedFromMs(27.78, 'kmh')), 100);
  assert.equal(Math.round(speedFromMs(27.78, 'mph')), 62);
  assert.equal(distanceLabel(340, 'kmh'), '340 m');
  assert.equal(distanceLabel(2400, 'kmh'), '2.4 km');
  assert.equal(compassPoint(0), 'N');
  assert.equal(compassPoint(93), 'E');
});

test('picks up the lane wording Google Maps uses', () => {
  assert.equal(parseLane('Use the right 2 lanes to turn right'), 'right');
  assert.equal(parseLane('Keep left at the fork'), 'left');
  assert.equal(parseLane('Use the left lane to turn left'), 'left');
  assert.equal(parseLane('Stay in the middle lane'), 'center');
});

test('reads lane wording in Romanian and Greek', () => {
  assert.equal(parseLane('Folosește banda din dreapta'), 'right');
  assert.equal(parseLane('Ține stânga la bifurcație'), 'left');
  assert.equal(parseLane('Χρησιμοποιήστε τη δεξιά λωρίδα'), 'right');
});

test('does not invent a lane from a plain turn instruction', () => {
  assert.equal(parseLane('Turn right onto Ermou'), null);
  assert.equal(parseLane('300 m'), null);
  assert.equal(parseLane('At the roundabout, take the 2nd exit'), null);
});

test('carries the lane through to the parsed instruction', () => {
  const parsed = parseInstruction(
    notification({ title: 'Turn right', text: 'Use the right 2 lanes · 400 m' })
  )!;
  assert.equal(parsed.lane, 'right');
  assert.equal(parsed.maneuver, 'right');
});

test('an estimated arrival time is not an arrival', () => {
  // Reported from a real drive: every Google Maps instruction rendered as the
  // arrival pin, because its notification carries "Arrive at 14:35" and the
  // arrival pattern matched the word "arriv" anywhere.
  const parsed = parseInstruction(
    notification({
      package: 'com.google.android.apps.maps',
      title: 'Turn right onto Ermou',
      text: '300 m · Arrive at 14:35',
    })
  )!;
  assert.equal(parsed.maneuver, 'right');
  assert.equal(parsed.distanceM, 300);
});

test('an ETA does not swallow a left turn either', () => {
  const parsed = parseInstruction(
    notification({ title: 'Turn left onto Panepistimiou', text: 'Arrival 09:05 · 1,2 km' })
  )!;
  assert.equal(parsed.maneuver, 'left');
  assert.equal(parsed.distanceM, 1200);
});

test('actually arriving is still an arrival', () => {
  assert.equal(
    parseInstruction(notification({ title: 'You have arrived', text: 'Ermou 12' }))!.maneuver,
    'arrive'
  );
  assert.equal(
    parseInstruction(notification({ title: 'Ai ajuns la destinație' }))!.maneuver,
    'arrive'
  );
  assert.equal(
    parseInstruction(notification({ title: 'Destination is on the right' }))!.maneuver,
    'arrive'
  );
});

test('stripEta removes the arrival time and nothing else', () => {
  assert.equal(stripEta('300 m · Arrive at 14:35').trim(), '300 m ·');
  assert.ok(stripEta('You have arrived').includes('arrived'));
  assert.ok(stripEta('Turn right in 300 m').includes('300 m'));
});

test('Romanian "merge" is not an English motorway merge', () => {
  // "merge" is an ordinary Romanian verb; only the phrasal English use counts.
  const parsed = parseInstruction(notification({ title: 'Traficul merge bine', text: '400 m' }))!;
  assert.notEqual(parsed.maneuver, 'merge');
  assert.equal(
    parseInstruction(notification({ title: 'Merge onto A8', text: '400 m' }))!.maneuver,
    'merge'
  );
});

test('reads wording an app hid in its own extras', () => {
  // Apps that draw a custom notification layout leave title and text empty.
  const parsed = parseInstruction(
    notification({
      extras: { 'com.waze.nav.instruction': 'Turn right', 'com.waze.nav.distance': '250 m' },
    })
  )!;
  assert.equal(parsed.maneuver, 'right');
  assert.equal(parsed.distanceM, 250);
});

test('gives up when the notification carries no text at all', () => {
  assert.equal(parseInstruction(notification({ extras: {} })), null);
});
