export const toNumber = (v) => {
  if (v === null || v === undefined || v === '') return NaN;
  return typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));
};

export const exact = (v) => {
  const n = toNumber(v);
  return Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—';
};

const UNITS = [
  [1e12, 'T'],
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'K'],
];

export const compact = (v) => {
  const n = toNumber(v);
  if (!Number.isFinite(n)) return '—';
  const scaledBy = (size) => Math.round((n / size) * 10) / 10;
  for (const [i, [size, unit]] of UNITS.entries()) {
    if (Math.abs(n) >= size) {
      const scaled = scaledBy(size);
      return Math.abs(scaled) >= 1000 && i > 0 ? `${scaledBy(UNITS[i - 1][0])}${UNITS[i - 1][1]}` : `${scaled}${unit}`;
    }
  }
  return Math.abs(Math.round(n)) >= 1000 ? `${scaledBy(1e3)}K` : String(Math.round(n));
};

export const pct = (ratio) => {
  const v = Math.round(ratio * 1000) / 10;
  return `${v}%`;
};

export const usd = (v) => `$${compact(v)}`;

export const cents = (v) => {
  const n = toNumber(v);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : '—';
};

export const decimal = (v, places = 1) => {
  const n = toNumber(v);
  return Number.isFinite(n) ? n.toFixed(places) : '—';
};

const WORD_UNITS = [[1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million']];

export const wordy = (n) => {
  const unit = WORD_UNITS.find(([size]) => n >= size);
  if (!unit) return exact(n);
  const v = n / unit[0];
  const digits = v >= 100 ? 0 : v >= 10 ? 1 : 2;
  return `${Number(v.toFixed(digits))} ${unit[1]}`;
};

export const ordinal = (n) => {
  const suffix = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${suffix[(v - 20) % 10] || suffix[v] || suffix[0]}`;
};

export const BLS_SURVEYS = {
  AP: 'Average Price Data',
  CE: 'Current Employment Statistics',
  CI: 'Employment Cost Index',
  CM: 'Employer Costs for Employee Compensation',
  CU: 'Consumer Price Index',
  CW: 'Consumer Price Index for Urban Wage Earners',
  EN: 'Quarterly Census of Employment and Wages',
  FA: 'Census of Fatal Occupational Injuries, 2023 forward',
  FW: 'Census of Fatal Occupational Injuries, 2011 to 2022',
  IS: 'Occupational Injuries and Illnesses',
  JT: 'Job Openings and Labor Turnover Survey',
  LA: 'Local Area Unemployment Statistics',
  LE: 'Weekly and Hourly Earnings',
  LN: 'Current Population Survey',
  LU: 'Union Affiliation',
  MP: 'Total Factor Productivity',
  NB: 'National Compensation Survey, Benefits',
  OE: 'Occupational Employment and Wage Statistics',
  PR: 'Productivity and Costs',
  SM: 'State and Metro Area Employment',
  TU: 'American Time Use Survey',
  WP: 'Producer Price Index',
  WS: 'Work Stoppages',
};

const CE_INDUSTRY = {
  '00000000': 'Total nonfarm',
  '05000000': 'Total private',
  '06000000': 'Goods-producing',
  '07000000': 'Service-providing',
  '08000000': 'Private service-providing',
  10000000: 'Mining and logging',
  20000000: 'Construction',
  30000000: 'Manufacturing',
  31000000: 'Durable goods',
  32000000: 'Nondurable goods',
  40000000: 'Trade, transportation, and utilities',
  41420000: 'Wholesale trade',
  42000000: 'Retail trade',
  43000000: 'Transportation and warehousing',
  44220000: 'Utilities',
  50000000: 'Information',
  55000000: 'Financial activities',
  60000000: 'Professional and business services',
  65000000: 'Education and health services',
  70000000: 'Leisure and hospitality',
  80000000: 'Other services',
  90000000: 'Government',
};

const CE_MEASURE = {
  '01': 'All employees, thousands',
  '02': 'Average weekly hours of all employees',
  '03': 'Average hourly earnings of all employees',
  '04': 'Average weekly overtime hours of all employees',
  '06': 'Production and nonsupervisory employees, thousands',
  '07': 'Average weekly hours of production and nonsupervisory employees',
  '08': 'Average hourly earnings of production and nonsupervisory employees',
  '09': 'Average weekly overtime hours of production and nonsupervisory employees',
  32: 'Average hourly earnings of production and nonsupervisory employees, 1982-84 dollars',
};

const CU_AREA = { '0000': 'U.S. city average' };

const CU_ITEM = {
  SA0: 'All items',
  SA0L1E: 'All items less food and energy',
  SAF11: 'Food at home',
  SAH: 'Housing',
  SAM: 'Medical care',
  SEEB: 'Tuition, other school fees, and childcare',
  SEHA: 'Rent of primary residence',
  SETB01: 'Gasoline (all types)',
};

const AP_ITEM = {
  701111: 'Flour, white, all purpose, per pound',
  702111: 'Bread, white, pan, per pound',
  703112: 'Ground beef, 100% beef, per pound',
  706111: 'Chicken, fresh, whole, per pound',
  708111: 'Eggs, grade A, large, per dozen',
  709112: 'Milk, fresh, whole, fortified, per gallon',
  711211: 'Bananas, per pound',
  717311: 'Coffee, 100%, ground roast, per pound',
  72610: 'Electricity, per kWh',
  74714: 'Gasoline, unleaded regular, per gallon',
};

const NLRB_CASE = {
  CA: 'charge against an employer',
  CB: 'charge against a labor organization',
  CC: 'charge against a labor organization over secondary boycotts',
  CD: 'jurisdictional dispute between unions',
  CE: 'charge over a hot cargo agreement',
  CG: 'charge over a health care strike or picket without notice',
  CP: 'charge over recognitional or organizational picketing',
  RC: 'petition by employees or a union for an election',
  RD: 'petition by employees to decertify a union',
  RM: 'petition by an employer for an election',
  UC: 'petition to clarify a bargaining unit',
  AC: 'petition to amend a certification',
  UD: 'petition to rescind union-security authority',
};

const SOC_MAJOR = {
  11: 'Management',
  13: 'Business and Financial Operations',
  15: 'Computer and Mathematical',
  17: 'Architecture and Engineering',
  19: 'Life, Physical, and Social Science',
  21: 'Community and Social Service',
  23: 'Legal',
  25: 'Educational Instruction and Library',
  27: 'Arts, Design, Entertainment, Sports, and Media',
  29: 'Healthcare Practitioners and Technical',
  31: 'Healthcare Support',
  33: 'Protective Service',
  35: 'Food Preparation and Serving Related',
  37: 'Building and Grounds Cleaning and Maintenance',
  39: 'Personal Care and Service',
  41: 'Sales and Related',
  43: 'Office and Administrative Support',
  45: 'Farming, Fishing, and Forestry',
  47: 'Construction and Extraction',
  49: 'Installation, Maintenance, and Repair',
  51: 'Production',
  53: 'Transportation and Material Moving',
  55: 'Military Specific',
};

const NAICS_SECTOR = [
  [['11'], 'Agriculture, Forestry, Fishing and Hunting'],
  [['21'], 'Mining, Quarrying, and Oil and Gas Extraction'],
  [['22'], 'Utilities'],
  [['23'], 'Construction'],
  [['31', '32', '33'], 'Manufacturing'],
  [['42'], 'Wholesale Trade'],
  [['44', '45'], 'Retail Trade'],
  [['48', '49'], 'Transportation and Warehousing'],
  [['51'], 'Information'],
  [['52'], 'Finance and Insurance'],
  [['53'], 'Real Estate and Rental and Leasing'],
  [['54'], 'Professional, Scientific, and Technical Services'],
  [['55'], 'Management of Companies and Enterprises'],
  [['56'], 'Administrative and Support and Waste Management and Remediation Services'],
  [['61'], 'Educational Services'],
  [['62'], 'Health Care and Social Assistance'],
  [['71'], 'Arts, Entertainment, and Recreation'],
  [['72'], 'Accommodation and Food Services'],
  [['81'], 'Other Services (except Public Administration)'],
  [['92'], 'Public Administration'],
];

const NAICS_LEVEL = {
  2: '2-digit sector', 3: '3-digit subsector', 4: '4-digit industry group', 5: '5-digit industry', 6: '6-digit national industry',
};

const NIPA_METRIC = { RC: 'Current dollars', RX: 'Chained dollars', RL: 'Percent change' };

const BEA_NIPA = 'https://apps.bea.gov/iTable/?reqid=19&step=2&isuri=1&categories=survey';
const BEA_FA = 'https://apps.bea.gov/iTable/?reqid=10&step=2';

const adjustment = (code) => (code === 'S' ? 'Seasonally adjusted' : 'Not seasonally adjusted');

const blsParts = (survey, seasonal, rest) => {
  const parts = [['Adjustment', adjustment(seasonal)]];
  if (survey === 'CE' && /^\d{10}$/.test(rest)) {
    const industry = rest.slice(0, 8);
    parts.push(['Industry', CE_INDUSTRY[industry] ?? `Industry code ${industry}`]);
    parts.push(['Measure', CE_MEASURE[rest.slice(8)] ?? `Data type ${rest.slice(8)}`]);
  }
  if (survey === 'CU' && /^[RS]\w{4}\w+$/.test(rest)) {
    const area = rest.slice(1, 5);
    parts.push(['Area', CU_AREA[area] ?? `Area ${area}`]);
    parts.push(['Item', CU_ITEM[rest.slice(5)] ?? `Item ${rest.slice(5)}`]);
  }
  if (survey === 'AP' && /^\w{4}\w+$/.test(rest)) {
    const area = rest.slice(0, 4);
    parts.push(['Area', CU_AREA[area] ?? `Area ${area}`]);
    parts.push(['Item', AP_ITEM[rest.slice(4)] ?? `Item ${rest.slice(4)}`]);
  }
  return parts;
};

const naicsSector = (code) => NAICS_SECTOR.find(([codes]) => codes.includes(code.slice(0, 2)));

const rule = (re, build) => ({ re, build });

const RULES = [
  rule(/^(\d{2})-([A-Z]{2})-(\d{6})$/i, (m) => {
    const kind = m[2].toUpperCase();
    if (!NLRB_CASE[kind]) return null;
    const id = `${m[1]}-${kind}-${m[3]}`;
    return {
      type: 'NLRB case', id, db: 'National Labor Relations Board', url: `https://www.nlrb.gov/case/${id}`,
      note: 'Region, case type and a sequence number', parts: [['Region', m[1]], ['Case type', `${kind}: ${NLRB_CASE[kind]}`]],
    };
  }),
  rule(/^(\d{2})-(\d{4})$/, (m) => {
    if (!SOC_MAJOR[m[1]]) return null;
    const id = `${m[1]}-${m[2]}`;
    return {
      type: 'SOC occupation', id, db: 'Standard Occupational Classification, 2018',
      url: m[2] === '0000' ? 'https://www.bls.gov/soc/2018/major_groups.htm' : `https://www.bls.gov/oes/current/oes${m[1]}${m[2]}.htm`,
      note: 'Major group, minor group, broad occupation, detailed occupation', parts: [['Major group', `${m[1]}-0000 ${SOC_MAJOR[m[1]]}`]],
    };
  }),
  rule(/^(?:nipa\s+)?(?:table\s+)?(\d)\.(\d{1,2})(?:\.(\d{1,2}))?([A-D])?$/i, (m) => {
    const id = `T${m[1]}${m[2].padStart(2, '0')}${(m[3] ?? '0').padStart(2, '0')}${(m[4] ?? '').toUpperCase()}`;
    return { type: 'BEA table', id, db: 'National Income and Product Accounts', url: BEA_NIPA, note: 'Section, table and subtable', parts: [['Table', `${m[1]}.${m[2]}${m[3] ? `.${m[3]}` : ''}${(m[4] ?? '').toUpperCase()}`]] };
  }),
  rule(/^T(\d)(\d{2})(\d{2})([A-D])?$/i, (m) => ({
    type: 'BEA table', id: `T${m[1]}${m[2]}${m[3]}${(m[4] ?? '').toUpperCase()}`, db: 'National Income and Product Accounts', url: BEA_NIPA,
    note: 'Section, table and subtable', parts: [['Table', `${m[1]}.${Number(m[2])}${m[3] !== '00' ? `.${Number(m[3])}` : ''}${(m[4] ?? '').toUpperCase()}`]],
  })),
  rule(/^(\d{2,6})$/, (m) => {
    const sector = naicsSector(m[1]);
    if (!sector) return null;
    const [codes, name] = sector;
    return {
      type: 'NAICS industry', id: m[1], db: 'North American Industry Classification System, 2022',
      url: `https://www.census.gov/naics/?input=${m[1]}&year=2022&details=${m[1]}`,
      note: 'Each added digit narrows the industry', parts: [['Sector', `${codes.length > 1 ? `${codes[0]}-${codes.at(-1)}` : codes[0]} ${name}`], ['Level', NAICS_LEVEL[m[1].length]]],
    };
  }),
  rule(/^([A-Z]{2})([SU])([A-Z0-9]{3,27})$/i, (m) => {
    const survey = m[1].toUpperCase();
    if (!BLS_SURVEYS[survey]) return null;
    const id = m[0].toUpperCase();
    return {
      type: 'BLS series', id, db: BLS_SURVEYS[survey], url: `https://data.bls.gov/timeseries/${id}`,
      note: 'Survey, seasonal adjustment, then survey-specific codes', parts: blsParts(survey, m[2].toUpperCase(), m[3].toUpperCase()),
    };
  }),
  rule(/^([A-Z]\d{3,4})([A-Z0-9]{1,2})$/i, (m) => {
    const id = m[0].toUpperCase();
    const metric = NIPA_METRIC[m[2].toUpperCase()];
    return { type: 'BEA NIPA series', id, db: 'National Income and Product Accounts', url: BEA_NIPA, note: 'Series code, then metric', parts: metric ? [['Metric', metric]] : [] };
  }),
  rule(/^([a-z]\d[a-z0-9]{6,12})$/i, (m) => ({
    type: 'BEA fixed asset series', id: m[1].toLowerCase(), db: 'Fixed Assets Accounts', url: BEA_FA, note: 'Measure, asset type and owner', parts: [],
  })),
];

export const identify = (input) => {
  const value = String(input ?? '').trim();
  if (!value) return null;
  for (const { re, build } of RULES) {
    const m = value.match(re);
    if (m) {
      const hit = build(m);
      if (hit) return hit;
    }
  }
  return null;
};

export const retry = async (fn, { tries = 3, wait = 1000 } = {}) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= tries) throw error;
      await new Promise((r) => setTimeout(r, wait * 2 ** (attempt - 1)));
    }
  }
};

const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const matches = (text, query) => {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  const hay = fold(text);
  return terms.every((t) => hay.includes(t));
};

export const filterTimeline = (items, { tags, orgs, query } = {}) =>
  items.filter((i) =>
    (!tags?.length || tags.includes(i.tag)) &&
    (!orgs?.length || orgs.includes(i.org)) &&
    matches(`${i.date} ${i.org} ${i.tag} ${i.text}`, query));

export const sortRows = (rows, key, dir = 'asc') => {
  const sign = dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const x = a[key];
    const y = b[key];
    if (x === null || x === undefined) return y === null || y === undefined ? 0 : 1;
    if (y === null || y === undefined) return -1;
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * sign;
    return String(x).localeCompare(String(y)) * sign;
  });
};

export const niceTicks = (max, count) => {
  if (!max || max <= 0) return [0];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const r = raw / mag;
  const step = (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10) * mag;
  const top = Math.ceil(max / step - 1e-9) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => Number((i * step).toPrecision(12)));
};

export const yearOf = (date) => Number(String(date).slice(0, 4));

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const longDate = (text) => {
  const [y, m, d] = String(text).split('-');
  if (!m) return y;
  const month = MONTHS[Number(m) - 1];
  return d ? `${Number(d)} ${month} ${y}` : `${month} ${y}`;
};

export const LENSES = [
  { id: 'all', label: 'Everything', hint: 'Every section, in the order of the argument' },
  { id: 'labor', label: 'Labor', hint: 'Hours, wages, unemployment, unions and strikes' },
  { id: 'capital', label: 'Capital', hint: 'Surplus, profit, accumulation, concentration and wealth' },
  { id: 'state', label: 'State', hint: 'Law, taxes, the minimum wage, lobbying and the timeline' },
];

const LENS_IDS = new Set(LENSES.map((l) => l.id));

export const readLens = (search) => {
  const value = new URLSearchParams(search).get('lens');
  return LENS_IDS.has(value) ? value : 'all';
};

export const inLens = (tags, lens) => {
  if (lens === 'all') return true;
  const list = String(tags ?? '').split(/\s+/).filter(Boolean);
  return list.length === 0 || list.includes(lens);
};

export const lensSearch = (search, lens) => {
  const params = new URLSearchParams(search);
  if (lens === 'all') params.delete('lens');
  else params.set('lens', lens);
  const out = params.toString();
  return out ? `?${out}` : '';
};

const STEPS = [1, 2, 5, 10, 20, 25, 50, 100];

export const labelStep = (count, width, gap = 32) =>
  STEPS.find((step) => Math.ceil(count / step) * gap <= width) ?? STEPS.at(-1);

export const waffle = (parts, cells = 100) => {
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  const raw = parts.map((p) => (p.value / total) * cells);
  const counts = raw.map(Math.floor);
  const order = raw.map((r, i) => ({ i, rest: r - Math.floor(r) })).sort((a, b) => b.rest - a.rest || a.i - b.i);
  const missing = cells - counts.reduce((a, b) => a + b, 0);
  for (let k = 0; k < missing; k += 1) counts[order[k].i] += 1;
  return parts.flatMap((p, i) => Array(counts[i]).fill(p.key));
};

export const scaleLinear = ([d0, d1], [r0, r1]) => (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

export const scaleLog = ([d0, d1], [r0, r1]) => {
  const l0 = Math.log10(d0);
  const l1 = Math.log10(d1);
  return (v) => r0 + ((Math.log10(v) - l0) / (l1 - l0)) * (r1 - r0);
};

export const logTicks = (min, max) => {
  const out = [];
  for (let k = Math.ceil(Math.log10(min)); k <= Math.floor(Math.log10(max)); k += 1) out.push(10 ** k);
  return out;
};

export const stack = (rows, keys) => {
  const base = rows.map(() => 0);
  return keys.map((key) => ({
    key,
    points: rows.map((r, i) => {
      const point = [base[i], base[i] + r[key]];
      base[i] += r[key];
      return point;
    }),
  }));
};

const clampSpan = ([a, b], [lo, hi]) => {
  const span = b - a;
  if (a < lo) return [lo, lo + span];
  if (b > hi) return [hi - span, hi];
  return [a, b];
};

export const zoomDomain = ([a, b], center, factor, [lo, hi], minSpan = 1) => {
  const span = Math.min(Math.max((b - a) * factor, minSpan), hi - lo);
  const ratio = (center - a) / (b - a);
  const start = center - ratio * span;
  return clampSpan([start, start + span], [lo, hi]);
};

export const panDomain = ([a, b], delta, limits) => clampSpan([a + delta, b + delta], limits);

export const easeOut = (t) => 1 - (1 - t) ** 3;

export const spread = (positions, gap, lo, hi) => {
  const order = positions.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  let blocks = order.map((o) => ({ items: [o], top: o.p }));
  const fit = (b) => Math.min(Math.max(b.top, lo), hi - (b.items.length - 1) * gap);
  let merged = true;
  while (merged) {
    merged = false;
    const next = [];
    for (const b of blocks) {
      const prev = next.at(-1);
      if (prev && fit(prev) + prev.items.length * gap > fit(b)) {
        const items = [...prev.items, ...b.items];
        const mean = items.reduce((n, o) => n + o.p, 0) / items.length;
        next[next.length - 1] = { items, top: mean - ((items.length - 1) * gap) / 2 };
        merged = true;
      } else next.push(b);
    }
    blocks = next;
  }
  const out = [];
  for (const b of blocks) b.items.forEach((o, k) => { out[o.i] = fit(b) + k * gap; });
  return out;
};
