// NIGHT POST: one original finite case, reconstructed only through discovered evidence.
export const VERSION = 1;
export const MAX_ACTIONS = 4096;
export const MAX_SAVE_BYTES = 1000000;
export const SCENES = Object.freeze([
  Object.freeze({ id: 'station', name: '旧站候车室', subtitle: '停摆的钟与归还的空邮袋', clueIds: Object.freeze(['clock', 'timetable', 'bag']) }),
  Object.freeze({ id: 'office', name: '值班邮务室', subtitle: '交接记录留下谁的决定', clueIds: Object.freeze(['dispatch', 'note', 'key']) }),
  Object.freeze({ id: 'quay', name: '潮线栈桥', subtitle: '另一条航路与收件回执', clueIds: Object.freeze(['tide', 'receipt', 'letter']) })
]);
const clue = item => Object.freeze({ ...item, hotspot: Object.freeze(item.hotspot) });
export const CLUES = Object.freeze({
  clock: clue({ id: 'clock', scene: 'station', name: '停摆的挂钟', hotspot: { x: .65, y: .155 }, text: '挂钟停在 22:10。', detail: '钟旁的停电检修条写着：22:10 断电后钟机未再运转。这个读数不能证明邮袋或列车的离开时间，也不反映后来空邮袋归还的时间。' }),
  timetable: clue({ id: 'timetable', scene: 'station', name: '末班列车表', hotspot: { x: .66, y: .35 }, text: '末班列车于 21:40 开出，仅往西港；东岸支线已停开。', detail: '站务员在发车栏签了确认：21:40 末班列车已开出，目的地西港，此后无列车班次。东岸支线当晚已封闭；这趟西港列车不能送达东岸安置站。22:10 只是停摆钟面上的读数。' }),
  bag: clue({ id: 'bag', scene: 'station', name: '归还的蓝锚空邮袋', hotspot: { x: .75, y: .70 }, text: '22:30 送回的空邮袋 · 蓝锚东岸批次。', detail: '归还条注明空袋于 22:30 送回旧站。袋签留存了当晚的东岸批次和交接检查：交付时封条完整。现在袋中已无信件；这份留存信息可以与收件站回执核对。' }),
  dispatch: clue({ id: 'dispatch', scene: 'office', name: '签出交接册', hotspot: { x: .48, y: .60 }, text: '21:25，值班员林岚签出蓝锚邮袋，转往栈桥。', detail: '交接册由林岚署名，目的栏写着“转栈桥”。周远的名字没有出现在这一栏；他负责后段渡船交付。' }),
  note: clue({ id: 'note', scene: 'office', name: '林岚的便签', hotspot: { x: .89, y: .40 }, text: '“东岸支线封闭，赶潮线前的渡船。我已告知收件站。”', detail: '便签落款林岚，与交接册署名一致。她改变了蓝锚邮袋的运送安排，并先通知收件站。封闭的是东岸支线，西港列车仍照常开出；便签未写出船的具体离港时刻。' }),
  key: clue({ id: 'key', scene: 'office', name: '封存的北仓钥匙', hotspot: { x: .20, y: .84 }, text: '北仓钥匙于 21:00 封存，之后无人领取。', detail: '领用表的后续栏为空，北仓入库簿也没有蓝锚邮袋。这条记录可以排除把邮袋送进北仓的解释，不能当作一次运送时间。' }),
  tide: clue({ id: 'tide', scene: 'quay', name: '临时渡船公告', hotspot: { x: .25, y: .65 }, text: '赶潮临时渡船于 21:35 出港。', detail: '栈桥公告的当晚离港栏写着 21:35。船上允许携带邮袋；公告与候车室的末班列车记录是两条不同的交通线。' }),
  receipt: clue({ id: 'receipt', scene: 'quay', name: '东岸收件回执', hotspot: { x: .57, y: .63 }, text: '21:50，东岸安置站收到蓝锚邮袋，渡船员周远交付。', detail: '回执列明东岸批次，交付检查为封条完整，收件单位是东岸安置站。周远是交付人；回执没有说他决定了改道。信件取出后，空袋另于 22:30 送回旧站。' }),
  letter: clue({ id: 'letter', scene: 'quay', name: '等回音的来信', hotspot: { x: .83, y: .76 }, text: '“路封了，也请把报平安的信送到安置站。”', detail: '来信人只希望东岸安置站的人收到平安消息。查明邮袋去向后，可以正式归档保存交接记录，也可以给来信人回信，告诉对方消息已经送达。' })
});
const claim = item => Object.freeze({ ...item, options: Object.freeze(item.options.map(Object.freeze)), requiredEvidence: Object.freeze(item.requiredEvidence) });
export const CLAIMS = Object.freeze({
  actor: claim({ id: 'actor', name: '谁决定改道', question: '是谁决定把蓝锚邮袋转往栈桥？', options: [{ value: 'lin', label: '林岚 · 值班员' }, { value: 'zhou', label: '周远 · 渡船员' }, { value: 'pei', label: '裴宁 · 北仓保管员' }], answer: 'lin', requiredEvidence: ['dispatch', 'note'] }),
  route: claim({ id: 'route', name: '走哪条交通线', question: '蓝锚邮袋经哪一班交通工具离港？', options: [{ value: 'ferry', label: '21:35 临时渡船' }, { value: 'train', label: '22:10 列车' }, { value: 'warehouse', label: '21:00 北仓转运' }], answer: 'ferry', requiredEvidence: ['timetable', 'tide'] }),
  destination: claim({ id: 'destination', name: '最后送到哪里', question: '哪一个地点实际收到蓝锚邮袋？', options: [{ value: 'east', label: '东岸安置站' }, { value: 'north', label: '北仓' }, { value: 'tunnel', label: '旧隧道收件点' }], answer: 'east', requiredEvidence: ['bag', 'receipt'] })
});
export const ENDINGS = Object.freeze([
  Object.freeze({ id: 'archive', name: '正式归档', description: '保存交接记录，让这次临时改道有据可查。', text: '林岚改道，21:35 的渡船载走蓝锚邮袋，东岸安置站在 21:50 收到它。你把证据与交接时间归入夜港档案。下一位值班人不必再猜钟面上的时间。' }),
  Object.freeze({ id: 'reply', name: '给来信人回信', description: '告诉等待回音的人，平安消息已经送达。', text: '你写下回信：封路没有拦住这封平安信。林岚安排改道，周远随 21:35 的渡船交付邮袋，东岸安置站已经收到。窗外夜色未散，来信的人终于有了回音。' })
]);
const plain = value => value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const own = (object, key) => typeof key === 'string' && Object.hasOwn(object, key);
const clone = value => structuredClone(value);
const sceneById = id => SCENES.find(scene => scene.id === id);
const endingById = id => ENDINGS.find(ending => ending.id === id);
const allVerified = w => Object.keys(CLAIMS).every(id => w.hypotheses[id].verified);
function message(w, text) { w.message = text; w.log.push({ action: w.actions, text }); if (w.log.length > 24) w.log.shift(); }
function record(w, type, payload, text) { const entry = { type }; if (payload !== undefined) entry.payload = clone(payload); w.ledger.push(entry); w.actions = w.ledger.length; if (text) message(w, text); }
export function createWorld() {
  return { version: VERSION, phase: 'investigating', paused: true, scene: 'station', inspected: [], selectedClue: null, hypotheses: Object.fromEntries(Object.keys(CLAIMS).map(id => [id, { value: null, evidence: [], verified: false }])), ending: null, actions: 0, stats: { inspections: 0, verifications: 0, failedVerifications: 0 }, ledger: [], log: [], message: '夜港收到一只送回的空邮袋，但当晚的临时改道记录缺了一段。开始调查，查清谁改道、走哪条航路、送到了哪里。' };
}
export function status(w) {
  const verified = Object.keys(CLAIMS).filter(id => w.hypotheses[id].verified);
  return { phase: w.phase, paused: w.paused, found: w.inspected.length, totalClues: 9, verified, readyToConclude: allVerified(w) && w.inspected.includes('letter'), ending: endingById(w.ending) || null, objective: `调查线索 ${w.inspected.length} / 9 · 已验证事实 ${verified.length} / 3` };
}
export function act(w, type, payload) {
  const reject = reason => ({ ok: false, reason });
  if (!w || typeof type !== 'string') return reject('无法识别此操作。');
  if (type === 'pause') {
    if (typeof payload !== 'boolean') return reject('暂停操作需要明确的布尔值。');
    if (!payload && w.phase === 'resolved') return reject('此案已经结案，请开启新的调查。');
    w.paused = payload; return { ok: true };
  }
  if (!['scene', 'inspect', 'selectClue', 'setHypothesis', 'pin', 'unpin', 'verify', 'chooseEnding', 'submit'].includes(type)) return reject('无法识别此操作。');
  if (w.paused) return reject('请先继续调查。');
  if (w.phase !== 'investigating') return reject('此案已经结案，请开启新的调查。');
  if (w.actions >= MAX_ACTIONS) return reject('本轮操作记录已达上限，请开启新的调查。');
  if (type === 'scene') {
    const scene = sceneById(payload); if (!scene) return reject('请选择旧站、邮务室或栈桥。');
    if (w.scene === payload) return { ok: true, unchanged: true };
    w.scene = payload; w.selectedClue = null; record(w, type, payload, `来到${scene.name}。查看这里留下的三处记录。`); return { ok: true };
  }
  if (type === 'inspect') {
    if (!own(CLUES, payload)) return reject('这里没有这条线索。');
    const clue = CLUES[payload]; if (clue.scene !== w.scene) return reject('请先来到这条线索所在的场景。');
    if (w.inspected.includes(payload)) return reject('这条线索已经记录，可以从手记中重阅。');
    w.inspected.push(payload); w.selectedClue = payload; w.stats.inspections++; record(w, type, payload, `记录：${clue.name}。${clue.text}`); return { ok: true, clue: clone(clue) };
  }
  if (type === 'selectClue') {
    if (!own(CLUES, payload) || !w.inspected.includes(payload)) return reject('只能重阅已经找到的线索。');
    if (w.selectedClue === payload) return { ok: true, unchanged: true };
    w.selectedClue = payload; record(w, type, payload, `重阅：${CLUES[payload].name}。`); return { ok: true, clue: clone(CLUES[payload]) };
  }
  if (['setHypothesis', 'pin', 'unpin'].includes(type)) {
    const expected = type === 'setHypothesis' ? ['claimId', 'value'] : ['claimId', 'clueId'];
    if (!plain(payload) || Object.keys(payload).length !== 2 || expected.some(key => !Object.hasOwn(payload, key)) || !own(CLAIMS, payload.claimId)) return reject('请选择一项待证事实与有效内容。');
    const id = payload.claimId, hypothesis = w.hypotheses[id], model = CLAIMS[id];
    if (type === 'setHypothesis') {
      if (payload.value !== null && !model.options.some(option => option.value === payload.value)) return reject('这个推断不在本案的可选解释中。');
      if (hypothesis.value === payload.value) return { ok: true, unchanged: true };
      hypothesis.value = payload.value; hypothesis.verified = false; w.ending = null; record(w, type, payload, `修改“${model.name}”的推断。需要重新验证。`); return { ok: true };
    }
    if (!own(CLUES, payload.clueId) || !w.inspected.includes(payload.clueId)) return reject('请先找到这条证据。');
    if (type === 'pin') {
      if (hypothesis.evidence.includes(payload.clueId)) return reject('同一条证据只能关联一次。');
      if (hypothesis.evidence.length >= 2) return reject('每项事实最多关联两条证据；请先移除一条。');
      hypothesis.evidence.push(payload.clueId);
    } else {
      if (!hypothesis.evidence.includes(payload.clueId)) return reject('这条证据尚未关联到该事实。');
      hypothesis.evidence.splice(hypothesis.evidence.indexOf(payload.clueId), 1);
    }
    hypothesis.verified = false; w.ending = null; record(w, type, payload, `${type === 'pin' ? '关联' : '移除'}证据：${CLUES[payload.clueId].name}。需要重新验证“${model.name}”。`); return { ok: true };
  }
  if (type === 'verify') {
    if (!own(CLAIMS, payload)) return reject('请选择有效的待证事实。');
    const hypothesis = w.hypotheses[payload], model = CLAIMS[payload];
    if (hypothesis.value === null || hypothesis.evidence.length !== 2) return reject('先选择一个推断，并关联两条已发现的证据。');
    if (hypothesis.verified) return { ok: true, verified: true, unchanged: true };
    const verified = hypothesis.value === model.answer && model.requiredEvidence.every(id => hypothesis.evidence.includes(id));
    hypothesis.verified = verified; w.stats.verifications++; if (!verified) w.stats.failedVerifications++;
    const reason = verified ? `“${model.name}”已由两条记录交叉验证。` : '这组推断与证据尚不能互相支持。重阅记录，调整解释或更换证据后再试。';
    record(w, type, payload, reason); return { ok: true, verified, reason };
  }
  if (type === 'chooseEnding') {
    if (!endingById(payload)) return reject('请选择正式归档或给来信人回信。');
    if (!allVerified(w) || !w.inspected.includes('letter')) return reject('先验证三项事实，并找到那封等待回音的来信。');
    if (w.ending === payload) return { ok: true, unchanged: true };
    w.ending = payload; record(w, type, payload, `准备${endingById(payload).name}。确认后才会结案。`); return { ok: true };
  }
  if (payload !== undefined) return reject('结案确认不接受额外内容。');
  if (!allVerified(w) || !w.inspected.includes('letter') || !endingById(w.ending)) return reject('先完成三项事实验证，找到来信，并选择结案方式。');
  w.phase = 'resolved'; w.paused = true; record(w, type, undefined, endingById(w.ending).text); return { ok: true, ending: clone(endingById(w.ending)) };
}
export function demoPlanner(w) {
  if (!w || w.paused || w.phase !== 'investigating' || w.actions >= MAX_ACTIONS) return null;
  for (const scene of SCENES) {
    const missing = scene.clueIds.find(id => !w.inspected.includes(id));
    if (missing) return w.scene !== scene.id ? { action: 'scene', payload: scene.id } : { action: 'inspect', payload: missing };
  }
  for (const id of Object.keys(CLAIMS)) {
    const model = CLAIMS[id], hypothesis = w.hypotheses[id];
    if (hypothesis.verified) continue;
    if (hypothesis.value !== model.answer) return { action: 'setHypothesis', payload: { claimId: id, value: model.answer } };
    const wrong = hypothesis.evidence.find(clueId => !model.requiredEvidence.includes(clueId));
    if (wrong) return { action: 'unpin', payload: { claimId: id, clueId: wrong } };
    const missing = model.requiredEvidence.find(clueId => !hypothesis.evidence.includes(clueId));
    if (missing) return { action: 'pin', payload: { claimId: id, clueId: missing } };
    return { action: 'verify', payload: id };
  }
  if (!w.ending) return { action: 'chooseEnding', payload: 'reply' };
  return { action: 'submit' };
}
export const demoStep = demoPlanner;
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (plain(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
// All stored discoveries, facts and endings must be the result of the supplied
// legal action history. This is deterministic validation, not authentication.
export function serialize(w) { return JSON.stringify({ ...w, paused: true }); }
export function restore(saved) {
  try {
    if (typeof saved !== 'string' || saved.length > MAX_SAVE_BYTES || new TextEncoder().encode(saved).byteLength > MAX_SAVE_BYTES) return null;
    const data = JSON.parse(saved);
    if (!plain(data) || data.version !== VERSION || typeof data.paused !== 'boolean' || !Array.isArray(data.ledger) || data.ledger.length > MAX_ACTIONS) return null;
    const w = createWorld(); w.paused = false;
    for (const entry of data.ledger) {
      if (!plain(entry) || typeof entry.type !== 'string' || entry.type === 'pause' || Object.keys(entry).some(key => !['type', 'payload'].includes(key)) || !act(w, entry.type, entry.payload).ok) return null;
    }
    w.paused = true;
    if (canonical(w) !== canonical({ ...data, paused: true })) return null;
    return clone(w);
  } catch { return null; }
}
