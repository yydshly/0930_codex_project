import test from 'node:test';
import assert from 'node:assert/strict';
import {localDateTime,reminderTimestamp,editedReminderTimestamp,localServiceURL,buildChatPayload} from '../src/companion-ui-utils.js';
import {validateChatRequest} from '../server/companion-ai.mjs';
import {createCompanionStore} from '../src/companion-store.js';
test('local reminder dates round-trip and invalid calendar dates are rejected',()=>{
  const timestamp=new Date(2026,9,2,9,35).getTime();
  assert.equal(reminderTimestamp(localDateTime(timestamp)),timestamp);
  for(const value of ['2026-02-30T09:00','2026-13-01T09:00','2026-10-02T24:00','tomorrow'])assert.equal(reminderTimestamp(value),null);
});
test('AI settings only accept a local origin with no credentials or hidden data',()=>{
  assert.equal(localServiceURL('http://127.0.0.1:8876/'),'http://127.0.0.1:8876');
  for(const value of ['https://example.com','http://user:secret@localhost:8876','http://localhost:8876/?key=secret','javascript:alert(1)','http://localhost:8876/path'])assert.throws(()=>localServiceURL(value));
});
test('editing a snoozed reminder time preserves seconds until the time field changes',()=>{
  const dueAt=new Date(2026,9,2,10,0,48,875).getTime(),display=localDateTime(dueAt);
  assert.equal(editedReminderTimestamp(display,dueAt,display),dueAt);
  const changed=localDateTime(dueAt+600000);
  assert.equal(editedReminderTimestamp(changed,dueAt,display),reminderTimestamp(changed));
  assert.equal(editedReminderTimestamp('',dueAt,display),null);
  assert.equal(editedReminderTimestamp(display,null,''),reminderTimestamp(display));
});
test('a title-only edit after a reminder fires does not rearm or move its due time',()=>{
  let raw=null,clock=new Date(2026,9,2,9,0,48,875).getTime();
  const store=createCompanionStore({getItem:()=>raw,setItem:(_,value)=>{raw=value;}},{now:()=>clock,id:()=> 'reminder-test'});
  const added=store.mutate({type:'reminder.upsert',title:'检查方案',dueAt:clock+600000}).data.reminders[0];
  clock+=600001;
  const fired=store.mutate({type:'reminder.claim',id:added.id}).data.reminders[0];
  const display=localDateTime(fired.dueAt),dueAt=editedReminderTimestamp(display,fired.dueAt,display);
  const edited=store.mutate({type:'reminder.upsert',id:fired.id,title:'检查新方案',dueAt}).data.reminders[0];
  assert.equal(edited.dueAt,fired.dueAt);assert.equal(edited.firedAt,fired.firedAt);assert.equal(edited.title,'检查新方案');
});
test('only individually allowed notes enter the prepared AI context',()=>{
  const data={messages:[{role:'user',text:'你好'}],notes:[{title:'私密',body:'不发送',shareWithAI:false,updatedAt:2},{title:'允许',body:'可参考',shareWithAI:true,updatedAt:1}],memories:[{title:'共同回忆不自动发送'}]};
  const payload=buildChatPayload(data,{name:'小团子',personality:'curious'},Date.UTC(2026,9,2),'Asia/Shanghai');
  assert.deepEqual(payload.memories,[{title:'允许',body:'可参考'}]);
  assert.deepEqual(validateChatRequest(payload),payload);
});
test('Chinese context remains below the server byte ceiling and keeps the latest user message',()=>{
  const data={messages:Array.from({length:40},(_,i)=>({role:i===39?'user':'assistant',text:'绒'.repeat(2000)})),notes:Array.from({length:20},(_,i)=>({title:'笔记'+i,body:'绒'.repeat(2000),shareWithAI:true,updatedAt:i}))};
  const payload=buildChatPayload(data,{name:'小团子',personality:'playful'},Date.UTC(2026,9,2),'Asia/Shanghai');
  assert.ok(new TextEncoder().encode(JSON.stringify(payload)).length<=32000);
  assert.equal(payload.messages.at(-1).role,'user');
  assert.ok(payload.messages.length>1);
  assert.doesNotThrow(()=>validateChatRequest(payload));
});
