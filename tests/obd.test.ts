import assert from 'node:assert/strict';
import test from 'node:test';

import { PIDS, parsePidResponse, parseVoltage } from '../src/obd/pids.ts';
import { EMPTY_GEAR_MODEL, estimateGear, learn } from '../src/obd/gear.ts';

const pid = (key: string) => {
  const found = PIDS.find((entry) => entry.key === key);
  if (!found) throw new Error(`no pid ${key}`);
  return found;
};

test('decodes engine speed from a clean reply', () => {
  const bytes = parsePidResponse('410C1AF8', '010C');
  assert.deepEqual(bytes, [0x1a, 0xf8]);
  assert.equal(pid('rpm').decode(bytes!), 1726);
});

test('tolerates spaces, echo and the prompt character', () => {
  const bytes = parsePidResponse('010C\r41 0C 0F A0\r\r>', '010C');
  assert.equal(pid('rpm').decode(bytes!), 1000);
});

test('picks the right line out of a multi-ECU reply', () => {
  const bytes = parsePidResponse('SEARCHING...\r41 0D 50\r41 0D 50\r', '010D');
  assert.equal(pid('speed').decode(bytes!), 80);
});

test('treats NO DATA and bus errors as no reading', () => {
  assert.equal(parsePidResponse('NO DATA', '0146'), null);
  assert.equal(parsePidResponse('CAN ERROR', '010C'), null);
  assert.equal(parsePidResponse('?', '010C'), null);
});

test('does not mistake another PID reply for the one requested', () => {
  assert.equal(parsePidResponse('410D50', '010C'), null);
});

test('applies the offset formulas', () => {
  assert.equal(pid('coolant').decode(parsePidResponse('4105 7B', '0105')!), 83);
  assert.equal(Math.round(pid('throttle').decode(parsePidResponse('411180', '0111')!)!), 50);
});

test('reads adapter voltage', () => {
  assert.equal(parseVoltage('12.5V'), 12.5);
  assert.equal(parseVoltage('13.9 V\r>'), 13.9);
  assert.equal(parseVoltage('nonsense'), null);
});

test('learns one ratio per gear and reuses it', () => {
  let model = EMPTY_GEAR_MODEL;
  // Third gear at a steady 34 rpm per km/h, sampled with a little noise.
  for (const speed of [40, 50, 60, 70]) {
    model = learn(model, speed, speed * 34 + 12);
  }
  assert.equal(model.ratios.length, 1);
  assert.equal(estimateGear(model, 55, 55 * 34), 1);
});

test('orders gears from shortest to tallest ratio', () => {
  let model = EMPTY_GEAR_MODEL;
  model = learn(model, 60, 60 * 20); // a tall gear
  model = learn(model, 30, 30 * 52); // a short one, learned second
  assert.deepEqual(model.ratios, [52, 20]);
  assert.equal(estimateGear(model, 30, 30 * 52), 1);
  assert.equal(estimateGear(model, 90, 90 * 20), 2);
});

test('reports no gear while the clutch is in or the car is crawling', () => {
  const model = learn(EMPTY_GEAR_MODEL, 60, 60 * 20);
  assert.equal(estimateGear(model, 4, 2500), null);
  assert.equal(estimateGear(model, 60, 60 * 34), null);
});
