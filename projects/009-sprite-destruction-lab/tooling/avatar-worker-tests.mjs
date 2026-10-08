import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(path.join(project, 'avatar-extension/service-worker.js'), 'utf8');
const PNG = 'data:image/png;base64,cGFnZQ==';
const sender = {id: 'avatar-test', frameId: 0, tab: {id: 7, windowId: 3, url: 'https://example.com/page'}};
function environment() {
  const calls = [], listeners = {};
  const config = {activeId: 7, focused: true, clock: 1000, captureWait: null, switchAfter: null, avatarOpen: true};
  const context = vm.createContext({
    console,
    Date: class extends Date {static now() {return config.clock;}},
    chrome: {
      runtime: {id: 'avatar-test', onMessage: {addListener(fn) {listeners.message = fn;}}},
      tabs: {
        query: async query => {calls.push({query}); return [{id: config.activeId, windowId: 3}];},
        captureVisibleTab: async (windowId, options) => {
          calls.push({capture: {windowId, options}});
          if (config.captureWait) await config.captureWait;
          if (config.switchAfter) config.activeId = config.switchAfter;
          return PNG;
        }
      },
      windows: {get: async windowId => ({id: windowId, focused: config.focused})},
      scripting: {executeScript: async options => {calls.push({injection: options}); return [{result: {open: config.avatarOpen}}];}},
      action: {onClicked: {addListener(fn) {listeners.action = fn;}}, setTitle: async () => {}, setBadgeText: async badge => {calls.push({badge});}, setBadgeBackgroundColor: async () => {}}
    }
  });
  vm.runInContext(source, context);
  context.sender = sender;
  return {context, calls, config, listeners};
}

test('Screenshot uses only the sender current visible tab and PNG format', async () => {
  const {context, calls} = environment();
  const result = await vm.runInContext('captureCurrentPage(sender)', context);
  assert.equal(result, PNG);
  const capture = calls.find(call => call.capture).capture;
  assert.equal(capture.windowId, 3);
  assert.equal(capture.options.format, 'png');
  assert.equal(calls.filter(call => call.query).length, 2);
});

test('Foreign extension, subframe, protected URL, inactive tab and unfocused window do not capture', async () => {
  for (const badSender of [
    {...sender, id: 'foreign'}, {...sender, frameId: 1}, {...sender, tab: {...sender.tab, url: 'chrome://settings'}}, {...sender, tab: {...sender.tab, id: 99}}
  ]) {
    const {context, calls} = environment(); context.badSender = badSender;
    await assert.rejects(vm.runInContext('captureCurrentPage(badSender)', context));
    assert.equal(calls.some(call => call.capture), false);
  }
  const {context, calls, config} = environment(); config.focused = false;
  await assert.rejects(vm.runInContext('captureCurrentPage(sender)', context));
  assert.equal(calls.some(call => call.capture), false);
});

test('Concurrent and faster-than-500ms captures are rejected, next capture can run after the interval', async () => {
  const {context, calls, config} = environment();
  let finish; config.captureWait = new Promise(resolve => {finish = resolve;});
  const pending = vm.runInContext('captureCurrentPage(sender)', context);
  await assert.rejects(vm.runInContext('captureCurrentPage(sender)', context), /正在获取/);
  finish(); await pending; config.captureWait = null;
  await assert.rejects(vm.runInContext('captureCurrentPage(sender)', context), /过于频繁/);
  config.clock += 500;
  assert.equal(await vm.runInContext('captureCurrentPage(sender)', context), PNG);
  assert.equal(calls.filter(call => call.capture).length, 2);
});

test('A screenshot is discarded when the active tab changes while capture is running', async () => {
  const {context, config} = environment(); config.switchAfter = 99;
  await assert.rejects(vm.runInContext('captureCurrentPage(sender)', context), /当前标签/);
});

test('Runtime reply has explicit success or error and never accepts an external target override', async () => {
  const {listeners, calls} = environment();
  const success = await new Promise(resolve => {
    assert.equal(listeners.message({type: 'AVATAR_CAPTURE', tabId: 99, windowId: 100}, sender, resolve), true);
  });
  assert.equal(success.ok, true); assert.equal(success.dataUrl, PNG);
  assert.equal(calls.find(call => call.capture).capture.windowId, sender.tab.windowId);
  const denied = await new Promise(resolve => listeners.message({type: 'AVATAR_CAPTURE'}, {...sender, id: 'foreign'}, resolve));
  assert.equal(denied.ok, false); assert.equal(typeof denied.error, 'string');
});

test('Click action injects only local Matter then the loader into the clicked ordinary page', async () => {
  const {context, calls} = environment();
  await vm.runInContext("openAvatar({id:7,url:'https://example.com'})", context);
  assert.equal(calls[0].injection.target.tabId, 7);
  assert.deepEqual(Array.from(calls[0].injection.files), ['assets/vendor/matter.min.js', 'content-loader.js']);
  assert.equal(calls.find(call => call.badge).badge.text, 'ON');
  const before = calls.length;
  await vm.runInContext("openAvatar({id:8,url:'chrome://extensions'})", context);
  assert.equal(calls.length, before);
  const closed = environment(); closed.config.avatarOpen = false;
  await vm.runInContext("openAvatar({id:7,url:'https://example.com'})", closed.context);
  assert.equal(closed.calls.find(call => call.badge).badge.text, '');
});
