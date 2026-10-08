import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(path.join(project, 'extension/service-worker.js'), 'utf8');
function environment() {
  const calls = [];
  const listeners = {};
  const saved = {};
  const event = name => ({addListener(callback) { listeners[name] = callback; }});
  const context = vm.createContext({
    TextEncoder, URL, AbortController, setTimeout, clearTimeout, console,
    fetch: async (url, options) => {
      calls.push({url: String(url), options});
      return {ok: true, json: async () => ({responseStatus: 200, responseData: {translatedText: '真实响应'}})};
    },
    chrome: {
      runtime: {id: 'test-extension', onMessage: event('message'), onInstalled: event('installed')},
      action: {onClicked: event('clicked'), setTitle: async () => {}, setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {}},
      scripting: {executeScript: async options => {calls.push({injection: options}); return [{result: {open: true}}];}},
      storage: {local: {
        get: async key => {await new Promise(resolve => setTimeout(resolve, 2)); return structuredClone({[key]: saved[key]});},
        set: async value => {await new Promise(resolve => setTimeout(resolve, 2)); Object.assign(saved, structuredClone(value));}
      }},
      contextMenus: {onClicked: event('context'), removeAll: callback => callback(), create: () => {}}
    }
  });
  vm.runInContext(source, context);
  return {context, calls, listeners, saved};
}

test('Translation proxy accepts only validated q and a fixed URL', async () => {
  const {context, calls} = environment();
  const result = await vm.runInContext("requestTranslation({q:'A & B?',langpair:'en|zh-CN',url:'https://malicious.invalid/'})", context);
  assert.equal(result.responseData.translatedText, '真实响应');
  const url = new URL(calls[0].url);
  assert.equal(url.origin, 'https://api.mymemory.translated.net');
  assert.equal(url.pathname, '/get');
  assert.equal(url.searchParams.get('q'), 'A & B?');
  assert.equal(url.searchParams.get('langpair'), 'en|zh-CN');
  assert.equal(url.searchParams.size, 2);
  assert.equal(calls[0].options.credentials, 'omit');
  assert.equal(calls[0].options.redirect, 'error');
});

test('Empty text, UTF-8 overflow, same language and arbitrary language are rejected before network', async () => {
  const {context, calls} = environment();
  for (const message of [
    {q:' ', langpair:'en|zh-CN'},
    {q:'汉'.repeat(167), langpair:'en|zh-CN'},
    {q:'text', langpair:'en|en'},
    {q:'text', langpair:'auto|zh-CN'},
    {q:'text', langpair:'en|https://example.com'},
  ]) {
    context.message = message;
    await assert.rejects(vm.runInContext('requestTranslation(message)', context));
  }
  assert.equal(calls.length, 0);
});

test('Only this extension can forward a request from an HTTP or HTTPS content-script tab', async () => {
  const {calls, listeners} = environment();
  for (const sender of [{id:'other',tab:{url:'https://example.com'}}, {id:'test-extension'}, {id:'test-extension',tab:{url:'chrome://settings'}}]) {
    let response;
    const pending = listeners.message({type:'FORMA_TRANSLATE',q:'text',langpair:'en|zh-CN'}, sender, result => {response = result;});
    assert.equal(pending, false);
    assert.equal(response.ok, false);
  }
  assert.equal(calls.length, 0);
  const response = await new Promise(resolve => {
    assert.equal(listeners.message({type:'FORMA_TRANSLATE',q:'text',langpair:'en|zh-CN'}, {id:'test-extension',tab:{url:'https://example.com'}}, resolve), true);
  });
  assert.equal(response.ok, true);
  assert.equal(calls.length, 1);
});

test('Protected tabs are not injected; normal action uses scripting in the clicked tab', async () => {
  const {context, calls} = environment();
  await vm.runInContext("openToolbox({id:8,url:'chrome://extensions'})", context);
  assert.equal(calls.length, 0);
  await vm.runInContext("openToolbox({id:9,url:'https://example.com'})", context);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].injection.target.tabId, 9);
  assert.equal(calls[0].injection.files[0], 'content-loader.js');
});

test('Concurrent website note mutations merge by ID and explicit deletion preserves the other site', async () => {
  const {context, saved} = environment();
  const note = (id, sourceUrl, origin = 'selection') => ({id, quote: `quote ${id}`, sourceUrl, sourceTitle: 'Actual page', translation: '', note: '', createdAt: '2026-10-02T04:00:00.000Z', origin});
  context.first = {upsert: [note('A', 'https://example.com/a', 'manual')], deleteIds: []};
  context.second = {upsert: [note('B', 'https://developer.mozilla.org/b')], deleteIds: []};
  const results = await vm.runInContext('Promise.all([updateNotes(first),updateNotes(second)])', context);
  assert.equal(results[0].length, 1);
  assert.equal(results[1].length, 2);
  assert.deepEqual(saved['forma-toolbox-notes'].map(value => value.id), ['A', 'B']);
  assert.equal(saved['forma-toolbox-notes'][0].origin, 'manual');
  assert.equal(saved['forma-toolbox-notes'][1].origin, 'selection');
  context.edit = {upsert: [{...note('A', 'https://example.com/a', 'manual'), note: 'edited'}], deleteIds: ['B']};
  await vm.runInContext('updateNotes(edit)', context);
  assert.equal(saved['forma-toolbox-notes'].length, 1);
  assert.equal(saved['forma-toolbox-notes'][0].id, 'A');
  assert.equal(saved['forma-toolbox-notes'][0].note, 'edited');
  assert.equal(saved['forma-toolbox-notes'][0].origin, 'manual');
});

test('Note mutations reject foreign senders and unsafe records without replacing existing notes', async () => {
  const {listeners, saved} = environment();
  const message = {type: 'FORMATOOLBOX_NOTES_UPDATE', upsert: [{id: 'unsafe', quote: 'quote', sourceUrl: 'javascript:alert(1)', sourceTitle: 'page', createdAt: '2026-10-02T04:00:00.000Z'}]};
  let rejected;
  assert.equal(listeners.message(message, {id:'other',tab:{url:'https://example.com'}}, response => {rejected = response;}), false);
  assert.equal(rejected.ok, false);
  const response = await new Promise(resolve => {
    assert.equal(listeners.message(message, {id:'test-extension',tab:{url:'https://example.com'}}, resolve), true);
  });
  assert.equal(response.ok, false);
  assert.equal(saved['forma-toolbox-notes'], undefined);
});
