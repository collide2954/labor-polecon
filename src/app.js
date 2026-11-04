import snapshot from './snapshot.js';
import {
  SOURCES, SOURCE_TITLES, SOURCE_GROUPS, TIMELINE, TAGS, PEOPLE, AGENCIES, EXAMPLES, CADENCES, TERMS, COAL, HIST,
} from './facts.js';
import {
  exact, compact, pct, usd, cents, identify, matches, filterTimeline, sortRows, LENSES, readLens, inLens, lensSearch, yearOf,
  BLS_SURVEYS,
} from './lib.js';
import {
  PRICES, LOBBY, DFA_GROUPS, BLS_SERIES, NIPA, FIXED,
} from './queries.js';
import {
  findings, realMinimum, realEarnings, industryRates, records,
} from './findings.js';
import {
  series, accounts, workday, minutes, classShares, reserveLayers, nationalIncome, federalReceipts, perThousand, deflate, peak, WAGE_PRICES,
} from './calc.js';
import {
  columns, dotplot, stackedArea, miniArea, waffle, lines, timeline, observeFigures, countUp, tipLines, dumbbell, splitBars,
} from './charts.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const h = (tag, props = {}, ...kids) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid !== null && kid !== undefined && kid !== false) node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return node;
};

const ext = (href, text, props = {}) => h('a', { href, target: '_blank', rel: 'noopener', ...props }, text);
const cite = (key) => ext(SOURCES[key], 'source', { class: 'src', title: SOURCES[key] });
const fill = (sel, ...nodes) => $(sel).replaceChildren(...nodes);
const CAT = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--data)', 'var(--data-2)'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const bls = (id) => `https://data.bls.gov/timeseries/${id}`;
const pts = (map, f = (v) => v) => [...map].sort((a, b) => a[0] - b[0]).map(([x, v]) => ({ x, y: f(v) }));
const lastOf = (map) => {
  const year = Math.max(...map.keys());
  return [year, map.get(year)];
};
const firstOf = (map) => {
  const year = Math.min(...map.keys());
  return [year, map.get(year)];
};
const month = (l) => `${MONTHS[Number(l.period.slice(1)) - 1]} ${l.year}`;
const percent = (v) => `${Number(v.toFixed(1))}%`;
const hrs = (v) => `${Number(v.toFixed(1))}`;
const dollars = (v) => `$${exact(v)}`;

const F = findings(snapshot);
const ACC = accounts(snapshot);
const LAST = ACC.at(-1);
const CPI = series(snapshot, WAGE_PRICES);
const [CPI_YEAR, CPI_NOW] = lastOf(CPI);
const real = (value, year) => deflate(value, CPI.get(year), CPI_NOW);

const state = { query: '', tags: new Set(), lens: 'all' };

const renderHead = () => {
  const day = new Date(snapshot.generated).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  $('#stamp').textContent = `Data as of ${day}. Rebuilt every Sunday from BLS, BEA, Census, the Federal Reserve and lobbying disclosures.`;
  for (const node of $$('[data-finding]')) node.textContent = F[node.dataset.finding];
};

const renderLede = () => {
  const [year, nonag] = lastOf(series(snapshot, 'LNU02032187'));
  const workers = (nonag + series(snapshot, 'LNU02032184').get(year)) * 1000;
  countUp($('[data-hero="workers"]'), workers);
  const b = (text) => h('b', {}, text);
  const top1 = snapshot.wealth.quarters.at(-1)['Net worth'];
  fill('#lede-text',
    `In ${LAST.year} nonfinancial corporations paid `, b(`${usd(LAST.v * 1e6)} to production and nonsupervisory workers`), ' out of ', b(`${usd(LAST.nva * 1e6)} of net value added`),
    ', leaving ', b(`${usd(LAST.s * 1e6)} of surplus value`), ': ', b(`${cents(LAST.rate)} for every dollar of variable capital`),
    `. The top 1% of households hold ${pct(top1.TopPt1 + top1.RemainingTop1)} of net worth; the bottom half hold ${pct(top1.Bottom50)}.`);
  const ue = snapshot.bls.LNU04000000.latest;
  const u6 = snapshot.bls.LNU03327709.latest;
  const items = [
    [`Unemployed, ${month(ue)}`, `${ue.value}%`, null],
    [`U-6, ${month(u6)}`, `${u6.value}%`, null],
    [`Union members, ${lastOf(series(snapshot, 'LUU0204899600'))[0]}`, `${lastOf(series(snapshot, 'LUU0204899600'))[1]}%`, null],
    [`Major strikes, ${lastOf(series(snapshot, 'WSU100'))[0]}`, exact(lastOf(series(snapshot, 'WSU100'))[1]), null],
    [`Killed at work, ${lastOf(series(snapshot, 'FAU00X00000080N00'))[0]}`, exact(lastOf(series(snapshot, 'FAU00X00000080N00'))[1]), null],
    [`Rate of profit, ${LAST.year}`, pct(LAST.profit), null],
  ];
  fill('#ticker', ...items.map(([label, value]) => h('div', {}, h('dt', {}, label), h('dd', {}, value))));
};

const renderHours = () => {
  const rees = HIST.hoursRees.rows.map(([x, y]) => ({ x, y }));
  const old = HIST.hoursBls.rows.map(([x, y]) => ({ x, y }));
  const ces = pts(series(snapshot, 'CEU3000000007'));
  const long = peak(ces.map((p) => ({ ...p })), 'y');
  $('#hours-dek').textContent = `${rees[0].x}: ${rees[0].y} hours a week. ${old[0].x}: ${old[0].y} for production workers. ${ces.at(-1).x}: ${ces.at(-1).y}. The longest week in the BLS series since ${ces[0].x} was ${long.y} hours, in ${long.x}.`;
  const find = (list, yr) => list.find((p) => p.x === yr);
  lines({
    mount: $('#hours-chart'),
    scale: 'linear',
    yFormat: (v) => String(v),
    labelW: 112,
    series: [
      { label: 'All workers', rows: rees, cls: 'mid' },
      { label: 'Production', rows: old, cls: 'soft' },
      { label: 'BLS, 1939 on', rows: ces, alt: true },
    ],
    aria: 'Average weekly hours in manufacturing, 1890 to now',
    describe: (yr) => tipLines(String(yr), 'average weekly hours, manufacturing',
      find(rees, yr) ? `All workers ${find(rees, yr).y} (D 765)` : null,
      find(old, yr) ? `Production workers ${find(old, yr).y} (D 803)` : null,
      find(ces, yr) ? `BLS ${find(ces, yr).y}` : null,
      find(ces, yr) ? { href: bls('CEU3000000007'), text: 'Open at BLS' } : { href: SOURCES.hsus, text: 'Historical Statistics' }),
  });
  const ot = pts(series(snapshot, 'CEU3000000009'));
  lines({
    mount: $('#overtime-chart'), scale: 'linear', yFormat: (v) => String(v), height: 220, labelW: 70,
    series: [{ label: 'Overtime', rows: ot, alt: true }],
    aria: 'Average weekly overtime hours in manufacturing',
    describe: (yr) => tipLines(`${find(ot, yr).y} hours`, `overtime per week, ${yr}`, { href: bls('CEU3000000009'), text: 'Open at BLS' }),
  });
  const jobs = pts(series(snapshot, 'LNU02026620'));
  const count = series(snapshot, 'LNU02026619');
  lines({
    mount: $('#jobs-chart'), scale: 'linear', yFormat: (v) => `${v}%`, height: 220, labelW: 70,
    series: [{ label: 'Two jobs+', rows: jobs }],
    aria: 'Multiple jobholders as a percent of the employed',
    describe: (yr) => tipLines(`${find(jobs, yr).y}%`, `of the employed, ${yr}`, `${exact(count.get(yr) * 1000)} people`, { href: bls('LNU02026620'), text: 'Open at BLS' }),
  });
};

const weekHours = (year) => {
  if (year < 1939) return HIST.hoursBls.rows.find((r) => r[0] === year)?.[1] ?? null;
  return series(snapshot, 'CEU3000000007').get(year) ?? null;
};

const renderDivision = () => {
  const years = [...new Set([...ACC.map((r) => r.year).filter((y) => y % 5 === 0), LAST.year])];
  const rows = years.map((year) => {
    const r = ACC.find((a) => a.year === year);
    const hours = weekHours(year);
    if (!r || hours === null) return null;
    const d = workday(hours, r.rate);
    return { key: year, label: String(year), a: d.necessary, b: d.surplus, hours, rate: r.rate };
  }).filter(Boolean);
  const first = rows[0];
  const most = peak(rows, 'b');
  const least = peak(rows, 'b', 'min');
  $('#division-dek').textContent = `${first.key}: ${hrs(first.b)} of ${first.hours} hours matched surplus value. Most in the years shown: ${hrs(most.b)} hours in ${most.key}. Fewest: ${hrs(least.b)} in ${least.key}.`;
  splitBars({
    mount: $('#division-chart'),
    rows,
    labels: ['Hours matching wages', 'Hours matching surplus value'],
    aria: 'The manufacturing week divided in the ratio of wages to surplus value',
    describe: (r) => tipLines(`${r.hours} hours`, `manufacturing week, ${r.key}`, `${hrs(r.a)} hours match wages`, `${hrs(r.b)} hours match surplus value`, `${cents(r.rate)} of surplus value per dollar of variable capital`),
  });
};

const PART_LABELS = {
  otherPay: 'Supervisory, managerial and trade pay',
  taxesProd: 'Taxes on production', interest: 'Net interest', transfers: 'Business transfers', profitTax: 'Corporate income tax', dividends: 'Dividends', retained: 'Undistributed profits',
};

const renderSurplus = () => {
  const rate = ACC.map((r) => ({ x: r.year, y: r.rate, r }));
  const hi = peak(rate, 'y');
  const lo = peak(rate, 'y', 'min');
  $('#surplus-dek').textContent = `Nonfinancial corporations, ${LAST.year}: ${usd(LAST.nva * 1e6)} of net value added. Variable capital, the pay of production and nonsupervisory workers outside trade, finance and real estate: ${usd(LAST.v * 1e6)}, ${pct(LAST.share)} of ${usd(LAST.comp * 1e6)} in compensation. Surplus value: ${usd(LAST.s * 1e6)}.`;
  lines({
    mount: $('#rate-chart'),
    scale: 'linear',
    yFormat: (v) => `$${v}`,
    labelW: 70,
    series: [{ label: 's ÷ v', rows: rate, alt: true }],
    annotations: [{ x: hi.x, text: `${hi.x}: ${cents(hi.y)}` }, { x: lo.x, text: `${lo.x}: ${cents(lo.y)}` }],
    aria: 'Rate of surplus value, nonfinancial corporations',
    describe: (yr) => {
      const r = ACC.find((a) => a.year === yr);
      return tipLines(`${cents(r.rate)} per $1 of variable capital`, String(yr), `Net value added ${usd(r.nva * 1e6)}`, `Compensation of all employees ${usd(r.comp * 1e6)}`,
        `Variable capital ${usd(r.v * 1e6)}, ${pct(r.share)}`, `Surplus value ${usd(r.s * 1e6)}`, { href: SOURCES.beaNipa, text: 'NIPA Table 1.14' });
    },
  });
  const negative = ACC.findLast((r) => Object.values(r.parts).some((v) => v < 0));
  const from = negative ? negative.year + 1 : ACC[0].year;
  const rows = ACC.filter((r) => r.year >= from);
  stackedArea({
    mount: $('#parts-chart'),
    years: rows.map((r) => r.year),
    series: Object.keys(PART_LABELS).map((key, i) => ({ key, label: PART_LABELS[key], color: CAT[i], values: rows.map((r) => (r.parts[key] / r.s) * 100) })),
    format: percent,
    max: 100,
    aria: 'Where surplus value goes, percent',
  });
  $('#parts-chart').nextElementSibling.textContent = `Where surplus value goes, ${from} on, percent of the total each year: the pay of supervisors, managers, officers and trade staff, taxes on production, net interest, business transfers, taxes on corporate income, dividends and undistributed profits.${negative ? ' Earlier years include negative profits.' : ''} Source: BEA NIPA Table 1.14, lines 20 to 31.`;
};

const renderIndustries = () => {
  const { years, published } = snapshot.industries;
  const all = industryRates(snapshot);
  const i = years.findIndex((_, k) => all.every((x) => x.rates[k]));
  const j = years.length - 1;
  const list = all.map((x) => ({
    key: x.r.label, label: x.label, a: x.rates[i].rate, b: x.rates[j].rate, r: x.r, now: x.rates[j],
  }));
  const sorted = sortRows(list, 'b', 'desc');
  $('#industries-dek').textContent = `Surplus value per dollar of variable capital, ${years[i]} and ${years[j]}, for ${list.length} industries that produce goods and services for sale. Value added is net of depreciation.`;
  dumbbell({
    mount: $('#industry-chart'),
    rows: sorted,
    years: [years[i], years[j]],
    format: cents,
    tickFormat: (t) => `$${t}`,
    aria: 'Rate of surplus value by industry',
    describe: (r) => tipLines(`${cents(r.b)} per $1 of variable capital`, `${r.label}, ${years[j]}`, `${cents(r.a)} in ${years[i]}`,
      `Value added ${usd((r.r.comp[j] + r.r.taxes[j] + r.r.gos[j]) * 1e6)}`, `Depreciation ${usd(r.now.depreciation * 1e6)}`,
      `Variable capital ${usd(r.now.v * 1e6)}`, `Surplus value ${usd(r.now.s * 1e6)}`),
  });
  $('#industry-caption').textContent = `Value added less depreciation and variable capital, per dollar of variable capital, log scale. Variable capital is the industry’s compensation times the share of its wages paid to production and nonsupervisory workers. Trade, finance, insurance, real estate, farms and government are left out; value added includes the income of proprietors and partnerships. Sources: BEA GDP by Industry Table TVA113, published ${published}; Fixed Assets Table 3.4ESI; NIPA Table 6.3D; BLS aggregate weekly payrolls.`;
};

const renderProductivity = () => {
  const pay = realEarnings(snapshot);
  const y0 = pay[0].year;
  const index = (id) => {
    const m = series(snapshot, id);
    return pts(m).filter((p) => p.x >= y0).map((p) => ({ x: p.x, y: (p.y / m.get(y0)) * 100 }));
  };
  const out = index('PRS85006093');
  const comp = index('PRS85006153');
  const pns = pay.map((p) => ({ x: p.year, y: (p.v / pay[0].v) * 100 }));
  $('#productivity-dek').textContent = `Indexes, ${y0} = 100. In ${out.at(-1).x}: output per hour ${Math.round(out.at(-1).y)}, real hourly compensation of all employees ${Math.round(comp.at(-1).y)}, real hourly earnings of production and nonsupervisory workers ${Math.round(pns.at(-1).y)}.`;
  const at = (list, yr) => list.find((p) => p.x === yr)?.y;
  lines({
    mount: $('#productivity-chart'),
    scale: 'linear',
    yFormat: (v) => String(v),
    labelW: 120,
    series: [{ label: 'Output per hour', rows: out, alt: true }, { label: 'Pay, all employees', rows: comp, cls: 'mid' }, { label: 'Production workers', rows: pns }],
    aria: 'Output per hour and real hourly pay, indexes',
    describe: (yr) => tipLines(String(yr), `index, ${y0} = 100`, `Output per hour ${Math.round(at(out, yr))}`, `Real hourly compensation, all employees ${Math.round(at(comp, yr))}`,
      `Real hourly earnings, production and nonsupervisory ${Math.round(at(pns, yr))}`, { href: bls('PRS85006093'), text: 'Open at BLS' }),
  });
};

const renderWages = () => {
  const ahe = series(snapshot, 'CEU0500000008');
  const rows = [...ahe].filter(([y]) => CPI.has(y)).sort((a, b) => a[0] - b[0]).map(([year, v]) => ({ year, nominal: v, real: real(v, year) }));
  const top = peak(rows, 'real');
  $('#wages-dek').textContent = `Average hourly earnings of production and nonsupervisory employees: ${cents(rows[0].nominal)} in ${rows[0].year}, which is ${cents(rows[0].real)} in ${CPI_YEAR} prices. ${rows.at(-1).year}: ${cents(rows.at(-1).nominal)}.`;
  columns({
    mount: $('#real-wage-chart'),
    rows,
    key: (r) => r.year,
    value: (r) => r.real,
    overlay: (r) => r.nominal,
    highlight: (r) => r === top,
    yFormat: (v) => `$${v}`,
    annotations: [{ key: top.year, text: `${top.year}: ${cents(top.real)}` }],
    aria: 'Real and nominal average hourly earnings',
    describe: (r) => tipLines(cents(r.real), `${r.year}, in ${CPI_YEAR} dollars`, `${cents(r.nominal)} at the time`, { href: bls('CEU0500000008'), text: 'Open at BLS' }),
  });
  $('#real-wage-caption').textContent = `Average hourly earnings, private-sector production and nonsupervisory employees, in ${CPI_YEAR} dollars (bars) and at the time (red). Deflated with the CPI-W annual average, the price index for urban wage earners and clerical workers. Sources: BLS CEU0500000008, CWUR0000SA0.`;
  const mins = realMinimum(snapshot);
  const at = (yr) => mins.find((m) => m.year === yr);
  lines({
    mount: $('#minimum-chart'),
    scale: 'linear',
    yFormat: (v) => `$${v}`,
    labelW: 110,
    series: [{ label: `${CPI_YEAR} dollars`, rows: mins.map((m) => ({ x: m.year, y: m.real })), alt: true }, { label: 'At the time', rows: mins.map((m) => ({ x: m.year, y: m.nominal })) }],
    aria: 'Federal minimum wage, nominal and real',
    describe: (yr) => tipLines(cents(at(yr).real), `${yr}, in ${CPI_YEAR} dollars`, `${cents(at(yr).nominal)} at the time`, { href: SOURCES.minWage, text: 'Rate history' }),
  });
  $('#minimum-caption').textContent = `Federal minimum wage for covered nonfarm workers, averaged over the days each rate was in effect, at the time and in ${CPI_YEAR} dollars. Sources: Wage and Hour Division rate history; BLS CPI-W.`;
};

const GROUPS = [
  ['LEU0252881800', 'Men'], ['LEU0252882700', 'Women'], ['LEU0252883600', 'White'], ['LEU0252884500', 'Black'], ['LEU0252885400', 'Hispanic or Latino'],
];

const renderSpread = () => {
  const deflated = (id) => pts(series(snapshot, id)).filter((p) => CPI.has(p.x)).map((p) => ({ x: p.x, y: real(p.y, p.x), n: p.y }));
  const p10 = deflated('LEU0252911200');
  const p50 = deflated('LEU0252881500').filter((p) => p.x >= p10[0].x);
  const p90 = deflated('LEU0252911500');
  const at = (list, yr) => list.find((p) => p.x === yr);
  $('#spread-dek').textContent = `Usual weekly earnings of full-time wage and salary workers in ${CPI_YEAR} dollars. ${p10[0].x}: ${dollars(p10[0].y)} at the 10th percentile, ${dollars(p90[0].y)} at the 90th. ${p10.at(-1).x}: ${dollars(p10.at(-1).y)} and ${dollars(p90.at(-1).y)}.`;
  lines({
    mount: $('#deciles-chart'),
    scale: 'linear',
    yFormat: (v) => `$${compact(v)}`,
    labelW: 100,
    series: [{ label: '90th pct', rows: p90, alt: true }, { label: 'Median', rows: p50 }, { label: '10th pct', rows: p10, cls: 'mid' }],
    aria: 'Weekly earnings at the 10th, 50th and 90th percentiles',
    describe: (yr) => tipLines(String(yr), `weekly, ${CPI_YEAR} dollars`, `90th percentile ${dollars(at(p90, yr).y)}`, `Median ${dollars(at(p50, yr).y)}`, `10th percentile ${dollars(at(p10, yr).y)}`,
      `90th ÷ 10th: ${(at(p90, yr).n / at(p10, yr).n).toFixed(2)}`),
  });
  $('#deciles-caption').textContent = `Usual weekly earnings at the 10th percentile, median and 90th percentile, full-time wage and salary workers, annual averages, in ${CPI_YEAR} dollars. Sources: BLS LEU0252911200, LEU0252881500, LEU0252911500.`;
  fill('#groups-multiples', ...GROUPS.map(([id, label]) => {
    const m = series(snapshot, id);
    const years = [...m.keys()].sort((a, b) => a - b);
    const values = years.map((y) => m.get(y));
    return h('div', { class: 'panel', 'data-search': `${label} weekly earnings` },
      h('h4', {}, ext(bls(id), label)),
      h('p', {}, `${dollars(values.at(-1))} a week in ${years.at(-1)} · ${dollars(values[0])} in ${years[0]}`),
      miniArea({ years, values, describe: (yr, v) => tipLines(dollars(v), `${label}, ${yr}`) }));
  }));
};

const renderBasket = () => {
  const ahe = series(snapshot, 'CEU0500000008');
  const rows = PRICES.map((p) => {
    const m = series(snapshot, p.id);
    const scale = p.unit === '100 kWh' ? 100 : 1;
    const years = [...m.keys()].filter((y) => ahe.has(y)).sort((a, b) => a - b);
    const [y0, y1] = [years[0], years.at(-1)];
    return {
      key: p.id, label: `${p.item}, ${p.unit}`, a: minutes(m.get(y0) * scale, ahe.get(y0)), b: minutes(m.get(y1) * scale, ahe.get(y1)), y0, y1, p0: m.get(y0) * scale, p1: m.get(y1) * scale,
    };
  });
  const latest = rows[0].y1;
  $('#basket-dek').textContent = `Average retail price divided by average hourly earnings of production and nonsupervisory workers, in minutes. ${rows.filter((r) => r.b < r.a).length} of ${rows.length} items take fewer minutes in ${latest} than in their first year.`;
  dumbbell({
    mount: $('#basket-chart'),
    rows: sortRows(rows, 'b', 'desc'),
    years: ['First year', latest],
    format: (v) => `${v.toFixed(1)} min`,
    tickFormat: (t) => `${t} min`,
    aria: 'Minutes of work to buy common goods',
    describe: (r) => tipLines(`${r.b.toFixed(1)} minutes`, `${r.label}, ${r.y1}`, `${cents(r.p1)} at ${cents(ahe.get(r.y1))} an hour`, `${r.y0}: ${r.a.toFixed(1)} minutes, ${cents(r.p0)} at ${cents(ahe.get(r.y0))} an hour`,
      { href: bls(r.key), text: 'Open at BLS' }),
  });
  $('#basket-caption').textContent = 'Minutes of work at average hourly earnings, first year of each price series (grey) and latest (red), log scale. Electricity per 100 kWh. Sources: BLS Average Price Data; CEU0500000008.';
};

const histTable = (sel, table, format = exact) => fill(sel,
  h('caption', {}, `${table.title}. Historical Statistics ${table.series}. `, cite(table.src)),
  h('thead', {}, h('tr', {}, table.columns.map((c) => h('th', { scope: 'col' }, c)))),
  h('tbody', {}, table.rows.map((r) => h('tr', { 'data-search': `${table.title} ${r[0]}` },
    r.map((v, i) => h('td', { class: i ? 'n' : null }, i === 0 ? String(v) : v === null ? '—' : format(v, i)))))));

const renderCanal = () => {
  const rows = HIST.erie.rows;
  const laborer = rows.filter((r) => r[1] !== null).map(([x, y]) => ({ x, y }));
  const carpenter = rows.map(([x, , y]) => ({ x, y }));
  $('#canal-dek').textContent = `Daily rates paid on the Erie Canal, and annual earnings in manufacturing, from the 1975 Historical Statistics. A carpenter’s day paid ${cents(carpenter.at(-1).y)} in ${carpenter.at(-1).x}.`;
  const at = (list, yr) => list.find((p) => p.x === yr);
  lines({
    mount: $('#erie-chart'), scale: 'linear', yFormat: (v) => `$${v}`, height: 240, labelW: 92,
    series: [{ label: 'Carpenters', rows: carpenter }, { label: 'Laborers', rows: laborer, alt: true }],
    aria: 'Daily wage rates on the Erie Canal',
    describe: (yr) => tipLines(String(yr), 'daily rate', at(laborer, yr) ? `Common labor ${cents(at(laborer, yr).y)}` : 'Common labor —', `Carpenters ${cents(at(carpenter, yr).y)}`),
  });
  columns({
    mount: $('#earnings-chart'),
    rows: HIST.earnings.rows.map(([year, v]) => ({ year, v })),
    key: (r) => r.year,
    value: (r) => r.v,
    height: 200,
    yFormat: (v) => `$${compact(v)}`,
    aria: 'Average annual earnings in manufacturing, 1890 to 1926',
    describe: (r, prev) => tipLines(`$${exact(r.v)}`, `a year, ${r.year}`, prev ? `${r.v >= prev.v ? '+' : ''}${exact(r.v - prev.v)} on ${prev.year}` : null),
  });
  histTable('#erie-table', HIST.erie, (v) => cents(v));
  histTable('#earnings-table', HIST.earnings, (v) => `$${exact(v)}`);
};

const renderComposition = () => {
  const rows = ACC.filter((r) => r.composition !== null).map((r) => ({ x: r.year, y: r.composition, r }));
  const hi = peak(rows, 'y');
  const lo = peak(rows, 'y', 'min');
  $('#composition-dek').textContent = `At the end of ${LAST.year - 1}, nonfinancial corporations held ${usd(LAST.fixed * 1e6)} in fixed assets and ${usd(LAST.stock * 1e6)} in inventories. In ${LAST.year} they paid ${usd(LAST.v * 1e6)} in variable capital. Highest ratio: ${cents(hi.y)} in ${hi.x}. Lowest: ${cents(lo.y)} in ${lo.x}.`;
  lines({
    mount: $('#composition-chart'),
    scale: 'linear',
    yFormat: (v) => `$${v}`,
    labelW: 70,
    series: [{ label: 'C ÷ v', rows, alt: true }],
    annotations: [{ x: hi.x, text: `${hi.x}: ${cents(hi.y)}` }, { x: lo.x, text: `${lo.x}: ${cents(lo.y)}` }],
    aria: 'Constant capital per dollar of variable capital',
    describe: (yr) => {
      const r = rows.find((p) => p.x === yr).r;
      return tipLines(`${cents(r.composition)} per $1 of variable capital`, String(yr), `Fixed assets ${usd(r.fixed * 1e6)}`, `Inventories ${usd(r.stock * 1e6)}`, `Variable capital ${usd(r.v * 1e6)}`,
        { href: SOURCES.beaFixed, text: 'Fixed Assets Table 6.1' });
    },
  });
};

const renderProfit = () => {
  const rows = ACC.filter((r) => r.profit !== null).map((r) => ({ x: r.year, y: r.profit * 100, r }));
  const hi = peak(rows, 'y');
  const lo = peak(rows, 'y', 'min');
  const nos = ACC.filter((r) => r.profit !== null).map((r) => ({ x: r.year, y: ((r.parts.interest + r.parts.transfers + r.parts.profitTax + r.parts.dividends + r.parts.retained) / r.C) * 100 }));
  $('#profit-dek').textContent = 'Surplus value per dollar of constant capital: fixed assets and inventories. The lower line counts net operating surplus only, leaving out taxes on production and the pay of supervisors, managers, officers and trade staff.';
  lines({
    mount: $('#profit-chart'),
    scale: 'linear',
    yFormat: (v) => `${v}%`,
    labelW: 116,
    series: [{ label: 's ÷ C', rows, alt: true }, { label: 'Net operating surplus ÷ C', rows: nos, cls: 'mid' }],
    annotations: [{ x: hi.x, text: `${hi.x}: ${percent(hi.y)}` }, { x: lo.x, text: `${lo.x}: ${percent(lo.y)}` }],
    aria: 'Rate of profit, nonfinancial corporations',
    describe: (yr) => {
      const r = rows.find((p) => p.x === yr);
      return tipLines(percent(r.y), String(yr), `Surplus value ${usd(r.r.s * 1e6)}`, `Fixed assets and inventories at the end of ${yr - 1}: ${usd(r.r.C * 1e6)}`, `Net operating surplus only: ${percent(nos.find((p) => p.x === yr).y)}`);
    },
  });
  const fin = series(snapshot, 'A587RC');
  const dom = series(snapshot, 'A445RC');
  columns({
    mount: $('#finance-chart'),
    rows: [...fin].sort((a, b) => a[0] - b[0]).map(([year, v]) => ({ year, v: (v / dom.get(year)) * 100, d: v })),
    key: (r) => r.year,
    value: (r) => r.v,
    height: 170,
    yFormat: (v) => `${v}%`,
    aria: 'Financial share of domestic corporate profits',
    describe: (r) => tipLines(percent(r.v), `of domestic corporate profits, ${r.year}`, `${usd(r.d * 1e6)} financial`),
  });
};

const SIZE_GROUPS = [
  ['1 to 19', ['1 to 4', '5 to 9', '10 to 19']],
  ['20 to 499', ['20 to 99', '100 to 499']],
  ['500 to 9,999', ['500 to 999', '1000 to 2499', '2500 to 4999', '5000 to 9999']],
  ['10,000 or more', ['10000+']],
];

const renderConcentration = () => {
  const f = snapshot.firms;
  const rows = f.years.map((y) => ({ x: y.year, y: (y.topEmp / y.emp) * 100, d: y }));
  $('#concentration-dek').textContent = `${f.years[0].year}: ${exact(f.years[0].topFirms)} firms with 10,000 or more employees. ${f.years.at(-1).year}: ${exact(f.years.at(-1).topFirms)}, out of ${exact(f.years.at(-1).firms)} employer firms.`;
  lines({
    mount: $('#bigfirm-chart'),
    scale: 'linear',
    yFormat: (v) => `${v}%`,
    labelW: 90,
    height: 260,
    series: [{ label: '10,000+', rows, alt: true }],
    aria: 'Share of employment in firms with 10,000 or more employees',
    describe: (yr) => {
      const r = rows.find((p) => p.x === yr).d;
      return tipLines(percent((r.topEmp / r.emp) * 100), `of private-sector employment, ${yr}`, `${exact(r.topFirms)} firms, ${exact(r.topEmp)} employees`, `${exact(r.firms)} firms in all`, { href: SOURCES.bds, text: 'Business Dynamics Statistics' });
    },
  });
  const group = (key) => SIZE_GROUPS.map(([label, sizes]) => ({ label, value: f.sizes.filter((s) => sizes.includes(s.size)).reduce((n, s) => n + s[key], 0) })).reverse();
  waffle({ mount: $('#emp-waffle'), parts: group('emp'), aria: 'Employment by firm size' });
  waffle({ mount: $('#firm-waffle'), parts: group('firms'), aria: 'Firms by size' });
  $('#emp-caption').textContent = `Employees by size of the firm that employs them, ${f.years.at(-1).year}. Each square is 1%.`;
};

const renderUnemployment = () => {
  const old = HIST.unemployment.rows.map(([year, n, rate]) => ({ year, rate, n, partial: true }));
  const cps = [...series(snapshot, 'LNU04000000')].filter(([y]) => y > old.at(-1).year).sort((a, b) => a[0] - b[0])
    .map(([year, rate]) => ({ year, rate, n: series(snapshot, 'LNU03000000').get(year) }));
  const rows = [...old, ...cps];
  const top = peak(rows, 'rate');
  const now = snapshot.bls.LNU04000000.latest;
  $('#unemployment-dek').textContent = `Light bars, ${old[0].year} to ${old.at(-1).year}: Historical Statistics. Dark bars: BLS. The rate in ${month(now)} was ${now.value}%, ${exact(snapshot.bls.LNU03000000.latest.value * 1000)} people, not seasonally adjusted.`;
  columns({
    mount: $('#unemployment-chart'),
    rows,
    key: (r) => r.year,
    value: (r) => r.rate,
    highlight: (r) => r === top,
    yFormat: (v) => `${v}%`,
    annotations: [{ key: top.year, text: `${top.year}: ${top.rate}%` }],
    aria: 'Unemployment rate, 1890 to now',
    describe: (r, prev) => tipLines(`${r.rate}%`, `${r.year}${r.partial ? ', Historical Statistics' : ', BLS'}`, `${exact(r.n * 1000)} unemployed`,
      prev ? `${r.rate >= prev.rate ? '+' : ''}${(r.rate - prev.rate).toFixed(1)} points on ${prev.year}` : null),
  });
  histTable('#unemployment-table', HIST.unemployment, (v, i) => (i === 2 ? `${v}%` : exact(v)));
};

const U = [['LNU03025670', 'U-1'], ['LNU04023621', 'U-2'], ['LNU04000000', 'U-3'], ['LNU03327707', 'U-4'], ['LNU03327708', 'U-5'], ['LNU03327709', 'U-6']];

const renderLayers = () => {
  const rows = reserveLayers(snapshot);
  const r = rows.at(-1);
  $('#layers-dek').textContent = `${r.year}: ${exact(r.unemployed * 1000)} unemployed, ${exact(r.partTime * 1000)} working part time who want full-time work, ${exact((r.marginal + r.discouraged) * 1000)} not looking but wanting a job and available, ${exact(r.discouraged * 1000)} of them discouraged.`;
  stackedArea({
    mount: $('#layers-chart'),
    years: rows.map((x) => x.year),
    series: [
      { key: 'unemployed', label: 'Unemployed', color: CAT[0], values: rows.map((x) => x.unemployed * 1000) },
      { key: 'partTime', label: 'Part time, economic reasons', color: CAT[1], values: rows.map((x) => x.partTime * 1000) },
      { key: 'marginal', label: 'Marginally attached', color: CAT[2], values: rows.map((x) => x.marginal * 1000) },
      { key: 'discouraged', label: 'Discouraged', color: CAT[3], values: rows.map((x) => x.discouraged * 1000) },
    ],
    aria: 'Unemployed, involuntary part time and marginally attached, thousands',
  });
  const from = rows[0].year;
  const us = U.map(([id, label], i) => ({ label, rows: pts(series(snapshot, id)).filter((p) => p.x >= from), alt: i === 5, cls: i === 2 ? 'mid' : null }));
  lines({
    mount: $('#u-chart'),
    scale: 'linear',
    yFormat: (v) => `${v}%`,
    labelW: 60,
    series: us,
    aria: 'Measures of labor underutilization U-1 to U-6',
    describe: (yr) => tipLines(String(yr), 'percent', ...us.map((s) => `${s.label} ${s.rows.find((p) => p.x === yr)?.y ?? '—'}%`)),
  });
  const long = series(snapshot, 'LNU03008636');
  const all = series(snapshot, 'LNU03000000');
  const weeks = series(snapshot, 'LNU03008275');
  const share = [...long].filter(([y]) => all.has(y)).sort((a, b) => a[0] - b[0]).map(([x, v]) => ({ x, y: (v / all.get(x)) * 100 }));
  lines({
    mount: $('#duration-chart'), scale: 'linear', yFormat: (v) => `${v}%`, height: 240, labelW: 76,
    series: [{ label: '27 wks+', rows: share, alt: true }],
    aria: 'Share of the unemployed out of work 27 weeks or more',
    describe: (yr) => tipLines(percent(share.find((p) => p.x === yr).y), `out of work 27 weeks or more, ${yr}`, `${exact(long.get(yr) * 1000)} people`, `Average spell: ${weeks.get(yr)} weeks`),
  });
  const open = series(snapshot, 'JTU000000000000000JOL');
  const per = [...open].filter(([y]) => all.has(y)).sort((a, b) => a[0] - b[0]).map(([x, v]) => ({ x, y: all.get(x) / v }));
  lines({
    mount: $('#openings-chart'), scale: 'linear', yFormat: (v) => String(v), height: 240, labelW: 76,
    series: [{ label: 'Per opening', rows: per }],
    aria: 'Unemployed people per job opening',
    describe: (yr) => tipLines((per.find((p) => p.x === yr).y).toFixed(2), `unemployed per opening, ${yr}`, `${exact(all.get(yr) * 1000)} unemployed`, `${exact(open.get(yr) * 1000)} openings`),
  });
  const race = [['LNU04000006', 'Black'], ['LNU04000009', 'Hispanic'], ['LNU04000003', 'White']];
  const start = Math.max(...race.map(([id]) => firstOf(series(snapshot, id))[0]));
  const rs = race.map(([id, label], i) => ({ label, rows: pts(series(snapshot, id)).filter((p) => p.x >= start), alt: i === 0, cls: i === 2 ? 'mid' : null }));
  lines({
    mount: $('#race-chart'), scale: 'linear', yFormat: (v) => `${v}%`, labelW: 80,
    series: rs,
    aria: 'Unemployment rate by race and ethnicity',
    describe: (yr) => {
      const v = (k) => rs[k].rows.find((p) => p.x === yr)?.y;
      return tipLines(String(yr), 'unemployment rate', `Black ${v(0)}%`, `Hispanic or Latino ${v(1)}%`, `White ${v(2)}%`, `Black ÷ White: ${(v(0) / v(2)).toFixed(2)}`);
    },
  });
};

const renderClass = () => {
  const rows = classShares(snapshot);
  $('#class-dek').textContent = `${rows[0].year}: ${pct(rows[0].self)} of the employed were self-employed and ${pct(rows[0].unpaid)} unpaid family workers. ${rows.at(-1).year}: ${pct(rows.at(-1).self)} and ${pct(rows.at(-1).unpaid)}.`;
  stackedArea({
    mount: $('#class-chart'),
    years: rows.map((r) => r.year),
    series: [
      { key: 'wage', label: 'Wage and salary', color: 'var(--data)', values: rows.map((r) => r.wage * 100) },
      { key: 'self', label: 'Self-employed', color: CAT[0], values: rows.map((r) => r.self * 100) },
      { key: 'unpaid', label: 'Unpaid family', color: CAT[2], values: rows.map((r) => r.unpaid * 100) },
    ],
    format: percent,
    max: 100,
    aria: 'The employed by class of worker, percent',
  });
  const lf = HIST.laborForce.rows;
  columns({
    mount: $('#enslaved-chart'),
    rows: lf.filter((r) => r[3] !== null).map(([year, total, free, enslaved]) => ({ year, total, free, enslaved })),
    key: (r) => r.year,
    value: (r) => r.total * 1000,
    overlay: (r) => r.enslaved * 1000,
    height: 200,
    aria: 'Labor force, free and enslaved, 1800 to 1860',
    describe: (r) => tipLines(`${exact(r.total * 1000)} workers`, String(r.year), `${exact(r.enslaved * 1000)} enslaved, ${pct(r.enslaved / r.total)}`, `${exact(r.free * 1000)} free`),
  });
  const ag = lf.map(([x, , , , y]) => ({ x, y }));
  const mf = lf.filter((r) => r[5] !== null).map(([x, , , , , y]) => ({ x, y }));
  lines({
    mount: $('#sector-chart'), scale: 'linear', yFormat: (v) => compact(v * 1000), height: 220, labelW: 104,
    series: [{ label: 'Agriculture', rows: ag }, { label: 'Manufacturing', rows: mf, alt: true }],
    aria: 'Employment in agriculture and manufacturing, 1800 to 1960',
    describe: (yr) => tipLines(String(yr), 'employed', `Agriculture ${exact((ag.find((p) => p.x === yr)?.y ?? 0) * 1000)}`, mf.find((p) => p.x === yr) ? `Manufacturing ${exact(mf.find((p) => p.x === yr).y * 1000)}` : 'Manufacturing —'),
  });
  histTable('#laborforce-table', HIST.laborForce, (v) => exact(v * 1000));
};

const NI_LABELS = {
  comp: 'Compensation', proprietors: 'Proprietors’ income', rent: 'Rent', profits: 'Corporate profits', interest: 'Net interest', taxes: 'Taxes on production',
};

const renderIncome = () => {
  const rows = nationalIncome(snapshot);
  const r = rows.at(-1);
  $('#income-dek').textContent = `National income in ${r.year}: ${usd(r.total * 1e6)}. Compensation ${usd(r.parts[0].value * 1e6)}; corporate profits ${usd(r.parts[3].value * 1e6)}; rent ${usd(r.parts[2].value * 1e6)}; net interest ${usd(r.parts[4].value * 1e6)}.`;
  const list = Object.keys(NI_LABELS).map((key, i) => ({
    label: NI_LABELS[key], rows: rows.map((x) => ({ x: x.year, y: x.parts.find((p) => p.key === key).share * 100 })), color: i ? CAT[i] : null, alt: i === 0,
  }));
  list.splice(1, 0, { label: 'Production workers’ pay', rows: rows.filter((x) => x.workers !== null).map((x) => ({ x: x.year, y: x.workers * 100 })), cls: 'mid' });
  lines({
    mount: $('#ni-chart'),
    scale: 'linear',
    yFormat: (v) => `${v}%`,
    labelW: 140,
    height: 340,
    series: list,
    aria: 'National income by type, percent',
    describe: (yr) => tipLines(String(yr), `percent of ${usd(rows.find((x) => x.year === yr).total * 1e6)}`,
      ...list.map((s) => [s.label, s.rows.find((p) => p.x === yr)]).filter(([, p]) => p).map(([label, p]) => `${label} ${percent(p.y)}`)),
  });
};

const renderHouseholds = () => {
  const rows = snapshot.income;
  const names = ['Lowest fifth', 'Second fifth', 'Middle fifth', 'Fourth fifth', 'Highest fifth'];
  $('#households-dek').textContent = `${rows[0].year}: the highest fifth received ${rows[0].shares[4]}% and the top 5% received ${rows[0].top5}%. ${rows.at(-1).year}: ${rows.at(-1).shares[4]}% and ${rows.at(-1).top5}%.`;
  stackedArea({
    mount: $('#quintile-chart'),
    years: rows.map((r) => r.year),
    series: names.map((label, i) => ({ key: `q${i}`, label, color: i === 4 ? CAT[0] : ['var(--w1)', 'var(--w2)', 'var(--w3)', 'var(--w4)'][i], values: rows.map((r) => r.shares[i]) })),
    format: percent,
    max: 100,
    aria: 'Share of household income by fifth',
  });
};

const renderWealth = () => {
  const w = snapshot.wealth;
  const year = (q) => Number(q.date.slice(0, 4));
  const qs = w.quarters;
  stackedArea({
    mount: $('#wealth-chart'),
    years: qs.map(year),
    series: [...DFA_GROUPS].reverse().map((g, i) => ({ key: g.key, label: g.label, color: CAT[i], values: qs.map((q) => q['Net worth'][g.key] * 100) })),
    format: percent,
    max: 100,
    aria: 'Share of household net worth by wealth group',
  });
  const q = qs.at(-1);
  $('#wealth-dek').textContent = `${q.date}: the top 0.1% held ${pct(q['Net worth'].TopPt1)} of household net worth, the bottom 50% held ${pct(q['Net worth'].Bottom50)}. The last point is ${q.date}; the others are fourth quarters.`;
  const parts = (m) => DFA_GROUPS.map((g) => ({ label: g.label, value: q[m][g.key] }));
  waffle({ mount: $('#equity-waffle'), parts: parts('Corporate equities and mutual fund shares'), format: (v) => pct(v), aria: 'Corporate equities and mutual fund shares by wealth group' });
  waffle({ mount: $('#business-waffle'), parts: parts('Unincorporated businesses'), format: (v) => pct(v), aria: 'Unincorporated business equity by wealth group' });
  $('#equity-caption').textContent = `Corporate equities and mutual fund shares held by households, by wealth group, ${q.date}. Each square is 1%.`;
};

const FR_LABELS = {
  personal: 'Personal income taxes', social: 'Social insurance contributions', corporate: 'Corporate income taxes', production: 'Taxes on production', other: 'Other',
};

const renderTaxes = () => {
  const rows = federalReceipts(snapshot);
  const r = rows.at(-1);
  $('#taxes-dek').textContent = `Federal current receipts in ${r.year}: ${usd(r.total * 1e6)}. Personal income taxes ${usd(r.parts[0].value * 1e6)}; social insurance contributions ${usd(r.parts[1].value * 1e6)}; corporate income taxes ${usd(r.parts[2].value * 1e6)}.`;
  stackedArea({
    mount: $('#receipts-chart'),
    years: rows.map((x) => x.year),
    series: Object.keys(FR_LABELS).map((key, i) => ({ key, label: FR_LABELS[key], color: CAT[i === 4 ? 6 : i], values: rows.map((x) => x.parts.find((p) => p.key === key).share * 100) })),
    format: percent,
    max: 100,
    aria: 'Federal receipts by source, percent',
  });
};

const renderUnions = () => {
  const old = HIST.unions.rows.filter((r) => r[2] !== null).map(([x, , y]) => ({ x, y }));
  const sets = [
    { label: 'Nonfarm, 1930–70', rows: old, cls: 'mid' },
    { label: 'All, 1983 on', rows: pts(series(snapshot, 'LUU0204899600')), alt: true },
    { label: 'Government', rows: pts(series(snapshot, 'LUU0204922700')), color: CAT[1] },
    { label: 'Private sector', rows: pts(series(snapshot, 'LUU0204906600')), color: CAT[2] },
  ];
  const now = sets[1].rows.at(-1);
  $('#unions-dek').textContent = `${now.x}: ${now.y}% of wage and salary workers were union members; ${sets[2].rows.at(-1).y}% in government and ${sets[3].rows.at(-1).y}% in the private sector. No series is shown for 1971 to 1982.`;
  lines({
    mount: $('#union-chart'),
    scale: 'linear',
    yFormat: (v) => `${v}%`,
    labelW: 124,
    series: sets,
    aria: 'Union membership rates',
    describe: (yr) => tipLines(String(yr), 'union members, percent', ...sets.map((s) => {
      const p = s.rows.find((r) => r.x === yr);
      return p ? `${s.label}: ${p.y}%` : null;
    })),
  });
  columns({
    mount: $('#members-chart'),
    rows: HIST.unions.rows.map(([year, members, , s]) => ({ year, members, s })),
    key: (r) => r.year,
    value: (r) => r.members * 1000,
    height: 220,
    aria: 'Union members, 1897 to 1970',
    describe: (r) => tipLines(exact(r.members * 1000), `union members, ${r.year}`, r.year < 1930 ? 'Historical Statistics D 940' : 'Historical Statistics D 946'),
  });
};

const renderStrikes = () => {
  const ws = [...series(snapshot, 'WSU100')].sort((a, b) => a[0] - b[0]).map(([year, n]) => ({ year, n }));
  const workers = series(snapshot, 'WSU010');
  const idle = series(snapshot, 'WSU001');
  const top = peak(ws, 'n');
  const now = ws.at(-1);
  $('#strikes-dek').textContent = `${now.year}: ${exact(now.n)} major stoppages began, involving ${exact(workers.get(now.year) * 1000)} workers, with ${exact(idle.get(now.year) * 1000)} days idle. ${top.year}: ${exact(top.n)} began.`;
  columns({
    mount: $('#strikes-chart'),
    rows: ws,
    key: (r) => r.year,
    value: (r) => r.n,
    highlight: (r) => r === top,
    annotations: [{ key: top.year, text: `${top.year}: ${top.n}` }],
    aria: 'Major work stoppages beginning each year',
    describe: (r) => tipLines(exact(r.n), `major stoppages began, ${r.year}`, `${exact(workers.get(r.year) * 1000)} workers involved`, `${exact(idle.get(r.year) * 1000)} days idle`, { href: bls('WSU100'), text: 'Open at BLS' }),
  });
  columns({
    mount: $('#idle-chart'),
    rows: [...idle].sort((a, b) => a[0] - b[0]).map(([year, v]) => ({ year, v })),
    key: (r) => r.year,
    value: (r) => r.v * 1000,
    height: 200,
    aria: 'Days idle in major work stoppages',
    describe: (r) => tipLines(exact(r.v * 1000), `days idle, ${r.year}`),
  });
  const early = HIST.stoppagesByIssue.rows.map(([year, total]) => ({ year, total }));
  const gap = Array.from({ length: 8 }, (_, i) => ({ year: 1906 + i, total: 0, gap: true }));
  const late = HIST.stoppages.rows.map(([year, total, w, d]) => ({ year, total, w, d }));
  const all = [...early.filter((r) => r.year <= 1905), ...gap, ...early.filter((r) => r.year > 1905), ...late];
  columns({
    mount: $('#old-strikes-chart'),
    rows: all,
    key: (r) => r.year,
    value: (r) => r.total,
    height: 200,
    aria: 'All work stoppages, 1881 to 1970',
    describe: (r) => tipLines(r.gap ? 'No count' : exact(r.total), `work stoppages, ${r.year}`, r.w ? `${exact(r.w * 1000)} workers involved` : null, r.d ? `${exact(r.d * 1000)} days idle` : null),
  });
  const issues = HIST.stoppagesByIssue.rows.filter((r) => r[0] <= 1905);
  stackedArea({
    mount: $('#issues-chart'),
    years: issues.map((r) => r[0]),
    series: [
      { key: 'wages', label: 'Wages and hours', color: CAT[0], values: issues.map((r) => r[2]) },
      { key: 'union', label: 'Union organization', color: CAT[1], values: issues.map((r) => r[3]) },
      { key: 'other', label: 'Other and not reported', color: 'var(--data-2)', values: issues.map((r) => r[4]) },
    ],
    aria: 'Work stoppages by major issue, 1881 to 1905',
  });
  histTable('#issues-table', HIST.stoppagesByIssue);
  histTable('#stoppages-table', HIST.stoppages, (v, i) => exact(i === 1 ? v : v * 1000));
};

const renderInjury = () => {
  const rows = COAL.map(([x, miners, deaths]) => ({ x, y: perThousand(deaths, miners), miners, deaths }));
  const top = peak(rows, 'y');
  $('#injury-dek').textContent = `${COAL[0][0]}: ${exact(COAL[0][2])} deaths among ${exact(COAL[0][1])} coal miners. ${COAL.at(-1)[0]}: ${exact(COAL.at(-1)[2])} among ${exact(COAL.at(-1)[1])}. Highest rate: ${top.y.toFixed(2)} per 1,000 in ${top.x}.`;
  lines({
    mount: $('#coal-chart'),
    scale: 'linear',
    yFormat: (v) => String(v),
    labelW: 70,
    series: [{ label: 'Per 1,000', rows, alt: true }],
    annotations: [{ x: top.x, text: `${top.x}: ${top.y.toFixed(2)}` }],
    aria: 'Coal mining deaths per 1,000 miners',
    describe: (yr) => {
      const r = rows.find((p) => p.x === yr);
      return tipLines(`${r.y.toFixed(2)} per 1,000`, String(yr), `${exact(r.deaths)} killed`, `${exact(r.miners)} miners`, { href: SOURCES.msha, text: 'MSHA table' });
    },
  });
  const fw = [...series(snapshot, 'FWU00X00000080N00')].map(([year, v]) => ({ year, v }));
  const fa = [...series(snapshot, 'FAU00X00000080N00')].map(([year, v]) => ({ year, v, partial: true }));
  columns({
    mount: $('#cfoi-chart'),
    rows: [...fw, ...fa].sort((a, b) => a.year - b.year),
    key: (r) => r.year,
    value: (r) => r.v,
    height: 200,
    aria: 'Fatal work injuries',
    describe: (r) => tipLines(exact(r.v), `fatal work injuries, ${r.year}`, r.partial ? 'Coding from 2023 on' : 'Coding 2011 to 2022'),
  });
  columns({
    mount: $('#soii-chart'),
    rows: [...series(snapshot, 'ISU00000000031100')].sort((a, b) => a[0] - b[0]).map(([year, v]) => ({ year, v })),
    key: (r) => r.year,
    value: (r) => r.v,
    height: 200,
    yFormat: (v) => String(v),
    aria: 'Nonfatal injury and illness rate',
    describe: (r) => tipLines(String(r.v), `cases per 100 full-time workers, ${r.year}`),
  });
};

const renderLobbying = () => {
  const l = snapshot.lobbying;
  const rows = sortRows(l.orgs, 'dollars', 'desc').map((o) => ({ key: String(o.id), label: o.name, value: o.dollars, hi: o.side === 'labor', o }));
  const total = (side, k) => l.orgs.filter((o) => o.side === side).reduce((n, o) => n + o[k], 0);
  $('#lobbying-dek').textContent = `${LOBBY.filter((o) => o.side === 'business').length} business associations and ${LOBBY.filter((o) => o.side === 'labor').length} unions. ${l.prior}: business ${usd(total('business', 'prior'))}, unions ${usd(total('labor', 'prior'))}. ${l.year}: ${usd(total('business', 'dollars'))} and ${usd(total('labor', 'dollars'))}.`;
  dotplot({
    mount: $('#lobby-chart'),
    rows,
    format: usd,
    labelShare: 0.42,
    href: (r) => `https://lda.gov/api/v1/filings/?registrant_id=${r.key}&filing_year=${l.year}`,
    linkText: () => 'Filings',
    aria: 'Reported lobbying by organization',
    describe: (r) => tipLines(`$${exact(r.value)}`, `${r.label}, ${l.year}`, `${l.prior}: $${exact(r.o.prior)}`, r.o.side === 'labor' ? 'Union' : 'Business association'),
  });
  $('#lobby-caption').textContent = `Lobbying each organization reported for itself under the Lobbying Disclosure Act, ${l.year}, log scale, keeping the latest amendment of each quarterly report. Unions in red. Source: lda.gov API.`;
};

let tl;

const showDetail = (type, i) => {
  if (type === 'event') {
    const e = TIMELINE[i];
    fill('#timeline-detail', h('time', {}, e.date), e.text, ' ', cite(e.src));
  } else if (type === 'person') {
    const p = PEOPLE[i];
    fill('#timeline-detail', h('time', {}, `${p.from}–${p.to ?? 'now'}`), `${p.name}, ${p.role}. ${p.note}.`, ' ', cite(p.src));
  } else {
    const a = AGENCIES[i];
    fill('#timeline-detail', h('time', {}, String(a.since)), `${a.name} (${a.org}): ${a.facts.join('; ')}.`, ' ', cite(a.src));
  }
};

const ERAS = [[1795, 1865], [1865, 1935], [1935, 1980], [1980, 2027]];

const renderTimeline = () => {
  tl = timeline({
    mount: $('#timeline-svg'),
    events: TIMELINE,
    people: PEOPLE,
    projects: AGENCIES,
    limits: [1795, 2027],
    onSelect: showDetail,
    onRange: (d) => { $('#timeline-range').textContent = `${Math.round(d[0])}–${Math.round(d[1])}`; },
  });
  fill('#timeline-eras', ...ERAS.map(([from, to]) => h('button', { type: 'button', 'data-from': from, onclick: () => tl.set([from, to]) }, `${from}–${String(to).slice(2)}`)));
  fill('#timeline-detail', h('time', {}, 'Tip'), 'Tap a circle, bar or diamond. Circles are events, bars are terms of office, diamonds are agencies.');
  const counts = Object.fromEntries(TAGS.map((t) => [t, TIMELINE.filter((e) => e.tag === t).length]));
  fill('#timeline-tags', ...TAGS.map((t) => h('button', { type: 'button', 'data-tag': t, 'aria-pressed': 'false' }, t, h('b', {}, counts[t]))));
  fill('#timeline-list', ...TIMELINE.map((e, i) => h('li', { 'data-i': i },
    h('time', { datetime: e.date }, e.date),
    h('span', {}, h('span', { class: 'org' }, e.org), e.text, ' ', cite(e.src)))));
  $('#timeline-list').addEventListener('click', (event) => {
    const li = event.target.closest('li');
    if (!li || event.target.closest('a')) return;
    const i = Number(li.dataset.i);
    tl.focus(yearOf(TIMELINE[i].date), 'event', i);
    showDetail('event', i);
    $('#timeline-svg').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
};

const applyTimeline = () => {
  const keep = new Set(filterTimeline(TIMELINE, { tags: [...state.tags], query: state.query }));
  $$('#timeline-list li').forEach((li) => { li.hidden = !keep.has(TIMELINE[Number(li.dataset.i)]); });
};

const knownAs = (hit) => {
  const ex = EXAMPLES.find((e) => identify(e.id)?.id === hit.id);
  if (ex) return ex.is;
  return snapshot.bls[hit.id]?.label ?? NIPA[hit.id]?.label ?? FIXED[hit.id]?.label ?? null;
};

const decode = () => {
  const value = $('#decoder-input').value;
  if (!value.trim()) {
    fill('#decoder-out', h('p', { class: 'none' }, 'Type an identifier, or try one of the examples below.'));
    return;
  }
  const hit = identify(value);
  if (!hit) {
    fill('#decoder-out', h('p', { class: 'none' }, `No match for “${value.trim()}”.`));
    return;
  }
  const known = knownAs(hit);
  fill('#decoder-out', h('dl', {},
    h('dt', {}, 'Type'), h('dd', {}, h('span', { class: 'type' }, hit.type)),
    h('dt', {}, 'ID'), h('dd', {}, h('code', {}, hit.id)),
    h('dt', {}, 'Source'), h('dd', {}, hit.db),
    h('dt', {}, 'Format'), h('dd', {}, hit.note),
    ...hit.parts.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]),
    known && h('dt', {}, 'On this page'), known && h('dd', {}, known),
    h('dt', {}, 'Open'), h('dd', {}, ext(hit.url, hit.url))));
};

const decodeAndJump = (id) => {
  $('#decoder-input').value = id;
  decode();
  $('#decoder').scrollIntoView({ behavior: 'smooth' });
};

const renderDecoder = () => {
  fill('#examples', ...EXAMPLES.map((e) => h('button', { type: 'button', class: 'example', 'data-id': e.id, title: e.is }, e.id)));
  $('#examples').addEventListener('click', (event) => {
    const btn = event.target.closest('[data-id]');
    if (!btn) return;
    $('#decoder-input').value = btn.dataset.id;
    decode();
  });
  $('#decoder-input').addEventListener('input', decode);
  decode();
};

const table = (sel, caption, head, rows) => fill(sel,
  h('caption', {}, caption),
  h('thead', {}, h('tr', {}, head.map((t) => h('th', { scope: 'col' }, t)))),
  h('tbody', {}, rows));

const live = (id, fmt = (v) => exact(v)) => {
  const m = series(snapshot, id);
  const [y0] = firstOf(m);
  const [y1, v1] = lastOf(m);
  return { from: y0, latest: `${fmt(v1)} (${y1})` };
};

const seriesRows = () => {
  const fixed = (name, from, source, latest, src) => ({ name, from, source, latest, src, id: null });
  const bl = (name, id, fmt) => ({ name, ...live(id, fmt), source: 'BLS', id, src: null });
  const be = (name, id, fmt) => ({ name, ...live(id, fmt), source: 'BEA', id, src: null });
  const coal = COAL.at(-1);
  const f = snapshot.firms.years;
  const inc = snapshot.income;
  const wq = snapshot.wealth.quarters;
  return sortRows([
    fixed('Erie Canal daily wages', HIST.erie.rows[0][0], 'Historical Statistics D 718', `${cents(HIST.erie.rows.at(-1)[1])} (${HIST.erie.rows.at(-1)[0]})`, 'hsus'),
    fixed('Labor force, free and enslaved', HIST.laborForce.rows[0][0], 'Historical Statistics D 167', `${exact(HIST.laborForce.rows.at(-1)[1] * 1000)} (${HIST.laborForce.rows.at(-1)[0]})`, 'hsus'),
    fixed('Work stoppages by issue', HIST.stoppagesByIssue.rows[0][0], 'Historical Statistics D 977', `${exact(HIST.stoppages.rows.at(-1)[1])} (${HIST.stoppages.rows.at(-1)[0]})`, 'hsus'),
    fixed('Weekly hours in manufacturing', HIST.hoursRees.rows[0][0], 'Historical Statistics D 765', `${HIST.hoursBls.rows.at(-1)[1]} (${HIST.hoursBls.rows.at(-1)[0]})`, 'hsus'),
    fixed('Unemployment', HIST.unemployment.rows[0][0], 'Historical Statistics D 86', `${HIST.unemployment.rows.at(-1)[2]}% (${HIST.unemployment.rows.at(-1)[0]})`, 'hsus'),
    fixed('Union membership', HIST.unions.rows[0][0], 'Historical Statistics D 940', `${exact(HIST.unions.rows.at(-1)[1] * 1000)} (${HIST.unions.rows.at(-1)[0]})`, 'hsus'),
    fixed('Coal mining deaths', COAL[0][0], 'MSHA', `${exact(coal[2])} (${coal[0]})`, 'msha'),
    bl('Consumer prices', 'CUUR0000SA0', (v) => v.toFixed(1)),
    bl('Consumer prices, wage earners', 'CWUR0000SA0', (v) => v.toFixed(1)),
    bl('Weekly payroll, production and nonsupervisory workers', 'CEU0500000082', (v) => usd(v * 1000)),
    { ...live('LM105020015', (v) => usd(v * 1e6)), name: 'Inventories, nonfinancial corporations', source: 'Federal Reserve Z.1', src: 'z1', id: null },
    { name: 'Fixed assets, nonfinancial corporations', ...live('k1pnofi2es00', (v) => usd(v * 1e6)), source: 'BEA', id: 'k1pnofi2es00', src: null },
    be('Compensation, nonfinancial corporations', 'A460RC', (v) => usd(v * 1e6)),
    bl('Weekly hours, manufacturing', 'CEU3000000007', (v) => String(v)),
    bl('Output per hour', 'PRS85006093', (v) => v.toFixed(1)),
    bl('Major work stoppages', 'WSU100'),
    bl('Unemployment rate', 'LNU04000000', (v) => `${v}%`),
    bl('Hourly earnings, production workers', 'CEU0500000008', cents),
    fixed('Household income shares', inc[0].year, 'Census H-2', `${inc.at(-1).shares[4]}% to the top fifth (${inc.at(-1).year})`, 'incomeH2'),
    fixed('Firms by size', f[0].year, 'Census BDS', `${exact(f.at(-1).firms)} firms (${f.at(-1).year})`, 'bds'),
    bl('Median weekly earnings', 'LEU0252881500', cents),
    bl('Average prices', 'APU0000708111', cents),
    bl('Union membership rate', 'LUU0204899600', (v) => `${v}%`),
    fixed('Wealth by percentile', Number(wq[0].date.slice(0, 4)), 'Federal Reserve DFA', `${pct(wq.at(-1)['Net worth'].Bottom50)} to the bottom half (${wq.at(-1).date})`, 'dfa'),
    bl('U-6', 'LNU03327709', (v) => `${v}%`),
    fixed('Value added by industry', snapshot.industries.years[0], 'BEA GDP by Industry', `${snapshot.industries.rows.filter((r) => r.depth === 1).length} sectors (${snapshot.industries.years.at(-1)})`, 'beaIndustry'),
    bl('Job openings', 'JTU000000000000000JOL', (v) => exact(v * 1000)),
    bl('Fatal work injuries', 'FWU00X00000080N00'),
    bl('Nonfatal injury rate', 'ISU00000000031100', (v) => String(v)),
    fixed('Lobbying by named organizations', snapshot.lobbying.prior, 'lda.gov', `${snapshot.lobbying.orgs.length} organizations (${snapshot.lobbying.year})`, 'lda'),
  ], 'from', 'asc');
};

const renderSeries = () => {
  const rows = seriesRows();
  $('#series-title').textContent = `${rows.length} series on this page, by first year`;
  table('#series-table', 'Series, first year in the data shown here, and latest value', ['Series', 'From', 'Source', 'Latest', 'Try'],
    rows.map((r) => h('tr', { 'data-search': `${r.name} ${r.source} ${r.from} ${r.id ?? ''}` },
      h('td', {}, r.id ? ext(identify(r.id).url, r.name) : ext(SOURCES[r.src], r.name)),
      h('td', { class: 'n' }, r.from),
      h('td', {}, r.source),
      h('td', { class: 'n' }, r.latest),
      h('td', {}, r.id ? h('button', { type: 'button', class: 'textbtn example', 'data-id': r.id, onclick: () => decodeAndJump(r.id) }, r.id) : ''))));
};

const renderRecords = () => fill('#records',
  ...records(snapshot).map((r) => h('li', { 'data-search': r.text }, h('span', {}, r.text, ' ', ext(r.href, 'source', { class: 'src' })))));

const shuffle = () => {
  const items = $$('#records li').filter((li) => !li.hidden);
  if (!items.length) return;
  const current = items.findIndex((li) => li.classList.contains('lit'));
  let next = Math.floor(Math.random() * items.length);
  if (items.length > 1 && next === current) next = (next + 1) % items.length;
  items.forEach((li) => li.classList.remove('lit'));
  items[next].classList.add('lit');
  items[next].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
};

const renderReference = () => {
  table('#terms-table', 'Classical terms as computed on this page', ['Term', 'Measure', 'Source'],
    TERMS.map((t) => h('tr', { 'data-search': `${t.term} ${t.measure} ${t.table}` },
      h('td', {}, h('b', {}, t.term)), h('td', {}, t.measure), h('td', {}, t.table))));
  table('#cadence-table', 'How often things change', ['Release', 'Schedule', ''],
    CADENCES.map((c) => h('tr', { 'data-search': `${c.resource} ${c.cadence}` },
      h('td', {}, h('b', {}, c.resource)), h('td', {}, c.cadence), h('td', {}, cite(c.src)))));
  const example = (code) => BLS_SERIES.find((x) => x.id.startsWith(code))?.id;
  table('#survey-table', 'BLS series ID prefixes', ['Prefix', 'Survey', 'Example on this page'],
    Object.entries(BLS_SURVEYS).map(([code, name]) => h('tr', { 'data-search': `${code} ${name}` },
      h('td', {}, h('code', {}, code)), h('td', {}, name),
      h('td', {}, example(code) ? h('button', { type: 'button', class: 'textbtn example', 'data-id': example(code), onclick: () => decodeAndJump(example(code)) }, example(code)) : '—'))));
};

const DATA_SOURCES = [
  ['BLS data query tool', 'https://data.bls.gov/pdq/SurveyOutputServlet'],
  ['BEA NIPA flat file', 'https://apps.bea.gov/national/Release/TXT/NipaDataA.txt'],
  ['BEA fixed assets flat file', 'https://apps.bea.gov/national/FixedAssets/Release/TXT/FixedAssets.txt'],
  ['BEA value added by industry', 'https://apps.bea.gov/industry/Release/XLS/GDPxInd/ValueAdded.xlsx'],
  ['Census Business Dynamics Statistics files', 'https://www2.census.gov/programs-surveys/bds/tables/time-series/'],
  ['Census historical income table H-2', 'https://www2.census.gov/programs-surveys/cps/tables/time-series/historical-income-households/h02ar.xlsx'],
  ['Federal Reserve DFA net worth levels', 'https://www.federalreserve.gov/releases/z1/dataviz/download/dfa-networth-levels.csv'],
  ['Lobbying Disclosure Act API', 'https://lda.gov/api/v1/filings/'],
];

const SITE = 'https://collide2954.github.io/labor-polecon/';
const REPO = 'https://github.com/collide2954/labor-polecon';

const renderSources = () => {
  const host = (url) => new URL(url).hostname.replace(/^www\./, '');
  const item = (title, url) => h('li', { 'data-search': `${title} ${url}` }, ext(url, title), ' ', h('small', {}, host(url)));
  const group = (title, items) => h('div', { class: 'srcgroup' }, h('h3', {}, title), h('ul', {}, items));
  const titled = (g) => Object.entries(SOURCES).filter(([key]) => SOURCE_TITLES[key]?.[0] === g).map(([key, url]) => item(SOURCE_TITLES[key][1], url));
  fill('#source-list',
    group('Data files and APIs', DATA_SOURCES.map(([name, url]) => item(name, url))),
    ...SOURCE_GROUPS.map((g) => [g, titled(g)]).filter(([, items]) => items.length).map(([g, items]) => group(g, items)));
  const day = new Date(snapshot.generated).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  fill('#data-use',
    'Every number on this page, as of ', day, ', is in ', h('a', { href: 'snapshot.json', download: '' }, 'snapshot.json'),
    '. The code and the weekly rebuild are on ', ext(REPO, 'GitHub'),
    `. Cite as: Labor & Capital in Numbers, snapshot of ${day}. ${SITE}`);
  fill('#foot',
    h('p', {}, `Built from public BLS, BEA, Census, Federal Reserve, MSHA and lobbying disclosure data. Snapshot ${snapshot.generated.slice(0, 16).replace('T', ' ')} UTC. Not an official government site.`),
    h('p', { class: 'made' }, 'Made by a person, with help from AI tools. Every line, chart and figure was reviewed before publishing; the numbers now refresh on their own each Sunday.'));
};

const SEARCHABLE = [
  '#series-table tbody tr', '#records li', '#source-list li', '#terms-table tbody tr', '#cadence-table tbody tr', '#survey-table tbody tr',
  '#groups-multiples .panel', 'details.hist tbody tr',
];

const applySearch = () => {
  for (const sel of SEARCHABLE) {
    for (const node of $$(sel)) node.hidden = !matches(node.dataset.search ?? node.textContent, state.query);
  }
  applyTimeline();
};

let searchTimer;
const onSearch = (event) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.query = event.target.value;
    applySearch();
  }, 120);
};

const THEME_KEY = 'labor-polecon-theme';
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
const theme = () => document.documentElement.dataset.theme || (darkQuery.matches ? 'dark' : 'light');

const store = {
  get: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      return false;
    }
    return true;
  },
};

const drawCharts = () => {
  renderHours();
  renderDivision();
  renderSurplus();
  renderIndustries();
  renderProductivity();
  renderWages();
  renderSpread();
  renderBasket();
  renderCanal();
  renderComposition();
  renderProfit();
  renderConcentration();
  renderUnemployment();
  renderLayers();
  renderClass();
  renderIncome();
  renderHouseholds();
  renderWealth();
  renderTaxes();
  renderUnions();
  renderStrikes();
  renderInjury();
  renderLobbying();
  tl?.redraw();
  applySearch();
};

const paintTheme = () => {
  $('#theme').textContent = theme() === 'dark' ? 'Light' : 'Dark';
  $('#theme').setAttribute('aria-pressed', String(theme() === 'dark'));
};

const initTheme = () => {
  const saved = store.get(THEME_KEY);
  if (saved) document.documentElement.dataset.theme = saved;
  paintTheme();
  darkQuery.addEventListener('change', () => {
    paintTheme();
    drawCharts();
  });
  $('#theme').addEventListener('click', () => {
    const next = theme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    store.set(THEME_KEY, next);
    paintTheme();
    drawCharts();
  });
};

const applyLens = (lens, push) => {
  state.lens = lens;
  $$('#lenses button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lens === lens)));
  $$('main > section').forEach((sec) => { sec.hidden = !inLens(sec.dataset.lens, lens); });
  for (const ch of $$('main > .chapter')) {
    const members = [];
    for (let n = ch.nextElementSibling; n && !n.classList.contains('chapter'); n = n.nextElementSibling) members.push(n);
    ch.hidden = members.every((n) => n.hidden);
  }
  $$('#jump a').forEach((a) => { a.hidden = $(`#${a.dataset.for}`).hidden; });
  $('#lens-hint').textContent = LENSES.find((l) => l.id === lens).hint;
  if (push) {
    history.replaceState(null, '', `${location.pathname}${lensSearch(location.search, lens)}${location.hash}`);
    drawCharts();
  }
};

const renderLenses = () => {
  fill('#lenses', ...LENSES.map((l) => h('button', { type: 'button', 'data-lens': l.id, 'aria-pressed': 'false', title: l.hint }, l.label)));
  fill('#jump', ...$$('main > .chapter, main > section[data-nav]').map((n) => (n.classList.contains('chapter')
    ? h('a', { href: `#${n.id}`, 'data-for': n.id, class: 'jump-ch' }, $('.chapter-title', n).textContent)
    : h('a', { href: `#${n.id}`, 'data-for': n.id }, n.dataset.nav))));
  $('#lenses').addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-lens]');
    if (btn) applyLens(btn.dataset.lens, true);
  });
};

let resizeTimer;
let lastWidth = 0;
const onResize = () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    drawCharts();
  }, 160);
};

const init = () => {
  initTheme();
  renderLenses();
  renderHead();
  renderLede();
  renderReference();
  renderTimeline();
  renderSeries();
  renderRecords();
  renderDecoder();
  renderSources();
  drawCharts();
  applyLens(readLens(location.search), false);
  observeFigures();
  lastWidth = window.innerWidth;
  window.addEventListener('resize', onResize);
  $('#q').addEventListener('input', onSearch);
  $('#timeline-tags').addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-tag]');
    if (!btn) return;
    const tag = btn.dataset.tag;
    if (state.tags.has(tag)) state.tags.delete(tag);
    else state.tags.add(tag);
    btn.setAttribute('aria-pressed', String(state.tags.has(tag)));
    applyTimeline();
  });
  $('#zoom-in').addEventListener('click', () => tl.zoom(0.6));
  $('#zoom-out').addEventListener('click', () => tl.zoom(1.6));
  $('#zoom-reset').addEventListener('click', () => tl.reset());
  $('#shuffle').addEventListener('click', shuffle);
};

init();
