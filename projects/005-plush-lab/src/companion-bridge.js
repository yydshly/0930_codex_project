import {PERSONALITIES,MAX_WORLD_TOKEN} from './world-config.js';
const personalities=new Set(PERSONALITIES.map(item=>item.id));
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const text=(value,max)=>typeof value==='string'&&value.length>0&&value.length<=max&&!/[\u0000-\u001f\u007f]/.test(value);
export const COMPANION_ACTIONS=Object.freeze(['greet','jump','fetch','cancel']);

// Each receiver also checks the sender window and exact same origin.
export function companionCommand(value){
  if(!record(value))return null;
  if(value.type==='plush:hello')return {type:value.type};
  if(value.type!=='plush:command'||!COMPANION_ACTIONS.includes(value.action)||!text(value.requestId,100))return null;
  return {type:value.type,action:value.action,requestId:value.requestId};
}

export function companionEvent(value){
  if(!record(value))return null;
  if(['plush:error','plush:draft-stale'].includes(value.type)&&text(value.message,300))return {type:value.type,message:value.message};
  if(value.type==='plush:ready'){
    if(!record(value.companion)||!text(value.companion.name,80)||!personalities.has(value.companion.personality)||typeof value.worldCode!=='string'||value.worldCode.length>MAX_WORLD_TOKEN||!/^[A-Za-z0-9_-]+$/.test(value.worldCode))return null;
    return {type:value.type,companion:{name:value.companion.name,personality:value.companion.personality},worldCode:value.worldCode};
  }
  if(value.type==='plush:event'&&['hello','play'].includes(value.kind)&&text(value.title,100)&&text(value.eventId,200))return {type:value.type,kind:value.kind,title:value.title,eventId:value.eventId};
  return null;
}
