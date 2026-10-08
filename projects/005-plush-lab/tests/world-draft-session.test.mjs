import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmbeddedDraftSession} from '../src/world-draft-session.js';
import {defaultWorld,encodeWorld} from '../src/world-config.js';

const key='plush-world-draft-v1';
function storageFixture(initial){
  const values=new Map(initial===null?[]:[[key,initial]]),writes=[];
  return {values,writes,getItem:entry=>values.get(entry)??null,setItem:(entry,value)=>{writes.push([entry,value]);values.set(entry,value);}};
}
function session(storage,initial,stored=storage.getItem(key)){
  return createEmbeddedDraftSession(storage,{key,stored,initial});
}

test('opening and closing an unchanged studio never writes or normalizes the old draft',()=>{
  for(const saved of [null,'old serialized draft']){
    const storage=storageFixture(saved),initial=encodeWorld(defaultWorld()),draft=session(storage,initial);
    assert.deepEqual(draft.save(initial),{ok:true,conflict:false,changed:false});
    assert.deepEqual(draft.save(initial),{ok:true,conflict:false,changed:false});
    assert.equal(storage.getItem(key),saved);assert.equal(storage.writes.length,0);
  }
});

test('real local movement can save and a later unchanged pagehide is a no-op',()=>{
  const world=defaultWorld(),original=encodeWorld(world),storage=storageFixture(original),draft=session(storage,original);
  const moved=encodeWorld({...world,pose:{x:.4,z:.8,seatId:null}});
  assert.deepEqual(draft.save(moved),{ok:true,conflict:false,changed:true});
  assert.equal(storage.getItem(key),moved);
  assert.deepEqual(draft.save(moved),{ok:true,conflict:false,changed:false});
  assert.equal(storage.writes.length,1);
});

test('a newer outfit in another page survives both unchanged close and later iframe interaction',()=>{
  const world=defaultWorld(),original=encodeWorld(world),storage=storageFixture(original),draft=session(storage,original);
  const newOutfit=encodeWorld({...world,outfit:'poncho'});
  storage.setItem(key,newOutfit);
  assert.deepEqual(draft.inspect(),{ok:true,conflict:true});
  assert.deepEqual(draft.save(original),{ok:true,conflict:true,changed:false});
  const staleMoved=encodeWorld({...world,pose:{x:1,z:.2,seatId:null}});
  assert.deepEqual(draft.save(staleMoved),{ok:true,conflict:true,changed:false});
  assert.equal(storage.getItem(key),newOutfit);assert.equal(storage.writes.length,1);
});

test('each save checks current storage even when no storage event has arrived',()=>{
  const storage=storageFixture('original'),draft=session(storage,'original');
  assert.equal(draft.save('first move').changed,true);
  storage.values.set(key,'new scene from editor');
  assert.equal(draft.save('second move').conflict,true);
  assert.equal(storage.getItem(key),'new scene from editor');assert.equal(storage.writes.length,1);
});

test('clearing or removing the world draft cannot be undone by a stale embedded page',()=>{
  const storage=storageFixture('original'),draft=session(storage,'original');
  storage.values.delete(key);
  assert.equal(draft.save('old world with another pose').conflict,true);
  assert.equal(storage.getItem(key),null);assert.equal(storage.writes.length,0);
});

test('quota failures leave the snapshot intact so an authorized later retry can save',()=>{
  const storage=storageFixture('original'),draft=session(storage,'original'),write=storage.setItem;
  storage.setItem=()=>{throw Error('quota');};
  const failure=draft.save('first move');assert.equal(failure.ok,false);assert.equal(failure.changed,false);
  assert.equal(storage.getItem(key),'original');
  storage.setItem=write;
  assert.equal(draft.save('first move').changed,true);assert.equal(storage.getItem(key),'first move');
});

test('failed initial reads and unavailable storage do not overwrite any world data',()=>{
  const storage=storageFixture('latest creation');
  // Explicitly model a read failure; undefined is distinct from a genuinely empty key.
  const unread=createEmbeddedDraftSession(storage,{key,stored:undefined,initial:'fallback world'});
  assert.equal(unread.save('fallback moved').ok,false);assert.equal(storage.getItem(key),'latest creation');
  const unavailable=createEmbeddedDraftSession(null,{key,stored:null,initial:'fallback'});
  assert.equal(unavailable.save('fallback moved').ok,false);assert.equal(storage.writes.length,0);
});

test('a storage read failure prevents writing even after the session has opened successfully',()=>{
  const storage=storageFixture('original'),draft=session(storage,'original'),read=storage.getItem;
  storage.getItem=()=>{throw Error('access denied');};
  assert.equal(draft.save('new pose').ok,false);assert.equal(storage.writes.length,0);
  storage.getItem=read;
  assert.equal(storage.getItem(key),'original');assert.equal(draft.save('new pose').changed,true);
});

test('an identical externally saved snapshot is safe and old collections remain untouched',()=>{
  const storage=storageFixture('same world'),draft=session(storage,'same world');
  storage.values.set('plush-world-collection-v1','previous works');
  storage.values.set('plush-lab-draft-v1','previous fur recipe');
  storage.values.set(key,'same world');
  assert.equal(draft.inspect().conflict,false);assert.equal(draft.save('new pose').changed,true);
  assert.equal(storage.getItem('plush-world-collection-v1'),'previous works');
  assert.equal(storage.getItem('plush-lab-draft-v1'),'previous fur recipe');
  assert.deepEqual(storage.writes,[['plush-world-draft-v1','new pose']]);
});
