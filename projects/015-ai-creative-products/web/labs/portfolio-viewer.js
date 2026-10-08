/** The same DOM controller runs in the lab and its offline HTML export. */
export function createPortfolioViewer(page,items,initialIndex=0,onChange=()=>{}){
 const objects=[...page.querySelectorAll('[data-project]')],nav=page.querySelector('.folio-navigation'),detail=page.querySelector('.portfolio-detail'),heading=detail.querySelector('h3');
 const controller=new AbortController(),signal=controller.signal,motion=matchMedia('(prefers-reduced-motion: reduce)');
 let index=Math.max(0,initialIndex),reading=false,phase='closed',timer=0,token=0,drag=null,disposed=false,returnTarget=null,paperFrame=0;
 // Each face is sliced from the same print, rather than redrawn as six cards.
 // The original object and its content nodes remain throughout opening/closing.
 const paperCount=6,papers=objects.map(object=>{
  const cover=object.querySelector('.folio-cover'),front=cover.querySelector('.folio-front'),back=cover.querySelector('.folio-back');
  const source=document.createElement('span');source.hidden=true;source.setAttribute('aria-hidden','true');source.className='folio-paper-source';
  source.append(front,back,cover.querySelector('.folio-cover-edge'));cover.append(source);
  const bands=[];let parent=cover;
  for(let i=0;i<paperCount;i++){
   const band=document.createElement('span');band.className='folio-paper-band';band.dataset.band=String(i);band.setAttribute('aria-hidden','true');
   for(const [side,original,offset] of [['front',front,i],['back',back,paperCount-1-i]]){
    const face=document.createElement('span');face.className='folio-paper-face folio-paper-'+side;
    // A one-pixel bleed avoids exposed seams without shifting the print.
    const print=original.cloneNode(true);print.style.width=`calc(${paperCount*100}% - ${paperCount*2}px)`;print.style.left=`calc(${-offset*100}% + ${offset*2+1}px)`;face.append(print);band.append(face);
   }
   if(i===paperCount-1){const edge=document.createElement('span');edge.className='folio-paper-thin-edge';band.append(edge);}
   parent.append(band);parent=band;bands.push(band);
  }
  const shade=document.createElement('span');shade.className='folio-page-shade';shade.setAttribute('aria-hidden','true');object.querySelector('.folio-inside').append(shade);
  return {cover,bands,shade,angle:-1,bend:0,shadow:0};
 });
 function paintPaper(){
  for(const paper of papers){
   const matrix=new DOMMatrixReadOnly(getComputedStyle(paper.cover).transform),angle=Math.max(0,Math.min(155,Math.atan2(matrix.m13,matrix.m11)*180/Math.PI));
   if(Math.abs(paper.angle-angle)<.001)continue;
   paper.angle=angle;const arc=Math.sin(angle*Math.PI/180);
   paper.bend=.45+2.6*arc;paper.shadow=.04+.27*arc;
   let normal=angle;
   paper.bands.forEach((band,i)=>{
    const bend=i===0?0:paper.bend*(.4+i*.14);normal+=bend;
    band.style.setProperty('--paper-bend',-bend+'deg');
    band.style.setProperty('--paper-shade',String(.025+.07*Math.abs(Math.sin(normal*Math.PI/180))));
   });
   paper.shade.style.opacity=String(paper.shadow);
   paper.cover.style.setProperty('--paper-edge-light',String(.28+.34*Math.abs(Math.cos(angle*Math.PI/180))));
  }
 }
 function watchPaper(){
  paperFrame=0;if(disposed)return;paintPaper();
  if(phase==='opening'||phase==='closing'||papers.some(p=>p.cover.getAnimations().some(a=>a.playState==='running')))paperFrame=requestAnimationFrame(watchPaper);
 }
 function queuePaper(){if(!paperFrame)paperFrame=requestAnimationFrame(watchPaper);}
 const item=()=>items[index],distance=j=>((j-index+Math.floor(items.length/2)+items.length)%items.length)-Math.floor(items.length/2);
 function notify(){onChange({focus:item().id,selected:reading?item().id:null,readingPhase:phase});}
 function sync(){
  page.dataset.reading=String(reading);page.dataset.foldPhase=phase;
  objects.forEach((object,j)=>{const focused=j===index,unavailable=reading&&!focused;object.style.setProperty('--distance',distance(j));object.dataset.focus=String(focused);object.dataset.opened=String(reading&&focused&&phase!=='closing');object.setAttribute('aria-pressed',String(focused));object.setAttribute('aria-expanded',String(reading&&focused));object.setAttribute('aria-label',(focused?'打开 ':'聚焦 ')+items[j].title);object.tabIndex=unavailable?-1:0;object.inert=unavailable;object.setAttribute('aria-hidden',String(unavailable));});
  nav.querySelector('span').textContent=`${index+1} / ${items.length}`;nav.querySelector('b').textContent=item().title;page.querySelector('[data-open]').hidden=reading;
  detail.hidden=!reading;detail.inert=phase!=='open';detail.setAttribute('aria-hidden',String(phase!=='open'));
  detail.querySelector('[data-detail-id]').textContent=`OBJECT ${item().id} / ${item().type}`;heading.textContent=item().title;detail.querySelector('[data-description]').textContent=item().description;detail.querySelector('[data-result]').textContent=item().result;detail.querySelector('[data-boundary]').textContent=item().boundary;
  page.querySelector('.folio-room-note').textContent=reading?'翻开档案 · 查看这一件作品':'拖动陈列 · 聚焦物件 · 翻开阅读';paintPaper();queuePaper();notify();
 }
 function complete(operation=token,focus=true,force=false){
  if(disposed||operation!==token)return;clearTimeout(timer);
  if(phase==='opening'||phase==='closing'){
   const cover=objects[index].querySelector('.folio-cover');
   if(force){getComputedStyle(cover).transform;for(const animation of cover.getAnimations())if(animation.transitionProperty==='transform')animation.finish();}
   const matrix=new DOMMatrixReadOnly(getComputedStyle(cover).transform),angle=phase==='opening'?155*Math.PI/180:0;
   if(!motion.matches&&(Math.abs(matrix.m11-Math.cos(angle))>.00001||Math.abs(matrix.m13-Math.sin(angle))>.00001)){timer=setTimeout(()=>complete(operation,focus),120);return;}
   for(const animation of cover.getAnimations())if(animation.transitionProperty==='transform')animation.finish();
  }
  if(phase==='opening'){phase='open';sync();if(focus)heading.focus({preventScroll:true});}
  else if(phase==='closing'){phase='closed';reading=false;sync();if(focus)(returnTarget?.isConnected?returnTarget:objects[index]).focus({preventScroll:true});}
 }
 function begin(nextPhase){
  clearTimeout(timer);token++;phase=nextPhase;sync();
  if(motion.matches)complete();else{const operation=token;timer=setTimeout(()=>complete(operation),1050);}
 }
 function open(trigger){if(reading&&phase!=='closing')return;returnTarget=trigger||objects[index];reading=true;begin('opening');}
 function close(){if(reading&&phase!=='closing')begin('closing');}
 function step(delta){index=(index+delta+items.length)%items.length;if(reading){returnTarget=objects[index];begin('opening');}else sync();}
 page.addEventListener('transitionend',event=>{if(event.target===objects[index].querySelector('.folio-cover')&&event.propertyName==='transform'&&(phase==='opening'||phase==='closing')){const matrix=new DOMMatrixReadOnly(getComputedStyle(event.target).transform),expected=phase==='opening'?Math.cos(155*Math.PI/180):1;if(Math.abs(matrix.m11-expected)<.005)complete();}},{signal});
 page.addEventListener('click',event=>{if(drag?.moved)return;const button=event.target.closest('button');if(!button)return;if(button.dataset.project){const next=objects.indexOf(button);if(next===index)open(button);else{index=next;sync();}}else if(button.dataset.step)step(Number(button.dataset.step));else if(button.hasAttribute('data-open'))open(button);else if(button.hasAttribute('data-close'))close();},{signal});
 page.addEventListener('keydown',event=>{if(event.key==='Escape'&&reading){event.preventDefault();close();}else if(event.key==='Enter'&&event.target.classList.contains('folio-space')){event.preventDefault();open(objects[index]);}else if((event.key==='ArrowLeft'||event.key==='ArrowRight')&&(reading||event.target.closest('.folio-space,.folio-navigation'))){event.preventDefault();step(event.key==='ArrowRight'?1:-1);}},{signal});
 page.addEventListener('pointerdown',event=>{if(event.target.closest('.folio-space'))drag={x:event.clientX,y:event.clientY,moved:false};},{signal});
 page.addEventListener('pointermove',event=>{if(!drag)return;if(Math.abs(event.clientY-drag.y)>35){drag=null;return;}if(Math.abs(event.clientX-drag.x)>65){step(event.clientX>drag.x?-1:1);drag.x=event.clientX;drag.moved=true;}},{signal});
 window.addEventListener('pointerup',()=>{if(drag){const previous=drag;setTimeout(()=>{if(drag===previous)drag=null;},0);}},{signal});
 window.addEventListener('pointercancel',()=>drag=null,{signal});window.addEventListener('blur',()=>drag=null,{signal});motion.addEventListener('change',()=>{if(motion.matches)complete();},{signal});
 sync();
 return {getState:()=>({focus:item().id,selected:reading?item().id:null,readingPhase:phase,paper:{bands:paperCount,angle:+papers[index].angle.toFixed(3),bendPerBand:+papers[index].bend.toFixed(3),gutterShadow:+papers[index].shadow.toFixed(3),thickness:.7,model:'bounded visual bend from the actual cover angle'}}),setActive(value){drag=null;if(!value)complete(token,false,true);},dispose(){disposed=true;clearTimeout(timer);cancelAnimationFrame(paperFrame);controller.abort();}};
}
