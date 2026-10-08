import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as E from '../web/direction-deck-engine.js';
const project = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const checks = [], failures = [], playthroughs = [];
const test = (name, fn) => { try { fn(); checks.push(name); } catch (error) { failures.push({ name, message: error.message }); console.error(`${name}: ${error.stack}`); } };
const copy = value => structuredClone(value), fresh = (seed = E.DEFAULT_SEED) => { const w = E.createWorld(seed); assert.ok(E.act(w, 'pause', false).ok); return w; };
const hand = (w, type) => w.hand.find(id => E.cardById(w, id).type === type), alive = w => w.enemies.find(enemy => enemy.hp > 0);
const play = (w, type, target = alive(w)?.id) => { const id = hand(w, type); assert.ok(id, `${type} is not in hand`); const info = E.cardInfo(w, id); assert.ok(E.act(w, 'play', { cardId: id, ...(info.target === 'enemy' ? { targetId: target } : {}) }).ok); return id; };
function invariants(w) {
  const all = [...w.draw, ...w.hand, ...w.discard, ...w.exhaust]; assert.equal(all.length, w.cards.length); assert.equal(new Set(all).size, w.cards.length); assert.deepEqual([...all].sort(), w.cards.map(card => card.id).sort()); assert.ok(w.player.hp >= 0 && w.player.hp <= w.player.maxHp); assert.ok(w.player.energy >= 0 && w.player.energy <= 3); assert.ok(w.player.block >= 0); assert.ok(w.enemies.every(enemy => enemy.hp >= 0 && enemy.hp <= enemy.maxHp && enemy.block >= 0 && enemy.weak >= 0)); assert.ok(w.hand.length <= 10);
}
function apply(w, plan) { assert.ok(plan); const result = E.act(w, plan.action, plan.payload); assert.ok(result.ok, `${plan.action}: ${result.reason}`); invariants(w); assert.ok(E.restore(E.serialize(w)), `valid replay save rejected after ${plan.action}`); }
function reach(w, predicate) { for (let i = 0; i < 250 && !predicate(w); i++) { assert.ok(!w.paused, 'voyage ended before checkpoint'); apply(w, E.demoStep(w)); } assert.ok(predicate(w), 'checkpoint not reached'); return w; }
function voyage(seed = E.DEFAULT_SEED, route = null, reward = null) {
  const w = fresh(seed), snapshots = [], actions = [];
  for (let i = 0; i < 250 && !w.paused; i++) {
    let plan = E.demoStep(w);
    if (w.phase === 'route' && w.routeChoice === null && route) plan = { action: 'choose-route', payload: route };
    if (w.phase === 'reward' && reward) plan = { action: 'choose-reward', payload: reward };
    const before = E.serialize(w); assert.deepEqual(E.demoStep(w), E.demoStep(w)); assert.equal(E.serialize(w), before, 'planner cannot mutate the world');
    actions.push(copy(plan)); apply(w, plan);
    if (w.phase !== 'combat' || plan.action === 'choose-route' || plan.action === 'upgrade' || plan.action === 'choose-reward') snapshots.push({ phase: w.phase, encounter: w.encounter, hp: w.player.hp, cards: w.cards.length, energy: w.player.energy, action: plan.action });
  }
  assert.equal(w.phase, 'won'); assert.equal(w.paused, true); assert.equal(w.stats.encountersCleared, 3); assert.equal(w.stats.rewards, 1); assert.equal(w.cards.length, 13);
  playthroughs.push({ mode: route || reward ? 'ordinary combat actions with explicit human route/reward choices' : 'ordinary same-API demo', seed, route: w.routeChoice, reward: w.rewardChoice, actionCount: w.ledger.length, endedTurns: w.stats.turns, finalHp: w.player.hp, cardCount: w.cards.length, stats: copy(w.stats), snapshots, actions }); return w;
}
function bad(w, change) { const forged = copy(w); change(forged); assert.equal(E.restore(JSON.stringify(forged)), null); }
const completed = voyage(), repaired = voyage(E.DEFAULT_SEED, 'repair', 'fog');
const route = reach(fresh(), w => w.phase === 'route'), upgraded = copy(route); apply(upgraded, { action: 'choose-route', payload: 'upgrade' }); apply(upgraded, { action: 'upgrade', payload: 'c4' });
const reward = reach(copy(upgraded), w => w.phase === 'reward');

test('fresh voyage is paused with three energy, five actual dealt cards and twelve unique instances', () => {
  const a = E.createWorld(), b = E.createWorld(); assert.equal(a.paused, true); assert.equal(a.phase, 'combat'); assert.equal(a.encounter, 0); assert.equal(a.turn, 1); assert.deepEqual(a.player, { hp: 54, maxHp: 54, block: 0, energy: 3 }); assert.equal(a.cards.length, 12); assert.equal(a.hand.length, 5); assert.equal(a.draw.length, 7); assert.equal(a.discard.length, 0); assert.equal(a.exhaust.length, 0); invariants(a); a.cards[0].upgraded = true; a.hand.pop(); assert.equal(b.cards[0].upgraded, false); assert.equal(b.hand.length, 5); assert.ok(E.restore(E.serialize(b)));
});
test('eight original definitions expose six starting types and two distinct selectable reward types', () => {
  assert.deepEqual(Object.keys(E.CARDS).sort(), ['anchor', 'cannon', 'chart', 'crew', 'flare', 'fog', 'lantern', 'repair']); assert.equal(new Set(E.createWorld().cards.map(card => card.type)).size, 6); assert.deepEqual(E.REWARD_OPTIONS, ['fog', 'flare']); assert.ok(E.CARDS.fog.exhaust); assert.equal(E.CARDS.flare.draw, 1); assert.ok(E.CARDS.cannon.upgrade.damage > E.CARDS.cannon.damage); assert.ok(Object.isFrozen(E.CARDS));
});
test('shuffle is deterministic for a seed and materially differs for other seeds', () => {
  const a = E.createWorld(12345), b = E.createWorld(12345), c = E.createWorld(987654321); assert.equal(E.serialize(a), E.serialize(b)); assert.notDeepEqual(a.hand, c.hand); assert.notEqual(a.rng, a.seed); assert.equal(a.seed, 12345); assert.ok(a.rng > 0 && a.rng <= 4294967295);
});
test('three encounters have real one two one enemy bodies and preannounced attack guard rally cycles', () => {
  assert.deepEqual(E.ENCOUNTERS.map(encounter => encounter.enemies.length), [1, 2, 1]); assert.equal(E.ENCOUNTERS[1].enemies[1].name, '巡雾灯塔'); assert.equal(E.ENCOUNTERS[2].name, '暗潮风眼'); assert.equal(E.ENCOUNTERS[2].enemies[0].maxHp, 58); const w = E.createWorld(); assert.deepEqual(w.enemies.map(enemy => enemy.hp), [24]); assert.equal(w.enemies[0].intent.kind, 'attack'); assert.equal(w.enemies[0].intent.amount, 6); assert.match(w.enemies[0].intent.description, /6/);
});
test('paused legal and illegal actions preserve every pile body intent resource and ledger exactly', () => {
  const w = E.createWorld(), before = E.serialize(w); assert.equal(E.demoStep(w), null); for (const action of [['play', { cardId: w.hand[0], targetId: w.enemies[0].id }], ['end-turn'], ['choose-route', 'repair'], ['upgrade', 'c4'], ['choose-reward', 'flare']]) assert.equal(E.act(w, ...action).ok, false); assert.equal(E.serialize(w), before); assert.equal(E.legalPlays(w).length, 0);
});
test('actual crew damage costs one energy and moves precisely its own instance to discard', () => {
  const w = fresh(1), id = hand(w, 'crew'), enemy = alive(w); assert.equal(E.canPlay(w, id, enemy.id), ''); play(w, 'crew'); assert.equal(w.player.energy, 2); assert.equal(enemy.hp, 18); assert.ok(!w.hand.includes(id)); assert.ok(w.discard.includes(id)); assert.equal(w.stats.damageDealt, 6); assert.equal(w.stats.cardsPlayed, 1); assert.equal(w.lastAction.cardId, id); invariants(w);
});
test('cannon costs two and insufficient energy rejection is atomic rather than a free partial attack', () => {
  const w = fresh(3); play(w, 'cannon'); assert.equal(w.player.energy, 1); assert.equal(alive(w).hp, 13); const id = hand(w, 'cannon'), before = E.serialize(w); assert.match(E.canPlay(w, id, alive(w).id), /能量/); assert.equal(E.act(w, 'play', { cardId: id, targetId: alive(w).id }).ok, false); assert.equal(E.serialize(w), before);
});
test('targeted cards reject missing nonexistent dead and nonstring enemy targets before consumption', () => {
  const w = fresh(1), id = hand(w, 'crew'), before = E.serialize(w); for (const targetId of [undefined, 'missing', 'e2-1', null, 0, {}, '__proto__']) assert.equal(E.act(w, 'play', { cardId: id, targetId }).ok, false); assert.equal(E.serialize(w), before);
});
test('self cards reject enemy targets and malformed or excess payload fields atomically', () => {
  const w = fresh(1), id = hand(w, 'lantern'), before = E.serialize(w); for (const payload of [null, [], 'c7', { cardId: id, targetId: alive(w).id }, { cardId: id, damage: 999 }, { cardId: 7 }]) assert.equal(E.act(w, 'play', payload).ok, false); assert.equal(E.serialize(w), before);
});
test('draw discard exhaust unknown and already played instances cannot be used from outside the hand', () => {
  const w = fresh(1), id = play(w, 'crew'), before = E.serialize(w); for (const cardId of [id, w.draw[0], 'c999', '__proto__', null]) assert.equal(E.act(w, 'play', { cardId, targetId: alive(w).id }).ok, false); assert.equal(E.serialize(w), before);
});
test('lantern block absorbs real announced enemy damage and remaining block expires for the new player turn', () => {
  const w = fresh(7); play(w, 'lantern'); play(w, 'lantern'); assert.equal(w.player.block, 12); E.act(w, 'end-turn'); assert.equal(w.player.hp, 54); assert.equal(w.player.block, 0); assert.equal(w.stats.blockedDamage, 6); assert.equal(w.lastAction.enemies[0].blocked, 6); assert.equal(w.lastAction.enemies[0].damage, 0); assert.equal(w.turn, 2); assert.equal(w.player.energy, 3);
});
test('enemy guard absorbs actual player attacks and expires when that enemy acts again', () => {
  const w = fresh(1); E.act(w, 'end-turn'); E.act(w, 'end-turn'); assert.equal(alive(w).block, 6); const oldHp = alive(w).hp; assert.ok(hand(w, 'crew')); play(w, 'crew'); assert.equal(alive(w).hp, oldHp); assert.equal(alive(w).block, 0); assert.equal(w.lastAction.blocked, 6); assert.equal(w.lastAction.damage, 0); E.act(w, 'end-turn'); assert.equal(alive(w).block, 0);
});
test('anchor updates displayed imminent attack and applies two real enemy turns of weakness', () => {
  const w = fresh(1), enemy = alive(w); play(w, 'anchor'); assert.equal(w.player.block, 4); assert.equal(enemy.weak, 2); assert.equal(enemy.intent.amount, 4); assert.match(enemy.intent.description, /虚弱/); E.act(w, 'end-turn'); assert.equal(w.player.hp, 54); assert.equal(enemy.weak, 1); assert.equal(w.lastAction.enemies[0].amount, 4); E.act(w, 'end-turn'); assert.equal(enemy.weak, 0); assert.equal(enemy.intent.amount, 9);
});
test('chart draws actual distinct card instances and cannot draw itself during its resolving effect', () => {
  const w = fresh(2), initial = [...w.hand], oldDraw = w.draw.length, id = play(w, 'chart'); assert.equal(w.player.energy, 2); assert.equal(w.hand.length, 6); assert.equal(w.draw.length, oldDraw - 2); assert.equal(w.lastAction.drawn.length, 2); assert.ok(w.lastAction.drawn.every(cardId => !initial.includes(cardId))); assert.ok(!w.hand.includes(id)); assert.ok(w.discard.includes(id)); invariants(w);
});
test('empty draw pile reshuffles the actual discard without duplicating or fabricating cards', () => {
  const w = fresh(1), rng = w.rng; E.act(w, 'end-turn'); assert.equal(w.draw.length, 2); assert.equal(w.discard.length, 5); E.act(w, 'end-turn'); assert.equal(w.hand.length, 5); assert.equal(w.stats.shuffles, 2); assert.notEqual(w.rng, rng); invariants(w); assert.ok(E.restore(E.serialize(w)));
});
test('unused hand cards discard at end of turn and energy resets rather than carrying leftovers', () => {
  const w = fresh(1), original = [...w.hand]; play(w, 'crew'); assert.equal(w.player.energy, 2); E.act(w, 'end-turn'); assert.equal(w.player.energy, 3); assert.ok(original.every(id => w.discard.includes(id))); assert.equal(w.hand.length, 5); assert.equal(w.stats.turns, 1); invariants(w);
});
test('repair heals actual persistent damage and exhausts once for that encounter', () => {
  const w = fresh(1); E.act(w, 'end-turn'); assert.equal(w.player.hp, 48); const id = play(w, 'repair'); assert.equal(w.player.hp, 52); assert.equal(w.stats.healed, 4); assert.ok(w.exhaust.includes(id)); assert.ok(!w.discard.includes(id)); E.act(w, 'end-turn'); E.act(w, 'end-turn'); assert.ok(!w.hand.includes(id) && !w.draw.includes(id) && !w.discard.includes(id)); assert.ok(w.exhaust.includes(id)); assert.equal(w.stats.exhausted, 1); invariants(w);
});
test('repair never heals beyond the real maximum hull even when played at full health', () => {
  const w = fresh(7); play(w, 'repair'); assert.equal(w.player.hp, 54); assert.equal(w.stats.healed, 0); assert.equal(w.stats.exhausted, 1);
});
test('successful last-hit transitions stop combat and never allow enemy retaliation after victory', () => {
  const w = copy(route), hp = w.player.hp, before = E.serialize(w); assert.equal(w.phase, 'route'); assert.ok(w.enemies.every(enemy => enemy.hp === 0)); assert.equal(w.stats.encountersCleared, 1); assert.equal(E.act(w, 'end-turn').ok, false); assert.equal(E.act(w, 'play', { cardId: w.hand[0], targetId: w.enemies[0].id }).ok, false); assert.equal(E.serialize(w), before); assert.equal(w.player.hp, hp);
});
test('route choices are available only after encounter one and cannot be picked twice or forged', () => {
  const a = fresh(), before = E.serialize(a); for (const option of ['repair', 'upgrade', 'grant', '__proto__', {}, null]) assert.equal(E.act(a, 'choose-route', option).ok, false); assert.equal(E.serialize(a), before); const b = copy(route), second = E.serialize(b); for (const option of ['skip', {}, null]) assert.equal(E.act(b, 'choose-route', option).ok, false); assert.equal(E.serialize(b), second); assert.ok(E.act(b, 'choose-route', 'upgrade').ok); assert.equal(E.act(b, 'choose-route', 'repair').ok, false);
});
test('repair route heals up to twelve from actual damage and preserves the same master cards', () => {
  const w = copy(route), hp = w.player.hp, cards = copy(w.cards), healed = w.stats.healed; apply(w, { action: 'choose-route', payload: 'repair' }); assert.equal(w.player.hp, Math.min(54, hp + 12)); assert.equal(w.stats.healed, healed + Math.min(12, 54 - hp)); assert.equal(w.encounter, 1); assert.equal(w.phase, 'combat'); assert.deepEqual(w.cards, cards); assert.equal(w.routeChoice, 'repair'); assert.equal(w.stats.upgraded, 0);
});
test('upgrade route waits for a specific existing instance and gives no free healing or upgrade', () => {
  const w = copy(route), hp = w.player.hp; apply(w, { action: 'choose-route', payload: 'upgrade' }); assert.equal(w.phase, 'route'); assert.equal(w.player.hp, hp); assert.equal(w.stats.upgraded, 0); const before = E.serialize(w); for (const id of ['c999', '__proto__', 4, {}, null]) assert.equal(E.act(w, 'upgrade', id).ok, false); assert.equal(E.serialize(w), before);
});
test('permanent cannon upgrade changes only the chosen instance cost and damage in the next encounter', () => {
  assert.equal(upgraded.encounter, 1); assert.equal(upgraded.cards.find(card => card.id === 'c4').upgraded, true); assert.equal(upgraded.cards.find(card => card.id === 'c5').upgraded, false); assert.equal(E.cardInfo(upgraded, 'c4').cost, 1); assert.equal(E.cardInfo(upgraded, 'c4').damage, 14); assert.equal(E.cardInfo(upgraded, 'c5').cost, 2); assert.equal(upgraded.stats.upgraded, 1); assert.equal(upgraded.player.hp, route.player.hp); const before = E.serialize(upgraded); assert.equal(E.act(upgraded, 'upgrade', 'c5').ok, false); assert.equal(E.serialize(upgraded), before);
});
test('new encounters preserve hull but reset block energy exhausted and combat piles from the same master deck', () => {
  const w = fresh(7); play(w, 'repair'); assert.equal(w.exhaust.length, 1); reach(w, state => state.phase === 'route'); const hull = w.player.hp; apply(w, { action: 'choose-route', payload: 'upgrade' }); apply(w, { action: 'upgrade', payload: 'c4' }); assert.equal(w.player.hp, hull); assert.equal(w.player.block, 0); assert.equal(w.player.energy, 3); assert.equal(w.exhaust.length, 0); assert.equal(w.hand.length, 5); assert.equal(w.draw.length, 7); assert.ok([...w.hand, ...w.draw].includes('c10')); invariants(w);
});
test('two live enemy targets are independent and dead targets cannot consume cards or energy', () => {
  const w = copy(upgraded); reach(w, state => state.enemies.some(enemy => enemy.hp === 0)); assert.equal(w.phase, 'combat'); assert.equal(w.enemies.length, 2); const dead = w.enemies.find(enemy => enemy.hp === 0), payload = w.hand.map(id => ({ cardId: id, targetId: dead.id })).find(item => E.cardInfo(w, item.cardId).target === 'enemy'); if (!payload) E.act(w, 'end-turn'); const targeted = payload || { cardId: w.hand.find(id => E.cardInfo(w, id).target === 'enemy'), targetId: dead.id }; assert.ok(targeted.cardId); const before = E.serialize(w); assert.equal(E.act(w, 'play', targeted).ok, false); assert.equal(E.serialize(w), before); assert.ok(w.enemies.some(enemy => enemy.hp > 0));
});
test('rally changes real strength and the next shown attack includes that permanent increase', () => {
  const w = copy(upgraded); assert.equal(w.enemies[0].intent.amount, 8); E.act(w, 'end-turn'); assert.equal(w.enemies[0].intent.kind, 'rally'); E.act(w, 'end-turn'); assert.equal(w.enemies[0].strength, 2); assert.equal(w.enemies[0].intent.kind, 'attack'); assert.equal(w.enemies[0].intent.amount, 11); assert.equal(w.enemies[1].block, 5); assert.ok(E.restore(E.serialize(w)));
});
test('only living enemies retaliate and their real total attack is shown by the intent helper', () => {
  const w = copy(upgraded); assert.equal(E.incomingDamage(w), 13); reach(w, state => state.enemies.some(enemy => enemy.hp === 0)); const live = w.enemies.filter(enemy => enemy.hp > 0); assert.equal(E.incomingDamage(w), live.filter(enemy => enemy.intent.kind === 'attack').reduce((sum, enemy) => sum + enemy.intent.amount, 0)); if (w.phase === 'combat') { E.act(w, 'end-turn'); assert.equal(w.lastAction.enemies.length, live.length); assert.ok(w.lastAction.enemies.every(event => live.some(enemy => enemy.id === event.enemyId))); }
});
test('reward choice appears after second real encounter and adds exactly one new instance to the next deck', () => {
  const w = copy(reward), hp = w.player.hp; assert.equal(w.stats.encountersCleared, 2); assert.equal(w.cards.length, 12); apply(w, { action: 'choose-reward', payload: 'flare' }); assert.equal(w.encounter, 2); assert.equal(w.player.hp, hp); assert.equal(w.cards.length, 13); assert.deepEqual(w.cards.at(-1), { id: 'c13', type: 'flare', upgraded: false }); assert.equal(w.rewardChoice, 'flare'); assert.equal(w.stats.rewards, 1); assert.ok([...w.hand, ...w.draw].includes('c13')); assert.equal(E.act(w, 'choose-reward', 'fog').ok, false); invariants(w);
});
test('fog reward is a distinct actual exhaust card and does not silently replace other cards', () => {
  const w = copy(reward), cards = copy(w.cards); apply(w, { action: 'choose-reward', payload: 'fog' }); assert.deepEqual(w.cards.slice(0, 12), cards); assert.equal(w.cards.at(-1).type, 'fog'); assert.equal(E.cardInfo(w, 'c13').block, 12); assert.equal(E.cardInfo(w, 'c13').exhaust, true); assert.equal(w.cards.length, 13);
});
test('early unknown inherited object or repeated reward choices are rejected atomically', () => {
  const w = fresh(), before = E.serialize(w); assert.equal(E.act(w, 'choose-reward', 'flare').ok, false); assert.equal(E.serialize(w), before); const r = copy(reward), second = E.serialize(r); for (const choice of ['crew', 'free', '__proto__', {}, null]) assert.equal(E.act(r, 'choose-reward', choice).ok, false); assert.equal(E.serialize(r), second);
});
test('card instance conservation holds after every action of complete upgrade and repair voyages', () => { invariants(completed); invariants(repaired); assert.equal(completed.stats.damageDealt, 124); assert.equal(repaired.stats.damageDealt, 124); assert.equal(completed.stats.upgraded, 1); assert.equal(repaired.stats.upgraded, 0); assert.equal(completed.rewardChoice, 'flare'); assert.equal(repaired.rewardChoice, 'fog'); });
test('persistent hull follows real damage and healing rather than resetting to maximum each fight', () => { for (const w of [completed, repaired]) assert.equal(w.player.hp, 54 - w.stats.damageTaken + w.stats.healed); assert.ok(completed.stats.damageTaken > 0); assert.ok(completed.player.hp < 54); assert.equal(completed.stats.encountersCleared, 3); });
test('read-only same-API demo legally completes multiple varied deterministic seeds', () => { for (const seed of [1, 2, 3, 4, 5, 100, 12345, 987654321, 4294967295]) voyage(seed); });
test('a genuinely reachable defensive 300-action voyage remains restorable and never yields an illegal planner action', () => {
  const w = fresh(1);
  while (w.phase === 'combat' && w.ledger.length < E.MAX_ACTIONS) {
    const incoming = E.incomingDamage(w), scored = E.legalPlays(w).map(payload => {
      const info = E.cardInfo(w, payload.cardId), target = w.enemies.find(enemy => enemy.id === payload.targetId); let score = 0;
      if (info.heal && w.player.hp < 54) score += 100;
      if (info.block && incoming > w.player.block) score += Math.min(info.block, incoming - w.player.block) * 4;
      if (info.weak && target && target.weak < 2) score += incoming * 2;
      if (info.draw && w.player.energy >= 2 && incoming > w.player.block) score += 8;
      return { payload, score };
    }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);
    const plan = scored.length ? { action: 'play', payload: scored[0].payload } : { action: 'end-turn' };
    assert.ok(E.act(w, plan.action, plan.payload).ok); invariants(w);
  }
  assert.equal(w.ledger.length, 300); assert.equal(w.phase, 'combat'); assert.ok(w.player.hp > 0); assert.equal(w.stats.damageDealt, 0); assert.ok(E.restore(E.serialize(w))); assert.equal(E.demoStep(w), null); const before = E.serialize(w); assert.equal(E.act(w, 'end-turn').ok, false); assert.equal(E.serialize(w), before); playthroughs.push({ mode: 'ordinary defensive action-limit boundary without damage cards', seed: w.seed, actionCount: w.ledger.length, endedTurns: w.stats.turns, finalHp: w.player.hp, stats: copy(w.stats) });
});
test('intentionally ending every turn produces actual damage loss with zero granted attacks or cards', () => {
  const w = fresh(); while (!w.paused) assert.ok(E.act(w, 'end-turn').ok); assert.equal(w.phase, 'lost'); assert.equal(w.player.hp, 0); assert.equal(w.stats.damageDealt, 0); assert.equal(w.stats.cardsPlayed, 0); assert.equal(w.stats.damageTaken, 54); assert.equal(w.stats.encountersCleared, 0); invariants(w); assert.ok(E.restore(E.serialize(w))); playthroughs.push({ mode: 'ordinary deliberate no-card loss', seed: w.seed, actionCount: w.ledger.length, stats: copy(w.stats) });
});
test('won and lost voyages auto-pause and refuse resume or further card route and reward actions', () => {
  const lost = fresh(); while (!lost.paused) E.act(lost, 'end-turn'); for (const w of [copy(completed), lost]) { const before = E.serialize(w); assert.equal(E.demoStep(w), null); for (const action of [['pause', false], ['end-turn'], ['choose-route', 'repair'], ['choose-reward', 'flare']]) assert.equal(E.act(w, ...action).ok, false); assert.equal(E.serialize(w), before); }
});
test('unknown draw grant heal energy damage teleport and time override actions never alter the voyage', () => {
  const w = fresh(), before = E.serialize(w); for (const action of ['draw', 'grant', 'heal', 'energy', 'damage', 'win', 'skip', 'time', '__proto__', null, 1]) assert.equal(E.act(w, action, { amount: 999 }).ok, false); assert.equal(E.serialize(w), before);
});
test('saved in-flight card order resources intent and upgraded instances restore exactly paused', () => {
  const w = copy(upgraded); E.act(w, 'end-turn'); const saved = E.serialize(w), restored = E.restore(saved); assert.ok(restored); assert.equal(restored.paused, true); assert.equal(E.serialize(restored), saved); assert.deepEqual(restored.hand, w.hand); assert.deepEqual(restored.enemies, w.enemies); assert.deepEqual(restored.cards, w.cards); assert.equal(E.act(restored, 'end-turn').ok, false); assert.equal(E.serialize(restored), saved);
});
test('resuming a real restored upgraded voyage reaches later reward and final victory with the same legal acts', () => {
  const w = E.restore(E.serialize(upgraded)); assert.ok(w); E.act(w, 'pause', false); reach(w, state => state.phase === 'won'); assert.equal(w.stats.encountersCleared, 3); assert.equal(w.stats.upgraded, 1); assert.equal(w.cards.length, 13); assert.ok(E.restore(E.serialize(w)));
});
test('canonical replay accepts reordered JSON keys but rejects invented extra fields', () => {
  const reversed = Object.fromEntries(Object.entries(copy(upgraded)).reverse()); assert.ok(E.restore(JSON.stringify(reversed))); bad(upgraded, w => w.debug = true); bad(upgraded, w => w.player.freeEnergy = 99);
});
test('strict restore rejects malformed oversized unsupported and noninteger seed data', () => { for (const text of [null, 1, '', '{', 'null', '[]', 'x'.repeat(120001)]) assert.equal(E.restore(text), null); bad(upgraded, w => w.version = 2); bad(upgraded, w => w.seed = 0); bad(upgraded, w => w.seed = 1.5); bad(upgraded, w => w.seed = 4294967296); bad(upgraded, w => w.seed = NaN); bad(upgraded, w => w.paused = 'yes'); });
test('strict replay rejects duplicated missing reordered or detached actual card instances and piles', () => { bad(upgraded, w => w.hand.push(w.hand[0])); bad(upgraded, w => w.draw.pop()); bad(upgraded, w => w.hand.reverse()); bad(upgraded, w => w.cards[0].id = 'free'); bad(upgraded, w => w.cards[0].type = 'flare'); bad(upgraded, w => w.exhaust.push('c999')); bad(upgraded, w => { const id = w.hand.pop(); w.discard.push(id); }); });
test('strict replay rejects forged energy hull block healing and combat statistics', () => { bad(upgraded, w => w.player.energy++); bad(upgraded, w => w.player.hp = 1); bad(upgraded, w => w.player.maxHp = 100); bad(upgraded, w => w.player.block = 99); bad(upgraded, w => w.stats.healed++); bad(upgraded, w => w.stats.damageDealt++); bad(upgraded, w => w.stats.cardsPlayed++); bad(upgraded, w => w.stats.draws++); });
test('strict replay rejects invented enemy damage blocks weakness strength and detached shown intent', () => { bad(upgraded, w => w.enemies[0].hp--); bad(upgraded, w => w.enemies[0].block++); bad(upgraded, w => w.enemies[0].weak = 5); bad(upgraded, w => w.enemies[0].strength++); bad(upgraded, w => w.enemies[0].intent.amount = 1); bad(upgraded, w => w.enemies[0].cursor++); bad(upgraded, w => w.enemies[0].id = 'e1-1'); });
test('strict replay rejects detached upgrades invented rewards and incorrect route decisions', () => { bad(upgraded, w => w.cards[1].upgraded = true); bad(upgraded, w => w.routeChoice = 'repair'); bad(upgraded, w => w.rewardChoice = 'fog'); bad(completed, w => w.cards.at(-1).type = 'fog'); bad(completed, w => w.stats.rewards = 2); bad(completed, w => w.stats.upgraded = 0); });
test('strict replay rejects changed RNG seed future shuffle and nonfinite numerical bodies', () => { bad(upgraded, w => w.rng++); bad(upgraded, w => w.seed++); bad(upgraded, w => w.player.hp = Infinity); bad(upgraded, w => w.turn = NaN); bad(upgraded, w => w.stats.blockedDamage = Infinity); });
test('strict replay rejects missing reordered forged illegal or paused-only ledger entries', () => { bad(upgraded, w => w.ledger.pop()); bad(upgraded, w => w.ledger.reverse()); bad(upgraded, w => w.ledger[0] = { type: 'grant', payload: 999 }); bad(upgraded, w => w.ledger.push({ type: 'pause', payload: true })); bad(upgraded, w => w.ledger[0].payload.cardId = 'c999'); bad(upgraded, w => w.ledger[0].extra = true); bad(upgraded, w => w.ledger = Array.from({ length: 301 }, () => ({ type: 'end-turn' }))); });
test('strict replay rejects forged encounter completion death phase selection and event output', () => { bad(upgraded, w => w.encounter = 2); bad(upgraded, w => w.phase = 'won'); bad(upgraded, w => w.selected = 'missing'); bad(upgraded, w => w.lastAction = { type: 'play', damage: 999 }); bad(completed, w => w.phase = 'combat'); bad(completed, w => w.stats.encountersCleared = 2); });
test('strict replay rejects detached oversized missing or edited battle log messages', () => { bad(upgraded, w => w.log[0].text = 'invented'); bad(upgraded, w => w.message = 'free win'); bad(upgraded, w => w.log = []); bad(upgraded, w => w.log[0].turn = 999); bad(upgraded, w => w.log.push({ text: 'x'.repeat(500) })); });
test('restore replay does not mutate source text world arrays or a separate ongoing voyage', () => { const a = copy(upgraded), b = fresh(12345), beforeA = E.serialize(a), beforeB = E.serialize(b); const restored = E.restore(beforeA); assert.ok(restored); restored.cards[0].upgraded = true; restored.hand.pop(); assert.equal(E.serialize(a), beforeA); assert.equal(E.serialize(b), beforeB); });
test('card helpers preserve meaningful upgraded text actual energy and legal target options', () => { assert.match(E.cardInfo(upgraded, 'c4').name, /\+/); assert.match(E.cardInfo(upgraded, 'c4').description, /14/); const w = fresh(1), options = E.legalPlays(w); assert.ok(options.length > 0); assert.ok(options.every(payload => E.canPlay(w, payload.cardId, payload.targetId) === '')); assert.equal(E.cardById(w, 'missing'), null); assert.equal(E.cardInfo(w, 'missing'), null); assert.match(E.objective(w), /1 \/ 3/); assert.match(E.status(w), /能量 3/); });

const report = { date: '2026-10-05', passed: failures.length === 0, count: checks.length, checks, failures, playthroughs, method: 'Production deterministic seed-based Fisher-Yates shuffle, real unique card instances and hand/draw/discard/exhaust conservation, three-energy legal card plays and actual enemy attack/guard/rally cycles. Every objective journey begins from a fresh dealt world and uses only public legal act calls; the production demo planner is read-only and supplies ordinary play/turn/route/reward intentions. Upgrade and repair routes plus flare/fog rewards are completed, multiple varied seeds win, and intentional ordinary end-turn-only play produces actual loss. No cards, energy, HP, enemy HP or objective completion are granted or overridden. Intermediate saves are restored through full canonical replay of the bounded legal action ledger, validating exact RNG, pile order, bodies, intent, resources, upgrades, rewards and logs. Malformed-save assertions alter copies solely to exercise rejection; they are never used for objective playthroughs.', commands: ['node tooling/check-direction-deck-rules.mjs'] };
fs.writeFileSync(path.join(project, 'notes/direction-deck-rules-20261005.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`${checks.length} deck rules checks passed; ${failures.length} failed`); if (failures.length) process.exitCode = 1;
