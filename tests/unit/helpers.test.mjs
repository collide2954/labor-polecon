import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  matches, filterTimeline, sortRows, niceTicks, yearOf, longDate, labelStep,
} from '../../src/lib.js';

test('matches needs every term, ignoring case and accents', () => {
  assert.equal(matches('Frances Perkins, Secretary of Labor', 'perkins labor'), true);
  assert.equal(matches('Café workers', 'cafe'), true);
  assert.equal(matches('Pullman Strike', 'pullman homestead'), false);
  assert.equal(matches('anything', ''), true);
  assert.equal(matches('anything', '   '), true);
});

const ITEMS = [
  { date: '1886-05-04', org: 'Labor', tag: 'hours', text: 'Haymarket affair' },
  { date: '1935-07-05', org: 'State', tag: 'organizing', text: 'National Labor Relations Act signed' },
  { date: '1937-04-12', org: 'State', tag: 'courts', text: 'Jones & Laughlin' },
];

test('filterTimeline filters by tag, org and query', () => {
  assert.equal(filterTimeline(ITEMS, {}).length, 3);
  assert.deepEqual(filterTimeline(ITEMS, { tags: ['courts'] }).map((i) => i.date), ['1937-04-12']);
  assert.deepEqual(filterTimeline(ITEMS, { orgs: ['State'] }).map((i) => i.date), ['1935-07-05', '1937-04-12']);
  assert.deepEqual(filterTimeline(ITEMS, { query: 'haymarket' }).map((i) => i.date), ['1886-05-04']);
  assert.deepEqual(filterTimeline(ITEMS, { query: '1935' }).map((i) => i.date), ['1935-07-05']);
  assert.equal(filterTimeline(ITEMS, { tags: [] }).length, 3);
});

test('sortRows sorts numbers and strings with nulls last', () => {
  const rows = [{ n: 2, s: 'b' }, { n: null, s: 'c' }, { n: 10, s: 'a' }];
  assert.deepEqual(sortRows(rows, 'n', 'desc').map((r) => r.n), [10, 2, null]);
  assert.deepEqual(sortRows(rows, 'n', 'asc').map((r) => r.n), [2, 10, null]);
  assert.deepEqual(sortRows(rows, 's', 'asc').map((r) => r.s), ['a', 'b', 'c']);
  assert.deepEqual(rows.map((r) => r.n), [2, null, 10]);
});

test('niceTicks returns round steps up to max', () => {
  assert.deepEqual(niceTicks(1_882_376, 4), [0, 500000, 1000000, 1500000, 2000000]);
  assert.deepEqual(niceTicks(9, 3), [0, 5, 10]);
  assert.deepEqual(niceTicks(0.62, 3), [0, 0.5, 1]);
  assert.deepEqual(niceTicks(0.29, 3), [0, 0.1, 0.2, 0.3]);
  assert.deepEqual(niceTicks(0, 3), [0]);
  assert.deepEqual(niceTicks(100.00000000000003, 4), [0, 50, 100]);
});

test('yearOf and longDate read partial dates', () => {
  assert.equal(yearOf('1935-07-05'), 1935);
  assert.equal(yearOf('1806'), 1806);
  assert.equal(longDate('1935-07-05'), '5 July 1935');
  assert.equal(longDate('1835-06'), 'June 1835');
  assert.equal(longDate('1806'), '1806');
});

test('labelStep spaces axis labels to fit the width', () => {
  assert.equal(labelStep(82, 770), 5);
  assert.equal(labelStep(82, 290), 10);
  assert.equal(labelStep(42, 290), 5);
  assert.equal(labelStep(5, 600), 1);
  assert.equal(labelStep(300, 200), 50);
});
