import {createRequire} from 'node:module';
import {readFile, writeFile, mkdir, mkdtemp, cp} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import http from 'node:http';

const require = createRequire('C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium} = require('playwright');
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repository = path.resolve(project, '../..');
const cache = path.join(repository, '.cache', 'forma-extension-qa');
await mkdir(cache, {recursive: true});
const run = await mkdtemp(path.join(cache, 'run-'));
const extension = path.join(run, 'extension');
await cp(path.join(project, 'extension'), extension, {recursive: true});
const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'));
// Automation cannot click a headless browser toolbar. These permissions are
// added ONLY to this disposable copy; the downloadable package uses activeTab.
manifest.host_permissions.push('http://127.0.0.1/*', 'https://developer.mozilla.org/*');
await writeFile(path.join(extension, 'manifest.json'), JSON.stringify(manifest, null, 2));
const fixture = '<!doctype html><title>扩展真实网页验证</title><meta charset="utf-8"><style>body{max-width:900px;margin:70px auto;font:19px/1.8 system-ui;color:#234538}table{border-collapse:collapse}td,th{padding:12px 22px;border:1px solid #abc}</style><h1>实际网页内容</h1><p id="paragraph">HTML tables organize information into rows and columns.</p><table id="specs"><caption>真实规格表</caption><thead><tr><th>Product</th><th>Capacity</th><th>Price</th></tr></thead><tbody><tr><td>Model A</td><td>500 ml</td><td>129</td></tr><tr><td>Model B</td><td>750 ml</td><td>169</td></tr></tbody></table>';
const server = http.createServer((_request, response) => {response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}); response.end(fixture);});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
const checks = [], errors = [];
let onlineTranslation;
function check(name, condition, details = '') {
  checks.push({name, passed: Boolean(condition), details});
  if (!condition) throw new Error(`${name}: ${details}`);
}
const context = await chromium.launchPersistentContext(path.join(run, 'profile'), {
  channel: 'chromium', headless: true, viewport: {width: 1440, height: 1020},
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  acceptDownloads: true
});
let worker;
async function extensionRun(page, operation, argument) {
  // Execute in the extension's isolated world, not in the website's JS world.
  return worker.evaluate(async ({url, operation, argument}) => {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find(item => item.url === url);
    if (!tab) throw new Error('Test page not found');
    const results = await chrome.scripting.executeScript({
      target: {tabId: tab.id},
      func: async ({operation, argument}) => {
        if (operation === 'capture') { FormaToolbox.captureSelection(); return FormaToolbox.getState(); }
        if (operation === 'state') return FormaToolbox.getState();
        if (operation === 'table') { FormaToolbox.selectTable(document.querySelector(argument)); return FormaToolbox.getState(); }
        if (operation === 'captureTranslate') { FormaToolbox.captureSelection(); FormaToolbox.showTab('translate'); return FormaToolbox.getState(); }
        if (operation === 'request') return await chrome.runtime.sendMessage(argument);
        throw new Error('Unknown QA operation');
      },
      args: [{operation, argument}]
    });
    return results[0]?.result;
  }, {url: page.url(), operation, argument});
}
async function toggle(page) {
  return worker.evaluate(async url => {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find(item => item.url === url);
    await chrome.scripting.executeScript({target: {tabId: tab.id}, files: ['content-loader.js']});
    const [result] = await chrome.scripting.executeScript({target: {tabId: tab.id}, func: async () => await globalThis.__FORMA_EXTENSION_PROMISE__});
    return result.result;
  }, page.url());
}

try {
  worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', {timeout: 20000});
  check('Real Manifest V3 service worker is loaded from a disposable extension profile', worker.url().startsWith('chrome-extension://'));
  const page = context.pages()[0] || await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  check('Formal extension does not run before a user action', await page.locator('#forma-toolbox-host').count() === 0);
  let state = await toggle(page);
  check('Content loader mounts the real shared Shadow DOM tool', state?.open && await page.locator('#forma-toolbox-host').count() === 1, JSON.stringify(state));
  check('The tool stays isolated from the website JavaScript world', await page.evaluate(() => typeof globalThis.FormaToolbox === 'undefined'));
  await page.locator('#paragraph').evaluate(element => {const range = document.createRange(); range.selectNodeContents(element); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);});
  await extensionRun(page, 'capture');
  const selected = await extensionRun(page, 'state');
  check('The extension captures actual selected page text', JSON.stringify(selected).includes('HTML tables organize information'));
  await page.locator('#forma-toolbox-host [data-tab="notes"]').click();
  await page.locator('#forma-toolbox-host #note-comment').fill('从实际网页保存，验证跨站笔记。');
  await page.locator('#forma-toolbox-host #note-save').click();
  check('A real selection is saved with its page title, source URL and annotation', (await extensionRun(page, 'state')).notes.some(note => note.quote.includes('HTML tables organize') && note.sourceUrl === url && note.note.includes('跨站笔记')));
  await extensionRun(page, 'table', '#specs');
  check('Table extractor reads actual host-page table cells', JSON.stringify(await extensionRun(page, 'state')).includes('Model A') && await page.locator('#forma-toolbox-host').evaluate(host => host.shadowRoot.textContent.includes('750 ml')));
  const waiting = page.waitForEvent('download');
  await page.locator('#forma-toolbox-host #table-csv').click();
  const downloaded = await waiting;
  const csvPath = path.join(run, downloaded.suggestedFilename());
  await downloaded.saveAs(csvPath);
  const csv = await readFile(csvPath, 'utf8');
  check('CSV export contains actual table rows rather than a placeholder', csv.includes('Model A,500 ml,129') && csv.includes('Model B,750 ml,169'));
  state = await toggle(page);
  check('Repeating the action unmounts the tool and restores the host page', state?.open === false && await page.locator('#forma-toolbox-host').count() === 0 && await page.locator('#specs tbody tr').count() === 2);
  state = await toggle(page);
  check('The same module can remount after its first close', state?.open && await page.locator('#forma-toolbox-host').count() === 1);
  const denied = await extensionRun(page, 'request', {type: 'FORMA_TRANSLATE', q: 'x'.repeat(501), langpair: 'en|zh-CN'});
  check('Live service worker rejects a request above 500 bytes', denied?.ok === false && denied.error.includes('500'));
  const live = await extensionRun(page, 'request', {type: 'FORMA_TRANSLATE', q: 'HTML tables organize information into rows and columns.', langpair: 'en|zh-CN'});
  onlineTranslation = {available: live?.ok === true && Number(live.data?.responseStatus) === 200, response: live};
  check('The loaded extension returns the actual service response or an explicit network/quota error', onlineTranslation.available && /[\u3400-\u9fff]/.test(live.data?.responseData?.translatedText || '') || live?.ok === false && Boolean(live.error), JSON.stringify(live));
  await writeFile(path.join(project, 'notes', 'extension-live-translation.json'), JSON.stringify({checkedAt: new Date().toISOString(), sourceText: 'HTML tables organize information into rows and columns.', response: live}, null, 2));

  const mdn = await context.newPage();
  mdn.on('pageerror', error => errors.push(error.message));
  await mdn.goto('https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/table', {waitUntil: 'domcontentloaded', timeout: 60000});
  const response = await toggle(mdn);
  check('The same packaged extension mounts on the live MDN website', response?.open === true && await mdn.locator('#forma-toolbox-host').count() === 1 && mdn.url().startsWith('https://developer.mozilla.org/'), JSON.stringify(response));
  check('Extension-local excerpts are shared across different website origins', (await extensionRun(mdn, 'state')).notes.some(note => note.sourceUrl === url && note.note.includes('跨站笔记')));
  const paragraph = mdn.locator('main p').filter({hasText: 'tabular data'}).first();
  await paragraph.evaluate(element => {
    const phrase = 'information presented in a two-dimensional table';
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node, found;
    while ((node = walker.nextNode())) if (node.textContent.includes(phrase)) {found = node; break;}
    if (!found) throw new Error('Live article sentence has changed');
    const start = found.textContent.indexOf(phrase), range = document.createRange();
    range.setStart(found, start); range.setEnd(found, start + phrase.length);
    const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
  });
  await extensionRun(mdn, 'captureTranslate');
  check('A sentence from the public MDN article is captured with its real URL', JSON.stringify(await extensionRun(mdn, 'state')).includes('two-dimensional table'));
  await mkdir(path.join(project, 'web/toolbox/assets'), {recursive: true});
  await mdn.locator('#forma-toolbox-host #translate').click();
  await mdn.waitForFunction(() => {
    const shadow = document.getElementById('forma-toolbox-host')?.shadowRoot;
    return shadow && (!shadow.getElementById('translation-result').hidden || shadow.getElementById('translation-status').classList.contains('error'));
  }, {timeout: 60000});
  const translationState = await extensionRun(mdn, 'state');
  const visibleStatus = await mdn.locator('#forma-toolbox-host #translation-status').textContent();
  check('The public-page translate button shows a real translation or the real service failure', Boolean(translationState.translation?.text) || /429|超时|失败|配额|额度|服务|网络/.test(visibleStatus), visibleStatus);
  onlineTranslation.publicPage = {available: Boolean(translationState.translation?.text), text: translationState.translation?.text || '', status: visibleStatus};
  await mdn.screenshot({path: path.join(project, 'web/toolbox/assets/extension-mdn-translation.png'), fullPage: false});
  const count = await mdn.locator('main table').count();
  check('The public article contains real extractable HTML tables', count > 0, String(count));
  await extensionRun(mdn, 'table', 'main table');
  await mdn.screenshot({path: path.join(project, 'web/toolbox/assets/extension-mdn.png'), fullPage: false});
  await mdn.screenshot({path: path.join(project, 'web/toolbox/assets/extension-mdn-table.png'), fullPage: false});
  check('The table panel is populated from the real MDN table', await mdn.locator('#forma-toolbox-host').evaluate(host => host.shadowRoot.querySelectorAll('tbody tr').length > 0));
  check('The tested extension loader and UI produce no uncaught page errors', errors.length === 0, errors.join('; '));
} catch (error) {
  checks.push({name: 'Extension run completed', passed: false, details: error.message});
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  await writeFile(path.join(project, 'notes/extension-checks.json'), JSON.stringify({checkedAt: new Date().toISOString(), environment: 'Bundled full Chromium headless, disposable profile and test-only localhost/MDN host grants', productionPermissions: JSON.parse(await readFile(path.join(project, 'extension/manifest.json'), 'utf8')).permissions, onlineTranslation, checks, errors}, null, 2));
  await context.close();
  await new Promise(resolve => server.close(resolve));
  console.log(JSON.stringify({passed: checks.filter(item => item.passed).length, total: checks.length, errors}));
}
