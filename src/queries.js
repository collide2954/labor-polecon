const s = (id, from, label, group) => ({ id, from, label, group });

export const BLS_SERIES = [
  s('CEU3000000007', 1939, 'Average weekly hours, manufacturing production workers', 'hours'),
  s('CEU3000000009', 1956, 'Average weekly overtime hours, manufacturing production workers', 'hours'),
  s('CEU0500000007', 1964, 'Average weekly hours, private production and nonsupervisory workers', 'hours'),
  s('CEU0500000002', 2006, 'Average weekly hours, all private employees', 'hours'),
  s('LNU02026619', 1994, 'Multiple jobholders, thousands', 'hours'),
  s('LNU02026620', 1994, 'Multiple jobholders, percent of employed', 'hours'),
  s('PRS85006093', 1947, 'Output per hour, nonfarm business, index 2017=100', 'productivity'),
  s('PRS85006153', 1947, 'Real hourly compensation, nonfarm business, index 2017=100', 'productivity'),
  s('PRS85006173', 1947, 'Labor share, nonfarm business, index 2017=100', 'productivity'),
  s('PRS85006033', 1947, 'Hours worked, nonfarm business, index 2017=100', 'productivity'),
  s('CEU0500000008', 1964, 'Average hourly earnings, private production and nonsupervisory workers', 'wages'),
  s('CEU0500000032', 1964, 'Average hourly earnings, private production and nonsupervisory workers, 1982-84 dollars', 'wages'),
  s('CUUR0000SA0', 1913, 'Consumer prices, all items, 1982-84=100', 'prices'),
  s('CUUR0000SEHA', 1914, 'Consumer prices, rent of primary residence', 'prices'),
  s('CUUR0000SAF11', 1947, 'Consumer prices, food at home', 'prices'),
  s('CUUR0000SAM', 1935, 'Consumer prices, medical care', 'prices'),
  s('CUUR0000SEEB', 1977, 'Consumer prices, tuition, school fees and childcare', 'prices'),
  s('LEU0252881500', 1979, 'Median usual weekly earnings, full-time wage and salary workers', 'earnings'),
  s('LEU0252881600', 1979, 'Median usual weekly earnings, full-time, 1982-84 dollars', 'earnings'),
  s('LEU0252911200', 2000, 'Usual weekly earnings, first decile', 'earnings'),
  s('LEU0252911500', 2000, 'Usual weekly earnings, ninth decile', 'earnings'),
  s('LEU0252881800', 1979, 'Median usual weekly earnings, men', 'earnings'),
  s('LEU0252882700', 1979, 'Median usual weekly earnings, women', 'earnings'),
  s('LEU0252883600', 1979, 'Median usual weekly earnings, White', 'earnings'),
  s('LEU0252884500', 1979, 'Median usual weekly earnings, Black', 'earnings'),
  s('LEU0252885400', 1979, 'Median usual weekly earnings, Hispanic or Latino', 'earnings'),
  s('APU0000708111', 1980, 'Average price, eggs, grade A, large, per dozen', 'basket'),
  s('APU0000702111', 1980, 'Average price, white bread, per pound', 'basket'),
  s('APU0000709112', 1995, 'Average price, whole milk, per gallon', 'basket'),
  s('APU0000703112', 1984, 'Average price, ground beef, per pound', 'basket'),
  s('APU0000706111', 1980, 'Average price, whole chicken, per pound', 'basket'),
  s('APU0000711211', 1980, 'Average price, bananas, per pound', 'basket'),
  s('APU0000717311', 1980, 'Average price, ground coffee, per pound', 'basket'),
  s('APU0000701111', 1980, 'Average price, white flour, per pound', 'basket'),
  s('APU000074714', 1976, 'Average price, unleaded regular gasoline, per gallon', 'basket'),
  s('APU000072610', 1978, 'Average price, electricity, per kWh', 'basket'),
  s('LNU04000000', 1948, 'Unemployment rate', 'reserve'),
  s('LNU03000000', 1948, 'Unemployed, thousands', 'reserve'),
  s('LNU03025670', 1948, 'U-1: unemployed 15 weeks or longer, percent of labor force', 'reserve'),
  s('LNU04023621', 1967, 'U-2: job losers and completers of temporary jobs, percent of labor force', 'reserve'),
  s('LNU03327707', 1994, 'U-4: unemployed plus discouraged workers', 'reserve'),
  s('LNU03327708', 1994, 'U-5: U-4 plus other marginally attached workers', 'reserve'),
  s('LNU03327709', 1994, 'U-6: U-5 plus part time for economic reasons', 'reserve'),
  s('LNU03008636', 1948, 'Unemployed 27 weeks or longer, thousands', 'reserve'),
  s('LNU03008275', 1948, 'Average weeks unemployed', 'reserve'),
  s('LNU02032194', 1955, 'Part time for economic reasons, thousands', 'reserve'),
  s('LNU05026645', 1994, 'Discouraged workers, thousands', 'reserve'),
  s('LNU05026642', 1994, 'Marginally attached to the labor force, thousands', 'reserve'),
  s('LNU05026639', 1994, 'Not in the labor force, want a job now, thousands', 'reserve'),
  s('LNU02300060', 1948, 'Employment-population ratio, ages 25 to 54', 'reserve'),
  s('LNU04000003', 1954, 'Unemployment rate, White', 'reserve'),
  s('LNU04000006', 1972, 'Unemployment rate, Black', 'reserve'),
  s('LNU04000009', 1973, 'Unemployment rate, Hispanic or Latino', 'reserve'),
  s('JTU000000000000000JOL', 2001, 'Job openings, thousands, annual average', 'reserve'),
  s('JTU000000000000000QUL', 2001, 'Quits, thousands, annual total', 'reserve'),
  s('JTU000000000000000LDL', 2001, 'Layoffs and discharges, thousands, annual total', 'reserve'),
  s('LNU02000000', 1948, 'Employed, thousands', 'class'),
  s('LNU02032184', 1948, 'Wage and salary workers, agriculture, thousands', 'class'),
  s('LNU02032187', 1948, 'Wage and salary workers, nonagricultural, thousands', 'class'),
  s('LNU02032185', 1948, 'Self-employed, unincorporated, agriculture, thousands', 'class'),
  s('LNU02032192', 1948, 'Self-employed, unincorporated, nonagricultural, thousands', 'class'),
  s('LNU02032186', 1948, 'Unpaid family workers, agriculture, thousands', 'class'),
  s('LNU02032193', 1948, 'Unpaid family workers, nonagricultural, thousands', 'class'),
  s('LUU0204899600', 1983, 'Union members, percent of employed wage and salary workers', 'unions'),
  s('LUU0204899700', 1983, 'Represented by unions, percent of employed wage and salary workers', 'unions'),
  s('LUU0204906600', 1983, 'Union members, percent of private wage and salary workers', 'unions'),
  s('LUU0204922700', 1983, 'Union members, percent of government wage and salary workers', 'unions'),
  s('WSU100', 1947, 'Major work stoppages beginning in the year', 'strikes'),
  s('WSU010', 1947, 'Workers involved in major stoppages beginning in the year, thousands', 'strikes'),
  s('WSU001', 1947, 'Days idle in major stoppages, thousands', 'strikes'),
  s('WSU002', 1947, 'Days idle in major stoppages, percent of working time', 'strikes'),
  s('FWU00X00000080N00', 2011, 'Fatal work injuries, 2011 to 2022', 'injury'),
  s('FAU00X00000080N00', 2023, 'Fatal work injuries, 2023 forward', 'injury'),
  s('ISU00000000031100', 2014, 'Nonfatal injury and illness cases per 100 full-time workers, private industry', 'injury'),
];

const p = (id, item, unit) => ({ id, item, unit });

export const PRICES = [
  p('APU0000708111', 'Eggs', 'dozen'),
  p('APU0000702111', 'White bread', 'pound'),
  p('APU0000709112', 'Whole milk', 'gallon'),
  p('APU0000703112', 'Ground beef', 'pound'),
  p('APU0000706111', 'Whole chicken', 'pound'),
  p('APU0000711211', 'Bananas', 'pound'),
  p('APU0000717311', 'Ground coffee', 'pound'),
  p('APU0000701111', 'White flour', 'pound'),
  p('APU000074714', 'Gasoline', 'gallon'),
  p('APU000072610', 'Electricity', '100 kWh'),
];

const n = (table, label) => ({ table, label });

export const NIPA = {
  A457RC: n('T11400:19', 'Net value added, nonfinancial corporate business'),
  B456RC: n('T11400:18', 'Consumption of fixed capital, nonfinancial corporate business'),
  A460RC: n('T11400:20', 'Compensation of employees'),
  B461RC: n('T11400:21', 'Wages and salaries'),
  B462RC: n('T11400:22', 'Supplements to wages and salaries'),
  W325RC: n('T11400:23', 'Taxes on production and imports less subsidies'),
  W326RC: n('T11400:24', 'Net operating surplus'),
  B471RC: n('T11400:25', 'Net interest and miscellaneous payments'),
  W327RC: n('T11400:26', 'Business current transfer payments'),
  A463RC: n('T11400:27', 'Corporate profits with IVA and CCAdj'),
  B465RC: n('T11400:28', 'Taxes on corporate income'),
  W328RC: n('T11400:29', 'Profits after tax'),
  B467RC: n('T11400:30', 'Net dividends'),
  W332RC: n('T11400:31', 'Undistributed profits'),
  A032RC: n('T11200:1', 'National income'),
  A033RC: n('T11200:2', 'Compensation of employees'),
  A041RC: n('T11200:9', 'Proprietors’ income'),
  A048RC: n('T11200:12', 'Rental income of persons'),
  A051RC: n('T11200:13', 'Corporate profits'),
  W255RC: n('T11200:18', 'Net interest and miscellaneous payments'),
  W056RC: n('T11200:19', 'Taxes on production and imports'),
  A034RC: n('T20100:3', 'Wages and salaries'),
  A064RC: n('T20100:14', 'Personal interest income'),
  B703RC: n('T20100:15', 'Personal dividend income'),
  W005RC: n('T30200:1', 'Federal current receipts'),
  A074RC: n('T30200:3', 'Personal current taxes'),
  W007RC: n('T30200:4', 'Taxes on production and imports'),
  B075RC: n('T30200:8', 'Taxes on income payable by corporations'),
  W780RC: n('T30200:10', 'Contributions for social insurance'),
  A445RC: n('T61600D:2', 'Corporate profits, domestic industries'),
  A587RC: n('T61600D:3', 'Corporate profits, financial'),
};

export const FIXED = {
  k1pnofi2es00: { table: 'FAAt601:4', label: 'Net stock of fixed assets, nonfinancial corporate, current cost' },
  k1ptotl2es00: { table: 'FAAt601:2', label: 'Net stock of fixed assets, all corporate, current cost' },
  k1ptotl1es00: { table: 'FAAt601:1', label: 'Net stock of private fixed assets, current cost' },
};

const l = (id, name, side) => ({ id, name, side });

export const LOBBY = [
  l(38756, 'U.S. Chamber of Commerce', 'business'),
  l(7543, 'Business Roundtable', 'business'),
  l(26912, 'National Association of Manufacturers', 'business'),
  l(27811, 'National Federation of Independent Business', 'business'),
  l(28468, 'National Retail Federation', 'business'),
  l(4766, 'Associated Builders and Contractors', 'business'),
  l(47872, 'International Franchise Association', 'business'),
  l(35946, 'Society for Human Resource Management', 'business'),
  l(363, 'AFL-CIO', 'labor'),
  l(34887, 'Service Employees International Union', 'labor'),
  l(19855, 'International Brotherhood of Teamsters', 'labor'),
  l(39052, 'United Auto Workers', 'labor'),
  l(2321, 'AFSCME', 'labor'),
  l(27731, 'National Education Association', 'labor'),
  l(2332, 'American Federation of Teachers', 'labor'),
  l(39121, 'United Food and Commercial Workers', 'labor'),
  l(19822, 'International Brotherhood of Electrical Workers', 'labor'),
  l(10217, 'Communications Workers of America', 'labor'),
  l(22030, 'Laborers’ International Union', 'labor'),
];

export const DFA_MEASURES = ['Net worth', 'Corporate equities and mutual fund shares', 'Unincorporated businesses', 'Real estate', 'Liabilities'];

export const DFA_GROUPS = [
  { key: 'TopPt1', label: 'Top 0.1%' },
  { key: 'RemainingTop1', label: 'Next 0.9%' },
  { key: 'Next9', label: '90th to 99th percentile' },
  { key: 'Next40', label: '50th to 90th percentile' },
  { key: 'Bottom50', label: 'Bottom 50%' },
];

export const BLS_BATCHES = 12;

export const blsBatches = (series, size) => {
  const sorted = [...series].sort((a, b) => a.from - b.from);
  const out = [];
  for (let i = 0; i < sorted.length; i += size) {
    const chunk = sorted.slice(i, i + size);
    out.push({ from: chunk[0].from, ids: chunk.map((c) => c.id) });
  }
  return out;
};
