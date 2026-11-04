# Labor & Capital in Numbers

One static page about work and capital in the United States: hours, wages, surplus value, profit, monopoly and finance, claims across borders, unemployment, population, wealth, unions, right-to-work laws, strikes, deaths at work, and the state’s police, prisons, removals, detention, forces abroad and arms transfers. Annotated charts, split bars, waffle charts and a zoomable timeline, all hand-built SVG with no runtime dependencies.

Lenses at the top filter the page: `?lens=labor`, `?lens=capital` or `?lens=state`.

## Run it

| Command | Does |
| --- | --- |
| `npm run serve` | Serves the page at http://127.0.0.1:8080/ |
| `npm run lint` | ESLint, Stylelint and html-validate, each with a no-comments rule |
| `npm test` | Lint, unit tests, and Playwright end-to-end tests at desktop and mobile widths |
| `npm run snapshot` | Rebuilds `src/snapshot.js` from BLS, BEA, Census, the Federal Reserve, the World Bank, BJS, the Defense Manpower Data Center and the Lobbying Disclosure Act API (about 15 minutes) |
| `npm run snapshot -- bls lobbying` | Rebuilds only the named sections |

## Publish it

1. Merge this branch into `master`.
2. In the repository on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The `Publish site` workflow deploys to `https://collide2954.github.io/labor-polecon/` on every push to `master` and after each weekly snapshot.

`.github/workflows/snapshot.yml` rebuilds the data every Sunday and commits it when numbers change.

## Where things live

- `src/queries.js`: every BLS series, BEA code and lobbying registrant behind the numbers.
- `src/calc.js`: the arithmetic: variable capital, surplus value, composition of capital, rate of profit, the divided week, real wages and the minimum wage.
- `src/findings.js`: the section headlines and record figures, computed from the data so they stay true after each update.
- `src/facts.js`: timeline, officeholders, agencies, sources, and the fixed tables: Historical Statistics, MSHA, Census working papers, DHS removals, BJS prisoners to 1977, the CRS list of forces abroad, right-to-work laws, Census police and corrections employment, ICE detention, CRS arms transfers and BEA employment in foreign affiliates.
- `src/charts.js`: the SVG chart engine and animations.
- `scripts/snapshot.mjs`: the weekly data pull. `scripts/parsers.mjs` reads BLS query output, BEA flat files and workbooks, and the Census and Federal Reserve files. `scripts/export.mjs` writes the snapshot out as `snapshot.json`, which the published site links for download.
- `og.png`: the preview image shown when the link is shared.

## Reading the numbers

Variable capital is the pay of production and nonsupervisory workers outside wholesale and retail trade, finance, insurance and real estate. For nonfinancial corporate business it is compensation of employees (NIPA Table 1.14, line 20) times the share of private wages outside finance and real estate (NIPA Table 6.3D, lines 3, 57 and 62) that those workers receive (BLS aggregate weekly payrolls, CEU0500000082 less CEU4142000082, CEU4200000082 and CEU5500000082, annualized). Before 1998, wages outside finance and real estate are private wages (Table 2.1, line 4) less financial corporate wages (Table 1.14, line 5 less line 21), scaled to their 1998 ratio. The series starts in 1972, the first year of the trade payrolls.

Surplus value is net value added (Table 1.14, line 19) less variable capital, so it includes the pay of supervisors, managers, officers and trade staff. Constant capital is the current-cost net stock of fixed assets (Fixed Assets Table 6.1, line 4) plus inventories (Financial Accounts, LM105020015) at the end of the prior year. The rate of profit is surplus value over constant capital; the composition of capital is constant capital over variable capital. By industry, value added less depreciation (Fixed Assets Table 3.4ESI) is split the same way, with each industry's own production and nonsupervisory share of wages.

Wages from earlier years are restated with the CPI-W, the price index for urban wage earners and clerical workers, where a chart says so. BLS figures are annual averages of unadjusted series.

The timeline links each event to a primary source where one could be checked: the Statutes at Large and U.S. Reports on GovInfo, the National Archives, *Foreign Relations of the United States*, the CRS list of uses of armed forces abroad, government reports on archive.org, the American Presidency Project, the Federal Register, and BLS strike listings. One event still links to Wikipedia.

Population counts to 1990 are from Census working papers 56 (race, with the enslaved population to 1860) and 29 (nativity); later counts from the Census population change data. Prisoners per 100,000 residents to 1977 are the rates BJS published in *Prisoners 1925-81*; from 1978 they are BJS counts of sentenced prisoners under state and federal jurisdiction over the BEA midyear population. Profits from the rest of the world are all corporate profits (NIPA Table 1.12, line 13) less domestic profits (Table 6.16D, line 2), shown in years when all profits were positive.

Claims across borders are from the rest-of-the-world account of the Financial Accounts (Table S.2.a): U.S. claims abroad are that sector’s total liabilities and equity, foreign claims on the United States its total financial assets, and direct investment abroad its equity at market value plus intercompany debt, each over GDP. Troops abroad are active-duty personnel by assigned duty location in the latest Defense Manpower Data Center report, which leaves out some personnel on temporary duty or deployed in contingency operations. Arms transfers are agreements with all recipients from CRS report R44716, Table 30, which ends in 2015.

Right-to-work states are counted from CRS report R42575, Table 1, with Wisconsin, West Virginia and Kentucky since, and Michigan’s law of 2012 until its repeal took effect in 2024. Laws repealed before 2012 are not in that table and are not counted. Police officers and corrections employees are full-time local government employees from the Census Annual Survey of Public Employment and Payroll, over the BEA midyear population. ICE detention is the average daily population for each fiscal year from ICE’s detention statistics; the latest year is partial.

Tables marked Historical Statistics are typed from *Historical Statistics of the United States, Colonial Times to 1970* (Census, 1975), Chapter D, with their series numbers. They do not change. The MSHA coal fatality table is also kept fixed, because msha.gov does not serve its tables to scripted requests; update it from https://www.msha.gov/coal-fatalities once a year. Lobbying totals cover only the organizations listed in `src/queries.js`, reporting their own lobbying.
