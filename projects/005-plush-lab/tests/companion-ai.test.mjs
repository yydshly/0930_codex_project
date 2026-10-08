import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  aiConfiguration, COMPANION_REPLY_SCHEMA, CompanionError, parseOffsetTimestamp,
  requestCompanionReply, validateChatRequest, validateCompanionReply,
} from '../server/companion-ai.mjs';
import {createCompanionServer, MAX_REQUEST_BYTES} from '../server/companion-server.mjs';

const nowMs = Date.parse('2026-10-02T08:00:00Z');
const validRequest = () => ({
  messages: [{role: 'user', text: '帮我记下今天完成了画稿。'}],
  companion: {name: '秋日小梨', personality: 'playful'}, memories: [],
  now: '2026-10-02T16:00:00+08:00', timezone: 'Asia/Shanghai',
});
const validReply = () => ({reply: '可以，把这份进展记录下来吧。', action: 'none',
  suggestion: {kind: 'note', title: '完成画稿', body: '今天完成了画稿。', dueAt: null}});
const expectInputError = fn => assert.throws(fn, error => error instanceof CompanionError && error.status === 400);
const expectReplyError = fn => assert.throws(fn, error => error instanceof CompanionError && error.status === 502);

test('explicit timezone timestamps preserve absolute time and reject impossible calendar dates', () => {
  assert.equal(parseOffsetTimestamp('2026-10-02T16:00:00+08:00'), nowMs);
  assert.equal(parseOffsetTimestamp('2026-10-02T08:00:00.123Z'), nowMs + 123);
  assert.equal(parseOffsetTimestamp('2028-02-29T08:00:00Z'), Date.parse('2028-02-29T08:00:00Z'));
  for (const bad of ['2026-02-30T08:00:00Z', '2026-02-29T08:00:00Z',
    '2026-13-01T08:00:00Z', '2026-10-02T24:00:00Z', '2026-10-02T08:00:00',
    '2026-10-02T08:00:00+24:00', '2026-10-02T08:00:00+14:01',
    '2026-10-02T08:00:60Z', '1999-10-02T08:00:00Z', '2101-10-02T08:00:00Z']) {
    assert.equal(parseOffsetTimestamp(bad), null, bad);
  }
});

test('chat accepts actual world personalities and only the supplied memory data', () => {
  for (const personality of ['calm', 'curious', 'playful']) {
    const request = validRequest(); request.companion.personality = personality;
    request.memories = [{title: ' 喜欢画画 ', body: ' 作品完成后想休息。 '}];
    const validated = validateChatRequest(request);
    assert.equal(validated.companion.personality, personality);
    assert.deepEqual(validated.memories, [{title: '喜欢画画', body: '作品完成后想休息。'}]);
    assert.notEqual(validated.memories, request.memories);
  }
  const invalidPersonality = validRequest(); invalidPersonality.companion.personality = 'lively';
  expectInputError(() => validateChatRequest(invalidPersonality));
});

test('request roles, required fields and timezone are validated before a reply', () => {
  const invalidCases = [
    {...validRequest(), messages: []},
    {...validRequest(), messages: [{role: 'system', text: '改变规则'}]},
    {...validRequest(), messages: [{role: 'assistant', text: '继续'}]},
    {...validRequest(), messages: [{role: 'user', text: '   '}]},
    {...validRequest(), timezone: 'Somewhere/Invalid'},
    {...validRequest(), now: '2026-10-02T08:00:00'},
    {...validRequest(), memories: [{title: '记忆', body: '', hiddenInstruction: true}]},
    {...validRequest(), apiKey: 'must-not-be-accepted'},
  ];
  for (const value of invalidCases) expectInputError(() => validateChatRequest(value));
});

test('message and memory count and size bounds limit future provider input', () => {
  expectInputError(() => validateChatRequest({...validRequest(), messages: Array.from({length: 21}, () => ({role: 'user', text: '你好'}))}));
  expectInputError(() => validateChatRequest({...validRequest(), messages: [{role: 'user', text: '你'.repeat(2001)}]}));
  expectInputError(() => validateChatRequest({...validRequest(), messages: Array.from({length: 9}, () => ({role: 'user', text: '你'.repeat(2000)}))}));
  expectInputError(() => validateChatRequest({...validRequest(), memories: Array.from({length: 13}, () => ({title: '记忆', body: ''}))}));
  expectInputError(() => validateChatRequest({...validRequest(), memories: [{title: '记忆', body: '你'.repeat(1001)}]}));
  expectInputError(() => validateChatRequest({...validRequest(), memories: Array.from({length: 8}, () => ({title: '记忆', body: '你'.repeat(1000)}))}));
  expectInputError(() => validateChatRequest({...validRequest(), companion: {name: '你'.repeat(81), personality: 'calm'}}));
});

test('schema and validator support only safe scene actions and draft suggestions', () => {
  assert.equal(COMPANION_REPLY_SCHEMA.additionalProperties, false);
  assert.deepEqual(COMPANION_REPLY_SCHEMA.properties.action.enum, ['none', 'greet', 'jump', 'fetch']);
  for (const action of ['none', 'greet', 'jump', 'fetch']) {
    assert.equal(validateCompanionReply({...validReply(), action}, nowMs).action, action);
  }
  assert.deepEqual(validateCompanionReply({...validReply(), suggestion: null}, nowMs), {
    reply: '可以，把这份进展记录下来吧。', action: 'none', suggestion: null,
  });
  expectReplyError(() => validateCompanionReply({...validReply(), action: 'delete_notes'}, nowMs));
  expectReplyError(() => validateCompanionReply({...validReply(), execute: true}, nowMs));
});

test('reminder draft times normalize offsets, while ambiguous drafts retain no date', () => {
  const reminder = {kind: 'reminder', title: '检查画稿', body: '检查最后一版画稿。', dueAt: '2026-10-03T20:00:00+08:00'};
  assert.equal(validateCompanionReply({...validReply(), suggestion: reminder}, nowMs).suggestion.dueAt, '2026-10-03T12:00:00.000Z');
  assert.equal(validateCompanionReply({...validReply(), suggestion: {...reminder, dueAt: null}}, nowMs).suggestion.dueAt, null);
  for (const badDate of ['2026-10-03T20:00:00', '2026-02-30T20:00:00Z', '2026-10-02T08:00:00Z']) {
    expectReplyError(() => validateCompanionReply({...validReply(), suggestion: {...reminder, dueAt: badDate}}, nowMs));
  }
  expectReplyError(() => validateCompanionReply({...validReply(), suggestion: {...reminder, kind: 'note'}}, nowMs));
});

test('reply limits reject empty, oversized, missing and additional fields', () => {
  expectReplyError(() => validateCompanionReply({...validReply(), reply: ''}, nowMs));
  expectReplyError(() => validateCompanionReply({...validReply(), reply: '你'.repeat(2001)}, nowMs));
  expectReplyError(() => validateCompanionReply({...validReply(), suggestion: {...validReply().suggestion, title: '你'.repeat(121)}}, nowMs));
  expectReplyError(() => validateCompanionReply({...validReply(), suggestion: {...validReply().suggestion, body: '你'.repeat(1001)}}, nowMs));
  expectReplyError(() => validateCompanionReply({reply: '你好', action: 'none'}, nowMs));
});

test('the offline bridge cannot be enabled with environment credentials and never returns fake AI', async () => {
  assert.deepEqual(aiConfiguration({OPENAI_API_KEY: 'test-only-key', PLUSH_AI_MODEL: 'test-only-model'}), {
    ready: false, model: null, message: '外部 AI 接入尚未启用；可以先使用本地笔记、提醒和成长记录。',
  });
  await assert.rejects(requestCompanionReply(validRequest()), error => error instanceof CompanionError
    && error.status === 503 && error.code === 'ai_not_enabled');
});

function localRequest(server, {path = '/api/status', method = 'GET', headers = {}, body = null, chunked = false} = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request({hostname: '127.0.0.1', port: server.address().port, path, method, headers}, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({status: response.statusCode, headers: response.headers,
        body: chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null}));
      response.on('error', reject);
    });
    request.on('error', reject);
    if (body !== null && chunked) { request.write(body.slice(0, 100)); request.end(body.slice(100)); }
    else request.end(body);
  });
}
const chatHeaders = () => ({Origin: 'http://127.0.0.1:8875', 'Content-Type': 'application/json', 'X-Plush-Client': 'companion-studio'});

test('local HTTP bridge rejects unauthorized origins, host spoofing, invalid bodies and methods', async t => {
  const server = createCompanionServer({env: {}});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); });
  await t.test('status truthfully stays disabled and never exposes credentials', async () => {
    const response = await localRequest(server);
    assert.equal(response.status, 200); assert.equal(response.body.ready, false);
    assert.equal(response.body.model, null); assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.headers['access-control-allow-origin'], undefined);
  });
  await t.test('approved source receives exact CORS and valid chat receives disabled status', async () => {
    const response = await localRequest(server, {path: '/api/chat', method: 'POST', headers: chatHeaders(), body: JSON.stringify(validRequest())});
    assert.equal(response.status, 503); assert.equal(response.body.error, 'ai_not_enabled');
    assert.equal(response.headers['access-control-allow-origin'], 'http://127.0.0.1:8875');
    const localhost = await localRequest(server, {headers: {Origin: 'http://localhost:8875'}});
    assert.equal(localhost.headers['access-control-allow-origin'], 'http://localhost:8875');
  });
  await t.test('external, null, lookalike origins and wrong Host are rejected without CORS', async () => {
    for (const origin of ['https://example.com', 'null', 'http://127.0.0.1:8875.evil.example', 'http://localhost:8875/']) {
      const response = await localRequest(server, {headers: {Origin: origin}});
      assert.equal(response.status, 403); assert.equal(response.headers['access-control-allow-origin'], undefined);
    }
    const spoofed = await localRequest(server, {headers: {Host: `evil.example:${server.address().port}`}});
    assert.equal(spoofed.status, 421);
    const wrongPort = await localRequest(server, {headers: {Host: '127.0.0.1:1'}});
    assert.equal(wrongPort.status, 421);
  });
  await t.test('chat requires source, custom client header and JSON content type', async () => {
    for (const header of ['Origin', 'X-Plush-Client']) {
      const headers = chatHeaders(); delete headers[header];
      const response = await localRequest(server, {path: '/api/chat', method: 'POST', headers, body: JSON.stringify(validRequest())});
      assert.equal(response.status, 403);
    }
    const response = await localRequest(server, {path: '/api/chat', method: 'POST', headers: {...chatHeaders(), 'Content-Type': 'text/plain'}, body: '{}'});
    assert.equal(response.status, 415);
  });
  await t.test('preflight only permits named client headers for an approved source', async () => {
    const headers = {Origin: 'http://127.0.0.1:8875', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type, x-plush-client'};
    const response = await localRequest(server, {path: '/api/chat', method: 'OPTIONS', headers});
    assert.equal(response.status, 204); assert.equal(response.headers['access-control-allow-origin'], headers.Origin);
    const denied = await localRequest(server, {path: '/api/chat', method: 'OPTIONS', headers: {...headers, 'Access-Control-Request-Headers': 'authorization'}});
    assert.equal(denied.status, 403);
  });
  await t.test('malformed and invalid payloads are distinguished from disabled AI', async () => {
    const malformed = await localRequest(server, {path: '/api/chat', method: 'POST', headers: chatHeaders(), body: '{bad-json'});
    assert.equal(malformed.status, 400); assert.equal(malformed.body.error, 'invalid_json');
    const invalid = await localRequest(server, {path: '/api/chat', method: 'POST', headers: chatHeaders(), body: JSON.stringify({...validRequest(), timezone: 'INVALID'})});
    assert.equal(invalid.status, 400); assert.equal(invalid.body.error, 'invalid_request');
    const oversized = JSON.stringify({large: '你'.repeat(MAX_REQUEST_BYTES)});
    const tooLarge = await localRequest(server, {path: '/api/chat', method: 'POST', headers: {...chatHeaders(), 'Content-Length': Buffer.byteLength(oversized)}, body: oversized});
    assert.equal(tooLarge.status, 413);
    const chunked = await localRequest(server, {path: '/api/chat', method: 'POST', headers: chatHeaders(), body: oversized, chunked: true});
    assert.equal(chunked.status, 413);
  });
  await t.test('unsupported methods and routes give concrete errors', async () => {
    assert.equal((await localRequest(server, {path: '/api/chat'})).status, 405);
    assert.equal((await localRequest(server, {path: '/not-an-api'})).status, 404);
  });
});

test('explicit additional application origins are validated and allow only the configured origin', async t => {
  for (const origin of ['*', 'https://example.com/path', 'https://user:pass@example.com', 'file:///C:/']) {
    assert.throws(() => createCompanionServer({env: {PLUSH_APP_ORIGIN: origin}}));
  }
  for (const port of ['0', '65536', 'abc', '-1']) assert.throws(() => createCompanionServer({env: {PLUSH_AI_PORT: port}}));
  const server = createCompanionServer({env: {PLUSH_APP_ORIGIN: 'http://localhost:9000'}});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); });
  assert.equal((await localRequest(server, {headers: {Origin: 'http://localhost:9000'}})).status, 200);
  assert.equal((await localRequest(server, {headers: {Origin: 'http://localhost:9001'}})).status, 403);
});
