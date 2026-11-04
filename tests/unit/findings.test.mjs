import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findings } from '../../src/findings.js';
import snapshot from '../../src/snapshot.js';

const yrs = (pairs) => ({ years: pairs });
const ann = (pairs, latest = null) => ({ annual: pairs, latest });
const weekly = (pairs) => ann(pairs.map(([y, v]) => [y, (v * 1000) / (365.25 / 7)]));

const fixture = {
  generated: '2026-11-04T01:37:31.893Z',
  bls: {
    CEU3000000007: ann([[1939, 37.8], [2025, 41.1]]),
    PRS85006093: ann([[1947, 20], [1964, 40], [2025, 120]]),
    PRS85006153: ann([[1947, 40], [2025, 100]]),
    CUUR0000SA0: ann([[1964, 31], [1968, 34.8], [1972, 41.8], [1980, 82.4], [2025, 321.943]]),
    CWUR0000SA0: ann([[1964, 31], [1968, 34.8], [1972, 41.8], [1980, 82.4], [2025, 321.943]]),
    CEU0500000082: weekly([[1972, 90], [2025, 800]]),
    CEU4142000082: weekly([[1972, 10], [2025, 100]]),
    CEU4200000082: weekly([[1972, 10], [2025, 100]]),
    CEU5500000082: weekly([[1972, 10], [2025, 100]]),
    CEU1021000082: weekly([[2025, 5]]),
    CEU2000000082: weekly([[2025, 8]]),
    LEU0252911200: ann([[2025, 619]]),
    LEU0252911500: ann([[2025, 2905]]),
    APU0000708111: ann([[1980, 0.844], [2025, 4.252]]),
    CEU0500000008: ann([[1964, 2.53], [1980, 6.85], [2025, 31.35]]),
    LNU04000000: ann([[2025, 4.3]], { year: 2026, period: 'M09', value: 4 }),
    LNU03000000: ann([[2025, 7314]]),
    LNU03008636: ann([[2025, 1696]]),
    LNU02032194: ann([[2025, 4831]]),
    LNU05026642: ann([[2025, 1716]]),
    LNU05026645: ann([[2025, 509]]),
    LNU02000000: ann([[1948, 58343], [2025, 163493]]),
    LNU02032184: ann([[1948, 1646], [2025, 1523]]),
    LNU02032187: ann([[1948, 44222], [2025, 152074]]),
    LNU02032185: ann([[1948, 4665], [2025, 680]]),
    LNU02032192: ann([[1948, 6110], [2025, 9156]]),
    LNU02032186: ann([[1948, 1317], [2025, 22]]),
    LNU02032193: ann([[1948, 384], [2025, 38]]),
    LUU0204899600: ann([[2025, 10]]),
    WSU100: ann([[1952, 470], [2025, 30]]),
    FAU00X00000080N00: ann([[2024, 5070]]),
  },
  nipa: {
    A457RC: yrs([[1972, 125], [2025, 1500]]),
    A460RC: yrs([[1972, 100], [2025, 1000]]),
    A132RC: yrs([[1972, 130], [2025, 1100]]),
    A443RC: yrs([[1972, 110], [2025, 900]]),
    B461RC: yrs([[1972, 100], [2025, 800]]),
    A4103C: yrs([[2025, 1100]]),
    N4159C: yrs([[2025, 60]]),
    N4164C: yrs([[2025, 40]]),
    N4107C: yrs([[2025, 10]]),
    N4112C: yrs([[2025, 10]]),
    A032RC: yrs([[2025, 4000]]),
    A033RC: yrs([[2025, 2432]]),
    A034RC: yrs([[2025, 2000]]),
    A051RC: yrs([[2025, 624]]),
    W005RC: yrs([[1929, 100], [2025, 1000]]),
    B075RC: yrs([[1929, 33], [2025, 78]]),
    A445RC: yrs([[2025, 400]]),
    A587RC: yrs([[2025, 100]]),
  },
  fixed: { k1pnofi2es00: yrs([[1971, 300], [2024, 3500]]), m1n21001es00: yrs([[2025, 10]]), m1n23001es00: yrs([[2025, 1]]) },
  z1: { LM105020015: yrs([[1971, 75], [2024, 500]]) },
  industries: {
    years: [2024, 2025],
    rows: [
      { label: 'Gross domestic product', depth: 2, comp: [0, 0], taxes: [0, 0], gos: [0, 0] },
      { label: 'Mining', depth: 1, comp: [10, 10], taxes: [5, 5], gos: [25, 25] },
      { label: 'Construction', depth: 1, comp: [10, 10], taxes: [1, 1], gos: [4, 4] },
      { label: 'Federal', depth: 1, comp: [10, 10], taxes: [0, 0], gos: [1, 1] },
    ],
  },
  firms: { release: 2023, years: [{ year: 2023, firms: 100, emp: 1000, topFirms: 3, topEmp: 299 }], top: '10000+' },
  income: [{ year: 2025, shares: [3, 8.2, 13.9, 22.5, 52.4], top5: 23.5 }],
  wealth: {
    latest: '2026:Q2',
    quarters: [{ date: '2026:Q2', 'Net worth': { TopPt1: 0.15, RemainingTop1: 0.17, Bottom50: 0.023 }, 'Corporate equities and mutual fund shares': { TopPt1: 0.25, RemainingTop1: 0.26, Bottom50: 0.006 } }],
  },
  lobbying: {
    year: 2025,
    orgs: [
      { side: 'business', dollars: 70_000_000 },
      { side: 'business', dollars: 30_000_000 },
      { side: 'labor', dollars: 3_400_000 },
      { side: 'labor', dollars: 1_600_000 },
    ],
  },
};

test('findings state each section as a number', () => {
  const f = findings(fixture);
  assert.equal(f.hours, 'The manufacturing week: 60 hours in 1890, 41.1 in 2025');
  assert.equal(f.division, 'Of a 41.1-hour manufacturing week in 2025, 13.7 hours match wages and 27.4 match surplus value');
  assert.equal(f.surplus, 'Nonfinancial corporations, 2025: $2.00 of surplus value per dollar of variable capital');
  assert.equal(f.industries, 'Mining: $5.00 of surplus value per dollar of variable capital in 2025. Construction: $0.75');
  assert.equal(f.productivity, 'Since 1964, output per hour has risen 3-fold, real hourly earnings of production and nonsupervisory workers 1.2-fold');
  assert.equal(f.wages, 'Real hourly earnings of production and nonsupervisory workers, in 2025 dollars: $26.27 in 1964, $31.35 in 2025');
  assert.equal(f.minimum, 'In 2025 dollars, the federal minimum wage was highest in 1968: $14.65. It is $7.25');
  assert.equal(f.spread, 'The 90th percentile of weekly earnings is 4.7 times the 10th, 2025');
  assert.equal(f.basket, 'A dozen eggs: 7.4 minutes of work in 1980, 8.1 in 2025');
  assert.equal(f.canal, 'A canal laborer’s day: $0.71 in 1828, $1.25 in 1881');
  assert.equal(f.composition, '$8.00 of constant capital for every dollar of variable capital, 2025');
  assert.equal(f.profit, 'Rate of profit: 25% in 2025. Highest: 25% in 2025. Lowest: 20% in 1972');
  assert.equal(f.concentration, '3 firms with 10,000 or more employees employ 29.9% of private-sector workers, 2023');
  assert.equal(f.finance, 'Financial corporations: 25% of domestic corporate profits, 2025');
  assert.equal(f.unemployment, 'Unemployment: 24.9% in 1933, 4% in September 2026');
  assert.equal(f.layers, '13.9 million people unemployed, part time for economic reasons or marginally attached, 2025');
  assert.equal(f.duration, '23.2% of the unemployed had looked for work for 27 weeks or more, 2025');
  assert.equal(f.class, '93.9% of the employed work for wages or salaries, against 78.6% in 1948');
  assert.equal(f.enslaved, '1860: 2,340,000 of 11,110,000 workers, 21.1%, were enslaved');
  assert.equal(f.income, 'Compensation: 60.8% of national income in 2025, of which production and nonsupervisory pay 24.3%. Corporate profits: 15.6%');
  assert.equal(f.households, 'The top fifth of households received 52.4% of income in 2025; the bottom fifth 3%');
  assert.equal(f.wealth, 'The top 1% hold 32% of net worth and 51% of corporate equities and fund shares, 2026:Q2');
  assert.equal(f.taxes, 'Corporate income taxes: 33% of federal receipts in 1929, 7.8% in 2025');
  assert.equal(f.unions, 'Union members: 10% of wage and salary workers in 2025, against 35.5% of nonfarm employment in 1945');
  assert.equal(f.strikes, '30 major work stoppages in 2025; 470 in 1952');
  assert.equal(f.issues, '1881 to 1905: 53.8% of stoppages were over wages and hours');
  assert.equal(f.injury, 'Coal mining deaths: 3,242 in 1907, 8 in 2025');
  assert.equal(f.fatal, '5,070 fatal work injuries in 2024');
  assert.equal(f.lobbying, 'Business groups here reported $100M in lobbying in 2025; the unions here, $5M');
  assert.match(f.history, /^\d+ events, 1806 to \d{4}$/);
});

test('real snapshot gives every finding as text without filler words', () => {
  const f = findings(snapshot);
  assert.ok(Object.keys(f).length >= 30);
  for (const [key, text] of Object.entries(f)) {
    assert.equal(typeof text, 'string', key);
    assert.ok(text.length > 10 && text.length < 130, `${key}: ${text}`);
    assert.doesNotMatch(text, /NaN|undefined|null|Infinity/, `${key}: ${text}`);
    assert.doesNotMatch(text, /\b(only|just|mere|merely|soar\w*|plung\w*|stagger\w*|shock\w*)\b/i, `${key}: ${text}`);
  }
});
