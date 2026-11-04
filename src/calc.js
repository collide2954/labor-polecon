export const series = (snap, id) => {
  const pairs = snap.bls?.[id]?.annual ?? snap.nipa?.[id]?.years ?? snap.fixed?.[id]?.years ?? [];
  return new Map(pairs);
};

const PARTS = { taxesProd: 'W325RC', interest: 'B471RC', transfers: 'W327RC', profitTax: 'B465RC', dividends: 'B467RC', retained: 'W332RC' };

export const accounts = (snap) => {
  const nva = series(snap, 'A457RC');
  const v = series(snap, 'A460RC');
  const wages = series(snap, 'B461RC');
  const stock = series(snap, 'k1pnofi2es00');
  const parts = Object.fromEntries(Object.entries(PARTS).map(([k, code]) => [k, series(snap, code)]));
  return [...nva.keys()].filter((year) => v.has(year)).map((year) => {
    const s = nva.get(year) - v.get(year);
    const C = stock.get(year - 1) ?? null;
    return {
      year,
      nva: nva.get(year),
      v: v.get(year),
      wages: wages.get(year) ?? null,
      s,
      rate: s / v.get(year),
      C,
      composition: C ? C / v.get(year) : null,
      profit: C ? s / C : null,
      parts: Object.fromEntries(Object.entries(parts).map(([k, m]) => [k, m.get(year) ?? null])),
    };
  });
};

export const workday = (hours, rate) => {
  const necessary = hours / (1 + rate);
  return { necessary, surplus: hours - necessary };
};

export const deflate = (value, cpiThen, cpiNow) => value * (cpiNow / cpiThen);

export const cpiIn = (snap, year, value, to) => {
  const cpi = series(snap, 'CUUR0000SA0');
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

export const industrySurplus = (row, i) => {
  const comp = row.comp[i];
  if (!comp) return null;
  return (row.taxes[i] + row.gos[i]) / comp;
};

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

export const nationalIncome = (snap) => split(snap, 'A032RC', [
  ['comp', 'A033RC'], ['proprietors', 'A041RC'], ['rent', 'A048RC'], ['profits', 'A051RC'], ['interest', 'W255RC'], ['taxes', 'W056RC'],
]);

export const federalReceipts = (snap) => split(snap, 'W005RC', [
  ['personal', 'A074RC'], ['social', 'W780RC'], ['corporate', 'B075RC'], ['production', 'W007RC'],
]);

export const peak = (rows, key, dir = 'max') => rows.reduce((a, b) => {
  if (dir === 'max') return b[key] > a[key] ? b : a;
  return b[key] < a[key] ? b : a;
});

export const ratioSeries = (a, b) => [...a.keys()].filter((k) => b.has(k) && b.get(k)).map((k) => [k, a.get(k) / b.get(k)]);
