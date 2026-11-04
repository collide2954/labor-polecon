import { inflateRawSync } from 'node:zlib';

const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

const decode = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
  .replace(/&amp;/g, '&');

const HEADER = /^(series id,year,period,(value|estimate)|year,period,series id,(value|estimate))$/i;

export const parseBlsText = (html) => {
  const text = decode(html.replace(/<[^>]+>/g, '\n'));
  const out = {};
  for (const block of text.split(/^(?=Series Id:)/m).slice(1)) {
    const id = block.match(/^Series Id:\s+(\S+)/)[1];
    const lines = block.split('\n').map((l) => l.trim());
    const head = lines.findIndex((l) => HEADER.test(l));
    if (head < 0) continue;
    const meta = lines.slice(1, head).map((l) => l.match(/^([A-Za-z/ ]+):\s+(.+)$/)).filter(Boolean);
    const element = meta.filter((m) => /^(Data Element|Rate\/Level)$/.test(m[1])).map((m) => m[2]).join(', ');
    const title = meta.find((m) => /^Series title$/i.test(m[1]))?.[2] || element || meta.map((m) => m[2]).join(', ');
    const cols = lines[head].toLowerCase().replace('estimate', 'value').split(',');
    const rows = [];
    for (const line of lines.slice(head + 1)) {
      const cells = line.split(',');
      if (cells.length !== 4) break;
      const get = (name) => cells[cols.indexOf(name)];
      const raw = get('value');
      const value = num(raw.replace(/\(.*?\)/g, ''));
      if (value === null) continue;
      rows.push({ year: Number(get('year')), period: get('period'), value, preliminary: /\(P\)/.test(raw) });
    }
    out[id] = { title, rows };
  }
  return out;
};

const ANNUAL = new Set(['M13', 'Q05', 'A01']);

export const annual = (rows) => {
  const published = new Map();
  const months = new Map();
  for (const r of rows) {
    if (ANNUAL.has(r.period)) published.set(r.year, r.value);
    else if (/^M(0[1-9]|1[0-2])$/.test(r.period)) months.set(r.year, [...(months.get(r.year) ?? []), r.value]);
  }
  for (const [year, list] of months) {
    if (!published.has(year) && list.length >= 11) {
      published.set(year, Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 1000) / 1000);
    }
  }
  return [...published].sort((a, b) => a[0] - b[0]);
};

export const latest = (rows) => {
  const last = rows.filter((r) => !ANNUAL.has(r.period) && /^[MQ]\d\d$/.test(r.period)).at(-1);
  return last ? { year: last.year, period: last.period, value: last.value } : null;
};

export const splitCsv = (line) => {
  const out = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      out.push(cell);
      cell = '';
    } else cell += ch;
  }
  out.push(cell);
  return out;
};

export const parseBeaFlat = (text, codes) => {
  const want = new Set(codes);
  const out = {};
  for (const line of text.split('\n')) {
    const comma = line.indexOf(',');
    const code = line.slice(0, comma);
    if (!want.has(code)) continue;
    const [, period, value] = splitCsv(line.trim());
    if (!/^\d{4}$/.test(period)) continue;
    (out[code] ??= []).push([Number(period), num(value)]);
  }
  for (const list of Object.values(out)) list.sort((a, b) => a[0] - b[0]);
  return out;
};

export const parseRegister = (text, codes) => {
  const want = new Set(codes);
  const out = {};
  for (const line of text.split('\n')) {
    const cells = splitCsv(line.trim());
    if (!want.has(cells[0])) continue;
    out[cells[0]] = { label: cells[1], metric: cells[2], lines: cells[5].split('|').filter((l) => /^(T|FAAt)/.test(l)) };
  }
  return out;
};

const unzip = (buffer) => {
  let end = buffer.length - 22;
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end -= 1;
  const count = buffer.readUInt16LE(end + 10);
  let at = buffer.readUInt32LE(end + 16);
  const files = {};
  for (let k = 0; k < count; k += 1) {
    const method = buffer.readUInt16LE(at + 10);
    const size = buffer.readUInt32LE(at + 20);
    const nameLen = buffer.readUInt16LE(at + 28);
    const extraLen = buffer.readUInt16LE(at + 30);
    const commentLen = buffer.readUInt16LE(at + 32);
    const offset = buffer.readUInt32LE(at + 42);
    const name = buffer.toString('utf8', at + 46, at + 46 + nameLen);
    const start = offset + 30 + buffer.readUInt16LE(offset + 26) + buffer.readUInt16LE(offset + 28);
    const data = buffer.subarray(start, start + size);
    files[name] = method === 8 ? inflateRawSync(data) : data;
    at += 46 + nameLen + extraLen + commentLen;
  }
  return files;
};

const textOf = (xml) => decode([...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(''));

const column = (ref) => [...ref.replace(/\d+$/, '')].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

export const readXlsx = (buffer) => {
  const files = unzip(buffer);
  const read = (name) => files[name]?.toString('utf8') ?? '';
  const shared = [...read('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]));
  const targets = Object.fromEntries([...read('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)]
    .map(([tag]) => [tag.match(/Id="([^"]+)"/)[1], tag.match(/Target="([^"]+)"/)[1]]));
  const book = {};
  for (const [tag] of read('xl/workbook.xml').matchAll(/<sheet\b[^>]*>/g)) {
    const name = decode(tag.match(/name="([^"]+)"/)[1]);
    const target = targets[tag.match(/r:id="([^"]+)"/)[1]];
    const path = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
    const rows = [];
    for (const [, attrs, body] of read(path).matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
      const index = Number(attrs.match(/r="(\d+)"/)[1]) - 1;
      while (rows.length < index) rows.push([]);
      const row = [];
      for (const [, cellAttrs, inner = ''] of body.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const col = column(cellAttrs.match(/r="([A-Z]+\d+)"/)[1]);
        while (row.length < col) row.push(null);
        const type = cellAttrs.match(/t="([^"]+)"/)?.[1];
        const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        if (type === 's') row.push(shared[Number(v)]);
        else if (type === 'inlineStr') row.push(textOf(inner));
        else if (type === 'str') row.push(decode(v ?? ''));
        else row.push(v === undefined ? null : Number(v));
      }
      rows.push(row);
    }
    book[name] = rows;
  }
  return book;
};

const COMPONENTS = ['Compensation of employees', 'Taxes on production and imports less subsidies', 'Gross operating surplus'];

export const parseValueAdded = (rows) => {
  const head = rows.findIndex((r) => r[0] === 'Line');
  const years = rows[head].slice(3).map(Number);
  const body = rows.slice(head + 1).filter((r) => typeof r[1] === 'string');
  const label = (r) => r[1].trim();
  const industries = [];
  for (let i = 0; i + 3 < body.length; i += 1) {
    const next = body.slice(i + 1, i + 4).map(label);
    if (COMPONENTS.includes(label(body[i])) || next.join('|') !== COMPONENTS.join('|')) continue;
    const values = (r) => r.slice(3, 3 + years.length).map(num);
    industries.push({
      line: Number(body[i][0]),
      label: label(body[i]),
      depth: Math.floor((body[i][1].length - body[i][1].trimStart().length) / 2),
      comp: values(body[i + 1]),
      taxes: values(body[i + 2]),
      gos: values(body[i + 3]),
    });
  }
  return { years, industries };
};

const csvRows = (text) => {
  const [head, ...lines] = text.trim().split(/\r?\n/).map(splitCsv);
  return lines.map((cells) => Object.fromEntries(head.map((h, i) => [h, cells[i]])));
};

export const parseBds = (text) => {
  const rows = csvRows(text);
  const size = (r) => r.fsize.replace(/^[a-z]\)\s*/, '');
  const top = size(rows.at(-1));
  const byYear = new Map();
  for (const r of rows) {
    const year = Number(r.year);
    const y = byYear.get(year) ?? { year, firms: 0, emp: 0, topFirms: 0, topEmp: 0 };
    y.firms += num(r.firms);
    y.emp += num(r.emp);
    if (size(r) === top) {
      y.topFirms = num(r.firms);
      y.topEmp = num(r.emp);
    }
    byYear.set(year, y);
  }
  const years = [...byYear.values()].sort((a, b) => a.year - b.year);
  const last = years.at(-1).year;
  return {
    years,
    sizes: rows.filter((r) => Number(r.year) === last).map((r) => ({ size: size(r), firms: num(r.firms), emp: num(r.emp) })),
    top,
  };
};

export const parseDfa = (text, measures) => {
  const rows = csvRows(text);
  const groups = [...new Set(rows.map((r) => r.Category))];
  const dates = [...new Set(rows.map((r) => r.Date))];
  const quarters = dates.map((date) => {
    const here = rows.filter((r) => r.Date === date);
    const q = { date };
    for (const m of measures) {
      const total = here.reduce((n, r) => n + num(r[m]), 0);
      q[m] = Object.fromEntries(here.map((r) => [r.Category, Math.round((num(r[m]) / total) * 1e4) / 1e4]));
    }
    return q;
  });
  return { groups, quarters };
};

export const parseIncomeShares = (rows) => {
  const seen = new Map();
  for (const r of rows) {
    const year = Number(String(r[0] ?? '').replace(/\s*\(\d+\)\s*$/, ''));
    if (!Number.isInteger(year) || year < 1900 || seen.has(year)) continue;
    seen.set(year, { year, shares: r.slice(2, 7).map(num), top5: num(r[7]) });
  }
  return [...seen.values()].sort((a, b) => a.year - b.year);
};

export const parseZ1 = (buffer, file, codes) => {
  const [head, ...rows] = unzip(buffer)[file].toString('utf8').trim().split(/\r?\n/).map(splitCsv);
  const out = {};
  for (const code of codes) {
    const k = head.indexOf(code);
    if (k < 0) continue;
    out[code] = rows.map((r) => [Number(r[0]), num(r[k])]).filter(([y, v]) => Number.isInteger(y) && v !== null);
  }
  return out;
};

export const parseWorldBank = (json) => {
  const out = {};
  for (const r of json[1] ?? []) {
    if (r.value === null) continue;
    ((out[r.indicator.id] ??= {})[r.countryiso3code] ??= []).push([Number(r.date), r.value]);
  }
  for (const byCountry of Object.values(out)) for (const list of Object.values(byCountry)) list.sort((a, b) => a[0] - b[0]);
  return out;
};

const yearOfCell = (v) => {
  const m = String(v ?? '').trim().match(/^(\d{4})\b/);
  return m ? Number(m[1]) : null;
};

const isLabel = (r) => typeof r[0] === 'string' && yearOfCell(r[0]) === null && r.slice(1).every((c) => c === null || c === undefined || c === '');

export const parsePovertyByRace = (rows, blocks) => {
  const out = {};
  let current = null;
  for (const r of rows) {
    if (!r.length) continue;
    if (isLabel(r)) {
      current = r[0].trim();
      continue;
    }
    const year = yearOfCell(r[0]);
    if (year === null || !blocks.includes(current)) continue;
    const pct = num(r[3]);
    if (pct === null) continue;
    const list = (out[current] ??= []);
    if (!list.some(([y]) => y === year)) list.push([year, pct]);
  }
  for (const list of Object.values(out)) list.sort((a, b) => a[0] - b[0]);
  return out;
};

const HOME_COLUMNS = ['U.S.', 'Non-Hispanic White Alone', 'Black Alone', 'Hispanic (of any race)'];

export const parseHomeownership = (rows) => {
  const head = rows.find((r) => /^Year and/.test(String(r[0] ?? '')));
  const index = HOME_COLUMNS.map((c) => head.findIndex((h) => typeof h === 'string' && h.trim() === c));
  const quarters = new Map();
  let year = null;
  for (const r of rows) {
    const y = typeof r[0] === 'number' ? r[0] : null;
    if (y && r.slice(1).every((c) => c === null || c === undefined)) {
      year = y;
      continue;
    }
    if (year && /^[1-4](st|nd|rd|th)/.test(String(r[0] ?? '').trim())) {
      (quarters.get(year) ?? quarters.set(year, []).get(year)).push(index.map((k) => num(r[k])));
    }
  }
  const years = [...quarters].filter(([, q]) => q.length === 4 && q.every((v) => v.every((x) => x !== null)))
    .map(([y, q]) => [y, ...index.map((_, k) => q.reduce((n, v) => n + v[k], 0) / 4)])
    .sort((a, b) => a[0] - b[0]);
  return { columns: HOME_COLUMNS, years };
};

export const parseAgeSex = (text) => {
  const [head, ...lines] = text.trim().split(/\r?\n/).map(splitCsv);
  const cols = head.map((h, i) => [h.match(/^POPESTIMATE(\d{4})$/)?.[1], i]).filter(([y]) => y);
  const [year, k] = cols.reduce((a, b) => (Number(b[0]) > Number(a[0]) ? b : a));
  const both = lines.filter((r) => r[0] === '0');
  const value = (r) => Number(r[k]);
  return {
    year: Number(year),
    ages: both.filter((r) => r[1] !== '999').map((r) => [Number(r[1]), value(r)]),
    total: value(both.find((r) => r[1] === '999')),
  };
};

export const parsePrisoners = (rows) => rows
  .filter((r) => r.STATE === 'US' && Number(r.JURGT1M) >= 0 && Number(r.JURGT1F) >= 0)
  .map((r) => [Number(r.YEAR), Number(r.JURGT1M) + Number(r.JURGT1F)])
  .sort((a, b) => a[0] - b[0]);

export const lobbyingDollars = (filings) => {
  const byPeriod = new Map();
  for (const f of filings) {
    if (/^R/.test(f.filing_type)) continue;
    const prev = byPeriod.get(f.filing_period);
    if (!prev || f.dt_posted > prev.dt_posted) byPeriod.set(f.filing_period, f);
  }
  return [...byPeriod.values()].reduce((n, f) => n + (num(f.expenses) ?? num(f.income) ?? 0), 0);
};

export const toModule = (value) => `export default ${JSON.stringify(value, null, 2)};\n`;
