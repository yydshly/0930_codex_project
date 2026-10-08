export function localDateTime(timestamp){
  const date=new Date(timestamp),pad=value=>String(value).padStart(2,'0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function reminderTimestamp(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return null;
  const date=new Date(value),parts=value.match(/\d+/g).map(Number);
  if(!Number.isFinite(date.getTime())||date.getFullYear()!==parts[0]||date.getMonth()+1!==parts[1]||date.getDate()!==parts[2]||date.getHours()!==parts[3]||date.getMinutes()!==parts[4])return null;
  return date.getTime();
}
// datetime-local displays minutes; a title-only edit must preserve the original seconds.
export function editedReminderTimestamp(value,originalDueAt,originalDisplay){
  if(Number.isSafeInteger(originalDueAt)&&value===originalDisplay)return originalDueAt;
  return reminderTimestamp(value);
}
export function localServiceURL(value){
  const url=new URL(value);
  if(!['http:','https:'].includes(url.protocol)||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.username||url.password||url.search||url.hash||!['','/'].includes(url.pathname))throw Error('请填写本机服务地址，例如 http://127.0.0.1:8876。');
  return url.origin;
}
// Keep the newest context within both the character and actual UTF-8 body limits.
export function buildChatPayload(data,companion,now=Date.now(),timezone=Intl.DateTimeFormat().resolvedOptions().timeZone){
  const messages=[];let chars=0;
  for(const message of data.messages.slice().reverse()){
    const text=message.text.slice(0,2000);if(chars+text.length>16000||messages.length>=16)break;
    messages.unshift({role:message.role,text});chars+=text.length;
  }
  const memories=[];let memoryChars=0;
  for(const note of data.notes.filter(note=>note.shareWithAI).slice().sort((a,b)=>b.updatedAt-a.updatedAt)){
    const candidate={title:note.title.slice(0,120),body:note.body.slice(0,1000)};
    if(memories.length>=12)break;
    if(memoryChars+candidate.title.length+candidate.body.length>8000)continue;
    memories.push(candidate);memoryChars+=candidate.title.length+candidate.body.length;
  }
  const payload={messages,companion:{name:companion.name.slice(0,80),personality:companion.personality},memories,now:new Date(now).toISOString(),timezone};
  const bytes=()=>new TextEncoder().encode(JSON.stringify(payload)).length;
  while(bytes()>32000&&memories.length)memories.pop();
  while(bytes()>32000&&messages.length>1)messages.shift();
  return payload;
}
