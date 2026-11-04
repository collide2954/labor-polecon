import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  accounts, workday, deflate, minWageYear, minutes, industrySurplus, classShares, reserveLayers, perThousand, shares,
  nationalIncome, federalReceipts, peak, series, cpiIn, ratioSeries,
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
  },
  fixed: { k1pnofi2es00: { years: [[2023, 2000], [2024, 2400], [2025, 2500]] } },
  bls: {
    CUUR0000SA0: { annual: [[1968, 34.8], [2025, 321.943]] },
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
  assert.equal(series(SNAP, 'NOPE').size, 0);
});

test('accounts splits net value added into wages and surplus and divides by capital', () => {
  const [a, b] = accounts(SNAP);
  assert.equal(a.year, 2024);
  assert.equal(a.s, 400);
  assert.ok(close(a.rate, 400 / 600));
  assert.equal(a.C, 2000);
  assert.ok(close(a.composition, 2000 / 600));
  assert.ok(close(a.profit, 400 / 2000));
  assert.equal(b.s, 500);
  assert.equal(b.C, 2400);
  assert.deepEqual(b.parts, { taxesProd: 60, interest: 50, transfers: 10, profitTax: 70, dividends: 160, retained: 150 });
  assert.equal(Object.values(b.parts).reduce((x, y) => x + y, 0), b.s);
});

test('workday divides the hours in the ratio of wages to surplus', () => {
  const d = workday(40, 0.5);
  assert.ok(close(d.necessary, 40 / 1.5));
  assert.ok(close(d.necessary + d.surplus, 40));
  assert.ok(close(d.surplus / d.necessary, 0.5));
});

test('deflate and cpiIn restate dollars in another year’s prices', () => {
  assert.ok(close(deflate(1.6, 34.8, 321.943), 1.6 * (321.943 / 34.8)));
  assert.ok(close(cpiIn(SNAP, 1968, 1.6), 1.6 * (321.943 / 34.8)));
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

test('industrySurplus is value added less compensation per dollar of compensation', () => {
  const row = { comp: [2, 4], taxes: [1, 1], gos: [5, 7] };
  assert.equal(industrySurplus(row, 0), 3);
  assert.equal(industrySurplus(row, 1), 2);
  assert.equal(industrySurplus({ comp: [0], taxes: [0], gos: [1] }, 0), null);
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
  const [fr] = federalReceipts(SNAP);
  assert.ok(close(fr.parts.find((p) => p.key === 'personal').share, 0.5));
  assert.ok(close(fr.parts.find((p) => p.key === 'other').share, 0.05));
});

test('peak and ratioSeries', () => {
  assert.deepEqual(peak([{ y: 1, v: 3 }, { y: 2, v: 9 }, { y: 3, v: 9 }], 'v'), { y: 2, v: 9 });
  assert.deepEqual(peak([{ y: 1, v: 3 }, { y: 2, v: 1 }], 'v', 'min'), { y: 2, v: 1 });
  assert.deepEqual(ratioSeries(new Map([[1, 4], [2, 9]]), new Map([[1, 2], [3, 3]])), [[1, 2]]);
});
