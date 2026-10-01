import {stories,chapterAt} from './stories.mjs';

const text=(value,max,label)=>{
  if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw new Error(`${label}需填写 1–${max} 个字。`);
  return value.trim();
};
export function defaultWork(index,brand='LUMA'){
  const story=stories[index];
  return {format:'rhythm-drop-work',version:1,storyId:story.id,title:story.name,occasion:story.occasion,
    ending:index===2?'让一个想法发光':story.ending,bpm:story.bpm,brand,
    chapters:story.chapters.map((c,i)=>({title:c.name,line:[...story.lines].reverse().find(l=>l.beat<=i*16)?.text||c.subtitle}))};
}
export function validateWork(input){
  if(!input||typeof input!=='object'||input.format!=='rhythm-drop-work'||input.version!==1)throw new Error('请选择 Rhythm Drop v1 作品文件。');
  if(!stories.some(s=>s.id===input.storyId))throw new Error('作品使用了当前版本不支持的故事。');
  if(!Number.isInteger(input.bpm)||input.bpm<60||input.bpm>180)throw new Error('速度应是 60–180 的整数。');
  if(!Array.isArray(input.chapters)||input.chapters.length!==4)throw new Error('作品需要完整的四个章节。');
  return {format:'rhythm-drop-work',version:1,storyId:input.storyId,title:text(input.title,40,'标题'),
    occasion:text(input.occasion,80,'观看场合'),ending:text(input.ending,80,'结尾'),bpm:input.bpm,
    brand:text(input.brand??'LUMA',12,'品牌名'),chapters:input.chapters.map(c=>({title:text(c?.title,20,'章节标题'),line:text(c?.line,90,'章节字幕')}))};
}
export function applyWork(input){
  const work=validateWork(input),base=stories.find(s=>s.id===work.storyId);
  return {...base,name:work.title,occasion:work.occasion,ending:work.ending,bpm:work.bpm,
    chapters:base.chapters.map((c,i)=>({...c,name:work.chapters[i].title,subtitle:work.chapters[i].line})),
    lines:[...work.chapters.map((c,i)=>({beat:i*16,text:c.line})),{beat:62,text:work.ending}]};
}
export function workNarrative(input,beat){
  const chapter=chapterAt(beat),at=beat>=62?62:chapter*16;
  return {chapter,line:beat>=62?input.ending:input.chapters[chapter].line,age:beat-at,ending:beat>=64};
}
export function parseLibrary(raw){
  if(!raw)return [];
  const library=JSON.parse(raw);
  if(library?.format!=='rhythm-drop-library'||library.version!==1||!Array.isArray(library.entries))throw new Error('本机作品档案格式不受支持。');
  const ids=new Set();
  return library.entries.map(entry=>{
    if(typeof entry.id!=='string'||!entry.id||ids.has(entry.id)||typeof entry.createdAt!=='string'||!Number.isFinite(Date.parse(entry.createdAt)))throw new Error('本机作品档案包含无效记录。');
    ids.add(entry.id);return {id:entry.id,createdAt:entry.createdAt,work:validateWork(entry.work)};
  });
}
export function serializeLibrary(entries){return JSON.stringify({format:'rhythm-drop-library',version:1,entries});}
