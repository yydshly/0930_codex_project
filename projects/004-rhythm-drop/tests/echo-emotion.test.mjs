import test from 'node:test';
import assert from 'node:assert/strict';
import {EMOTION_DURATION,emotionAt,directEmotion,emotionScore} from '../src/echo-emotion.mjs';
import {renderNote,renderDryScore} from '../src/echo-sound.mjs';

const directedAt=(time,reducedMotion=false)=>directEmotion({...emotionAt(time),reducedMotion});
const inPhase=phase=>emotionScore.filter(note=>emotionAt(note.at).phase===phase);
const distance=scene=>Math.hypot(scene.kongPosition[0]-scene.friend.x,scene.kongPosition[1]-scene.friend.z);

test('the missed greeting contains two attempts, while leaving still carries a wish to be heard',()=>{
  const overlap=inPhase('overlap'),kong=overlap.filter(note=>note.source==='kong'),zhe=overlap.find(note=>note.source==='zhe');
  assert.ok(kong.length>0&&zhe,'both characters must try to speak during the missed greeting');
  assert.ok(kong.some(note=>note.at<zhe.at+zhe.length&&zhe.at<note.at+note.length),'the missed entry must actually overlap in the sound');
  const before=directedAt(6.2),after=directedAt(10.5);
  assert.ok(after.zhe.foldOpen<before.zhe.foldOpen,'the friend retreats after its attempt is covered');
  assert.ok(after.kong.confidence<before.kong.confidence,'the unanswered attempt changes the protagonist');
  const leaving=directedAt(16),waiting=directedAt(22);
  assert.ok(waiting.kongPosition[0]>leaving.kongPosition[0],'the protagonist really leaves its earlier position');
  assert.ok(waiting.kongYaw>0&&waiting.kong.look<0,'its body leaves while attention remains behind');
  assert.equal(waiting.kong.walking,false,'the departure ends in waiting, not an endless walk cycle');
});

test('the friend initiates the call before the return, and both characters later close the distance',()=>{
  const call=inPhase('call-back').filter(note=>note.source==='zhe');
  assert.ok(call.length>0,'the friend needs an audible attempt to call the protagonist back');
  const returnAt=Array.from({length:EMOTION_DURATION*10+1},(_,index)=>index/10).find(time=>emotionAt(time).phase==='return');
  assert.ok(call.every(note=>note.at+note.length<returnAt),'the return must follow the call instead of anticipating it');
  const callStart=directedAt(24),callEnd=directedAt(29.5);
  assert.ok(callEnd.friend.x>callStart.friend.x,'the friend comes out to attempt contact');
  assert.ok(distance(directedAt(34.8))<distance(directedAt(returnAt)),'the protagonist actively returns');
  assert.ok(distance(directedAt(44.8))<distance(directedAt(39)),'the friend also advances during the answer');
  assert.ok(inPhase('offer').some(note=>note.source==='kong'),'the protagonist offers its own small phrase');
  assert.ok(inPhase('answer').some(note=>note.source==='zhe'),'the friend contributes an independent answer');
});

test('the two quiet intervals are truly silent but carry withdrawal and receptive waiting respectively',()=>{
  const rate=8000,sound=renderDryScore(emotionScore,EMOTION_DURATION,rate);
  for(const [start,end] of [[14,16],[37,39]]){
    for(const channel of [sound.left,sound.right]){
      assert.ok(channel.subarray(start*rate,end*rate).every(value=>value===0),`all sound, including tails and pads, must stop between ${start} and ${end}`);
    }
  }
  const withdrawal=directedAt(15),space=directedAt(38);
  assert.equal(withdrawal.kong.gesture,'pull-back');
  assert.equal(space.kong.gesture,'half-wave');
  assert.ok(space.zhe.foldOpen>withdrawal.zhe.foldOpen,'the second silence leaves more room for the friend to try');
  assert.ok(space.kong.confidence>withdrawal.kong.confidence,'silence after the offer is not another rejection');
  assert.equal(space.connection,0,'waiting alone must not complete the relationship');
});

test('the fifty-two-second ending preserves shyness and does not force complete trust',()=>{
  assert.equal(EMOTION_DURATION,52);
  const ending=directedAt(EMOTION_DURATION);
  assert.ok(ending.friendVisible&&ending.kongVisible,'both characters choose to remain at the ending');
  assert.ok(ending.zhe.foldOpen>0&&ending.zhe.foldOpen<1,'the folded ear is still only partly open');
  assert.ok(ending.connection>0&&ending.connection<1,'a first connection must not imply fully resolved emotions');
  assert.equal(ending.kong.emotion,'shy');assert.equal(ending.zhe.emotion,'shy');
  assert.equal(emotionAt(EMOTION_DURATION-.01).complete,false);
  assert.equal(emotionAt(EMOTION_DURATION).complete,true);
  assert.deepEqual(emotionAt(1000),emotionAt(EMOTION_DURATION),'playback must hold its final scene');
});

test('the complete layered score stays finite, unclipped and finishes before the film ends',()=>{
  const rate=8000;
  assert.ok(emotionScore.some(note=>note.style==='pad'),'verify the musical bed together with the character voices');
  for(const note of emotionScore){
    for(const field of ['at','midi','length','gain'])assert.ok(Number.isFinite(note[field]),`${field} must be finite`);
    assert.ok(note.at>=0&&note.length>0&&note.gain>0);
    const samples=renderNote(note,rate);
    assert.ok(note.at+samples.length/rate<EMOTION_DURATION,'the actual rendered tail must fit inside the film');
    assert.ok(samples.every(value=>Number.isFinite(value)&&Math.abs(value)<1));
  }
  const sound=renderDryScore(emotionScore,EMOTION_DURATION,rate);
  for(const channel of [sound.left,sound.right]){
    assert.equal(channel.length,rate*EMOTION_DURATION);
    assert.ok(channel.some(value=>Math.abs(value)>.01),'the validated channel must contain audible material');
    assert.ok(channel.every(value=>Number.isFinite(value)&&Math.abs(value)<1),'overlapping voices and pads must remain unclipped');
    assert.ok(channel.subarray(51*rate).every(value=>value===0),'the final tail must leave a quiet ending');
  }
});

test('reduced motion keeps a fixed camera without removing the narrative choices',()=>{
  const fixed=directedAt(0,true);
  for(let time=0;time<=EMOTION_DURATION;time+=.25){
    const scene=directedAt(time,true),full=directedAt(time);
    assert.deepEqual(scene.camera,fixed.camera,'reduced motion must not reframe or pan between emotions');
    assert.equal(scene.span,fixed.span,'reduced motion must not zoom');
    for(const field of ['kong','zhe','kongPosition','friend','kongVisible','connection'])assert.deepEqual(scene[field],full[field],`reduced motion preserves the story choice ${field}`);
  }
});
