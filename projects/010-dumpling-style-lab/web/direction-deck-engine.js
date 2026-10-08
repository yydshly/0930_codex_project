// MISTBOUND: an original, deterministic three-encounter local deckbuilding voyage.
export const VERSION = 1;
export const DEFAULT_SEED = 20261005;
export const MAX_HP = 54, ENERGY = 3, HAND_SIZE = 5, MAX_HAND = 10, MAX_ACTIONS = 300;
const definition = value => Object.freeze({ ...value, upgrade: Object.freeze(value.upgrade) });
export const CARDS = Object.freeze({
  crew: definition({ name: '水手齐射', cost: 1, target: 'enemy', damage: 6, art: 'crew', description: '造成 6 点伤害。', upgrade: { damage: 9 } }),
  lantern: definition({ name: '护航灯', cost: 1, target: 'self', block: 6, art: 'lantern', description: '获得 6 点格挡。', upgrade: { block: 9 } }),
  cannon: definition({ name: '舷炮开火', cost: 2, target: 'enemy', damage: 11, art: 'cannon', description: '造成 11 点伤害。', upgrade: { cost: 1, damage: 14 } }),
  chart: definition({ name: '航图测绘', cost: 1, target: 'self', draw: 2, art: 'chart', description: '抽 2 张牌。', upgrade: { draw: 3 } }),
  repair: definition({ name: '应急修补', cost: 1, target: 'self', heal: 4, exhaust: true, art: 'repair', description: '恢复 4 点船体。消耗：本场不再抽到。', upgrade: { heal: 7 } }),
  anchor: definition({ name: '抛锚牵制', cost: 1, target: 'enemy', block: 4, weak: 2, art: 'anchor', description: '获得 4 点格挡，使目标虚弱 2 回合。虚弱攻击减少 25%。', upgrade: { block: 7, weak: 3 } }),
  fog: definition({ name: '雾幕掩护', cost: 1, target: 'self', block: 12, exhaust: true, art: 'lantern', description: '获得 12 点格挡。消耗：本场不再抽到。', upgrade: { block: 16 } }),
  flare: definition({ name: '信号照明弹', cost: 2, target: 'enemy', damage: 14, draw: 1, art: 'cannon', description: '造成 14 点伤害，抽 1 张牌。', upgrade: { damage: 18 } })
});
const enemyDefinition = value => Object.freeze({ ...value, pattern: Object.freeze(value.pattern.map(Object.freeze)) });
export const ENCOUNTERS = Object.freeze([
  Object.freeze({ id: 'reef', name: '礁口哨艇', subtitle: '01 / 穿过外海哨线', enemies: Object.freeze([
    enemyDefinition({ type: 'scout', name: '礁口哨艇', maxHp: 24, pattern: [{ kind: 'attack', amount: 6 }, { kind: 'guard', amount: 6 }, { kind: 'attack', amount: 9 }] })
  ]) }),
  Object.freeze({ id: 'mist', name: '雾幕封锁', subtitle: '02 / 哨艇与岸塔拦截', enemies: Object.freeze([
    enemyDefinition({ type: 'hook', name: '雾幕钩艇', maxHp: 22, pattern: [{ kind: 'attack', amount: 8 }, { kind: 'rally', amount: 2 }, { kind: 'attack', amount: 9 }] }),
    enemyDefinition({ type: 'beacon', name: '巡雾灯塔', maxHp: 20, pattern: [{ kind: 'attack', amount: 5 }, { kind: 'guard', amount: 5 }, { kind: 'attack', amount: 8 }] })
  ]) }),
  Object.freeze({ id: 'deep', name: '暗潮风眼', subtitle: '03 / 风眼前的最后一道潮线', enemies: Object.freeze([
    enemyDefinition({ type: 'warden', name: '暗潮风眼', maxHp: 58, pattern: [{ kind: 'attack', amount: 12 }, { kind: 'guard', amount: 10 }, { kind: 'rally', amount: 3 }, { kind: 'attack', amount: 15 }] })
  ]) })
]);
export const ROUTE_OPTIONS = Object.freeze([
  Object.freeze({ id: 'repair', name: '靠港修缮', description: '恢复 12 点船体，再进入雾幕封锁。', heal: 12 }),
  Object.freeze({ id: 'upgrade', name: '工坊改装', description: '永久升级一张现有牌，再进入雾幕封锁。' })
]);
export const REWARD_OPTIONS = Object.freeze(['fog', 'flare']);
const STARTING_TYPES = Object.freeze(['crew', 'crew', 'crew', 'cannon', 'cannon', 'lantern', 'lantern', 'chart', 'chart', 'repair', 'anchor', 'anchor']);
const plain = value => value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const own = (object, key) => typeof key === 'string' && Object.hasOwn(object, key);
function random(w) { let x = w.rng; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; w.rng = x >>> 0; return w.rng / 4294967296; }
function shuffle(w, cards) { const result = [...cards]; for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random(w) * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } w.stats.shuffles++; return result; }
function log(w, text) { w.message = text; w.log.push({ encounter: w.encounter, turn: w.turn, action: w.ledger.length + 1, text }); if (w.log.length > 32) w.log.shift(); }
export function cardById(w, id) { return typeof id === 'string' ? w.cards.find(card => card.id === id) || null : null; }
export function cardInfo(w, id) {
  const card = cardById(w, id); if (!card) return null;
  const base = CARDS[card.type], info = { ...base, ...(card.upgraded ? base.upgrade : {}), id: card.id, type: card.type, upgraded: card.upgraded };
  info.name = base.name + (card.upgraded ? ' +' : '');
  const effects = []; if (info.damage) effects.push(`造成 ${info.damage} 点伤害`); if (info.block) effects.push(`获得 ${info.block} 点格挡`); if (info.weak) effects.push(`使目标虚弱 ${info.weak} 回合`); if (info.heal) effects.push(`恢复 ${info.heal} 点船体`); if (info.draw) effects.push(`抽 ${info.draw} 张牌`); if (info.exhaust) effects.push('消耗：本场不再抽到'); info.description = effects.join('，') + '。'; return info;
}
function drawCards(w, count) {
  const drawn = [];
  for (let i = 0; i < count; i++) {
    if (!w.draw.length && w.discard.length) { w.draw = shuffle(w, w.discard); w.discard = []; }
    if (!w.draw.length) break;
    const id = w.draw.pop(); w.stats.draws++; if (w.hand.length < MAX_HAND) { w.hand.push(id); drawn.push(id); } else w.discard.push(id);
  }
  return drawn;
}
function syncIntent(w, enemy) {
  const template = ENCOUNTERS[w.encounter].enemies.find(model => model.type === enemy.type), item = template.pattern[enemy.cursor];
  const amount = item.kind === 'attack' ? Math.floor((item.amount + enemy.strength) * (enemy.weak > 0 ? .75 : 1)) : item.amount;
  enemy.intent = { kind: item.kind, amount, name: { attack: '攻击', guard: '护甲', rally: '蓄势' }[item.kind], description: item.kind === 'attack' ? `下回合造成 ${amount} 点伤害${enemy.weak > 0 ? '（虚弱）' : ''}` : item.kind === 'guard' ? `下回合获得 ${amount} 点格挡` : `下回合永久增加 ${amount} 点攻击力` };
}
function startEncounter(w, index) {
  w.encounter = index; w.phase = 'combat'; w.turn = 1; w.player.block = 0; w.player.energy = ENERGY; w.selected = null;
  w.enemies = ENCOUNTERS[index].enemies.map((model, i) => ({ id: `e${index + 1}-${i + 1}`, type: model.type, name: model.name, hp: model.maxHp, maxHp: model.maxHp, block: 0, strength: 0, weak: 0, cursor: 0, intent: null }));
  for (const enemy of w.enemies) syncIntent(w, enemy);
  w.hand = []; w.discard = []; w.exhaust = []; w.draw = shuffle(w, w.cards.map(card => card.id)); drawCards(w, HAND_SIZE);
  log(w, `驶入${ENCOUNTERS[index].name}。查看敌方意图，用 3 点能量安排这一回合。`);
}
export function createWorld(seed = DEFAULT_SEED) {
  if (!Number.isSafeInteger(seed) || seed < 1 || seed > 4294967295) seed = DEFAULT_SEED;
  const w = { version: VERSION, seed, rng: seed, phase: 'combat', paused: true, encounter: 0, turn: 1, player: { hp: MAX_HP, maxHp: MAX_HP, block: 0, energy: ENERGY }, enemies: [], cards: STARTING_TYPES.map((type, i) => ({ id: `c${i + 1}`, type, upgraded: false })), draw: [], hand: [], discard: [], exhaust: [], selected: null, routeChoice: null, rewardChoice: null, stats: { turns: 0, cardsPlayed: 0, damageDealt: 0, damageTaken: 0, healed: 0, blockGained: 0, blockedDamage: 0, draws: 0, shuffles: 0, exhausted: 0, upgraded: 0, rewards: 0, encountersCleared: 0 }, ledger: [], log: [], message: '', lastAction: null };
  startEncounter(w, 0); return w;
}
export function canPlay(w, cardId, targetId) {
  if (!w || w.paused) return '先继续航程，再安排行动。';
  if (w.phase !== 'combat') return '当前不在战斗，请先完成航线选择。';
  if (w.ledger.length >= MAX_ACTIONS) return '本轮行动记录已达上限，请开始新的航程。';
  const info = cardInfo(w, cardId); if (!info || !w.hand.includes(cardId)) return '这张牌不在当前手牌中。';
  if (info.cost > w.player.energy) return `能量不足：需要 ${info.cost} 点。`;
  if (info.target === 'enemy' && !w.enemies.some(enemy => enemy.id === targetId && enemy.hp > 0)) return '请选择一个仍在战斗的敌方目标。';
  if (info.target === 'self' && targetId !== undefined) return '这张牌作用于自己的船，不需要敌方目标。';
  return '';
}
function completeEncounter(w) {
  w.stats.encountersCleared++; w.player.block = 0; w.player.energy = 0;
  if (w.encounter === 0) { w.phase = 'route'; log(w, '礁口哨线已突破。选择靠港修缮，或去工坊升级一张牌。'); }
  else if (w.encounter === 1) { w.phase = 'reward'; log(w, '雾幕封锁已解除。从两张奖励牌中选择一张，带进最后的遭遇。'); }
  else { w.phase = 'won'; w.paused = true; log(w, '暗潮风眼已突破。船体、牌组与每次选择共同完成了这段雾海航程。'); }
}
function play(w, payload) {
  if (!plain(payload) || Object.keys(payload).some(key => !['cardId', 'targetId'].includes(key)) || typeof payload.cardId !== 'string' || payload.targetId !== undefined && typeof payload.targetId !== 'string') return { ok: false, reason: '出牌参数无效。' };
  const reason = canPlay(w, payload.cardId, payload.targetId); if (reason) return { ok: false, reason };
  const info = cardInfo(w, payload.cardId), target = info.target === 'enemy' ? w.enemies.find(enemy => enemy.id === payload.targetId) : null;
  w.hand.splice(w.hand.indexOf(payload.cardId), 1); w.player.energy -= info.cost; w.stats.cardsPlayed++;
  const event = { type: 'play', cardId: info.id, cardType: info.type, name: info.name, targetId: target?.id || null, damage: 0, blocked: 0, heal: 0, block: 0, drawn: [], weak: 0 };
  if (info.damage && target) { event.blocked = Math.min(target.block, info.damage); target.block -= event.blocked; event.damage = Math.min(target.hp, info.damage - event.blocked); target.hp -= event.damage; w.stats.damageDealt += event.damage; }
  if (info.block) { w.player.block += info.block; w.stats.blockGained += info.block; event.block = info.block; }
  if (info.weak && target && target.hp > 0) { target.weak = Math.max(target.weak, info.weak); event.weak = target.weak; syncIntent(w, target); }
  if (info.heal) { event.heal = Math.min(info.heal, w.player.maxHp - w.player.hp); w.player.hp += event.heal; w.stats.healed += event.heal; }
  if (info.draw) event.drawn = drawCards(w, info.draw);
  if (info.exhaust) { w.exhaust.push(info.id); w.stats.exhausted++; } else w.discard.push(info.id);
  w.selected = target?.id || w.selected; w.lastAction = event;
  log(w, `使用${info.name}${target ? ` → ${target.name}` : ''}。${event.damage ? `造成 ${event.damage} 点伤害。` : ''}${event.block ? `获得 ${event.block} 点格挡。` : ''}${event.heal ? `修复 ${event.heal} 点船体。` : ''}${event.drawn.length ? `抽取 ${event.drawn.length} 张牌。` : ''}${event.weak ? `目标虚弱 ${event.weak} 回合。` : ''}`);
  if (w.enemies.every(enemy => enemy.hp === 0)) completeEncounter(w);
  return { ok: true, reason: w.message };
}
function endTurn(w) {
  w.discard.push(...w.hand); w.hand = []; w.player.energy = 0; w.stats.turns++;
  const events = [];
  for (const enemy of w.enemies.filter(enemy => enemy.hp > 0)) {
    enemy.block = 0; const intent = { ...enemy.intent }, event = { enemyId: enemy.id, name: enemy.name, kind: intent.kind, amount: intent.amount, damage: 0, blocked: 0 };
    if (intent.kind === 'attack') { event.blocked = Math.min(w.player.block, intent.amount); w.player.block -= event.blocked; event.damage = Math.min(w.player.hp, intent.amount - event.blocked); w.player.hp -= event.damage; w.stats.damageTaken += event.damage; w.stats.blockedDamage += event.blocked; }
    if (intent.kind === 'guard') enemy.block = intent.amount;
    if (intent.kind === 'rally') enemy.strength += intent.amount;
    events.push(event); enemy.cursor = (enemy.cursor + 1) % ENCOUNTERS[w.encounter].enemies.find(model => model.type === enemy.type).pattern.length; enemy.weak = Math.max(0, enemy.weak - 1); syncIntent(w, enemy);
    if (w.player.hp === 0) { w.phase = 'lost'; w.paused = true; break; }
  }
  w.lastAction = { type: 'end-turn', enemies: events };
  if (w.phase === 'lost') { log(w, '船体无法继续支撑。航程结束；重新规划能量、格挡与目标，再出发。'); return; }
  w.turn++; w.player.block = 0; w.player.energy = ENERGY; const drawn = drawCards(w, HAND_SIZE);
  log(w, `${events.map(event => event.kind === 'attack' ? `${event.name}攻击 ${event.amount}，船体损失 ${event.damage}` : event.kind === 'guard' ? `${event.name}获得 ${event.amount} 点护甲` : `${event.name}攻击力增加 ${event.amount}`).join('；')}。新回合抽取 ${drawn.length} 张牌。`);
}
export function act(w, type, payload) {
  const fail = reason => ({ ok: false, reason });
  if (!w || typeof type !== 'string') return fail('操作无效。');
  if (type === 'pause') { if (typeof payload !== 'boolean') return fail('暂停状态无效。'); if (['won', 'lost'].includes(w.phase) && !payload) return fail('本轮航程已经结束。'); w.paused = payload; return { ok: true, reason: payload ? '航程暂停。' : '航程继续。' }; }
  if (w.paused) return fail('先继续航程，再安排行动。');
  if (['won', 'lost'].includes(w.phase)) return fail('本轮航程已经结束。');
  if (w.ledger.length >= MAX_ACTIONS) return fail('本轮行动记录已达上限，请开始新的航程。');
  let result;
  if (type === 'play') { result = play(w, payload); if (!result.ok) return result; }
  else if (type === 'end-turn') { if (payload !== undefined || w.phase !== 'combat') return fail('只有战斗阶段可以结束回合。'); endTurn(w); }
  else if (type === 'choose-route') {
    if (w.phase !== 'route' || w.routeChoice !== null || !['repair', 'upgrade'].includes(payload)) return fail('请选择一条尚未决定的有效航线。');
    w.routeChoice = payload; w.lastAction = { type, choice: payload };
    if (payload === 'repair') { const healed = Math.min(12, w.player.maxHp - w.player.hp); w.player.hp += healed; w.stats.healed += healed; log(w, `靠港修缮，恢复 ${healed} 点船体。牌组保留。`); startEncounter(w, 1); }
    else log(w, '抵达改装工坊。选择一张尚未升级的现有牌，永久改善它的效果。');
  }
  else if (type === 'upgrade') {
    const card = cardById(w, payload);
    if (w.phase !== 'route' || w.routeChoice !== 'upgrade' || !card || card.upgraded) return fail('先选择工坊航线，再选择一张尚未升级的牌。');
    card.upgraded = true; w.stats.upgraded++; w.lastAction = { type, cardId: card.id }; log(w, `${CARDS[card.type].name}已永久升级。下一场仍使用同一张牌。`); startEncounter(w, 1);
  }
  else if (type === 'choose-reward') {
    if (w.phase !== 'reward' || w.rewardChoice !== null || !REWARD_OPTIONS.includes(payload)) return fail('请选择一张有效的航程奖励牌。');
    const card = { id: `c${w.cards.length + 1}`, type: payload, upgraded: false }; w.cards.push(card); w.rewardChoice = payload; w.stats.rewards++; w.lastAction = { type, cardId: card.id, choice: payload }; log(w, `${CARDS[payload].name}已加入牌组。共 ${w.cards.length} 张牌，向暗潮风眼出发。`); startEncounter(w, 2);
  }
  else return fail('没有这个操作。');
  w.ledger.push({ type, ...(payload === undefined ? {} : { payload: structuredClone(payload) }) });
  return result || { ok: true, reason: w.message };
}
export function incomingDamage(w) { return w.enemies.filter(enemy => enemy.hp > 0 && enemy.intent.kind === 'attack').reduce((sum, enemy) => sum + enemy.intent.amount, 0); }
export function legalPlays(w) {
  const options = [];
  for (const id of w.hand) { const info = cardInfo(w, id); if (info.target === 'enemy') { for (const enemy of w.enemies.filter(enemy => enemy.hp > 0)) if (!canPlay(w, id, enemy.id)) options.push({ cardId: id, targetId: enemy.id }); } else if (!canPlay(w, id)) options.push({ cardId: id }); }
  return options;
}
export function demoStep(w) {
  if (!w || w.paused || ['won', 'lost'].includes(w.phase) || w.ledger.length >= MAX_ACTIONS) return null;
  if (w.phase === 'route') { if (w.routeChoice === null) return { action: 'choose-route', payload: w.player.hp < 33 ? 'repair' : 'upgrade' }; const card = w.cards.find(card => card.type === 'cannon' && !card.upgraded) || w.cards.find(card => !card.upgraded); return card ? { action: 'upgrade', payload: card.id } : null; }
  if (w.phase === 'reward') return { action: 'choose-reward', payload: w.player.hp < 20 ? 'fog' : 'flare' };
  const incoming = incomingDamage(w), options = legalPlays(w), rated = options.map(payload => {
    const info = cardInfo(w, payload.cardId), target = w.enemies.find(enemy => enemy.id === payload.targetId), attack = target?.intent.kind === 'attack' ? target.intent.amount : 0;
    let score = 0;
    if (info.damage && target) { const realDamage = Math.max(0, info.damage - target.block); score += Math.min(realDamage, target.hp) * 1.4 / info.cost; if (realDamage >= target.hp) score += 35 + attack * 2; }
    if (info.block && incoming > w.player.block) score += Math.min(info.block, incoming - w.player.block) * (w.player.hp < 22 ? 2.8 : 1.9) / info.cost;
    if (info.weak && target && target.weak < info.weak) score += attack * .8 + (target.weak ? 0 : 1.5);
    if (info.heal) score += Math.min(info.heal, w.player.maxHp - w.player.hp) * (w.player.hp < 25 ? 4 : 2);
    if (info.draw && w.player.energy >= 2 && w.hand.length < 8) score += info.draw * 2;
    return { payload, score };
  }).filter(item => item.score > .01).sort((a, b) => b.score - a.score || Number(a.payload.cardId.slice(1)) - Number(b.payload.cardId.slice(1)));
  return rated.length ? { action: 'play', payload: rated[0].payload } : { action: 'end-turn' };
}
export function objective(w) { return w.phase === 'combat' ? `${w.encounter + 1} / 3 · 击退${ENCOUNTERS[w.encounter].name}` : w.phase === 'route' ? w.routeChoice === 'upgrade' ? '选择一张牌，完成工坊改装' : '选择修缮或改装航线' : w.phase === 'reward' ? '选择一张奖励牌，驶入最后的遭遇' : w.phase === 'won' ? '航程完成 · 已暂停' : '航程结束 · 重新规划'; }
export function status(w) { return w.paused && !['won', 'lost'].includes(w.phase) ? '航程暂停 · 手牌、船体与意图都已保留' : w.phase === 'combat' ? `${objective(w)} · 第 ${w.turn} 回合 · 能量 ${w.player.energy} / 3` : objective(w); }
export function serialize(w) { return JSON.stringify({ ...w, paused: true }); }
export const serializeWorld = serialize;
function canonical(value) { if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`; if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`; return JSON.stringify(value); }
export function restore(text) {
  try {
    if (typeof text !== 'string' || text.length > 120000) return null;
    const w = JSON.parse(text);
    if (!plain(w) || w.version !== VERSION || !Number.isSafeInteger(w.seed) || w.seed < 1 || w.seed > 4294967295 || typeof w.paused !== 'boolean' || !Array.isArray(w.ledger) || w.ledger.length > MAX_ACTIONS) return null;
    const replay = createWorld(w.seed); replay.paused = false;
    for (const entry of w.ledger) {
      if (!plain(entry) || !['play', 'end-turn', 'choose-route', 'upgrade', 'choose-reward'].includes(entry.type) || Object.keys(entry).some(key => !['type', 'payload'].includes(key))) return null;
      if (!act(replay, entry.type, entry.payload).ok) return null;
    }
    replay.paused = true; const normalized = { ...w, paused: true };
    if (canonical(normalized) !== canonical(replay)) return null;
    return structuredClone(replay);
  } catch { return null; }
}
export const restoreWorld = restore;
