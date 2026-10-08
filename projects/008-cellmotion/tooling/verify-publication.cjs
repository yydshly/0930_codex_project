// Verify the complete built or public site without regenerating its existing guide.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const runtime = process.env.PLAYWRIGHT_RUNTIME || 'C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json';
const { chromium } = createRequire(runtime)('playwright');
const project = path.resolve(__dirname, '..');
const base = new URL(process.argv[2] || 'http://127.0.0.1:8968/projects/008-cellmotion/');
const online = base.protocol === 'https:';
const mode = online ? 'online' : 'local';
const output = path.join(project, 'build', `publication-${mode}`);
fs.mkdirSync(output, { recursive: true });
const report = { date: '2026-10-08', url: base.href, checks: [], errors: [], localhostRequests: [], media: [], screenshots: [] };
const check = (name, passed, details) => {
  report.checks.push({ name, passed: Boolean(passed), ...(details ? { details } : {}) });
  if (!passed) throw Error(name);
};
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const expectedGuide = 'd982837123f17f1f83e9e7a664f9e31cbedf6d5d603553b8f874b21b5d822ffe';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('request', request => {
    if (online && /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(request.url())) report.localhostRequests.push(request.url());
  });
  const go = async file => {
    const response = await page.goto(new URL(file, base).href, { waitUntil: 'domcontentloaded', timeout: 45000 });
    check(`${file || 'index.html'} returns HTTP 200`, response.status() === 200);
  };
  const snapshot = async name => {
    const relative = `assets/publication-${mode}-${name}.png`;
    await page.screenshot({ path: path.join(project, relative) });
    report.screenshots.push(relative);
  };
  try {
    await go('');
    await page.waitForFunction(() => document.querySelectorAll('.effect-card').length === 12);
    check('Three prominent entry cards and five related links are present', await page.locator('.gateway-links a').count() === 3 && await page.locator('.gateway-related a').count() === 5);
    check('Gateway retains the requested original understanding image', (await page.locator('.gateway-map img').getAttribute('src')) === 'assets/understanding-map.png');
    await page.waitForFunction(() => { const v = document.querySelector('#main-video'); return v.readyState >= 2 && v.videoWidth > 0; }, null, { timeout: 40000 });
    const mediaState = async selector => {
      const media = await page.locator(selector).evaluate(v => ({ src: v.currentSrc, width: v.videoWidth, height: v.videoHeight, duration: v.duration }));
      report.media.push(media);
      return media;
    };
    check('Original Glyph Morph video decodes', (await mediaState('#main-video')).width > 0);
    await page.locator('#main-video').evaluate(async v => { v.currentTime = .5; await v.play(); });
    await page.waitForFunction(() => document.querySelector('#main-video').currentTime > .7);
    check('Original video really plays', true);
    await page.locator('#main-video').evaluate(v => v.pause());
    await snapshot('desktop');
    await page.locator('[data-select="letterpulse"]').first().click();
    await page.waitForFunction(() => { const v = document.querySelector('#main-video'); return v.currentSrc.includes('letterpulse') && v.readyState >= 2; }, null, { timeout: 40000 });
    check('Representative control switches to a decoded Letter Pulse video', await page.locator('#effect-name').innerText() === '字阶' && (await mediaState('#main-video')).width > 0);
    await page.locator('#main-video').evaluate(v => v.pause());
    await page.locator('#show-all').click();
    check('Full catalog contains 37 ready effects and excludes pending Coil', await page.locator('.effect-card').count() === 37 && await page.locator('.effect-card [data-select="coil"]').count() === 0);
    await page.locator('[data-category="space"]').click();
    check('Category filtering displays the two ready space effects', await page.locator('.effect-card').count() === 2);
    await page.locator('[data-category="all"]').click();
    await page.locator('[data-select="searchtyping"]').last().click();
    check('Non-video entries show an explicitly labelled static cover', await page.locator('#main-poster').isVisible() && (await page.locator('#stage-label').innerText()).includes('静态封面') && await page.locator('#replay').isDisabled());
    for (const id of [1, 2, 3]) {
      const selector = `video[data-case="${id}"]`;
      await page.locator(selector).evaluate(v => { v.load(); });
      await page.waitForFunction(n => { const v = document.querySelector(`video[data-case="${n}"]`); return v.readyState >= 2 && v.videoWidth > 0; }, id, { timeout: 40000 });
      await page.locator(selector).evaluate(async v => { v.currentTime = .1; await v.play(); });
      await page.waitForFunction(n => document.querySelector(`video[data-case="${n}"]`).currentTime > .25, id);
      await page.locator(selector).evaluate(v => v.pause());
      check(`Original finished case ${id} decodes and plays`, (await mediaState(selector)).width > 0);
    }
    await page.locator('#lab-scrubber').fill('1000');
    check('Teaching timeline reaches the complete ending', await page.locator('#lab-progress').innerText() === '100%');
    await page.locator('[data-select="glyphmorph"]').first().click();
    await page.locator('#open-editor').click();
    await page.frameLocator('#editor-frame').locator('#sequenceRows input[data-key="text"]').first().waitFor({ timeout: 45000 });
    check('Original editor opens in the on-demand embedded workbench', await page.locator('#editor-dialog').isVisible() && (await page.locator('#editor-frame').getAttribute('src')).includes('glyphmorph.html'));
    await page.locator('#close-editor').click();
    check('Closing the workbench unloads the external editor', await page.locator('#editor-dialog').isHidden() && await page.locator('#editor-frame').getAttribute('src') === 'about:blank');
    await page.locator('.gateway-links [data-entry="workshop"]').click();
    await page.waitForFunction(() => Boolean(window.MotionWorkshop));
    check('Main workshop entry navigates under the deployment subpath', page.url() === new URL('workshop.html', base).href);
    await page.locator('#text-from').fill('你好创意');
    await page.locator('#text-to').fill('创意你好');
    await page.locator('#show-guides').uncheck();
    const frame = () => page.locator('#motion-canvas').evaluate(c => c.toDataURL());
    const seek = t => page.evaluate(t => MotionWorkshop.seek(t), t);
    const middles = [], endings = [];
    for (const effect of ['match', 'type', 'pulse', 'particles']) {
      await page.locator(`[data-recipe="${effect}"]`).click();
      await seek(2.15); const middle = await frame(); middles.push(middle);
      await seek(1.5); await seek(2.15);
      check(`${effect} reproduces the same frame at the same time`, middle === await frame());
      await seek(4); endings.push(await frame());
    }
    check('Four algorithms create distinct transitions with a shared complete ending', new Set(middles).size === 4 && new Set(endings).size === 1);
    check('User content enters the editable production brief', (await page.locator('#request-text').inputValue()).includes('创意你好'));
    await page.locator('#ratio').selectOption('1:1');
    await page.locator('.image-control summary').click();
    await page.locator('#image-file').setInputFiles(path.join(project, 'web/assets/edited-export.png'));
    await page.waitForFunction(() => MotionWorkshop.getConfig().image !== null);
    await seek(4); const withImage = await frame();
    const download = async (selector, filename) => {
      const promise = page.waitForEvent('download'); await page.locator(selector).click();
      const file = path.join(output, filename); await (await promise).saveAs(file); return fs.readFileSync(file);
    };
    const png = await download('#download-frame', 'frame.png');
    check('Actual PNG export has the selected 720 by 720 dimensions', png.readUInt32BE(16) === 720 && png.readUInt32BE(20) === 720);
    const recipe = JSON.parse((await download('#download-recipe', 'recipe.json')).toString('utf8'));
    check('Downloaded JSON preserves content and embedded image', recipe.schema === 'motion-workshop-v1' && recipe.config.to === '创意你好' && recipe.config.image.dataURL.startsWith('data:image/png;base64,'));
    await page.locator('#remove-image').click(); await page.locator('#text-to').fill('临时修改');
    await page.locator('#recipe-file').setInputFiles(path.join(output, 'recipe.json'));
    await page.waitForFunction(() => MotionWorkshop.getConfig().to === '创意你好' && MotionWorkshop.getConfig().image !== null);
    await seek(4);
    check('JSON import restores the saved image and exact frame', withImage === await frame());
    await page.locator('#copy-request').click();
    await page.waitForFunction(() => document.querySelector('#copy-request').textContent.includes('已复制'));
    check('Production brief can be copied', (await page.evaluate(() => navigator.clipboard.readText())).includes('创意你好'));
    await page.locator('header a[href="summary.html"]').click();
    await page.waitForFunction(() => document.querySelector('#understanding-map').complete && document.querySelector('#understanding-map').naturalWidth > 0);
    check('Summary navigation and six understanding sections are complete', await page.locator('#library,#principle,#comparison,#website,#value,#daily').count() === 6);
    check('Tool comparison and explicit daily-workflow boundary are readable', (await page.locator('#comparison').innerText()).includes('HeyGen') && (await page.locator('#daily').innerText()).includes('没有已经接通'));
    const guidePng = await download('.map-downloads a[download$=".png"]', 'understanding-map.png');
    const guideSvg = await download('.map-downloads a[download$=".svg"]', 'understanding-map.svg');
    check('Downloaded guide is exactly the original PNG, plus the complete editable SVG', hash(guidePng) === expectedGuide && guideSvg.equals(fs.readFileSync(path.join(project, 'web/assets/understanding-map.svg'))));
    const internalLinks = new Set();
    for (const file of ['index.html', 'workshop.html', 'summary.html']) {
      await go(file);
      for (const href of await page.locator('a[href]').evaluateAll(anchors => anchors.map(a => a.href))) {
        if (new URL(href).origin === base.origin) internalLinks.add(href);
      }
      for (const width of [768, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        check(`${file} at ${width}px has no horizontal page overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        if (file === 'index.html' && width === 390) await snapshot('mobile');
      }
    }
    const linkChecks = await Promise.all([...internalLinks].map(async href => {
      const response = await context.request.get(href, { timeout: 45000 });
      const fragment = decodeURIComponent(new URL(href).hash.slice(1));
      let anchor = true;
      if (fragment) {
        const html = await response.text();
        anchor = await page.evaluate(({ html, fragment }) => Boolean(new DOMParser().parseFromString(html, 'text/html').getElementById(fragment)), { html, fragment });
      }
      return { href, status: response.status(), anchor, passed: response.ok() && anchor };
    }));
    check('Every internal page, download, source-code link and section anchor resolves', linkChecks.every(link => link.passed), linkChecks);
    await page.goto(new URL('../../', base).href, { waitUntil: 'domcontentloaded' });
    const card = page.locator('article').filter({ has: page.locator('.eyebrow', { hasText: 'PROJECT 008' }) });
    check('Research homepage clearly exposes the full project and related entrances', await card.count() === 1 && await card.locator('a[href$="workshop.html"]').count() === 1 && await card.locator('a[href$="summary.html"]').count() === 1 && await card.locator('a[href$="#stories"]').count() === 1);
    check('Homepage cover uses the previous understanding PNG and labels the full summary', (await card.locator('img').getAttribute('src')).endsWith('assets/understanding-map.png') && (await card.innerText()).includes('比较：') && (await card.innerText()).includes('边界：'));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(async () => {
      await Promise.all([...document.images].map(async img => { img.loading = 'eager'; await img.decode(); }));
      await document.fonts.ready;
    });
    await card.scrollIntoViewIfNeeded();
    await card.screenshot({ path: path.join(project, `assets/publication-${mode}-catalog.png`) });
    report.screenshots.push(`assets/publication-${mode}-catalog.png`);
    check('No script errors or local-service requests on the public site', report.errors.length === 0 && report.localhostRequests.length === 0);
  } finally {
    fs.writeFileSync(path.join(project, `notes/publication-browser-${mode}.json`), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ mode, passed: report.checks.filter(c => c.passed).length, total: report.checks.length, errors: report.errors, localhostRequests: report.localhostRequests }, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
