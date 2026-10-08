import {ART_DIRECTIONS,supportsArtDirection} from './art-preferences.js';
import {directionMap} from './showcase-catalog.js';

export function createLegacyToolbar({getId,onSwitch}){
 const bar=document.createElement('div');bar.className='legacy-toolbar';bar.hidden=true;
 const label=document.createElement('label');label.textContent='当前游戏的美术画风 ';
 const select=document.createElement('select');select.setAttribute('aria-label','保留或切换当前游戏美术画风');
 for(const d of ART_DIRECTIONS){const option=document.createElement('option');option.value=d.id;option.textContent=d.name;select.append(option)}label.append(select);
 const favorite=document.createElement('button');favorite.type='button';favorite.textContent='记住此画风';favorite.setAttribute('aria-pressed','false');
 const independent=document.createElement('a');independent.textContent='独立窗口试玩 ↗';independent.target='_blank';independent.rel='noopener';
 const archive=document.createElement('a');archive.textContent='已保存的原画版 ↗';archive.target='_blank';archive.rel='noopener';
 const note=document.createElement('span');note.textContent='原有世界 · 画风与进度分别保存';bar.append(label,favorite,independent,archive,note);
 document.querySelector('#player-frame').before(bar);
 const samples=document.createElement('div');samples.className='legacy-style-samples';samples.hidden=true;samples.setAttribute('aria-label','旅店的四种新美术风格');
 for(const d of ART_DIRECTIONS.filter(d=>d.raster)){const button=document.createElement('button');button.type='button';button.dataset.look=d.id;button.setAttribute('aria-pressed','false');const image=document.createElement('img');image.src='assets/art-styles/'+d.id+'/playable-preview.webp';image.alt='';image.loading='lazy';const title=document.createElement('strong');title.textContent=d.name;const caption=document.createElement('span');caption.textContent=d.description.split('。')[0];button.append(image,title,caption);button.onclick=()=>send({type:'dumpling-art-select',look:d.id});samples.append(button)}
 bar.after(samples);
 const send=data=>document.querySelector('.legacy-frame')?.contentWindow?.postMessage(data,location.origin);
 select.onchange=()=>send({type:'dumpling-art-select',look:select.value});favorite.onclick=()=>send({type:'dumpling-art-favorite'});
 window.addEventListener('message',e=>{
   if(e.origin!==location.origin||e.source!==document.querySelector('.legacy-frame')?.contentWindow)return;
   if(e.data?.type==='dumpling-extension-selected'){onSwitch('legacy-'+e.data.game);return}
   if(e.data?.type!=='dumpling-art-preference')return;
   select.value=e.data.look;favorite.textContent=e.data.favorite?'已记住此画风 ✓':'记住此画风';favorite.setAttribute('aria-pressed',String(!!e.data.favorite));
   for(const button of samples.children)button.setAttribute('aria-pressed',String(button.dataset.look===e.data.look));
   note.textContent=ART_DIRECTIONS.find(d=>d.id===e.data.look)?.description||'原有世界 · 画风与进度分别保存';
   const u=new URL('games.html',location.href);u.searchParams.set('game',e.data.game);u.searchParams.set('look',e.data.look);if(new URLSearchParams(location.search).has('qa'))u.searchParams.set('qa','1');u.hash='game-view';independent.href=u;
 });
 return {sync(){const d=directionMap[getId()];bar.hidden=!d?.legacy;samples.hidden=!d?.legacy||d.game!=='inn';if(!d?.legacy)return;
   for(const o of select.options)o.disabled=!supportsArtDirection(o.value,d.game);
   const u=new URL('games.html',location.href);u.searchParams.set('game',d.game);if(new URLSearchParams(location.search).has('qa'))u.searchParams.set('qa','1');u.hash='game-view';independent.href=u;const saved=new URL(u);saved.pathname=saved.pathname.replace('games.html','versions/painted-20261002/games.html');archive.href=saved;
 },request(){send({type:'dumpling-art-request'})}};
}
