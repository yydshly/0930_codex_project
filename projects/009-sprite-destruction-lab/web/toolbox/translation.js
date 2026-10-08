/**
 * Real translation adapters shared by the webpage and browser extension.
 * MyMemory: GET /get only; no /set, contribution, credentials, or API key.
 * https://mymemory.translated.net/doc/spec.php (500 UTF-8 bytes / segment)
 * https://mymemory.translated.net/doc/usagelimits.php (anonymous 5,000 chars/day)
 */
export const TRANSLATION_LIMITS = Object.freeze({
  maxCharacters: 3000,
  maxSegmentBytes: 500,
  requestTimeoutMs: 18000,
  totalTimeoutMs: 55000,
  anonymousDailyCharacters: 5000,
});

export const TRANSLATION_PROVIDERS = Object.freeze({
  online: 'MyMemory 在线翻译',
  local: 'Chrome 本地翻译',
});

const encoder = new TextEncoder();
const cache = new Map();
const MAX_CACHE_ENTRIES = 80;
let configuredTransport = null;

export class TranslationError extends Error {
  constructor(message, code = 'TRANSLATION_FAILED') {
    super(message);
    this.name = 'TranslationError';
    this.code = code;
  }
}

/** The transport must return the real MyMemory JSON response, or a Response. */
export function configureTranslationTransport(transport = null) {
  if (transport !== null && typeof transport !== 'function') {
    throw new TypeError('翻译 transport 必须是函数或 null。');
  }
  configuredTransport = transport;
}

export function clearTranslationCache() {
  cache.clear();
}

export function utf8ByteLength(text) {
  return encoder.encode(String(text)).length;
}

/** Split on whole Unicode code points, preferring sentence/word boundaries. */
export function splitTranslationSegments(text, maxBytes = 500) {
  if (typeof text !== 'string') throw new TypeError('待翻译内容必须是文本。');
  if (!Number.isInteger(maxBytes) || maxBytes < 4 || maxBytes > 500) {
    throw new RangeError('每段 UTF-8 上限必须为 4 至 500 字节。');
  }
  const points = Array.from(text);
  const segments = [];
  let start = 0;
  while (start < points.length) {
    let end = start;
    let bytes = 0;
    let boundary = -1;
    while (end < points.length) {
      const nextBytes = utf8ByteLength(points[end]);
      if (bytes + nextBytes > maxBytes) break;
      bytes += nextBytes;
      end += 1;
      if (/[\s.!?。！？;；]/u.test(points[end - 1])) boundary = end;
    }
    // Avoid wasting almost a whole request on one early space.
    if (end < points.length && boundary > start + (end - start) / 2) end = boundary;
    segments.push(points.slice(start, end).join(''));
    start = end;
  }
  return segments;
}

/** MyMemory errors often use HTTP 200: validate the service status and quota. */
export function validateMyMemoryResponse(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new TranslationError('翻译服务未返回有效 JSON。', 'INVALID_RESPONSE');
  }
  if (payload.quotaFinished === true || Number(payload.responseStatus) === 429) {
    throw new TranslationError('MyMemory 今日额度已用完（匿名约 5,000 字符/日），请稍后重试或切换本地翻译。', 'QUOTA_EXCEEDED');
  }
  if (Number(payload.responseStatus) !== 200) {
    const detail = String(payload.responseDetails || '服务暂时不可用').slice(0, 220);
    throw new TranslationError(`MyMemory 翻译失败：${detail}`, 'SERVICE_REJECTED');
  }
  const result = payload.responseData?.translatedText;
  if (typeof result !== 'string' || !result.trim()) {
    throw new TranslationError('翻译服务没有返回译文。', 'EMPTY_TRANSLATION');
  }
  if (/MYMEMORY WARNING|QUERY LENGTH LIMIT EXCEEDED|INVALID LANGUAGE PAIR|PLEASE SELECT TWO DISTINCT LANGUAGES/i.test(result)) {
    throw new TranslationError('MyMemory 返回了额度或语言限制提示，请检查语言或稍后重试。', 'SERVICE_REJECTED');
  }
  return result;
}

function validateLanguage(value) {
  if (typeof value !== 'string' || !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,2}$/.test(value)) {
    throw new TranslationError('请选择有效的源语言和目标语言。', 'INVALID_LANGUAGE');
  }
  return value;
}

function localLanguage(value) {
  if (/^zh-(?:CN|Hans)$/i.test(value)) return 'zh';
  if (/^zh-(?:TW|HK|Hant)$/i.test(value)) return 'zh-Hant';
  return value;
}

function aborted(signal) {
  if (signal?.aborted) throw new TranslationError('翻译已取消。', 'ABORTED');
}

/** Abort-aware even if an extension transport ignores the passed signal. */
async function withTimeout(operation, milliseconds, externalSignal) {
  aborted(externalSignal);
  const controller = new AbortController();
  let timeoutId;
  let rejectCancellation;
  const cancelled = new Promise((resolve, reject) => { rejectCancellation = reject; });
  const onAbort = () => {
    controller.abort();
    rejectCancellation(new TranslationError('翻译已取消。', 'ABORTED'));
  };
  externalSignal?.addEventListener('abort', onAbort, { once: true });
  timeoutId = setTimeout(() => {
    controller.abort();
    rejectCancellation(new TranslationError('翻译请求超时，请检查网络或稍后重试。', 'TIMEOUT'));
  }, milliseconds);
  try {
    return await Promise.race([operation(controller.signal), cancelled]);
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', onAbort);
  }
}

async function browserOnlineTransport(text, source, target, signal) {
  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', `${source}|${target}`);
  // Machine translation is enabled by default by the documented /get API.
  const response = await fetch(url, {
    method: 'GET', mode: 'cors', credentials: 'omit', signal,
  });
  if (response.status === 429) {
    throw new TranslationError('MyMemory 请求过于频繁或额度受限，请稍后重试，或选择本地翻译。', 'RATE_LIMITED');
  }
  if (!response.ok) {
    throw new TranslationError(`翻译服务 HTTP ${response.status}，请稍后重试。`, 'HTTP_ERROR');
  }
  return response.json();
}

async function fetchOnline(text, source, target, signal, transport) {
  const result = await withTimeout(
    (requestSignal) => transport(text, source, target, requestSignal),
    TRANSLATION_LIMITS.requestTimeoutMs,
    signal,
  );
  if (result && typeof result.json === 'function') {
    if (result.status === 429) {
      throw new TranslationError('MyMemory 请求过于频繁或额度受限，请稍后重试，或选择本地翻译。', 'RATE_LIMITED');
    }
    if (result.ok === false) {
      throw new TranslationError(`翻译服务 HTTP ${result.status}，请稍后重试。`, 'HTTP_ERROR');
    }
    return validateMyMemoryResponse(await result.json());
  }
  return validateMyMemoryResponse(result);
}

export async function getLocalTranslationAvailability(source = 'en', target = 'zh-CN') {
  validateLanguage(source);
  validateLanguage(target);
  if (!globalThis.isSecureContext) return 'insecure-context';
  const TranslatorAPI = globalThis.Translator;
  if (!TranslatorAPI?.availability || !TranslatorAPI?.create) return 'unsupported';
  let timer;
  try {
    return await Promise.race([
      TranslatorAPI.availability({
        sourceLanguage: localLanguage(source), targetLanguage: localLanguage(target),
      }),
      // Some Chromium builds expose the API while the model backend never answers.
      new Promise((resolve) => { timer = setTimeout(() => resolve('unavailable'), 4000); }),
    ]);
  } catch {
    return 'unavailable';
  } finally {
    clearTimeout(timer);
  }
}

function putCache(key, value) {
  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(key, value);
}

/**
 * text: caller-selected plain text; online mode sends only this text to MyMemory.
 * onProgress receives {phase,completed,total,ratio}. No fabricated fallback.
 * transport can bridge an extension service worker; returns actual MyMemory JSON.
 */
export async function translateText(text, {
  source = 'en', target = 'zh-CN', provider = 'online', signal, onProgress, transport,
} = {}) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new TranslationError('请先选中或输入要翻译的文字。', 'EMPTY_INPUT');
  }
  if (text.length > TRANSLATION_LIMITS.maxCharacters) {
    throw new TranslationError('一次最多翻译 3,000 字符，请分段选择。', 'INPUT_TOO_LONG');
  }
  validateLanguage(source);
  validateLanguage(target);
  if (source.toLowerCase() === target.toLowerCase()) {
    throw new TranslationError('源语言和目标语言相同，请重新选择。', 'SAME_LANGUAGE');
  }
  if (!Object.hasOwn(TRANSLATION_PROVIDERS, provider)) {
    throw new TranslationError('请选择在线翻译或 Chrome 本地翻译。', 'INVALID_PROVIDER');
  }
  const selectedTransport = transport ?? configuredTransport ?? globalThis.FORMA_TRANSLATION_TRANSPORT ?? browserOnlineTransport;
  if (provider === 'online' && typeof selectedTransport !== 'function') {
    throw new TranslationError('在线翻译 transport 配置无效。', 'INVALID_TRANSPORT');
  }
  const started = performance.now();
  const progress = (data) => { if (typeof onProgress === 'function') onProgress(data); };
  let translator = null;
  let result;
  try {
    result = await withTimeout(async (operationSignal) => {
      if (provider === 'local') {
        const availability = await getLocalTranslationAvailability(source, target);
        if (availability === 'unsupported' || availability === 'insecure-context') {
          throw new TranslationError('当前浏览器不支持本地翻译；请在支持 Translator API 的桌面 Chrome 安全页面使用，或选择在线翻译。', 'LOCAL_UNSUPPORTED');
        }
        if (availability === 'unavailable') {
          throw new TranslationError('Chrome 当前无法提供该语言对的本地模型，请选择在线翻译。', 'LOCAL_UNAVAILABLE');
        }
        progress({ phase: 'model', completed: 0, total: 1, ratio: 0, availability });
        try {
          translator = await globalThis.Translator.create({
            sourceLanguage: localLanguage(source), targetLanguage: localLanguage(target),
            signal: operationSignal,
            monitor(monitor) {
              monitor.addEventListener('downloadprogress', (event) => {
                progress({ phase: 'model', completed: event.loaded, total: 1, ratio: event.loaded });
              });
            },
          });
          if (operationSignal.aborted) {
            translator.destroy?.();
            aborted(operationSignal);
          }
        } catch (error) {
          if (error instanceof TranslationError) throw error;
          aborted(operationSignal);
          throw new TranslationError('Chrome 本地模型创建失败。可能需要在用户点击后下载语言模型，或改用在线翻译。', 'LOCAL_MODEL_FAILED');
        }
      }
      const inputs = splitTranslationSegments(text);
      const segments = [];
      for (const [index, input] of inputs.entries()) {
        aborted(operationSignal);
        const trimmed = input.trim();
        const prefix = input.match(/^\s*/u)[0];
        const suffix = input.match(/\s*$/u)[0];
        const key = JSON.stringify([provider, source, target, trimmed]);
        let translated = trimmed ? cache.get(key) : '';
        const cacheHit = Boolean(translated);
        if (trimmed && !cacheHit) {
          if (provider === 'local') {
            translated = await translator.translate(trimmed, { signal: operationSignal });
            if (typeof translated !== 'string' || !translated.trim()) {
              throw new TranslationError('Chrome 本地模型没有返回译文。', 'EMPTY_TRANSLATION');
            }
          } else {
            translated = await fetchOnline(trimmed, source, target, operationSignal, selectedTransport);
          }
          putCache(key, translated);
        }
        const output = trimmed ? `${prefix}${translated}${suffix}` : input;
        segments.push({ source: input, text: output, cacheHit });
        progress({ phase: 'translate', completed: index + 1, total: inputs.length, ratio: (index + 1) / inputs.length });
      }
      return {
        text: segments.map((segment) => segment.text).join(''),
        provider: TRANSLATION_PROVIDERS[provider],
        segments,
        cacheHit: segments.every((segment) => segment.cacheHit || !segment.source.trim()),
      };
    }, TRANSLATION_LIMITS.totalTimeoutMs, signal);
  } catch (error) {
    if (error instanceof TranslationError) throw error;
    if (signal?.aborted || error?.name === 'AbortError') {
      throw new TranslationError('翻译已取消。', 'ABORTED');
    }
    throw new TranslationError('无法连接翻译服务，请检查网络。未生成译文。', 'NETWORK_ERROR');
  } finally {
    translator?.destroy?.();
  }
  return { ...result, elapsedMs: Math.round(performance.now() - started) };
}
