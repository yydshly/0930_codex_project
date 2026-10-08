import {JOURNAL_CATEGORIES, PROJECT_JOURNAL_ENTRIES} from './project-journal-data.js';
import {JOURNAL_KEY, readJournal} from './project-journal-store.js';
import {collectOverviewRecords, filterOverviewRecords} from './project-overview-records.js';
import {PROJECT_OVERVIEW, PROJECT_STAGES, PROJECT_CAPABILITIES, RESEARCH_METHODS,
  PROJECT_ROADMAP, PROJECT_RESOURCES, LATEST_AUDIT} from './project-overview-data.js';

const $ = selector => document.querySelector(selector);
const categories = new Map(JOURNAL_CATEGORIES.map(item => [item.id, item.label]));
const dates = new Intl.DateTimeFormat('zh-CN', {timeZone: 'Asia/Shanghai', dateStyle: 'medium'});
function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function linkTo(source) {
  if (!source || typeof source.url !== 'string' || !source.url.trim() ||
    /[\u0000-\u0020<>]/.test(source.url) ||
    (/^[a-z][a-z\d+.-]*:/i.test(source.url) && !/^https?:\/\//i.test(source.url))) return null;
  const link = node('a', '', `${source.label || source.url} ↗`);
  link.href = source.url;
  if (/^https?:\/\//i.test(source.url)) {link.target = '_blank'; link.rel = 'noopener noreferrer';}
  return link;
}
function appendBody(parent, body) {
  for (const paragraph of Array.isArray(body) ? body : [body]) {
    if (typeof paragraph === 'string' && paragraph) parent.append(node('p', '', paragraph));
  }
}
function appendLinks(parent, sources = []) {
  const links = node('div', 'card-links');
  for (const source of sources) {const link = linkTo(source); if (link) links.append(link);}
  if (links.childElementCount) parent.append(links);
}
function card(item, className) {
  const article = node('article', className);
  if (item.id) article.id = `overview-${item.id}`;
  if (item.status) article.append(node('span', 'tag', item.status));
  article.append(node('h3', '', item.title));
  appendBody(article, item.body);
  if (item.boundary) appendBody(article, item.boundary);
  if (item.input) article.append(node('p', 'control-note', `需要的输入：${item.input}`));
  if (item.scope) article.append(node('p', 'control-note', `应用边界：${item.scope}`));
  appendLinks(article, item.links);
  return article;
}

$('.hero-description').textContent = PROJECT_OVERVIEW.summary;
if (PROJECT_OVERVIEW.goal) {
  const objective = node('p', 'hero-description', PROJECT_OVERVIEW.goal);
  $('.hero-copy').insertBefore(objective, $('.hero-actions'));
}
$('#overview-method-count').textContent = RESEARCH_METHODS.length;
$('#overview-milestones').replaceChildren(...PROJECT_STAGES.map(item => {
  const article = card({...item, id: `stage-${item.id}`}, 'milestone');
  for (const id of item.journalIds || []) {
    const entry = PROJECT_JOURNAL_ENTRIES.find(row => row.id === id);
    if (!entry) continue;
    const link = node('a', 'record-shortcut', '查看原始记录');
    link.href = `#record-${id}`;
    link.addEventListener('click', () => revealRecord(id));
    article.append(link);
    break;
  }
  return article;
}));
for (const [selector, entries, className] of [
  ['#overview-capabilities', PROJECT_CAPABILITIES, 'capability-card'],
  ['#overview-methods', RESEARCH_METHODS, 'method-card'],
  ['#overview-roadmap', PROJECT_ROADMAP, 'roadmap-item'],
  ['#overview-audit', [LATEST_AUDIT], 'overview-card']
]) $(selector).replaceChildren(...entries.map(item => card(item, className)));
const auditItems = node('ul');
for (const finding of LATEST_AUDIT.findings) auditItems.append(node('li', '', finding));
$('#overview-audit article').append(auditItems);
$('#overview-capabilities').before(node('p', 'control-note', PROJECT_OVERVIEW.evidencePolicy));
$('.preview-controls').append(node('p', 'control-note', PROJECT_OVERVIEW.current));

const resources = node('details', 'resource-library');
resources.append(node('summary', '', '原始资料与实验入口'));
const resourceCards = node('div', 'capability-grid');
for (const item of PROJECT_RESOURCES) resourceCards.append(card({...item, id: `resource-${item.id}`}, 'overview-card'));
resources.append(resourceCards);
$('#overview-methods').after(resources);

const historyNote = node('p', 'control-note', '完整保留各阶段原文。记录里的“已完成”、测试数量和限制描述属于当时状态；当前能力以本页“已有能力与当前边界”为准。');
$('.record-toolbar').after(historyNote);
const storageNote = node('p', 'control-note');
storageNote.hidden = true;
historyNote.after(storageNote);
let records = [];
function renderRecords() {
  const matches = filterOverviewRecords(records, {query: $('#overview-query').value, category: $('#overview-category').value});
  $('#overview-record-count').textContent = `${matches.length} / ${records.length} 条`;
  const articles = matches.map(entry => {
    const detail = node('details', 'record-card');
    detail.id = `record-${entry.id}`;
    const summary = node('summary');
    const label = node('span', 'record-meta', `${categories.get(entry.category) || entry.category} · ${entry.custom ? '我的补充' : '阶段原文'}`);
    summary.append(label, node('strong', '', entry.title));
    detail.append(summary);
    const content = node('div', 'record-body');
    if (entry.custom) content.append(node('p', 'control-note', `更新于 ${dates.format(entry.updatedAt)} · 北京时间`));
    else if (entry.status) content.append(node('p', 'control-note', `当时状态：${entry.status}`));
    appendBody(content, entry.body);
    appendLinks(content, entry.links);
    detail.append(content);
    return detail;
  });
  $('#overview-records').replaceChildren(...(articles.length ? articles : [node('p', 'empty-state', '没有匹配记录。试试其他关键词，或切回全部类型。')]));
}
function readAllRecords() {
  let result;
  try {result = readJournal(window.localStorage);} catch {result = {entries: [], ok: false, error: '无法读取本机补充，内置完整记录仍可查看。'};}
  records = collectOverviewRecords(PROJECT_JOURNAL_ENTRIES, result.entries);
  $('#overview-total-records').textContent = records.length;
  storageNote.textContent = result.error || '';
  storageNote.hidden = result.ok;
  renderRecords();
}
function revealRecord(id) {
  $('#overview-query').value = '';
  $('#overview-category').value = 'all';
  renderRecords();
  const record = document.getElementById(`record-${id}`);
  if (record) record.open = true;
}
readAllRecords();
$('#overview-query').addEventListener('input', renderRecords);
$('#overview-category').addEventListener('change', renderRecords);
window.addEventListener('storage', event => {if (event.key === JOURNAL_KEY || event.key === null) readAllRecords();});
window.addEventListener('hashchange', () => {
  if (location.hash.startsWith('#record-')) revealRecord(location.hash.slice(8));
});
if (location.hash.startsWith('#record-')) revealRecord(location.hash.slice(8));

// Start the full-resolution local asset only when its preview enters view.
// Styling here is temporary: none of the artwork or companion stores are written.
const preview = $('#overview-plush-preview');
const canvas = $('#overview-plush-canvas');
const status = $('#overview-plush-status');
const buttons = [...document.querySelectorAll('[data-preview-action]')];
const sliders = [$('#overview-length'), $('#overview-curl')];
let runtime = null, loading = false, inView = false, disposed = false;
function enableControls(enabled) {for (const control of [...buttons, ...sliders]) control.disabled = !enabled;}
enableControls(false);
async function startPreview() {
  if (loading || runtime || disposed) return;
  loading = true;
  status.textContent = '正在加载本地原作三维资产…';
  let disposePending = null;
  try {
    const [THREE, {OrbitControls}, {EffectComposer}, {RenderPass}, {OutputPass}, {ensureReferencePlush}] = await Promise.all([
      import('three'), import('three/addons/controls/OrbitControls.js'),
      import('three/addons/postprocessing/EffectComposer.js'), import('three/addons/postprocessing/RenderPass.js'),
      import('three/addons/postprocessing/OutputPass.js'), import('./reference-plush-asset.js')
    ]);
    if (disposed) return;
    const renderer = new THREE.WebGLRenderer({canvas, alpha: true, antialias: false});
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setClearColor(0, 0);
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 1, .05, 100);
    const target = new THREE.WebGLRenderTarget(1, 1, {type: renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType});
    const composer = new EffectComposer(renderer, target), renderPass = new RenderPass(scene, camera), outputPass = new OutputPass();
    composer.addPass(renderPass); composer.addPass(outputPass);
    const actor = new THREE.Group(); scene.add(actor);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true; controls.enablePan = false;
    controls.minDistance = 3; controls.maxDistance = 9; controls.autoRotateSpeed = 1.25;
    let dirty = true, frame = 0, bounceStart = -10000;
    function fitFront() {
      const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      const distance = Math.max(4.5, 1.5 / (tangent * camera.aspect));
      controls.target.set(0, -.02, 0); camera.position.set(0, .01, distance); controls.update(); dirty = true;
    }
    function resize() {
      const {width, height} = preview.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false); composer.setSize(width, height);
      camera.aspect = width / height; camera.updateProjectionMatrix(); fitFront();
    }
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(preview); resize();
    disposePending = () => {controls.dispose(); resizeObserver.disconnect(); renderPass.dispose(); outputPass.dispose(); composer.dispose(); renderer.dispose();};
    controls.addEventListener('change', () => {dirty = true;});
    const asset = await ensureReferencePlush({renderer, scene, onDirty: () => {dirty = true;}, onProgress: progress => {
      if (progress.phase === 'loading') status.textContent = `正在加载本地原作 · ${progress.chunksLoaded || 0} / ${progress.chunksTotal} 块`;
    }});
    if (disposed) {asset.dispose(); disposePending(); disposePending = null; return;}
    actor.add(asset.group);
    runtime = {asset, controls, renderer, composer, resizeObserver, fitFront,
      bounce: () => {bounceStart = performance.now(); dirty = true;},
      dispose: () => {cancelAnimationFrame(frame); asset.dispose(); controls.dispose(); resizeObserver.disconnect(); renderPass.dispose(); outputPass.dispose(); composer.dispose(); renderer.dispose();}};
    disposePending = null;
    preview.classList.add('is-loaded');
    status.textContent = `本地完整 3D 资产 · ${new Intl.NumberFormat('zh-CN').format(asset.count)} 个高斯 · 拖动旋转 / 滚轮缩放`;
    enableControls(true);
    function draw(now) {
      if (disposed) return;
      frame = requestAnimationFrame(draw);
      if (!inView || document.hidden) return;
      controls.update();
      const elapsed = (now - bounceStart) / 1000;
      const height = elapsed >= 0 && elapsed < 1.25 ? Math.abs(Math.sin(elapsed * 7.5)) * .3 * Math.exp(-elapsed * 2) : 0;
      if (actor.position.y !== height) {actor.position.y = height; dirty = true;}
      if (dirty || controls.autoRotate) {composer.render(); dirty = false;}
    }
    draw(performance.now());
    canvas.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') {fitFront(); return;}
      const offset = camera.position.clone().sub(controls.target), spherical = new THREE.Spherical().setFromVector3(offset);
      if (event.key === 'ArrowLeft') spherical.theta += .1;
      if (event.key === 'ArrowRight') spherical.theta -= .1;
      if (event.key === 'ArrowUp') spherical.phi -= .1;
      if (event.key === 'ArrowDown') spherical.phi += .1;
      spherical.makeSafe(); camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical)); controls.update(); dirty = true;
    });
  } catch (error) {
    disposePending?.();
    console.error('Project overview preview:', error);
    status.textContent = '三维资产暂未加载成功。可以重试，或从下方进入已经接入的工作台。';
    const retry = node('button', 'button secondary', '重试三维预览'); retry.type = 'button';
    retry.addEventListener('click', () => {retry.remove(); startPreview();});
    $('.preview-actions').after(retry);
  } finally {loading = false;}
}
const previewObserver = new IntersectionObserver(entries => {
  inView = entries.some(entry => entry.isIntersecting);
  if (inView) startPreview();
}, {threshold: .02});
previewObserver.observe(preview);
function updateStyle() {
  $('#overview-length-value').textContent = `${Math.round(Number(sliders[0].value) * 100)}%`;
  $('#overview-curl-value').textContent = `${Math.round(Number(sliders[1].value) * 100)}%`;
  sliders[0].setAttribute('aria-valuetext', $('#overview-length-value').textContent);
  sliders[1].setAttribute('aria-valuetext', $('#overview-curl-value').textContent);
  runtime?.asset.setFur({length: Number(sliders[0].value), curl: Number(sliders[1].value), groom: []});
}
updateStyle();
for (const slider of sliders) slider.addEventListener('input', updateStyle);
for (const button of buttons) button.addEventListener('click', () => {
  if (!runtime) return;
  const action = button.dataset.previewAction;
  if (action === 'spin') {runtime.controls.autoRotate = !runtime.controls.autoRotate; button.setAttribute('aria-pressed', String(runtime.controls.autoRotate));}
  if (action === 'bounce') runtime.bounce();
  if (action === 'front' || action === 'reset') {
    runtime.controls.autoRotate = false;
    document.querySelector('[data-preview-action="spin"]').setAttribute('aria-pressed', 'false');
    runtime.fitFront();
  }
  if (action === 'reset') {sliders[0].value = '1'; sliders[1].value = '0'; updateStyle();}
});
window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  disposed = true; previewObserver.disconnect(); runtime?.dispose();
});
