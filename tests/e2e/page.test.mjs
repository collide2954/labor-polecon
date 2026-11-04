import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { start } from '../../scripts/serve.mjs';
import snapshot from '../../src/snapshot.js';
import {
  TIMELINE, PEOPLE, AGENCIES, EXAMPLES, COAL,
} from '../../src/facts.js';
import { exact, identify } from '../../src/lib.js';
import { findings, records } from '../../src/findings.js';
import { LOBBY, PRICES } from '../../src/queries.js';

const { chromium, devices } = createRequire(import.meta.url)('playwright');

let server;
let browser;
let base;

const open = async ({ width = 1280, height = 900, search = '', motion = 'reduce' } = {}) => {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: motion });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/net::ERR_FAILED|fonts\.g/.test(m.text()) && errors.push(m.text()));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
  await page.goto(`${base}${search}`);
  await page.waitForSelector('#rate-chart svg', { state: 'attached' });
  return { page, errors };
};

const openPhone = async () => {
  const context = await browser.newContext({ ...devices['iPhone 13'], reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
  await page.goto(base);
  await page.waitForSelector('#rate-chart svg', { state: 'attached' });
  return { page, context };
};

const tapAt = async (page, selector, fx = 0.5, fy = 0.5) => {
  await page.locator(selector).scrollIntoViewIfNeeded();
  const box = await page.locator(selector).boundingBox();
  await page.touchscreen.tap(box.x + box.width * fx, box.y + box.height * fy);
  await page.waitForTimeout(250);
};

const CHAPTERS = {
  day: ['hours', 'division'],
  surplus: ['surplus', 'industries', 'productivity'],
  wages: ['wages', 'spread', 'basket', 'canal'],
  accumulation: ['composition', 'profit', 'concentration'],
  reserve: ['unemployment', 'layers', 'class'],
  distribution: ['income', 'households', 'wealth', 'taxes'],
  conflict: ['unions', 'strikes', 'injury', 'lobbying'],
  reference: ['history', 'series', 'records-section', 'decoder', 'reference', 'sources'],
};

before(async () => {
  server = await start(0);
  base = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch();
});

after(async () => {
  await browser.close();
  server.close();
});

test('loads without errors, leads with wage earners and states every finding', async () => {
  const { page, errors } = await open();
  assert.equal(await page.title(), 'Labor & Capital in Numbers');
  const year = Math.max(...snapshot.bls.LNU02032187.annual.map(([y]) => y));
  const value = (id) => snapshot.bls[id].annual.find(([y]) => y === year)[1];
  assert.equal((await page.textContent('[data-hero="workers"]')).trim(), exact((value('LNU02032187') + value('LNU02032184')) * 1000));
  const f = findings(snapshot);
  for (const node of await page.$$('[data-finding]')) {
    const key = await node.getAttribute('data-finding');
    assert.equal((await node.textContent()).trim(), f[key], key);
  }
  assert.equal(await page.locator('[data-finding]').count(), Object.keys(f).length);
  assert.deepEqual(errors, []);
  await page.close();
});

test('every chart draws an svg', async () => {
  const { page } = await open();
  const empty = await page.$$eval('.chart', (els) => els.filter((e) => !e.querySelector('svg')).map((e) => e.id));
  assert.deepEqual(empty, []);
  assert.ok(await page.locator('.chart svg').count() >= 40);
  await page.close();
});

test('the surplus value chart reports net value added, compensation, variable capital and surplus', async () => {
  const { page } = await open();
  await page.hover('#rate-chart .hit');
  assert.match(await page.textContent('#tip'), /per \$1 of variable capital[\s\S]*Net value added[\s\S]*Compensation[\s\S]*Variable capital[\s\S]*Surplus value/);
  await page.close();
});

test('the divided week splits each year into two bars that add to its hours', async () => {
  const { page } = await open();
  const rows = await page.$$eval('#division-chart [data-row]', (gs) => gs.map((g) => g.dataset.row));
  assert.ok(rows.length >= 10);
  await page.hover(`#division-chart [data-row="${rows.at(-1)}"] .seg.alt`);
  const lines = await page.$$eval('#tip > *', (els) => els.map((e) => e.textContent));
  const read = (re) => Number(lines.find((l) => re.test(l)).match(re)[1]);
  const [hours, wages, surplus] = [/^([\d.]+) hours$/, /^([\d.]+) hours match wages/, /^([\d.]+) hours match surplus/].map(read);
  assert.ok(Math.abs(wages + surplus - hours) < 0.11, lines.join(' | '));
  assert.doesNotMatch(await page.textContent('#tip'), /null/);
  await page.close();
});

test('bar charts show a tooltip on hover', async () => {
  const { page } = await open();
  await page.hover('#strikes-chart [data-year="1952"]');
  const n = snapshot.bls.WSU100.annual.find(([y]) => y === 1952)[1];
  assert.match(await page.textContent('#tip'), new RegExp(`${exact(n)}[\\s\\S]*1952`));
  assert.equal(await page.isVisible('#tip'), true);
  await page.close();
});

test('unemployment runs from 1890 with the historical years marked apart', async () => {
  const { page } = await open();
  const years = await page.$$eval('#unemployment-chart [data-year]', (bs) => bs.map((b) => Number(b.dataset.year)));
  assert.equal(years[0], 1890);
  assert.equal(await page.locator('#unemployment-chart .bar.part').count(), 1947 - 1890 + 1);
  await page.hover('#unemployment-chart [data-year="1933"]');
  assert.match(await page.textContent('#tip'), /24\.9%[\s\S]*1933, Historical Statistics/);
  await page.close();
});

test('stacked charts draw every layer and a legend', async () => {
  const { page } = await open();
  for (const [sel, n] of [['#parts-chart', 7], ['#layers-chart', 4], ['#class-chart', 3], ['#quintile-chart', 5], ['#wealth-chart', 5], ['#receipts-chart', 5], ['#issues-chart', 3]]) {
    assert.equal(await page.locator(`${sel} path[data-key]`).count(), n, sel);
    assert.equal(await page.locator(`${sel} .legend li`).count(), n, sel);
  }
  await page.close();
});

test('percentage stacks stop at 100 on the axis', async () => {
  const { page } = await open();
  for (const sel of ['#parts-chart', '#class-chart', '#quintile-chart', '#wealth-chart', '#receipts-chart']) {
    const top = await page.$$eval(`${sel} svg text`, (ts) => Math.max(...ts.map((t) => Number(t.textContent)).filter((v) => Number.isFinite(v) && v < 1000)));
    assert.equal(top, 100, sel);
  }
  await page.close();
});

test('the basket and lobbying charts list every item and organization', async () => {
  const { page } = await open();
  assert.equal(await page.locator('#basket-chart [data-row]').count(), PRICES.length);
  assert.equal(await page.locator('#lobby-chart [data-row]').count(), LOBBY.length);
  assert.equal(await page.locator('#lobby-chart .dot.hi').count(), LOBBY.filter((o) => o.side === 'labor').length);
  await page.close();
});

test('historical tables open with their series numbers', async () => {
  const { page } = await open();
  await page.click('#strikes details.hist summary');
  assert.match(await page.textContent('#issues-table caption'), /D 977/);
  assert.equal(await page.locator('#issues-table tbody tr').count(), 38);
  await page.click('#unemployment details.hist summary');
  assert.equal(await page.locator('#unemployment-table tbody tr').count(), 58);
  await page.close();
});

test('the coal chart covers every year in the MSHA table', async () => {
  const { page } = await open();
  await page.focus('#coal-chart svg');
  await page.keyboard.press('Home');
  assert.match(await page.textContent('#tip'), new RegExp(`${COAL[0][0]}[\\s\\S]*${exact(COAL[0][2])} killed`));
  await page.keyboard.press('End');
  assert.match(await page.textContent('#tip'), new RegExp(`${COAL.at(-1)[0]}`));
  await page.close();
});

test('timeline draws every event, officeholder and agency and zooms', async () => {
  const { page } = await open();
  assert.equal(await page.locator('#timeline-svg [data-event]').count(), TIMELINE.length);
  assert.equal(await page.locator('#timeline-svg [data-person]').count(), PEOPLE.length);
  assert.equal(await page.locator('#timeline-svg [data-project]').count(), AGENCIES.length);
  const initial = await page.textContent('#timeline-range');
  await page.click('#zoom-in');
  assert.notEqual(await page.textContent('#timeline-range'), initial);
  await page.click('#timeline-eras button[data-from="1935"]');
  assert.match(await page.textContent('#timeline-range'), /1935/);
  await page.click('#zoom-reset');
  assert.equal(await page.textContent('#timeline-range'), initial);
  await page.close();
});

test('timeline tag chips filter the event list', async () => {
  const { page } = await open();
  assert.equal(await page.locator('#timeline-list li').count(), TIMELINE.length);
  await page.click('#timeline-tags button[data-tag="courts"]');
  assert.equal(await page.locator('#timeline-list li:visible').count(), TIMELINE.filter((t) => t.tag === 'courts').length);
  await page.close();
});

test('dragging the timeline pans it by the distance dragged', async () => {
  const { page } = await open();
  const svg = page.locator('#timeline-svg svg');
  await svg.scrollIntoViewIfNeeded();
  await page.click('#zoom-in');
  await page.waitForTimeout(100);
  const span = (t) => t.split('–').map(Number);
  const [a0, b0] = span(await page.textContent('#timeline-range'));
  const box = await svg.boundingBox();
  const perPx = (b0 - a0) / box.width;
  await page.mouse.move(box.x + box.width / 2, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 100, box.y + 30, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(100);
  const [a1] = span(await page.textContent('#timeline-range'));
  assert.ok(Math.abs((a0 - a1) - 100 * perPx) <= 2, `${a0} → ${a1}`);
  await page.close();
});

test('global filter narrows lists', async () => {
  const { page } = await open();
  await page.fill('#q', 'pullman');
  await page.waitForTimeout(250);
  const expected = TIMELINE.filter((t) => /pullman/i.test(`${t.date} ${t.org} ${t.tag} ${t.text}`)).length;
  assert.equal(await page.locator('#timeline-list li:visible').count(), expected);
  assert.equal(await page.locator('#series-table tbody tr:visible').count(), 0);
  await page.fill('#q', 'BLS');
  await page.waitForTimeout(250);
  const rows = await page.locator('#series-table tbody tr:visible').count();
  assert.ok(rows >= 5 && rows < await page.locator('#series-table tbody tr').count());
  await page.close();
});

test('record figures come from the data and shuffle', async () => {
  const { page } = await open();
  assert.equal(await page.locator('#records li').count(), records(snapshot).length);
  await page.click('#shuffle');
  assert.equal(await page.locator('#records li.lit').count(), 1);
  await page.close();
});

test('decoder identifies typed and example identifiers', async () => {
  const { page } = await open();
  await page.fill('#decoder-input', 'CEU0500000008');
  await page.waitForSelector('#decoder-out a');
  assert.match(await page.textContent('#decoder-out'), /BLS series[\s\S]*Total private[\s\S]*Average hourly earnings/);
  assert.equal(await page.getAttribute('#decoder-out a', 'href'), 'https://data.bls.gov/timeseries/CEU0500000008');
  await page.click('#decoder .example[data-id="47-2061"]');
  assert.equal(await page.inputValue('#decoder-input'), '47-2061');
  assert.match(await page.textContent('#decoder-out'), /Construction and Extraction/);
  await page.fill('#decoder-input', 'not an id');
  assert.match(await page.textContent('#decoder-out'), /No match/);
  assert.equal(await page.locator('#examples button').count(), EXAMPLES.length);
  await page.close();
});

test('series table buttons send their ID to the decoder', async () => {
  const { page } = await open();
  const button = page.locator('#series-table button[data-id="WSU100"]');
  await button.click();
  assert.equal(await page.inputValue('#decoder-input'), 'WSU100');
  assert.match(await page.textContent('#decoder-out'), /Work Stoppages/);
  await page.close();
});

test('lens buttons hide sections and update the URL', async () => {
  const { page } = await open();
  await page.click('#lenses button[data-lens="state"]');
  assert.equal(await page.isVisible('#surplus'), false);
  assert.equal(await page.isVisible('#taxes'), true);
  assert.equal(await page.isVisible('#jump a[data-for="surplus"]'), false);
  assert.match(page.url(), /\?lens=state$/);
  await page.click('#lenses button[data-lens="all"]');
  assert.equal(await page.isVisible('#surplus'), true);
  assert.doesNotMatch(page.url(), /lens=/);
  await page.close();
});

test('a lens in the URL is applied on load and hides empty chapters', async () => {
  const { page } = await open({ search: '?lens=capital' });
  assert.equal(await page.isVisible('#profit'), true);
  assert.equal(await page.isVisible('#unemployment'), false);
  assert.equal(await page.isVisible('[data-chapter="wages"]'), false);
  assert.equal(await page.isVisible('[data-chapter="accumulation"]'), true);
  assert.equal(await page.getAttribute('#lenses button[data-lens="capital"]', 'aria-pressed'), 'true');
  await page.close();
});

test('theme toggle flips the color scheme', async () => {
  const { page } = await open();
  const initial = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.click('#theme');
  assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), initial);
  await page.close();
});

test('figures animate in when scrolled into view', async () => {
  const { page } = await open({ motion: 'no-preference' });
  assert.equal(await page.locator('#strikes .fig.in').count(), 0);
  await page.locator('#strikes-chart').scrollIntoViewIfNeeded();
  await page.waitForSelector('#strikes .fig.in');
  await page.close();
});

test('on a phone a tap pins the popup near the nearest bar and it stays', async () => {
  const { page, context } = await openPhone();
  await tapAt(page, '#strikes-chart svg', 0.5, 0.85);
  await page.waitForTimeout(600);
  assert.equal(await page.isVisible('#tip'), true);
  assert.equal(await page.getAttribute('#tip', 'data-pinned'), 'true');
  assert.match(await page.textContent('#tip'), /\d{4}/);
  const tip = await page.locator('#tip').boundingBox();
  const vw = page.viewportSize().width;
  assert.ok(tip.x >= 0 && tip.x + tip.width <= vw, `tip ${tip.x}+${tip.width} outside ${vw}`);
  await context.close();
});

test('on a phone tapping a dot plot row opens a popup with the link, not a new tab', async () => {
  const { page, context } = await openPhone();
  const opened = [];
  context.on('page', (p) => opened.push(p));
  await tapAt(page, '#lobby-chart [data-row="363"]', 0.6, 0.5);
  assert.equal(opened.length, 0);
  assert.match(await page.textContent('#tip'), /AFL-CIO/);
  assert.equal(await page.locator('#tip a[href*="registrant_id=363"]').count(), 1);
  await context.close();
});

test('on a phone a tap outside closes the popup', async () => {
  const { page, context } = await openPhone();
  await tapAt(page, '#industry-chart [data-row="Mining"]', 0.6, 0.5);
  assert.equal(await page.isVisible('#tip'), true);
  await tapAt(page, '#industries .dek', 0.5, 0.5);
  assert.equal(await page.isVisible('#tip'), false);
  await context.close();
});

test('on desktop hover previews, click pins and Escape closes', async () => {
  const { page } = await open();
  await page.hover('#real-wage-chart [data-year="1980"]');
  assert.equal(await page.isVisible('#tip'), true);
  assert.notEqual(await page.getAttribute('#tip', 'data-pinned'), 'true');
  await page.click('#real-wage-chart [data-year="1980"]');
  assert.equal(await page.getAttribute('#tip', 'data-pinned'), 'true');
  await page.keyboard.press('Escape');
  assert.equal(await page.isVisible('#tip'), false);
  await page.close();
});

test('the page never scrolls sideways on a phone', async () => {
  const { page, context } = await openPhone();
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(over <= 0, `${over}px`);
  await context.close();
});

test('chart row labels are never cut off', async () => {
  for (const width of [1280, 375]) {
    const { page } = await open({ width });
    const cut = await page.$$eval('.chart text.lab', (ts) => ts.map((t) => t.textContent).filter((s) => s.endsWith('…')));
    assert.deepEqual(cut, [], `${width}px`);
    await page.close();
  }
});

test('line chart end labels never overlap', async () => {
  for (const width of [1280, 375]) {
    const { page } = await open({ width });
    const clashes = await page.$$eval('.chart svg:has(path.line)', (svgs) => svgs.flatMap((svg) => {
      const boxes = [...svg.querySelectorAll('text.lab')].map((t) => ({ id: `${svg.closest('[id]')?.id}:${t.textContent}`, b: t.getBBox() }));
      return boxes.flatMap((a, i) => boxes.slice(i + 1)
        .filter((c) => a.b.x < c.b.x + c.b.width && c.b.x < a.b.x + a.b.width && a.b.y < c.b.y + c.b.height - 1 && c.b.y < a.b.y + a.b.height - 1)
        .map((c) => `${a.id} / ${c.id}`));
    }));
    assert.deepEqual(clashes, [], `${width}px`);
    await page.close();
  }
});

test('axis year labels never overlap', async () => {
  for (const width of [1280, 375]) {
    const { page } = await open({ width });
    const clashes = await page.$$eval('.chart svg', (svgs) => svgs.flatMap((svg) => {
      const years = [...svg.querySelectorAll('text')].filter((t) => /^\d{4}$/.test(t.textContent)).map((t) => ({ t: t.textContent, b: t.getBBox() }));
      return years.flatMap((a, i) => years.slice(i + 1).filter((c) => Math.abs(a.b.y - c.b.y) < 2 && a.b.x < c.b.x + c.b.width && c.b.x < a.b.x + a.b.width)
        .map((c) => `${svg.closest('[id]')?.id}: ${a.t}/${c.t}`));
    }));
    assert.deepEqual(clashes, [], `${width}px`);
    await page.close();
  }
});

test('chart annotations stay inside their charts on a phone', async () => {
  const { page } = await open({ width: 375 });
  const outside = await page.$$eval('.chart svg', (svgs) => svgs.flatMap((svg) => {
    const width = svg.viewBox.baseVal.width;
    return [...svg.querySelectorAll('text.note')].map((t) => ({ id: svg.closest('[id]')?.id, text: t.textContent, b: t.getBBox() }))
      .filter((n) => n.b.x < -1 || n.b.x + n.b.width > width + 1).map((n) => `${n.id}: ${n.text}`);
  }));
  assert.deepEqual(outside, []);
  await page.close();
});

test('sections sit in eight parts with a reading guide up front', async () => {
  const { page } = await open();
  const layout = await page.evaluate(() => {
    const out = {};
    let current = null;
    for (const n of document.querySelectorAll('main > .chapter, main > section.story')) {
      if (n.classList.contains('chapter')) {
        current = n.dataset.chapter;
        out[current] = [];
      } else out[current].push(n.id);
    }
    return out;
  });
  assert.deepEqual(layout, CHAPTERS);
  assert.ok(await page.locator('#readme li').count() >= 6);
  assert.equal(await page.locator('#jump a.jump-ch').count(), 8);
  await page.close();
});

test('the page states numbers, not opinions', async () => {
  const { page } = await open();
  const text = await page.evaluate(() => document.querySelector('main').innerText);
  assert.doesNotMatch(text, /\b(exploit\w*|unfair|greed\w*|shocking|staggering|alarming|merely|only \d|sadly|worryingly|tellingly)\b/i);
  await page.close();
});

test('sources are titled and grouped, not bare URLs', async () => {
  const { page } = await open();
  assert.ok(await page.locator('#sources .srcgroup').count() >= 6);
  const texts = await page.$$eval('#sources .srcgroup a', (as) => as.map((a) => a.textContent.trim()));
  assert.ok(texts.length >= 80);
  assert.deepEqual(texts.filter((t) => /^(https?:|www\.|[a-z0-9.-]+\.(gov|org|com)\/)/.test(t)), []);
  await page.close();
});

test('every decoder example and series ID on the page resolves', async () => {
  const { page } = await open();
  const ids = await page.$$eval('#series-table button[data-id], #survey-table button[data-id]', (bs) => bs.map((b) => b.dataset.id));
  assert.ok(ids.length >= 20);
  for (const id of ids) assert.ok(identify(id), id);
  await page.close();
});

test('the data behind the page can be downloaded and cited', async () => {
  const { page } = await open();
  const href = await page.getAttribute('#data-use a[href$="snapshot.json"]', 'href');
  const json = await (await page.request.get(new URL(href, page.url()).href)).json();
  assert.equal(json.generated, snapshot.generated);
  assert.ok(await page.locator('#data-use a[href="https://github.com/collide2954/labor-polecon"]').count());
  assert.match(await page.textContent('#data-use'), /Cite as:.*https:\/\/collide2954\.github\.io\/labor-polecon\//);
  await page.close();
});

test('shared links get a title, description and preview image', async () => {
  const { page } = await open();
  const meta = (sel) => page.getAttribute(sel, 'content');
  assert.equal(await meta('meta[property="og:title"]'), 'Labor & Capital in Numbers');
  assert.ok((await meta('meta[property="og:description"]')).length > 40);
  assert.equal(await meta('meta[property="og:url"]'), 'https://collide2954.github.io/labor-polecon/');
  assert.equal(await meta('meta[property="og:image"]'), 'https://collide2954.github.io/labor-polecon/og.png');
  assert.equal(await meta('meta[name="twitter:card"]'), 'summary_large_image');
  const res = await page.request.get(new URL('og.png', page.url()).href);
  assert.equal(res.status(), 200);
  const png = await res.body();
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630]);
  await page.close();
});

test('each chart is one tab stop and arrow keys step through its marks', async () => {
  const { page } = await open();
  const stops = await page.evaluate(() => ({
    marks: document.querySelectorAll('.chart [data-k][tabindex="0"]').length,
    charts: document.querySelectorAll('.chart svg[tabindex="0"]').length,
  }));
  assert.equal(stops.marks, 0);
  assert.ok(stops.charts >= 40, `${stops.charts}`);
  const orgs = [...snapshot.lobbying.orgs].sort((a, b) => b.dollars - a.dollars);
  await page.focus('#lobby-chart svg');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  assert.match(await page.textContent('#tip'), new RegExp(orgs[2].name));
  await page.keyboard.press('Enter');
  assert.equal(await page.getAttribute('#tip', 'data-pinned'), 'true');
  await page.keyboard.press('Escape');
  await page.focus('#rate-chart svg');
  await page.keyboard.press('End');
  const last = Math.max(...snapshot.nipa.A457RC.years.map(([y]) => y));
  assert.match(await page.textContent('#tip'), new RegExp(`${last}`));
  await page.keyboard.press('ArrowLeft');
  assert.match(await page.textContent('#tip'), new RegExp(`${last - 1}`));
  await page.close();
});

test('chart keys never overlap on a phone', async () => {
  const { page } = await open({ width: 375 });
  const clashes = await page.$$eval('.chart svg', (svgs) => svgs.flatMap((svg) => {
    const keys = [...svg.querySelectorAll('text.seg-key')].map((t) => t.getBBox());
    return keys.flatMap((a, i) => keys.slice(i + 1).filter((c) => a.x < c.x + c.width && c.x < a.x + a.width && a.y < c.y + c.height && c.y < a.y + a.height))
      .map(() => svg.closest('[id]')?.id);
  }));
  assert.deepEqual(clashes, []);
  await page.close();
});

test('the footer says AI helped and that a person reviewed the work', async () => {
  const { page } = await open();
  const note = await page.textContent('#foot .made');
  assert.match(note, /^Made by a person, with help from AI tools\./);
  assert.match(note, /reviewed before publishing/);
  assert.match(await page.textContent('#foot'), /Not an official government site/);
  await page.close();
});

test('timeline draws six event lanes with their labels', async () => {
  const { page } = await open();
  const labels = await page.$$eval('#timeline-svg .lane-lab', (ts) => ts.map((t) => t.textContent));
  for (const l of ['Law and the state', 'Strikes and organizing', 'Wars, invasions, coups', 'Finance and money', 'Policing and dissent', 'Trade and capital abroad']) assert.ok(labels.includes(l), l);
  const rows = await page.$$eval('#timeline-svg [data-event]', (cs) => [...new Set(cs.map((c) => c.getAttribute('cy')))]);
  assert.equal(rows.length, 6);
  for (const org of ['war', 'finance', 'police', 'trade']) assert.ok(await page.locator(`#timeline-svg .ev-${org}`).count() >= 10, org);
  await page.close();
});
