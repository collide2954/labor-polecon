import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LENSES, readLens, inLens, lensSearch } from '../../src/lib.js';

test('LENSES start with everything and cover labor, capital and the state', () => {
  assert.deepEqual(LENSES.map((l) => l.id), ['all', 'labor', 'capital', 'state']);
  for (const l of LENSES) assert.ok(l.label.length > 2 && l.hint.length > 10);
});

test('readLens reads a valid lens from the query string', () => {
  assert.equal(readLens('?lens=capital'), 'capital');
  assert.equal(readLens('?q=1&lens=state'), 'state');
  assert.equal(readLens(''), 'all');
  assert.equal(readLens('?lens=nope'), 'all');
});

test('inLens shows tagged sections, and everything under all', () => {
  assert.equal(inLens('labor capital', 'capital'), true);
  assert.equal(inLens('labor', 'state'), false);
  assert.equal(inLens('labor', 'all'), true);
  assert.equal(inLens('', 'all'), true);
  assert.equal(inLens(undefined, 'state'), true);
});

test('lensSearch writes the lens into the query string', () => {
  assert.equal(lensSearch('', 'labor'), '?lens=labor');
  assert.equal(lensSearch('?lens=labor&x=1', 'all'), '?x=1');
  assert.equal(lensSearch('?lens=labor', 'all'), '');
});
