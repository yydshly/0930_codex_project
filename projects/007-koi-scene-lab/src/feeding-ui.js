import {feedingPresentation} from './feeding-status.js';

export function bindFeeding({getCourtyard,prepareInteraction,refresh}) {
 const $=id=>document.getElementById(id);
 const setText=(id,text)=>{if($(id).textContent!==text)$(id).textContent=text;};
 function update(){
  const c=getCourtyard(),round=c?.school.feeding.latest();
  $('feeding-feedback').hidden=!c?.hasDynamics||!round;
  if(!c||!round)return;
  const h=c.interaction,data=feedingPresentation({round,mode:h.mode,phase:h.phase,paused:c.settings.paused,simulationActive:c.active&&!document.hidden,cumulative:c.school.consumed,fishCount:c.settings.fishCount});
  setText('feeding-status',data.status);setText('feeding-counts',data.counts);setText('feeding-note',data.note);
  setText('feeding-pause',c.settings.paused?'继续动态':'暂停动态');
  $('feeding-pause').setAttribute('aria-pressed',String(c.settings.paused));
  const stop=$('feeding-stop'),hideStop=h.mode!=='feed';
  if(hideStop&&!stop.hidden&&document.activeElement===stop)$('feeding-pause').focus({preventScroll:true});
  stop.hidden=hideStop;
  $('feeding-again').disabled=!['idle','inspect'].includes(h.mode)||!c.hasDynamics;
 }
 $('feeding-pause').addEventListener('click',()=>{const c=getCourtyard();if(!c?.hasDynamics)return;c.updateSettings({paused:!c.settings.paused});update();});
 $('feeding-stop').addEventListener('click',()=>{const c=getCourtyard();if(c?.interaction.mode!=='feed')return;c.interaction.stop(true);refresh();update();});
 $('feeding-again').addEventListener('click',()=>{const c=getCourtyard();if(!c?.hasDynamics||!['idle','inspect'].includes(c.interaction.mode))return;prepareInteraction();c.feed();refresh();update();});
 update();return {update};
}
