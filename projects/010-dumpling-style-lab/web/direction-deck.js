import { CARDS, ENCOUNTERS, ROUTE_OPTIONS, REWARD_OPTIONS, createWorld, act, cardInfo, canPlay, demoStep, incomingDamage, objective, status, serialize, restore } from './direction-deck-engine.js';

export const DECK_STORAGE_KEY = 'world-play-direction-deck-v1';
const ART_NAMES = ['landscape.png', 'cards-atlas.png', 'vessels-atlas.png'];
const artURL = name => new URL('./assets/directions/deck/' + name, import.meta.url).href;
const finalPhase = w => ['won', 'lost'].includes(w.phase);

export function createDeckController(options = {}) {
  const doc = options.document ?? globalThis.document, win = options.window ?? globalThis.window, storage = options.storage ?? globalThis.localStorage;
  const requestFrame = options.requestFrame ?? win.requestAnimationFrame.bind(win), cancelFrame = options.cancelFrame ?? win.cancelAnimationFrame?.bind(win), now = options.now ?? (() => Date.now()), imageFactory = options.imageFactory ?? (() => new win.Image());
  const $ = id => doc.getElementById(id), stage = $('deck-stage'), subscriptions = [], reducedMotion = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  let w = createWorld(), ready = false, loading = false, disposed = false, demoMode = false, previous = false, selectedTarget = null, timescale = 1;
  let frameId = null, lastTime = null, accumulated = 0, loadAttempt = 0, openingApplied = false, busyUntil = 0, manualHint = '', hintUntil = 0, pile = null, renderedHand = new Set();
  try {
    const saved = JSON.parse(storage.getItem(DECK_STORAGE_KEY) || 'null'), recovered = saved?.version === 1 && restore(saved.world);
    if (recovered) { w = recovered; previous = true; selectedTarget = saved.selectedTarget; timescale = saved.timescale === 2 ? 2 : 1; }
  } catch { /* Invalid or unavailable storage starts at a fresh paused hand. */ }
  const queryDemo = new URLSearchParams(options.search ?? win.location?.search ?? '').get('demo') === '1' && !previous;
  function on(element, type, callback) { element.addEventListener(type, callback); subscriptions.push(() => element.removeEventListener?.(type, callback)); }
  function text(id, value) { const element = $(id); if (element.textContent !== String(value)) element.textContent = String(value); }
  function node(tag, className, value) { const element = doc.createElement(tag); if (className) element.className = className; if (value !== undefined) element.textContent = String(value); return element; }
  function say(value, duration = 5500) { if (!value) return; manualHint = value; hintUntil = now() + duration; text('deck-hint', value); }
  function available() { return ready && !disposed && !w.paused && !finalPhase(w) && now() >= busyUntil; }
  function acknowledge() { previous = false; $('deck-resume').hidden = true; }
  function manualMode() { demoMode = false; accumulated = 0; acknowledge(); }
  function revealStage() {
    if (doc.fullscreenElement) return;
    const rect = stage.getBoundingClientRect(), lead = Math.max(12, (win.innerHeight - rect.height) / 2);
    win.scrollTo?.({ top: Math.max(0, win.scrollY + rect.top - lead), behavior: reducedMotion ? 'auto' : 'instant' });
  }
  function save() {
    if (!ready || disposed) return;
    try { storage.setItem(DECK_STORAGE_KEY, JSON.stringify({ version: 1, world: serialize(w), selectedTarget, timescale })); text('deck-save-status', '手牌、牌组与路线选择已独立保存'); }
    catch { text('deck-save-status', '浏览器未开放保存，可继续本次牌航'); }
  }
  function validTarget() { if (!w.enemies.some(enemy => enemy.id === selectedTarget && enemy.hp > 0)) selectedTarget = w.enemies.find(enemy => enemy.hp > 0)?.id ?? null; }
  function flash(event) {
    if (reducedMotion || !event) return;
    const effects = $('deck-play-effects'); effects.replaceChildren();
    if (event.type === 'play') { const detail = event.damage ? `伤害 ${event.damage}` : event.block ? `格挡 +${event.block}` : event.heal ? `修补 +${event.heal}` : event.drawn?.length ? `抽牌 ${event.drawn.length}` : event.weak ? `虚弱 ${event.weak}` : '已出牌'; const effect = node('span', 'deck-effect deck-effect-card'), art = node('span', 'deck-card-art'); art.dataset.art = CARDS[event.cardType].art; effect.append(art, node('b', '', event.name), node('small', '', detail)); effect.dataset.target = event.damage ? 'enemy' : 'player'; effects.append(effect); }
    if (event.type === 'end-turn') { const damage = event.enemies.reduce((sum, enemy) => sum + enemy.damage, 0), blocked = event.enemies.reduce((sum, enemy) => sum + enemy.blocked, 0); const effect = node('span', 'deck-effect', `敌方结算 · 船身 −${damage}${blocked ? ` · 格挡 ${blocked}` : ''}`); effect.dataset.target = 'player'; effects.append(effect); }
  }
  function execute(action, payload, automated = false) {
    if (!available()) { if (!automated) say(!ready ? '插画素材准备中，请稍候。' : w.paused ? '牌航已暂停。先继续上次手牌，再安排行动。' : now() < busyUntil ? '敌方行动正在结算，稍后继续出牌。' : '这一轮已结束，可以开始新的牌航。'); return false; }
    if (!automated) manualMode();
    const result = act(w, action, payload); if (result.ok) { validTarget(); flash(w.lastAction); if (action === 'end-turn' && !reducedMotion && !finalPhase(w)) busyUntil = now() + 520; if (finalPhase(w)) { demoMode = false; accumulated = 0; busyUntil = 0; } }
    say(result.reason); update(); save(); return result.ok;
  }
  function playCard(cardId) { const info = cardInfo(w, cardId); if (!info) return false; validTarget(); return execute('play', { cardId, ...(info.target === 'enemy' ? { targetId: selectedTarget } : {}) }); }
  function preview(action, payload) { return act(structuredClone(w), action, payload); }
  function fresh(mode, initiated = true) {
    if (!ready) return; closePile(); w = createWorld(); w.paused = false; demoMode = mode === 'demo'; selectedTarget = w.enemies[0]?.id ?? null; acknowledge(); accumulated = 0; lastTime = null; busyUntil = 0; $('deck-play-effects').replaceChildren();
    if (initiated) revealStage(); stage.focus?.({ preventScroll: true });
    say(demoMode ? '完整牌航按普通规则逐步出牌、结束回合、选择工坊或修缮，再挑选奖励牌并驶入最后一场。可随时接管同一手牌。' : '已开始亲自出牌。观察敌方意图，点击敌方目标来选择，再点击手牌。能量不足时，结束回合来抽取下一手。', 8000); update(); save();
  }
  function takeover() { if (!ready || finalPhase(w)) return; manualMode(); w.paused = false; lastTime = null; busyUntil = 0; closePile(); revealStage(); stage.focus?.({ preventScroll: true }); say('已接管同一手牌，船身、牌组、敌方意图与路线均保留。之后的行动由你决定。'); update(); save(); }
  function pause() { if (!ready || finalPhase(w) || !demoMode && !w.paused) return; act(w, 'pause', !w.paused); if (!w.paused) acknowledge(); lastTime = null; accumulated = 0; busyUntil = 0; update(); save(); }
  function context() { if (w.phase === 'route' && w.routeChoice === null) execute('choose-route', 'repair'); else if (w.phase === 'route' && w.routeChoice === 'upgrade') { const candidate = w.cards.find(card => !card.upgraded); if (candidate) execute('upgrade', candidate.id); } else if (w.phase === 'reward') execute('choose-reward', 'fog'); }
  async function fullscreen(exitOnly = false) { try { if (doc.fullscreenElement) await doc.exitFullscreen(); else if (!exitOnly) await stage.requestFullscreen(); } catch { say('浏览器未开放全屏，可以继续在这里出牌。'); } }
  function closePile() { pile = null; if ($('deck-pile-dialog').open) $('deck-pile-dialog').close(); }
  function openPile(kind) { if (!ready) return; pile = kind; updatePile(); if (!$('deck-pile-dialog').open) $('deck-pile-dialog').showModal(); }
  function updatePile() {
    if (!pile) return;
    const ids = pile === 'master' ? w.cards.map(card => card.id) : [...w[pile]], title = { master: '完整牌组', draw: '抽牌堆', discard: '弃牌堆' }[pile];
    text('deck-pile-title', `${title} · ${ids.length} 张`); text('deck-pile-detail', pile === 'draw' ? '逐张查看剩余牌。牌堆显示顺序不透露下一张抽牌；抽牌堆用尽后，弃牌会重新洗入。' : pile === 'discard' ? '打出的普通牌和回合结束时未使用的牌进入弃牌堆。消耗牌列在下方，直到下一场遭遇才回到牌组。' : '完整牌组包含每张实际牌实例，升级与奖励在这里保留。');
    const sorted = [...ids].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))), items = sorted.map(id => { const info = cardInfo(w, id), item = node('div', 'deck-pile-item'); item.dataset.cardId = id; item.append(node('b', '', `${info.name} · ${info.cost} 能量`), node('span', '', info.description)); return item; });
    if (pile === 'discard' && w.exhaust.length) for (const id of w.exhaust) { const info = cardInfo(w, id), item = node('div', 'deck-pile-item'); item.dataset.cardId = id; item.append(node('b', '', `${info.name} · 本场已消耗`), node('span', '', '本场不会重新抽到，下一场随完整牌组重新洗入。')); items.push(item); }
    if (!items.length) items.push(node('p', 'deck-empty-hand', '这里目前没有牌。')); $('deck-pile-list').replaceChildren(...items);
  }
  function renderEnemies() {
    validTarget();
    const buttons = w.enemies.filter(enemy => enemy.hp > 0).map(enemy => {
      const button = node('button', 'deck-enemy' + (enemy.id === selectedTarget ? ' selected' : '')); button.dataset.enemyId = enemy.id; button.setAttribute('aria-pressed', String(enemy.id === selectedTarget)); button.setAttribute('aria-label', `${enemy.name}，生命 ${enemy.hp}/${enemy.maxHp}，格挡 ${enemy.block}，${enemy.intent.description}。点击设为出牌目标。`); button.disabled = !ready || w.phase !== 'combat';
      const art = node('span', 'deck-enemy-art'); art.dataset.art = enemy.type === 'warden' ? 'wraith' : enemy.type === 'beacon' ? 'lighthouse' : 'raider'; art.setAttribute('aria-hidden', 'true');
      const intent = node('span', 'deck-intent', `${enemy.intent.name} ${enemy.intent.amount}${enemy.weak ? ' · 虚弱' : ''}`), info = node('span', 'deck-enemy-info'), hp = node('i', 'deck-enemy-hp'), meter = node('i'); meter.style.width = `${enemy.hp / enemy.maxHp * 100}%`; hp.append(meter); info.append(node('b', '', enemy.name), node('span', '', `${enemy.hp} / ${enemy.maxHp} HP${enemy.block ? ` · 格挡 ${enemy.block}` : ''}`), hp); button.append(art, intent, info);
      button.addEventListener('click', () => { selectedTarget = enemy.id; manualMode(); update(); save(); }); return button;
    }); $('deck-enemies').dataset.count = String(buttons.length); $('deck-enemies').replaceChildren(...buttons);
  }
  function renderHand() {
    const oldScroll = $('deck-cards').scrollLeft, cards = w.hand.map((id, index) => {
      const info = cardInfo(w, id), reason = canPlay(w, id, info.target === 'enemy' ? selectedTarget : undefined), button = node('button', 'deck-card' + (!renderedHand.has(id) ? ' deck-card-drawn' : '')); button.dataset.cardId = id; button.dataset.cardType = info.type; button.disabled = !available() || Boolean(reason); button.title = !available() ? w.paused ? '先继续牌航' : now() < busyUntil ? '等待敌方结算' : '素材准备中或本轮已结束' : reason || '点击出牌'; button.setAttribute('aria-label', `${index + 1}，${info.name}，${info.cost} 能量，${info.description}${reason ? ` ${reason}` : ''}`);
      const art = node('span', 'deck-card-art'); art.dataset.art = info.art; art.setAttribute('aria-hidden', 'true'); const copy = node('span', 'deck-card-copy'); copy.append(node('b', '', info.name), node('small', '', info.description), node('em', '', info.target === 'enemy' ? '对选中目标' : '作用于自己的船')); button.append(art, node('span', 'deck-card-cost', info.cost), node('span', 'deck-card-key', index + 1), copy); button.addEventListener('click', () => playCard(id)); return button;
    }); $('deck-cards').replaceChildren(...cards); renderedHand = new Set(w.hand); $('deck-cards').scrollLeft = oldScroll; text('deck-card-count', `${w.hand.length} 张 · ${w.player.energy} 能量`); $('deck-empty-hand').hidden = w.hand.length !== 0 || w.phase !== 'combat';
  }
  function renderChoices() {
    const visible = ['route', 'reward'].includes(w.phase); $('deck-choice-panel').hidden = !visible; if (!visible) { $('deck-choices').replaceChildren(); return; }
    let choices = [], upgrade = w.phase === 'route' && w.routeChoice === 'upgrade';
    if (w.phase === 'route' && !upgrade) { text('deck-choice-kicker', 'ROUTE CHOICE / AFTER ENCOUNTER 01'); text('deck-choice-title', '修补船身，还是升级这一手。'); text('deck-choice-detail', `船身 ${w.player.hp} / ${w.player.maxHp}。航路选择会实际改变下一场的船身或现有牌。`); choices = ROUTE_OPTIONS.map(choice => ({ name: choice.name, description: choice.description, action: 'choose-route', payload: choice.id })); }
    else if (upgrade) { text('deck-choice-kicker', 'WORKSHOP / PERMANENT UPGRADE'); text('deck-choice-title', '选一张牌，永久改装。'); text('deck-choice-detail', '升级保留同一张牌实例，费用或效果会实际变化；选择后进入第二场遭遇。'); choices = w.cards.filter(card => !card.upgraded).map(card => { const info = cardInfo(w, card.id), improved = cardInfo({ ...w, cards: w.cards.map(c => c.id === card.id ? { ...c, upgraded: true } : c) }, card.id); return { name: info.name, description: `升级后：${improved.cost} 能量，${improved.description}`, action: 'upgrade', payload: card.id }; }); }
    else { text('deck-choice-kicker', 'REWARD CHOICE / AFTER ENCOUNTER 02'); text('deck-choice-title', '带一张新牌，驶向最后的雾。'); text('deck-choice-detail', `现有牌组 ${w.cards.length} 张。选择一张奖励，实际加入完整牌组并参与下一场抽牌。`); choices = REWARD_OPTIONS.map(type => ({ name: CARDS[type].name, description: `${CARDS[type].cost} 能量。${CARDS[type].description}`, action: 'choose-reward', payload: type, art: CARDS[type].art })); }
    $('deck-choices').className = 'deck-choices' + (upgrade ? ' upgrade-list' : ''); $('deck-choices').replaceChildren(...choices.map(choice => { const button = node('button', 'deck-choice'); button.dataset.deckAction = choice.action; button.dataset.deckValue = choice.payload; const result = preview(choice.action, choice.payload); button.disabled = !available() || !result.ok; button.title = result.reason; if (choice.art) { const art = node('span', 'deck-choice-art'); art.dataset.art = choice.art; button.append(art); } button.append(node('b', '', choice.name), node('small', '', choice.description)); button.addEventListener('click', () => execute(choice.action, choice.payload)); return button; }));
  }
  function update() {
    validTarget(); const complete = finalPhase(w), busy = now() < busyUntil, encounter = ENCOUNTERS[w.encounter];
    text('deck-hp', `${w.player.hp} / ${w.player.maxHp}`); $('deck-health-meter').style.width = `${w.player.hp / w.player.maxHp * 100}%`; text('deck-block', w.player.block); text('deck-energy', `${w.player.energy} / 3`); text('deck-turn', String(w.turn).padStart(2, '0')); text('deck-mode', !ready ? '插画准备中' : complete ? objective(w) : previous ? '上次手牌已恢复 · 暂停' : w.paused ? '牌航暂停' : demoMode ? '完整牌航示范' : busy ? '敌方行动结算 · 新手牌已到' : objective(w));
    text('deck-encounter-index', `ENCOUNTER / ${String(w.encounter + 1).padStart(2, '0')}`); text('deck-encounter-name', encounter.name); text('deck-turn-owner', w.paused ? '暂停 · 手牌与意图保留' : w.phase === 'combat' ? busy ? '敌方行动结算 · 等待出牌' : `你的回合 · 敌方将攻击 ${incomingDamage(w)}` : objective(w)); text('deck-player-detail', `船身 ${w.player.hp} · 格挡 ${w.player.block}${w.phase === 'combat' ? ` · 剩余 ${w.player.energy} 能量` : ''}`);
    for (let i = 0; i < 3; i++) $('deck-chapter-' + i).dataset.state = w.stats.encountersCleared > i ? 'done' : w.encounter === i ? 'current' : 'pending';
    renderEnemies(); renderHand(); renderChoices();
    const setPile = (id, label, count) => { $(id).replaceChildren(doc.createTextNode(label + ' '), node('b', '', count)); $(id).disabled = !ready; }; setPile('deck-draw-pile', '抽牌堆', w.draw.length); setPile('deck-discard-pile', '弃牌堆', w.discard.length); setPile('deck-master-pile', '完整牌组', w.cards.length);
    $('deck-end-turn').disabled = !available() || w.phase !== 'combat'; text('deck-end-turn', busy ? '敌方结算中…' : '结束回合 · Enter'); $('deck-pause').disabled = !ready || complete || !demoMode && !w.paused; text('deck-pause', w.paused ? w.ledger.length ? '继续牌航' : '开始牌航' : demoMode ? '暂停示范' : '手动回合中'); $('deck-takeover').hidden = !demoMode || complete; $('deck-takeover').disabled = !ready; $('deck-timescale').disabled = !ready; $('deck-timescale').setAttribute('aria-pressed', String(timescale === 2)); text('deck-timescale', `示范 ×${timescale}`);
    $('deck-context').hidden = !['route', 'reward'].includes(w.phase); $('deck-context').disabled = !available(); text('deck-context', w.phase === 'reward' ? '选择雾幕掩护 · E' : w.routeChoice === 'upgrade' ? '升级首张未改装牌 · E' : '选择靠港修缮 · E');
    $('deck-result').hidden = !complete; if (complete) { text('deck-result-kicker', w.phase === 'won' ? 'MISTBOUND / VOYAGE COMPLETE' : 'MISTBOUND / VOYAGE ENDED'); text('deck-result-title', w.phase === 'won' ? '灯火就在前方。' : '风浪留下一次判断。'); text('deck-result-detail', `完成 ${w.stats.encountersCleared} / 3 场遭遇，出牌 ${w.stats.cardsPlayed} 次，承受 ${w.stats.damageTaken} 点伤害。最终船身 ${w.player.hp} / ${w.player.maxHp}，完整牌组 ${w.cards.length} 张。${w.phase === 'won' ? '这一轮已暂停并保存。' : '调整格挡、目标与能量，再开始新一轮。'}`); }
    text('deck-hand-detail', w.phase === 'combat' ? '选目标，再出牌；左右滚动查看整手。' : '这一手已保留，先完成路线或奖励选择。'); text('deck-control-hint', !ready ? '插画准备中，航程保持不动。' : complete ? '本轮已结束并保存 · 可检查牌堆或开启新的牌航' : w.paused ? previous ? '上次手牌已暂停 · 继续后由你安排每次行动' : w.ledger.length ? '牌航已暂停 · 手牌与敌方意图保留' : '牌桌已就绪 · 开始亲自出牌，或观看完整牌航' : '点击牌桌：数字 1–9 出牌 · Enter 结束回合 · E 路线操作 · 空格暂停示范'); text('deck-hint', complete ? status(w) : now() < hintUntil ? manualHint : status(w)); text('deck-log', w.log.slice(-5).map(item => `${item.encounter + 1} / 3 · 回合 ${item.turn} · ${item.text}`).join('\n')); text('deck-ledger', `完整牌组 ${w.cards.length} 张：手牌 ${w.hand.length}，抽牌 ${w.draw.length}，弃牌 ${w.discard.length}，本场消耗 ${w.exhaust.length}。\n已出牌 ${w.stats.cardsPlayed} 次 · 获得格挡 ${w.stats.blockGained} · 实际挡伤 ${w.stats.blockedDamage}。\n航路：${w.routeChoice === 'upgrade' ? '工坊改装' : w.routeChoice === 'repair' ? '靠港修缮' : '尚未选择'} · 奖励：${w.rewardChoice ? CARDS[w.rewardChoice].name : '尚未选择'}。`);
    ['deck-demo', 'deck-manual', 'deck-retry', 'deck-fullscreen', 'deck-fullscreen-exit'].forEach(id => $(id).disabled = !ready); $('deck-resume').hidden = !previous; $('deck-resume').disabled = !ready || complete; updatePile();
  }
  function backgroundPause() { if (!ready) return; if (!finalPhase(w)) act(w, 'pause', true); demoMode = false; accumulated = 0; lastTime = null; busyUntil = 0; say('页面暂离，手牌与意图已暂停保存。返回后由你继续这一轮。'); update(); save(); }
  function frame(timestamp) {
    if (!ready || disposed) return;
    const dt = lastTime === null ? 0 : Math.min(100, Math.max(0, timestamp - lastTime)); lastTime = timestamp;
    if (demoMode && !w.paused && !finalPhase(w)) { accumulated += dt * timescale; if (accumulated >= 900 && available()) { accumulated -= 900; const plan = demoStep(w); if (plan) execute(plan.action, plan.payload, true); } }
    if (busyUntil && now() >= busyUntil) { busyUntil = 0; $('deck-play-effects').replaceChildren(); update(); }
    frameId = requestFrame(frame);
  }
  async function loadAssets() {
    if (loading || disposed) return false; loading = true; ready = false; if (!finalPhase(w)) w.paused = true; demoMode = false; busyUntil = 0; accumulated = 0; lastTime = null; cancelFrame?.(frameId); frameId = null;
    const attempt = ++loadAttempt; $('deck-load-status').hidden = false; $('deck-load-status').dataset.state = 'loading'; $('deck-load-retry').hidden = true; text('deck-load-title', '正在铺开雾海牌桌'); text('deck-load-message', '正在准备航海插画与手牌…'); update();
    try {
      await Promise.all(ART_NAMES.map(name => new Promise((resolve, reject) => { const image = imageFactory(); image.decoding = 'async'; image.onload = () => image.naturalWidth > 0 ? resolve(image) : reject(new Error(name + ' 图片尺寸无效')); image.onerror = () => reject(new Error(name + ' 未能载入')); image.src = artURL(name); if (image.complete && image.naturalWidth > 0) resolve(image); })));
      if (disposed || attempt !== loadAttempt) return false; ready = true; loading = false; $('deck-load-status').hidden = true; if (queryDemo && !openingApplied && !previous && !w.ledger.length) fresh('demo', false); else { update(); save(); } openingApplied = true; if (win.location?.hash === '#play') revealStage(); frameId = requestFrame(frame); return true;
    } catch (error) { if (disposed || attempt !== loadAttempt) return false; loading = false; ready = false; $('deck-load-status').hidden = false; $('deck-load-status').dataset.state = 'error'; $('deck-load-retry').hidden = false; text('deck-load-title', '插画素材尚未能就绪'); text('deck-load-message', `航程与手牌保持暂停。检查网络后点击重试。${error?.message ? `（${error.message}）` : ''}`); update(); return false; }
  }
  stage.setAttribute('tabindex', '0');
  on($('deck-demo'), 'click', () => fresh('demo')); on($('deck-manual'), 'click', () => fresh('manual')); on($('deck-retry'), 'click', () => fresh('manual')); on($('deck-end-turn'), 'click', () => execute('end-turn')); on($('deck-pause'), 'click', pause); on($('deck-takeover'), 'click', takeover); on($('deck-context'), 'click', context); on($('deck-timescale'), 'click', () => { timescale = timescale === 1 ? 2 : 1; update(); save(); });
  on($('deck-draw-pile'), 'click', () => openPile('draw')); on($('deck-discard-pile'), 'click', () => openPile('discard')); on($('deck-master-pile'), 'click', () => openPile('master')); on($('deck-pile-close'), 'click', closePile); on($('deck-pile-dialog'), 'close', () => { pile = null; });
  on($('deck-fullscreen'), 'click', () => fullscreen()); on($('deck-fullscreen-exit'), 'click', () => fullscreen(true)); on($('deck-load-retry'), 'click', () => { void loadAssets(); });
  on($('deck-resume'), 'click', () => { if (!ready || !previous || finalPhase(w)) return; manualMode(); w.paused = false; lastTime = null; busyUntil = 0; revealStage(); stage.focus?.({ preventScroll: true }); say('已继续上次手牌，牌组、路线、敌方意图与回合保留，之后由你出牌。'); update(); save(); });
  const editable = event => /^(INPUT|TEXTAREA|SELECT|BUTTON|A|SUMMARY)$/.test(event.target?.tagName || '') || /^(INPUT|TEXTAREA|SELECT|BUTTON|A|SUMMARY)$/.test(doc.activeElement?.tagName || '') || event.target?.closest?.('button,input,textarea,select,a,summary,[contenteditable="true"]') || event.target?.isContentEditable;
  on(win, 'keydown', event => { if (!ready || editable(event) || $('deck-pile-dialog').open || doc.activeElement !== stage && event.target !== stage || event.repeat) return; if (/^(Digit|Numpad)[1-9]$/.test(event.code)) { event.preventDefault(); const id = w.hand[Number(event.code.slice(-1)) - 1]; if (id) playCard(id); } else if (event.code === 'Enter') { event.preventDefault(); execute('end-turn'); } else if (event.code === 'KeyE') { event.preventDefault(); context(); } else if (event.code === 'Space') { event.preventDefault(); pause(); } });
  on($('deck-scene'), 'pointerdown', event => { if (event.target === $('deck-scene') && event.button === 0) stage.focus?.({ preventScroll: true }); }); on(win, 'blur', backgroundPause); on(win, 'pagehide', backgroundPause); on(doc, 'visibilitychange', () => { if (doc.hidden) backgroundPause(); });
  const readyPromise = loadAssets();
  return { readyPromise, frame, retryAssets: loadAssets, save, getWorld: () => w, getTimescale: () => timescale, getDemoMode: () => demoMode, getTarget: () => selectedTarget, get ready() { return ready && !disposed; }, dispose() { if (disposed) return; save(); disposed = true; ready = false; loadAttempt++; cancelFrame?.(frameId); subscriptions.forEach(remove => remove()); closePile(); } };
}
if (typeof document !== 'undefined' && document.getElementById('deck-stage')) window.deckDirection = createDeckController();
