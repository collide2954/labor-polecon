import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SOURCES, SOURCE_TITLES, SOURCE_GROUPS, TIMELINE, TAGS, PEOPLE, AGENCIES, EXAMPLES, CADENCES, TERMS, MIN_WAGE, COAL, HIST, POP, ORDER,
} from '../../src/facts.js';
import { identify } from '../../src/lib.js';

const DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;

test('every source is an https url with a title in a known group', () => {
  for (const [key, url] of Object.entries(SOURCES)) {
    assert.match(url, /^https:\/\//, key);
    const [group, title] = SOURCE_TITLES[key] ?? [];
    assert.ok(SOURCE_GROUPS.includes(group), `${key}: ${group}`);
    assert.ok(title?.length > 5 && !/^https?:|^www\./.test(title), key);
  }
});

test('timeline is long, dated, tagged, sourced and sorted', () => {
  assert.ok(TIMELINE.length >= 120);
  for (const org of ['War', 'Finance', 'Police', 'Trade']) assert.ok(TIMELINE.filter((e) => e.org === org).length >= 10, org);
  for (const item of TIMELINE) {
    assert.match(item.date, DATE, item.text);
    assert.ok(['State', 'Labor', 'War', 'Finance', 'Police', 'Trade'].includes(item.org), item.text);
    assert.ok(TAGS.includes(item.tag), item.tag);
    assert.ok(item.text.length > 10 && item.text.length <= 140, item.text);
    assert.ok(SOURCES[item.src], `missing source ${item.src}`);
  }
  const dates = TIMELINE.map((t) => t.date);
  assert.deepEqual(dates, [...dates].sort());
});

test('people have ordered, non-overlapping tenures in each lane', () => {
  assert.ok(PEOPLE.length >= 35);
  for (const org of ['DOL', 'AFL']) {
    const lane = PEOPLE.filter((p) => p.org === org);
    assert.ok(lane.length >= 8, org);
    for (let i = 0; i < lane.length; i += 1) {
      const p = lane[i];
      assert.ok(p.name && p.role, p.name);
      assert.ok(p.from <= (p.to ?? 9999), p.name);
      assert.ok(SOURCES[p.src], p.name);
      if (i) assert.ok(lane[i - 1].to <= p.from, `${lane[i - 1].name} overlaps ${p.name}`);
    }
  }
});

test('agencies are unique, sourced and in start-year order', () => {
  assert.ok(AGENCIES.length >= 7);
  assert.equal(new Set(AGENCIES.map((a) => a.name)).size, AGENCIES.length);
  for (const a of AGENCIES) {
    assert.match(String(a.since), /^\d{4}$/, a.name);
    assert.ok(a.facts.length >= 2, a.name);
    assert.ok(SOURCES[a.src], a.name);
  }
  const years = AGENCIES.map((a) => a.since);
  assert.deepEqual(years, [...years].sort((x, y) => x - y));
});

test('every decoder example is recognised', () => {
  assert.ok(EXAMPLES.length >= 14);
  for (const e of EXAMPLES) {
    assert.ok(identify(e.id), e.id);
    assert.ok(e.is.length > 2, e.id);
  }
});

test('cadences and classical terms are sourced', () => {
  assert.ok(CADENCES.length >= 8);
  for (const c of CADENCES) assert.ok(c.resource && c.cadence && SOURCES[c.src], c.resource);
  assert.ok(TERMS.length >= 6);
  for (const t of TERMS) assert.ok(t.term && t.measure && t.table, t.term);
});

test('minimum wage steps rise in date order from 25 cents to $7.25', () => {
  assert.equal(MIN_WAGE[0].rate, 0.25);
  assert.equal(MIN_WAGE.at(-1).rate, 7.25);
  for (let i = 1; i < MIN_WAGE.length; i += 1) {
    assert.ok(MIN_WAGE[i].date > MIN_WAGE[i - 1].date);
    assert.ok(MIN_WAGE[i].rate > MIN_WAGE[i - 1].rate);
  }
});

test('coal fatalities cover every year from 1900', () => {
  assert.deepEqual(COAL[0], [1900, 448581, 1489]);
  COAL.forEach(([year], i) => assert.equal(year, 1900 + i));
});

test('historical stoppages by issue add up to their totals', () => {
  for (const r of HIST.stoppagesByIssue.rows) {
    const [year, total, wages, union, other] = r;
    assert.equal(wages + union + other, total, String(year));
  }
});

test('the 1800 to 1860 labor force splits exactly into free and enslaved', () => {
  for (const [year, total, free, enslaved] of HIST.laborForce.rows) {
    if (free !== null) assert.equal(free + enslaved, total, String(year));
  }
});

test('every historical table names its series and source', () => {
  for (const [key, table] of Object.entries(HIST)) {
    assert.ok(table.series && table.title && table.columns.length >= 2, key);
    assert.ok(SOURCES[table.src], key);
    for (const row of table.rows) assert.equal(row.length, table.columns.length, `${key} ${row[0]}`);
    const years = table.rows.map((r) => r[0]);
    assert.deepEqual(years, [...years].sort((a, b) => a - b), key);
  }
});

test('population and order tables name their source and run in year order', () => {
  for (const [key, table] of Object.entries({ ...POP, ...ORDER })) {
    assert.ok(table.title && table.columns.length >= 2 && SOURCES[table.src], key);
    for (const row of table.rows) assert.equal(row.length, table.columns.length, `${key} ${row[0]}`);
    const years = table.rows.map((r) => r[0]);
    assert.deepEqual(years, [...years].sort((a, b) => a - b), key);
  }
  assert.deepEqual(POP.census.rows[0], [1790, 3929214, 757208, 697681]);
  assert.deepEqual(POP.census.rows.find((r) => r[0] === 1860), [1860, 31443321, 4441830, 3953760]);
  for (const [year, ne, mw, s, w, us] of POP.regions.rows) assert.equal(ne + mw + s + w, us, String(year));
  assert.equal(ORDER.removals.rows[0][0], 1892);
  assert.equal(ORDER.deployments.rows.reduce((n, r) => n + r[1], 0), 471);
  assert.deepEqual(ORDER.prisonsEarly.rows.at(-1), [1977, 285456, 129]);
});

test('every BEA sector in the snapshot has a short label', async () => {
  const { INDUSTRY_LABELS } = await import('../../src/facts.js');
  const { default: snapshot } = await import('../../src/snapshot.js');
  for (const r of snapshot.industries.rows.filter((x) => x.depth === 1)) {
    assert.ok(INDUSTRY_LABELS[r.label], r.label);
    assert.ok(INDUSTRY_LABELS[r.label].length <= 28, r.label);
  }
});
