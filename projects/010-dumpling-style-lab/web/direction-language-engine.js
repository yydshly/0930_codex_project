// 灯市译语 / LANTERN LEXICON — six original signs, twelve observed contexts.
// Public metadata describes what can be seen. Answers stay inside the rule engine.
export const VERSION = 1;
export const MAX_ACTIONS = 2048;
export const MAX_SAVE_BYTES = 200000;

const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
export const GLYPHS = freeze([
  { id: 'person', mark: '⌁' }, { id: 'give', mark: '⋈' }, { id: 'lamp', mark: '◈' },
  { id: 'water', mark: '≋' }, { id: 'door', mark: '⊓' }, { id: 'open', mark: '↗' }
]);
export const MEANINGS = freeze([
  { id: 'person', label: '人' }, { id: 'give', label: '给' }, { id: 'lamp', label: '灯' },
  { id: 'water', label: '水' }, { id: 'door', label: '门' }, { id: 'open', label: '开' },
  { id: 'stone', label: '石' }, { id: 'sleep', label: '睡' }
]);
export const SCENES = freeze([
  { id: 'market', label: '灯市', description: '沿着暖色摊棚，观察招呼、交换与杯中的微光。', evidenceIds: ['m-welcome', 'm-lamp', 'm-gift', 'm-water'] },
  { id: 'harbor', label: '水门埠', description: '跟着流动的河道，寻找石闸旁反复出现的刻记。', evidenceIds: ['h-water', 'h-door', 'h-sign', 'h-open', 'h-lock'] },
  { id: 'lighthouse', label: '潮灯塔', description: '塔上的守灯人等待回应，叶窗里露出一线光。', evidenceIds: ['l-request', 'l-cup', 'l-return'] }
]);
export const EVIDENCES = freeze([
  { id: 'm-welcome', scene: 'market', title: '迎客的布幅', words: ['person'], text: '摊棚入口，一位摊主向走近的旅客挥手。布幅上只有一个反复描粗的刻记。' },
  { id: 'm-lamp', scene: 'market', title: '棚下的亮光', words: ['lamp'], text: '一盏纸罩的灯悬在棚梁下，里面的火光轻轻摇动。罩沿贴着一张单刻记的小签。' },
  { id: 'm-gift', scene: 'market', title: '递向旅客', words: ['person', 'give', 'lamp'], text: '摊主把点亮的纸灯递到旅客伸出的手中。桌边的三枚刻记与这个动作一同出现。' },
  { id: 'm-water', scene: 'market', title: '歇脚的一杯', words: ['person', 'give', 'water'], text: '搬货的工人擦了擦额头，摊主把盛着清水的杯子递给他。桌牌上又排着三枚刻记。' },
  { id: 'h-water', scene: 'harbor', title: '流过桥脚', words: ['water'], text: '河水沿着窄渠流过桥脚，波纹碰到石岸又散开。岸边木桩挂着一枚刻记。' },
  { id: 'h-door', scene: 'harbor', title: '合拢的石闸', words: ['door'], text: '一道厚重的石制水闸挡在渠口，闸扇严丝合缝。石框正中留着一枚刻记。' },
  { id: 'h-sign', scene: 'harbor', title: '闸边的路牌', words: ['water', 'door'], text: '水闸旁的路牌有两枚刻记。牌下画着河道，线条一直延伸到合拢的闸扇前。' },
  { id: 'h-open', scene: 'harbor', title: '小闸的演示', words: ['open', 'door'], text: '船工转动演示用的小闸轮，闸扇从合拢变成敞开。他指了指模型上并排的两枚刻记。' },
  { id: 'h-lock', scene: 'harbor', title: '转动的钥匙', words: ['open'], text: '船工用钥匙转开小盒的锁扣，盒盖随即掀起。锁孔边也刻着一枚曾在模型上出现过的记号。' },
  { id: 'l-request', scene: 'lighthouse', title: '守灯人的示意', words: ['person', 'give', 'water'], text: '守灯人指了指空杯，又摸了摸干燥的喉咙。他把写着三枚刻记的纸条推到你面前，等待你回应。' },
  { id: 'l-cup', scene: 'lighthouse', title: '注入杯中', words: ['water'], text: '壶中的清水落进杯子，杯壁上的亮点缓缓上升。壶柄绑着一枚熟悉的刻记。' },
  { id: 'l-return', scene: 'lighthouse', title: '叶窗后的灯', words: ['lamp', 'open'], text: '守灯人推开灯具的遮光叶窗，暖光照向海面。控制柄上贴着两枚刻记，旁边没有其他文字。' }
]);
export const QUESTS = freeze([
  { scene: 'market', title: '摊主的托付', text: '摊主向旅客伸出双手，又指向货架。按这句话取一件东西，回应他的托付。', words: ['person', 'give', 'lamp'], options: [{ id: 'lantern', label: '递上纸灯' }, { id: 'water', label: '递上水杯' }, { id: 'stone', label: '递上石块' }], requiredEvidence: ['m-gift'] },
  { scene: 'harbor', title: '船工的请求', text: '船工指向渠口的机械，出示这句话。选一项操作，帮助他继续工作。', words: ['open', 'water', 'door'], options: [{ id: 'wheel', label: '转动闸轮' }, { id: 'rope', label: '拉紧系船绳' }, { id: 'lantern', label: '举起纸灯' }], requiredEvidence: ['h-sign', 'h-open'] },
  { scene: 'lighthouse', title: '守灯人的回话', text: '守灯人把三枚刻记排在桌上，等待你带来合适的东西。读懂全部六枚刻记后，再给出回应。', words: ['person', 'give', 'water'], options: [{ id: 'water', label: '递上水杯' }, { id: 'lantern', label: '递上纸灯' }, { id: 'stone', label: '递上石块' }], requiredEvidence: ['l-request'] }
]);

const meaningById = new Map(MEANINGS.map(item => [item.id, item]));
const glyphById = new Map(GLYPHS.map(item => [item.id, item]));
const sceneById = new Map(SCENES.map(item => [item.id, item]));
const evidenceById = new Map(EVIDENCES.map(item => [item.id, item]));
const questByScene = new Map(QUESTS.map(item => [item.scene, item]));
const wordAnswers = freeze({ person: 'person', give: 'give', lamp: 'lamp', water: 'water', door: 'door', open: 'open' });
const responseAnswers = freeze({ market: 'lantern', harbor: 'wheel', lighthouse: 'water' });
const nextScene = freeze({ market: 'harbor', harbor: 'lighthouse' });
const integrity = new WeakMap();
const clone = value => structuredClone(value);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
// Read data descriptors directly: a caller-supplied toJSON/getter cannot conceal
// mutated discoveries or counters from the integrity comparison.
function canonical(value, parents = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (!plain(value) && !(Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype)) throw new TypeError('Invalid state data');
  if (parents.has(value)) throw new TypeError('Circular state');
  parents.add(value);
  let result;
  if (Array.isArray(value)) {
    if (Reflect.ownKeys(value).length !== value.length + 1) throw new TypeError('Extra array fields');
    const items = Array.from({ length: value.length }, (_, index) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) throw new TypeError('Invalid array item');
      return canonical(descriptor.value, parents);
    });
    result = `[${items.join(',')}]`;
  } else {
    const keys = Reflect.ownKeys(value);
    if (keys.some(key => typeof key !== 'string')) throw new TypeError('Symbol state field');
    result = `{${keys.sort().map(key => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) throw new TypeError('Invalid state field');
      return `${JSON.stringify(key)}:${canonical(descriptor.value, parents)}`;
    }).join(',')}}`;
  }
  parents.delete(value);
  return result;
}
const sealState = w => integrity.set(w, canonical(w));
function validWorld(w) {
  try { return plain(w) && integrity.has(w) && canonical(w) === integrity.get(w); } catch { return false; }
}
function exact(value, keys) {
  return plain(value) && Reflect.ownKeys(value).length === keys.length && keys.every(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && Object.hasOwn(descriptor, 'value') && descriptor.enumerable;
  });
}
function validAction(action) {
  const descriptor = plain(action) && Object.getOwnPropertyDescriptor(action, 'type');
  if (!descriptor || !Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'string') return false;
  switch (action.type) {
    case 'pause': return exact(action, ['type', 'paused']) && typeof action.paused === 'boolean';
    case 'visit': return exact(action, ['type', 'scene']) && sceneById.has(action.scene);
    case 'observe': return exact(action, ['type', 'id']) && evidenceById.has(action.id);
    case 'guess': return exact(action, ['type', 'glyph', 'meaning']) && glyphById.has(action.glyph) && meaningById.has(action.meaning);
    case 'validate': return exact(action, ['type', 'glyph']) && glyphById.has(action.glyph);
    case 'respond': return exact(action, ['type', 'answer']) && typeof action.answer === 'string';
    case 'finish': return exact(action, ['type']);
    default: return false;
  }
}
const evidenceFor = (w, glyph) => w.observed.filter(id => evidenceById.get(id).words.includes(glyph));
const allConfirmed = w => GLYPHS.every(glyph => w.dictionary[glyph.id].confirmed);
function canRespond(w, quest = questByScene.get(w.scene)) {
  const needed = quest.scene === 'lighthouse' ? GLYPHS.map(glyph => glyph.id) : quest.words;
  return !w.solved.includes(quest.scene) && needed.every(id => w.dictionary[id].confirmed) && quest.requiredEvidence.every(id => w.observed.includes(id));
}
const canFinish = w => allConfirmed(w) && QUESTS.every(quest => w.solved.includes(quest.scene));
function record(w, action, result, text) {
  w.ledger.push(clone(action));
  w.actions = w.ledger.length;
  w.message = text;
  w.lastResult = { type: action.type, ...result, reason: text };
  w.log.push({ action: w.actions, text });
  if (w.log.length > 24) w.log.shift();
  sealState(w);
  return true;
}

export function fresh() {
  const w = {
    version: VERSION, phase: 'exploring', paused: true, scene: 'market', unlockedScenes: ['market'],
    observed: [], dictionary: Object.fromEntries(GLYPHS.map(glyph => [glyph.id, { guess: null, confirmed: false }])),
    solved: [], currentEvidence: null, score: 0, actions: 0,
    stats: { observations: 0, confirmations: 0, validations: 0, wrongVerifications: 0, responses: 0, wrongResponses: 0 },
    ledger: [], log: [], message: '灯市初亮。观察刻记出现的情境，为每枚刻记提出解释，再用至少两处不同的观察交叉验证。', lastResult: null
  };
  sealState(w);
  return w;
}

export function act(w, action) {
  if (!validWorld(w) || w.phase !== 'exploring' || w.actions >= MAX_ACTIONS) return false;
  try {
    if (!validAction(action)) return false;
    action = clone(action);
  } catch { return false; }
  if (action.type === 'pause') {
    w.paused = action.paused;
    return record(w, action, { success: true }, action.paused ? '已暂停。刻记和观察仍保存在译语手记中。' : '继续译语。观察情境，提出解释，再交叉验证。');
  }
  if (w.paused) return false;
  if (action.type === 'visit') {
    if (!w.unlockedScenes.includes(action.scene)) return false;
    const unchanged = w.scene === action.scene;
    w.scene = action.scene;
    w.currentEvidence = null;
    return record(w, action, { success: true, scene: action.scene, unchanged }, `来到${sceneById.get(action.scene).label}。${sceneById.get(action.scene).description}`);
  }
  if (action.type === 'observe') {
    const evidence = evidenceById.get(action.id), seen = w.observed.includes(action.id);
    if (!seen && evidence.scene !== w.scene) return false;
    if (!seen) { w.observed.push(action.id); w.stats.observations++; w.score += 10; }
    w.currentEvidence = action.id;
    return record(w, action, { success: true, evidence: action.id, unchanged: seen }, `${seen ? '重阅' : '记录'}：${evidence.title}。${evidence.text}`);
  }
  if (action.type === 'guess') {
    const entry = w.dictionary[action.glyph];
    if (entry.confirmed && entry.guess !== action.meaning) return false;
    const unchanged = entry.guess === action.meaning;
    entry.guess = action.meaning;
    return record(w, action, { success: true, glyph: action.glyph, unchanged }, `已把${glyphById.get(action.glyph).mark}的暂定解释写为“${meaningById.get(action.meaning).label}”。${entry.confirmed ? '这枚刻记已经交叉验证。' : '暂定解释还需要观察支持。'}`);
  }
  if (action.type === 'validate') {
    const entry = w.dictionary[action.glyph];
    if (entry.guess === null) return false;
    if (entry.confirmed) return record(w, action, { success: true, glyph: action.glyph, unchanged: true }, '这枚刻记已经由不同情境交叉验证；没有重复加分。');
    w.stats.validations++;
    if (evidenceFor(w, action.glyph).length < 2) {
      return record(w, action, { success: false, glyph: action.glyph, insufficientEvidence: true }, '观察还不够。先找到至少两处含有这枚刻记的不同情境，再检验暂定解释。');
    }
    if (entry.guess !== wordAnswers[action.glyph]) {
      w.stats.wrongVerifications++;
      return record(w, action, { success: false, glyph: action.glyph }, '这个解释无法同时说明已记录的情境。重阅观察，修改暂定解释后可以再试。');
    }
    entry.confirmed = true;
    w.stats.confirmations++;
    w.score += 20;
    return record(w, action, { success: true, glyph: action.glyph }, `交叉验证成立：${glyphById.get(action.glyph).mark}可读作“${meaningById.get(entry.guess).label}”。`);
  }
  if (action.type === 'respond') {
    const quest = questByScene.get(w.scene);
    if (!quest.options.some(option => option.id === action.answer) || !canRespond(w, quest)) return false;
    w.stats.responses++;
    if (action.answer !== responseAnswers[w.scene]) {
      w.stats.wrongResponses++;
      return record(w, action, { success: false, answer: action.answer, scene: w.scene }, '对方摇了摇头，仍指着原来的刻记等待。这个回应没有满足请求；可以重新阅读，再选一次。');
    }
    w.solved.push(w.scene);
    w.score += 30;
    const unlocked = nextScene[w.scene];
    if (unlocked) w.unlockedScenes.push(unlocked);
    return record(w, action, { success: true, answer: action.answer, scene: w.scene }, unlocked ? `对方接纳了你的回应，并指出通往${sceneById.get(unlocked).label}的路。你可以自行前往。` : '守灯人接过水杯，向你点头。三处请求都已读懂；你可以按“完成译语”收好手记。');
  }
  if (!canFinish(w)) return false;
  w.phase = 'complete';
  w.paused = true;
  return record(w, action, { success: true }, '译语完成。六枚刻记经过不同情境的验证，三处请求得到回应。潮灯沿着河道一盏盏亮起。');
}

export function status(w) {
  if (!validWorld(w)) return null;
  const quest = questByScene.get(w.scene), confirmed = GLYPHS.filter(glyph => w.dictionary[glyph.id].confirmed).length;
  const glyphs = GLYPHS.map(glyph => {
    const entry = w.dictionary[glyph.id];
    return { id: glyph.id, mark: glyph.mark, label: entry.confirmed ? meaningById.get(entry.guess).label : null, guess: entry.guess, candidates: clone(MEANINGS), evidenceCount: evidenceFor(w, glyph.id).length, evidenceIds: evidenceFor(w, glyph.id), confirmed: entry.confirmed };
  });
  return {
    version: VERSION, scene: w.scene, unlockedScenes: [...w.unlockedScenes], phase: w.phase, paused: w.paused,
    observed: w.observed.map(id => clone(evidenceById.get(id))), currentEvidence: w.currentEvidence ? clone(evidenceById.get(w.currentEvidence)) : null,
    glyphs, quest: { ...clone(quest), solved: w.solved.includes(w.scene), canRespond: w.phase === 'exploring' && !w.paused && canRespond(w, quest) },
    solved: [...w.solved], score: w.score, counts: { observed: w.observed.length, totalEvidence: EVIDENCES.length, confirmed, totalGlyphs: GLYPHS.length, solved: w.solved.length, totalQuests: QUESTS.length, actions: w.actions },
    stats: clone(w.stats), message: w.message, log: clone(w.log), lastResult: clone(w.lastResult), canFinish: w.phase === 'exploring' && !w.paused && canFinish(w),
    summary: `观察 ${w.observed.length}/12 · 译出 ${confirmed}/6 · 回应 ${w.solved.length}/3`
  };
}

export function serialize(w) {
  if (!validWorld(w)) return null;
  return JSON.stringify({ version: VERSION, actions: w.ledger });
}
function validUnicode(raw) {
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = raw.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
    } else if (code >= 0xdc00 && code <= 0xdfff) return false;
  }
  return true;
}
export function deserialize(raw) {
  try {
    if (typeof raw !== 'string' || raw.length > MAX_SAVE_BYTES || !validUnicode(raw) || new TextEncoder().encode(raw).byteLength > MAX_SAVE_BYTES) return null;
    const saved = JSON.parse(raw);
    if (!exact(saved, ['version', 'actions']) || saved.version !== VERSION || !Array.isArray(saved.actions) || saved.actions.length > MAX_ACTIONS) return null;
    const w = fresh();
    for (const action of saved.actions) if (!act(w, action)) return null;
    w.paused = true;
    sealState(w);
    return w;
  } catch { return null; }
}

// This aid proposes one ordinary action. It never injects discovered or solved state.
export function demoPlanner(w) {
  if (!validWorld(w) || w.phase !== 'exploring' || w.actions >= MAX_ACTIONS) return null;
  if (w.paused) return { type: 'pause', paused: false };
  for (const scene of SCENES) {
    if (!w.unlockedScenes.includes(scene.id)) break;
    const missing = scene.evidenceIds.find(id => !w.observed.includes(id));
    if (missing) return w.scene === scene.id ? { type: 'observe', id: missing } : { type: 'visit', scene: scene.id };
    const required = scene.id === 'lighthouse' ? GLYPHS.map(glyph => glyph.id) : questByScene.get(scene.id).words;
    for (const glyph of required) {
      const entry = w.dictionary[glyph];
      if (entry.confirmed) continue;
      if (evidenceFor(w, glyph).length < 2) continue;
      if (entry.guess !== wordAnswers[glyph]) return { type: 'guess', glyph, meaning: wordAnswers[glyph] };
      return { type: 'validate', glyph };
    }
    if (!w.solved.includes(scene.id)) {
      if (w.scene !== scene.id) return { type: 'visit', scene: scene.id };
      return canRespond(w, questByScene.get(scene.id)) ? { type: 'respond', answer: responseAnswers[scene.id] } : null;
    }
  }
  return canFinish(w) ? { type: 'finish' } : null;
}
