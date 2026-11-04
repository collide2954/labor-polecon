import { exact, pct, usd, wordy, cents } from './lib.js';
import {
  series, accounts, workday, minWageYear, minutes, industryRate, classShares, reserveLayers, nationalIncome, federalReceipts, peak, deflate,
  perThousand, WAGE_PRICES, percentOf, prisonRates, worldShares,
} from './calc.js';
import {
  HIST, COAL, MIN_WAGE, TIMELINE, INDUSTRY_LABELS, SOURCES, POP, ORDER,
} from './facts.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const last = (map) => {
  const year = Math.max(...map.keys());
  return [year, map.get(year)];
};
const fold = (n) => (n >= 10 ? `${Math.round(n)}` : `${Number(n.toFixed(1))}`);
const one = (n) => Number(n.toFixed(1));
const share = (ratio) => pct(ratio);

const hours = (snap) => {
  const [y0, h0] = HIST.hoursRees.rows[0];
  const [y1, h1] = last(series(snap, 'CEU3000000007'));
  return `The manufacturing week: ${h0} hours in ${y0}, ${h1} in ${y1}`;
};

const division = (snap) => {
  const acc = accounts(snap).at(-1);
  const h = series(snap, 'CEU3000000007').get(acc.year);
  const d = workday(h, acc.rate);
  return `Of a ${h}-hour manufacturing week in ${acc.year}, ${d.necessary.toFixed(1)} hours match wages and ${d.surplus.toFixed(1)} match surplus value`;
};

const surplus = (snap) => {
  const acc = accounts(snap).at(-1);
  return `Nonfinancial corporations, ${acc.year}: ${cents(acc.rate)} of surplus value per dollar of variable capital`;
};

export const industryRates = (snap) => {
  const { years, rows } = snap.industries;
  return rows.filter((r) => r.depth === 1).map((r) => ({
    label: INDUSTRY_LABELS[r.label] ?? r.label, r, rates: years.map((y) => industryRate(snap, r, y)),
  })).filter((x) => x.rates.at(-1));
};

const industries = (snap) => {
  const year = snap.industries.years.at(-1);
  const ranked = industryRates(snap).map((x) => ({ label: x.label, v: x.rates.at(-1).rate }));
  const hi = peak(ranked, 'v');
  const lo = peak(ranked, 'v', 'min');
  return `${hi.label}: ${cents(hi.v)} of surplus value per dollar of variable capital in ${year}. ${lo.label}: ${cents(lo.v)}`;
};

export const realEarnings = (snap) => {
  const ahe = series(snap, 'CEU0500000008');
  const cpi = series(snap, WAGE_PRICES);
  const to = Math.max(...[...ahe.keys()].filter((y) => cpi.has(y)));
  return [...ahe].filter(([y]) => cpi.has(y)).sort((a, b) => a[0] - b[0]).map(([year, v]) => ({ year, nominal: v, v: deflate(v, cpi.get(year), cpi.get(to)), to }));
};

const productivity = (snap) => {
  const out = series(snap, 'PRS85006093');
  const pay = realEarnings(snap);
  const y0 = pay[0].year;
  const [, o1] = last(out);
  return `Since ${y0}, output per hour has risen ${fold(o1 / out.get(y0))}-fold, real hourly earnings of production and nonsupervisory workers ${fold(pay.at(-1).v / pay[0].v)}-fold`;
};

const wages = (snap) => {
  const rows = realEarnings(snap);
  const now = rows.at(-1);
  return `Real hourly earnings of production and nonsupervisory workers, in ${now.year} dollars: ${cents(rows[0].v)} in ${rows[0].year}, ${cents(now.v)} in ${now.year}`;
};

export const realMinimum = (snap) => {
  const cpi = series(snap, WAGE_PRICES);
  const [to, now] = last(cpi);
  return [...cpi.keys()].sort((a, b) => a - b).map((year) => ({ year, nominal: minWageYear(MIN_WAGE, year) }))
    .filter((r) => r.nominal !== null).map((r) => ({ ...r, real: deflate(r.nominal, cpi.get(r.year), now), to }));
};

const minimum = (snap) => {
  const rows = realMinimum(snap);
  const top = peak(rows, 'real');
  const now = rows.at(-1);
  return `In ${now.year} dollars, the federal minimum wage was highest in ${top.year}: ${cents(top.real)}. It is ${cents(now.nominal)}`;
};

const spread = (snap) => {
  const [year, p90] = last(series(snap, 'LEU0252911500'));
  return `The 90th percentile of weekly earnings is ${one(p90 / series(snap, 'LEU0252911200').get(year))} times the 10th, ${year}`;
};

const basket = (snap) => {
  const eggs = series(snap, 'APU0000708111');
  const ahe = series(snap, 'CEU0500000008');
  const years = [...eggs.keys()].filter((y) => ahe.has(y));
  const [a, b] = [Math.min(...years), Math.max(...years)];
  const m = (y) => minutes(eggs.get(y), ahe.get(y)).toFixed(1);
  return `A dozen eggs: ${m(a)} minutes of work in ${a}, ${m(b)} in ${b}`;
};

const canal = () => {
  const rows = HIST.erie.rows.filter((r) => r[1] !== null);
  return `A canal laborer’s day: ${cents(rows[0][1])} in ${rows[0][0]}, ${cents(rows.at(-1)[1])} in ${rows.at(-1)[0]}`;
};

const composition = (snap) => {
  const acc = accounts(snap).at(-1);
  return `${cents(acc.composition)} of constant capital for every dollar of variable capital, ${acc.year}`;
};

const profit = (snap) => {
  const rows = accounts(snap).filter((r) => r.profit !== null);
  const hi = peak(rows, 'profit');
  const lo = peak(rows, 'profit', 'min');
  const now = rows.at(-1);
  return `Rate of profit: ${share(now.profit)} in ${now.year}. Highest: ${share(hi.profit)} in ${hi.year}. Lowest: ${share(lo.profit)} in ${lo.year}`;
};

const concentration = (snap) => {
  const y = snap.firms.years.at(-1);
  return `${exact(y.topFirms)} firms with 10,000 or more employees employ ${share(y.topEmp / y.emp)} of private-sector workers, ${y.year}`;
};

const finance = (snap) => {
  const [year, fin] = last(series(snap, 'A587RC'));
  return `Financial corporations: ${share(fin / series(snap, 'A445RC').get(year))} of domestic corporate profits, ${year}`;
};

const unemployment = (snap) => {
  const top = HIST.unemployment.rows.reduce((a, b) => (b[2] > a[2] ? b : a));
  const now = snap.bls.LNU04000000.latest;
  return `Unemployment: ${top[2]}% in ${top[0]}, ${now.value}% in ${MONTHS[Number(now.period.slice(1)) - 1]} ${now.year}`;
};

const layers = (snap) => {
  const r = reserveLayers(snap).at(-1);
  return `${wordy(r.total * 1000)} people unemployed, part time for economic reasons or marginally attached, ${r.year}`;
};

const duration = (snap) => {
  const [year, long] = last(series(snap, 'LNU03008636'));
  return `${share(long / series(snap, 'LNU03000000').get(year))} of the unemployed had looked for work for 27 weeks or more, ${year}`;
};

const klass = (snap) => {
  const rows = classShares(snap);
  return `${share(rows.at(-1).wage)} of the employed work for wages or salaries, against ${share(rows[0].wage)} in ${rows[0].year}`;
};

const enslaved = () => {
  const row = HIST.laborForce.rows.filter((r) => r[3] !== null).at(-1);
  return `${row[0]}: ${exact(row[3] * 1000)} of ${exact(row[1] * 1000)} workers, ${share(row[3] / row[1])}, were enslaved`;
};

const income = (snap) => {
  const r = nationalIncome(snap).at(-1);
  const part = (k) => share(r.parts.find((p) => p.key === k).share);
  return `Compensation: ${part('comp')} of national income in ${r.year}, of which production and nonsupervisory pay ${share(r.workers)}. Corporate profits: ${part('profits')}`;
};

const households = (snap) => {
  const r = snap.income.at(-1);
  return `The top fifth of households received ${r.shares[4]}% of income in ${r.year}; the bottom fifth ${r.shares[0]}%`;
};

const wealth = (snap) => {
  const q = snap.wealth.quarters.at(-1);
  const top = (m) => share(q[m].TopPt1 + q[m].RemainingTop1);
  return `The top 1% hold ${top('Net worth')} of net worth and ${top('Corporate equities and mutual fund shares')} of corporate equities and fund shares, ${q.date}`;
};

const taxes = (snap) => {
  const rows = federalReceipts(snap);
  const corp = (r) => share(r.parts.find((p) => p.key === 'corporate').share);
  return `Corporate income taxes: ${corp(rows[0])} of federal receipts in ${rows[0].year}, ${corp(rows.at(-1))} in ${rows.at(-1).year}`;
};

const unions = (snap) => {
  const [year, rate] = last(series(snap, 'LUU0204899600'));
  const top = HIST.unions.rows.filter((r) => r[2] !== null).reduce((a, b) => (b[2] > a[2] ? b : a));
  return `Union members: ${rate}% of wage and salary workers in ${year}, against ${top[2]}% of nonfarm employment in ${top[0]}`;
};

const strikes = (snap) => {
  const m = series(snap, 'WSU100');
  const [year, n] = last(m);
  const top = peak([...m].map(([y, v]) => ({ y, v })), 'v');
  return `${exact(n)} major work stoppages in ${year}; ${exact(top.v)} in ${top.y}`;
};

const issues = () => {
  const rows = HIST.stoppagesByIssue.rows.filter((r) => r[0] <= 1905);
  const total = rows.reduce((n, r) => n + r[1], 0);
  return `${rows[0][0]} to ${rows.at(-1)[0]}: ${share(rows.reduce((n, r) => n + r[2], 0) / total)} of stoppages were over wages and hours`;
};

const injury = () => {
  const top = COAL.reduce((a, b) => (b[2] > a[2] ? b : a));
  const now = COAL.at(-1);
  return `Coal mining deaths: ${exact(top[2])} in ${top[0]}, ${exact(now[2])} in ${now[0]}`;
};

const fatal = (snap) => {
  const [year, n] = last(series(snap, 'FAU00X00000080N00').size ? series(snap, 'FAU00X00000080N00') : series(snap, 'FWU00X00000080N00'));
  return `${exact(n)} fatal work injuries in ${year}`;
};

const lobbying = (snap) => {
  const l = snap.lobbying;
  const total = (side) => l.orgs.filter((o) => o.side === side).reduce((n, o) => n + o.dollars, 0);
  return `Business groups here reported ${usd(total('business'))} in lobbying in ${l.year}; the unions here, ${usd(total('labor'))}`;
};

const exportOfCapital = (snap) => {
  const all = series(snap, 'A051RC');
  const dom = series(snap, 'A445RC');
  const rows = [...all.keys()].filter((y) => dom.has(y) && all.get(y) > 0).sort((a, b) => a - b).map((y) => [y, (all.get(y) - dom.get(y)) / all.get(y)]);
  const [y0, v0] = rows[0];
  const [y1, v1] = rows.at(-1);
  return `Corporate profits from the rest of the world: ${share(v0)} of all corporate profits in ${y0}, ${share(v1)} in ${y1}`;
};

const COUNTRY = { USA: 'U.S.', CHN: 'China', EUU: 'European Union', JPN: 'Japan', IND: 'India' };

const world = (snap) => {
  const s = worldShares(snap, 'NY.GDP.MKTP.CD');
  const ends = (c) => [s[c][0], s[c].at(-1)];
  const [[y0, u0], [y1, u1]] = ends('USA');
  const [[, c0], [, c1]] = ends('CHN');
  return `${COUNTRY.USA} share of world GDP: ${share(u0 / 100)} in ${y0}, ${share(u1 / 100)} in ${y1}. China: ${share(c0 / 100)} to ${share(c1 / 100)}`;
};

const rentier = (snap) => {
  const [year, v] = percentOf(snap, ['A064RC', 'B703RC', 'A048RC'], 'A065RC').at(-1);
  const pay = series(snap, 'A034RC').get(year) / series(snap, 'A065RC').get(year);
  return `Interest, dividends and rent: ${share(v / 100)} of personal income in ${year}; wages and salaries: ${share(pay)}`;
};

const population = () => {
  const rows = POP.census.rows;
  return `Census count: ${exact(rows[0][1])} in ${rows[0][0]}, ${exact(rows.at(-1)[1])} in ${rows.at(-1)[0]}`;
};

const nativity = (snap) => {
  const top = POP.nativity.rows.reduce((a, b) => (b[2] / b[1] > a[2] / a[1] ? b : a));
  const [year, fb] = last(series(snap, 'LNU01073395'));
  const nb = series(snap, 'LNU01073413').get(year);
  return `Foreign born: ${share(top[2] / top[1])} of the population in ${top[0]}; ${share(fb / (fb + nb))} of the civilian labor force in ${year}`;
};

const poverty = (snap) => {
  const at = (k) => snap.poverty[k].at(-1);
  const [year, black] = at('Black Alone');
  return `Below the poverty line in ${year}: ${black}% of Black people, ${at('Hispanic (any race)')[1]}% of Hispanic people, ${at('White Alone, Not Hispanic')[1]}% of non-Hispanic white people`;
};

const regions = () => {
  const rows = POP.regions.rows;
  const south = (r) => share(r[3] / r[5]);
  return `The South: ${south(rows[0])} of the population in ${rows[0][0]}, ${south(rows.at(-1))} in ${rows.at(-1)[0]}`;
};

const force = (snap) => {
  const rows = percentOf(snap, ['G16008'], 'A191RC');
  const [y0, v0] = rows[0];
  const [y1, v1] = rows.at(-1);
  return `Public order and safety: ${share(v0 / 100)} of GDP in ${y0}, ${share(v1 / 100)} in ${y1}`;
};

const prisons = (snap) => {
  const rows = prisonRates(snap, ORDER.prisonsEarly.rows);
  const top = peak(rows, 'rate');
  const now = rows.at(-1);
  const r = (x) => `${Math.round(x.rate)} in ${x.year}`;
  return `Sentenced prisoners per 100,000 residents: ${[rows[0], top, now].filter((x, i, a) => a.indexOf(x) === i).map(r).join(', ')}`;
};

const removals = () => {
  const rows = ORDER.removals.rows;
  const top = rows.reduce((a, b) => (b[1] > a[1] ? b : a));
  const r = (x) => `${exact(x[1])} in ${x[0]}`;
  return `Noncitizens removed: ${r(rows[0])}, ${r(top)}, ${r(rows.at(-1))}`;
};

const deployments = () => {
  const rows = ORDER.deployments.rows;
  const top = rows.reduce((a, b) => (b[1] > a[1] ? b : a));
  return `Uses of U.S. armed forces abroad in the CRS list: ${rows[0][1]} in the ${rows[0][0]}s, ${top[1]} in the ${top[0]}s`;
};

const history = () => `${TIMELINE.length} events, ${TIMELINE[0].date.slice(0, 4)} to ${TIMELINE.at(-1).date.slice(0, 4)}`;

export const findings = (snap) => ({
  hours: hours(snap),
  division: division(snap),
  surplus: surplus(snap),
  industries: industries(snap),
  productivity: productivity(snap),
  wages: wages(snap),
  minimum: minimum(snap),
  spread: spread(snap),
  basket: basket(snap),
  canal: canal(),
  composition: composition(snap),
  profit: profit(snap),
  concentration: concentration(snap),
  finance: finance(snap),
  export: exportOfCapital(snap),
  world: world(snap),
  rentier: rentier(snap),
  unemployment: unemployment(snap),
  layers: layers(snap),
  duration: duration(snap),
  class: klass(snap),
  population: population(),
  nativity: nativity(snap),
  poverty: poverty(snap),
  regions: regions(),
  enslaved: enslaved(),
  income: income(snap),
  households: households(snap),
  wealth: wealth(snap),
  taxes: taxes(snap),
  unions: unions(snap),
  strikes: strikes(snap),
  issues: issues(),
  injury: injury(),
  fatal: fatal(snap),
  lobbying: lobbying(snap),
  force: force(snap),
  prisons: prisons(snap),
  removals: removals(),
  deployments: deployments(),
  history: history(),
});

const byRow = (rows, i, dir = 'max') => rows.reduce((a, b) => {
  if (b[i] === null) return a;
  return (dir === 'max' ? b[i] > a[i] : b[i] < a[i]) ? b : a;
});

export const records = (snap) => {
  const out = [];
  const add = (text, src) => out.push({ text, href: SOURCES[src] });
  const idle = byRow(HIST.stoppages.rows, 3);
  add(`${idle[0]}: ${exact(idle[3] * 1000)} days idle in work stoppages, the most of any year from 1927 to 1970.`, 'hsus');
  const ws = [...series(snap, 'WSU100')].map(([y, v]) => ({ y, v }));
  const wsHi = peak(ws, 'v');
  const wsLo = peak(ws, 'v', 'min');
  add(`Major work stoppages: ${exact(wsHi.v)} in ${wsHi.y}, ${exact(wsLo.v)} in ${wsLo.y}. BLS has counted them since ${ws[0].y}.`, 'blsWs');
  const coal = byRow(COAL, 2);
  add(`${coal[0]}: ${exact(coal[2])} coal miners killed, ${perThousand(coal[2], coal[1]).toFixed(1)} per 1,000 employed.`, 'msha');
  const zero = COAL.reduce((a, b) => (b[2] < a[2] ? b : a));
  add(`Fewest coal mining deaths since 1900: ${exact(zero[2])}, in ${zero[0]}.`, 'msha');
  const unemp = [...HIST.unemployment.rows.map((r) => ({ y: r[0], v: r[2] })), ...[...series(snap, 'LNU04000000')].filter(([y]) => y > 1947).map(([y, v]) => ({ y, v }))];
  const uLo = peak(unemp, 'v', 'min');
  add(`Lowest annual unemployment rate since 1890: ${uLo.v}%, in ${uLo.y}.`, 'hsus');
  const weeks = [...series(snap, 'LNU03008275')].map(([y, v]) => ({ y, v }));
  const wHi = peak(weeks, 'v');
  add(`Longest average spell of unemployment since 1948: ${wHi.v} weeks, in ${wHi.y}.`, 'blsCps');
  const mins = realMinimum(snap);
  const mLo = peak(mins.filter((r) => r.year >= 1950), 'real', 'min');
  add(`Lowest federal minimum wage since 1950 in ${mins.at(-1).year} dollars: ${cents(mLo.real)}, in ${mLo.year}.`, 'minWage');
  const acc = accounts(snap);
  const rLo = peak(acc, 'rate', 'min');
  const rHi = peak(acc, 'rate');
  add(`Rate of surplus value, nonfinancial corporations: ${cents(rHi.rate)} per dollar of variable capital in ${rHi.year}, ${cents(rLo.rate)} in ${rLo.year}.`, 'beaFlat');
  const short = [...HIST.hoursBls.rows.map((r) => ({ y: r[0], v: r[1] })), ...[...series(snap, 'CEU3000000007')].map(([y, v]) => ({ y, v }))];
  const sLo = peak(short, 'v', 'min');
  add(`Shortest average manufacturing week since 1909: ${sLo.v} hours, in ${sLo.y}.`, 'hsus');
  const members = byRow(HIST.unions.rows, 1);
  add(`Most union members in Historical Statistics: ${exact(members[1] * 1000)}, in ${members[0]}.`, 'hsus');
  const slave = HIST.laborForce.rows.filter((r) => r[3] !== null).map((r) => ({ y: r[0], v: r[3] / r[1] }));
  const sHi = peak(slave, 'v');
  add(`${sHi.y}: ${pct(sHi.v)} of the labor force was enslaved, the largest share in the 1800 to 1860 census years.`, 'hsus');
  const q4 = snap.wealth.quarters.map((q) => ({ y: q.date, v: q['Net worth'].Bottom50 }));
  const bLo = peak(q4, 'v', 'min');
  add(`Lowest share of net worth held by the bottom half of households: ${pct(bLo.v)}, in ${bLo.y}.`, 'dfa');
  const eggs = series(snap, 'APU0000708111');
  const ahe = series(snap, 'CEU0500000008');
  const egg = [...eggs].filter(([y]) => ahe.has(y)).map(([y, v]) => ({ y, v: minutes(v, ahe.get(y)) }));
  const eHi = peak(egg, 'v');
  add(`Most minutes of work for a dozen eggs since ${egg[0].y}: ${eHi.v.toFixed(1)}, in ${eHi.y}.`, 'blsAp');
  const l = snap.lobbying;
  const top = l.orgs.reduce((a, b) => (b.dollars > a.dollars ? b : a));
  const union = l.orgs.filter((o) => o.side === 'labor').reduce((a, b) => (b.dollars > a.dollars ? b : a));
  add(`${l.year} lobbying: ${top.name}, ${usd(top.dollars)}. ${union.name}, ${usd(union.dollars)}.`, 'lda');
  const firms = snap.firms.years;
  add(`Share of private-sector workers in firms of 10,000 or more: ${pct(firms[0].topEmp / firms[0].emp)} in ${firms[0].year}, ${pct(firms.at(-1).topEmp / firms.at(-1).emp)} in ${firms.at(-1).year}.`, 'bds');
  const corp = federalReceipts(snap).map((r) => ({ y: r.year, v: r.parts.find((p) => p.key === 'corporate').share }));
  const cHi = peak(corp, 'v');
  add(`Largest share of federal receipts from corporate income taxes: ${pct(cHi.v)}, in ${cHi.y}.`, 'beaFlat');
  return out;
};
