import {research} from './research-data.js';
const $=id=>document.getElementById(id);
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
$('identity').innerHTML=research.identity.map(item=>`<article class="identity-card ${item.tone}"><span>${escape(item.label)}</span><h2>${escape(item.title)}</h2><p>${escape(item.text)}</p></article>`).join('');
$('quick-links').innerHTML=research.studies.map((item,i)=>`<a class="quick-link" href="${item.href}"><img src="${item.image}" alt="" width="120" height="80"><span><small>0${i+1} / ${escape(item.type)}</small><b>${escape(item.title)}</b><em>${escape(item.link)} ↗</em></span></a>`).join('');
$('study-grid').innerHTML=research.studies.map(item=>`<article class="study-card" data-group="${item.group}"><a class="study-image" href="${item.href}" tabindex="-1" aria-hidden="true"><img src="${item.image}" loading="lazy" alt="${escape(item.title)}的真实浏览器运行截图"></a><div class="study-body"><span class="study-type">${escape(item.type)}</span><h3>${escape(item.title)}</h3><p>${escape(item.text)}</p><p class="study-evidence">实测 · ${escape(item.evidence)}</p><p class="study-limit">边界 · ${escape(item.limit)}</p><a href="${item.href}">${escape(item.link)} →</a></div></article>`).join('');
$('pipeline').innerHTML=research.pipeline.map((item,i)=>`<li><span class="step">0${i+1}</span><h3>${escape(item.title)}</h3><p>${escape(item.text)}</p><code>${escape(item.api)}</code></li>`).join('');
$('mode-rows').innerHTML=research.effects.map(item=>`<tr><td>${escape(item.name)}</td><td>${escape(item.method)}</td><td>${escape(item.use)}</td></tr>`).join('');
$('product-rows').innerHTML=research.products.map(item=>`<tr><td><b>${escape(item.name)}</b><span>${escape(item.path)}</span></td><td>${escape(item.task)}</td><td>${escape(item.current)}</td><td>${escape(item.next)}</td></tr>`).join('');
$('roadmap-grid').innerHTML=research.roadmap.map(item=>`<article class="roadmap-card"><span class="roadmap-phase">${escape(item.phase)}</span><h3>${escape(item.title)}</h3><ul>${item.items.map(value=>`<li>${escape(value)}</li>`).join('')}</ul><p>${escape(item.dependency)}</p></article>`).join('');
$('evidence-grid').innerHTML=research.evidence.map(item=>`<article class="evidence-card"><b>${item.passed}/${item.total}</b><span>${escape(item.name)}验证</span></article>`).join('');
$('source-links').innerHTML=research.sources.map(item=>`<a href="${item.url}" target="_blank" rel="noopener">${escape(item.title)} ↗</a>`).join('');
for(const button of document.querySelectorAll('[data-filter]'))button.addEventListener('click',()=>{
  const filter=button.dataset.filter;
  for(const b of document.querySelectorAll('[data-filter]')){const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}
  let visible=0;for(const card of document.querySelectorAll('.study-card')){card.hidden=filter!=='all'&&card.dataset.group!==filter;if(!card.hidden)visible++;}
  $('filter-status').textContent=`显示 ${visible} 组研究：${button.textContent}`;
});
const dialog=$('map-dialog'),large=$('large-map');let opener=null;
function zoom(value){const percent=Number(value);large.style.width=`${1800*percent/100}px`;$('zoom-value').value=`${percent}%`;}
function openMap(event){opener=event.currentTarget;dialog.showModal();const fit=Math.max(55,Math.min(100,Math.round((innerWidth*.94-50)/1800*100)));$('map-zoom').value=fit;zoom(fit);}
$('open-map').addEventListener('click',openMap);$('preview-map').addEventListener('click',openMap);
$('map-zoom').addEventListener('input',event=>zoom(event.target.value));$('close-map').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>opener?.focus({preventScroll:true}));
dialog.addEventListener('click',event=>{const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
window.researchSummary={data:research,getVisible:()=>[...document.querySelectorAll('.study-card')].filter(card=>!card.hidden).length};
