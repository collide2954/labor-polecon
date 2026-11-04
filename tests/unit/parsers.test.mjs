import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import {
  parseBlsText,
  annual,
  latest,
  parseBeaFlat,
  parseRegister,
  splitCsv,
  readXlsx,
  parseValueAdded,
  parseBds,
  parseDfa,
  parseIncomeShares,
  parseZ1,
  parseWorldBank,
  parsePovertyByRace,
  parseHomeownership,
  parseAgeSex,
  lobbyingDollars,
  toModule,
} from '../../scripts/parsers.mjs';

const BLS = `<HTML><BODY><H4> Current Employment Statistics</H4><PRE CLASS="csv-output text-only">

Series Id:    CEU0500000008
Series Title: Average hourly earnings of production and nonsupervisory employees, total private, not seasonally adjusted


Series Id,Year,Period,Value
CEU0500000008,2024,M11,30.95
CEU0500000008,2024,M12,31.02
CEU0500000008,2024,M13,30.47
CEU0500000008,2025,M01,31.10(P)

</PRE><H4> Job Openings</H4><PRE CLASS="csv-output text-only">

Series Id:    JTU000000000000000QUL

Not seasonally adjusted
Data Element: Quits
Rate/Level:   Level - In Thousands


Year,Period,Series Id,Value
2024,M12,JTU000000000000000QUL,2884
2024,M13,JTU000000000000000QUL,39285

9 : Data unavailable due to the 2025 lapse in appropriations.
</PRE><PRE>
Series Id:    LUU0204899600
Series title: (unadj)- Percent of employed, Members of unions

Series id,Year,Period,Value
LUU0204899600,2024,A01,9.9
LUU0204899600,2025,A01,10.0(11)
</PRE></BODY></HTML>`;

test('parseBlsText reads every series block in either column order', () => {
  const out = parseBlsText(BLS);
  assert.deepEqual(Object.keys(out), ['CEU0500000008', 'JTU000000000000000QUL', 'LUU0204899600']);
  assert.equal(out.CEU0500000008.title, 'Average hourly earnings of production and nonsupervisory employees, total private, not seasonally adjusted');
  assert.equal(out.JTU000000000000000QUL.title, 'Quits, Level - In Thousands');
  assert.equal(out.LUU0204899600.title, '(unadj)- Percent of employed, Members of unions');
  assert.deepEqual(out.CEU0500000008.rows.at(-1), { year: 2025, period: 'M01', value: 31.1, preliminary: true });
  assert.deepEqual(out.JTU000000000000000QUL.rows[1], { year: 2024, period: 'M13', value: 39285, preliminary: false });
  assert.equal(out.LUU0204899600.rows[1].value, 10);
});

test('parseBlsText reads CPS blocks whose value column is called Estimate', () => {
  const out = parseBlsText('<PRE>Series Id:          LNU04000000\n\nNot Seasonally Adjusted\nSeries title:       (Unadj) Unemployment Rate\n\nSeries id,Year,Period,Estimate\nLNU04000000,1947,M13,3.9\nLNU04000000,1948,M01,4.0\n</PRE>');
  assert.equal(out.LNU04000000.title, '(Unadj) Unemployment Rate');
  assert.deepEqual(out.LNU04000000.rows.map((r) => r.value), [3.9, 4]);
});

test('parseBlsText titles a block from its catalog lines when it has no title', () => {
  const out = parseBlsText('<PRE>Series Id: PRS85006093\nSector:    Nonfarm Business\nMeasure:   Labor productivity (output per hour)\nDuration:  Index (2017=100)\nBase Year: 2017\n\n\nSeries Id,Year,Period,Value\nPRS85006093,2024,Q05,115.366\n</PRE>');
  assert.equal(out.PRS85006093.title, 'Nonfarm Business, Labor productivity (output per hour), Index (2017=100), 2017');
});

test('annual prefers published annual values and averages complete years otherwise', () => {
  assert.deepEqual(annual([
    { year: 2023, period: 'M13', value: 5 },
    { year: 2023, period: 'M01', value: 1 },
    { year: 2024, period: 'Q05', value: 7 },
    { year: 2025, period: 'A01', value: 9 },
  ]), [[2023, 5], [2024, 7], [2025, 9]]);
  const months = (year, n, v) => Array.from({ length: n }, (_, i) => ({ year, period: `M${String(i + 1).padStart(2, '0')}`, value: v + i }));
  assert.deepEqual(annual([...months(2024, 12, 1), ...months(2025, 11, 1), ...months(2026, 9, 1)]), [[2024, 6.5], [2025, 6]]);
});

test('latest returns the last monthly or quarterly value', () => {
  assert.deepEqual(latest(parseBlsText(BLS).CEU0500000008.rows), { year: 2025, period: 'M01', value: 31.1 });
  assert.equal(latest([{ year: 2024, period: 'A01', value: 1 }]), null);
});

test('splitCsv honours quoted commas', () => {
  assert.deepEqual(splitCsv('A460RC,"Compensation, of employees","Current Dollars",-6,T11400:20'), ['A460RC', 'Compensation, of employees', 'Current Dollars', '-6', 'T11400:20']);
  assert.deepEqual(splitCsv('a,,"b ""c"""'), ['a', '', 'b "c"']);
});

test('parseBeaFlat keeps only the wanted series as year pairs', () => {
  const text = '%SeriesCode,Period,Value\nA460RC,2024,"8,453,183"\nA460RC,2025,"8,811,794"\nW326RC,2025,"-1,200"\nZZZ,2025,"1"\nA460RC,2025Q1,"1"\n';
  assert.deepEqual(parseBeaFlat(text, ['A460RC', 'W326RC']), { A460RC: [[2024, 8453183], [2025, 8811794]], W326RC: [[2025, -1200]] });
});

test('parseRegister maps codes to labels and table lines', () => {
  const text = '%SeriesCode,SeriesLabel,MetricName,CalculationType,DefaultScale,TableId:LineNo,SeriesCodeParents\nA460RC,"Compensation of employees","Current Dollars","Level",-6,T11400:20,A457RC\nA054RC,"Taxes on corporate income","Current Dollars","Level",-6,RfTaxAct:6|T11000:16|T11400:12,A051RC\n';
  assert.deepEqual(parseRegister(text, ['A460RC', 'A054RC']), {
    A460RC: { label: 'Compensation of employees', metric: 'Current Dollars', lines: ['T11400:20'] },
    A054RC: { label: 'Taxes on corporate income', metric: 'Current Dollars', lines: ['T11000:16', 'T11400:12'] },
  });
});

const zip = (files) => {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const raw = Buffer.from(text);
    const data = deflateRawSync(raw);
    const nameBuf = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, data);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const dir = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(dir.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, dir, end]);
};

const XLSX = zip({
  'xl/workbook.xml': '<workbook><sheets><sheet name="Contents" sheetId="1" r:id="rId1"/><sheet name="TVA113-A" sheetId="2" r:id="rId2"/></sheets></workbook>',
  'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="/xl/worksheets/sheet2.xml"/></Relationships>',
  'xl/sharedStrings.xml': '<sst><si><t>Line</t></si><si><r><t>Gross </t></r><r><t>domestic product</t></r></si><si><t xml:space="preserve">      Compensation of employees</t></si><si><t>Mining &amp; quarrying</t></si></sst>',
  'xl/worksheets/sheet1.xml': '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>hello</t></is></c></row></sheetData></worksheet>',
  'xl/worksheets/sheet2.xml': '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="D1" t="str"><v>2024</v></c></row><row r="2"><c r="A2"><v>1</v></c><c r="B2" t="s"><v>1</v></c><c r="D2"><v>29380991</v></c></row><row r="4"><c r="B4" t="s"><v>3</v></c><c r="C4"/></row></sheetData></worksheet>',
});

test('readXlsx returns every sheet as rows of cell values', () => {
  const book = readXlsx(XLSX);
  assert.deepEqual(Object.keys(book), ['Contents', 'TVA113-A']);
  assert.deepEqual(book.Contents, [['hello']]);
  assert.deepEqual(book['TVA113-A'], [
    ['Line', null, null, '2024'],
    [1, 'Gross domestic product', null, 29380991],
    [],
    [null, 'Mining & quarrying', null],
  ]);
});

test('parseZ1 reads annual columns from one CSV in the release zip and skips ND', () => {
  const Z1 = zip({
    'csv/other.csv': 'date,LM105020015.A\n2025,1\n',
    'csv/S11_1_i_a.csv': '"date","FU106902501.A","LM105020015.A"\n1945,5,ND\n1946,6,"39688"\n2025,7,3692639\n',
  });
  assert.deepEqual(parseZ1(Z1, 'csv/S11_1_i_a.csv', ['LM105020015.A', 'MISSING.A']), {
    'LM105020015.A': [[1946, 39688], [2025, 3692639]],
  });
});

test('parseWorldBank groups values by indicator and country in year order and drops nulls', () => {
  const json = [{ page: 1 }, [
    { indicator: { id: 'NY.GDP.MKTP.CD' }, countryiso3code: 'USA', date: '2025', value: 30 },
    { indicator: { id: 'NY.GDP.MKTP.CD' }, countryiso3code: 'USA', date: '2024', value: 29 },
    { indicator: { id: 'NY.GDP.MKTP.CD' }, countryiso3code: 'CHN', date: '2024', value: null },
    { indicator: { id: 'NV.IND.MANF.CD' }, countryiso3code: 'WLD', date: '2021', value: 16 },
  ]];
  assert.deepEqual(parseWorldBank(json), {
    'NY.GDP.MKTP.CD': { USA: [[2024, 29], [2025, 30]] },
    'NV.IND.MANF.CD': { WLD: [[2021, 16]] },
  });
});

test('parsePovertyByRace reads the percent below poverty for each named block, newest method first', () => {
  const rows = [
    ['Table 2. Poverty Status'],
    ['All Races'],
    ['Year', 'All people'],
    [null, 'Total', 'Below poverty'],
    [null, null, 'Number', 'Percent'],
    [2025, 338100, 34510, 10.2],
    ['2024 (2)', 337000, 36030, 10.7],
    ['2017 (21)', 1, 2, 12.3],
    [2017, 1, 2, 12.5],
    ['Black'],
    ['Year', 'All people'],
    [1959, 18000, 9927, 55.1],
  ];
  assert.deepEqual(parsePovertyByRace(rows, ['All Races', 'Black', 'Missing']), {
    'All Races': [[2017, 12.3], [2024, 10.7], [2025, 10.2]],
    Black: [[1959, 55.1]],
  });
});

test('parseHomeownership averages the quarters of complete years', () => {
  const rows = [
    ['Year and Quarter', 'U.S.', 'Non-Hispanic White Alone', 'Black Alone', 'All Other Races', null, 'Hispanic (of any race)'],
    [1994],
    ['1st', 63.8, 69.8, 42.1, 50.1, '(X)', 40.3],
    ['2nd', 64.0, 70.0, 42.3, 46.3, '(X)', 41.1],
    ['3rd', 64.1, 70.0, 42.7, 46.9, '(X)', 41.1],
    ['4th', 64.1, 70.2, 42.9, 47.6, '(X)', 42.2],
    [2026],
    ['1st', 65, 74, 45, 1, 1, 49],
  ];
  const out = parseHomeownership(rows);
  assert.deepEqual(out.columns, ['U.S.', 'Non-Hispanic White Alone', 'Black Alone', 'Hispanic (of any race)']);
  assert.deepEqual(out.years.map((r) => r[0]), [1994]);
  assert.deepEqual(out.years[0].map((v) => Number(v.toFixed(3))), [1994, 64, 70, 42.5, 41.175]);
});

test('parseAgeSex sums both sexes by single year of age for the latest estimate', () => {
  const csv = 'SEX,AGE,ESTIMATESBASE2020,POPESTIMATE2024,POPESTIMATE2025\n0,0,9,10,11\n0,1,9,20,21\n0,999,9,30,32\n1,0,4,5,6\n';
  assert.deepEqual(parseAgeSex(csv), { year: 2025, ages: [[0, 11], [1, 21]], total: 32 });
});

test('parseValueAdded splits each industry into compensation, taxes and surplus', () => {
  const rows = [
    ['Line', null, null, '2024', '2025'],
    ['1', '    Gross domestic product', null, 100, 110],
    ['2', '      Compensation of employees', null, 50, 55],
    ['3', '      Taxes on production and imports less subsidies', null, 10, 11],
    ['4', '      Gross operating surplus', null, 40, 44],
    ['5', 'Private industries', null, 90, 99],
    ['9', '  Mining', null, 8, 9],
    ['10', '    Compensation of employees', null, 2, 3],
    ['11', '    Taxes on production and imports less subsidies', null, 1, 1],
    ['12', '    Gross operating surplus', null, 5, 5],
  ];
  assert.deepEqual(parseValueAdded(rows), {
    years: [2024, 2025],
    industries: [
      { line: 1, label: 'Gross domestic product', depth: 2, comp: [50, 55], taxes: [10, 11], gos: [40, 44] },
      { line: 9, label: 'Mining', depth: 1, comp: [2, 3], taxes: [1, 1], gos: [5, 5] },
    ],
  });
});

test('parseBds totals firms and isolates the largest size class', () => {
  const csv = 'year,fsize,firms,estabs,emp\n2022,a) 1 to 4,10,10,20\n2022,j) 10000+,2,50,500\n2023,a) 1 to 4,12,12,24\n2023,j) 10000+,3,60,600\n';
  assert.deepEqual(parseBds(csv), {
    years: [
      { year: 2022, firms: 12, emp: 520, topFirms: 2, topEmp: 500 },
      { year: 2023, firms: 15, emp: 624, topFirms: 3, topEmp: 600 },
    ],
    sizes: [{ size: '1 to 4', firms: 12, emp: 24 }, { size: '10000+', firms: 3, emp: 600 }],
    top: '10000+',
  });
});

test('parseDfa turns levels into each group\'s share of the total', () => {
  const csv = 'Date,Category,Net worth,Assets,Corporate equities and mutual fund shares\n2026:Q1,TopPt1,30,40,6\n2026:Q1,Bottom50,10,20,4\n2026:Q2,TopPt1,60,70,9\n2026:Q2,Bottom50,40,50,1\n';
  assert.deepEqual(parseDfa(csv, ['Net worth', 'Corporate equities and mutual fund shares']), {
    groups: ['TopPt1', 'Bottom50'],
    quarters: [
      { date: '2026:Q1', 'Net worth': { TopPt1: 0.75, Bottom50: 0.25 }, 'Corporate equities and mutual fund shares': { TopPt1: 0.6, Bottom50: 0.4 } },
      { date: '2026:Q2', 'Net worth': { TopPt1: 0.6, Bottom50: 0.4 }, 'Corporate equities and mutual fund shares': { TopPt1: 0.9, Bottom50: 0.1 } },
    ],
  });
});

test('parseIncomeShares reads one row per year and drops footnote marks', () => {
  const rows = [
    ['Table H-2.'],
    ['Year', 'Number (thousands)', 'Shares of aggregate income'],
    [null, null, 'Lowest\nquintile', 'Second\nquintile', 'Third\nquintile', 'Fourth\nquintile', 'Highest\nquintile', 'Top 5\npercent'],
    [2025, 137100, 3, 8.2, 13.9, 22.5, 52.4, 23.5],
    ['2017 (40)', 127669, 3.1, 8.2, 14.3, 23, 51.5, 22.3],
    ['2017', 127586, 3.1, 8.2, 14.2, 22.9, 51.6, 22.3],
    ['1967 (12)', 60810, 4, 10.8, 17.3, 24.2, 43.6, 17.2],
    ['Footnotes'],
  ];
  assert.deepEqual(parseIncomeShares(rows), [
    { year: 1967, shares: [4, 10.8, 17.3, 24.2, 43.6], top5: 17.2 },
    { year: 2017, shares: [3.1, 8.2, 14.3, 23, 51.5], top5: 22.3 },
    { year: 2025, shares: [3, 8.2, 13.9, 22.5, 52.4], top5: 23.5 },
  ]);
});

test('lobbyingDollars sums one report per quarter, keeping the latest amendment', () => {
  const f = (type, period, expenses, posted, income = null) => ({ filing_type: type, filing_period: period, expenses, income, dt_posted: posted });
  assert.equal(lobbyingDollars([
    f('Q1', 'first_quarter', '100.00', '2025-04-01'),
    f('1A', 'first_quarter', '150.00', '2025-05-01'),
    f('Q2', 'second_quarter', null, '2025-07-01', '50.00'),
    f('RR', 'first_quarter', null, '2025-01-01'),
  ]), 200);
});

test('toModule writes an ES module', () => {
  assert.equal(toModule({ a: 1 }), 'export default {\n  "a": 1\n};\n');
});
