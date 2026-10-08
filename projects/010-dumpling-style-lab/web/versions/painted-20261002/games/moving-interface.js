const formatTime=n=>{const sec=Math.floor(n||0);return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0')};
const escapeText=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createMovingInterface({container,canvas,command}){
 const root=document.createElement('div');root.className='moving-ui';
 root.innerHTML=`<div class="moving-hud"><div class="moving-location"><span class="moving-label">MOVING DAY / 搬家日</span><strong class="moving-place"></strong><span class="moving-weather"></span></div><div class="moving-hud-actions"><button class="moving-details" type="button">委托详情</button><button class="moving-records" type="button">搬家记录</button></div></div><div class="moving-footer"><div class="moving-cargo-list" aria-label="本单货物"></div><div class="moving-hint"><span class="moving-hint-title"></span><span class="moving-hint-detail"></span></div></div>`;
 const overlay=document.createElement('section');overlay.className='moving-overlay';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','moving-panel-title');
 const panel=document.createElement('div');panel.className='moving-panel';panel.tabIndex=-1;overlay.append(panel);
 const items=root.querySelector('.moving-cargo-list'),recordsButton=root.querySelector('.moving-records');let previous='',latestState;
 (container.querySelector('.game-stage')||container).append(root);container.append(overlay);
 root.querySelector('.moving-details').addEventListener('click',()=>command(latestState?.orderDone?'return':'brief'));
 recordsButton.addEventListener('click',()=>command('records'));
 panel.addEventListener('click',e=>{const b=e.target.closest('[data-moving-command]');if(b&&!b.disabled)command(b.dataset.movingCommand)});
 overlay.addEventListener('keydown',e=>{
   if(e.key==='Escape'&&latestState&&!latestState.failed&&latestState.phase!=='result'){e.preventDefault();e.stopPropagation();command('return');return}
   if(e.key!=='Tab')return;const buttons=[...panel.querySelectorAll('button:not(:disabled)')];if(!buttons.length)return;
   const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 });
 const button=(id,label,secondary=false,disabled=false)=>`<button type="button" data-moving-command="${id}" class="${secondary?'secondary':''}" ${disabled?'disabled':''}>${label}</button>`;
 function update(s,o,status){
   latestState=s;const progress=s.cargo.filter(c=>c.delivered).length,held=s.cargo.find(c=>c.id===s.holding),signature=JSON.stringify([s.phase,s.failed,s.orderDone,s.orderIndex,s.holding,progress,status.ready,status.error,status.loaded,s.recoveringUntil>s.time,s.recoveries,s.records]);
   if(signature===previous)return;previous=signature;const hadFocus=overlay.contains(document.activeElement);container.dataset.movingPhase=s.phase;panel.dataset.kind=s.phase==='records'?'records':'message';
   root.querySelector('.moving-place').textContent=o.place;root.querySelector('.moving-weather').textContent=o.weather;
   root.querySelector('.moving-details').textContent=s.orderDone?'交付详情':'委托详情';root.querySelector('.moving-details').disabled=s.failed;
   recordsButton.disabled=!s.records.length||s.failed;recordsButton.textContent='记录 '+s.records.length+'/3';
   overlay.hidden=status.ready&&s.phase==='playing'&&!s.failed;
   items.replaceChildren(...s.cargo.map((item,index)=>{const div=document.createElement('div');div.className='moving-cargo-item'+(item.delivered?' delivered':'')+(item.id===s.holding?' carrying':'');const number=document.createElement('span'),info=document.createElement('span'),name=document.createElement('b'),detail=document.createElement('small');number.textContent=item.delivered?'✓':String(index+1).padStart(2,'0');name.textContent=item.name;detail.textContent=item.delivered?'已安全装车':item.id===s.holding?'正在搬运':item.detail;info.append(name,detail);div.append(number,info);return div}));
   root.querySelector('.moving-hint-title').textContent=held?'正在搬：'+held.name:'把生活，稳稳送到';
   root.querySelector('.moving-hint-detail').textContent=held?.type==='fragile'?'不要投掷 · 从斜坡走上车后轻放':held?.mass>3?'重物走得慢 · 先观察路，再起跳':'点选货物走近 · 点货车可辅助送达';
   if(!status.ready){panel.innerHTML=`<p class="moving-kicker">MOVING DAY</p><h2 id="moving-panel-title">街灯正在亮起</h2><p>${status.error||'正在准备手绘街区、人物与货物…'}</p>${status.error?button('reload-art','重新加载场景'):`<p>已准备 ${status.loaded} / ${status.total}</p><progress class="moving-loading-progress" value="${status.loaded}" max="${status.total}" aria-label="场景素材加载进度"></progress>`}`}
   else if(s.failed){panel.innerHTML=`<p class="moving-kicker">重新稳住这一单</p><h2 id="moving-panel-title">保护层受损了。</h2><p>物件仍在，但需要重新检查包装。已经装车的货物会保留；这次补包装会记入交付报告。</p><div class="moving-panel-actions">${button('repair',s.recoveringUntil>s.time?'正在重新包装…':'补好包装，继续搬运',false,s.recoveringUntil>s.time)}${button('retry','从这一单重新开始',true)}</div>`}
   else if(s.phase==='records'){
     const records=s.records.slice().sort((a,b)=>a.order-b.order);
     panel.innerHTML=`<p class="moving-kicker">MOVING DAY / 搬家记录</p><h2 id="moving-panel-title">生活留下了回声。</h2><div class="moving-record-list">${records.map(r=>`<article class="moving-record"><div><b>委托 ${String(r.order+1).padStart(2,'0')}</b><span>最佳评价 ${r.score} · 用时 ${formatTime(r.time)}</span></div><p>${escapeText(r.thanks)}</p>${button('order-'+r.order,'重访这份委托',true,!s.orderDone)}</article>`).join('')||'<p>完成第一份委托后，人物的感谢信会留在这里。</p>'}</div><div class="moving-panel-actions">${button('return',s.orderDone?'回到交付结果':'继续这一单')}</div>${!s.orderDone?'<p class="moving-footnote">完成当前搬运后，可以选择已完成的委托；正在搬运的进度会保留。</p>':''}`;
   }
   else if(s.orderDone){const score=Math.max(55,100-s.recoveries*12-Math.min(10,s.throws*2));panel.innerHTML=`<p class="moving-kicker">${o.chapter} / 安全送达</p><h2 id="moving-panel-title">${s.orderIndex===2?'今天，三处灯亮了。':'这一段生活，到家了。'}</h2><p class="moving-letter">${o.thanks}</p><div class="moving-result"><div><b>${progress}/3</b><span>完整交付</span></div><div><b>${formatTime(s.elapsed)}</b><span>搬运用时</span></div><div><b>${score}</b><span>交付评价</span></div></div><p class="moving-footnote">${s.throws===0&&s.recoveries===0?'本次达成：无投掷、无补包装，完整送达。':'本次投掷 '+s.throws+' 次 / 补包装 '+s.recoveries+' 次。重访可挑战更稳妥的搬运。'}</p><div class="moving-panel-actions">${button(s.orderIndex<2?'next-order':'replay',s.orderIndex<2?'接下一份委托':'从第一单再出发')}${button('records','查看搬家记录',true)}${button('retry','练习当前委托',true)}</div><p class="moving-footnote">${s.orderIndex===2?'三份委托的最佳评价与感谢信已经保存。':'人物的回应会留在搬家记录里。'}</p>`}
   else{panel.innerHTML=`<p class="moving-kicker">委托 ${o.chapter} / 03 · ${o.client}</p><h2 id="moving-panel-title">${o.headline}</h2><p>${o.summary}</p><blockquote>${o.letter}</blockquote><div class="moving-instructions"><span><kbd>A D</kbd> 或方向键移动</span><span><kbd>E</kbd> 拿起 / 轻放</span><span><kbd>空格</kbd> 越过障碍</span></div><div class="moving-panel-actions">${button('start',progress||s.holding||s.elapsed>0?'继续这一单':'接下委托，开始搬运')}</div><p class="moving-footnote">也可以点击货物与货车游玩。声音由你主动开启。</p>`}
   if(canvas?.parentElement.hidden)return;
   if(!overlay.hidden)(panel.querySelector('button:not(:disabled)')||panel).focus({preventScroll:true});
   else if(hadFocus)canvas?.focus({preventScroll:true});
 }
 return {update,dispose(){root.remove();overlay.remove()}};
}
