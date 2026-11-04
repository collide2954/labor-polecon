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
    assert.match(n.table, /^FAAt\d{3}(ESI)?:\d+$/, code);
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

test('productive payrolls and industry maps point at known series', async () => {
  const { PRODUCTIVE, INDUSTRY_SERIES, Z1 } = await import('../../src/queries.js');
  const has = (id) => BLS_SERIES.some((s) => s.id === id);
  for (const id of [PRODUCTIVE.total, ...PRODUCTIVE.less]) assert.ok(has(id), id);
  for (const [label, m] of Object.entries(INDUSTRY_SERIES)) {
    assert.ok(has(m.payroll), label);
    assert.match(m.payroll, /^CEU\d{8}82$/, label);
    for (const code of m.wages) assert.match(NIPA[code]?.table ?? '', /^T60300D:\d+$/, `${label} ${code}`);
    for (const code of m.depreciation) assert.match(FIXED[code]?.table ?? '', /^FAAt304ESI:\d+$/, `${label} ${code}`);
  }
  for (const code of ['A132RC', 'A443RC', 'A4103C', 'N4159C', 'N4164C']) assert.ok(NIPA[code], code);
  assert.ok(has('CWUR0000SA0'));
  assert.equal(Z1.file, 'csv/S11_1_i_a.csv');
  assert.ok(Z1.codes.includes('LM105020015.A'));
});
