// The lake is a musical instrument. Growth follows listening and responses;
// instantaneous movement follows measured audio, never an inferred emotion.
const $=id=>document.getElementById(id),TAU=Math.PI*2,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const hash=text=>[...String(text)].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,7);
const chapters=[
  {at:0,title:'新城市的\n第一个晚上。',description:'灯亮着，雨还在下。\n房间里，只有自己的声音。',label:'01 / 留下 · 一段独白',caption:'独白像种子。慢慢说，也有人听。'},
  {at:14,title:'有一段回声，\n正向你靠近。',description:'另一种声音，越过安静的湖面。\n它说：我听见了。',label:'02 / 抵达 · 另一种声音',caption:'回应抵达，另一条枝干开始生长。'},
  {at:28,title:'原来，我们\n在同一场雨里。',description:'两段声音，各自不同。\n却长出了属于彼此的地方。',label:'03 / 共生 · 两种声音的花园',caption:'相遇留下了。两种音色一起呼吸。'}
];
const lines=[
  [1,'“搬来这座城市的第一晚，\n窗外一直在下雨。”'],[6,'“明明灯亮着，\n房间还是很安静。”'],[10,'“如果有人听见，\n能不能留下一点声音？”'],
  [15,'“我听见了。”'],[19,'“我刚搬来的时候，\n也有过这样的夜晚。”'],[23,'“不着急。今晚，\n让这场雨陪着我们。”'],
  [29,'“原来在同一场雨里，\n真的有人听见。”'],[35,'“今晚，这座城市\n好像没有那么陌生了。”'],[40,'一段声音，终于有了回声。']
];

export function createDriftScene({publicDemo=false,getContext,getMeter,onBeforeStory,onMessage,onWeather}){
  const canvas=$('connection-garden'),g=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w=1,h=1,energy=0,bass=0,treble=0,lastFrame=0,seed=37,growth=.28,targetGrowth=.28,paired=0,targetPaired=0,weather='rain',muted=false;
  let story=null,storyEpoch=0,pendingStory=null,finished=false,chapter=-1,line=-1,master,compressor,storyBus,storyMeter,ambientNodes=[],musicNodes=[],timers=[],particles=[],ripples=[],nextRipple=0,nextParticle=0,lastUiSecond=-1,arrivedAt=-100;
  const meterValues=new Uint8Array(128);
  new ResizeObserver(()=>{const r=canvas.getBoundingClientRect();w=r.width;h=r.height;const d=Math.min(devicePixelRatio,2);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);g.setTransform(d,0,0,d,0,0);}).observe(canvas);

  function output(){const ctx=getContext();if(!master){master=ctx.createGain();master.gain.value=muted?0:.8;compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-10;compressor.ratio.value=3;master.connect(compressor);compressor.connect(ctx.destination);}return master;}
  function dispose(nodes){for(const node of nodes){try{node.stop?.();node.disconnect();}catch{}}nodes.length=0;}
  function stopAmbient(){dispose(ambientNodes);}
  function ambient(){stopAmbient();if(!storyBus||weather==='none')return;const ctx=getContext(),buffer=ctx.createBuffer(2,ctx.sampleRate*5,ctx.sampleRate);let random=421,previous=0;
    for(let c=0;c<2;c++){const samples=buffer.getChannelData(c);for(let i=0;i<samples.length;i++){random=random*16807%2147483647;const white=random/1073741824-1;previous=(previous+.035*white)/1.035;samples[i]=weather==='rain'?white*.28:previous*2;}}
    const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=weather==='rain'?2200:520;gain.gain.value=weather==='rain'?.028:.055;source.connect(filter);filter.connect(gain);gain.connect(storyBus);source.start();ambientNodes.push(source,filter,gain);
  }
  function note(midi,at,length,amount=.08,voice='piano'){
    const ctx=getContext(),gain=ctx.createGain(),frequency=440*2**((midi-69)/12),pan=ctx.createStereoPanner();pan.pan.value=voice==='reply'?.3:-.25;
    gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(amount,at+(voice==='pad'?.6:.018));gain.gain.exponentialRampToValueAtTime(.0001,at+length);gain.connect(pan);pan.connect(storyBus);musicNodes.push(gain,pan);
    for(let i=0;i<(voice==='pad'?2:3);i++){const osc=ctx.createOscillator(),partial=ctx.createGain();osc.type='sine';osc.frequency.value=frequency*[1,2,3.001][i];osc.detune.value=voice==='pad'?(i?5:-5):0;partial.gain.value=i===0?1:i===1?.22:.065;osc.connect(partial);partial.connect(gain);osc.start(at);osc.stop(at+length+.08);musicNodes.push(osc,partial);}
  }
  function composeScore(start){
    // Original 42-second score: sparse solo -> answering counterline -> shared harmony.
    const motif=[64,71,67,66,64,62,59];motif.forEach((n,i)=>note(n,start+1+i*1.75,3.2,.075));
    for(let bar=0;bar<3;bar++){const chord=[[52,59,64],[48,55,60],[50,57,62]][bar];chord.forEach((n,j)=>note(n,start+bar*4.5+j*.06,5,.023,'pad'));}
    [67,74,71,69,67,66,62].forEach((n,i)=>note(n,start+15+i*1.7,3.7,.072,'reply'));
    [55,50,52].forEach((n,i)=>note(n,start+14+i*4.5,5.2,.045,'pad'));
    const answer=[67,71,74,76,74,71,69,67];answer.forEach((n,i)=>{note(n,start+28+i*1.6,4,.08,i%2?'reply':'piano');if(i%2===0)note(n-12,start+28+i*1.6+.1,4.5,.025);});
    for(const [at,chord]of [[28,[43,55,59,62]],[33,[48,55,60,64]],[37,[43,55,59,62,67]]])chord.forEach((n,i)=>note(n,start+at+i*.12,Math.min(5.5,42-at),.022,'pad'));
  }
  function displayChapter(index){if(chapter===index)return;chapter=index;const c=chapters[index];$('scene-title').textContent=c.title;$('scene-description').textContent=c.description;$('chapter-label').textContent=c.label;$('garden-caption').textContent=c.caption;targetGrowth=[.43,.65,1][index];targetPaired=index>0?1:0;if(index===1)arrivedAt=performance.now()/1000;}
  function clearMusic(){timers.forEach(clearTimeout);timers=[];stopAmbient();dispose(musicNodes);if(storyBus){storyBus.disconnect();storyBus=null;}storyMeter=null;}
  function stopStory(complete=false){storyEpoch++;pendingStory=null;if(!story)return;story=null;clearMusic();finished=complete;$('story-play-label').textContent=complete?'再听一次相遇':'听一段相遇';$('story-play').setAttribute('aria-pressed','false');document.body.classList.remove('story-active');$('story-progress').hidden=true;
    if(complete){$('scene-title').textContent='被听见，\n是生长的开始。';$('scene-description').textContent=publicDemo?'这段声景已经结束。\n看看声音如何变成植物。':'现在，留下属于你的声音。\n让下一次相遇，真正发生。';$('chapter-label').textContent=publicDemo?'从声音种植，到音乐创造。':'你的声音，会长出怎样的花园？';$('garden-caption').textContent='这是一段演示。下一株，可以属于你。';$('story-subtitle').textContent=publicDemo?'查看保留的种植与声音生态实验。':'从你的第一段声音开始。';onMessage(publicDemo?'演示结束。可以体验声音种植，或回到研究摘要。':'演示结束。你可以留下自己的声音，或接住真实参与者的漂流。');}
    else{$('story-subtitle').hidden=true;resetCopy();targetGrowth=.28;targetPaired=0;}
  }
  function resetCopy(){if(finished)return;$('scene-title').textContent='今晚，\n让声音有一个去处。';$('scene-description').textContent='那些没说出口的话，\n也许正有人，愿意听见。';$('chapter-label').textContent='一段声音，等待一个回声。';$('garden-caption').textContent='一株尚未被听见的声音';}
  async function startStory(){if(pendingStory!==null)return;if(story){stopStory();return;}if(!onBeforeStory())return;const epoch=++storyEpoch;pendingStory=epoch;finished=false;chapter=-1;line=-1;lastUiSecond=-1;growth=.18;paired=0;targetGrowth=.3;targetPaired=0;$('scene-credit').textContent=publicDemo?'公开声景演示 · 原创音乐与文字，无真人配音':'场景演示 · 原创声景与文字叙事';
    try{const ctx=getContext();await ctx.resume();if(document.hidden||epoch!==storyEpoch)return;output();storyBus=ctx.createGain();storyBus.gain.value=.7;storyMeter=ctx.createAnalyser();storyMeter.fftSize=256;storyBus.connect(storyMeter);storyMeter.connect(master);
      // Diffuse tail is intentionally quiet; the direct notes carry the story.
      const convolution=ctx.createConvolver(),impulse=ctx.createBuffer(2,ctx.sampleRate*2.6,ctx.sampleRate);let rng=541;for(let c=0;c<2;c++){const a=impulse.getChannelData(c);for(let i=0;i<a.length;i++){rng=rng*16807%2147483647;a[i]=(rng/1073741824-1)*Math.exp(-i/(ctx.sampleRate*.65))*.25;}}convolution.buffer=impulse;const wet=ctx.createGain();wet.gain.value=.32;storyBus.connect(convolution);convolution.connect(wet);wet.connect(master);musicNodes.push(convolution,wet);
      story={started:ctx.currentTime};storyBus.gain.setValueAtTime(.7,ctx.currentTime+38);storyBus.gain.linearRampToValueAtTime(.0001,ctx.currentTime+42);composeScore(ctx.currentTime+.04);ambient();displayChapter(0);$('story-subtitle').hidden=false;$('story-progress').hidden=false;$('story-play-label').textContent='结束这段相遇';$('story-play').setAttribute('aria-pressed','true');document.body.classList.add('story-active');onMessage(publicDemo?'42 秒原创声音故事。真实声音社区保留在本机服务中。':'42 秒声音故事。音乐与文字为演示创作；真人漂流是独立入口。');
    }catch{if(epoch===storyEpoch){clearMusic();story=null;onMessage('声音暂时没有打开，请再点一次。');}}finally{if(pendingStory===epoch)pendingStory=null;}
  }
  function selectClip(clip,thread){stopStory();finished=false;seed=hash(clip.id);targetGrowth=clip.heard?.7:.36;targetPaired=thread?1:0;$('scene-credit').textContent='参与者的原音频 · '+(thread?'声音与回应':'这一刻的声音');if(thread&&['none','rain','wind'].includes(thread.ambience)){weather=thread.ambience;document.querySelectorAll('[data-weather]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.weather===weather)));}$('scene-title').textContent=thread?'一段相遇，\n重新被听见。':clip.mine?'这段声音，\n记得当时的你。':'有个人，\n把此刻交给了你。';$('scene-description').textContent=`${clip.name} · ${clip.title}`;$('chapter-label').textContent=thread?'你的声音，和对方的回应。':clip.mine?'这是你留下的声音。':'先听完，再决定是否回应。';$('garden-caption').textContent=thread?'两种声音，各自不同，一起生长。':'每一次落音，都让它更靠近你。';$('story-subtitle').hidden=true;arrivedAt=performance.now()/1000;}
  function heard(thread=false){targetGrowth=thread?1:.76;targetPaired=thread?1:targetPaired;$('garden-caption').textContent=thread?'这株植物，记得你们的声音。':'声音被听见了。等待你的一段回应。';}
  function fingerprint(decoded){const samples=decoded.getChannelData(0);let value=7;for(let i=0;i<96;i++){const start=Math.floor(samples.length*i/96),end=Math.floor(samples.length*(i+1)/96);let total=0;for(let j=start;j<end;j+=8)total+=Math.abs(samples[j]);value=(Math.imul(value,31)+Math.round(total*100))>>>0;}seed=value;}
  function previewDraft(decoded){stopStory();finished=false;fingerprint(decoded);targetGrowth=.58;targetPaired=0;$('scene-credit').textContent='声音草稿 · 尚未提交';$('scene-title').textContent='你的声音，\n有自己的形状。';$('scene-description').textContent='先给自己听。\n愿意的话，再交给一个人。';$('chapter-label').textContent='这段声音还未提交，只留在当前页面。';$('garden-caption').textContent='一株只属于你的声音';$('story-subtitle').hidden=true;}
  function clearDraft(){finished=false;targetGrowth=.28;targetPaired=0;resetCopy();$('scene-credit').textContent='场景演示 · 原创声景与文字叙事';}
  function submitted(isReply,visibility='drift'){stopStory();finished=false;targetGrowth=isReply?1:.48;targetPaired=isReply?1:0;arrivedAt=performance.now()/1000;$('scene-title').textContent=isReply?'你的回应，\n已经抵达。':visibility==='private'?'这一刻，\n先留给自己。':'你的声音，\n向世界出发。';$('scene-description').textContent=isReply?'两段真实的声音，长出了共同的植物。':visibility==='private'?'不必每次都送出去。\n这里也有一个只属于你的角落。':'让它慢慢漂流，遇见愿意认真听的人。';$('chapter-label').textContent=isReply?'这一次，相遇留下来了。':visibility==='private'?'已保存在自己的花园，没有投放漂流。':'可以收回，也可以回来等待回声。';$('garden-caption').textContent=isReply?'声音与回应，开始共生。':'一颗属于你的声音种子';$('story-subtitle').hidden=true;}
  function received(){if(story)return;targetGrowth=1;targetPaired=1;arrivedAt=performance.now()/1000;$('scene-title').textContent='有人，回应了\n你的声音。';$('scene-description').textContent='一段真实的回声，留在了花园里。\n去听听，这次相遇带来了什么。';$('garden-caption').textContent='新的回声，让共同植物继续生长。';}
  function leaf(x,y,size,angle,color,shine){g.save();g.translate(x,y);g.rotate(angle);const grad=g.createLinearGradient(0,0,size,0);grad.addColorStop(0,color+'10');grad.addColorStop(.55,color+'57');grad.addColorStop(1,color+'ba');g.fillStyle=grad;g.strokeStyle=color+'77';g.lineWidth=.55;g.beginPath();g.moveTo(0,0);g.bezierCurveTo(size*.2,-size*.34,size*.85,-size*.22,size,0);g.bezierCurveTo(size*.7,size*.23,size*.25,size*.2,0,0);g.fill();g.stroke();g.strokeStyle=color+'66';g.beginPath();g.moveTo(0,0);g.lineTo(size*.9,0);g.stroke();if(shine){g.fillStyle=color;g.shadowColor=color;g.shadowBlur=12;g.beginPath();g.arc(size*.97,0,1.3+energy*1.4,0,TAU);g.fill();}g.restore();}
  function plant(t,reflection=false){const small=w<600,baseX=w*(small?.63:w<950?.68:.64),baseY=h*(small?.62:.68),maxHeight=Math.min(h*.34,small?210:320),stemHeight=maxHeight*(.32+growth*.68),spread=(small?68:100)*(growth*.85+.15)*(1+energy*.55);g.save();g.translate(baseX,baseY);
      if(reflection){g.translate(0,24);g.scale(1,-.27);g.globalAlpha=.13;}
    const count=paired>.03?2:1;for(let s=0;s<count;s++){const mix=s===1?paired:1;if(mix<.01)continue;g.save();g.globalAlpha*=mix;const direction=s===0?-1:1,color=s===0?'#ccebc4':'#e8ce97',offset=count===2?direction*12*paired:0,sway=reduced?0:Math.sin(t*.55+s)*7*(weather==='wind'?1.6:1),tipX=offset+direction*spread*.33+sway;
      g.shadowColor=color;g.shadowBlur=7+energy*15;g.strokeStyle=color+'99';g.lineWidth=1.1+growth*.9;g.beginPath();g.moveTo(offset,0);g.bezierCurveTo(offset+direction*15,-stemHeight*.3,tipX-direction*10,-stemHeight*.75,tipX,-stemHeight);g.stroke();g.shadowBlur=0;
      const tiers=4+Math.floor(growth*5);for(let j=1;j<=tiers;j++){const q=j/(tiers+1),y=-stemHeight*q,x=offset+(tipX-offset)*q*q,branchLength=spread*Math.sin(q*Math.PI)*(.7+((seed+j*17)%21)/90),bend=Math.sin(t*.6+j+s)*2*(reduced?0:1);
        for(const d of [-1,1]){const bx=x+d*branchLength,by=y-branchLength*.43+bend;g.strokeStyle=color+'79';g.lineWidth=.7;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+d*branchLength*.6,y,bx,by);g.stroke();const leafCount=3+Math.floor(growth*3);for(let k=1;k<=leafCount;k++){const u=k/(leafCount+1),lx=x+d*branchLength*u,ly=y-branchLength*.43*u*u+bend*u,sz=(7+growth*13)*(1-u*.4)*(1+energy*.28);leaf(lx,ly,sz,d<0?Math.PI+.3:-.45,color,k===leafCount&&growth>.65);leaf(lx,ly,sz*.65,d<0?Math.PI-.5:.4,color,false);}leaf(bx,by,9+growth*17,d<0?Math.PI+.2:-.35,color,true);}
      }
      const bloom=8+growth*13+energy*9;g.save();g.translate(tipX,-stemHeight);g.shadowBlur=20;g.shadowColor=color;for(let i=0;i<5;i++){const a=i*TAU/5-(reduced?0:Math.sin(t*.25)*.1);leaf(0,0,bloom,a,color,false);}g.fillStyle='#f2eeca';g.beginPath();g.arc(0,0,2.5+energy*3,0,TAU);g.fill();g.restore();g.restore();}
    g.restore();
  }
  function draw(now){if(now-lastFrame<30){requestAnimationFrame(draw);return;}const t=now/1000,dt=Math.min(.05,(now-lastFrame)/1000||.016);lastFrame=now;if(document.hidden){requestAnimationFrame(draw);return;}
    const meter=storyMeter||getMeter();let raw=0,low=0,high=0,bins=128;if(meter){bins=meter.frequencyBinCount;meter.getByteFrequencyData(meterValues);raw=meterValues.subarray(0,bins).reduce((a,b)=>a+b,0)/bins/255;low=(meterValues[0]+meterValues[1]+meterValues[2])/765;high=meterValues.subarray(8,bins).reduce((a,b)=>a+b,0)/Math.max(1,bins-8)/255;}energy+=(raw-energy)*.25;bass+=(low-bass)*.25;treble+=(high-treble)*.25;growth=reduced?targetGrowth:growth+(targetGrowth-growth)*.025;paired=reduced?targetPaired:paired+(targetPaired-paired)*.025;
    if(story){const elapsed=getContext().currentTime-story.started;displayChapter(elapsed>=28?2:elapsed>=14?1:0);const li=lines.findLastIndex(item=>elapsed>=item[0]);if(li!==line&&li>=0){line=li;$('story-subtitle').textContent=lines[li][1];}const second=Math.floor(elapsed);if(second!==lastUiSecond){lastUiSecond=second;$('story-time').textContent='00:'+String(Math.min(42,second)).padStart(2,'0');$('story-timeline').value=Math.min(42,elapsed);}if(elapsed>=42)stopStory(true);}
    g.clearRect(0,0,w,h);const x=w*(w<600?.63:w<950?.68:.64),y=h*(w<600?.62:.68);
    const halo=g.createRadialGradient(x,y-70,0,x,y-70,140+growth*80);halo.addColorStop(0,`rgba(148,193,143,${.025+energy*.12})`);halo.addColorStop(1,'rgba(148,193,143,0)');g.fillStyle=halo;g.fillRect(x-240,y-310,480,480);
    if(!reduced&&t>nextRipple){ripples.push({age:0,life:4.3,energy:bass});nextRipple=t+(bass>.1?.65:2.8);}ripples=ripples.filter(r=>r.age<r.life);for(const r of ripples){r.age+=dt;const q=r.age/r.life;g.strokeStyle=`rgba(194,218,181,${(1-q)*(.06+r.energy*.3)})`;g.lineWidth=.65;g.beginPath();g.ellipse(x,y+26,10+q*(190+r.energy*160),3+q*29,0,0,TAU);g.stroke();}
    plant(reduced?0:t,true);plant(reduced?0:t);
    if(!reduced){if(t>nextParticle){const n=treble>.06?4:energy>.08?3:1;for(let i=0;i<n;i++)particles.push({x:x+(Math.sin(t*3+i)*55),y:y-45,dx:Math.sin(t*7+i)*15,dy:-12-energy*50-treble*30,age:0,life:4+(seed%3),color:paired>.3&&i%2?'#ead59c':'#d1eec2'});nextParticle=t+(treble>.06?.12:energy>.08?.18:.6);}particles=particles.filter(p=>p.age<p.life);for(const p of particles){p.age+=dt;p.x+=p.dx*dt;p.y+=p.dy*dt;g.globalAlpha=Math.sin(p.age/p.life*Math.PI)*.6;g.fillStyle=p.color;g.shadowColor=p.color;g.shadowBlur=10;g.beginPath();g.arc(p.x,p.y,1+energy*2,0,TAU);g.fill();}g.globalAlpha=1;g.shadowBlur=0;
      const arrival=t-arrivedAt;if(arrival>=0&&arrival<4){const q=clamp(arrival/4),ax=x+(w*.28)*(1-q),ay=y-85-Math.sin(q*Math.PI)*95;g.shadowBlur=25;g.shadowColor='#efdcab';g.fillStyle='#efdcab';g.beginPath();g.arc(ax,ay,4+Math.sin(q*Math.PI)*3,0,TAU);g.fill();g.shadowBlur=0;g.strokeStyle='#dce3af77';g.lineWidth=1;g.beginPath();g.ellipse(ax,ay+7,10,3,0,0,TAU);g.stroke();}
      if(weather==='rain'){g.strokeStyle='#aac4b012';g.lineWidth=.6;for(let i=0;i<34;i++){const rx=(i*139.7+seed)%w,ry=(t*(110+i%5*13)+i*63)%h;g.beginPath();g.moveTo(rx,ry);g.lineTo(rx-2,ry+12);g.stroke();}}
    }
    const bars=$('wave-bars').children;for(let i=0;i<bars.length;i++)bars[i].style.height=(meter?4+meterValues[(i*4)%bins]/255*27:5)+'px';requestAnimationFrame(draw);
  }
  $('story-play').onclick=()=>void startStory();$('sound-toggle').onclick=()=>{muted=!muted;if(master)master.gain.setTargetAtTime(muted?0:.8,getContext().currentTime,.05);$('sound-toggle').setAttribute('aria-pressed',String(muted));$('sound-toggle').textContent=muted?'声音关闭':'声音开启';};
  document.querySelectorAll('[data-weather]').forEach(button=>button.onclick=()=>{weather=button.dataset.weather;document.querySelectorAll('[data-weather]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));if(story)ambient();else onWeather?.(weather);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopStory();});window.addEventListener('pagehide',()=>{stopStory();stopAmbient();});requestAnimationFrame(draw);
  return {output,stopStory,selectClip,heard,submitted,received,previewDraft,clearDraft,fingerprint,isStory:()=>!!story,weather:()=>weather,resetCopy};
}
