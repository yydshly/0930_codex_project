/* Independent browser verification for the local or deployed 017 static site.
   The report records the adapter actually selected; no historical results or
   narrow viewport screenshots are counted as current device performance tests. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {chromium} = require(process.env.WATERFALLS_PLAYWRIGHT || 'C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const args = process.argv.slice(2), option = (name, fallback) => {
  const at = args.indexOf(name); return at === -1 ? fallback : args[at + 1];
};
const base = option('--base', 'http://127.0.0.1:8992/projects/017-waterfalls-lab/').replace(/\/?$/, '/');
const project = path.resolve(__dirname, '..');
const reportPath = path.resolve(project, option('--report', 'notes/publication-local-browser.json'));
const label = option('--label', '').replace(/[^a-z0-9_-]/gi, '');
const filePrefix = 'publication-' + (label ? label + '-' : '');
const screenshots = path.join(project, 'assets');
const gpuBackend = option('--gpu', 'd3d11');
const channel = option('--channel', 'msedge');
const launchArgs = gpuBackend === 'swiftshader'
  ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-unsafe-webgpu']
  : ['--use-angle=d3d11', '--enable-unsafe-webgpu'];
const report = {
  date: new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date()),
  timezone: 'Asia/Shanghai', base, environment: 'Independent headless Chromium with ANGLE ' + gpuBackend + '; actual WebGPU adapter recorded below; desktop and simulated narrow viewports.',
  gpuBackend, channel,
  launchArgs, hardwarePerformanceTest: false, historicalV9HardwareResultsReused: false,
  storageScope: 'Fresh browser contexts; no existing user browser profile or local作品 storage accessed.',
  checks: [], resources: [], browserErrors: [], missingResources: [], screenshots: [], gpu: {}, attempts: [],
};
if (fs.existsSync(reportPath)) {
  try {
    const previous = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    report.attempts = previous.attempts || [];
    if (previous.result === 'failed') report.attempts.push({
      date: previous.date, base: previous.base, browserVersion: previous.browserVersion,
      launchArgs: previous.launchArgs, gpu: previous.gpu,
      failures: previous.checks.filter(check => !check.passed),
    });
  } catch {}
}
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function check(name, passed, details) {
  report.checks.push({name, passed: !!passed, ...(details === undefined ? {} : {details})});
  console.log((passed ? 'PASS ' : 'FAIL ') + name);
}
async function scenario(name, fn) {
  try { await fn(); } catch (error) { check(name, false, {error: error.message}); }
}
function watch(page, scope) {
  page.on('pageerror', error => report.browserErrors.push({scope, message: error.message}));
  page.on('response', response => {
    if (response.status() >= 400 && new URL(response.url()).origin === new URL(base).origin)
      report.missingResources.push({scope, status: response.status(), url: response.url()});
  });
}
async function screenshot(page, name) {
  const relative = 'assets/' + filePrefix + name + '.png';
  await page.screenshot({path: path.join(project, relative), fullPage: false});
  report.screenshots.push(relative);
}
async function downloadBytes(page, selector) {
  const pending = page.waitForEvent('download', {timeout: 30000});
  await page.locator(selector).first().click();
  const download = await pending;
  const failure = await download.failure();
  if (failure) throw Error(failure);
  const stream = await download.createReadStream(), chunks = [];
  for await (const bytes of stream) chunks.push(bytes);
  return {name: download.suggestedFilename(), bytes: Buffer.concat(chunks)};
}
function filesBelow(directory) {
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(file) : entry.isFile() ? [file] : [];
  });
}
async function main() {
  fs.mkdirSync(screenshots, {recursive: true});
  const browser = await chromium.launch({headless: true, ...(channel === 'bundled' ? {} : {channel}), args: launchArgs});
  report.browserVersion = browser.version();
  const context = await browser.newContext({viewport: {width: 1280, height: 900}, reducedMotion: 'reduce', acceptDownloads: true});
  try {
    const page = await context.newPage(); watch(page, 'understanding');
    await scenario('Complete understanding reader and prominent public resources', async () => {
      await page.goto(new URL('understanding.html', base).href, {waitUntil: 'networkidle'});
      await page.locator('.summary-image img').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('.summary-image img')?.naturalWidth === 1800);
      await page.evaluate(() => scrollTo(0, 0));
      const result = await page.evaluate(() => ({
        title: document.title, products: document.querySelectorAll('details.product').length,
        sections: ['effect','resources','position','capabilities','principles','products','value','boundaries','map','sources'].map(id => ({id, present: !!document.getElementById(id)})),
        resources: [...document.querySelectorAll('#resources a')].map(a => ({href: a.getAttribute('href'), text: a.innerText.trim(), visible: a.getBoundingClientRect().width > 0})),
      }));
      check('Complete understanding reader and prominent public resources', result.products === 6 && result.sections.every(x => x.present) &&
        ['./','./upstream/','./source-notice.html','./research-assets/understanding-map.png','./research-assets/understanding-map.svg'].every(href => result.resources.some(a => a.href === href && a.visible)) &&
        result.resources.some(a => a.href.includes('github.com/yydshly/0930_codex_project/tree/main/projects/017-waterfalls-lab') && a.visible), result);
    });
    for (const width of [1280, 390, 320]) await scenario('Reader layout at ' + width + 'px', async () => {
      await page.setViewportSize({width, height: 900});
      await page.goto(new URL('understanding.html', base).href, {waitUntil: 'networkidle'});
      await page.locator('.summary-image img').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('.summary-image img')?.naturalWidth === 1800);
      await page.evaluate(() => scrollTo(0, 0));
      const result = await page.evaluate(() => ({
        viewport: innerWidth, pageWidth: document.documentElement.scrollWidth,
        firstImage: document.querySelector('.hero img')?.naturalWidth,
        mapImage: document.querySelector('.summary-image img')?.naturalWidth,
        mainLinkVisible: [...document.querySelectorAll('.studio-link')].every(a => {const r = a.getBoundingClientRect();return r.width > 0 && r.x >= -.5 && r.right <= innerWidth + .5;}),
        overflowing: [...document.querySelectorAll('header,main,section,figure,.resource-card')].filter(el => {const r = el.getBoundingClientRect();return r.x < -1 || r.right > innerWidth + 1;}).map(el => ({tag: el.tagName,id: el.id,className: el.className})),
      }));
      check('Reader layout at ' + width + 'px', result.pageWidth <= width + 1 && result.mainLinkVisible && result.firstImage === 2200 && result.mapImage === 1800 && result.overflowing.length === 0, result);
      await screenshot(page, 'understanding-' + width);
    });
    await page.setViewportSize({width: 1280, height: 900});
    await scenario('All six product details have working native and bulk controls', async () => {
      await page.locator('#collapse-products').click();
      check('Bulk collapse closes all six product details', await page.locator('details.product[open]').count() === 0);
      for (const product of await page.locator('details.product').all()) {
        await product.locator('summary').click();
        const body = product.locator('.product-body');
        check('Native detail expands ' + await product.getAttribute('id'), await body.isVisible() && (await body.innerText()).includes('业务补充'));
      }
      await page.locator('#collapse-products').click(); await page.locator('#expand-products').click();
      check('Bulk expand reveals all six product details', await page.locator('details.product[open]').count() === 6);
      await page.locator('#resources').scrollIntoViewIfNeeded(); await screenshot(page, 'resources');
    });
    await scenario('Original PNG and editable SVG really download unchanged', async () => {
      for (const kind of ['png', 'svg']) {
        const result = await downloadBytes(page, '.map-actions a[download$=".' + kind + '"]');
        const expected = fs.readFileSync(path.join(project, 'assets/understanding-map.' + kind));
        check('Native ' + kind.toUpperCase() + ' guide download is unchanged', digest(result.bytes) === digest(expected), {name: result.name, bytes: result.bytes.length, sha256: digest(result.bytes)});
      }
    });
    await scenario('Reader fragments and public internal links resolve', async () => {
      const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.href));
      const missing = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].map(a => a.hash.slice(1)).filter(id => id && !document.getElementById(id)));
      check('Every reader fragment identifies an existing section', missing.length === 0, {missing});
      for (const url of [...new Set(links)].filter(url => new URL(url).origin === new URL(base).origin && !new URL(url).hash)) {
        const response = await context.request.get(url);
        report.resources.push({url, status: response.status(), scope: 'reader-link'});
      }
      check('Every local reader destination is publicly served', report.resources.filter(x => x.scope === 'reader-link').every(x => x.status === 200));
    });
    await scenario('Reading remains complete without JavaScript', async () => {
      const noJS = await browser.newContext({javaScriptEnabled: false, viewport: {width: 390, height: 844}});
      try {
        const textPage = await noJS.newPage(); watch(textPage, 'reader-no-js');
        await textPage.goto(new URL('understanding.html', base).href, {waitUntil: 'networkidle'});
        const text = await textPage.locator('body').innerText();
        check('Text, effect, principle, value and sources are readable without JavaScript', ['可编辑自然场景','PB-MPM','对你的价值','源码与研究记录','Mogmek','Breakpoint'].every(s => text.includes(s)));
        for (const detail of await textPage.locator('details.product').all()) {
          if (await detail.getAttribute('open') === null) await detail.locator('summary').click();
          check('Native no-JS detail can reveal ' + await detail.getAttribute('id'), await detail.locator('.product-body').isVisible());
        }
        await screenshot(textPage, 'reader-no-js-390');
      } finally { await noJS.close(); }
    });
    await scenario('EA upstream entire static runtime is publicly served', async () => {
      const upstream = path.join(project, 'web/upstream');
      for (const file of filesBelow(upstream)) {
        const relative = path.relative(path.join(project, 'web'), file).split(path.sep).join('/');
        const response = await context.request.get(new URL(relative, base).href);
        const bytes = await response.body(), expected = fs.readFileSync(file);
        const isText = /\.(html|css|js|json|wgsl|md|svg)$/.test(relative);
        const same = isText ? bytes.toString().replace(/\r\n/g, '\n') === expected.toString().replace(/\r\n/g, '\n') : digest(bytes) === digest(expected);
        report.resources.push({path: relative, status: response.status(), bytes: bytes.length, sha256: digest(bytes), passed: response.status() === 200 && same, scope: 'EA-upstream'});
      }
      check('EA upstream complete HTML, modules, WGSL, scenes, images and license match source', report.resources.filter(x => x.scope === 'EA-upstream').every(x => x.passed), {files: report.resources.filter(x => x.scope === 'EA-upstream').length});
    });
    await scenario('WebGPU studio initializes and essential controls work', async () => {
      const studio = await context.newPage(); watch(studio, 'studio');
      await studio.goto(base, {waitUntil: 'domcontentloaded'});
      report.gpu = await studio.evaluate(async () => {
        if (!navigator.gpu) return {available: false, reason: 'navigator.gpu unavailable'};
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) return {available: false, reason: 'No WebGPU adapter'};
        const info = adapter.info || await adapter.requestAdapterInfo?.() || {};
        return {available: true, vendor: info.vendor, architecture: info.architecture, device: info.device, description: info.description, isFallbackAdapter: info.isFallbackAdapter ?? adapter.isFallbackAdapter, maxBufferSize: adapter.limits.maxBufferSize, maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize};
      });
      report.gpu.executionKind = report.gpu.available && report.gpu.isFallbackAdapter === false && /^(intel|nvidia|amd)$/i.test(report.gpu.vendor || '')
        ? 'current-machine hardware adapter' : gpuBackend === 'swiftshader' ? 'software adapter attempt' : 'adapter type unavailable or unconfirmed';
      await studio.waitForFunction(() => ['ready','error'].includes(document.body.dataset.status), null, {timeout: 90000});
      const state = await studio.evaluate(() => ({status: document.body.dataset.status, loadingText: document.querySelector('#loading-text')?.textContent, canvas: {width: document.querySelector('#world').width, height: document.querySelector('#world').height}}));
      check('Studio WebGPU initializes on recorded current adapter', state.status === 'ready', {gpu: report.gpu, state});
      if (state.status !== 'ready') return;
      await studio.locator('#quality').selectOption('light');
      await studio.locator('#pause').click();
      check('Pause control exposes paused state', await studio.locator('#pause').getAttribute('aria-pressed') === 'true');
      await studio.locator('#pause').click();
      check('Pause control resumes water flow', await studio.locator('#pause').getAttribute('aria-pressed') === 'false');
      await studio.locator('[data-view="close"]').click();
      check('Camera preset can switch to close view', (await studio.locator('[data-view="close"]').getAttribute('class')).includes('active'));
      await studio.locator('#camera-bookmarks summary').click();
      await studio.locator('#camera-view-name').fill('发布验证镜头'); await studio.locator('#camera-view-add').click();
      check('Camera bookmark saves in isolated browser context', (await studio.locator('#camera-view-count').innerText()).includes('1 / 8') && await studio.locator('#camera-view-select option').count() === 2);
      await studio.locator('#immersive-toggle').click();
      check('Immersive mode has visible exit', await studio.locator('#immersive-exit').isVisible() && await studio.locator('body').evaluate(el => el.classList.contains('clean')));
      await studio.keyboard.press('Escape');
      check('Escape returns to editor', !await studio.locator('#immersive-exit').isVisible() && !await studio.locator('body').evaluate(el => el.classList.contains('clean')));
      await studio.locator('[data-view="wide"]').click();
      await studio.waitForTimeout(2500); await screenshot(studio, 'studio-' + gpuBackend + '-1280');
      await studio.locator('#capture').click();
      await studio.locator('#capture-dialog').waitFor({state: 'visible', timeout: 30000});
      const output = await downloadBytes(studio, '#capture-download');
      const png = output.bytes;
      check('GPU output download is a real nonempty PNG', png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && png.length > 1000, {bytes: png.length, width: png.readUInt32BE(16), height: png.readUInt32BE(20)});
      const outputName = 'assets/' + filePrefix + 'gpu-output-' + gpuBackend + '.png';
      fs.writeFileSync(path.join(project, outputName), png); report.screenshots.push(outputName);
      await studio.locator('#capture-close').click();
      await studio.locator('#pause').click(); await studio.locator('#about-open').click(); await studio.locator('#inspect').click();
      await studio.waitForFunction(() => ['pass','fail'].includes(document.querySelector('#inspection').dataset.result), null, {timeout: 30000});
      const physics = await studio.locator('#inspection').evaluate(el => ({result: el.dataset.result, text: el.textContent}));
      const active = Number((physics.text.match(/^[\d,]+/) || ['0'])[0].replaceAll(',', ''));
      check('Particle diagnostics return finite/in-domain/collision status on current adapter', physics.result === 'pass' && active > 0, {...physics, active});
      await studio.locator('#about-close').click();
      for (const width of [390, 320]) {
        await studio.setViewportSize({width, height: 844});
        const layout = await studio.evaluate(() => ({width: innerWidth, scroll: document.documentElement.scrollWidth, summary: {visible: document.querySelector('.understanding-link').getBoundingClientRect().width > 0, right: document.querySelector('.understanding-link').getBoundingClientRect().right}}));
        check('Studio preserves visible understanding entry at ' + width + 'px', layout.scroll <= width + 1 && layout.summary.visible && layout.summary.right <= width + 1, layout);
      }
      await studio.close();
    });
    check('No missing local browser resources', report.missingResources.length === 0, report.missingResources);
    check('No JavaScript page errors', report.browserErrors.length === 0, report.browserErrors);
  } finally { await context.close(); await browser.close(); }
}
main().catch(error => {report.fatalError = error.stack || String(error);process.exitCode = 1;console.error(error);}).finally(() => {
  report.checksPassed = report.checks.filter(x => x.passed).length;
  report.checksFailed = report.checks.filter(x => !x.passed).length;
  report.result = report.fatalError || report.checksFailed ? 'failed' : 'passed';
  fs.mkdirSync(path.dirname(reportPath), {recursive: true});fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  if (report.result !== 'passed') process.exitCode = 1;
  console.log(JSON.stringify({result: report.result, passed: report.checksPassed, failed: report.checksFailed, report: reportPath}));
});
