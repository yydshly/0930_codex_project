import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {aiConfiguration, CompanionError, requestCompanionReply, validateChatRequest} from './companion-ai.mjs';

export const MAX_REQUEST_BYTES = 32 * 1024;
const FRONTEND_ORIGINS = ['http://127.0.0.1:8875', 'http://localhost:8875'];
const CLIENT_HEADER = 'companion-studio';

function configuredPort(env) {
  const raw = String(env.PLUSH_AI_PORT ?? '8876');
  if (!/^\d{1,5}$/.test(raw) || Number(raw) < 1 || Number(raw) > 65535) throw new Error('PLUSH_AI_PORT 必须是 1 至 65535 的端口。');
  return Number(raw);
}
function extraOrigin(env) {
  if (!env.PLUSH_APP_ORIGIN) return null;
  let value;
  try { value = new URL(env.PLUSH_APP_ORIGIN); } catch { throw new Error('PLUSH_APP_ORIGIN 必须是完整网页来源。'); }
  if (!['http:', 'https:'].includes(value.protocol) || value.username || value.password
      || value.origin !== env.PLUSH_APP_ORIGIN) throw new Error('PLUSH_APP_ORIGIN 只填写协议、主机和端口。');
  return value.origin;
}
function localHost(host, port) {
  const match = /^(127\.0\.0\.1|localhost|\[::1\]):(\d{1,5})$/i.exec(host ?? '');
  return Boolean(match && Number(match[2]) === port);
}
function sendJson(response, status, value) {
  if (response.destroyed || response.writableEnded) return;
  response.writeHead(status, {'Content-Type': 'application/json; charset=utf-8'});
  response.end(JSON.stringify(value));
}
function readRequestJson(request) {
  return new Promise((resolve, reject) => {
    const length = request.headers['content-length'];
    if (length && (!/^\d+$/.test(length) || Number(length) > MAX_REQUEST_BYTES)) {
      request.resume();
      reject(new CompanionError(413, 'request_too_large', '对话请求过大，请减少对话或分享记忆。'));
      return;
    }
    let size = 0, done = false;
    const chunks = [];
    request.on('data', chunk => {
      if (done) return;
      size += chunk.length;
      if (size > MAX_REQUEST_BYTES) {
        done = true;
        chunks.length = 0;
        reject(new CompanionError(413, 'request_too_large', '对话请求过大，请减少对话或分享记忆。'));
      } else chunks.push(chunk);
    });
    request.on('end', () => {
      if (done) return;
      done = true;
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new CompanionError(400, 'invalid_json', '请求不是有效的 JSON。')); }
    });
    request.on('error', () => {
      if (done) return;
      done = true;
      reject(new CompanionError(400, 'request_interrupted', '对话请求已中断。'));
    });
    request.on('aborted', () => {
      if (done) return;
      done = true;
      reject(new CompanionError(400, 'request_interrupted', '对话请求已中断。'));
    });
  });
}

export function createCompanionServer({env = process.env} = {}) {
  const port = configuredPort(env);
  const appOrigin = extraOrigin(env);
  const server = http.createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Vary', 'Origin');
    const activePort = server.address()?.port ?? port;
    if (!localHost(request.headers.host, activePort)) {
      request.resume();
      sendJson(response, 421, {error: 'invalid_host', message: '只接受本机来源的请求。'});
      return;
    }
    const allowedOrigins = new Set([...FRONTEND_ORIGINS, appOrigin,
      `http://127.0.0.1:${activePort}`, `http://localhost:${activePort}`, `http://[::1]:${activePort}`].filter(Boolean));
    const origin = request.headers.origin;
    if (origin && !allowedOrigins.has(origin)) {
      request.resume();
      sendJson(response, 403, {error: 'origin_not_allowed', message: '当前网页来源未获准连接 AI 服务。'});
      return;
    }
    if (origin) response.setHeader('Access-Control-Allow-Origin', origin);
    if (request.method === 'OPTIONS') {
      const requestedHeaders = String(request.headers['access-control-request-headers'] ?? '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
      if (!origin || !['GET', 'POST'].includes(request.headers['access-control-request-method'])
          || requestedHeaders.some(header => !['content-type', 'x-plush-client'].includes(header))) {
        sendJson(response, 403, {error: 'preflight_not_allowed', message: '当前网页请求方式未获准。'});
        return;
      }
      response.writeHead(204, {'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type, X-Plush-Client', 'Access-Control-Max-Age': '600'});
      response.end();
      return;
    }
    if (request.url === '/api/status' && request.method === 'GET') {
      sendJson(response, 200, aiConfiguration());
      return;
    }
    if (request.url !== '/api/chat') {
      request.resume();
      sendJson(response, 404, {error: 'not_found', message: '没有这个接口。'});
      return;
    }
    if (request.method !== 'POST') {
      request.resume();
      response.setHeader('Allow', 'POST');
      sendJson(response, 405, {error: 'method_not_allowed', message: '对话需要 POST 请求。'});
      return;
    }
    if (!origin || request.headers['x-plush-client'] !== CLIENT_HEADER) {
      request.resume();
      sendJson(response, 403, {error: 'client_not_allowed', message: '请从毛绒工作室发送对话。'});
      return;
    }
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers['content-type'] ?? '')) {
      request.resume();
      sendJson(response, 415, {error: 'unsupported_content_type', message: '对话请求需要 application/json。'});
      return;
    }
    try {
      const body = validateChatRequest(await readRequestJson(request));
      const reply = await requestCompanionReply(body);
      sendJson(response, 200, reply);
    } catch (error) {
      const safe = error instanceof CompanionError ? error : new CompanionError(500, 'internal_error', 'AI 服务暂时不可用，请重试。');
      sendJson(response, safe.status, {error: safe.code, message: safe.message});
    }
  });
  server.requestTimeout = 45_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 1000;
  server.maxHeadersCount = 32;
  // Consumer tests may listen on an ephemeral port; importing never opens a port.
  server.plushPort = port;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const server = createCompanionServer();
    server.on('error', () => { console.error('AI 接口启动失败，请检查 PLUSH_AI_PORT 是否被占用。'); process.exitCode = 1; });
    server.listen(server.plushPort, '127.0.0.1', () => {
      console.log(`毛绒伙伴本地接口：http://127.0.0.1:${server.plushPort}`);
      console.log(aiConfiguration().message);
    });
    const shutdown = () => { server.close(); server.closeIdleConnections(); };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
