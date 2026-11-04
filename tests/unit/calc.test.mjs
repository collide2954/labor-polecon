import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  accounts, workday, deflate, minWageYear, minutes, classShares, reserveLayers, perThousand, shares,
  nationalIncome, federalReceipts, peak, series, cpiIn, ratioSeries, productiveShare, industryRate, WEEK, prisonRates, worldShares, percentOf,
  lawsInForce, perResidents,
} from '../../src/calc.js';

const close = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

const nipa = (pairs) => ({ years: pairs });

const SNAP = {
  nipa: {
    A457RC: nipa([[2024, 1000], [2025, 1200]]),
    A460RC: nipa([[2024, 600], [2025, 700]]),
    B461RC: nipa([[2024, 500], [2025, 580]]),
    W325RC: nipa([[2024, 50], [2025, 60]]),
    W326RC: nipa([[2024, 350], [2025, 440]]),
    B471RC: nipa([[2024, 40], [2025, 50]]),
    W327RC: nipa([[2024, 10], [2025, 10]]),
    A463RC: nipa([[2024, 300], [2025, 380]]),
    B465RC: nipa([[2024, 60], [2025, 70]]),
    W328RC: nipa([[2024, 240], [2025, 310]]),
    B467RC: nipa([[2024, 140], [2025, 160]]),
    W332RC: nipa([[2024, 100], [2025, 150]]),
    A032RC: nipa([[2025, 2000]]),
    A033RC: nipa([[2025, 1200]]),
    A041RC: nipa([[2025, 200]]),
    A048RC: nipa([[2025, 100]]),
    A051RC: nipa([[2025, 300]]),
    W255RC: nipa([[2025, 50]]),
    W056RC: nipa([[2025, 100]]),
    W005RC: nipa([[2025, 500]]),
    A074RC: nipa([[2025, 250]]),
    W780RC: nipa([[2025, 150]]),
    B075RC: nipa([[2025, 50]]),
    W007RC: nipa([[2025, 25]]),
    A034RC: nipa([[2025, 1000]]),
    A4103C: nipa([[2025, 120]]),
    N4159C: nipa([[2025, 10]]),
    N4164C: nipa([[2025, 5]]),
    A132RC: nipa([[2024, 110], [2025, 118]]),
    A443RC: nipa([[2024, 520], [2025, 601]]),
    N4107C: nipa([[2025, 15]]),
  },
  fixed: { k1pnofi2es00: { years: [[2023, 2000], [2024, 2400], [2025, 2500]] }, m1n21001es00: { years: [[2025, 4]] } },
  z1: { LM105020015: { years: [[2023, 400], [2024, 500]] } },
  industries: { years: [2024, 2025], rows: [{ label: 'Mining', depth: 1, comp: [10, 20], taxes: [1, 2], gos: [9, 18] }] },
  bls: {
    CUUR0000SA0: { annual: [[1968, 34.8], [2025, 321.943]] },
    CWUR0000SA0: { annual: [[1968, 35], [2025, 315.285]] },
    CEU0500000082: { annual: [[2024, 1400], [2025, 1610]] },
    CEU4142000082: { annual: [[2024, 100], [2025, 100]] },
    CEU4200000082: { annual: [[2024, 150], [2025, 150]] },
    CEU5500000082: { annual: [[2024, 50], [2025, 60]] },
    CEU1021000082: { annual: [[2025, 140]] },
    LNU02000000: { annual: [[2025, 1000]] },
    LNU02032184: { annual: [[2025, 10]] },
    LNU02032187: { annual: [[2025, 890]] },
    LNU02032185: { annual: [[2025, 5]] },
    LNU02032192: { annual: [[2025, 90]] },
    LNU02032186: { annual: [[2025, 1]] },
    LNU02032193: { annual: [[2025, 4]] },
    LNU03000000: { annual: [[2025, 7000]] },
    LNU02032194: { annual: [[2025, 4800]] },
    LNU05026642: { annual: [[2025, 1700]] },
    LNU05026645: { annual: [[2025, 500]] },
  },
};

test('series reads BLS and BEA pairs into maps', () => {
  assert.equal(series(SNAP, 'A460RC').get(2025), 700);
  assert.equal(series(SNAP, 'k1pnofi2es00').get(2023), 2000);
  assert.equal(series(SNAP, 'CUUR0000SA0').get(1968), 34.8);
  assert.equal(series(SNAP, 'LM105020015').get(2024), 500);
  assert.equal(series(SNAP, 'NOPE').size, 0);
});

test('productiveShare divides productive payroll by private wages outside finance and real estate', () => {
  const share = productiveShare(SNAP);
  const scale = 105 / 97;
  assert.ok(close(WEEK, 365.25 / 7));
  assert.ok(close(share.get(2025), ((1300 * WEEK) / 1000) / 105));
  assert.ok(close(share.get(2024), ((1100 * WEEK) / 1000) / (90 * scale)));
});

test('accounts count only productive pay as variable capital and divide by fixed capital and inventories', () => {
  const [a, b] = accounts(SNAP);
  const r24 = productiveShare(SNAP).get(2024);
  assert.equal(a.year, 2024);
  assert.equal(a.comp, 600);
  assert.ok(close(a.v, 600 * r24));
  assert.ok(close(a.s, 1000 - 600 * r24));
  assert.ok(close(a.rate, a.s / a.v));
  assert.equal(a.fixed, 2000);
  assert.equal(a.stock, 400);
  assert.equal(a.C, 2400);
  assert.ok(close(a.composition, 2400 / a.v));
  assert.ok(close(a.profit, a.s / 2400));
  assert.equal(b.C, 2900);
  assert.deepEqual(Object.keys(b.parts), ['otherPay', 'taxesProd', 'interest', 'transfers', 'profitTax', 'dividends', 'retained']);
  assert.ok(close(b.parts.otherPay, 700 - b.v));
  assert.ok(close(Object.values(b.parts).reduce((x, y) => x + y, 0), b.s));
});

test('industryRate takes depreciation out and counts productive pay as variable capital', () => {
  const row = SNAP.industries.rows[0];
  const v = 20 * (((140 * WEEK) / 1000) / 15);
  const r = industryRate(SNAP, row, 2025);
  assert.ok(close(r.v, v));
  assert.equal(r.depreciation, 4);
  assert.ok(close(r.s, 20 + 2 + 18 - 4 - v));
  assert.ok(close(r.rate, r.s / r.v));
  assert.equal(industryRate(SNAP, row, 2024), null);
  assert.equal(industryRate(SNAP, { ...row, label: 'Retail trade' }, 2025), null);
});

test('workday divides the hours in the ratio of wages to surplus', () => {
  const d = workday(40, 0.5);
  assert.ok(close(d.necessary, 40 / 1.5));
  assert.ok(close(d.necessary + d.surplus, 40));
  assert.ok(close(d.surplus / d.necessary, 0.5));
});

test('deflate and cpiIn restate wages in another year’s prices for wage earners', () => {
  assert.ok(close(deflate(1.6, 34.8, 321.943), 1.6 * (321.943 / 34.8)));
  assert.ok(close(cpiIn(SNAP, 1968, 1.6), 1.6 * (315.285 / 35)));
});

const STEPS = [
  { date: '1938-10-24', rate: 0.25 },
  { date: '1939-10-24', rate: 0.3 },
  { date: '2009-07-24', rate: 7.25 },
];

test('minWageYear averages each rate over the days it was in effect', () => {
  assert.equal(minWageYear(STEPS, 1937), null);
  assert.equal(minWageYear(STEPS, 1938), 0.25);
  const days1939 = (Date.UTC(1939, 9, 24) - Date.UTC(1939, 0, 1)) / 864e5;
  assert.ok(close(minWageYear(STEPS, 1939), (0.25 * days1939 + 0.3 * (365 - days1939)) / 365));
  assert.equal(minWageYear(STEPS, 2025), 7.25);
});

test('minutes converts a price into minutes of work at an hourly wage', () => {
  assert.equal(minutes(4.5, 30), 9);
  assert.equal(minutes(1, 0), null);
});

test('classShares splits the employed by class of worker', () => {
  const [r] = classShares(SNAP);
  assert.equal(r.year, 2025);
  assert.ok(close(r.wage, 0.9));
  assert.ok(close(r.self, 0.095));
  assert.ok(close(r.unpaid, 0.005));
});

test('reserveLayers separates discouraged from other marginally attached workers', () => {
  assert.deepEqual(reserveLayers(SNAP), [{ year: 2025, unemployed: 7000, partTime: 4800, marginal: 1200, discouraged: 500, total: 13500 }]);
});

test('perThousand and shares', () => {
  assert.equal(perThousand(8, 62246), 8 / 62.246);
  assert.deepEqual(shares([1, 3]), [0.25, 0.75]);
});

test('nationalIncome and federalReceipts give each part and the remainder as shares', () => {
  const [ni] = nationalIncome(SNAP);
  assert.equal(ni.year, 2025);
  assert.deepEqual(ni.parts.map((p) => p.key), ['comp', 'proprietors', 'rent', 'profits', 'interest', 'taxes', 'other']);
  assert.ok(close(ni.parts.reduce((n, p) => n + p.share, 0), 1));
  assert.ok(close(ni.parts.find((p) => p.key === 'comp').share, 0.6));
  assert.ok(close(ni.parts.find((p) => p.key === 'other').share, 0.025));
  assert.ok(close(ni.workers, ((1610 * WEEK) / 1000) * 1.2 / 2000));
  const [fr] = federalReceipts(SNAP);
  assert.ok(close(fr.parts.find((p) => p.key === 'personal').share, 0.5));
  assert.ok(close(fr.parts.find((p) => p.key === 'other').share, 0.05));
});

test('peak and ratioSeries', () => {
  assert.deepEqual(peak([{ y: 1, v: 3 }, { y: 2, v: 9 }, { y: 3, v: 9 }], 'v'), { y: 2, v: 9 });
  assert.deepEqual(peak([{ y: 1, v: 3 }, { y: 2, v: 1 }], 'v', 'min'), { y: 2, v: 1 });
  assert.deepEqual(ratioSeries(new Map([[1, 4], [2, 9]]), new Map([[1, 2], [3, 3]])), [[1, 2]]);
});

test('prisonRates keeps the published rates and divides later counts by the midyear population', () => {
  const snap = { prisons: { years: [[1978, 294396], [1979, 301470]] }, nipa: { B230RC: nipa([[1978, 222585], [1979, 225055]]) } };
  const rows = prisonRates(snap, [[1977, 285456, 129]]);
  assert.deepEqual(rows.map((r) => r.year), [1977, 1978, 1979]);
  assert.equal(rows[0].rate, 129);
  assert.ok(close(rows[1].rate, (294396 / 222585000) * 1e5));
  assert.equal(rows[2].prisoners, 301470);
});

test('worldShares divides each economy by the world total, year by year', () => {
  const snap = { world: { X: { USA: [[1960, 40], [1961, 41]], CHN: [[1960, 5]], WLD: [[1960, 100], [1961, 120]] } } };
  assert.deepEqual(worldShares(snap, 'X'), { USA: [[1960, 40], [1961, 41 / 120 * 100]], CHN: [[1960, 5]] });
});

test('percentOf adds parts and divides by a total where both exist', () => {
  assert.deepEqual(percentOf(SNAP, ['A033RC', 'A041RC'], 'A032RC'), [[2025, 70]]);
});

test('lawsInForce counts laws enacted by a year and not yet ended', () => {
  const rows = [[1947, 'A', null], [2012, 'B', 2024], [2015, 'C', null]];
  assert.equal(lawsInForce(rows, 1946), 0);
  assert.equal(lawsInForce(rows, 2012), 2);
  assert.equal(lawsInForce(rows, 2023), 3);
  assert.equal(lawsInForce(rows, 2024), 2);
});

test('perResidents divides each count by the midyear population where there is one', () => {
  const snap = { nipa: { B230RC: nipa([[1993, 260000], [2021, 332048]]) } };
  const out = perResidents(snap, [[1993, 480925, 181372], [1994, 1, 1], [2021, 628620, 253888]]);
  assert.deepEqual(out.map((r) => r.year), [1993, 2021]);
  assert.deepEqual(out[0].counts, [480925, 181372]);
  assert.ok(close(out[0].rates[0], 18.4971153846, 1e-6));
  assert.ok(close(out[1].rates[1], 7.6460, 1e-4));
  assert.ok(close(perResidents(snap, [[1993, 260]], 1e5)[0].rates[0], 0.1));
});
