import { exact, pct, usd, wordy, cents } from './lib.js';
import {
  series, accounts, workday, minWageYear, minutes, industrySurplus, classShares, reserveLayers, nationalIncome, federalReceipts, peak, deflate,
} from './calc.js';
import {
  HIST, COAL, MIN_WAGE, TIMELINE, INDUSTRY_LABELS,
} from './facts.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const last = (map) => {
  const year = Math.max(...map.keys());
  return [year, map.get(year)];
};
const first = (map) => {
  const year = Math.min(...map.keys());
  return [year, map.get(year)];
};
const fold = (n) => (n >= 10 ? `${Math.round(n)}` : `${Number(n.toFixed(1))}`);
const one = (n) => Number(n.toFixed(1));
const share = (ratio) => pct(ratio);
const GOVERNMENT = new Set(['Federal', 'State and local', 'Government']);

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
  return `Nonfinancial corporations, ${acc.year}: ${Math.round(acc.rate * 100)} cents of surplus value for every dollar of wages`;
};

const industries = (snap) => {
  const { years, rows } = snap.industries;
  const i = years.length - 1;
  const ranked = rows.filter((r) => r.depth === 1 && !GOVERNMENT.has(r.label))
    .map((r) => ({ label: INDUSTRY_LABELS[r.label] ?? r.label, v: industrySurplus(r, i) })).filter((r) => r.v !== null);
  const hi = peak(ranked, 'v');
  const lo = peak(ranked, 'v', 'min');
  return `${hi.label}: ${cents(hi.v)} of surplus per dollar of compensation in ${years[i]}. ${lo.label}: ${cents(lo.v)}`;
};

const productivity = (snap) => {
  const out = series(snap, 'PRS85006093');
  const pay = series(snap, 'PRS85006153');
  const [y0, o0] = first(out);
  const [, o1] = last(out);
  return `Since ${y0}, output per hour has risen ${fold(o1 / o0)}-fold and real hourly compensation ${fold(last(pay)[1] / pay.get(y0))}-fold`;
};

const realEarnings = (snap) => {
  const ahe = series(snap, 'CEU0500000008');
  const cpi = series(snap, 'CUUR0000SA0');
  const [to] = last(ahe);
  return [...ahe].filter(([y]) => cpi.has(y)).map(([year, v]) => ({ year, v: deflate(v, cpi.get(year), cpi.get(to)) }));
};

const wages = (snap) => {
  const rows = realEarnings(snap);
  const top = peak(rows, 'v');
  const now = rows.at(-1);
  if (top === now) return `Real hourly earnings of production workers, ${now.year}: ${cents(now.v)}, the highest of any year since ${rows[0].year}`;
  return `Real hourly earnings of production workers peaked in ${top.year} at ${cents(top.v)} in ${now.year} dollars. ${now.year}: ${cents(now.v)}`;
};

export const realMinimum = (snap) => {
  const cpi = series(snap, 'CUUR0000SA0');
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
  return `${cents(acc.composition)} of fixed capital for every dollar of yearly wages, ${acc.year}`;
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
  return `Compensation: ${part('comp')} of national income, ${r.year}. Corporate profits: ${part('profits')}`;
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
  unemployment: unemployment(snap),
  layers: layers(snap),
  duration: duration(snap),
  class: klass(snap),
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
  history: history(),
});
