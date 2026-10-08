(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const canvas = $('black-hole');
  const physics = window.BlackHolePhysics.create($('physics-canvas'));
  const rayInset=window.BlackHolePhysics.create($('ray-inset'));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const defaults = Object.freeze({yaw: 0.35, inclination: 10, distance: 23, thickness: 0.16, exposure: 1.25, speed: 1, lensing: true, doppler: true, disk: true, orbit: false, quality: 'balanced', paused: reducedMotion, grid: false, mass:10, rateLog:-9, falseColor:false});
  const state = {...defaults, paused: true};
  const course = window.BlackHoleCourse.create(state, {sync: syncUI, render: requestRender, resize, reset: () => {Object.assign(state, defaults, {paused:true});clock=flowClock=0;lastTime=0;}}, reducedMotion);
  const qualitySettings = {low: {scale: 0.48, steps: 900, max: 700}, balanced: {scale: 0.72, steps: 900, max: 1150}, high: {scale: 1.15, steps: 980, max: 1800}};
  let gl, program, buffer, uniforms = {}, raf = 0, clock = 0, flowClock = 0, lastTime = 0;
  let fpsFrames = 0, fpsStart = 0, visible = true, renderCount = 0;
  let sizeObserver, viewportObserver, dragging = null, toastTimer;
  let failure = null, gpuFence = null;
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  function toast(message) {
    $('toast').textContent = message;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {$('toast').hidden = true;}, 2600);
  }

  function fail(error) {
    failure = String(error.message || error);
    gpuFence = null;
    cancelAnimationFrame(raf);
    $('render-error').textContent = '黑洞画面暂时无法渲染。\n' + failure + '\n请使用支持 WebGL 2 的浏览器，并检查硬件加速设置。原理说明仍可阅读。';
    $('render-error').hidden = course.isSchematic();
    $('performance').textContent = '渲染不可用';
    $('capture').disabled = true;
    document.documentElement.dataset.renderStatus = 'error';
    console.error(error);
  }

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error('着色器编译失败：' + message);
    }
    return shader;
  }

  function init() {
    gl = canvas.getContext('webgl2', {antialias: false, alpha: false, depth: false, stencil: false, preserveDrawingBuffer: true, powerPreference: 'high-performance'});
    if (!gl) throw new Error('此设备没有可用的 WebGL 2 上下文。');
    const vertex = compile(gl.VERTEX_SHADER, window.BlackHoleShaders.vertex);
    const fragment = compile(gl.FRAGMENT_SHADER, window.BlackHoleShaders.fragment);
    program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('着色器链接失败：' + gl.getProgramInfoLog(program));
    gl.useProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    for (const name of ['uResolution','uCamera','uTime','uThickness','uExposure','uLensing','uDoppler','uDisk','uSky','uHorizon','uTexture','uGrid','uSteps','uTemperatureScale','uFalseColor']) uniforms[name] = gl.getUniformLocation(program, name);
    failure = null;
    $('render-error').hidden = true;
    $('capture').disabled = false;
    document.documentElement.dataset.renderStatus = 'ready';
    resize();
    requestRender();
  }

  function resize() {
    physics.resize();rayInset.resize();
    if (!gl || failure) {requestRender();return;}
    const bounds = $('viewer').getBoundingClientRect();
    const q = qualitySettings[state.quality];
    const ratio = Math.min(devicePixelRatio || 1, 2) * q.scale;
    const limit = Math.min(1, q.max / Math.max(bounds.width * ratio, bounds.height * ratio));
    const w = Math.max(1, Math.round(bounds.width * ratio * limit));
    const h = Math.max(1, Math.round(bounds.height * ratio * limit));
    if (canvas.width !== w || canvas.height !== h) {canvas.width = w; canvas.height = h;}
    gl.viewport(0, 0, w, h);
    requestRender();
  }

  function render(force = false) {
    physicalUI();
    if(!$('ray-inset-wrap').hidden)rayInset.draw({...course.model(),inset:true});
    if(course.isSchematic()){physics.draw(course.model());renderCount++;return true;}
    if (!gl || failure || gl.isContextLost()) return false;
    if (gpuFence) {
      const status = gl.clientWaitSync(gpuFence, 0, 0);
      if (status === gl.TIMEOUT_EXPIRED && !force) return false;
      if (status === gl.TIMEOUT_EXPIRED) gl.finish();
      gl.deleteSync(gpuFence);
      gpuFence = null;
    }
    const elevation = state.inclination * Math.PI / 180;
    const distance = state.distance;
    gl.useProgram(program);
    gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
    gl.uniform3f(uniforms.uCamera, Math.sin(state.yaw) * Math.cos(elevation) * distance, Math.sin(elevation) * distance, Math.cos(state.yaw) * Math.cos(elevation) * distance);
    gl.uniform1f(uniforms.uTime, flowClock);
    gl.uniform1f(uniforms.uThickness, state.thickness);
    gl.uniform1f(uniforms.uExposure, state.exposure);
    gl.uniform1f(uniforms.uTemperatureScale,window.BlackHoleModel.units(state.mass,10**state.rateLog).temperatureScale);
    gl.uniform1f(uniforms.uFalseColor,Number(state.falseColor));
    const layers = course.layers();
    gl.uniform1f(uniforms.uSky, layers.sky);
    gl.uniform1f(uniforms.uHorizon, layers.horizon);
    gl.uniform1f(uniforms.uTexture, layers.texture);
    gl.uniform1f(uniforms.uLensing, layers.lensing);
    gl.uniform1f(uniforms.uDoppler, layers.doppler);
    gl.uniform1f(uniforms.uDisk, layers.disk);
    gl.uniform1f(uniforms.uGrid, Number(state.grid));
    gl.uniform1i(uniforms.uSteps, qualitySettings[state.quality].steps);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gpuFence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    renderCount++;
    return true;
  }

  function frame(now) {
    raf = 0;
    const lastTimeBefore=lastTime;
    const delta = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 0;
    lastTime = now;
    course.tick(lastTimeBefore ? (now-lastTimeBefore)/1000 : 0);
    if (!state.paused) {
      clock += delta;
      flowClock += delta * state.speed;
      if (state.orbit) state.yaw += delta * 0.10;
    }
    const painted = render();
    if (painted) fpsFrames++;
    if (now - fpsStart > 1000) {
      const fps = Math.round(fpsFrames * 1000 / (now - fpsStart));
      $('performance').textContent = (state.paused ? '已暂停' : fps + ' FPS') + ' · ' + canvas.width + ' × ' + canvas.height;
      fpsFrames = 0; fpsStart = now;
    }
    if(course.isSchematic())$('performance').textContent=state.paused?'示意已暂停':'时间与尺度压缩的示意';
    if (state.paused && !course.isSchematic()) $('performance').textContent = '已暂停 · ' + canvas.width + ' × ' + canvas.height;
    if ((!state.paused || !painted || course.isAnimating()) && visible && !document.hidden && (!failure || course.isSchematic())) raf = requestAnimationFrame(frame);
  }

  function requestRender() {
    if (!raf && (!failure || course.isSchematic()) && !document.hidden && visible) raf = requestAnimationFrame(frame);
  }

  function syncUI() {
    for (const key of ['inclination','thickness','exposure','speed']) $(key).value = String(state[key]);
    $('inclination-value').textContent = Math.round(state.inclination) + '°';
    $('thickness-value').textContent = state.thickness.toFixed(2);
    $('exposure-value').textContent = state.exposure.toFixed(2);
    $('speed-value').textContent = state.speed.toFixed(1) + '×';
    for (const key of ['lensing','doppler','disk','orbit']) $(key).checked = state[key];
    $('quality').value = state.quality;
    $('pause').textContent = state.paused ? '继续' : '暂停';
    $('pause').setAttribute('aria-pressed', String(state.paused));
    $('scene-title').textContent = state.disk ? '黑洞与吸积盘' : '星空中的引力透镜';
    $('scene-caption').textContent = !state.lensing ? '此时光线保持直线，盘面的上下亮弧消失。' : !state.disk ? '观察星空与经纬参考线怎样绕过黑洞。' : Math.abs(state.inclination) > 60 ? '接近正面观察时，吸积盘恢复为围绕阴影的环。' : '上方的亮弧，是背面盘面绕过黑洞后进入眼睛的光。';
    $('observation').textContent = !state.lensing ? '透镜已关闭：盘面保持平面，中央黑区也缩小。打开透镜，比较弧线和阴影的变化。' : !state.disk ? '吸积盘已关闭：星空与参考线的扭曲单独呈现。拖动视角，观察黑洞边缘的光路。' : !state.doppler ? '多普勒增亮已关闭：两侧由运动方向带来的亮度差减小；流动纹理仍会产生局部明暗。' : Math.abs(state.inclination) > 60 ? '接近俯视时，盘面呈圆环；侧视时，背面的盘面影像被透镜带到上下两侧。' : '试试关闭「引力透镜」：上下的弧线会消失，发光物质恢复成一张平面的盘。';
    course.refresh();
    $('performance').textContent=course.isSchematic()?(state.paused?'示意已暂停':'时间与尺度压缩的示意'):(state.paused?'成像已暂停':'外部光路计算');
    $('render-error').hidden=!failure||course.isSchematic();$('capture').disabled=Boolean(failure)&&!course.isSchematic();
    requestRender();
  }

  function clearPreset() {
    document.querySelectorAll('.preset').forEach(button => {button.classList.remove('active'); button.setAttribute('aria-pressed','false');});
  }

  function preset(name) {
    if (!course.isFree()) course.enterFree();
    const paused = state.paused, quality = state.quality, mass=state.mass, rateLog=state.rateLog, falseColor=state.falseColor;
    Object.assign(state, defaults, {paused, quality,mass,rateLog,falseColor});
    if (name === 'top') {state.inclination = 78; state.distance = 25;}
    if (name === 'edge') {state.inclination = 2; state.distance = 20;}
    if (name === 'lensing') {state.disk = false; state.grid = true; state.inclination = 16;}
    clearPreset();
    const selected = document.querySelector('[data-preset="' + name + '"]');
    if (selected) {selected.classList.add('active'); selected.setAttribute('aria-pressed','true');}
    syncUI();
  }

  for (const key of ['inclination','thickness','exposure','speed']) $(key).addEventListener('input', event => {state[key] = Number(event.target.value); clearPreset(); syncUI();});
  for (const key of ['lensing','doppler','disk','orbit']) $(key).addEventListener('change', event => {state[key] = event.target.checked; if (key === 'disk') state.grid = !state.disk; clearPreset(); syncUI();});
  $('quality').addEventListener('change', event => {state.quality = event.target.value; resize(); syncUI();});
  document.querySelectorAll('.preset').forEach(button => button.addEventListener('click', () => preset(button.dataset.preset)));
  $('reset').addEventListener('click', () => {Object.assign(state, defaults); clock = flowClock = 0; preset('cinematic'); resize();});
  $('pause').addEventListener('click', () => {state.paused = !state.paused; course.onPause(); lastTime = 0; fpsStart = performance.now(); fpsFrames = 0; syncUI(); $('performance').textContent = state.paused ? '已暂停 · ' + canvas.width + ' × ' + canvas.height : '恢复渲染…';});
  $('capture').addEventListener('click', () => {
    render(true); // Capture before the non-preserved drawing buffer is cleared.
    (course.isSchematic()?physics.canvas:canvas).toBlob(blob => {
      if (!blob) {toast('画面导出失败，请重试。'); return;}
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = 'black-hole-lab.png'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 15000);
      toast('画面已保存为 PNG。');
    }, 'image/png');
  });
  document.querySelectorAll('[data-lesson]').forEach(button => button.addEventListener('click', () => {
    preset('cinematic');
    if (button.dataset.lesson === 'flat') state.lensing = false;
    if (button.dataset.lesson === 'doppler') state.doppler = false;
    if (button.dataset.lesson === 'sky') {state.disk = false; state.grid = true;}
    clearPreset(); syncUI(); $('experiment').scrollIntoView({behavior: reducedMotion ? 'instant' : 'smooth'});
  }));

  canvas.addEventListener('pointerdown', event => {if (event.button !== 0) return; dragging = {id:event.pointerId,x:event.clientX,y:event.clientY}; canvas.setPointerCapture(event.pointerId); canvas.classList.add('dragging');});
  canvas.addEventListener('pointermove', event => {
    if (!dragging || event.pointerId !== dragging.id) return;
    state.yaw -= (event.clientX - dragging.x) * 0.005;
    state.inclination = clamp(state.inclination + (event.clientY - dragging.y) * 0.18, -80, 80);
    dragging.x = event.clientX; dragging.y = event.clientY;
    clearPreset(); syncUI();
  });
  function stopDrag() {dragging = null; canvas.classList.remove('dragging');}
  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);
  canvas.addEventListener('lostpointercapture', stopDrag);
  canvas.addEventListener('wheel', event => {event.preventDefault(); state.distance = clamp(state.distance * Math.exp(event.deltaY * 0.001), 14, 36); clearPreset(); requestRender();}, {passive:false});
  canvas.addEventListener('dblclick', () => {if(course.isFree())preset('cinematic');else{state.yaw=defaults.yaw;state.inclination=defaults.inclination;state.distance=defaults.distance;syncUI();}});
  canvas.addEventListener('keydown', event => {
    const actions = {ArrowLeft:()=>state.yaw-=0.08, ArrowRight:()=>state.yaw+=0.08, ArrowUp:()=>state.inclination=clamp(state.inclination+3,-80,80), ArrowDown:()=>state.inclination=clamp(state.inclination-3,-80,80), '+':()=>state.distance=clamp(state.distance-1,14,36), '=':()=>state.distance=clamp(state.distance-1,14,36), '-':()=>state.distance=clamp(state.distance+1,14,36)};
    if (actions[event.key]) {event.preventDefault(); actions[event.key](); clearPreset(); syncUI();}
  });
  canvas.addEventListener('webglcontextlost', event => {event.preventDefault(); fail(new Error('GPU 渲染上下文丢失，等待恢复。'));});
  canvas.addEventListener('webglcontextrestored', () => {try {uniforms = {}; init();} catch(error) {fail(error);}});
  document.addEventListener('visibilitychange', () => {lastTime=0; if (document.hidden) {cancelAnimationFrame(raf); raf=0;} else requestRender();});
  window.addEventListener('pagehide', () => {cancelAnimationFrame(raf); sizeObserver?.disconnect(); viewportObserver?.disconnect();});
  try {init();} catch(error) {fail(error);}
  try {
    sizeObserver = new ResizeObserver(resize); sizeObserver.observe($('viewer'));
    viewportObserver = new IntersectionObserver(entries => {visible=entries[0].isIntersecting; lastTime=0; if (visible) requestRender(); else {cancelAnimationFrame(raf);raf=0;}});
    viewportObserver.observe($('viewer'));
  } catch(error) {fail(error);}
  syncUI();

  // Read-only diagnostics for local verification and future embedding.
  function physicalUI(){
    const u=window.BlackHoleModel.units(state.mass,10**state.rateLog);
    $('model-mass').value=$('mass').value=state.mass;
    $('model-mass-value').textContent=$('mass-value').textContent=state.mass+' M☉';
    $('radius-value').textContent='事件视界半径 '+u.rsKm.toFixed(2)+' km';
    $('model-rate').value=state.rateLog;$('rate-value').textContent=(10**state.rateLog).toExponential(1)+' M☉/年';
    $('false-color').checked=state.falseColor;
    $('physical-info').textContent='Rₛ '+u.rsKm.toFixed(2)+' km · 盘温峰 '+(u.peakTemperature/1e6).toFixed(2)+' 百万 K · 局部辐射峰 '+(.00289777/u.peakTemperature*1e9).toFixed(2)+' nm';
    $('band-info').textContent=state.falseColor?'当前：橙色假色温度图，颜色不是人眼所见；亮度映射总辐射强度。':'当前：可见光黑体谱 + 曝光映射；辐射峰在 X 射线或紫外，非橙色火焰。';
  }
  for(const id of ['mass','model-mass'])$(id).addEventListener('input',e=>{state.mass=Number(e.target.value);physicalUI();requestRender();});
  $('model-rate').addEventListener('input',e=>{state.rateLog=Number(e.target.value);physicalUI();requestRender();});
  $('false-color').addEventListener('change',e=>{state.falseColor=e.target.checked;physicalUI();requestRender();});
  physicalUI();
  document.querySelectorAll('[data-jump]').forEach(a=>a.addEventListener('click',()=>{document.querySelector('[data-stage="'+a.dataset.jump+'"]').click();}));
  function showCompleteEffect() {
    preset('cinematic');
    state.falseColor = true;
    state.paused = false;
    course.refresh();
    physicalUI();
    syncUI();
    requestRender();
  }
  document.querySelectorAll('[data-view-effect]').forEach(a=>a.addEventListener('click',e=>{
    e.preventDefault();
    showCompleteEffect();
    history.replaceState(null,'','?view=effect#experiment');
    $('experiment').scrollIntoView({behavior:reducedMotion?'instant':'smooth'});
  }));
  document.querySelectorAll('[data-start-course]').forEach(a=>a.addEventListener('click',e=>{
    e.preventDefault();
    course.restart();
    history.replaceState(null,'',location.pathname+'#experiment');
    $('build-auto').click();
  }));
  if (new URLSearchParams(location.search).get('view') === 'effect') showCompleteEffect();
  window.blackHoleLab = Object.freeze({
    getState: () => ({...state, journey:course.getState(), clock, flowClock, renderCount, units:window.BlackHoleModel.units(state.mass,10**state.rateLog),raySteps:qualitySettings[state.quality].steps,model:course.model(), width:course.isSchematic()?physics.canvas.width:canvas.width, height:course.isSchematic()?physics.canvas.height:canvas.height, failure}),
    render: () => render(true),
    readPixels: () => {render(true); if(course.isSchematic())return physics.readPixels(); const pixels=new Uint8Array(canvas.width*canvas.height*4); gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels); return pixels;},
  });
})();
