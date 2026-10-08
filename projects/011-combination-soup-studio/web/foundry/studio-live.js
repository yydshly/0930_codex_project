import {escapeHTML as esc} from './core.js?v=20261003-16';
import {createHeadphoneRenderer} from './headphone-renderer.js?v=20261003-16';
import {headphoneResult} from './headphone-domain.js?v=20261003-16';

export function mountStudioLive(host,c,{onChange,onOpen}){
  const s={color:c.product.initial.color,finish:c.product.initial.finish,explode:c.product.initial.explode,...c.headphones.initial};
  const views=[['hero','完整'],['front','正面'],['side','侧面'],['detail','铝壳'],['cushion','耳垫'],['structure','部件']].filter(([k])=>k!=='structure'||c.product.features.structure);
  host.innerHTML=`<div class="sl-heading"><div><p class="s-eyebrow">TRY THE PRODUCT, RIGHT HERE</p><h2>方案对应的实际效果</h2></div><div class="sl-heading-actions"><button id="expand-live-stage" aria-pressed="false">放大画面 ↗</button><a href="#plan-heading">查看与调整制作要求 ↓</a></div></div><div class="sl-layout"><div class="sl-copy"><span class="sl-label">AURA / 本次耳机概念</span><h3>${esc(c.branding.title)}</h3><p class="sl-tagline">${esc(c.branding.tagline)}</p><fieldset class="sl-colors"><legend>试一试配色</legend>${c.product.colors.map(v=>`<label><input type="radio" name="live-color" value="${v.value}"><i style="background:${v.value}"></i><span>${esc(v.label)}</span></label>`).join('')}</fieldset>${c.product.features.finish?'<label class="sl-field">表面<select id="live-finish"><option value="matte">细腻哑光</option><option value="gloss">亮面金属</option></select></label>':''}<div class="sl-environments" role="group" aria-label="观察环境"><button data-live-environment="warm">静谧棚拍</button><button data-live-environment="night">夜色声场</button></div><label class="sl-field">折叠观察 <output id="live-fold-value"></output><input id="live-fold" type="range" min="0" max="100" step="1"></label><button id="open-live-product" class="s-primary">带着当前选择打开完整体验 <span>↗</span></button></div><div class="sl-viewer"><div class="sl-stage"><canvas id="studio-live-canvas" tabindex="0" aria-label="耳机实时模型，拖动或方向键旋转，加减键缩放"></canvas><span class="sl-stage-label">${esc(c.product.name)} / 实时概念模型</span><div class="sl-views" role="group" aria-label="模型视角">${views.map(([k,v])=>`<button data-live-view="${k}" aria-pressed="${s.view===k}">${v}</button>`).join('')}</div></div><div class="sl-selection"><strong id="live-selection-summary" aria-live="polite"></strong><button id="reset-live-selection">重置 ↺</button></div><p id="live-render-status" class="sl-render-status" role="status">正在准备模型…</p></div></div><p class="sl-boundary">模型采用已实现的 AURA 概念。调整文案和操作范围可以立即验证；修改制作要求后，新的形体与素材仍需制作。</p>`;
  const $=q=>host.querySelector(q),all=q=>[...host.querySelectorAll(q)];let renderer,disposed=false;
  const result=()=>headphoneResult(c,s,renderer?.getViewState());
  const text=(selector,value)=>{const el=$(selector);if(el.textContent!==value)el.textContent=value;};
  function sync(){
    all('[name=live-color]').forEach(v=>v.checked=v.value===s.color);
    if($('#live-finish'))$('#live-finish').value=s.finish;
    $('#live-fold').value=s.fold;text('#live-fold-value',s.fold+'%');
    all('[data-live-view]').forEach(v=>v.setAttribute('aria-pressed',String(v.dataset.liveView===s.view)));
    all('[data-live-environment]').forEach(v=>v.setAttribute('aria-pressed',String(v.dataset.liveEnvironment===s.environment)));
    const color=c.product.colors.find(v=>v.value===s.color)?.label;
    text('#live-selection-summary',`${color} · ${s.finish==='gloss'?'亮面':'哑光'} · 折叠 ${s.fold}%${s.explode?' · 部件展开 '+s.explode+'%':''}`);
  }
  function update(){if(disposed)return;sync();renderer?.draw(false);onChange(result());}
  const canvas=$('#studio-live-canvas');
  canvas.addEventListener('headphone-render-state',e=>{
    if(disposed)return;
    if(e.detail.contextLost){text('#live-render-status','三维画面连接已失效。重新整理方案可恢复；已记录的选择仍保留。');all('[data-live-view]').forEach(b=>b.disabled=true);$('#live-fold').disabled=true;return;}
    const fallback=e.detail.renderer==='canvas';
    text('#live-render-status',fallback?'三维不可用；可以选择配色并打开完整体验。':(e.detail.focus==='cup'?'耳罩近景 · ':'')+'拖动旋转 · 方向键旋转 · 加减键缩放');
    all('[data-live-view]').forEach(b=>b.disabled=fallback);$('#live-fold').disabled=fallback;
    if(fallback){s.fold=0;s.explode=0;s.view='hero';}
    else if(e.detail.view)s.view=e.detail.view;
    sync();if(renderer)onChange(result());
  });
  renderer=createHeadphoneRenderer(canvas,()=>s);if(s.view!=='custom')renderer.setView(s.view);
  all('[name=live-color]').forEach(el=>el.addEventListener('change',()=>{s.color=el.value;update();}));
  $('#live-finish')?.addEventListener('change',e=>{s.finish=e.target.value;update();});
  $('#live-fold').addEventListener('input',e=>{s.fold=Number(e.target.value);update();});
  all('[data-live-environment]').forEach(b=>b.addEventListener('click',()=>{s.environment=b.dataset.liveEnvironment;update();}));
  all('[data-live-view]').forEach(b=>b.addEventListener('click',()=>{s.view=b.dataset.liveView;s.explode=s.view==='structure'?85:0;renderer.setView(s.view);update();}));
  $('#expand-live-stage').addEventListener('click',()=>{const expanded=host.classList.toggle('is-expanded');$('#expand-live-stage').setAttribute('aria-pressed',String(expanded));$('#expand-live-stage').textContent=expanded?'收起画面 ↙':'放大画面 ↗';});
  $('#reset-live-selection').addEventListener('click',()=>{Object.assign(s,{color:c.product.colors[0].value,finish:'matte',fold:0,explode:0,view:'hero',environment:'warm',camera:null});renderer.setView('hero');update();});
  $('#open-live-product').addEventListener('click',()=>{renderer.draw();onChange(result());onOpen();});
  update();return {dispose(){disposed=true;renderer.dispose();host.classList.remove('is-expanded');host.replaceChildren();}};
}
