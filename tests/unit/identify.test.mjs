import { test } from 'node:test';
import assert from 'node:assert/strict';
import { identify, BLS_SURVEYS } from '../../src/lib.js';

test('identify returns null for empty or unknown input', () => {
  assert.equal(identify(''), null);
  assert.equal(identify('   '), null);
  assert.equal(identify('hello world'), null);
});

test('identify decodes CES series down to industry and data type', () => {
  const r = identify('ceu0500000008');
  assert.equal(r.type, 'BLS series');
  assert.equal(r.id, 'CEU0500000008');
  assert.equal(r.db, 'Current Employment Statistics');
  assert.equal(r.url, 'https://data.bls.gov/timeseries/CEU0500000008');
  assert.deepEqual(r.parts, [
    ['Adjustment', 'Not seasonally adjusted'],
    ['Industry', 'Total private'],
    ['Measure', 'Average hourly earnings of production and nonsupervisory employees'],
  ]);
  assert.equal(identify('CES3000000007').parts[0][1], 'Seasonally adjusted');
  assert.equal(identify('CES3000000007').parts[1][1], 'Manufacturing');
});

test('identify decodes CPI and average price series', () => {
  const cpi = identify('CUUR0000SA0');
  assert.equal(cpi.db, 'Consumer Price Index');
  assert.deepEqual(cpi.parts, [['Adjustment', 'Not seasonally adjusted'], ['Area', 'U.S. city average'], ['Item', 'All items']]);
  const eggs = identify('APU0000708111');
  assert.equal(eggs.db, 'Average Price Data');
  assert.deepEqual(eggs.parts.at(-1), ['Item', 'Eggs, grade A, large, per dozen']);
});

test('identify names the survey for other BLS prefixes', () => {
  assert.equal(identify('LNU04000000').db, 'Current Population Survey');
  assert.equal(identify('LUU0204899600').db, 'Union Affiliation');
  assert.equal(identify('WSU100').db, 'Work Stoppages');
  assert.equal(identify('JTU000000000000000JOL').db, 'Job Openings and Labor Turnover Survey');
  assert.equal(identify('PRS85006093').db, 'Productivity and Costs');
  assert.equal(identify('XXU123456'), null);
  assert.ok(Object.keys(BLS_SURVEYS).length >= 15);
});

test('identify decodes NLRB case numbers', () => {
  const r = identify('10-rc-398410');
  assert.equal(r.type, 'NLRB case');
  assert.equal(r.id, '10-RC-398410');
  assert.equal(r.url, 'https://www.nlrb.gov/case/10-RC-398410');
  assert.deepEqual(r.parts, [['Region', '10'], ['Case type', 'RC: petition by employees or a union for an election']]);
  assert.equal(identify('25-CA-398364').parts[1][1], 'CA: charge against an employer');
});

test('identify decodes SOC occupation codes', () => {
  const r = identify('47-2061');
  assert.equal(r.type, 'SOC occupation');
  assert.equal(r.url, 'https://www.bls.gov/oes/current/oes472061.htm');
  assert.deepEqual(r.parts, [['Major group', '47-0000 Construction and Extraction']]);
});

test('identify decodes NAICS codes to their sector', () => {
  const r = identify('3361');
  assert.equal(r.type, 'NAICS industry');
  assert.deepEqual(r.parts, [['Sector', '31-33 Manufacturing'], ['Level', '4-digit industry group']]);
  assert.equal(identify('44').parts[0][1], '44-45 Retail Trade');
  assert.equal(identify('52').parts[1][1], '2-digit sector');
  assert.equal(identify('99'), null);
  assert.match(identify('722511').url, /census\.gov\/naics/);
});

test('identify decodes BEA NIPA tables, series and fixed asset series', () => {
  const t = identify('NIPA Table 1.14');
  assert.equal(t.type, 'BEA table');
  assert.equal(t.id, 'T11400');
  assert.equal(identify('6.16D').id, 'T61600D');
  assert.equal(identify('1.1.5').id, 'T10105');
  assert.equal(identify('T11400').id, 'T11400');
  const s = identify('A460RC');
  assert.equal(s.type, 'BEA NIPA series');
  assert.deepEqual(s.parts, [['Metric', 'Current dollars']]);
  const k = identify('k1pnofi2es00');
  assert.equal(k.type, 'BEA fixed asset series');
  assert.equal(k.id, 'k1pnofi2es00');
});
