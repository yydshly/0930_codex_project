import { useEffect, useRef, useState } from 'react';
import { createRidgeScene } from './scene/renderer.js';
import { LANDMARKS, TRAILS, WORLD_BOUNDS } from './scene/exploration-map.js';
import { routeGuidance } from './scene/exploration-navigation.js';

const defaults = () => ({
  weather: 'storm', fog: .58, wind: 1, sun: .32, camera: 'follow', paused: false,
  layers: { terrain: true, grass: true, clouds: true, fog: true },
  rideMode: 'manual', photo: false, photoFov: 55, photoLook: 'natural', destination: null, inputBlocked: false, sound: false,
});
const weatherNames = { storm: '山雨欲来', mist: '晨间薄雾', sunset: '云隙夕光' };
const layerNames = { grass: '风动草地', clouds: '山腰低云', fog: '远景空气透视' };
const movementKeys = { KeyW: 'forward', ArrowUp: 'forward', KeyS: 'backward', ArrowDown: 'backward', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', ShiftLeft: 'sprint', ShiftRight: 'sprint' };
const photoLooks = { natural: '原色', warm: '暖调', cool: '冷调' };
const meters = value => `${Math.round(value || 0)} m`;

function directionTo(point, stats, arrived = false) {
  if (!stats || !point) return '等待骑手位置';
  if (arrived) return '已到达附近';
  const yaw = Math.atan2(-(point.x - stats.x), -(point.z - stats.z));
  const delta = Math.atan2(Math.sin(yaw - stats.heading), Math.cos(yaw - stats.heading));
  const degrees = Math.abs(delta) * 180 / Math.PI;
  if (degrees > 135) return '身后';
  if (degrees < 25) return '前方';
  return delta > 0 ? (degrees < 70 ? '左前方' : '左侧') : (degrees < 70 ? '右前方' : '右侧');
}

const nearbyPlace = stats => {
  const place = LANDMARKS.find(landmark => landmark.id === stats?.nearest?.id);
  return place && stats.nearest.distance <= place.radius + 3 ? place : null;
};
const placeNotes = {
  creek: ['浅溪从山肩流向左侧谷地，水纹沿着石滩缓缓移动。', '溪边的矮草和湿石接住冷光，转动镜头可以看到小径穿过浅水。'],
  camp: ['帐篷架在木板上，石围火坑旁留着一段坐木。', '火焰和细烟随风轻轻变化，林边小径从营地继续接回山脊。'],
  lookout: ['木质观景台立在山肩，旁边的石堆标出停留的位置。', '顺着山脊望向远处，雪峰、低云和近坡形成不同距离的层次。'],
};

function Range({ name, value, min = 0, max = 1, step = .01, unit = '%', onChange }) {
  const display = unit === '%' ? Math.round(value / max * 100) : Math.round(value);
  return <label className="range-row"><span>{name}<output>{display}{unit}</output></span><input aria-label={name} type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} /></label>;
}

function ExplorationMap({ stats, destination }) {
  const canvas = useRef(null);
  useEffect(() => {
    const context = canvas.current.getContext('2d');
    const width = 700, height = 300, margin = 30;
    const scaleX = (width - margin * 2) / (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX);
    const scaleZ = (height - margin * 2) / (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ);
    const project = point => [margin + (point.x - WORLD_BOUNDS.minX) * scaleX, margin + (point.z - WORLD_BOUNDS.minZ) * scaleZ];
    context.setTransform(2, 0, 0, 2, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#182728'; context.fillRect(0, 0, width, height);
    context.strokeStyle = '#91a59619'; context.lineWidth = 1;
    for (let x = margin; x <= width - margin; x += (width - margin * 2) / 5) { context.beginPath(); context.moveTo(x, margin); context.lineTo(x, height - margin); context.stroke(); }
    for (let y = margin; y <= height - margin; y += (height - margin * 2) / 5) { context.beginPath(); context.moveTo(margin, y); context.lineTo(width - margin, y); context.stroke(); }
    for (const trail of TRAILS) {
      context.strokeStyle = '#b5b28a9c'; context.lineWidth = 3; context.lineCap = 'round'; context.lineJoin = 'round'; context.beginPath();
      trail.points.forEach((point, index) => { const [x, y] = project(point); if (index) context.lineTo(x, y); else context.moveTo(x, y); }); context.stroke();
    }
    const guidance = stats && destination ? routeGuidance(stats, destination) : null;
    if (guidance?.points?.length) {
      context.strokeStyle = '#efd99c'; context.lineWidth = 4; context.beginPath();
      const roadPoints = guidance.offTrailDistance > .01 ? guidance.points.slice(1) : guidance.points;
      roadPoints.forEach((point, index) => { const [x, y] = project(point); if (index) context.lineTo(x, y); else context.moveTo(x, y); });
      context.stroke();
      if (guidance.offTrailDistance > .01 && guidance.points[1]) {
        context.setLineDash([4, 6]); context.strokeStyle = '#eadcb49c'; context.lineWidth = 2;
        context.beginPath(); context.moveTo(...project(stats)); context.lineTo(...project(guidance.points[1])); context.stroke(); context.setLineDash([]);
      }
    }
    for (const landmark of LANDMARKS) {
      const [x, y] = project(landmark), visited = stats?.visited?.includes(landmark.id);
      context.beginPath(); context.arc(x, y, landmark.id === destination ? 9 : 6, 0, Math.PI * 2);
      context.fillStyle = visited ? '#c9d4b8' : '#314c44'; context.strokeStyle = landmark.id === destination ? '#efdb9e' : '#b9cbb5'; context.lineWidth = 2; context.fill(); context.stroke();
      context.font = '18px Arial,"Microsoft YaHei",sans-serif'; context.fillStyle = '#d9e4d3'; context.fillText(landmark.name, x + 13, y + 6);
    }
    if (stats) {
      const [x, y] = project(stats);
      // Use the same projected axes for the heading and the route geometry.
      const mapHeading = Math.atan2(-Math.sin(stats.heading) * scaleX, Math.cos(stats.heading) * scaleZ);
      context.save(); context.translate(x, y); context.rotate(mapHeading);
      context.fillStyle = '#f1dea6'; context.strokeStyle = '#142222'; context.lineWidth = 2;
      context.beginPath(); context.moveTo(0, -10); context.lineTo(-6, 7); context.lineTo(0, 4); context.lineTo(6, 7); context.closePath(); context.fill(); context.stroke(); context.restore();
    }
    context.fillStyle = '#aebfb0'; context.font = '14px Arial,"Microsoft YaHei",sans-serif'; context.fillText('N · 山脊深处', width - 119, 23); context.fillText('当前位置', 22, height - 17);
    context.fillStyle = '#f1dea6'; context.beginPath(); context.arc(13, height - 21, 3, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#aebfb0'; context.fillText('金色 · 所选小径路线', width - 142, height - 17);
  }, [stats, destination]);
  return <canvas ref={canvas} width="1400" height="600" className="exploration-map" role="img" aria-label="山脊探索地图：金色箭头是骑手，小径连接溪流、营地和观景点" />;
}

export function App() {
  const mount = useRef(null), api = useRef(null), settings = useRef(defaults());
  const state = useRef(null), held = useRef(new Map()), photoMemory = useRef(null), dialogRef = useRef(null), soundRequest = useRef(0), soundPending = useRef(false);
  const analysisTrigger = useRef(null), exportTrigger = useRef(null), mapTrigger = useRef(null), previousVisited = useRef(null);
  const [params, setParams] = useState(defaults), [stats, setStats] = useState(null);
  const [error, setError] = useState(''), [immersive, setImmersive] = useState(false), [analysis, setAnalysis] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false), [mapOpen, setMapOpen] = useState(false), [exported, setExported] = useState(null), [discovery, setDiscovery] = useState(null);
  const [landmarkOpen, setLandmarkOpen] = useState(null), [photoSubject, setPhotoSubject] = useState(null);
  const [soundBusy, setSoundBusy] = useState(false), [feedback, setFeedback] = useState('');
  const modalOpen = Boolean(analysis || mapOpen || exported || landmarkOpen);
  settings.current = { ...params, inputBlocked: modalOpen || params.photo || Boolean(error) };
  state.current = { params, stats, analysis, mapOpen, exported, landmarkOpen, immersive, modalOpen };
  const update = (key, value) => setParams(current => ({ ...current, [key]: value }));
  const clearInput = () => { held.current.clear(); api.current?.clearInput(); };
  const setInput = (action, source, pressed) => {
    let sources = held.current.get(action);
    if (!sources) { sources = new Set(); held.current.set(action, sources); }
    if (pressed) sources.add(source); else sources.delete(source);
    api.current?.setInput(action, sources.size > 0);
  };
  const togglePhoto = () => {
    clearInput();
    if (state.current.params.photo) {
      const previous = photoMemory.current || { paused: false, camera: 'follow' };
      setParams(current => ({ ...current, photo: false, paused: previous.paused, camera: previous.camera })); photoMemory.current = null; setPhotoSubject(null);
    } else {
      photoMemory.current = { paused: state.current.params.paused, camera: state.current.params.camera }; setControlsOpen(false); setPhotoSubject(null);
      setParams(current => ({ ...current, photo: true, camera: 'orbit' }));
    }
  };
  const closeDialogs = () => { setAnalysis(false); setMapOpen(false); setExported(null); setLandmarkOpen(null); };
  const openMap = () => { clearInput(); closeDialogs(); setMapOpen(true); };
  const capture = () => { clearInput(); const data = api.current?.capture(); if (data) { closeDialogs(); setExported(data); } };
  const openPlace = id => { clearInput(); closeDialogs(); setFeedback(''); setLandmarkOpen(id); };
  const framePlace = id => {
    clearInput();
    if (!api.current?.frameLandmark(id)) { setFeedback('已离开地点附近，请回到这里再取景。'); return; }
    photoMemory.current = { paused: state.current.params.paused, camera: state.current.params.camera };
    closeDialogs(); setControlsOpen(false); setPhotoSubject(id);
    setParams(current => ({ ...current, photo: true, camera: 'orbit', photoFov: 55 }));
  };
  const toggleSound = async () => {
    if (soundPending.current || !api.current) return;
    const next = !state.current.params.sound, sceneApi = api.current, request = ++soundRequest.current;
    soundPending.current = true; setSoundBusy(true); setFeedback('');
    try {
      const success = await sceneApi.setSound(next);
      if (request !== soundRequest.current || api.current !== sceneApi) return;
      if (!next || success) update('sound', next);
      else setFeedback('声音暂时不可用，请再试一次。');
    } catch {
      if (request === soundRequest.current && api.current === sceneApi) setFeedback('声音暂时不可用，请再试一次。');
    } finally {
      if (request === soundRequest.current && api.current === sceneApi) { soundPending.current = false; setSoundBusy(false); }
    }
  };
  const restoreRide = () => {
    clearInput(); closeDialogs(); photoMemory.current = null; setPhotoSubject(null); setFeedback('');
    if (!api.current?.restoreRide()) setFeedback('这次骑行记录暂时无法恢复。');
  };

  useEffect(() => {
    try { api.current = createRidgeScene(mount.current, settings, setStats, setError, mode => setParams(current => ({ ...current, camera: mode })),
      restored => setParams(current => ({ ...current, ...restored, rideMode: 'manual', photo: false, paused: false, camera: 'follow' }))); }
    catch (event) { setError(`场景无法启动：${event.message}`); }
    return () => { soundRequest.current++; api.current?.clearInput(); api.current?.dispose(); api.current = null; };
  }, []);
  useEffect(() => {
    const keyDown = event => {
      const current = state.current;
      if (event.key === 'Escape') {
        clearInput();
        if (current.landmarkOpen) setLandmarkOpen(null); else if (current.exported) setExported(null); else if (current.analysis) setAnalysis(false); else if (current.mapOpen) setMapOpen(false); else if (current.params.photo) togglePhoto(); else { setImmersive(false); setControlsOpen(false); }
        return;
      }
      const formControl = ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName);
      if (event.target.isContentEditable || (formControl && event.target.type !== 'range')) return;
      const action = movementKeys[event.code];
      if (action) {
        if (formControl) return;
        if (current.modalOpen || current.params.photo || current.params.paused || current.params.rideMode !== 'manual') return;
        event.preventDefault(); setInput(action, `key:${event.code}`, true); return;
      }
      if (event.repeat || current.modalOpen) return;
      if (event.code === 'Space' && !formControl && !['BUTTON', 'A'].includes(event.target.tagName) && !current.params.photo) { event.preventDefault(); clearInput(); setParams(value => ({ ...value, paused: !value.paused })); }
      if (event.code === 'KeyH') setImmersive(value => !value);
      if (event.code === 'KeyM') { event.preventDefault(); openMap(); }
      if (event.code === 'KeyP') { event.preventDefault(); togglePhoto(); }
      if (event.code === 'KeyE' && !formControl && !current.params.photo) {
        const place = nearbyPlace(current.stats);
        if (place) { event.preventDefault(); openPlace(place.id); }
      }
    };
    const keyUp = event => { const action = movementKeys[event.code]; if (action) setInput(action, `key:${event.code}`, false); };
    const visibility = () => { if (document.hidden) clearInput(); };
    window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp); window.addEventListener('blur', clearInput); document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', clearInput); document.removeEventListener('visibilitychange', visibility); clearInput(); };
  }, []);
  useEffect(() => { clearInput(); }, [modalOpen, params.paused, params.photo, params.rideMode]);
  useEffect(() => {
    if (!modalOpen) return;
    const dialog = dialogRef.current, returnFocus = document.activeElement;
    if (!dialog) return;
    const focusable = () => [...dialog.querySelectorAll('button:not([disabled]),a[href],input,summary')];
    focusable()[0]?.focus();
    const trap = event => {
      if (event.key !== 'Tab') return;
      const elements = focusable(), first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    };
    dialog.addEventListener('keydown', trap);
    return () => { dialog.removeEventListener('keydown', trap); if (returnFocus?.isConnected) returnFocus.focus(); else mount.current?.querySelector('canvas')?.focus(); };
  }, [analysis, mapOpen, exported, landmarkOpen]);
  useEffect(() => {
    if (!stats?.visited) return;
    if (previousVisited.current) { const found = stats.visited.find(id => !previousVisited.current.includes(id)); if (found) setDiscovery(LANDMARKS.find(landmark => landmark.id === found)); }
    previousVisited.current = [...stats.visited];
  }, [stats?.visited]);
  useEffect(() => { if (!discovery) return; const timeout = window.setTimeout(() => setDiscovery(null), 5500); return () => window.clearTimeout(timeout); }, [discovery]);
  useEffect(() => { if (!feedback) return; const timeout = window.setTimeout(() => setFeedback(''), 4500); return () => window.clearTimeout(timeout); }, [feedback]);

  const reset = () => { clearInput(); closeDialogs(); soundRequest.current++; soundPending.current = false; setSoundBusy(false); photoMemory.current = null; setPhotoSubject(null); setDiscovery(null); setFeedback(''); setParams(defaults()); api.current?.reset(); };
  const chooseDestination = id => { clearInput(); update('destination', id); setMapOpen(false); };
  const target = LANDMARKS.find(landmark => landmark.id === params.destination);
  const guidance = target && stats ? routeGuidance(stats, target.id) : null;
  const nearPlace = nearbyPlace(stats), currentPlace = LANDMARKS.find(landmark => landmark.id === landmarkOpen);
  const photographedPlace = LANDMARKS.find(landmark => landmark.id === photoSubject);
  const movementDisabled = params.paused || params.photo || modalOpen || params.rideMode !== 'manual' || !stats;
  const touchButton = (action, content, label) => <button key={action} className={`ride-key ride-key-${action}`} aria-label={label} disabled={movementDisabled} onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setInput(action, `pointer:${event.pointerId}`, true); }} onPointerUp={event => setInput(action, `pointer:${event.pointerId}`, false)} onPointerCancel={event => setInput(action, `pointer:${event.pointerId}`, false)} onLostPointerCapture={event => setInput(action, `pointer:${event.pointerId}`, false)}>{content}</button>;

  return <main className={`experience ${immersive ? 'immersive' : ''} ${controlsOpen ? 'mobile-controls-open' : ''} ${params.photo ? 'photographing' : ''}`}>
    <div className="scene" ref={mount} />
    {!stats && !error && <div className="loading">正在打开山间世界…</div>}
    {error && <div className="error" role="alert">{error}<button onClick={() => location.reload()}>重新打开</button></div>}
    <header className="topbar chrome"><a className="brand" href="#" onClick={event => { event.preventDefault(); reset(); }}><span className="brand-number">019</span><span>山脊漫游<span className="brand-en">RIDGE EXPLORER</span></span></a><div className="top-actions"><a className="understanding-link" href={`${import.meta.env.BASE_URL}understanding.html`}>理解与入口</a><button ref={mapTrigger} onClick={openMap}>探索地图 <kbd>M</kbd></button><button aria-pressed={params.photo} className={params.photo ? 'active' : ''} onClick={togglePhoto}>{params.photo ? '退出摄影' : '摄影模式'} <kbd>P</kbd></button><button ref={exportTrigger} disabled={!stats} onClick={capture}>保存画面</button></div></header>
    <div className="view-toggle"><button aria-label={immersive ? '显示控制面板' : '沉浸观看'} onClick={() => setImmersive(value => !value)}>{immersive ? '显示面板' : '沉浸观看'}<kbd>H</kbd></button></div>
    {!params.photo && <button className="mobile-panel-toggle chrome" aria-expanded={controlsOpen} onClick={() => setControlsOpen(value => !value)}>{controlsOpen ? '收起调节' : '调整天气与镜头'}</button>}
    {!params.photo && <aside className="panel chrome" aria-label="场景控制"><div className="panel-heading"><span>此刻的山间</span><span className="live-dot">LIVE</span></div><div className="weather-tabs" aria-label="天气预设">{Object.entries(weatherNames).map(([key, name]) => <button key={key} aria-pressed={params.weather === key} className={params.weather === key ? 'active' : ''} onClick={() => update('weather', key)}>{name}</button>)}</div>
      <Range name="雾气浓度" value={params.fog} onChange={value => update('fog', value)} /><Range name="山间风力" value={params.wind} max={2} onChange={value => update('wind', value)} /><Range name="云隙亮度" value={params.sun} onChange={value => update('sun', value)} /><div className="panel-divider" />
      <span className="control-title">镜头</span><div className="camera-tabs"><button aria-pressed={params.camera === 'follow'} className={params.camera === 'follow' ? 'active' : ''} onClick={() => update('camera', 'follow')}>跟随骑手</button><button aria-pressed={params.camera === 'orbit'} className={params.camera === 'orbit' ? 'active' : ''} onClick={() => update('camera', 'orbit')}>自由观察</button></div><p className="camera-hint">{params.camera === 'orbit' ? '环绕骑手 · 拖动旋转 · 滚轮缩放' : '镜头随骑手前行 · 直接拖动可环绕'}</p>
      <details className="layer-controls"><summary>分层观察</summary>{Object.entries(layerNames).map(([key, name]) => <label key={key}><span>{name}</span><input type="checkbox" checked={params.layers[key]} onChange={event => update('layers', { ...params.layers, [key]: event.target.checked })} /></label>)}</details>
      <button className="sound-toggle" aria-pressed={params.sound} disabled={soundBusy || !stats} onClick={toggleSound}><span>山间声音</span><span>{soundBusy ? params.sound ? '正在关闭…' : '正在打开…' : params.sound ? '已开启' : '点击开启'}</span></button>
      <button ref={analysisTrigger} className="reference-button" onClick={() => { clearInput(); setAnalysis(true); }}>画面拆解 <span>查看参考 →</span></button><div className="panel-footer"><button className="pause-button" onClick={() => { clearInput(); update('paused', !params.paused); }}>{params.paused ? '继续时光' : '暂停时光'}<kbd>空格</kbd></button><button className="reset-button" onClick={reset}>回到起点</button></div>
    </aside>}
    {params.photo && <aside className="photo-panel chrome" aria-label="摄影设置"><div className="panel-heading"><span>留住这一刻</span><span className="live-dot">PHOTO</span></div><p className="photo-hint">时光已停下。{photographedPlace ? `${photographedPlace.name} · 拖动调整构图` : '拖动环绕骑手'}，滚轮调整距离。</p><Range name="镜头视角" value={params.photoFov} min={28} max={80} step={1} unit="°" onChange={value => update('photoFov', value)} /><span className="control-title">画面色调</span><div className="weather-tabs photo-looks">{Object.entries(photoLooks).map(([key, name]) => <button key={key} aria-pressed={params.photoLook === key} className={params.photoLook === key ? 'active' : ''} onClick={() => update('photoLook', key)}>{name}</button>)}</div><div className="panel-footer"><button className="pause-button" onClick={capture}>保存 PNG</button><button className="reset-button" onClick={togglePhoto}>结束摄影 <kbd>P</kbd></button></div></aside>}
    <div className="ride-hud chrome" aria-label="骑行与探索"><div className="ride-modes"><button aria-pressed={params.rideMode === 'manual'} className={params.rideMode === 'manual' ? 'active' : ''} disabled={params.photo} onClick={() => { clearInput(); update('rideMode', 'manual'); }}>自由骑行</button><button aria-pressed={params.rideMode === 'tour'} className={params.rideMode === 'tour' ? 'active' : ''} disabled={params.photo} onClick={() => { clearInput(); update('rideMode', 'tour'); }}>沿途巡游</button><span>{stats?.visited?.length || 0} / {LANDMARKS.length} 处发现</span>{!params.photo && <button className="ride-pause" aria-label={params.paused ? '继续时光' : '暂停时光'} onClick={() => { clearInput(); update('paused', !params.paused); }}>{params.paused ? '继续' : '暂停'}</button>}</div>
      {stats?.blocked && !params.photo && <p className="blocked-hint" role="status">前方坡陡或有障碍，请转向再试</p>}
      {stats?.tourStop && !params.photo && <div className="tour-stop"><span>在 {stats.tourStop.name} 停留 <strong>{Math.max(0, Math.ceil(stats.tourStop.remaining))} s</strong></span><button onClick={() => { clearInput(); api.current?.skipTourStop(); update('paused', false); }}>继续巡游</button></div>}
      {!params.photo && <p className="ride-hint">{params.paused ? '时光暂停 · 空格继续' : params.rideMode === 'tour' ? '骑手沿连接各处的小径巡游 · 可随时切回自由骑行' : <><kbd>W / ↑</kbd> 前进　<kbd>A D / ← →</kbd> 转向　<kbd>S / ↓</kbd> 减速　<kbd>Shift</kbd> 加速</>}<span className="desktop-hint"> · 拖动看四周 · 空格暂停</span></p>}
      {params.photo && <p className="ride-hint">拖动构图 · 滚轮缩放 · <kbd>P</kbd> 结束摄影</p>}
      {target && <div className="destination-guide" role="status"><span className="guide-dot" /><span>{target.name} <strong>{guidance ? guidance.arrived ? '已到达' : `沿小径 ${meters(guidance.remainingDistance)}` : '定位中'}</strong><span className="guide-bearing">{guidance?.offTrail ? '先回小径 · ' : ''}{directionTo(guidance?.waypoint, stats, guidance?.arrived)}</span></span><button aria-label="取消方向提示" onClick={() => update('destination', null)}>×</button></div>}
      {!params.photo && (nearPlace || (stats?.hasSavedRide && stats.distance < 1)) && <div className="ride-extras">{nearPlace && <button className="place-prompt" aria-label={`停留看看：${nearPlace.name}`} onClick={() => openPlace(nearPlace.id)}>停留看看 <kbd>E</kbd><span>{nearPlace.name}</span></button>}{stats?.hasSavedRide && stats.distance < 1 && <button className="restore-ride" onClick={restoreRide}>继续上次骑行 <span>→</span></button>}</div>}
    </div>
    <div className="touch-riding chrome" role="group" aria-label="触屏骑行控制">{touchButton('forward', '↑', '按住向前骑行')}{touchButton('left', '←', '按住向左转向')}{touchButton('backward', '↓', '按住减速')}{touchButton('right', '→', '按住向右转向')}{touchButton('sprint', '加速', '按住加速')}</div>
    <footer className="statusbar chrome"><span>{weatherNames[params.weather]} <span className="status-sep">/</span> {params.photo ? '摄影 · 时光暂停' : params.paused ? '时间暂停' : `${meters(stats?.distance)} · ${((stats?.speed || 0) * 3.6).toFixed(1)} km/h`}</span><span>{stats ? `${stats.fps} FPS` : '载入中'}<span className="status-sep">/</span>WEBGL</span></footer>
    {discovery && <div className="discovery-toast chrome" role="status"><span className="eyebrow">DISCOVERED</span><strong>发现了 {discovery.name}</strong><span>{discovery.description}</span></div>}
    {feedback && !currentPlace && <div className="interaction-feedback chrome" role="status">{feedback}</div>}
    {currentPlace && <div className="modal-shade" onClick={event => { if (event.target === event.currentTarget) setLandmarkOpen(null); }}><section ref={dialogRef} className="analysis-dialog place-dialog" role="dialog" aria-modal="true" aria-label={`停留：${currentPlace.name}`}><div className="analysis-heading"><div><span className="eyebrow">A PLACE TO PAUSE</span><h2>{currentPlace.name}</h2></div><button onClick={() => setLandmarkOpen(null)}>关闭</button></div><span className="place-state">{stats?.visited?.includes(currentPlace.id) ? '已发现' : '接近地点'}</span><div className="place-notes">{placeNotes[currentPlace.id].map(note => <p key={note}>{note}</p>)}</div>{feedback && <p className="place-feedback" role="status">{feedback}</p>}<div className="place-actions"><button className="place-photo" onClick={() => framePlace(currentPlace.id)}>在此取景</button><button onClick={() => setLandmarkOpen(null)}>继续骑行</button></div></section></div>}
    {mapOpen && <div className="modal-shade" onClick={event => { if (event.target === event.currentTarget) setMapOpen(false); }}><section ref={dialogRef} className="analysis-dialog map-dialog" role="dialog" aria-modal="true" aria-label="探索地图"><div className="analysis-heading"><div><span className="eyebrow">RIDGE FIELD NOTES</span><h2>小径通向哪里</h2></div><button onClick={() => setMapOpen(false)}>关闭</button></div><ExplorationMap stats={stats} destination={params.destination} /><div className="map-heading"><span>已发现 {stats?.visited?.length || 0} / {LANDMARKS.length} 处</span><span>选择地点，开启小径导航</span></div><div className="landmark-list">{LANDMARKS.map(landmark => <button key={landmark.id} className={`landmark-row ${params.destination === landmark.id ? 'selected' : ''}`} onClick={() => chooseDestination(landmark.id)}><span><strong>{landmark.name}</strong><small>{landmark.description}</small></span><span className="landmark-meta"><span>{stats ? `沿小径 ${meters(routeGuidance(stats, landmark.id)?.remainingDistance)}` : '定位中'}</span><small>{stats?.visited?.includes(landmark.id) ? '已发现' : '前往探索 →'}</small></span></button>)}</div><p className="map-note">金色路线沿真实小径连接所选地点；离路时虚线指向返路位置。发现进度与最近的骑行位置保存在这个浏览器。</p>{target && <button className="source-link" onClick={() => chooseDestination(null)}>清除当前小径导航</button>}</section></div>}
    {analysis && <div className="modal-shade" onClick={event => { if (event.target === event.currentTarget) setAnalysis(false); }}><section ref={dialogRef} className="analysis-dialog" role="dialog" aria-modal="true" aria-label="参考画面拆解"><div className="analysis-heading"><div><span className="eyebrow">REFERENCE STUDY</span><h2>这幅画面的层次从哪里来</h2></div><button onClick={() => setAnalysis(false)}>关闭</button></div><img className="reference" src={`${import.meta.env.BASE_URL}assets/source-frame.jpg`} alt="原帖视频截帧：骑手沿着灰绿色山脊前行，远处雪峰被云雾遮蔽" /><div className="analysis-grid"><div><h3>01 · 山体先给出尺度</h3><p>近处泥路与苔草、左后方高峰、右侧缓坡形成前中远景，骑手提供人的尺度。</p></div><div><h3>02 · 雾有位置和厚度</h3><p>低云停在谷地与山腰，越远越淡的山峰形成空气透视。关闭分层开关，可分别观察两者。</p></div><div><h3>03 · 风让各层一起运动</h3><p>草叶、披风、云带使用共同风力，但速度和摆动尺度不同，避免整幅画面同时平移。</p></div><div><h3>04 · 光照克制，镜头稳定</h3><p>冷灰环境光包住湿岩，黄褐披风留下暖色焦点。拖动镜头环绕或跟随骑手前行，观察近远视差。</p></div></div><p className="analysis-note">019 以已保存的 018 场景为基础，扩展自由骑行与探索。地形、云雾与骑手由本项目实现，马匹使用公开示例模型；原游戏的渲染实现没有公开验证。</p><a className="source-link" href="https://x.com/tententen_777/status/2106077153293115629" target="_blank" rel="noreferrer">查看参考原帖 →</a></section></div>}
    {exported && <div className="modal-shade" onClick={event => { if (event.target === event.currentTarget) setExported(null); }}><section ref={dialogRef} className="analysis-dialog export-dialog" role="dialog" aria-modal="true" aria-label="保存当前画面"><div className="analysis-heading"><div><span className="eyebrow">A MOMENT IN THE MOUNTAINS</span><h2>这一刻的山间</h2></div><button onClick={() => setExported(null)}>关闭</button></div><img className="export-image" src={exported} alt="导出的山脊画面" /><p className="analysis-note">已生成原始分辨率 PNG，画面不包含控制面板。摄影模式下，镜头视角和色调会一同保存。</p><a className="export-link" href={exported} download="ridge-explorer.png">下载 PNG</a></section></div>}
  </main>;
}
