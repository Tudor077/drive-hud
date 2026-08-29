import assert from 'node:assert/strict';
import test from 'node:test';

import {
  STRAIGHT_UNTIL_M,
  approachFraction,
  bendProgress,
  chevronPlacements,
} from '../src/nav/curve.ts';

const geometry = (bendX: number) => ({
  width: 400,
  height: 800,
  horizonY: 180,
  bendX,
  count: 7,
});

test('the road is straight until the turn is worth showing', () => {
  assert.equal(bendProgress(STRAIGHT_UNTIL_M), 0);
  assert.equal(bendProgress(900), 0);
  assert.equal(bendProgress(null), 0);
});

test('the bend tightens all the way to the turn', () => {
  const far = bendProgress(500);
  const mid = bendProgress(300);
  const near = bendProgress(80);
  assert.ok(far < mid && mid < near, `expected tightening, got ${far} ${mid} ${near}`);
  assert.equal(bendProgress(0), 1);
});

test('most of the tightening happens late', () => {
  // Held back early: half the distance covered should be well under half the
  // bend, or the road looks bent while you are still on the straight.
  assert.ok(bendProgress(300) < 0.4, `half way in should still be gentle, got ${bendProgress(300)}`);
});

test('a straight road is drawn dead straight', () => {
  const places = chevronPlacements(geometry(0));
  const centres = new Set(places.map((place) => place.x));
  assert.equal(centres.size, 1, 'every chevron should share the centre line');
  assert.ok(places.every((place) => place.angleDeg === 0));
});

test('chevrons run from the driver to the horizon, shrinking', () => {
  const places = chevronPlacements(geometry(0));
  for (let i = 1; i < places.length; i += 1) {
    assert.ok(places[i].y < places[i - 1].y, `chevron ${i} should sit further up`);
    assert.ok(places[i].scale < places[i - 1].scale, `chevron ${i} should be smaller`);
  }
  assert.ok(places[0].y <= 800 && places[places.length - 1].y > 180);
});

test('a right-hand bend leans right, more so with distance up the road', () => {
  const places = chevronPlacements(geometry(160));
  for (let i = 1; i < places.length; i += 1) {
    assert.ok(places[i].x > places[i - 1].x, `chevron ${i} should sit further right`);
    assert.ok(places[i].angleDeg > places[i - 1].angleDeg, `chevron ${i} should lean more`);
  }
  assert.ok(places[0].angleDeg > 0);
});

test('a left-hand bend is the mirror of a right-hand one', () => {
  const right = chevronPlacements(geometry(160));
  const left = chevronPlacements(geometry(-160));
  right.forEach((place, index) => {
    assert.ok(Math.abs(place.x - 200 - (200 - left[index].x)) < 1e-9);
    assert.ok(Math.abs(place.angleDeg + left[index].angleDeg) < 1e-9);
  });
});

test('the near end of the road stays put however sharp the bend', () => {
  // The driver is always on the road; only what is ahead swings away.
  const straight = chevronPlacements(geometry(0))[0];
  const bent = chevronPlacements(geometry(200))[0];
  assert.ok(Math.abs(bent.x - straight.x) < 6, 'the nearest chevron should barely move');
});

test('the distance bar drains at the rate the distance falls', () => {
  // Linear, unlike the bend: a bar is read as a quantity.
  assert.equal(approachFraction(STRAIGHT_UNTIL_M), 1);
  assert.equal(approachFraction(STRAIGHT_UNTIL_M / 2), 0.5);
  assert.equal(approachFraction(0), 0);
});

test('the bar is full before the run-up starts and empty with no turn', () => {
  assert.equal(approachFraction(5000), 1);
  assert.equal(approachFraction(null), 0);
});
