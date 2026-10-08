import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_JOURNAL_BACKUP_BYTES, encodeJournalBackup, inspectJournalBackup, mergeJournalBackup} from '../src/project-journal-backup.js';
import {JOURNAL_KEY, readJournal, upsertJournalEntry} from '../src/project-journal-store.js';

const NOW=1790830000123;
const entry=(overrides={})=>({id:'note-1',category:'progress',title:'毛绒记录 🧸',body:'第一行：保留作品。\n第二行：继续恢复。\n\t保留段落缩进。',createdAt:NOW,updatedAt:NOW,...overrides});
const stored=entries=>JSON.stringify({version:1,entries});
const rawBackup=(entries,extra={})=>JSON.stringify({format:'plush-lab-project-journal',version:1,exportedAt:NOW,entries,...extra});
function memoryStorage(initial={}){
  const values=new Map(Object.entries(initial)),reads=[],writes=[];
  return {
    getItem(key){reads.push(key);return values.has(key)?values.get(key):null;},
    setItem(key,value){writes.push({key,value});values.set(key,value);},
    peek(key){return values.has(key)?values.get(key):null;},
    reads,writes,
  };
}

test('Chinese multiline custom records round-trip with explicit backup metadata and no artwork fields',()=>{
  const source=[entry({recipe:{name:'private artwork'},edits:[1],status:'builtin-like extra'})];
  const encoded=encodeJournalBackup(source,{now:NOW}),parsed=JSON.parse(encoded);
  assert.deepEqual(Object.keys(parsed),['format','version','exportedAt','entries']);
  assert.equal(parsed.format,'plush-lab-project-journal');assert.equal(parsed.version,1);assert.equal(parsed.exportedAt,NOW);
  assert.deepEqual(parsed.entries,[entry()]);assert.deepEqual(inspectJournalBackup(encoded),{ok:true,entries:[entry()]});
  assert.equal(source[0].recipe.name,'private artwork');assert.ok(encoded.endsWith('\n'));
  assert.deepEqual(inspectJournalBackup('\uFEFF'+encoded),{ok:true,entries:[entry()]},'UTF-8 BOM files remain usable');
});

test('export dates, source arrays and incomplete entries reject rather than manufacturing a backup',()=>{
  for(const now of [-1,Infinity,NaN,1.5,'1',8.64e15+1])assert.throws(()=>encodeJournalBackup([entry()],{now}),TypeError);
  for(const entries of [null,{},[{}],[entry({title:'绒'.repeat(101)})],[entry({body:'绒'.repeat(4001)})],Array(121).fill(entry())])assert.throws(()=>encodeJournalBackup(entries,{now:NOW}),TypeError);
  for(const now of [0,8.64e15])assert.equal(JSON.parse(encodeJournalBackup([],{now})).exportedAt,now);
  assert.equal(inspectJournalBackup(encodeJournalBackup([],{now:NOW})).ok,true);
});

test('import saves once and repeated import skips duplicate content despite an updatedAt difference',()=>{
  const storage=memoryStorage(),backup=encodeJournalBackup([entry()],{now:NOW});
  const imported=mergeJournalBackup(storage,backup);
  assert.deepEqual(imported,{ok:true,entries:[entry()],added:1,duplicates:0,conflicts:0});assert.equal(storage.writes.length,1);
  const repeated=mergeJournalBackup(storage,encodeJournalBackup([entry({updatedAt:NOW+100})],{now:NOW+200}));
  assert.deepEqual(repeated,{ok:true,entries:[entry()],added:0,duplicates:1,conflicts:0});assert.equal(storage.writes.length,1);
  assert.equal(readJournal(storage).entries[0].updatedAt,NOW,'duplicate timestamps do not change local notes');
});

test('same-id conflicts keep every local field while unrelated backup records are added',()=>{
  const local=entry({body:'本机正文'}),newEntry=entry({id:'new-note',category:'roadmap',title:'未来观察',updatedAt:NOW+2});
  const storage=memoryStorage({[JOURNAL_KEY]:stored([local])});
  const result=mergeJournalBackup(storage,encodeJournalBackup([entry({body:'外来正文',updatedAt:NOW+1}),newEntry],{now:NOW}));
  assert.equal(result.ok,true);assert.equal(result.added,1);assert.equal(result.conflicts,1);assert.equal(result.duplicates,0);
  assert.deepEqual(result.entries.find(item=>item.id===local.id),local);assert.deepEqual(result.entries.find(item=>item.id===newEntry.id),newEntry);
  assert.equal(storage.writes.length,1);
  const before=storage.peek(JOURNAL_KEY),again=mergeJournalBackup(storage,rawBackup([entry({body:'第三版'})]));
  assert.equal(again.ok,true);assert.equal(again.added,0);assert.equal(again.conflicts,1);assert.equal(storage.peek(JOURNAL_KEY),before);assert.equal(storage.writes.length,1);
});

test('creation time is part of duplicate identity and cannot replace the local history',()=>{
  const local=entry(),storage=memoryStorage({[JOURNAL_KEY]:stored([local])});
  const incoming=entry({createdAt:NOW+1,updatedAt:NOW+2});
  const result=mergeJournalBackup(storage,rawBackup([incoming]));
  assert.equal(result.conflicts,1);assert.equal(result.duplicates,0);assert.deepEqual(result.entries,[local]);assert.equal(storage.writes.length,0);
});

test('one malformed row blocks the whole package without partially writing valid earlier rows',()=>{
  const local=entry(),storage=memoryStorage({[JOURNAL_KEY]:stored([local])}),before=storage.peek(JOURNAL_KEY);
  const good=entry({id:'new-good'});
  const bad=[{},entry({id:'bad/id'}),entry({category:'unknown'}),entry({title:'绒'.repeat(101)}),entry({body:'绒'.repeat(4001)}),entry({body:'contains\u0000control'}),entry({title:' trim me '}),entry({body:'windows\r\nlines'}),entry({createdAt:1.5}),entry({updatedAt:NOW-1})];
  for(const row of bad){
    const raw=rawBackup([good,row]),inspection=inspectJournalBackup(raw);assert.equal(inspection.ok,false);assert.deepEqual(inspection.entries,[]);
    const result=mergeJournalBackup(storage,raw);assert.equal(result.ok,false);assert.equal(result.added,0);assert.deepEqual(result.entries,[local]);
    assert.equal(storage.peek(JOURNAL_KEY),before);assert.equal(storage.writes.length,0);
  }
});

test('unknown fields are stripped while the supported text and numeric fields remain exact',()=>{
  const raw='{"format":"plush-lab-project-journal","version":1,"exportedAt":1790830000123,"unknown":"ignored","entries":['+JSON.stringify({...entry(),recipe:{name:'not journal'},links:[{url:'javascript:x'}]})+']}';
  const inspection=inspectJournalBackup(raw);assert.deepEqual(inspection,{ok:true,entries:[entry()]});
  assert.equal({}.polluted,undefined);
});

test('different-content duplicate ids inside one backup reject the whole package',()=>{
  const storage=memoryStorage(),raw=rawBackup([entry(),entry({body:'different body',updatedAt:NOW+1})]);
  const result=inspectJournalBackup(raw);assert.equal(result.ok,false);assert.match(result.error,/同一 ID/);
  assert.throws(()=>encodeJournalBackup([entry(),entry({body:'different body'})],{now:NOW}),TypeError);
  assert.equal(mergeJournalBackup(storage,raw).ok,false);assert.equal(storage.writes.length,0);
});

test('identical in-package ids canonicalize to one record with the newest timestamp',()=>{
  const original=entry(),latest=entry({updatedAt:NOW+5}),raw=rawBackup([latest,original]);
  assert.deepEqual(inspectJournalBackup(raw),{ok:true,entries:[latest]});
  const storage=memoryStorage(),result=mergeJournalBackup(storage,raw);
  assert.equal(result.added,1);assert.equal(result.entries.length,1);assert.equal(result.entries[0].updatedAt,NOW+5);
});

test('malformed headers, unsupported versions and invalid exportedAt values are rejected',()=>{
  for(const raw of [null,1,'','{','[]','null',rawBackup([], {format:'recipe'}),rawBackup([], {version:2}),rawBackup(null),rawBackup({},{}),rawBackup(Array(121).fill(entry())),
    ...[-1,NaN,Infinity,1.5,'1',8.64e15+1].map(exportedAt=>rawBackup([],{exportedAt}))]){
    const result=inspectJournalBackup(raw);assert.equal(result.ok,false);assert.deepEqual(result.entries,[]);
  }
});

test('capacity failure is atomic and does not erase any earlier local entries',()=>{
  const local=Array.from({length:119},(_,i)=>entry({id:`local-${i}`,createdAt:NOW+i,updatedAt:NOW+i}));
  const storage=memoryStorage({[JOURNAL_KEY]:stored(local)}),before=storage.peek(JOURNAL_KEY);
  const incoming=[entry({id:'new-a'}),entry({id:'new-b'})],result=mergeJournalBackup(storage,rawBackup(incoming));
  assert.equal(result.ok,false);assert.equal(result.added,0);assert.equal(result.entries.length,119);assert.match(result.error,/超过 120/);
  assert.equal(storage.peek(JOURNAL_KEY),before);assert.equal(storage.writes.length,0);
  const finalSlot=mergeJournalBackup(storage,rawBackup(incoming.slice(0,1)));assert.equal(finalSlot.ok,true);assert.equal(finalSlot.added,1);assert.equal(finalSlot.entries.length,120);assert.equal(storage.writes.length,1);
});

test('full journals can inspect duplicate/conflicting backups without writing a change',()=>{
  const local=Array.from({length:120},(_,i)=>entry({id:`local-${i}`,createdAt:NOW+i,updatedAt:NOW+i})),storage=memoryStorage({[JOURNAL_KEY]:stored(local)});
  const result=mergeJournalBackup(storage,rawBackup([local[0],{...local[1],body:'conflict'}]));
  assert.equal(result.ok,true);assert.equal(result.added,0);assert.equal(result.duplicates,1);assert.equal(result.conflicts,1);assert.equal(result.entries.length,120);assert.equal(storage.writes.length,0);
});

test('merging reads the latest local state and preserves another page newly saved note',()=>{
  const storage=memoryStorage(),stale=readJournal(storage);assert.deepEqual(stale.entries,[]);
  const other=entry({id:'other-page',updatedAt:NOW+1});assert.equal(upsertJournalEntry(storage,other).ok,true);
  const imported=entry({id:'from-backup',updatedAt:NOW+2}),result=mergeJournalBackup(storage,rawBackup([imported]));
  assert.equal(result.ok,true);assert.deepEqual(result.entries,[imported,other]);assert.equal(result.added,1);assert.equal(storage.writes.length,2);
});

test('date sorting and tied timestamps follow the journal store ordering',()=>{
  const entries=[entry({id:'a',createdAt:NOW,updatedAt:NOW+10}),entry({id:'c',createdAt:NOW+1,updatedAt:NOW+10}),entry({id:'b',createdAt:NOW+1,updatedAt:NOW+10})];
  const sourceOrder=entries.map(item=>item.id),encoded=encodeJournalBackup(entries,{now:NOW});
  assert.deepEqual(inspectJournalBackup(encoded).entries.map(item=>item.id),['b','c','a']);assert.deepEqual(entries.map(item=>item.id),sourceOrder);
  const storage=memoryStorage(),merged=mergeJournalBackup(storage,encoded);assert.deepEqual(merged.entries,readJournal(storage).entries);
});

test('unreadable or damaged local storage rejects merge without overwriting recoverable records',()=>{
  const backup=rawBackup([entry({id:'new'})]);
  const unreadable={getItem(){throw new Error('SecurityError');},setItem(){assert.fail('write must not happen');}};
  for(const storage of [unreadable,null,{}]){
    const result=mergeJournalBackup(storage,backup);assert.equal(result.ok,false);assert.equal(result.added,0);assert.deepEqual(result.entries,[]);
  }
  for(const raw of ['{',stored([entry(),{}])]){
    const storage=memoryStorage({[JOURNAL_KEY]:raw}),result=mergeJournalBackup(storage,backup);
    assert.equal(result.ok,false);assert.equal(result.added,0);assert.match(result.error,/格式损坏/);assert.equal(storage.peek(JOURNAL_KEY),raw);assert.equal(storage.writes.length,0);
  }
});

test('quota failures perform one attempted write and return the previously saved entries with added zero',()=>{
  const local=entry(),raw=stored([local]);let writes=0;
  const storage={getItem(key){assert.equal(key,JOURNAL_KEY);return raw;},setItem(key){assert.equal(key,JOURNAL_KEY);writes++;throw new Error('QuotaExceededError');}};
  const result=mergeJournalBackup(storage,rawBackup([entry({id:'a'}),entry({id:'b'})]));
  assert.equal(result.ok,false);assert.equal(result.added,0);assert.deepEqual(result.entries,[local]);assert.equal(writes,1);assert.match(result.error,/保存失败/);
});

test('backup merge accesses only the project-record key and empty imports do not write',()=>{
  const storage=memoryStorage({'plush-lab-recipes-v1':'artwork','plush-lab-draft-v1':'draft'});
  const empty=mergeJournalBackup(storage,rawBackup([]));assert.equal(empty.ok,true);assert.equal(empty.added,0);assert.equal(storage.writes.length,0);
  assert.equal(mergeJournalBackup(storage,rawBackup([entry()])).ok,true);
  assert.ok(storage.reads.every(key=>key===JOURNAL_KEY));assert.ok(storage.writes.every(write=>write.key===JOURNAL_KEY));
  assert.equal(storage.peek('plush-lab-recipes-v1'),'artwork');assert.equal(storage.peek('plush-lab-draft-v1'),'draft');
});

test('the 2 MiB UTF-8 input edge is accepted and the next byte rejects the whole package',()=>{
  assert.equal(MAX_JOURNAL_BACKUP_BYTES,2097152);
  const base=rawBackup([entry()]),atLimit=base+' '.repeat(MAX_JOURNAL_BACKUP_BYTES-new TextEncoder().encode(base).byteLength);
  assert.equal(new TextEncoder().encode(atLimit).byteLength,MAX_JOURNAL_BACKUP_BYTES);assert.equal(inspectJournalBackup(atLimit).ok,true);
  assert.equal(inspectJournalBackup(atLimit+' ').ok,false);
  const storage=memoryStorage(),result=mergeJournalBackup(storage,atLimit+' ');assert.equal(result.ok,false);assert.equal(result.added,0);assert.equal(storage.writes.length,0);
  const multibyte=rawBackup([],{padding:'绒'.repeat(Math.floor(MAX_JOURNAL_BACKUP_BYTES/3)+1)});
  assert.ok(multibyte.length<MAX_JOURNAL_BACKUP_BYTES);assert.equal(inspectJournalBackup(multibyte).ok,false,'size limit counts UTF-8 bytes rather than JS characters');
});

test('maximum Unicode custom records still produce a complete valid backup',()=>{
  const entries=Array.from({length:120},(_,i)=>entry({id:`maximum-${i}`,title:'🧸'.repeat(100),body:'绒🧸'.repeat(2000),createdAt:NOW+i,updatedAt:NOW+i}));
  const encoded=encodeJournalBackup(entries,{now:NOW});assert.ok(new TextEncoder().encode(encoded).byteLength<=MAX_JOURNAL_BACKUP_BYTES);
  const inspected=inspectJournalBackup(encoded);assert.equal(inspected.ok,true);assert.equal(inspected.entries.length,120);
  assert.deepEqual(inspected.entries,[...entries].reverse());
});
