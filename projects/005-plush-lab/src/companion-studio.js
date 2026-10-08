import {COMPANION_KEY,createCompanionStore,growthSummary,exportCompanion,companionMarkdown} from './companion-store.js';
import {COMPANION_ACTIONS,companionEvent} from './companion-bridge.js';
import {decodeWorld} from './world-config.js';
import {localDateTime,editedReminderTimestamp,localServiceURL,buildChatPayload} from './companion-ui-utils.js';
import {validateCompanionReply} from '../server/companion-ai.mjs';
import {mountStudioAgentPanel} from './studio-agent-panel.js';
import {mountStudioAvatarView} from './studio-avatar-view.js';
import {supportsLocalCompanionService} from './companion-deployment.js';

const $=selector=>document.querySelector(selector);
const $$=selector=>Array.from(document.querySelectorAll(selector));
let storage=null;try{storage=window.localStorage;}catch{}
const store=createCompanionStore(storage);
let data=store.read().data,storageOK=false,editingNote=null,editingReminder=null;
let originalReminderDueAt=null,originalReminderDisplay='';
let editingNoteBaseline=null,editingReminderBaseline=null;
let worldReady=false,companion={name:'小团子',personality:'curious'},requestNumber=0;
let worldDraftStale=false;
let aiReady=false,aiBusy=false,suggestion=null,chatAbort=null,statusAbort=null;
let dueDismissed=new Set(),downloadURLs=new Set();
const AI_URL_KEY='plush-companion-ai-url-v1';
const localAIAvailable=supportsLocalCompanionService(window.location);
let serviceURL='http://127.0.0.1:8876';
try{const saved=storage?.getItem(AI_URL_KEY);if(saved)serviceURL=localServiceURL(saved);}catch{}
const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
const dateText=time=>new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(time);
const node=(tag,text,className)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;};
function button(text,handler,className){const element=node('button',text,className);element.type='button';element.addEventListener('click',handler);return element;}
function emptyList(container,text){container.append(node('p',text,'empty'));}
function saveStatus(text){$('#save-status').textContent=text;}
function refresh(){
  const result=store.read();data=result.data;storageOK=result.ok;
  $('#storage-error').hidden=result.ok;$('#storage-error').textContent=result.error||'';
  $('#export-json').disabled=!result.ok;$('#export-markdown').disabled=!result.ok;
  render();return result;
}
function update(operation,errorTarget){
  const result=store.mutate(operation);data=result.data;storageOK=result.ok;
  if(!result.ok){if(errorTarget)errorTarget.textContent=result.error;else saveStatus(result.error);return result;}
  $('#storage-error').hidden=true;render();saveStatus('已保存到此浏览器 · '+new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}));return result;
}
function addMemory(kind,title,eventId){return update({type:'memory.add',kind,title:title.slice(0,100),eventId});}
function activateTab(name,focus=false){
  for(const tab of $$('.tabs [data-tab]')){const active=tab.dataset.tab===name;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;$('#panel-'+tab.dataset.tab).hidden=!active;if(active&&focus)tab.focus();}
}
for(const tab of $$('.tabs [data-tab]')){
  tab.addEventListener('click',()=>activateTab(tab.dataset.tab));
  tab.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();const tabs=$$('.tabs [data-tab]'),index=tabs.indexOf(tab);
    const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    activateTab(tabs[next].dataset.tab,true);
  });
}
function renderNotes(){
  const container=$('#notes-list');container.replaceChildren();
  const query=$('#note-search').value.trim().toLocaleLowerCase(),notes=data.notes.filter(note=>(note.title+' '+note.body).toLocaleLowerCase().includes(query));
  if(!notes.length){emptyList(container,query?'没有找到这页笔记，试试其他关键词。':'写下第一个想法，让它在这里慢慢长大。');return;}
  for(const note of notes){
    const card=node('article',undefined,'record');card.append(node('h4',note.title),node('p',note.body,'record-body'),node('p',dateText(note.updatedAt)+' · '+(note.shareWithAI?'已勾选供 AI 参考，待接入':'仅本机保存'),'tiny'));
    const actions=node('div',undefined,'record-actions');actions.append(button('编辑',()=>openNote(note)),button('设为提醒',()=>openReminder({title:note.title})),button('删除',()=>{if(confirm('删除「'+note.title+'」？'))update({type:'note.remove',id:note.id});}));card.append(actions);container.append(card);
  }
}
function renderReminders(){
  const container=$('#reminders-list');container.replaceChildren();
  if(!data.reminders.length){emptyList(container,'安排一件小事，小伙伴会在页面打开时提醒你。');return;}
  const now=Date.now(),reminders=data.reminders.slice().sort((a,b)=>(a.status==='completed')-(b.status==='completed')||a.dueAt-b.dueAt);
  for(const reminder of reminders){
    const complete=reminder.status==='completed',overdue=!complete&&reminder.dueAt<=now;
    const card=node('article',undefined,'record'+(complete?' completed':overdue?' overdue':''));
    card.append(node('h4',reminder.title),node('p',dateText(reminder.dueAt)+' · '+(complete?'已完成':overdue?(reminder.firedAt===null?'已到时间':'已提醒，待完成'):'等待提醒'),'tiny'));
    const actions=node('div',undefined,'record-actions');
    if(!complete)actions.append(button('完成',()=>{const result=update({type:'reminder.complete',id:reminder.id});if(result.ok&&result.changed)addMemory('reminder','完成了：'+reminder.title,'reminder-'+reminder.id);renderDue();}),button('延后 10 分钟',()=>{update({type:'reminder.snooze',id:reminder.id,dueAt:Date.now()+600000});renderDue();}));
    actions.append(button(complete?'再次安排':'编辑',()=>openReminder(complete?{title:reminder.title}:reminder)),button('删除',()=>{if(confirm('删除「'+reminder.title+'」？')){update({type:'reminder.remove',id:reminder.id});renderDue();}}));
    card.append(actions);container.append(card);
  }
}
function renderMemories(){
  const container=$('#memories-list');container.replaceChildren();
  if(!data.memories.length){emptyList(container,'还没有共同回忆。先挥挥手，或者留下一页笔记。');return;}
  const labels={hello:'相遇',play:'玩耍',note:'笔记',reminder:'完成提醒'};
  for(const memory of data.memories){const card=node('article',undefined,'record');card.append(node('h4',memory.title),node('p',labels[memory.kind]+' · '+dateText(memory.createdAt),'tiny'),button('删除回忆',()=>{if(confirm('删除这段回忆？'))update({type:'memory.remove',id:memory.id});},'text-button'));container.append(card);}
}
function renderChat(){
  const container=$('#chat-log'),nearBottom=container.scrollHeight-container.scrollTop-container.clientHeight<60;container.replaceChildren();
  if(!data.messages.length){
    const welcome=node('div',undefined,'chat-empty');welcome.append(node('span','✳','chat-symbol'),node('h3','先把今天留在这里。'),node('p','你可以直接写笔记、设提醒，也可以和左边的小伙伴挥手、捡球。AI 聊天待接入，当前没有模拟 AI 回复。'));container.append(welcome);
  }
  for(const message of data.messages){const row=node('article',undefined,'message '+message.role);row.append(node('span',message.role==='user'?'我':companion.name,'message-label'),node('p',message.text,'message-text'));const actions=node('div',undefined,'message-tools');actions.append(button('记为笔记',()=>openNote({title:message.text.slice(0,40),body:message.text})),button('设为提醒',()=>openReminder({title:message.text.slice(0,100)})));row.append(actions);container.append(row);}
  $('#chat-clear').disabled=!data.messages.length;
  if(nearBottom)container.scrollTop=container.scrollHeight;
}
function render(){
  $('#notes-count').textContent=data.notes.length;$('#reminders-count').textContent=data.reminders.filter(item=>item.status==='pending').length;
  renderNotes();renderReminders();renderMemories();renderChat();
  const growth=growthSummary(data);$('#growth-label').textContent=growth.label;$('#growth-next').textContent='下一段故事：'+growth.next;
  const milestones=$('#growth-milestones');milestones.replaceChildren();for(const item of growth.milestones)milestones.append(node('span',(item.done?'✓ ':'○ ')+item.label,'milestone'+(item.done?' complete':'')));
  agentPanel.recordsChanged({ok:storageOK,data});
}
function renderDue(){
  const due=data.reminders.filter(item=>item.status==='pending'&&item.dueAt<=Date.now()&&item.firedAt!==null&&!dueDismissed.has(item.id+':'+item.dueAt));
  $('#due-banner').hidden=!due.length;$('#due-text').textContent=due.slice(0,3).map(item=>item.title).join(' · ')+(due.length>3?'，还有 '+(due.length-3)+' 项':'');
}
function checkReminders(){
  if(document.visibilityState==='hidden')return;
  const current=store.read();if(!current.ok)return;data=current.data;
  let changed=false;
  for(const reminder of current.data.reminders){if(reminder.status!=='pending'||reminder.dueAt>Date.now()||reminder.firedAt!==null)continue;const result=store.mutate({type:'reminder.claim',id:reminder.id});if(result.ok){data=result.data;changed=changed||result.changed;}}
  if(changed)render();renderDue();
}
$('#due-open').addEventListener('click',()=>{activateTab('reminders',true);$('#panel-reminders').scrollIntoView({behavior:'smooth',block:'nearest'});});
$('#due-dismiss').addEventListener('click',()=>{for(const reminder of data.reminders)if(reminder.status==='pending'&&reminder.dueAt<=Date.now())dueDismissed.add(reminder.id+':'+reminder.dueAt);renderDue();});
function openNote(note={}){
  editingNote=note.id||null;$('#note-dialog-title').textContent=editingNote?'继续写这页笔记':'留下一页笔记';$('#note-title').value=(note.title||'').slice(0,100);$('#note-body').value=note.body||'';$('#note-share').checked=note.shareWithAI===true;$('#note-error').textContent='';$('#note-dialog').showModal();$('#note-title').focus();
  editingNoteBaseline=editingNote?{title:note.title,body:note.body,shareWithAI:note.shareWithAI}:null;$('#note-save-copy').hidden=true;
}
function openReminder(reminder={}){
  editingReminder=reminder.id||null;$('#reminder-dialog-title').textContent=editingReminder?'修改这个提醒':'给未来一个小提醒';$('#reminder-title').value=(reminder.title||'').slice(0,100);$('#reminder-time').value=reminder.dueAt===null?'':localDateTime(reminder.dueAt??Date.now()+1800000);$('#reminder-error').textContent='';$('#reminder-dialog').showModal();$('#reminder-title').focus();
  originalReminderDueAt=editingReminder?reminder.dueAt:null;originalReminderDisplay=$('#reminder-time').value;
  editingReminderBaseline=editingReminder?{title:reminder.title,dueAt:reminder.dueAt,status:reminder.status}:null;$('#reminder-save-copy').hidden=true;
}
for(const control of $$('[data-close]'))control.addEventListener('click',()=>$('#'+control.dataset.close).close());
$('#note-new').addEventListener('click',()=>openNote());$('#reminder-new').addEventListener('click',()=>openReminder());$('#note-search').addEventListener('input',renderNotes);
$('#note-form').addEventListener('submit',event=>{
  event.preventDefault();const before=editingNote;const result=update({type:'note.upsert',...(editingNote?{id:editingNote,expected:editingNoteBaseline}:{}),title:$('#note-title').value,body:$('#note-body').value,shareWithAI:$('#note-share').checked},$('#note-error'));
  if(!result.ok){$('#note-save-copy').hidden=!['record_conflict','record_missing'].includes(result.errorCode);return;}const note=result.data.notes.find(item=>item.id===editingNote)||result.data.notes[0];$('#note-dialog').close();activateTab('notes');if(!before)addMemory('note','留下了一页笔记：'+note.title,'note-'+note.id);
});
$('#reminder-form').addEventListener('submit',event=>{
  event.preventDefault();const dueAt=editedReminderTimestamp($('#reminder-time').value,originalReminderDueAt,originalReminderDisplay);
  if(dueAt===null||dueAt<=Date.now()&&dueAt!==originalReminderDueAt){$('#reminder-error').textContent='请选择未来的有效时间，也可以使用下方快捷时间。';return;}
  const result=update({type:'reminder.upsert',...(editingReminder?{id:editingReminder,expected:editingReminderBaseline}:{}),title:$('#reminder-title').value,dueAt},$('#reminder-error'));
  if(result.ok){$('#reminder-dialog').close();activateTab('reminders');checkReminders();}
  else $('#reminder-save-copy').hidden=!['record_conflict','record_missing'].includes(result.errorCode);
});
$('#note-save-copy').addEventListener('click',()=>{editingNote=null;editingNoteBaseline=null;$('#note-save-copy').hidden=true;$('#note-error').textContent='';$('#note-dialog-title').textContent='另存这页笔记';$('#note-form').requestSubmit();});
$('#reminder-save-copy').addEventListener('click',()=>{editingReminder=null;editingReminderBaseline=null;originalReminderDueAt=null;originalReminderDisplay='';$('#reminder-save-copy').hidden=true;$('#reminder-error').textContent='';$('#reminder-dialog-title').textContent='另存这个提醒';$('#reminder-form').requestSubmit();});
for(const preset of $$('[data-time]'))preset.addEventListener('click',()=>{let due=Date.now()+Number(preset.dataset.time)*60000;if(preset.dataset.time==='tomorrow'){const date=new Date();date.setDate(date.getDate()+1);date.setHours(9,0,0,0);due=date.getTime();}$('#reminder-time').value=localDateTime(due);$('#reminder-error').textContent='';});
$('#timezone-label').textContent='当前设备时区：'+timezone+'。换时区后按同一到点时间显示。';
function refreshWorldActions(){for(const control of $$('[data-action]'))control.disabled=!worldReady||!avatarView.canInteract();}
const avatarView=mountStudioAvatarView({onViewChange:()=>refreshWorldActions()});
function worldAction(action){
  if(!avatarView.canInteract()){saveStatus('切回「我的伙伴」后即可互动；原作当前支持三维观看。');return;}
  if(!worldReady||!COMPANION_ACTIONS.includes(action)){saveStatus('小世界尚未准备好，可以先写笔记。');return;}
  $('#companion-world').contentWindow.postMessage({type:'plush:command',action,requestId:'studio-'+(++requestNumber)},location.origin);
}
for(const control of $$('[data-action]')){control.disabled=true;control.addEventListener('click',()=>worldAction(control.dataset.action));}
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==$('#companion-world').contentWindow)return;
  const packet=companionEvent(event.data);if(!packet)return;
  if(packet.type==='plush:ready'){
    try{decodeWorld(packet.worldCode);}catch{return;}
    companion=packet.companion;worldReady=true;$('#world-connection').textContent='正在陪伴你：'+companion.name+' · 拖动旋转，点击空地行走';
    refreshWorldActions();
    if(!worldDraftStale)for(const selector of ['#world-link','#dress-link','#scene-link'])$(selector).href='world.html#world='+packet.worldCode;
  }else if(packet.type==='plush:error'){worldReady=false;$('#world-connection').textContent=packet.message;refreshWorldActions();}
  else if(packet.type==='plush:draft-stale'){worldDraftStale=true;$('#world-connection').textContent=packet.message;for(const selector of ['#world-link','#dress-link','#scene-link'])$(selector).href='world.html';}
  else if(packet.type==='plush:event'){addMemory(packet.kind,packet.title,packet.eventId);}
});
$('#world-reload').addEventListener('click',()=>{worldReady=false;worldDraftStale=false;refreshWorldActions();$('#world-connection').textContent='正在重新打开最近的小世界…';$('#companion-world').src='world.html?companion=1';});
$('#companion-world').addEventListener('load',()=>{$('#companion-world').contentWindow.postMessage({type:'plush:hello'},location.origin);});
for(const prompt of $$('[data-prompt]'))prompt.addEventListener('click',()=>{$('#chat-input').value=prompt.dataset.prompt;$('#chat-input').focus();});
$('#chat-note').addEventListener('click',()=>{const text=$('#chat-input').value.trim();openNote({title:text.slice(0,40),body:text});});
$('#chat-reminder').addEventListener('click',()=>openReminder({title:$('#chat-input').value.trim().slice(0,100)}));
function aiState(message){
  $('#ai-badge').textContent=aiReady?'AI 服务可用':'AI 待接入';$('#ai-badge').classList.toggle('connected',aiReady);$('#ai-connection-detail').textContent=message;$('#chat-status').textContent=message;$('#chat-send').disabled=!aiReady||aiBusy;$('#chat-send').textContent=aiBusy?'正在倾听…':aiReady?'发送 ↗':'AI 待接入';
}
async function checkAI(){
  if(!localAIAvailable){aiReady=false;aiState('公网版尚未接入 AI 服务。笔记、页面提醒、互动和固定任务可使用；本机接口请在本地版检查。');return;}
  statusAbort?.abort();const abort=new AbortController();statusAbort=abort;const timer=setTimeout(()=>abort.abort(),5000);
  try{
    const response=await fetch(serviceURL+'/api/status',{signal:abort.signal,cache:'no-store'});if(!response.ok)throw Error('本机 AI 服务暂不可用。');const status=await response.json();if(typeof status.ready!=='boolean'||typeof status.message!=='string')throw Error('服务返回的连接状态无效。');aiReady=status.ready;aiState(status.message.slice(0,300));
  }catch(error){if(statusAbort!==abort)return;aiReady=false;aiState('AI 未接入。可以先写笔记、设提醒和互动。');}
  finally{clearTimeout(timer);if(statusAbort===abort)statusAbort=null;}
}
$('#ai-settings-open').addEventListener('click',()=>{$('#ai-url').value=serviceURL;$('#ai-settings-error').textContent='';$('#ai-dialog').showModal();});
$('#ai-settings-form').addEventListener('submit',async event=>{
  if(!localAIAvailable){event.preventDefault();await checkAI();return;}
  event.preventDefault();try{const next=localServiceURL($('#ai-url').value.trim());if(!storage)throw Error('无法保存服务地址，请检查浏览器存储权限。');storage.setItem(AI_URL_KEY,next);serviceURL=next;$('#ai-settings-error').textContent='';$('#ai-connect').disabled=true;await checkAI();}catch(error){$('#ai-settings-error').textContent=error.message;}finally{$('#ai-connect').disabled=false;}
});
function renderSuggestion(){
  $('#ai-suggestion').hidden=!suggestion;if(!suggestion)return;$('#suggestion-title').textContent=(suggestion.kind==='note'?'笔记草稿：':'提醒草稿：')+suggestion.title;$('#suggestion-body').textContent=suggestion.body+(suggestion.kind==='reminder'?'\n'+(suggestion.dueAt?dateText(Date.parse(suggestion.dueAt)):'时间尚未确定，请在保存前选择。'):'');
}
$('#suggestion-dismiss').addEventListener('click',()=>{suggestion=null;renderSuggestion();});
$('#suggestion-review').addEventListener('click',()=>{if(!suggestion)return;if(suggestion.kind==='note')openNote({title:suggestion.title,body:suggestion.body});else openReminder({title:suggestion.title,dueAt:suggestion.dueAt===null?null:Date.parse(suggestion.dueAt)});});
$('#chat-form').addEventListener('submit',async event=>{
  if(!localAIAvailable){event.preventDefault();await checkAI();return;}
  event.preventDefault();if(aiBusy)return;if(!aiReady){$('#ai-settings-open').click();return;}
  const text=$('#chat-input').value.trim();if(!text){$('#chat-input').focus();return;}
  // A failed send keeps the draft and reuses the last identical user turn on retry.
  if(data.messages.at(-1)?.role!=='user'||data.messages.at(-1)?.text!==text){const result=update({type:'message.add',role:'user',text});if(!result.ok)return;}
  const input=$('#chat-input');aiBusy=true;aiState('正在等待 AI 服务的回复…');chatAbort=new AbortController();const timer=setTimeout(()=>chatAbort?.abort(),40000);
  try{
    const response=await fetch(serviceURL+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json','X-Plush-Client':'companion-studio'},body:JSON.stringify(buildChatPayload(data,companion)),signal:chatAbort.signal});
    const body=await response.json();if(!response.ok)throw Error(typeof body.message==='string'?body.message:'AI 服务暂时无法回复，请稍后重试。');
    const reply=validateCompanionReply(body);const saved=update({type:'message.add',role:'assistant',text:reply.reply});if(!saved.ok)throw Error(saved.error);
    if(input.value.trim()===text)input.value='';suggestion=reply.suggestion;renderSuggestion();if(reply.action!=='none')worldAction(reply.action);$('#chat-log').scrollTop=$('#chat-log').scrollHeight;aiState('回复已保存。草稿需要你确认后才会成为笔记或提醒。');
  }catch(error){aiState(error.name==='AbortError'?'等待超时，输入仍保留，可重试或保存为笔记。':(error.message||'连接失败，输入仍保留。').slice(0,300));}
  finally{clearTimeout(timer);chatAbort=null;aiBusy=false;$('#chat-send').disabled=!aiReady;$('#chat-send').textContent=aiReady?'发送 ↗':'AI 待接入';}
});
$('#chat-clear').addEventListener('click',()=>{if(confirm('清空此浏览器的对话记录？笔记、提醒和回忆会保留。')){const result=update({type:'message.clear'});if(result.ok){suggestion=null;renderSuggestion();}}});
function download(contents,extension,type){
  try{const blob=new Blob([contents],{type}),url=URL.createObjectURL(blob),link=node('a');downloadURLs.add(url);link.href=url;link.download='毛绒陪伴记录-'+new Date().toISOString().slice(0,10)+'.'+extension;document.body.append(link);link.click();link.remove();saveStatus('导出已准备好，请查看浏览器下载。');setTimeout(()=>{URL.revokeObjectURL(url);downloadURLs.delete(url);},60000);}catch{saveStatus('导出失败，请检查浏览器下载权限。');}
}
$('#export-json').addEventListener('click',()=>{const result=refresh();if(result.ok)download(exportCompanion(result.data),'json','application/json');});
$('#export-markdown').addEventListener('click',()=>{const result=refresh();if(result.ok)download(companionMarkdown(result.data),'md','text/markdown;charset=utf-8');});
window.addEventListener('storage',event=>{if(event.key===COMPANION_KEY||event.key===null){refresh();checkReminders();}if(event.key===AI_URL_KEY){try{serviceURL=localServiceURL(event.newValue||'http://127.0.0.1:8876');checkAI();}catch{}}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='hidden'){refresh();checkReminders();}});window.addEventListener('focus',checkReminders);
const reminderTimer=setInterval(checkReminders,15000);
const agentPanel=mountStudioAgentPanel({readStore:()=>store.read(),openNote,download,viewReminders:()=>activateTab('reminders',true)});
window.addEventListener('pagehide',()=>{agentPanel.dispose();clearInterval(reminderTimer);chatAbort?.abort();statusAbort?.abort();for(const url of downloadURLs)URL.revokeObjectURL(url);});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
$('#today').textContent=new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'long'}).format(new Date());
if(!localAIAvailable){$('#ai-url').disabled=true;$('#ai-connect').disabled=true;$('#ai-connect').textContent='本机接口仅用于本地版';}
refresh();checkReminders();checkAI();
