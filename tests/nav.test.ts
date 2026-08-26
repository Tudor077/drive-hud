import assert from 'node:assert/strict';
import test from 'node:test';

import { parseInstruction } from '../src/nav/parseInstruction.ts';
import { compassPoint, distanceLabel, speedFromMs } from '../src/units.ts';

const notification = (fields: Record<string, string | null>) => ({
  package: 'com.waze',
  title: null,
  text: null,
  subText: null,
  bigText: null,
  infoText: null,
  postedAt: Date.now(),
  ongoing: true,
  ...fields,
});

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
