const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,d,a=-1e6,b=1e6)=>Number.isFinite(n)?clamp(n,a,b):d;
export const DESKTOP_FILES={
 mail:{title:'未送达的灯塔物资',kind:'收件箱',text:'今天 18:00，灯塔应收到镜片箱。暴雨提前到来，码头装卸暂停。请找到物资实际存放的位置，并说明是谁、为什么转移了它。',evidence:'weather'},
 manifest:{title:'出库单 · 042',kind:'档案',text:'货物：灯塔替换镜片。外箱系橙色绳。原定交付：灯塔前台。承运备注：保持干燥，禁止露天堆放。',evidence:'rope'},
 log:{title:'值班转运记录',kind:'档案',text:'18:10，林舟在值班记录中写道：码头积水，把橙绳箱搬至海角仓库屋檐下避雨。钥匙已交前台，待天气好转取走。',evidence:'transfer'},
 photo:{title:'18:16 · 海角仓库',kind:'照片',text:'照片中可见海角仓库的蓝绿色门、屋檐下的木箱和橙色绳。箱子完好，门口地面仍有积水。',evidence:'photo'},
 memo:{title:'旧便笺',kind:'档案',text:'山顶小屋用于储存旧渔网，码头茶室已经打烊。转运箱应放在有屋顶且便于取回的地点。',evidence:null}
};
export const APPS=['mail','files','photo','case'];
export const ROOMS=[
 {id:'quay',name:'雨港值班室',text:'风从港口吹进来。桌上有一盏提灯，木抽屉半掩着。门外是物资间和灯塔阶梯。'},
 {id:'store',name:'物资间',text:'木箱上有一把铜锁。架子上放着一瓶灯油，门后的绳索已受潮。'},
 {id:'stairs',name:'灯塔阶梯',text:'铁门挡住石阶。越过门后便没有照明，需要一盏点亮的提灯。'},
 {id:'tower',name:'灯室',text:'黄铜灯座缺少镜片和燃料。海面尚暗；风吹动巨大的玻璃窗。'}
];
export const SCULPT_TARGET=Array.from({length:125},(_,i)=>{const x=i%5,z=Math.floor(i/5)%5,y=Math.floor(i/25);return y===0||y===4||(x===0||x===4)&&(z===0||z===4)});
export const SEA_TARGETS=[{x:270,depth:80,name:'浅礁水样'},{x:640,depth:180,name:'峡谷矿样'},{x:940,depth:100,name:'潮汐浮标'}];
export function freshHorizons(id){
 const base={id,version:1,won:false,message:'',moves:0};
 if(id==='desktop')return {...base,windows:[],selected:'mail',evidence:[],query:'',answers:{place:'',person:'',reason:''},z:0};
 if(id==='inkwell')return {...base,room:0,inventory:[],flags:{drawer:false,trunk:false,gate:false,lit:false,lens:false,fuel:false},transcript:[{who:'story',text:ROOMS[0].text}],draft:'',history:[]};
 if(id==='atelier')return {...base,cells:Array(125).fill(true),layer:2,mode:'carve',selected:-1,yaw:.66,pitch:.53,history:[]};
 if(id==='submersible')return {...base,station:'helm',x:70,depth:60,vx:0,vy:0,throttle:0,targetDepth:60,battery:120,hull:94,leak:0,sonar:null,cooldown:0,seen:[false,false,false],samples:[false,false,false],failed:false,time:0};
 throw new Error('Unknown horizons form '+id);
}
export function restoreHorizons(id,raw){
 const s=freshHorizons(id);if(!raw||raw.id!==id||raw.version!==1)return s;
 s.moves=finite(raw.moves,0,0,1e6);s.message=typeof raw.message==='string'?raw.message.slice(0,350):'';
 if(id==='desktop'){
  s.windows=(Array.isArray(raw.windows)?raw.windows:[]).filter(v=>APPS.includes(v?.app)).slice(0,4).filter((v,i,a)=>a.findIndex(x=>x.app===v.app)===i).map(v=>({app:v.app,x:finite(v.x,100,0,510),y:finite(v.y,80,46,300),z:finite(v.z,0,0,1e6)}));
  s.selected=Object.hasOwn(DESKTOP_FILES,raw.selected)?raw.selected:'mail';s.evidence=(Array.isArray(raw.evidence)?raw.evidence:[]).filter(v=>['weather','rope','transfer','photo'].includes(v)).filter((v,i,a)=>a.indexOf(v)===i);
  s.query=typeof raw.query==='string'?raw.query.slice(0,80):'';for(const key of ['place','person','reason'])s.answers[key]=typeof raw.answers?.[key]==='string'?raw.answers[key].slice(0,30):'';
  s.z=Math.max(0,...s.windows.map(v=>v.z));s.won=!!raw.won&&desktopSolved(s);
 }
 if(id==='inkwell'){
  s.room=finite(raw.room,0,0,3)|0;s.inventory=(Array.isArray(raw.inventory)?raw.inventory:[]).filter(v=>['铜钥匙','提灯','镜片','灯油'].includes(v)).filter((v,i,a)=>a.indexOf(v)===i);
  for(const k of Object.keys(s.flags))s.flags[k]=raw.flags?.[k]===true;
  s.transcript=(Array.isArray(raw.transcript)?raw.transcript:[]).filter(v=>v&&['player','story'].includes(v.who)&&typeof v.text==='string').slice(-40).map(v=>({who:v.who,text:v.text.slice(0,500)}));
  if(!s.transcript.length)s.transcript=[{who:'story',text:ROOMS[s.room].text}];s.draft=typeof raw.draft==='string'?raw.draft.slice(0,120):'';
  s.history=(Array.isArray(raw.history)?raw.history:[]).slice(-20).map(v=>{const x=restoreHorizons(id,{...v,history:[]});return storySnapshot(x)});s.won=!!raw.won&&s.room===3&&s.flags.lens&&s.flags.fuel;
 }
 if(id==='atelier'){
  if(Array.isArray(raw.cells)&&raw.cells.length===125&&raw.cells.every(v=>typeof v==='boolean'))s.cells=[...raw.cells];
  s.layer=finite(raw.layer,2,0,4)|0;s.selected=finite(raw.selected,-1,-1,124)|0;s.mode=raw.mode==='add'?'add':'carve';s.yaw=finite(raw.yaw,.66,-Math.PI,Math.PI);s.pitch=finite(raw.pitch,.53,.15,1.15);
  s.history=(Array.isArray(raw.history)?raw.history:[]).filter(v=>Array.isArray(v)&&v.length===125&&v.every(x=>typeof x==='boolean')).slice(-40).map(v=>[...v]);s.won=sculptSolved(s);
 }
 if(id==='submersible'){
  for(const [k,min,max] of [['x',20,1100],['depth',20,250],['vx',-30,30],['vy',-30,30],['throttle',-2,2],['targetDepth',20,220],['battery',0,120],['hull',0,100],['leak',0,2],['cooldown',0,3],['time',0,10000]])s[k]=finite(raw[k],s[k],min,max);
  s.throttle=Math.round(s.throttle);s.station=['helm','ballast','sonar','engineering'].includes(raw.station)?raw.station:'helm';
  for(const key of ['seen','samples'])if(Array.isArray(raw[key])&&raw[key].length===3)s[key]=raw[key].map(v=>v===true);
  s.samples=s.samples.map((v,i)=>v&&s.seen[i]);s.failed=s.battery<=0||s.hull<=0;s.won=!!raw.won&&s.samples.every(Boolean)&&s.x>1070&&s.depth<85;
 }
 return s;
}
export function desktopSolved(s){return ['weather','rope','transfer','photo'].every(v=>s.evidence.includes(v))&&s.answers.place==='海角仓库'&&s.answers.person==='林舟'&&s.answers.reason==='暴雨避雨'}
export function sculptSolved(s){return s.cells.every((v,i)=>v===SCULPT_TARGET[i])}
export function seaRecoverable(s,i){const t=SEA_TARGETS[i];return !!t&&s.seen[i]&&!s.samples[i]&&Math.hypot(s.x-t.x,s.depth-t.depth)<32&&Math.abs(s.vx)<9&&Math.abs(s.vy)<6}
export function commandHorizons(s,key,arg){
 if(key==='restart'){Object.assign(s,freshHorizons(s.id));return true}
 if(s.id==='desktop'){
  if(key==='open'&&APPS.includes(arg)){let w=s.windows.find(v=>v.app===arg);if(!w){w={app:arg,x:78+s.windows.length*44,y:76+s.windows.length*30,z:0};s.windows.push(w)}w.z=++s.z;if(arg==='mail'||arg==='photo'){const selected=s.selected;readFile(s,arg);s.selected=selected;}s.moves++;return true}
  if(key==='close'){s.windows=s.windows.filter(v=>v.app!==arg);return true}
  if(key==='move'&&arg&&APPS.includes(arg.app)){const w=s.windows.find(v=>v.app===arg.app);if(!w)return false;w.x=finite(arg.x,w.x,0,510);w.y=finite(arg.y,w.y,46,300);w.z=++s.z;return true}
  if(key==='front'){const w=s.windows.find(v=>v.app===arg);if(w)w.z=++s.z;return !!w}
  if(key==='read'&&Object.hasOwn(DESKTOP_FILES,arg)){readFile(s,arg);s.moves++;return true}
  if(key==='search'&&typeof arg==='string'){s.query=arg.slice(0,80);return true}
  if(key==='answer'&&arg&&['place','person','reason'].includes(arg.key)&&typeof arg.value==='string'){s.answers[arg.key]=arg.value.slice(0,30);return true}
  if(key==='submit'){s.won=desktopSolved(s);s.message=s.won?'转运已查明：林舟为避雨将镜片箱放在海角仓库。灯塔已确认可以取回。':s.evidence.length<4?'先收集邮件、出库单、转运记录和现场照片，再串联证据。':'证据已齐，请重新核对地点、经手人和转运原因。';s.moves++;return s.won}
 }
 if(s.id==='inkwell'){
  if(key==='draft'&&typeof arg==='string'){s.draft=arg.slice(0,120);return true}
  if(key==='undo'){const v=s.history.pop();if(!v)return false;const history=s.history;Object.assign(s,v,{history});s.message='已撤回上一条指令。';return true}
  if(key==='type'&&typeof arg==='string'){const t=arg.trim().slice(0,120);if(!t)return false;s.history.push(storySnapshot(s));if(s.history.length>20)s.history.shift();const reply=parseStory(s,t);s.transcript.push({who:'player',text:t},{who:'story',text:reply});s.transcript=s.transcript.slice(-40);s.message=reply;s.draft='';s.moves++;return true}
 }
 if(s.id==='atelier'){
  if(key==='layer'&&Number.isInteger(arg)&&arg>=0&&arg<5){s.layer=arg;return true}
  if(key==='mode'&&['carve','add'].includes(arg)){s.mode=arg;return true}
  if(key==='orbit'&&arg){s.yaw=clamp(s.yaw+finite(arg.x,0),-Math.PI,Math.PI);s.pitch=clamp(s.pitch+finite(arg.y,0),.15,1.15);return true}
  if(key==='undo'){const v=s.history.pop();if(!v)return false;s.cells=v;s.won=sculptSolved(s);s.message='已还原上一刀。';return true}
  if(key==='cell'&&Number.isInteger(arg)&&arg>=0&&arg<125){s.selected=arg;const value=s.mode==='add';if(s.cells[arg]===value)return false;s.history.push([...s.cells]);if(s.history.length>40)s.history.shift();s.cells[arg]=value;s.moves++;s.won=sculptSolved(s);s.message=s.won?'镂空灯雕完成。光穿过你亲手凿出的空间。':value?'已补回一块陶土。':'已凿下一块陶土；可以撤销或补土。';return true}
 }
 if(s.id==='submersible'){
  if(key==='station'&&['helm','ballast','sonar','engineering'].includes(arg)){s.station=arg;return true}
  if(s.failed||s.won)return false;
  if(key==='throttle'&&s.station==='helm'&&Number.isInteger(arg)&&arg>=-2&&arg<=2){s.throttle=arg;s.message=arg===0?'推进器停止，船体仍会随惯性漂移。':'已设定推进档位。';return true}
  if(key==='depth'&&s.station==='ballast'&&Number.isFinite(arg)){s.targetDepth=clamp(arg,20,220);s.message='浮力泵开始调整，实际深度将逐步接近目标。';return true}
  if(key==='ping'&&s.station==='sonar'&&s.cooldown===0&&s.battery>=2){s.battery-=2;s.sonar={x:s.x,depth:s.depth,radius:0};s.cooldown=3;s.message='声波正在传播，探测半径 300 米。';s.moves++;return true}
  if(key==='recover'&&s.station==='sonar'){const i=SEA_TARGETS.findIndex((_,i)=>seaRecoverable(s,i));if(i<0){s.message='需要先用声呐定位，再接近到 32 米内并减速。';return false}s.samples[i]=true;s.message='已回收'+SEA_TARGETS[i].name+(s.samples.every(Boolean)?'，请驶往右端上层返航区。':'，继续寻找下一项。');s.moves++;return true}
  if(key==='repair'&&s.station==='engineering'&&s.battery>=5&&(s.hull<100||s.leak>0)){s.battery-=5;s.hull=Math.min(100,s.hull+18);s.leak=Math.max(0,s.leak-.5);s.message='密封检修完成，消耗 5 格电能。';s.moves++;return true}
 }
 return false;
}
function readFile(s,id){s.selected=id;const clue=DESKTOP_FILES[id].evidence;if(clue&&!s.evidence.includes(clue)){s.evidence.push(clue);s.message='已记录证据：'+DESKTOP_FILES[id].title}}
function storySnapshot(s){return {id:s.id,version:1,room:s.room,inventory:[...s.inventory],flags:{...s.flags},transcript:s.transcript.map(v=>({...v})),draft:s.draft,moves:s.moves,won:s.won,message:s.message}}
const has=(s,item)=>s.inventory.includes(item),remove=(s,item)=>s.inventory=s.inventory.filter(v=>v!==item);
function parseStory(s,input){
 const t=input.replace(/[，。！!？?\s]/g,'');
 if(/^(帮助|help)$/i.test(t))return '可输入：查看、打开抽屉、拿铜钥匙、去物资间、用铜钥匙打开木箱。支持 查看 / 打开 / 拿 / 去 / 用 / 点亮。输入背包查看道具；这是有限指令解谜。';
 if(/^(背包|物品|inventory)$/i.test(t))return s.inventory.length?'你携带：'+s.inventory.join('、')+'。':'背包是空的。';
 if(/^(查看|观察|看|look)$/i.test(t))return ROOMS[s.room].text+(s.won?' 灯塔已经亮起，归船正在靠岸。':'');
 const go=t.match(/^(前往|去|走到)(.*)$/);if(go){const names={'码头':0,'雨港':0,'值班室':0,'物资间':1,'仓库':1,'阶梯':2,'灯塔阶梯':2,'灯塔':2,'灯室':3,'楼上':3};const n=names[go[2]];if(n===undefined)return '没有找到这个地点。可去值班室、物资间、阶梯或灯室。';if(n===3&&s.room!==2&&s.room!==3)return '灯室在阶梯上方，先去阶梯。';if(n===3&&!s.flags.gate)return '铁门还锁着。';if(n===3&&!s.flags.lit)return '阶梯太暗，需要携带并点亮提灯。';s.room=n;return ROOMS[n].text}
 if(/^(打开|开)(抽屉|木抽屉)$/.test(t)){if(s.room!==0)return '抽屉在值班室。';s.flags.drawer=true;return '拉开抽屉，一把铜钥匙躺在纸张下。'}
 if(/^(拿起|拿|取|拾取)/.test(t)){const item=t.replace(/^(拿起|拿|取|拾取)/,'');if(has(s,item))return '你已经携带'+item+'。';const loc={'铜钥匙':s.room===0&&s.flags.drawer,'提灯':s.room===0,'镜片':s.room===1&&s.flags.trunk,'灯油':s.room===1};if(!loc[item])return '这里没有可拿取的'+item+'。试着查看环境，或先打开容器。';s.inventory.push(item);return '已拿起'+item+'。'}
 if(/^(用|使用)铜钥匙(打开|开|于|对)?(木箱|箱子)$/.test(t)){if(s.room!==1)return '木箱在物资间。';if(!has(s,'铜钥匙'))return '需要先拿到铜钥匙。';s.flags.trunk=true;return '铜锁打开，木箱里是一枚完好的镜片。'}
 if(/^(打开|开)(木箱|箱子)$/.test(t))return s.flags.trunk?'木箱已经打开，可以拿镜片。':'木箱上锁了，可以用铜钥匙打开。';
 if(/^(用|使用)铜钥匙(打开|开|于|对)?(铁门|门)$/.test(t)){if(s.room!==2)return '铁门在阶梯入口。';if(!has(s,'铜钥匙'))return '需要铜钥匙。';s.flags.gate=true;return '铁门打开了。石阶上方仍然很暗。'}
 if(/^(打开|开)(铁门|门)$/.test(t))return s.flags.gate?'铁门已经打开。':'铁门需要铜钥匙。';
 if(/^(点亮|点燃)提灯$/.test(t)||/^(用|使用)灯油(于|对|点亮|点燃)?提灯$/.test(t)){if(!has(s,'提灯')||!has(s,'灯油'))return '需要同时携带提灯和灯油。';s.flags.lit=true;return '提灯亮了。油瓶中还留着灯室需要的燃料。'}
 if(/^(用|使用|安装)镜片(于|对|装到)?(灯座|灯塔|灯室|信标)$/.test(t)){if(s.room!==3)return '镜片应装在灯室。';if(!has(s,'镜片'))return '还没有镜片。';remove(s,'镜片');s.flags.lens=true;return '镜片装入黄铜灯座，折射出清晰的海平线。'}
 if(/^(用|使用|倒入)灯油(于|对|加入)?(灯座|灯塔|灯室|信标)$/.test(t)){if(s.room!==3)return '灯座在灯室。';if(!has(s,'灯油'))return '还没有灯油。';remove(s,'灯油');s.flags.fuel=true;return '燃料加入灯座，可以点亮灯塔。'}
 if(/^(点亮|点燃|开启)(灯塔|灯座|信标)$/.test(t)){if(s.room!==3)return '请先来到灯室。';if(!s.flags.lens||!s.flags.fuel)return '灯座仍缺镜片或燃料。';s.won=true;return '灯塔亮起。金色光束扫过海面，归船的汽笛终于在雨中响起。你用一行行指令，将这条归途接了回来。'}
 if(/^(查看|观察|看)/.test(t)){const obj=t.replace(/^(查看|观察|看)/,'');return '这里的线索：'+ROOMS[s.room].text+' 可尝试与'+obj+'有关的拿取、打开或使用指令。'}
 return '没有理解这条指令。可输入「帮助」，或用「去物资间」「用铜钥匙打开木箱」这样的动词加对象。';
}
export function stepHorizons(s,dt){
 if(s.id!=='submersible'||s.won||s.failed)return;dt=finite(dt,0,0,.08);s.time+=dt;
 s.vx=clamp(s.vx+(s.throttle*5-s.vx*.32)*dt,-30,30);s.vy=clamp(s.vy+((s.targetDepth-s.depth)*.22-s.vy*.9+s.leak*3)*dt,-30,30);
 s.x=clamp(s.x+s.vx*dt,20,1100);s.depth=clamp(s.depth+s.vy*dt,20,250);
 s.battery=Math.max(0,s.battery-(.12+Math.abs(s.throttle)*.04+Math.abs(s.vy)*.008)*dt);
 if(s.depth>215){s.hull=Math.max(0,s.hull-(s.depth-215)*.08*dt);s.leak=Math.min(2,s.leak+.04*dt)}s.cooldown=Math.max(0,s.cooldown-dt);
 if(s.sonar){const old=s.sonar.radius;s.sonar.radius+=160*dt;SEA_TARGETS.forEach((t,i)=>{const d=Math.hypot(s.sonar.x-t.x,s.sonar.depth-t.depth);if(d<=s.sonar.radius&&d>=old&&d<=300)s.seen[i]=true});if(s.sonar.radius>300)s.sonar=null}
 s.failed=s.battery<=0||s.hull<=0;if(s.failed){s.throttle=0;s.message=s.hull<=0?'船体失去密封，请重新安排深度与检修。':'电能耗尽，请减少无效声呐与返航距离。'}
 if(s.samples.every(Boolean)&&s.x>1070&&s.depth<85){s.won=true;s.throttle=0;s.message='三项样本安全抵港。推进、浮力、声呐与检修共同完成了这次航行。'}
}
