/* Synchronized teaching: calculated exterior models and explicitly labelled mechanism diagrams. */
window.BlackHoleCourse=(()=>{
'use strict';
const $=id=>document.getElementById(id);
const stages=[
{short:'先看结果',title:'00 · 先认清画面中的三件事',why:'黑洞由事件视界定义。吸积盘在视界外；光在弯曲时空中传播，改变我们看到的影像。先认识结果，再回到形成过程。',chain:'黑洞 + 外部热气体 + 弯曲光路 → 观察图像',science:'当前：非旋转、球对称黑洞的外部光线积分。\n默认显示可见光频段，曝光经过映射；不是未经处理的望远镜照片。',cues:[['中心为什么暗？','中心方向的一部分光被黑洞捕获，无法进入眼睛。暗影的表观尺寸不等于事件视界半径。'],['亮的是什么？','发光的是黑洞外面的热气体。黑洞本身没有一个燃烧的表面，也不一定带着亮盘。'],['上下的弧是什么？','背面盘面的光被弯曲时空改变方向，进入眼睛。盘仍近似平面，弯的是我们看到的影像。']]},
{short:'恒星平衡',title:'01 · 恒星靠什么抵抗引力？',why:'恒星内的引力始终向内。压力梯度提供向外支撑；核聚变释放的能量维持高温，使结构长期近似平衡。箭头是机制示意。',chain:'聚变供能 → 高温与压力 → 抵抗引力',science:'压力梯度 ≈ 向内的引力。\n此图解释机制，不求解恒星结构或演化。',cues:[['先从一颗大质量恒星开始','蓝箭头表示向内的引力。引力一直存在，恒星却没有立刻塌缩。'],['橙箭头为什么向外？','恒星内部很热，压力梯度抵抗引力。核聚变提供维持高温所需的能量。'],['稳定靠两者平衡','这是一条可能形成黑洞的演化路线。像太阳这样的恒星通常不会以自身塌缩形成黑洞。']]},
{short:'支撑失效',title:'02 · 晚期核心失去足够支撑',why:'大质量恒星晚期形成铁族核心。继续聚变不再释放净能量；电子俘获等过程削弱支撑，光致分解消耗能量，核心开始快速收缩。',chain:'供能与支撑不足 → 引力占上风 → 核心收缩',science:'铁族核心无法靠继续聚变净供能。\n电子俘获、光致分解等影响塌缩。\n外层并非同时停止燃烧。',tuner:{key:'support',label:'核心支撑（机制示意）',min:0,max:1,step:.01},play:true,cues:[['看橙色支撑箭头变短','核心进入演化晚期，压力已经不能充分抵抗引力。并不是突然出现了新的吸力。'],['重力开始占上风','物质向中心收缩、密度上升。外层可能被爆炸抛出，也可能有物质随后回落。'],['收缩之后一定成黑洞吗？','不一定。较轻的残留核心可能成为中子星；足够重的核心无法继续被支撑，才会进一步成洞。']]},
{short:'收缩与时钟',title:'03 · 放大最后一段：半径、时钟与信号',why:'这里计算零压力边界在固定 Schwarzschild 外部的径向自由落体，从静止的 4Rₛ 收缩到 0.65Rₛ。用它解释最终压缩与信号变化，不模拟整个恒星或动态视界形成。',chain:'继续压缩 → 进入 Rₛ 内 → 该事件的光无法到达远处',science:'Rₛ=2GM/c²。\nr=½r₀(1+cosη)，τ=½r₀^(3/2)(η+sinη)。\n固定外部自由落体边界模型；未解动态内部时空。',tuner:{key:'progress',label:'最后一段自由落体进程',min:0,max:1,step:.001},play:true,cues:[['比较同一事件的两种时钟','左边是下落边界自身经历的时间；右边是这次发光信号到达很远处的相对时刻。'],['接近虚线时，信号变了','在远处收到的光越来越红、越来越暗，到达延迟增加。不是永远看见一个明亮、冻结的球。'],['自身可以有限时间穿过','边界自身在有限时间跨过参考半径。跨入以后发出的光不能抵达外部；本模型不求解动态视界的诞生。']]},
{short:'光为何出不来',title:'04 · 事件视界：未来光路无法通向外部',why:'黑洞是存在事件视界的时空区域。光局部仍以光速传播，但视界内部指向外的未来光路也无法到达遥远外部。这里用可跨视界的坐标实际计算径向光路。',chain:'因果边界 → 内部信号不能返回外部',science:'入射 Eddington–Finkelstein 坐标：\ndr/dv=½(1−1/r)，Rₛ=c=1。\n这是坐标图，不是光的局部速度图。',cues:[['看向外发射的三类光','横轴是半径，纵轴是可跨越视界的时间坐标。曲线是按径向光路方程计算的。'],['视界外的光能走向更大半径','恰在视界上的出射光沿边界延续；内部的出射光仍走向更小半径。'],['这才是黑洞的关键','它不是一块黑色固体，而是有这种因果边界的时空区域。局部光速没有减慢。']]},
{short:'气体成盘',title:'05 · 周围气体为什么绕成盘？',why:'带角动量的气体会绕行。碰撞、耗散与冷却可让气体集中到共同平面；磁应力和湍流等把角动量向外输运，部分物质才能继续向内。这一段是机制动画。',chain:'角动量 → 绕行；耗散与冷却 → 成盘',science:'此图展示角动量和耗散的机制。\n不是流体、磁场或盘形成的数值模拟。',tuner:{key:'progress',label:'气体聚集（机制动画）',min:0,max:1,step:.01},play:true,cues:[['形成黑洞后，加入周围气体','气体可能来自伴星或环境。没有周围气体时，黑洞也成立，只是没有这样的亮盘。'],['为什么不是直接落下？','气体通常带着角动量，因此绕中心运动。耗散与冷却使它逐渐集中到共同的旋转平面。'],['成盘以后，仍需要向内吸积','气体必须向外输运角动量，一部分物质才会向内。按住对照可看理想的零角动量下落。']]},
{short:'能量变成光',title:'06 · 吸积释放能量，热气体辐射',why:'轨道能量经湍流、磁应力和耗散转成热。曲线采用零扭矩薄盘温度近似，由质量、供给率和半径计算。它没有模拟气体的动态加热过程。',chain:'吸积释放能量 → 耗散成热 → 视界外辐射',science:'T⁴=3GMṀ/(8πσR³)·(1−√(Rin/R))。\nRin=3Rₛ；Newtonian 零扭矩薄盘近似。\n非完整相对论流体或辐射输运。',tuner:{key:'rateLog',label:'物质供给率 log₁₀（M☉/年）',min:-11,max:-7,step:.25},play:true,cues:[['亮光的能源是什么？','物质向内吸积释放轨道能量，耗散把它变成热。亮光来自视界外，未从内部逃出来。'],['温度不是随手选的颜色','曲线用质量和供给率计算。增加供给率，盘温提高；理想零扭矩内边界处，温度回落。'],['为什么未必是截图里的橙色？','本例温度达到百万度量级，辐射峰在 X 射线。可见光画面经曝光；橙色选项是明确标注的假色温度图。']]},
{short:'弯光与亮弧',title:'07 · 从真实光路，连接到观察图像',why:'右上小图计算了进入同一观察者的两条光线，它们来自背面盘的不同位置。光沿 Schwarzschild 外部的零测地线传播，成像里出现上下亮弧。',chain:'平面热盘 → 弯曲光路 → 背面影像与亮弧',science:"单位 Rₛ=c=1：p''=−(3/2)L²p/r⁵。\n小图为固定 10° 的计算截面；不同曲线来自不同发光点。\n实时积分有步长和次数限制。",tuner:{key:'lensStrength',label:'计算光路 / 非物理直线对照',min:0,max:1,step:1},cues:[['现在画面切换成眼睛所见','主画面是渲染图像，右上小图是空间里的光路。两者不是同一个视角。'],['光从背面盘绕到眼睛','小图的光点沿计算轨迹前进。主画面上下的亮弧，来自背面盘面被透镜改变的影像位置。'],['盘没有被折成拱门','按住直线对照，亮弧消失。这个开关只做因果比较，自然界中不能关掉引力。']]},
{short:'明暗与频率',title:'08 · 高速旋转改变收到的光',why:'朝向观察者运动的气体，光通常更亮、更偏蓝；远离的一侧更暗、更偏红。计算将局部运动多普勒因子和引力红移相乘，再用观测温度计算黑体可见光谱。',chain:'运动方向 + 引力红移 → 频率与强度变化',science:'D=√(1−β²)/(1−βcosθ)。\ng=√(fem/fobs)·D，Tobs=gT。\n使用 Iν/ν³ 不变量对应的黑体谱；假色映射总辐射 g⁴。',tuner:{key:'dopplerStrength',label:'运动频移 / 关闭运动频移对照',min:0,max:1,step:1},cues:[['观察盘的两侧明暗差','气体高速绕行，两侧相对于视线的运动方向不同。因此收到的光不同。'],['朝向你的一侧通常更亮','运动改变频率和强度；同时，光从深处出来还受到引力红移。这里计算两者的组合。'],['按住关闭运动频移','透镜形状保留，运动造成的明暗差减弱。纹理和温度本身仍会造成局部变化。']]},
{short:'完整结果',title:'09 · 从成因到最终效果',why:'形成黑洞、外部气体成盘发热、弯曲光路和相对论运动，共同产生这幅图。后半段是在拆解同时存在的原因，不是宇宙中先后开启几个特效。',chain:'支撑失效 → 成洞；外部气体 → 发光；传播与运动 → 影像',science:'计算：外部非旋转光路、指定自由落体、径向因果光路、薄盘温度与频移。\n示意：恒星演化、气体成盘。\n未求解 Kerr、自洽塌缩、GRMHD 或全部高阶光子环。',cues:[['把原因连回完整画面','黑洞负责光的因果边界和强引力几何；周围气体负责辐射；传播和运动改变所见。'],['这是一种可能的最终景象','亮盘并非所有黑洞都有。观察角度、气体供给、温度、黑洞旋转都会改变真实图像。'],['现在可以自己验证','进入自由实验：换视角、移除气体、改变质量和供给率，或比较可见光与假色，检查每一种原因。']]}
];
function create(state,hooks,reducedMotion){
const manifest=window.BlackHoleNarration;
if(manifest)for(const ch of manifest.chapters){if(stages[ch.stage])stages[ch.stage].cues=ch.segments.map(s=>[s.title,s.subtitle]);}
let stage=0,highest=0,free=false,comparing=false,active=false,scope='full',playing=false,elapsed=0,cue=0,cueTime=0,voiceToken=0,completed=false;
let audioStatus='idle',audioError='',loadedKey='',preloader=null,lastSentence='';
const audio=$('narration-audio');
const totalDuration=manifest?.totalDuration||0;
const rail=$('build-stages');
state.progress=0;state.support=1;state.heat=1;state.lensStrength=state.dopplerStrength=1;state.paused=true;
rail.innerHTML=stages.map((s,i)=>'<button type="button" class="build-stage" data-stage="'+i+'"><span>'+String(i).padStart(2,'0')+'</span><strong>'+s.short+'</strong></button>').join('');
const enabled=()=>$('voice-enabled').checked;
const clip=(s=stage,c=cue)=>manifest?.chapters.find(x=>x.stage===s)?.segments.find(x=>x.cue===c);
const formatTime=n=>{n=Math.max(0,Math.round(n||0));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');};
const programOffset=()=>manifest?.chapters.filter(ch=>ch.stage<stage).reduce((n,ch)=>n+ch.segments.reduce((n,s)=>n+s.duration,0),0)||0;
const cueOffset=()=>manifest?.chapters.find(ch=>ch.stage===stage)?.segments.filter(s=>s.cue<cue).reduce((n,s)=>n+s.duration,0)||0;
function duration(){return clip()?.duration||Math.max(8,Math.ceil(stages[stage].cues[cue][1].length/4.3)+1);}
function cueDuration(c,i){return clip(stage,i)?.duration||Math.max(8,Math.ceil((c[0].length+c[1].length)/4.3)+1);}
function cancelVoice(reset=true){
voiceToken++;audio.pause();audio.onended=audio.onloadedmetadata=audio.onerror=audio.onplaying=audio.onwaiting=audio.ontimeupdate=audio.onseeked=null;
if(reset){audio.removeAttribute('src');audio.load();loadedKey='';}
audioStatus='idle';audioError='';preloader?.pause();preloader=null;
}
function updateStatus(){
$('audio-status').textContent=audioError?'旁白加载失败 · 可重试，或关闭旁白后点继续':!enabled()?'旁白已关闭 · 保留字幕与演示':audioStatus==='loading'?'正在加载本段旁白…':audioStatus==='playing'?'MiniMax 旁白 · 播完本段后推进':state.paused&&active?'旁白已暂停 · 从原位置继续':completed?'完整讲解已结束':active?'准备下一段旁白…':'已预录 10 章 / 30 段完整旁白';
$('voice-status').textContent=manifest?.ready?'MiniMax 高品质旁白 · 全程 '+formatTime(totalDuration):'旁白素材尚未全部就绪';
$('audio-retry').hidden=!audioError||!enabled();
$('build-auto').textContent=active&&scope==='full'?(state.paused?'继续完整讲解':'暂停完整讲解'):(completed?'重新播放完整讲解':'播放完整讲解')+' · '+formatTime(totalDuration);
$('build-auto').setAttribute('aria-pressed',String(active&&scope==='full'));
$('chapter-narration').textContent=active&&scope==='chapter'?(state.paused?'继续本章':'暂停本章'):'听当前章节';
$('tour-status').textContent=free?'自由实验':completed?'完整讲解已完成 · 10 章 / 30 段':active?(state.paused?'讲解已暂停':'讲解中')+' · '+(stage+1)+'/10 · '+(cue+1)+'/3':'选择章节，或播放完整讲解';
$('audio-clock').textContent='本段 '+formatTime(cueTime)+' / '+formatTime(duration())+' · 全程 '+formatTime(programOffset()+cueOffset()+cueTime)+' / '+formatTime(totalDuration);
$('audio-seek').max=duration();$('audio-seek').value=Math.min(duration(),cueTime);$('audio-seek').disabled=free;
}
function updateSpoken(){
const s=clip();if(!s)return;
const t=enabled()?audio.currentTime:cueTime;
const lines=s.subtitles||[];
const line=lines.find(x=>t>=x.start&&t<x.end)||[...lines].reverse().find(x=>t>=x.start);
const value=line?.text||(!lines.length?s.speech:lines[0].text);
if(value!==lastSentence){lastSentence=value;$('spoken-text').textContent=value;$('spoken-text').scrollTop=0;}
}
function updateProcess(){
if(!playing)return;
const d=stages[stage].cues.slice(0,2).reduce((n,c,i)=>n+cueDuration(c,i),0);
const p=Math.min(1,elapsed/Math.max(16,d));
if(stage===2)state.support=1-.9*p;
if(stage===3||stage===5)state.progress=p;
if(stage===6){state.heat=p;state.rateLog=-11+2*p;}
if(p>=1)playing=false;refreshTuner();
}
function syncAudioTime(){
if(active&&enabled()){cueTime=audio.currentTime||0;elapsed=cueOffset()+cueTime;updateProcess();}
updateSpoken();updateStatus();
}
function audioFailure(message,token){
if(token!==voiceToken)return;
audioStatus='error';audioError=message;audio.pause();
if(active&&enabled())state.paused=true;
updateStatus();hooks.sync();hooks.render();
}
function playAudio(){
if(!active||state.paused||!enabled())return;
const s=clip(),key=stage+'/'+cue;
if(!s?.available){audioFailure('本段音频未就绪',voiceToken);return;}
if(loadedKey!==key){configureAudio(cueTime);return;}
const token=voiceToken;
audioStatus='loading';updateStatus();
audio.play().catch(error=>{if(token!==voiceToken||state.paused||!active||!enabled()||error.name==='AbortError')return;audioFailure(error.name==='NotAllowedError'?'浏览器需要点击播放才能允许声音':'音频播放失败，请重试',token);});
}
function configureAudio(position=0){
cancelVoice();const s=clip(),key=stage+'/'+cue;
if(!s?.available){audioStatus='error';audioError='本段音频尚未生成';updateStatus();return;}
loadedKey=key;const token=voiceToken;const expected=new URL(s.src,document.baseURI).href;
audioStatus='loading';audioError='';audio.src=s.src;audio.playbackRate=Number($('audio-rate').value);
audio.onloadedmetadata=()=>{
if(token!==voiceToken)return;
if(position>0)audio.currentTime=Math.min(position,Math.max(0,audio.duration-.01));
audioStatus=active&&!state.paused&&enabled()?'loading':'ready';
updateSpoken();updateStatus();
};
audio.onplaying=()=>{if(token!==voiceToken)return;if(state.paused||!active||!enabled()){audio.pause();return;}audioStatus='playing';audioError='';updateStatus();};
audio.onwaiting=()=>{if(token===voiceToken&&active&&!state.paused&&enabled()){audioStatus='loading';updateStatus();}};
audio.onerror=()=>{if(token===voiceToken)audioFailure('音频文件不可用，请重试',token);};
audio.ontimeupdate=audio.onseeked=()=>{if(token!==voiceToken)return;syncAudioTime();hooks.render();};
audio.onended=()=>{
if(token!==voiceToken||loadedKey!==key||audio.src!==expected||!audio.ended||!active||state.paused||!enabled())return;
audioStatus='ended';cueTime=s.duration;elapsed=cueOffset()+cueTime;updateProcess();
advance();
};
audio.load();
if(active&&!state.paused&&enabled())playAudio();
const next=cue<2?clip(stage,cue+1):stage<9?clip(stage+1,0):null;
if(next?.available){preloader=new Audio();preloader.preload='auto';preloader.src=next.src;preloader.load();}
updateSpoken();updateStatus();
}
function stopAuto(reset=true){active=false;cancelVoice(reset);updateStatus();}
function setStage(index,auto=false,autoplay=auto){
if(!auto)stopAuto();
stage=Math.max(0,Math.min(9,index));highest=Math.max(highest,stage);free=false;comparing=false;completed=false;elapsed=cueTime=cue=0;
state.progress=0;state.support=1;state.heat=stage===6?0:1;state.lensStrength=state.dopplerStrength=1;
state.disk=state.lensing=state.doppler=true;state.orbit=state.grid=false;state.yaw=.35;state.inclination=10;state.distance=23;
if(stage===7)state.doppler=false;if(stage===6)state.rateLog=-11;
state.paused=!autoplay;playing=auto&&Boolean(stages[stage].play);
refresh();document.querySelector('.controls').scrollTop=0;configureAudio();hooks.sync();hooks.resize();hooks.render();
}
function selectStage(index){const keep=active,run=active&&!state.paused;setStage(index,keep,run);}
function startNarration(mode='full',keepCue=false){
scope=mode;active=true;completed=false;
if(mode==='full'){setStage(0,true);$('viewer').scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:'start'});}
else if(!keepCue)setStage(stage,true);
else{state.paused=false;playing=Boolean(stages[stage].play);configureAudio(cueTime);hooks.sync();hooks.render();}
updateStatus();
}
function advance(){
if(!active)return;
if(cue<2){cue++;cueTime=0;refreshCue();configureAudio();hooks.render();}
else if(scope==='full'&&stage<9)setStage(stage+1,true);
else{
const finishedFull=scope==='full';active=false;playing=false;state.paused=true;audio.pause();audioStatus='ended';completed=finishedFull;
refresh();hooks.sync();hooks.render();
}
}
function restart(){stopAuto();highest=0;completed=false;hooks.reset();setStage(0);}
function enterFree(){stopAuto();free=true;stage=highest=9;comparing=playing=false;completed=false;state.paused=true;state.disk=state.lensing=state.doppler=true;refresh();hooks.sync();hooks.resize();}
function model(){return{stage,elapsed,progress:state.progress,support:state.support,heat:state.heat,mass:state.mass,rate:10**state.rateLog,comparing};}
function tick(delta){
if(state.paused)return;
if(active&&enabled()){
// Media time is authoritative. Wall-clock overruns never truncate an unfinished segment.
if(audioStatus==='playing'||audioStatus==='ended'){cueTime=audio.currentTime;elapsed=cueOffset()+cueTime;updateProcess();}
}else{
elapsed+=delta;cueTime+=delta;updateProcess();
if(active&&cueTime>=duration())advance();
}
updateSpoken();updateStatus();
}
function layers(){return{sky:1,horizon:1,texture:1,disk:comparing&&stage===9?0:Number(state.disk),lensing:comparing&&stage===7?0:(!free&&stage===7?state.lensStrength:Number(state.lensing)),doppler:comparing&&stage===8?0:(!free&&stage===8?state.dopplerStrength:Number(state.doppler))};}
function refreshTuner(){
const t=stages[stage].tuner;if(!t)return;$('build-input').value=state[t.key];
$('build-input-value').textContent=t.key==='rateLog'?(10**state.rateLog).toExponential(1)+' M☉/年':t.key.includes('Strength')?(state[t.key]?'计算效应':'对照'):Math.round(state[t.key]*100)+'%';
$('physics-play').textContent=active&&!state.paused?'暂停本章讲解':'重新讲解并演示本章';$('physics-play').setAttribute('aria-pressed',String(active&&!state.paused));
}
function refreshCue(){
const c=stages[stage].cues[cue];lastSentence='';
if(!free)$('build-added').textContent=c[1];
$('subtitle-title').textContent=free?'自由实验 · 一次改变一个条件':c[0];$('subtitle-text').textContent=free?'质量改变真实长度和时间尺度；供给率改变盘温。灰色开关用于因果对照。默认可见光谱，橙色是可切换的假色温度图。':c[1];
$('cue-count').textContent=free?'EXPERIMENT':String(stage+1).padStart(2,'0')+' / 10 · '+String(cue+1)+' / 3';
$('cue-prev').disabled=free||cue===0;$('cue-next').disabled=free||cue===2;
$('scene-title').textContent=c[0];$('scene-caption').textContent=c[1];
$('speech-transcript').textContent=clip()?.speech||c[1];$('spoken-text').hidden=free;updateSpoken();updateStatus();
}
function refresh(){
const s=stages[stage],schematic=stage>=1&&stage<=6;
document.querySelector('.controls').dataset.mode=free?'free':'construction';
$('physics-canvas').hidden=!schematic;$('black-hole').hidden=schematic;
$('ray-inset-wrap').hidden=stage!==7||free;$('viewer').dataset.scene=schematic?'physics':'image';
$('build-count').textContent=String(stage).padStart(2,'0')+' / 09';$('build-title').textContent=s.title;$('build-added').textContent=s.cues[0][1];$('build-why').textContent=s.why;$('build-look').textContent=s.cues[2][1];$('build-code').textContent=s.science;
$('build-next').textContent=stage===9?'进入自由实验 →':'继续：'+stages[stage+1].short+' →';$('build-prev').disabled=stage===0;$('build-compare').disabled=![2,3,5,6,7,8,9].includes(stage);
const labels={2:'按住恢复支撑',3:'按住看收缩前',5:'按住看零角动量',6:'按住移除供给',7:'按住看直线光路',8:'按住关闭运动频移',9:'按住移除气体'};
$('build-compare').textContent=comparing?'松开恢复':labels[stage]||'暂无对照';$('build-compare').setAttribute('aria-pressed',String(comparing));
$('build-inventory').textContent=s.chain;$('free-controls').hidden=!free;$('build-next').hidden=free;$('physics-play').hidden=!s.play||free;$('build-tuning').hidden=!s.tuner||free;
$('chapter-narration').disabled=free;
if(s.tuner){const t=s.tuner,input=$('build-input');input.min=t.min;input.max=t.max;input.step=t.step;$('build-input-label').textContent=t.label;refreshTuner();}
$('viewer-help').textContent=schematic?'计算图与机制图已分别标注':'拖动旋转 · 滚轮缩放';$('scene-kicker').textContent='OBSERVER IMAGE · 观察成像';
$('physics-mode').textContent=schematic?([3,4,6].includes(stage)?'选定模型 · 计算结果':'形成机制 · 示意动画'):'Schwarzschild 外部 · 实时光路';
$('beaming-key').hidden=stage!==8||free;rail.querySelectorAll('button').forEach((b,i)=>{b.classList.toggle('current',i===stage);b.classList.toggle('complete',i<highest);i===stage?b.setAttribute('aria-current','step'):b.removeAttribute('aria-current');});
$('build-progress').style.width=stage/9*100+'%';$('lesson-instruction').hidden=true;
$('observation').textContent=free?'改变供给率或质量，温度及物理尺度会重新计算；画面距离以 Rₛ 为单位。':s.chain;
refreshCue();
}
function compare(value){comparing=value;refresh();hooks.render();}
rail.addEventListener('click',e=>{const b=e.target.closest('[data-stage]');if(b)selectStage(Number(b.dataset.stage));});
$('build-next').addEventListener('click',()=>stage===9?enterFree():selectStage(stage+1));$('build-prev').addEventListener('click',()=>selectStage(stage-1));$('build-restart').addEventListener('click',restart);
$('build-auto').addEventListener('click',()=>{if(active&&scope==='full'){state.paused=!state.paused;onPause();hooks.sync();}else startNarration('full');});
$('chapter-narration').addEventListener('click',()=>{if(active&&scope==='chapter'){state.paused=!state.paused;onPause();hooks.sync();}else startNarration('chapter');});
$('voice-enabled').addEventListener('change',()=>{
if(!enabled()){cueTime=audio.currentTime||cueTime;elapsed=cueOffset()+cueTime;audio.pause();audioStatus='muted';audioError='';}
else if(active&&!state.paused){if(loadedKey===stage+'/'+cue){try{audio.currentTime=Math.min(cueTime,duration()-.01);}catch{}playAudio();}else configureAudio(cueTime);}
updateStatus();hooks.render();
});
$('audio-rate').addEventListener('change',()=>{audio.playbackRate=Number($('audio-rate').value);updateStatus();});
$('audio-seek').addEventListener('input',e=>{
cueTime=Math.min(duration()-.01,Math.max(0,Number(e.target.value)));elapsed=cueOffset()+cueTime;
if(loadedKey===stage+'/'+cue&&audio.readyState>=1)audio.currentTime=cueTime;
playing=Boolean(stages[stage].play);updateProcess();updateSpoken();updateStatus();hooks.render();
});
$('audio-retry').addEventListener('click',()=>{if(!active){active=true;scope='chapter';}state.paused=false;audioError='';configureAudio(cueTime);hooks.sync();hooks.render();});
$('build-input').addEventListener('input',e=>{stopAuto();playing=false;state.paused=true;const t=stages[stage].tuner;if(t)state[t.key]=Number(e.target.value);refresh();hooks.sync();hooks.render();});
$('physics-play').addEventListener('click',()=>{if(active&&!state.paused){state.paused=true;onPause();hooks.sync();}else startNarration('chapter');});
for(const [id,direction]of[['cue-prev',-1],['cue-next',1]])$(id).addEventListener('click',()=>{
cue=Math.max(0,Math.min(2,cue+direction));cueTime=0;elapsed=cueOffset();playing=active&&Boolean(stages[stage].play);updateProcess();refreshCue();configureAudio();hooks.render();
});
const b=$('build-compare');b.addEventListener('pointerdown',e=>{if(b.disabled)return;e.preventDefault();b.setPointerCapture(e.pointerId);compare(true);});for(const type of['pointerup','pointercancel','lostpointercapture','blur'])b.addEventListener(type,()=>compare(false));
b.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();compare(true);}});b.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();compare(false);}});
function onPause(){
if(state.paused){audio.pause();if(active)audioStatus='paused';}
else if(active&&enabled())playAudio();
refresh();hooks.render();
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){state.paused=true;audio.pause();if(active)audioStatus='paused';comparing=false;refresh();}else hooks.sync();});window.addEventListener('pagehide',()=>audio.pause());
refresh();configureAudio();
return{layers,refresh,tick,model,onPause,isSchematic:()=>stage>=1&&stage<=6,isFree:()=>free,isAnimating:()=>!state.paused&&(playing||active),enterFree,restart,getState:()=>({stage,highest,mode:free?'free':'science',comparing,autoExplaining:active,narrationScope:scope,playing,elapsed,cue,cueTime,progress:state.progress,completed,totalDuration,layers:layers(),audio:{status:audioStatus,src:audio.getAttribute('src'),currentTime:audio.currentTime,duration:audio.duration||duration(),enabled:enabled(),error:audioError,token:voiceToken}})};
}
return Object.freeze({create});
})();
