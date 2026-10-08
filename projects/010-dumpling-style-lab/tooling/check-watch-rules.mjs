import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {freshWatch, sanitizeWatch, actWatch, advanceWatch} from '../web/showcase-watch.js';
const checks=[];
function check(name,fn){fn();checks.push({name,passed:true})}
function walk(s,seconds,policy=()=>{}){for(let t=0;t<seconds&&s.phase==='watch';t+=.05){policy(s);advanceWatch(s,.05)}return s}
function safePolicy(s){
 if(s.crew.stage==='waiting'||s.crew.stage==='quay'){actWatch(s,'camera',0);if(!s.lamps[0])actWatch(s,'lamp')}
 if(s.crew.stage==='crossing'&&s.lamps[0]){actWatch(s,'camera',0);actWatch(s,'lamp')}
 if(s.crew.stage==='beacon'&&s.beacon<=0){actWatch(s,'camera',2);actWatch(s,'beacon')}
 if(s.visitor.stage!=='departed'&&s.elapsed>28&&!s.shutter)actWatch(s,'shutter');
 if(s.visitor.stage==='departed'&&s.shutter)actWatch(s,'shutter');
 if(s.power<73&&!s.backupUsed){actWatch(s,'camera',3);actWatch(s,'backup')}
}
check('Safe light/gate route reaches rescue and powered handover',()=>{const s=walk(freshWatch(),80,safePolicy);assert.equal(s.phase,'won');assert.equal(s.crew.stage,'safe');assert.equal(s.visitor.stage,'departed');assert.ok(s.power>20);assert.ok(s.score>700)});
check('Leaving corridor open causes generator failure before handover',()=>{const s=walk(freshWatch(),80);assert.equal(s.phase,'failed');assert.ok(s.elapsed>49&&s.elapsed<54);assert.match(s.log[0],/发电机/)});
check('Protecting generator without guiding worker fails at high tide',()=>{const s=walk(freshWatch(),80,s=>{if(s.elapsed>30&&!s.shutter&&s.visitor.stage!=='departed')actWatch(s,'shutter');if(s.visitor.stage==='departed'&&s.shutter)actWatch(s,'shutter')});assert.equal(s.phase,'failed');assert.equal(s.elapsed,72);assert.equal(s.crew.safe,false);assert.match(s.log[0],/检修员/)});
check('Closing a gate after an intruder already crossed cannot trap him behind it',()=>{const s=walk(freshWatch(),80,s=>{if(s.visitor.stage==='hall'&&s.visitor.p>.30&&!s.shutter)actWatch(s,'shutter')});assert.equal(s.phase,'failed');assert.match(s.log[0],/发电机/)});
check('Floodlight delays approach by a finite interval',()=>{const s=freshWatch();actWatch(s,'lamp');walk(s,48);assert.equal(s.visitor.stage,'hall');assert.ok(s.visitor.lit<=7);assert.equal(s.phase,'watch');walk(s,30);assert.equal(s.phase,'failed')});
check('Beacon only operates at lighthouse and consumes exact activation power',()=>{const s=freshWatch();assert.equal(actWatch(s,'beacon'),false);actWatch(s,'camera',2);assert.equal(actWatch(s,'beacon'),true);assert.equal(s.power,91);assert.equal(s.beacon,6);assert.equal(actWatch(s,'beacon'),false)});
check('Backup power is available only at archives and once per shift',()=>{const s=freshWatch();s.power=40;assert.equal(actWatch(s,'backup'),false);actWatch(s,'camera',3);assert.equal(actWatch(s,'backup'),true);assert.equal(s.power,62);assert.equal(actWatch(s,'backup'),false)});
check('Loss of power disables floodlights, beacon and held shutter',()=>{const s=freshWatch();s.power=.01;s.shutter=true;s.lamps.fill(true);s.beacon=3;advanceWatch(s,.2);assert.equal(s.power,0);assert.equal(s.shutter,false);assert.deepEqual(s.lamps,[false,false,false,false]);assert.equal(s.beacon,0)});
check('Save/resume yields identical encounter progression',()=>{const original=walk(freshWatch(),42,safePolicy);const copy=sanitizeWatch(JSON.parse(JSON.stringify(original)));walk(original,40,safePolicy);walk(copy,40,safePolicy);assert.deepEqual(copy,original)});
check('Corrupt saves cannot create NaN, invalid camera or out-of-range power',()=>{const s=sanitizeWatch({version:1,power:Infinity,elapsed:NaN,camera:500,phase:'invented',lamps:{0:'true'},crew:{stage:'invented',p:Infinity},visitor:{stage:'invented'},log:['ok',5]});assert.equal(s.power,100);assert.equal(s.elapsed,0);assert.equal(s.camera,3);assert.equal(s.phase,'watch');assert.equal(s.crew.stage,'waiting');assert.deepEqual(s.log,['ok'])});
check('Completed episodes stop consuming power and time',()=>{const s=walk(freshWatch(),80,safePolicy),before=structuredClone(s);advanceWatch(s,10);assert.deepEqual(s,before)});
check('Stateful actions are disabled after failure, camera review remains possible',()=>{const s=walk(freshWatch(),80);const power=s.power;assert.equal(actWatch(s,'lamp'),false);assert.equal(actWatch(s,'beacon'),false);assert.equal(actWatch(s,'shutter'),false);assert.equal(s.power,power);assert.equal(actWatch(s,'camera',3),true)});
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/game-forms/watch-generation-20261004.json'),'utf8'));
check('All six authored runtime files and generation originals exist',()=>{assert.equal(manifest.assets.length,6);for(const a of manifest.assets){assert.ok(fs.statSync(path.join(root,a.runtime)).size>10000);assert.ok(fs.existsSync(path.join(root,'assets/game-forms/watch-sources',a.id+'.png')))}for(const a of manifest.assets.filter(a=>a.transparent))assert.deepEqual(a.alpha_range,[0,255])});
const result={scope:'Renderer-independent production logic and local asset integrity; browser appearance, input, and audible output require root CUA review.',passed:checks.length,checks};
fs.writeFileSync(path.join(root,'notes/watch-rules-check-20261004.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
