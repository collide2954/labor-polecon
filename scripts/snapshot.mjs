import { writeFile } from 'node:fs/promises';
import { retry } from '../src/lib.js';
import {
  BLS_SERIES, BLS_BATCHES, blsBatches, NIPA, FIXED, Z1, TROOPS, WORLD, CENSUS, PRISONERS, LOBBY, DFA_MEASURES,
} from '../src/queries.js';
import {
  parseBlsText, annual, latest, parseBeaFlat, parseRegister, readXlsx, parseValueAdded, parseBds, parseDfa,
  parseIncomeShares, parseZ1, parseWorldBank, parsePovertyByRace, parseHomeownership, parseAgeSex, parsePrisoners,
  latestLocationReport, parseLocationReport,
  lobbyingDollars, toModule,
} from './parsers.mjs';

const OUT = new URL('../src/snapshot.js', import.meta.url);
const BLS = 'https://data.bls.gov/pdq/SurveyOutputServlet';
const BEA = 'https://apps.bea.gov';
const BDS = 'https://www2.census.gov/programs-surveys/bds/tables/time-series/';
const INCOME = 'https://www2.census.gov/programs-surveys/cps/tables/time-series/historical-income-households/h02ar.xlsx';
const DFA = 'https://www.federalreserve.gov/releases/z1/dataviz/download/dfa-networth-levels.csv';
const LDA = 'https://lda.gov/api/v1/filings/';
const HEADERS = { 'user-agent': 'labor-polecon-snapshot' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const step = (label) => process.stderr.write(`${label}\n`);

const get = (url, as = 'text', init = {}) => retry(async () => {
  const res = await fetch(url, { ...init, headers: { ...HEADERS, ...init.headers } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  if (as === 'json') return res.json();
  if (as === 'buffer') return Buffer.from(await res.arrayBuffer());
  return res.text();
}, { tries: 6, wait: 2000 });

const blsForm = (ids, from, to) => new URLSearchParams([
  ['request_action', 'get_data'], ['reformat', 'true'], ['from_results_page', 'true'], ['years_option', 'specific_years'],
  ['delimiter', 'comma'], ['output_type', 'column'], ['periods_option', 'all_periods'], ['output_view', 'data'],
  ['from_year', String(from)], ['to_year', String(to)], ['output_format', 'text'], ['original_output_type', 'default'],
  ['annualAveragesRequested', 'true'], ...ids.map((id) => ['series_id', id]),
]);

const bls = async (now) => {
  const out = {};
  for (const batch of blsBatches(BLS_SERIES, BLS_BATCHES)) {
    step(`bls ${batch.ids.join(' ')}`);
    const html = await get(BLS, 'text', { method: 'POST', body: blsForm(batch.ids, batch.from, now.getUTCFullYear()) });
    const parsed = parseBlsText(html);
    for (const id of batch.ids) {
      if (!parsed[id]) throw new Error(`BLS returned no data for ${id}`);
      const meta = BLS_SERIES.find((x) => x.id === id);
      out[id] = { title: parsed[id].title, label: meta.label, annual: annual(parsed[id].rows), latest: latest(parsed[id].rows) };
    }
    await sleep(1500);
  }
  return out;
};

const beaSeries = async (path, codes) => {
  step(`bea ${path}`);
  const data = parseBeaFlat(await get(`${BEA}${path}/Release/TXT/${path.includes('Fixed') ? 'FixedAssets' : 'NipaDataA'}.txt`), codes);
  const register = parseRegister(await get(`${BEA}${path}/Release/TXT/SeriesRegister.txt`), codes);
  return Object.fromEntries(codes.map((code) => {
    if (!data[code]) throw new Error(`BEA returned no data for ${code}`);
    return [code, { label: register[code]?.label ?? null, lines: register[code]?.lines ?? [], years: data[code] }];
  }));
};

const nipa = () => beaSeries('/national', Object.keys(NIPA));
const fixed = () => beaSeries('/national/FixedAssets', Object.keys(FIXED));

const z1 = async () => {
  step('fed z.1');
  const buffer = await get(Z1.url, 'buffer');
  const out = {};
  for (const [file, codes] of Object.entries(Z1.files)) {
    const data = parseZ1(buffer, file, codes);
    for (const code of codes) {
      if (!data[code]) throw new Error(`Z.1 returned no data for ${code}`);
      out[code.replace(/\.A$/, '')] = { years: data[code] };
    }
  }
  return out;
};

const troops = async () => {
  step('dmdc troops by location');
  const pick = latestLocationReport(await get(TROOPS.page, 'json'));
  const book = readXlsx(await get(TROOPS.file(pick.fileId, pick.groupName), 'buffer'));
  const out = parseLocationReport(Object.values(book)[0]);
  if (!out.overseas || out.countries.length < 20) throw new Error('DMDC location report changed shape');
  return { report: pick.name, ...out };
};

const world = async () => {
  const out = {};
  for (const ind of WORLD.indicators) {
    step(`world bank ${ind.id}`);
    const data = parseWorldBank(await get(WORLD.url(ind.id, WORLD.countries.map((c) => c.id)), 'json'))[ind.id];
    if (!data?.USA || !data?.WLD) throw new Error(`World Bank returned no data for ${ind.id}`);
    out[ind.id] = data;
  }
  return out;
};

const poverty = async () => {
  step('census poverty by race');
  const book = readXlsx(await get(CENSUS.poverty, 'buffer'));
  const out = parsePovertyByRace(Object.values(book)[0], CENSUS.povertyBlocks);
  if (!out['All Races'] || !out['Black Alone']) throw new Error('Census poverty table changed shape');
  return out;
};

const homes = async () => {
  step('census homeownership by race');
  const out = parseHomeownership(Object.values(readXlsx(await get(CENSUS.homes, 'buffer')))[0]);
  if (out.years.length < 20) throw new Error('Census homeownership table changed shape');
  return out;
};

const ages = async () => {
  step('census population by age');
  const listing = await get(CENSUS.popest);
  const span = [...listing.matchAll(/href="(2020-(20\d\d))\/"/g)].sort((a, b) => a[2] - b[2]).at(-1);
  const out = parseAgeSex(await get(`${CENSUS.popest}${span[1]}/national/asrh/nc-est${span[2]}-agesex-res.csv`));
  if (out.ages.length < 90) throw new Error('Census age file changed shape');
  return out;
};

const prisons = async () => {
  step('bjs national prisoner statistics');
  const years = parsePrisoners(await get(PRISONERS, 'json'));
  if (years.length < 40 || years[0][0] !== 1978) throw new Error('BJS prisoner data changed shape');
  return { years };
};

const industries = async () => {
  step('bea value added by industry');
  const book = readXlsx(await get(`${BEA}/industry/Release/XLS/GDPxInd/ValueAdded.xlsx`, 'buffer'));
  const sheet = book['TVA113-A'];
  const { years, industries: rows } = parseValueAdded(sheet);
  const published = sheet.map((r) => r[0]).find((c) => /^Data published/.test(c ?? ''))?.replace('Data published ', '') ?? null;
  return { published, years, rows: rows.filter((r) => r.depth <= 1 || r.label === 'Gross domestic product') };
};

const firms = async () => {
  step('census bds');
  const listing = await get(BDS);
  const year = Math.max(...[...listing.matchAll(/href="(\d{4})\/"/g)].map((m) => Number(m[1])));
  const parsed = parseBds(await get(`${BDS}${year}/bds${year}_fz.csv`));
  return { release: year, ...parsed };
};

const income = async () => {
  step('census h-2');
  const book = readXlsx(await get(INCOME, 'buffer'));
  return parseIncomeShares(Object.values(book)[0]);
};

const wealth = async () => {
  step('fed dfa');
  const { groups, quarters } = parseDfa(await get(DFA), DFA_MEASURES);
  const last = quarters.at(-1);
  return { groups, latest: last.date, quarters: quarters.filter((q) => q.date.endsWith('Q4') || q === last) };
};

const same = (a, b) => a.replace(/[^a-z0-9]/gi, '').toLowerCase() === b.replace(/[^a-z0-9]/gi, '').toLowerCase();

const ldaGet = async (url) => {
  for (let attempt = 0; ; attempt += 1) {
    const res = await fetch(url, { headers: HEADERS });
    if (res.ok) return res.json();
    if (attempt >= 8 || (res.status !== 429 && res.status < 500)) throw new Error(`HTTP ${res.status} ${url}`);
    await sleep(15000 * (attempt + 1));
  }
};

const ldaFilings = async (id, year) => {
  const rows = [];
  let url = `${LDA}?${new URLSearchParams({ registrant_id: String(id), filing_year: String(year), page_size: '25' })}`;
  while (url) {
    const page = await ldaGet(url);
    rows.push(...page.results);
    url = page.next;
    await sleep(6000);
  }
  return rows.filter((f) => same(f.client.name, f.registrant.name) || f.expenses !== null);
};

const lobbying = async (now) => {
  const year = now.getUTCFullYear() - 1;
  const prior = year - 10;
  const orgs = [];
  for (const org of LOBBY) {
    step(`lda ${org.name}`);
    orgs.push({ ...org, dollars: lobbyingDollars(await ldaFilings(org.id, year)), prior: lobbyingDollars(await ldaFilings(org.id, prior)) });
  }
  return { year, prior, orgs };
};

const now = new Date();
const SECTIONS = {
  bls: () => bls(now),
  nipa: () => nipa(),
  fixed: () => fixed(),
  z1: () => z1(),
  world: () => world(),
  poverty: () => poverty(),
  homes: () => homes(),
  ages: () => ages(),
  prisons: () => prisons(),
  troops: () => troops(),
  industries: () => industries(),
  firms: () => firms(),
  income: () => income(),
  wealth: () => wealth(),
  lobbying: () => lobbying(now),
};

const only = process.argv.slice(2).filter((a) => SECTIONS[a]);
const base = only.length ? (await import(`${OUT.href}?t=${now.getTime()}`)).default : {};
const snapshot = { ...base, generated: now.toISOString() };
for (const [key, build] of Object.entries(SECTIONS)) {
  if (!only.length || only.includes(key)) snapshot[key] = await build();
}

await writeFile(OUT, toModule(snapshot));
step(`wrote ${OUT.pathname}`);
