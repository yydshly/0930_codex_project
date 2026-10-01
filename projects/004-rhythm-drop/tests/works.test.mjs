import test from 'node:test';
import assert from 'node:assert/strict';
import {stories} from '../src/stories.mjs';
import {defaultWork,validateWork,applyWork,workNarrative,parseLibrary,serializeLibrary} from '../src/works.mjs';

test('editing a portable work keeps all originals and music cues intact',()=>{
  const original=JSON.stringify(stories),work=defaultWork(1);
  work.title='给一起长大的你';work.ending='下一站，我们都要好好的。';work.chapters[2].line='带着勇气，走向你的世界。';work.bpm=100;
  const adapted=applyWork(work);
  assert.equal(adapted.name,work.title);assert.equal(adapted.bpm,100);
  assert.equal(workNarrative(work,32).line,work.chapters[2].line);
  assert.equal(workNarrative(work,63).line,work.ending);
  assert.equal(adapted.music,stories[1].music);assert.equal(JSON.stringify(stories),original);
  for(let i=0;i<stories.length;i++)assert.deepEqual(validateWork(defaultWork(i)),defaultWork(i));
});
test('multiple versions survive library and work-file round trips',()=>{
  const first={id:'one',createdAt:'2026-10-01T05:00:00Z',work:defaultWork(3)};
  const second={...first,id:'two',work:{...first.work,title:'雨后的来信'}};
  assert.deepEqual(parseLibrary(serializeLibrary([first,second])),[first,second]);
  assert.deepEqual(validateWork(JSON.parse(JSON.stringify(second.work))),second.work);
  assert.deepEqual(parseLibrary(null),[]);
  assert.throws(()=>parseLibrary(serializeLibrary([first,first])));
  assert.throws(()=>parseLibrary('{invalid'));
});
test('invalid imports are rejected and unexpected fields are stripped',()=>{
  const work=defaultWork(2);
  for(const change of [{version:2},{storyId:'missing'},{bpm:200},{bpm:84.5},{title:''},{ending:'x'.repeat(81)},{chapters:[]},{brand:'x'.repeat(13)}])assert.throws(()=>validateWork({...work,...change}));
  const extra=JSON.parse(JSON.stringify(work).slice(0,-1)+',"__proto__":{"polluted":true},"script":"alert(1)"}');
  const clean=validateWork(extra);assert.equal(Object.hasOwn(clean,'__proto__'),false);assert.equal(Object.hasOwn(clean,'script'),false);assert.equal({}.polluted,undefined);
  assert.equal(validateWork({...work,title:'  <script>作品</script>  '}).title,'<script>作品</script>'); // Text remains data; UI uses textContent.
});
