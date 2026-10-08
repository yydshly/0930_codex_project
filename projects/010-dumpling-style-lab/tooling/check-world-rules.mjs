// Renderer-independent regression checks. Browser interaction is verified separately through CUA.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../web');
const gradient={addColorStop(){}};
const context2d=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,measureText:t=>({width:String(t).length*8})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
const canvas=()=>({width:960,height:600,style:{},setAttribute(){},getContext:()=>context2d,addEventListener(){},removeEventListener(){},focus(){},remove(){},getBoundingClientRect:()=>({x:0,y:0,left:0,top:0,width:960,height:600})});
const timers=new Set();
const ctx=vm.createContext({console,URL,Image:class {set src(v){this.onerror?.()}},document:{createElement:canvas},setTimeout:(f)=>{const id={};timers.add(id);return id},clearTimeout:id=>timers.delete(id),DOMMatrix:class {scale(){return this}}});
const modules=new Map();
async function moduleAt(file){file=file.split('?')[0];if(modules.has(file))return modules.get(file);const source=file.endsWith('islands-art.js')?'export function createIslandArt(){return {element:document.createElement("canvas"),project:(x,z)=>({x,y:z}),update(){},draw(){},setArea(){},refresh(){},dispose(){}}}':file.endsWith('moving-art.js')?'export function createMovingArt(){return {status:{ready:true},ready:Promise.resolve(),draw(){},load(){return Promise.resolve()}}}':file.endsWith('moving-interface.js')?'export function createMovingInterface(){return {update(){},dispose(){}}}':fs.readFileSync(file,'utf8');const m=new vm.SourceTextModule(source,{context:ctx,identifier:file,initializeImportMeta(meta){meta.url=new URL('file:///'+file.replaceAll('\\','/')).href}});modules.set(file,m);return m}
const mount={append(){},appendChild(){},closest(){return null},dataset:{}},checks=[];
const check=(name,condition=true)=>{assert(condition,name);checks.push(name)};
async function game(name,exportName,saved){const m=await moduleAt(path.join(root,'games',name+'.js'));if(m.status==='unlinked')await m.link((spec,referrer)=>moduleAt(path.resolve(path.dirname(referrer.identifier),spec)));if(m.status!=='evaluated')await m.evaluate();return m.namespace[exportName]({mount:{...mount,dataset:{world:name}},saved,onEvent(){}})}
const quiet={x:0,y:0,keys:new Set(),pressed:new Set()};
function settle(g,n=1000){for(let i=0;i<n;i++)g.tick(1/60,quiet)}
// Parse every shipped module, including entry points; this catches duplicate bindings.
for(const name of fs.readdirSync(root).filter(n=>n.endsWith('.js')))new vm.SourceTextModule(fs.readFileSync(path.join(root,name),'utf8'),{context:ctx});
for(const name of fs.readdirSync(path.join(root,'games')).filter(n=>n.endsWith('.js')))new vm.SourceTextModule(fs.readFileSync(path.join(root,'games',name),'utf8'),{context:ctx});
check('All shipped JavaScript modules parse');

const detective=await game('detective','createDetectiveGame');
for(const id of ['film','ledger','door','receipt','lin','contact','ji','door','evidence-receipt','evidence-contact','compare','choose-lin','reason-trust','submit'])detective.command(id);
check('Detective evidence custody produces a completed case',detective.getUI().complete&&detective.getState().comparisons.ownership);
detective.command('next-case');check('Second case retains the completed first case',detective.getState().caseIndex===1&&detective.getState().closedCases.length===1);
for(const id of ['film','ledger','door','receipt','lin','contact','ji','door','evidence-receipt','evidence-contact','compare','choose-lin','reason-trust','submit'])detective.command(id);
check('The first case answer fails the new case',!detective.getUI().complete);
for(const id of ['evidence-can','evidence-register','compare','choose-ji','reason-memory','submit'])detective.command(id);
check('Second case requires withdrawal evidence and the different recipient',detective.getUI().complete&&detective.getState().closedCases.length===2);

const wuxia=await game('wuxia','createWuxiaGame');
for(const id of ['river','cliff']){wuxia.command(id);settle(wuxia)}
wuxia.command('secure-cliff');wuxia.command('porter');settle(wuxia);wuxia.command('supply-porter');wuxia.command('supply-porter');wuxia.command('finish');
check('Wuxia roads, one rope and two supplies produce a real rescue',wuxia.getUI().complete&&wuxia.getState().rope===0&&wuxia.getState().rations===0&&wuxia.getState().supplied.porter===2);
wuxia.command('aftermath');check('Rescue has a persisted next-day response',wuxia.getState().journal.some(t=>t.startsWith('翌日回音')));wuxia.command('retrace');check('Retrace replenishes finite resources and retains the old arrangement',!wuxia.getUI().complete&&wuxia.getState().rope===1&&wuxia.getState().reports.length===1);
for(const id of ['river','cliff','river']){wuxia.command(id);settle(wuxia)}wuxia.command('secure-river');wuxia.command('finish');check('Rescue cannot conclude before allocating the two supplies',!wuxia.getUI().complete);

const ecology=await game('ecology','createEcologyGame');
for(const [plot,plant]of [['plot-marsh','reed'],['plot-slope','flowers'],['plot-upland','wood']]){ecology.command(plot);settle(ecology);ecology.command('plant-'+plant);settle(ecology)}
check('Planting uses labor and does not instantly create wildlife',ecology.getState().labor===0&&ecology.getState().observations.length===0);
ecology.command('advance-season');settle(ecology);check('Spring habitats attract insects',ecology.getState().observations.length===2);
ecology.command('gate-hold');settle(ecology);ecology.command('advance-season');settle(ecology);check('A second-season canopy attracts birds',ecology.getState().observations.some(a=>a.id==='bird'));
ecology.command('gate-drain');settle(ecology);ecology.command('advance-season');settle(ecology);check('Three-season mixed habitat completes with viable vegetation',ecology.getUI().complete&&ecology.getState().observations.length>=4);
check('A mixed habitat earns an actual annual research result',ecology.getState().annualReports[0].success);
ecology.command('rewind-season');check('Rewind retains the comparison record',!ecology.getUI().complete&&ecology.getState().history.length===3);ecology.command('advance-season');settle(ecology);ecology.command('new-year');check('Next year retains grown vegetation',ecology.getState().year===2&&ecology.getState().patches.some(p=>p.age>=3));
ecology.command('research-wetland');check('A new year can change its research goal without deleting the yearbook',ecology.getState().research==='wetland'&&ecology.getState().annualReports.length===1);

const wasteland=await game('wasteland','createWastelandGame');wasteland.command('advance');check('Unfunded crops actually fail',wasteland.getState().status==='failed');wasteland.command('retry');
for(const id of ['repair-pump','repair-seal','search','repair-heater','plan-crops','plan-heat','advance','advance','advance'])wasteland.command(id);
check('Repairs and allocations survive three rounds with an archived cost',wasteland.getState().status==='survived'&&wasteland.getState().water===2&&wasteland.getState().power===1&&wasteland.getState().archive.length===2);
wasteland.command('storm-contract');for(const id of ['repair-pump','repair-seal','search','repair-heater','plan-crops','plan-heat','advance'])wasteland.command(id);
wasteland.command('advance');check('Unanswered storm request blocks climate settlement',wasteland.getState().day===1);
const beforeAid=wasteland.getState();wasteland.command('visitor-help');check('Shelter choice immediately spends water and parts and adds backup power',wasteland.getState().water===beforeAid.water-2&&wasteland.getState().parts===beforeAid.parts-1&&wasteland.getState().power===beforeAid.power+1);
wasteland.command('advance');wasteland.command('advance');check('Storm shelter scenario remains completable with a distinct archived outcome',wasteland.getState().status==='survived'&&wasteland.getState().archive.at(-1).visitor==='help');

const dream=await game('dream','createDreamGame');
dream.command('memory-watch');settle(dream);check('An unbuilt bridge blocks reaching the watch',dream.getState().holding===null);
for(const id of ['memory-ticket','node-lamp','memory-watch','ferry','node-stone','memory-ticket','node-echo','threshold']){dream.command(id);settle(dream)}
dream.command('choose-time');check('Memory placement opens actual paths to the chosen ending',dream.getUI().complete&&dream.getState().ending==='time');
dream.command('revisit');for(const id of ['memory-ticket','node-lamp','memory-watch','ferry','node-stone','memory-ticket','node-echo','threshold']){dream.command(id);settle(dream)}dream.command('choose-departure');check('Revisiting retains both different endings',dream.getState().endings.length===2&&dream.getState().ending==='departure');

const inn=await game('inn','createInnGame');const visits=[['quiet',['tea']],['window',['plant']],['quiet',['books']],['window',['tea']],['window',['plant','tea']],['quiet',['books','tea']],['quiet',['tea','plant']]];
for(const [room,items]of visits){inn.command('read-guest');inn.command('room-'+room);for(const item of items)if(inn.getState().furnishings[item]!==room)inn.command('place-'+item);inn.command('assign');settle(inn);inn.command('sendoff');inn.command('next-day')}
check('Seven successful stays retain return memories and six souvenirs',inn.getUI().complete&&inn.getState().souvenirs.length===6&&inn.getState().journal.length===7&&inn.getState().histories.courier.length===3);
inn.command('next-chapter');check('Inn second chapter retains furniture and return histories',inn.getState().day===8&&inn.getState().furnishings.tea==='quiet'&&inn.getState().histories.courier.length===3);
for(const [room,items,choice]of [['window',['books','plant'],'listen'],['quiet',['tea'],'encourage'],['quiet',['plant','books'],'listen']]){inn.command('read-guest');inn.command('conversation-'+choice);inn.command('room-'+room);for(const item of items)if(inn.getState().furnishings[item]!==room)inn.command('place-'+item);inn.command('assign');settle(inn);inn.command('sendoff');inn.command('next-day')}
check('Three return dilemmas produce real letters and souvenirs',inn.getUI().complete&&inn.getState().letters.length===3&&inn.getState().souvenirs.includes('寄出的回信'));
const revisitInn=await game('inn','createInnGame',inn.getState());revisitInn.command('revisit-chapter');check('Inn revisit starts day eight while keeping all three letters',revisitInn.getState().day===8&&revisitInn.getState().letters.length===3);
const revisitCase=await game('detective','createDetectiveGame',detective.getState());revisitCase.command('case-0');check('Closed cases can be selected with both old conclusions preserved',revisitCase.getState().caseIndex===0&&revisitCase.getState().closedCases.length===2&&!revisitCase.getUI().complete);

const arcade=await game('arcade','createArcadeGame');
function runCourse(roofs,destination){for(let i=0;i<roofs.length-1;i++){let n=0;while(arcade.getState().player.x<roofs[i][0]+roofs[i][1]-20&&n++<300)arcade.tick(1/120,{...quiet,x:1});arcade.command('jump');for(let j=0;j<20;j++)arcade.tick(1/120,{...quiet,x:1});arcade.command('dash');n=0;while(arcade.getState().checkpoint<i+1&&n++<300)arcade.tick(1/120,{...quiet,x:1});assert(arcade.getState().checkpoint===i+1,'checkpoint '+i)}let n=0;while(arcade.getState().player.x<destination-30&&n++<400)arcade.tick(1/120,{...quiet,x:1});settle(arcade,40);arcade.command('deliver');assert(arcade.getState().status==='delivered')}
runCourse([[20,230],[325,210],[615,250],[950,425]],1260);check('First rooftop course is completable without falling',arcade.getState().falls===0);arcade.command('next-route');runCourse([[20,210],[320,160],[590,180],[915,155],[1220,440]],1530);check('Second rooftop course keeps a separate actual record',arcade.getState().falls===0&&arcade.getState().completed.slice(0,2).every(Boolean)&&arcade.getState().best.slice(0,2).every(v=>v>0));
arcade.command('next-route');runCourse([[20,230],[340,220],[650,240],[990,380]],1260);check('Third courier route is completable and has its own recipient and record',arcade.getState().falls===0&&arcade.getState().completed.every(Boolean)&&arcade.getState().best.every(v=>v>0));arcade.command('route-0');check('Completed routes can be selected while keeping three best times',arcade.getState().course===0&&arcade.getState().best.every(v=>v>0));
const buffered=await game('arcade','createArcadeGame',{...arcade.getState(),player:{x:100,y:478,vx:0,vy:80,grounded:false,facing:1}});buffered.tick(.2,quiet); // expire the edge grace period, then create a genuine airborne landing.
const airborne=await game('arcade','createArcadeGame',{...arcade.getState(),player:{x:280,y:445,vx:0,vy:100,grounded:false,facing:1}});for(let i=0;i<16;i++)airborne.tick(1/120,quiet);
airborne.command('jump');check('Jump buffering accepts an airborne request without pretending it jumped',airborne.getState().player.vy>0);
const landingBuffer=await game('arcade','createArcadeGame',{...arcade.getState(),player:{x:100,y:440,vx:0,vy:0,grounded:false,facing:1}});for(let i=0;i<16;i++)landingBuffer.tick(1/120,quiet);landingBuffer.command('jump');for(let i=0;i<14;i++)landingBuffer.tick(1/120,quiet);check('A buffered jump fires on the real landing within 140 ms',!landingBuffer.getState().player.grounded&&landingBuffer.getState().player.vy<0);
const auto=await game('arcade','createArcadeGame');auto.command('auto-forward');auto.tick(.1,quiet);check('Auto forward moves but leaves jumps under player control',auto.getState().player.x>90&&auto.getState().player.grounded);

const islands=await game('islands','createIslandsGame');for(const id of ['camp-rope','camp-lantern','camp-anchor','camp-depart','ruins-crystal','ruins-lamp','ruins-rubbing','ruins-return','camp-map']){islands.command(id);settle(islands)}check('Actual island paths, bridge and seal permit two discoveries and return',islands.getUI().complete&&islands.getState().discoveries.length===2);
islands.command('camp-tower');settle(islands);check('Cloud tower is a real third area and opens a new incomplete chapter',islands.getState().area==='tower'&&!islands.getUI().complete);
islands.command('tower-star');settle(islands);check('Uncalibrated wind actually blocks the star platform',!islands.getState().starAligned);
for(const id of ['tower-note','tower-wind','tower-star','tower-star','tower-beacon','tower-return','camp-map']){islands.command(id);settle(islands)}check('Wind bridge, two star rotations, beacon and return report complete chapter two',islands.getState().windAligned&&islands.getState().starAligned&&islands.getState().beaconLit&&islands.getState().towerReported&&islands.getUI().complete);
for(const [name,exportName,g]of [['detective','createDetectiveGame',detective],['wuxia','createWuxiaGame',wuxia],['ecology','createEcologyGame',ecology],['wasteland','createWastelandGame',wasteland],['dream','createDreamGame',dream],['inn','createInnGame',inn],['arcade','createArcadeGame',arcade],['islands','createIslandsGame',islands]]){const restored=await game(name,exportName,g.getState());check(name+' extended chapter and records survive reload',JSON.stringify(restored.getUI().journal)===JSON.stringify(g.getUI().journal));}
const movers=await game('movers','createMoversGame');const cargo=movers.getState().cargo;const partial=await game('movers','createMoversGame',{...movers.getState(),version:1,cargo:cargo.map((c,i)=>({...c,delivered:i<2})),phase:'playing',completedOrders:0});check('Legacy moving save retains two delivered objects',partial.getState().version===3&&partial.getState().cargo.filter(c=>c.delivered).length===2);
const completedMove=await game('movers','createMoversGame',{...movers.getState(),cargo:cargo.map(c=>({...c,delivered:true})),orderDone:true,completedOrders:3,records:[{order:0,score:100,time:42},{order:1,score:86,time:58},{order:2,score:100,time:55}],phase:'result'});completedMove.command('order-2');check('Selecting a completed commission starts its real cargo while retaining all three records',completedMove.getState().orderIndex===2&&!completedMove.getState().orderDone&&completedMove.getState().records.length===3);completedMove.command('order-0');check('Commission selection cannot discard an unfinished order',completedMove.getState().orderIndex===2);
const legacyInnState=inn.getState();for(const field of ['letters','conversation'])delete legacyInnState[field];legacyInnState.day=7;legacyInnState.phase='finished';const legacyInn=await game('inn','createInnGame',legacyInnState);legacyInn.command('next-chapter');check('A pre-extension completed inn save enters the new chapter',legacyInn.getState().day===8&&legacyInn.getState().letters.length===0);
const legacyIslandState=islands.getState();legacyIslandState.area='camp';for(const field of ['towerStarted','wind','star','windAligned','starAligned','beaconLit','towerReported'])delete legacyIslandState[field];const legacyIsland=await game('islands','createIslandsGame',legacyIslandState);legacyIsland.command('camp-tower');settle(legacyIsland);check('A pre-extension island save retains discoveries and reaches the new island',legacyIsland.getState().area==='tower'&&legacyIsland.getState().discoveries.length===2);
const legacyArcadeState=arcade.getState();legacyArcadeState.best=[18,24];legacyArcadeState.completed=[true,true];delete legacyArcadeState.autoForward;const legacyArcade=await game('arcade','createArcadeGame',legacyArcadeState);check('Two-route courier saves gain an empty third route without losing best times',legacyArcade.getState().best[0]===18&&legacyArcade.getState().best[1]===24&&legacyArcade.getState().best[2]===null);
for(const gate of ['hold','balanced','drain'])for(const season of [0,1,2]){
 const sample=await game('ecology','createEcologyGame',{...ecology.getState(),gate,season,complete:false,work:null});
 const expected=sample.getUI().patchForecast;sample.command('advance-season');settle(sample);
 assert.deepEqual(sample.getState().patches.map(p=>[p.water,p.health,p.age]),expected.map(p=>[p.water,p.health,p.age]),'Forecast must match real seasonal consequences');
}
check('Ecology forecast matches actual water, health and age across all three gates and seasons');
const report={date:new Date().toISOString(),method:'Node VM; real game rules and pathfinding; drawing context and 3D renderer mocked. Isolated browser screenshots and UI checks cover rendering.',checks,commercialOrEmotionalValidation:false};
fs.writeFileSync(path.resolve(root,'../notes/worlds-rules-check.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
