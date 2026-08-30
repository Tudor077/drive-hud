import assert from 'node:assert/strict';
import test from 'node:test';

import { contrastRatio, isLight, luminance, mix, parseHex, toHex } from '../src/color.ts';

test('reads both hex forms', () => {
  assert.deepEqual(parseHex('#FF2E2E'), { r: 255, g: 46, b: 46 });
  assert.deepEqual(parseHex('#0F0'), { r: 0, g: 255, b: 0 });
  assert.equal(toHex({ r: 255, g: 46, b: 46 }), '#FF2E2E');
});

test('luminance runs from black to white', () => {
  assert.equal(luminance('#000000'), 0);
  assert.equal(luminance('#FFFFFF'), 1);
});

test('green carries most of the light, blue almost none', () => {
  // This is why a yellow screen is nearly as bright as a white one: it lights
  // the two subpixels that account for 93% of what the eye sees.
  assert.ok(luminance('#00FF00') > 0.7);
  assert.ok(luminance('#0000FF') < 0.08);
  assert.ok(luminance('#FFFF00') > 0.9);
});

test('contrast is symmetric and bounded', () => {
  assert.ok(Math.abs(contrastRatio('#000000', '#FFFFFF') - 21) < 0.01);
  assert.equal(contrastRatio('#123456', '#123456'), 1);
  assert.equal(contrastRatio('#000000', '#FFFF00'), contrastRatio('#FFFF00', '#000000'));
});

test('the default day pairing is far past what is needed to read', () => {
  // Anything above 7:1 is comfortable; this is nearly the maximum possible.
  assert.ok(contrastRatio('#FFFF00', '#000000') > 15);
});

test('mixing moves between the two ends', () => {
  assert.equal(mix('#000000', '#FFFFFF', 0), '#000000');
  assert.equal(mix('#000000', '#FFFFFF', 1), '#FFFFFF');
  assert.equal(mix('#000000', '#FFFFFF', 0.5), '#808080');
});

test('knows which backgrounds want dark ink', () => {
  assert.equal(isLight('#FFFF00'), true);
  assert.equal(isLight('#FFFFFF'), true);
  assert.equal(isLight('#000000'), false);
  assert.equal(isLight('#FF2E2E'), false);
});
