import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MARK_COUNT,
  MARK_RANGE_M,
  MARK_SPACING_M,
  SAMPLE_DISTANCES,
  boardDirection,
  hasBoard,
  markBend,
  markOpacity,
  signOpacity,
  signScale,
} from '../src/nav/projection.ts';

test('the board grows as the car closes on it', () => {
  const far = signScale(400);
  const mid = signScale(100);
  const near = signScale(20);
  assert.ok(far < mid, 'closing from 400 m to 100 m should enlarge the board');
  assert.ok(mid < near, 'closing from 100 m to 20 m should enlarge it further');
});

test('it grows faster the nearer it gets, as perspective does', () => {
  // Equal 100 m steps must not produce equal growth: the last one is dramatic.
  const early = signScale(300) - signScale(400);
  const late = signScale(20) - signScale(120);
  assert.ok(late > early * 5, `expected a steep final approach, got ${late} vs ${early}`);
});

test('it stops growing once it is on top of the driver', () => {
  // Without a floor the scale would run away to infinity at zero distance.
  assert.equal(signScale(0), signScale(4));
  assert.ok(Number.isFinite(signScale(0)));
});

test('it is invisible before the route announces the turn', () => {
  assert.equal(signOpacity(700), 0);
  assert.equal(signOpacity(500), 0);
});

test('it fades up on approach and back out as it sweeps past', () => {
  assert.ok(signOpacity(430) > 0 && signOpacity(430) < 1, 'should be fading up at 430 m');
  assert.equal(signOpacity(120), 1, 'should be fully lit through the approach');
  assert.ok(signOpacity(6) > 0 && signOpacity(6) < 1, 'should be fading out as it passes');
  assert.equal(signOpacity(0), 0, 'the board should be gone once it is behind you');
});

test('the sample range is ascending, as Animated.interpolate requires', () => {
  for (let i = 1; i < SAMPLE_DISTANCES.length; i += 1) {
    assert.ok(
      SAMPLE_DISTANCES[i] > SAMPLE_DISTANCES[i - 1],
      `sample ${i} is not greater than the one before it`
    );
  }
});

test('boards stand on bends, not on straights or arrivals', () => {
  assert.ok(hasBoard('right'));
  assert.ok(hasBoard('sharp-left'));
  assert.ok(hasBoard('roundabout'));
  assert.equal(hasBoard('straight'), false);
  assert.equal(hasBoard('arrive'), false);
  assert.equal(hasBoard('unknown'), false);
});

test('the chevrons point the way the road turns', () => {
  assert.equal(boardDirection('right'), 1);
  assert.equal(boardDirection('slight-right'), 1);
  assert.equal(boardDirection('left'), -1);
  assert.equal(boardDirection('sharp-left'), -1);
  assert.equal(boardDirection('uturn'), -1);
});

test('road markings sit an exact distance apart', () => {
  // The flow is 1:1 with the drive only if the spacing is a real distance:
  // at 72 km/h, 20 m spacing means exactly one marking a second.
  assert.equal(MARK_SPACING_M * MARK_COUNT, MARK_RANGE_M);
  assert.equal(MARK_SPACING_M, 20);
});

test('markings fade in at the far end and out as they pass', () => {
  assert.equal(markOpacity(MARK_RANGE_M), 0);
  assert.equal(markOpacity(60), 1);
  assert.equal(markOpacity(0), 0);
});

test('the bend reads at any distance, not only close to the turn', () => {
  // Regression: scaling the bend by proximity made left and right look
  // identical beyond 400 m, which is most of the approach.
  assert.equal(markBend(MARK_RANGE_M), 1, 'the far end should be fully bent');
  assert.ok(markBend(MARK_RANGE_M / 2) > 0.4, 'mid-road should still show the bend');
  assert.equal(markBend(0), 0, 'the marking at your bonnet is straight ahead');
});

test('the bend is clamped for markings beyond the visible road', () => {
  assert.equal(markBend(5000), 1);
  assert.equal(markBend(-10), 0);
});
