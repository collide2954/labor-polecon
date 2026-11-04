import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  exact, compact, pct, usd, cents, wordy, ordinal, decimal,
} from '../../src/lib.js';

test('exact groups thousands with commas', () => {
  assert.equal(exact(163493000), '163,493,000');
  assert.equal(exact(0), '0');
  assert.equal(exact(999), '999');
  assert.equal(exact('7,314'), '7,314');
});

test('exact returns a dash for missing values', () => {
  assert.equal(exact(undefined), '—');
  assert.equal(exact(null), '—');
  assert.equal(exact('n/a'), '—');
});

test('compact abbreviates with one decimal', () => {
  assert.equal(compact(41379710), '41.4M');
  assert.equal(compact(1500), '1.5K');
  assert.equal(compact(2_300_000_000), '2.3B');
  assert.equal(compact(4_100_000_000_000), '4.1T');
  assert.equal(compact(950), '950');
  assert.equal(compact(1_000_000), '1M');
});

test('compact rolls up to the next unit instead of printing 1000K', () => {
  assert.equal(compact(999_960), '1M');
  assert.equal(compact(999.6), '1K');
  assert.equal(compact(999_950_000), '1B');
  assert.equal(compact(999_400), '999.4K');
});

test('pct formats a ratio as a percentage', () => {
  assert.equal(pct(0.1234), '12.3%');
  assert.equal(pct(1), '100%');
  assert.equal(pct(0), '0%');
});

test('usd and cents format dollars', () => {
  assert.equal(usd(19340000), '$19.3M');
  assert.equal(usd(13318987e6), '$13.3T');
  assert.equal(cents(7.25), '$7.25');
  assert.equal(cents(0.71), '$0.71');
  assert.equal(cents(31.346), '$31.35');
  assert.equal(cents(null), '—');
});

test('decimal keeps a fixed number of places', () => {
  assert.equal(decimal(0.5106, 2), '0.51');
  assert.equal(decimal(2.866), '2.9');
  assert.equal(decimal(undefined), '—');
});

test('wordy spells out large numbers', () => {
  assert.equal(wordy(1_240_000_000), '1.24 billion');
  assert.equal(wordy(13_318_987_000_000), '13.3 trillion');
  assert.equal(wordy(41_106_423), '41.1 million');
  assert.equal(wordy(9_999), '9,999');
});

test('ordinal adds the English suffix', () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 111].map(ordinal), ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '101st', '111th']);
});
