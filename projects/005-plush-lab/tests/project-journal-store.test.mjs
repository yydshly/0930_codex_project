import test from 'node:test';
import assert from 'node:assert/strict';
import {JOURNAL_KEY, MAX_JOURNAL_ENTRIES, sanitizeJournalEntry, readJournal, upsertJournalEntry, formatJournalMarkdown} from '../src/project-journal-store.js';

const NOW=1790830000123;
const entry=(overrides={})=>({id:'note-1',category:'progress',title:'实现局部恢复',body:'保留完整旧作品。\n继续梳理。',createdAt:NOW,updatedAt:NOW,...overrides});
const stored=entries=>JSON.stringify({version:1,entries});
function memoryStorage(initial={}){
  const values=new Map(Object.entries(initial)),reads=[],writes=[];
  return {
    getItem(key){reads.push(key);return values.has(key)?values.get(key):null;},
    setItem(key,value){writes.push({key,value});values.set(key,value);},
    peek(key){return values.has(key)?values.get(key):null;},
    reads,writes,
  };
}

test('missing records are an honest empty result and never access recipe or draft keys',()=>{
  const storage=memoryStorage({'plush-lab-recipes-v1':'saved recipes','plush-lab-draft-v1':'saved draft'});
  assert.deepEqual(readJournal(storage),{entries:[],ok:true});assert.equal(storage.writes.length,0);
  assert.equal(upsertJournalEntry(storage,entry()).ok,true);
  assert.ok(storage.reads.every(key=>key===JOURNAL_KEY));assert.ok(storage.writes.every(write=>write.key===JOURNAL_KEY));
  assert.equal(storage.peek('plush-lab-recipes-v1'),'saved recipes');assert.equal(storage.peek('plush-lab-draft-v1'),'saved draft');
});

test('entry sanitation bounds Unicode text, preserves paragraphs and copies only supported fields',()=>{
  const raw=entry({title:' \u0000'+'🧸'.repeat(110),body:' \u0000第一段\r\n\t第二段\u0007\n'+'绒'.repeat(5000),shader:'ignored',__proto__:{polluted:true}});
  const clean=sanitizeJournalEntry(raw);
  assert.equal(Array.from(clean.title).length,100);assert.equal(Array.from(clean.body).length,4000);
  assert.ok(clean.body.startsWith('第一段\n\t第二段\n'));assert.ok(!clean.body.includes('\u0000'));assert.ok(!clean.body.includes('\u0007'));
  assert.deepEqual(Object.keys(clean),['id','category','title','body','createdAt','updatedAt']);assert.equal({}.polluted,undefined);
  assert.equal(Array.from(raw.title.trim()).length,111);assert.ok(raw.body.includes('\r\n'),'input remains unchanged');
  assert.equal(sanitizeJournalEntry(entry({body:''})).body,'','a title-only record can be saved');
});

test('malformed entry identities, categories, empty titles and timestamps are rejected',()=>{
  for(const raw of [null,[],{},entry({id:''}),entry({id:'../other'}),entry({id:'a'.repeat(101)}),entry({id:1}),entry({category:'shader'}),entry({title:'\u0000 \n'}),entry({title:1}),entry({body:null})])assert.equal(sanitizeJournalEntry(raw),null);
  for(const value of [-1,NaN,Infinity,1.2,'1',8.64e15+1]){
    assert.equal(sanitizeJournalEntry(entry({createdAt:value})),null);assert.equal(sanitizeJournalEntry(entry({updatedAt:value})),null);
  }
  assert.equal(sanitizeJournalEntry(entry({updatedAt:NOW-1})),null);
  for(const time of [0,8.64e15])assert.equal(sanitizeJournalEntry(entry({createdAt:time,updatedAt:time})).updatedAt,time);
});

test('upsert saves a version-one journal and read returns sanitized independent entries',()=>{
  const storage=memoryStorage(),source=entry({title:'  继续创作  '});
  const saved=upsertJournalEntry(storage,source);
  assert.equal(saved.ok,true);assert.equal(saved.entries[0].title,'继续创作');assert.equal(source.title,'  继续创作  ');
  assert.deepEqual(JSON.parse(storage.peek(JOURNAL_KEY)),{version:1,entries:saved.entries});
  const read=readJournal(storage);assert.deepEqual(read,saved);read.entries[0].title='changed in memory';
  assert.equal(readJournal(storage).entries[0].title,'继续创作');
  const writes=storage.writes.length;
  assert.equal(upsertJournalEntry(storage,{...saved.entries[0]}).ok,true);assert.equal(storage.writes.length,writes,'an identical saved entry need not write again');
});

test('malformed storage keeps a warning and original bytes without rewriting or deleting',()=>{
  for(const raw of ['', '{', 'null', '{}', 'false', 17, stored(null), JSON.stringify({version:2,entries:[]}), 'x'.repeat(2000001)]){
    const storage=memoryStorage({[JOURNAL_KEY]:raw}),result=readJournal(storage);
    assert.equal(result.ok,false);assert.deepEqual(result.entries,[]);assert.match(result.error,/格式损坏/);
    assert.equal(storage.peek(JOURNAL_KEY),raw);assert.equal(storage.writes.length,0);
    const save=upsertJournalEntry(storage,entry());assert.equal(save.ok,false);assert.match(save.error,/格式损坏/);
    assert.equal(storage.peek(JOURNAL_KEY),raw);assert.equal(storage.writes.length,0);
  }
});

test('partially malformed lists salvage valid records but preserve the warning on later saves',()=>{
  const clean=entry(),long=entry({id:'long',title:'绒'.repeat(101)}),raw=stored([null,clean,long,entry({id:'bad',category:'unknown'})]);
  const storage=memoryStorage({[JOURNAL_KEY]:raw}),read=readJournal(storage);
  assert.equal(read.ok,false);assert.equal(read.entries.length,2);assert.equal(read.entries.find(item=>item.id==='long').title.length,100);
  const save=upsertJournalEntry(storage,entry({id:'new'}));assert.equal(save.ok,false);assert.deepEqual(save.entries,read.entries);
  assert.equal(storage.peek(JOURNAL_KEY),raw);assert.equal(storage.writes.length,0);
});

test('duplicate stored ids use the latest content and earliest creation while reporting damage',()=>{
  const first=entry({body:'first',createdAt:NOW,updatedAt:NOW+1}),newest=entry({body:'newest',createdAt:NOW+3,updatedAt:NOW+4});
  const storage=memoryStorage({[JOURNAL_KEY]:stored([first,newest])}),read=readJournal(storage);
  assert.equal(read.ok,false);assert.equal(read.entries.length,1);
  assert.deepEqual(read.entries[0],{...newest,createdAt:NOW});assert.equal(storage.writes.length,0);
});

test('storage permission and quota failures return truthful failures with saved entries intact',()=>{
  const unreadable={getItem(){throw new Error('SecurityError');},setItem(){throw new Error('must not be called');}};
  for(const storage of [unreadable,null,{}]){
    assert.equal(readJournal(storage).ok,false);assert.match(readJournal(storage).error,/无法读取/);
    assert.equal(upsertJournalEntry(storage,entry()).ok,false);
  }
  const previous=entry(),raw=stored([previous]);
  const unwritable={getItem(key){assert.equal(key,JOURNAL_KEY);return raw;},setItem(key){assert.equal(key,JOURNAL_KEY);throw new Error('QuotaExceededError');}};
  const result=upsertJournalEntry(unwritable,entry({id:'new'}));
  assert.equal(result.ok,false);assert.deepEqual(result.entries,[previous]);assert.match(result.error,/尚未保存/);
});

test('invalid upserts preserve the latest existing records and do not write',()=>{
  const storage=memoryStorage({[JOURNAL_KEY]:stored([entry()])});
  const result=upsertJournalEntry(storage,entry({id:'invalid/id'}));
  assert.equal(result.ok,false);assert.deepEqual(result.entries,[entry()]);assert.match(result.error,/内容无效/);assert.equal(storage.writes.length,0);
});

test('all 120 records fit, new ids are rejected at capacity and existing ids can still update',()=>{
  assert.equal(MAX_JOURNAL_ENTRIES,120);
  const records=Array.from({length:MAX_JOURNAL_ENTRIES},(_,i)=>entry({id:`note-${i}`,createdAt:NOW+i,updatedAt:NOW+i}));
  const storage=memoryStorage({[JOURNAL_KEY]:stored(records.slice(0,-1))});
  const finalSlot=upsertJournalEntry(storage,records.at(-1));assert.equal(finalSlot.ok,true);assert.equal(finalSlot.entries.length,120);
  const before=storage.peek(JOURNAL_KEY),writes=storage.writes.length;
  const full=upsertJournalEntry(storage,entry({id:'overflow',updatedAt:NOW+1000}));
  assert.equal(full.ok,false);assert.equal(full.entries.length,120);assert.match(full.error,/120/);assert.equal(storage.peek(JOURNAL_KEY),before);assert.equal(storage.writes.length,writes);
  const updated=upsertJournalEntry(storage,entry({id:'note-0',body:'updated at capacity',createdAt:NOW+2000,updatedAt:NOW+3000}));
  assert.equal(updated.ok,true);assert.equal(updated.entries.length,120);assert.equal(updated.entries[0].id,'note-0');
  assert.equal(updated.entries[0].createdAt,NOW);assert.equal(updated.entries[0].body,'updated at capacity');
  assert.deepEqual(new Set(updated.entries.map(item=>item.id)),new Set(records.map(item=>item.id)));
});

test('oversized stored lists are bounded for display and never silently trimmed on save',()=>{
  const records=Array.from({length:MAX_JOURNAL_ENTRIES+1},(_,i)=>entry({id:`note-${i}`,createdAt:NOW+i,updatedAt:NOW+i}));
  const raw=stored(records),storage=memoryStorage({[JOURNAL_KEY]:raw}),result=readJournal(storage);
  assert.equal(result.ok,false);assert.equal(result.entries.length,120);assert.equal(result.entries[0].id,'note-120');
  assert.equal(upsertJournalEntry(storage,entry()).ok,false);assert.equal(storage.peek(JOURNAL_KEY),raw);assert.equal(storage.writes.length,0);
});

test('each save re-reads current storage so another page newly added entry is retained',()=>{
  const storage=memoryStorage();assert.deepEqual(readJournal(storage).entries,[]);
  const otherPage=entry({id:'other-page',updatedAt:NOW+1});assert.equal(upsertJournalEntry(storage,otherPage).ok,true);
  const thisPage=entry({id:'this-page',updatedAt:NOW+2}),saved=upsertJournalEntry(storage,thisPage);
  assert.equal(saved.ok,true);assert.deepEqual(saved.entries.map(item=>item.id),['this-page','other-page']);
  assert.deepEqual(readJournal(storage).entries,[thisPage,otherPage]);
});

test('same-id updates retain original creation and sorted timestamps never move backwards',()=>{
  const storage=memoryStorage();upsertJournalEntry(storage,entry({updatedAt:NOW+100}));
  const incoming=entry({body:'revised',createdAt:NOW+1,updatedAt:NOW+2}),result=upsertJournalEntry(storage,incoming);
  assert.equal(result.ok,true);assert.equal(result.entries.length,1);assert.equal(result.entries[0].createdAt,NOW);assert.equal(result.entries[0].updatedAt,NOW+100);
  assert.equal(result.entries[0].body,'revised');assert.equal(incoming.createdAt,NOW+1);
  const records=[entry({id:'a',createdAt:NOW,updatedAt:NOW+200}),entry({id:'c',createdAt:NOW+1,updatedAt:NOW+200}),entry({id:'b',createdAt:NOW+1,updatedAt:NOW+200})];
  const read=readJournal(memoryStorage({[JOURNAL_KEY]:JSON.stringify(records)}));assert.equal(read.ok,true);
  assert.deepEqual(read.entries.map(item=>item.id),['b','c','a']);
});

test('Markdown export separates built-ins and local notes, preserves status and links, and marks plans',()=>{
  const builtins=[{category:'progress',title:'连续创作',body:['无损 Float32 检查点。','旧作品继续使用。'],status:'已实现',links:[{label:'实现文件',url:'src/local-coat-snapshot.js'},{text:'论文',href:'https://example.org/paper(a).pdf'}]},
    {category:'roadmap',title:'更高分辨率',body:'评估采样与性能。',status:'计划中',links:[]}];
  const custom=[entry({category:'changes',title:'我的记录',body:'修剪后恢复颜色。'}),entry({id:'future',category:'roadmap',title:'试验想法',body:'先测真实手机。',updatedAt:NOW+1})];
  const categories=[{id:'changes',label:'变更'},{id:'progress',label:'进展'},{id:'roadmap',label:'可扩展方向'},{id:'principles',label:'原则'}];
  const markdown=formatJournalMarkdown(builtins,custom,categories);
  assert.match(markdown,/^# Plush Lab · 项目记录/);assert.match(markdown,/## 内置项目记录/);assert.match(markdown,/## 我的补充/);
  assert.match(markdown,/状态：已实现/);assert.match(markdown,/状态：计划中/);assert.match(markdown,/无损 Float32 检查点。\n旧作品继续使用。/);
  assert.ok(markdown.includes('[实现文件](src/local-coat-snapshot.js)'));assert.ok(markdown.includes('[论文](https://example.org/paper%28a%29.pdf)'));
  assert.match(markdown,/可扩展方向（未来计划）/);assert.equal((markdown.match(/类型：未来计划/g)||[]).length,2);
  assert.match(markdown,/创建：2026-10-01T/);assert.ok(markdown.endsWith('\n'));
  assert.equal(markdown,formatJournalMarkdown(builtins,custom,categories),'export is deterministic for a fixed journal');
});

test('Markdown export preserves plain user text without allowing it to forge sections or active HTML',()=>{
  const builtins=[{category:'principles',title:'安全原则',body:'文本按文字展示。',status:'保留',links:[{label:'bad',url:'javascript:alert(1)'},{label:'bad',url:'data:text/html,x'},{label:'good',url:'https://example.org/docs'}]}];
  const custom=[entry({title:'<script> *名字*',body:'## 内置项目记录\n<script>alert(1)</script>\n[伪链接](javascript:alert(1))'})];
  const markdown=formatJournalMarkdown(builtins,custom,{principles:'技术原则'});
  assert.equal((markdown.match(/^## 内置项目记录$/gm)||[]).length,1);assert.ok(markdown.includes('\\#\\# 内置项目记录'));
  assert.ok(!markdown.includes('<script>'));assert.ok(markdown.includes('&lt;script&gt;'));
  assert.ok(markdown.includes('\\[伪链接\\]'));assert.ok(!markdown.includes('[bad]('));assert.ok(markdown.includes('[good](https://example.org/docs)'));
  assert.match(formatJournalMarkdown(null,null,null),/暂无记录。/);
});
