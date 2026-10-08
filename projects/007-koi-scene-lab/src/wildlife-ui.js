const phases={idle:'已恢复平静',alert:'警觉',startled:'受惊散开',recovering:'逐渐恢复'};
export function bindWildlife({getCourtyard,document:doc=globalThis.document}){
 const panel=doc.getElementById('startle-feedback'),status=doc.getElementById('startle-status'),metrics=doc.getElementById('startle-counts'),catStatus=doc.getElementById('cat-status');
 function update(){
  const c=getCourtyard(),s=c?.school.startleState;
  if(catStatus){const cat=c?.animals?.cat,label=({observe:'停坐观察',stand:'正在起身',walk:'干地巡游',sit:'正在坐下'})[cat?.state];catStatus.dataset.state=c?.imported?'unavailable':cat?.state??'unavailable';catStatus.textContent=c?.imported?'庭院猫属于程序庭院；返回庭院后可观察。':label?`庭院猫：${label}${c.settings.paused?' · 已暂停':''} · 点击巡游可重新观察。`:'庭院猫在前景砾石上观察池塘。';}
  panel.hidden=!c?.hasDynamics||!s||(s.phase==='idle'&&!s.triggerCount&&c.interaction.mode!=='stroke');
  if(panel.hidden)return;
  const label=phases[s.phase]??'观察中',paused=c.settings.paused?' · 已暂停':'';
  const text=s.phase==='idle'?'鱼群已恢复平静，可再次轻触观察反应。':s.phase==='alert'?'手正在靠近，附近的鱼进入警觉。':s.phase==='startled'?'鱼群正在转向、加速并离开手边。':'手已收回，受惊反应逐渐减弱。';
  const next=`${label}${paused}：${text}`;
  if(status.textContent!==next)status.textContent=next;
  const count=`当前响应 ${s.affectedFish??0} 条 · 受惊触发 ${s.triggerCount??0} 次${s.phase==='recovering'&&Number.isFinite(s.remaining)?` · 剩余约 ${s.remaining.toFixed(1)} 模拟秒`:''}`;
  if(metrics.textContent!==count)metrics.textContent=count;
  for(const step of panel.querySelectorAll('[data-reaction-phase]')){
   if(step.dataset.reactionPhase===s.phase)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');
  }
 }
 update();return {update};
}
