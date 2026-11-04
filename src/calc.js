import { PRODUCTIVE, INDUSTRY_SERIES } from './queries.js';

export const series = (snap, id) => {
  const pairs = snap.bls?.[id]?.annual ?? snap.nipa?.[id]?.years ?? snap.fixed?.[id]?.years ?? snap.z1?.[id]?.years ?? [];
  return new Map(pairs);
};

export const WEEK = 365.25 / 7;

const yearly = (weekly) => (weekly * WEEK) / 1000;

const sumOf = (snap, ids, year) => {
  const values = ids.map((id) => series(snap, id).get(year));
  return values.every((v) => v !== undefined && v !== null) ? values.reduce((a, b) => a + b, 0) : null;
};

const productivePayroll = (snap) => {
  const all = series(snap, PRODUCTIVE.total);
  const out = new Map();
  for (const [year, v] of all) {
    const less = sumOf(snap, PRODUCTIVE.less, year);
    if (less !== null) out.set(year, yearly(v - less));
  }
  return out;
};

const wagesOutsideFinance = (snap) => {
  const exact = (y) => sumOf(snap, ['A4103C'], y) - sumOf(snap, ['N4159C', 'N4164C'], y);
  const rough = (y) => sumOf(snap, ['A132RC'], y) - (sumOf(snap, ['A443RC'], y) - sumOf(snap, ['B461RC'], y));
  const naics = [...series(snap, 'A4103C').keys()].filter((y) => sumOf(snap, ['N4159C', 'N4164C'], y) !== null);
  const first = Math.min(...naics);
  const scale = exact(first) / rough(first);
  const out = new Map();
  for (const year of series(snap, 'A132RC').keys()) {
    if (naics.includes(year)) out.set(year, exact(year));
    else if (sumOf(snap, ['A443RC', 'B461RC'], year) !== null) out.set(year, rough(year) * scale);
  }
  return out;
};

export const productiveShare = (snap) => {
  const pay = productivePayroll(snap);
  const wages = wagesOutsideFinance(snap);
  return new Map([...pay].filter(([y]) => wages.get(y)).map(([y, v]) => [y, v / wages.get(y)]));
};

const PARTS = { taxesProd: 'W325RC', interest: 'B471RC', transfers: 'W327RC', profitTax: 'B465RC', dividends: 'B467RC', retained: 'W332RC' };

export const accounts = (snap) => {
  const nva = series(snap, 'A457RC');
  const comp = series(snap, 'A460RC');
  const fixed = series(snap, 'k1pnofi2es00');
  const stock = series(snap, 'LM105020015');
  const share = productiveShare(snap);
  const parts = Object.fromEntries(Object.entries(PARTS).map(([k, code]) => [k, series(snap, code)]));
  return [...nva.keys()].filter((year) => comp.has(year) && share.has(year)).map((year) => {
    const v = comp.get(year) * share.get(year);
    const s = nva.get(year) - v;
    const f = fixed.get(year - 1) ?? null;
    const i = stock.get(year - 1) ?? null;
    const C = f !== null && i !== null ? f + i : null;
    return {
      year,
      nva: nva.get(year),
      comp: comp.get(year),
      share: share.get(year),
      v,
      s,
      rate: s / v,
      fixed: f,
      stock: i,
      C,
      composition: C ? C / v : null,
      profit: C ? s / C : null,
      parts: { otherPay: comp.get(year) - v, ...Object.fromEntries(Object.entries(parts).map(([k, m]) => [k, m.get(year) ?? null])) },
    };
  });
};

export const industryRate = (snap, row, year) => {
  const m = INDUSTRY_SERIES[row.label];
  const i = snap.industries?.years.indexOf(year) ?? -1;
  if (!m || i < 0) return null;
  const payroll = series(snap, m.payroll).get(year);
  const wages = sumOf(snap, m.wages, year);
  const depreciation = sumOf(snap, m.depreciation, year);
  if (payroll === undefined || wages === null || depreciation === null || !row.comp[i]) return null;
  const v = row.comp[i] * (yearly(payroll) / wages);
  const s = row.comp[i] + row.taxes[i] + row.gos[i] - depreciation - v;
  return { v, s, rate: s / v, depreciation };
};

export const workday = (hours, rate) => {
  const necessary = hours / (1 + rate);
  return { necessary, surplus: hours - necessary };
};

export const deflate = (value, cpiThen, cpiNow) => value * (cpiNow / cpiThen);

export const WAGE_PRICES = 'CWUR0000SA0';

export const cpiIn = (snap, year, value, to) => {
  const cpi = series(snap, WAGE_PRICES);
  const last = to ?? Math.max(...cpi.keys());
  return deflate(value, cpi.get(year), cpi.get(last));
};

const DAY = 864e5;
const utc = (date) => {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

export const minWageYear = (steps, year) => {
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  let weighted = 0;
  let days = 0;
  steps.forEach((step, i) => {
    const from = Math.max(utc(step.date), start);
    const to = Math.min(steps[i + 1] ? utc(steps[i + 1].date) : end, end);
    if (to <= from) return;
    weighted += step.rate * ((to - from) / DAY);
    days += (to - from) / DAY;
  });
  return days ? weighted / days : null;
};

export const minutes = (price, wage) => (wage > 0 ? (price / wage) * 60 : null);

const sum = (snap, ids, year) => ids.reduce((n, id) => n + (series(snap, id).get(year) ?? 0), 0);

export const classShares = (snap) => {
  const employed = series(snap, 'LNU02000000');
  return [...employed.keys()].filter((y) => series(snap, 'LNU02032187').has(y)).map((year) => {
    const total = employed.get(year);
    return {
      year,
      wage: sum(snap, ['LNU02032184', 'LNU02032187'], year) / total,
      self: sum(snap, ['LNU02032185', 'LNU02032192'], year) / total,
      unpaid: sum(snap, ['LNU02032186', 'LNU02032193'], year) / total,
    };
  });
};

export const reserveLayers = (snap) => {
  const marginal = series(snap, 'LNU05026642');
  return [...marginal.keys()].map((year) => {
    const unemployed = series(snap, 'LNU03000000').get(year);
    const partTime = series(snap, 'LNU02032194').get(year);
    const discouraged = series(snap, 'LNU05026645').get(year);
    return {
      year, unemployed, partTime, marginal: marginal.get(year) - discouraged, discouraged, total: unemployed + partTime + marginal.get(year),
    };
  });
};

export const perThousand = (count, base) => count / (base / 1000);

export const shares = (values) => {
  const total = values.reduce((a, b) => a + b, 0);
  return values.map((v) => v / total);
};

const split = (snap, totalCode, parts) => {
  const total = series(snap, totalCode);
  return [...total.keys()].map((year) => {
    const all = total.get(year);
    const rows = parts.map(([key, code]) => ({ key, value: series(snap, code).get(year) ?? 0 }));
    rows.push({ key: 'other', value: all - rows.reduce((n, r) => n + r.value, 0) });
    return { year, total: all, parts: rows.map((r) => ({ ...r, share: r.value / all })) };
  });
};

export const nationalIncome = (snap) => {
  const payroll = series(snap, PRODUCTIVE.total);
  const comp = series(snap, 'A033RC');
  const wages = series(snap, 'A034RC');
  return split(snap, 'A032RC', [
    ['comp', 'A033RC'], ['proprietors', 'A041RC'], ['rent', 'A048RC'], ['profits', 'A051RC'], ['interest', 'W255RC'], ['taxes', 'W056RC'],
  ]).map((r) => {
    const pay = payroll.get(r.year);
    return { ...r, workers: pay !== undefined && wages.get(r.year) ? (yearly(pay) * (comp.get(r.year) / wages.get(r.year))) / r.total : null };
  });
};

export const federalReceipts = (snap) => split(snap, 'W005RC', [
  ['personal', 'A074RC'], ['social', 'W780RC'], ['corporate', 'B075RC'], ['production', 'W007RC'],
]);

export const peak = (rows, key, dir = 'max') => rows.reduce((a, b) => {
  if (dir === 'max') return b[key] > a[key] ? b : a;
  return b[key] < a[key] ? b : a;
});

export const ratioSeries = (a, b) => [...a.keys()].filter((k) => b.has(k) && b.get(k)).map((k) => [k, a.get(k) / b.get(k)]);

export const percentOf = (snap, parts, totalId) => {
  const total = series(snap, totalId);
  return [...total.keys()].sort((a, b) => a - b)
    .map((year) => [year, sumOf(snap, parts, year)])
    .filter(([year, v]) => v !== null && total.get(year))
    .map(([year, v]) => [year, (v / total.get(year)) * 100]);
};

export const prisonRates = (snap, early) => {
  const pop = series(snap, 'B230RC');
  const later = (snap.prisons?.years ?? []).filter(([year]) => pop.get(year))
    .map(([year, prisoners]) => ({ year, prisoners, rate: (prisoners / (pop.get(year) * 1000)) * 1e5 }));
  const first = later[0]?.year ?? Infinity;
  return [...early.filter(([year]) => year < first).map(([year, prisoners, rate]) => ({ year, prisoners, rate })), ...later];
};

export const worldShares = (snap, indicator) => {
  const data = snap.world?.[indicator] ?? {};
  const world = new Map(data.WLD ?? []);
  return Object.fromEntries(Object.entries(data).filter(([c]) => c !== 'WLD')
    .map(([c, rows]) => [c, rows.filter(([y]) => world.get(y)).map(([y, v]) => [y, (v / world.get(y)) * 100])]));
};
