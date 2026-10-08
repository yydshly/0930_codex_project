// A state-driven notebook. Commands still go through the game's existing rules.
const node=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls||'';if(text!==undefined)e.textContent=text;return e};
export function createInspection(host,onCommand){
 const root=node('section','play-inspection');root.setAttribute('aria-label','当前场景与行动依据');host.append(root);let key='';
 return {element:root,sync(model){
  const next=JSON.stringify(model||null);if(next===key)return;key=next;root.hidden=!model;if(!model)return;
  const focused=document.activeElement?.closest('[data-inspection-command]')?.dataset.inspectionCommand;
  root.replaceChildren();const heading=node('div','inspection-heading');heading.append(node('h3','',model.title),node('span','inspection-caption',model.caption||'随游戏进度更新'));root.append(heading);
  if(model.summary)root.append(node('p','inspection-summary',model.summary));
  const list=node('ul','inspection-grid');for(const item of model.items||[]){const li=node('li','inspection-item'+(item.tone?' tone-'+item.tone:''));li.append(node('span','inspection-label',item.label),node('strong','inspection-value',item.value));if(item.detail)li.append(node('small','inspection-detail',item.detail));if(item.command){const button=node('button','inspection-command',item.action||'查看');button.type='button';button.dataset.inspectionCommand=item.command;button.disabled=!!item.disabled;button.setAttribute('aria-label',(item.action||'查看')+'：'+item.label);if(item.selected!==undefined)button.setAttribute('aria-pressed',String(item.selected));button.onclick=()=>onCommand(item.command);li.append(button)}list.append(li)}root.append(list);
  if(model.note)root.append(node('p','inspection-note',model.note));
  if(focused)root.querySelector('[data-inspection-command="'+CSS.escape(focused)+'"]')?.focus({preventScroll:true});
 }};
}
