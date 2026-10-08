import { useEffect, useRef, useState } from 'react';
import { createRidgeScene } from './scene/renderer.js';
const defaults = () => ({ weather: 'storm', fog: .58, wind: 1, sun: .32, camera: 'follow', paused: false, layers: { terrain: true, grass: true, clouds: true, fog: true } });
const weatherNames = { storm: '山雨欲来', mist: '晨间薄雾', sunset: '云隙夕光' };
const layerNames = { grass: '风动草地', clouds: '山腰低云', fog: '远景空气透视' };
function Range({ name, value, max = 1, onChange }) {
  return <label className="range-row"><span>{name}<output>{Math.round(value / max * 100)}%</output></span><input aria-label={name} type="range" min="0" max={max} step="0.01" value={value} onChange={e => onChange(Number(e.target.value))} /></label>;
}
export function App() {
  const mount = useRef(null), api = useRef(null), settings = useRef(defaults()), analysisTrigger = useRef(null), exportTrigger = useRef(null);
  const [params, setParams] = useState(defaults), [stats, setStats] = useState(null);
  const [error, setError] = useState(''), [immersive, setImmersive] = useState(false), [analysis, setAnalysis] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [exported, setExported] = useState(null);
  settings.current = params;
  const update = (key, value) => setParams(p => ({ ...p, [key]: value }));
  useEffect(() => {
    try { api.current = createRidgeScene(mount.current, settings, setStats, setError, mode => setParams(p => ({ ...p, camera: mode }))); } catch (e) { setError(`场景无法启动：${e.message}`); }
    return () => { api.current?.dispose(); api.current = null; };
  }, []);
  useEffect(() => {
    const key = e => {
      if (e.key === 'Escape') { setAnalysis(false); setExported(null); setImmersive(false); return; }
      if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A'].includes(e.target.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); setParams(p => ({ ...p, paused: !p.paused })); }
      if (e.key.toLowerCase() === 'h') setImmersive(v => !v);
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    if (!analysis && !exported) return;
    const dialog = document.querySelector('.analysis-dialog');
    const trap = e => {
      if (e.key !== 'Tab') return;
      const focusable = dialog.querySelectorAll('button,a[href],input,summary');
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    dialog.addEventListener('keydown', trap);
    return () => { dialog.removeEventListener('keydown', trap); (analysis ? analysisTrigger : exportTrigger).current?.focus(); };
  }, [analysis, exported]);
  const reset = () => { setParams(defaults()); api.current?.reset(); };
  return <main className={`experience ${immersive ? 'immersive' : ''} ${controlsOpen ? 'mobile-controls-open' : ''}`}>
    <div className="scene" ref={mount} />
    {!stats && !error && <div className="loading">正在打开山间世界…</div>}
    {error && <div className="error" role="alert">{error}<button onClick={() => location.reload()}>重新打开</button></div>}
    <header className="topbar chrome"><a className="brand" href="#" onClick={e => { e.preventDefault(); reset(); }}><span className="brand-number">018</span><span>山脊气象<span className="brand-en">RIDGE ATMOSPHERE LAB</span></span></a><div className="top-actions"><button ref={analysisTrigger} onClick={() => setAnalysis(true)}>画面拆解</button><button ref={exportTrigger} onClick={() => setExported(api.current?.capture())}>保存画面</button></div></header>
    <div className="view-toggle"><button aria-label={immersive ? '显示控制面板' : '沉浸观看'} onClick={() => setImmersive(v => !v)}>{immersive ? '显示面板' : '沉浸观看'}<kbd>H</kbd></button></div>
    <button className="mobile-panel-toggle chrome" aria-expanded={controlsOpen} onClick={() => setControlsOpen(v => !v)}>{controlsOpen ? '收起调节' : '调整天气与镜头'}</button>
    <aside className="panel chrome" aria-label="场景控制"><div className="panel-heading"><span>此刻的山间</span><span className="live-dot">LIVE</span></div><div className="weather-tabs" aria-label="天气预设">{Object.entries(weatherNames).map(([k, v]) => <button key={k} aria-pressed={params.weather === k} className={params.weather === k ? 'active' : ''} onClick={() => update('weather', k)}>{v}</button>)}</div>
      <Range name="雾气浓度" value={params.fog} onChange={v => update('fog', v)} /><Range name="山间风力" value={params.wind} max={2} onChange={v => update('wind', v)} /><Range name="云隙亮度" value={params.sun} onChange={v => update('sun', v)} /><div className="panel-divider" />
      <span className="control-title">镜头</span><div className="camera-tabs"><button aria-pressed={params.camera === 'follow'} className={params.camera === 'follow' ? 'active' : ''} onClick={() => update('camera', 'follow')}>沿山脊骑行</button><button aria-pressed={params.camera === 'orbit'} className={params.camera === 'orbit' ? 'active' : ''} onClick={() => update('camera', 'orbit')}>自由观察</button></div><p className="camera-hint">{params.camera === 'orbit' ? '环绕骑手 · 拖动旋转 · 滚轮缩放' : '镜头随骑手前行 · 拖动画面可环绕'}</p>
      <details className="layer-controls"><summary>分层观察</summary>{Object.entries(layerNames).map(([k, v]) => <label key={k}><span>{v}</span><input type="checkbox" checked={params.layers[k]} onChange={e => update('layers', { ...params.layers, [k]: e.target.checked })} /></label>)}</details><div className="panel-footer"><button className="pause-button" onClick={() => update('paused', !params.paused)}>{params.paused ? '继续前行' : '暂停时光'}<kbd>空格</kbd></button><button className="reset-button" onClick={reset}>重置</button></div>
    </aside><footer className="statusbar chrome"><span>{weatherNames[params.weather]} <span className="status-sep">/</span> {params.paused ? '时间暂停' : `已前行 ${stats?.distance || 0} m`}</span><span>{stats ? `${stats.fps} FPS` : '载入中'}<span className="status-sep">/</span>WEBGL</span></footer>
    {analysis && <div className="modal-shade" onClick={e => { if (e.target === e.currentTarget) setAnalysis(false); }}><section className="analysis-dialog" role="dialog" aria-modal="true" aria-label="参考画面拆解"><div className="analysis-heading"><div><span className="eyebrow">REFERENCE STUDY</span><h2>这幅画面的层次从哪里来</h2></div><button autoFocus onClick={() => setAnalysis(false)}>关闭</button></div><img className="reference" src={`${import.meta.env.BASE_URL}assets/source-frame.jpg`} alt="原帖视频截帧：骑手沿着灰绿色山脊前行，远处雪峰被云雾遮蔽" /><div className="analysis-grid"><div><h3>01 · 山体先给出尺度</h3><p>近处泥路与苔草、左后方高峰、右侧缓坡形成前中远景，骑手提供人的尺度。</p></div><div><h3>02 · 雾有位置和厚度</h3><p>低云停在谷地与山腰，越远越淡的山峰形成空气透视。关闭分层开关，可分别观察两者。</p></div><div><h3>03 · 风让各层一起运动</h3><p>草叶、披风、云带使用共同风力，但速度和摆动尺度不同，避免整幅画面同时平移。</p></div><div><h3>04 · 光照克制，镜头稳定</h3><p>冷灰环境光包住湿岩，黄褐披风留下暖色焦点。跟随镜头缓慢移动，强化近远视差。</p></div></div><p className="analysis-note">这是基于可见画面的实时效果重建。地形、云雾与骑手由本项目实现，马匹使用公开示例模型；原游戏的渲染实现没有公开验证。</p><a className="source-link" href="https://x.com/tententen_777/status/2106077153293115629" target="_blank" rel="noreferrer">查看参考原帖 →</a></section></div>}
    {exported && <div className="modal-shade" onClick={e => { if (e.target === e.currentTarget) setExported(null); }}><section className="analysis-dialog export-dialog" role="dialog" aria-modal="true" aria-label="保存当前画面"><div className="analysis-heading"><div><span className="eyebrow">A MOMENT IN THE MOUNTAINS</span><h2>这一刻的山间</h2></div><button autoFocus onClick={() => setExported(null)}>关闭</button></div><img className="export-image" src={exported} alt="导出的山脊画面" /><p className="analysis-note">已生成原始分辨率 PNG，画面不包含控制面板。也可以右键保存图像。</p><a className="export-link" href={exported} download="ridge-atmosphere.png">下载 PNG</a></section></div>}
  </main>;
}
