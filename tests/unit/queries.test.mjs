import { test } from 'node:test';
import assert from 'node:assert/strict';
import { identify } from '../../src/lib.js';
import {
  BLS_SERIES, PRICES, NIPA, FIXED, LOBBY, DFA_MEASURES, DFA_GROUPS, BLS_BATCHES, blsBatches,
} from '../../src/queries.js';

test('every BLS series is unique, decodes as BLS and has a start year', () => {
  const ids = BLS_SERIES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const s of BLS_SERIES) {
    assert.equal(identify(s.id)?.type, 'BLS series', s.id);
    assert.ok(s.from >= 1913 && s.from <= 2023, s.id);
    assert.ok(s.label.length > 3, s.id);
  }
});

test('prices are BLS average price series with a unit', () => {
  for (const p of PRICES) {
    assert.match(p.id, /^APU0000/);
    assert.ok(BLS_SERIES.some((s) => s.id === p.id), p.id);
    assert.ok(p.item && p.unit, p.id);
  }
});

test('NIPA and fixed asset codes look like BEA codes and name their table line', () => {
  for (const [code, n] of Object.entries(NIPA)) {
    assert.equal(identify(code)?.type, 'BEA NIPA series', code);
    assert.match(n.table, /^T\d{5}[A-D]?:\d+$/, code);
  }
  for (const [code, n] of Object.entries(FIXED)) {
    assert.equal(identify(code)?.type, 'BEA fixed asset series', code);
    assert.match(n.table, /^FAAt\d{3}:\d+$/, code);
  }
});

test('lobbying registrants are split into business and labor', () => {
  const sides = new Set(LOBBY.map((l) => l.side));
  assert.deepEqual([...sides].sort(), ['business', 'labor']);
  assert.equal(new Set(LOBBY.map((l) => l.id)).size, LOBBY.length);
  assert.ok(LOBBY.filter((l) => l.side === 'labor').length >= 8);
});

test('DFA measures and groups are named', () => {
  assert.ok(DFA_MEASURES.includes('Net worth'));
  assert.deepEqual(DFA_GROUPS.map((g) => g.key), ['TopPt1', 'RemainingTop1', 'Next9', 'Next40', 'Bottom50']);
});

test('blsBatches groups series by start year in batches no larger than the limit', () => {
  const batches = blsBatches(BLS_SERIES, BLS_BATCHES);
  assert.equal(batches.flatMap((b) => b.ids).length, BLS_SERIES.length);
  for (const b of batches) {
    assert.ok(b.ids.length <= BLS_BATCHES);
    for (const id of b.ids) assert.ok(BLS_SERIES.find((s) => s.id === id).from >= b.from);
  }
});
