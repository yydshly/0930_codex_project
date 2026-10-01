import test from 'node:test';
import assert from 'node:assert/strict';
import { ballAt } from '../src/timeline.mjs';
import { stories,STORY_BEATS,storyPointAt,storyBeat,narrativeAt,chapterAt,scoreFor } from '../src/stories.mjs';
test('all stories have four chapters, a distinct score and a held ending',()=>{
  assert.equal(stories.length,6);assert.equal(new Set(stories.map(s=>s.bpm)).size,stories.length);
  for(let s=0;s<stories.length;s++){
    assert.equal(stories[s].chapters.length,4);assert.equal(narrativeAt(s,64).ending,true);
    assert.ok(scoreFor(s,64).length>=3);assert.equal(scoreFor(s,65).length,0);
    assert.equal(storyBeat(STORY_BEATS*60/stories[s].bpm,stories[s].bpm),64);
  }
});
test('authored routes land correctly, including the graduation gap',()=>{
  for(let s=0;s<stories.length;s++)for(let i=0;i<=64;i++){
    const path=n=>storyPointAt(s,n),p=path(i),ball=ballAt(i,2.1,path);
    assert.equal(ball.x,p.x);assert.equal(ball.z,p.z);assert.ok(Math.abs(ball.y-p.y-.62)<1e-8);
  }
  assert.ok(storyPointAt(1,31).z-storyPointAt(1,32).z>7);
});
test('chapters remain finite at the final hold and custom music reaches the ending',()=>{
  for(const n of [0,16,32,48,64,68,999])assert.ok(chapterAt(n)>=0&&chapterAt(n)<=3);
  assert.equal(storyBeat(60,124,60),64);assert.equal(storyBeat(0,124,60),0);
  for(const bpm of [76,84,88,92,124,149])for(const beat of [16,32,48,64])assert.equal(storyBeat(beat*60/bpm,bpm),beat);
  assert.equal(storyBeat(-1,88),0);
});
test('graduation has an intentional rest before the leap; night and brand develop differently',()=>{
  assert.deepEqual(scoreFor(1,30),[]);assert.deepEqual(scoreFor(1,31),[]);
  assert.equal(scoreFor(0,1).length,0);assert.ok(scoreFor(0,17).length>0);
  assert.ok(scoreFor(2,42).length>scoreFor(2,2).length);
  for(let s=0;s<stories.length;s++)for(let i=0;i<68;i++)for(const n of scoreFor(s,i)){
    assert.ok(n.beats>0&&n.gain>0&&n.offset>=0);assert.ok(n.midi>=0&&n.midi<=127);
  }
});
