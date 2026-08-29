import assert from 'node:assert/strict';
import test from 'node:test';

import { overpassQuery, parseMaxspeed, pickLimit } from '../src/speed/maxspeed.ts';

test('reads a plain posted limit', () => {
  assert.equal(parseMaxspeed('50'), 50);
  assert.equal(parseMaxspeed('90 km/h'), 90);
  assert.equal(parseMaxspeed('130kmh'), 130);
});

test('converts miles per hour', () => {
  assert.equal(parseMaxspeed('30 mph'), 48);
  assert.equal(parseMaxspeed('70 mph'), 113);
});

test('resolves the implicit limits it is sure of', () => {
  assert.equal(parseMaxspeed('RO:urban'), 50);
  assert.equal(parseMaxspeed('GR:motorway'), 130);
  assert.equal(parseMaxspeed('walk'), 7);
});

test('shows nothing rather than a guess', () => {
  // An unlimited autobahn, a variable gantry and an unknown country code all
  // have no number to put on a sign.
  assert.equal(parseMaxspeed('none'), null);
  assert.equal(parseMaxspeed('variable'), null);
  assert.equal(parseMaxspeed('XX:rural'), null);
  assert.equal(parseMaxspeed(''), null);
  assert.equal(parseMaxspeed(null), null);
  assert.equal(parseMaxspeed('fast'), null);
});

test('rejects numbers that are tagging mistakes', () => {
  assert.equal(parseMaxspeed('0'), null);
  assert.equal(parseMaxspeed('999'), null);
});

test('asks only about roads a car drives on', () => {
  const query = overpassQuery(37.9838, 23.7275);
  assert.ok(query.includes('37.98380') && query.includes('23.72750'));
  assert.ok(query.includes('maxspeed'));
  assert.ok(query.includes('motorway') && query.includes('residential'));
  assert.ok(!query.includes('footway'));
});

test('takes the first usable limit and skips the unusable ones', () => {
  assert.equal(
    pickLimit({ elements: [{ tags: { maxspeed: 'none' } }, { tags: { maxspeed: '80' } }] }),
    80
  );
  assert.equal(pickLimit({ elements: [] }), null);
  assert.equal(pickLimit(null), null);
  assert.equal(pickLimit({ elements: [{}] }), null);
});
