from pathlib import Path
P=Path(__file__).resolve().parents[1]
def change(f,a,b):
 p=P/f;s=p.read_text(encoding='utf-8');assert a in s,(f,a);p.write_text(s.replace(a,b),encoding='utf-8')
change('web/showcase-studio-rules.js','s.ghosts.push(structuredClone(s.take));','if(s.take.length<360&&Math.abs(s.take.at(-1).x-s.p.x)>.01)s.take.push({...s.p});s.ghosts.push(structuredClone(s.take));')
change('tooling/check-studio-rules.mjs',"id==='afterimage'?false:true",'true')
change('web/showcase-studio.js',"key='select';v=(s.selected+(key==='previous'?-1:1)+12)%12;v=(s.selected+(value==='previous'?-1:1)+12)%12;","key='select';v=(s.selected+(value==='previous'?-1:1)+12)%12;")
change('web/showcase-studio.js',"function nudge(dx,dy)","element.addEventListener('keydown',e=>{if(e.code==='KeyQ'&&!e.repeat){e.preventDefault();if(active)run(id==='sonata'?'pitch:-1':'rotate:-1')}},{signal:events.signal});\n function nudge(dx,dy)")
change('web/showcase-studio.js','getState(){return structuredClone(s)}','getState(){const copy=structuredClone(s);if(id===\'span\'){copy.solution=null;copy.stress=Number.isFinite(copy.stress)?copy.stress:0;copy.deflection=Number.isFinite(copy.deflection)?copy.deflection:0;}return copy}')
change('web/showcase-studio-audio.js',"ctx.resume?.().catch?.(()=>{});return true","if(ctx.state!=='running')ctx.resume?.().catch?.(()=>{});master.gain.value=.8;return true")
change('web/showcase-studio-audio.js',"if(!active||!getSound()||!s.playing){stop();return;}","if(!active||!getSound()||!s.playing){stop();if(master)master.gain.value=0;ctx?.suspend?.().catch?.(()=>{});return;}")
change('web/showcase-studio-audio.js',"if(!v){stop();ctx?.suspend","if(!v){stop();if(master)master.gain.value=0;ctx?.suspend")
print('Refined native key handling, recording endpoint and saved states')
