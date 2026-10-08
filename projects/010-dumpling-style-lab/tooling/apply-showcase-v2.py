"""Narrow, asserted migrations of the original compact demo modules."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def replace(path,old,new):
    file=ROOT/path
    text=file.read_text(encoding='utf-8')
    assert old in text, (path,old[:100])
    file.write_text(text.replace(old,new,1),encoding='utf-8')

file=ROOT/'web/showcase-2d.js'
text=file.read_text(encoding='utf-8')
start=text.index('export async function createCombat(')
end=text.index('export const SHAPES=',start)
text=text[:start]+"export {createCombat} from './showcase-combat.js';\n\n"+text[end:]
text=text.replace("'worker-'+i)]),props=await Promise.all(['salvage-crate','water-pump','equipment-ledger','film-can'].map(n=>image('assets/worlds/'+n+'.webp')))","'worker-'+i),...Array.from({length:6},(_,i)=>'rail-prop-'+i)]),props=Array.from({length:6},(_,i)=>art['rail-prop-'+i])")
text=text.replace("choice:null,alerts:0}),floor=412;let time=0,walk=0,flash=0,cooldown=0;", "choice:null,alerts:0,exposure:0,decision:null}),floor=412;let time=0,walk=0,flash=0,cooldown=0,facing=false;")
text=text.replace("function finish(choice){s.end=", "function finish(choice){s.decision=choice;s.end=")
text=text.replace("goal:['找到电池，接通控制台，打开闸门','避开探照灯，找到值班记录','走进广播室，作出最后的决定'][s.chapter]", "goal:s.end?'这一夜的决定已经留下': ['找到电池，接通控制台，打开闸门','避开探照灯，找到值班记录','走进广播室，作出最后的决定'][s.chapter]")
text=text.replace("walk+=Math.abs(input.x)*dt;", "walk+=Math.abs(input.x)*dt;if(input.x)facing=input.x<0;",1)
old="if(Math.abs(s.x-beam)<35&&!hidden&&cooldown===0){s.alerts++;s.x=110;flash=.4;cooldown=3;"
new="s.exposure=clamp(s.exposure+(Math.abs(s.x-beam)<55&&!hidden&&cooldown===0?dt:-dt*2),0,.6);if(s.exposure>=.6){s.alerts++;s.x=450;s.exposure=0;flash=.4;cooldown=3;"
assert old in text;text=text.replace(old,new)
text=text.replace("ctx.drawImage(props[3],305,floor-45,50,40)","sprite(ctx,props[0],330,floor,50)")
text=text.replace("ctx.drawImage(props[1],666,floor-120,72,120)","sprite(ctx,props[1],700,floor,150)")
text=text.replace("ctx.drawImage(props[0],445,floor-120,130,120)","sprite(ctx,props[2],510,floor,120)")
text=text.replace("ctx.drawImage(props[2],797,floor-38,48,34)","sprite(ctx,props[3],820,floor,42)")
text=text.replace("ctx.drawImage(props[1],785,floor-135,85,135)","sprite(ctx,props[4],820,floor,148)")
text=text.replace("crouch?100:142,input.x<0)","crouch?100:142,facing)")
text=text.replace("vignette(ctx);if(flash>0)","""vignette(ctx);
 const prompt=s.chapter===0?(!s.battery&&Math.abs(s.x-330)<100?'E · 取得备用电池':s.battery&&!s.power&&Math.abs(s.x-700)<95?'E · 接通电源':''):s.chapter===1?(Math.abs(s.x-510)<100&&crouch?'正在货箱后藏身':!s.log&&Math.abs(s.x-820)<100?'E · 读取值班记录':''):Math.abs(s.x-820)<120&&!s.end?'E · 打开广播控制台':'';
 if(prompt)label(ctx,prompt,s.x,floor+45,'#bde9e7',17);
 label(ctx,['01 / 维修通路','02 / 封锁线','03 / 广播室'][s.chapter],155,48,'#c3d4d6',15);
 if(s.chapter===1&&s.exposure>0){ctx.fillStyle='#3b2428';ctx.fillRect(440,40,240,6);ctx.fillStyle='#e7ac81';ctx.fillRect(440,40,240*s.exposure/.6,6);label(ctx,'探照灯正在锁定你',560,75,'#e7b894',15)}
 if(s.chapter===2&&s.end&&s.decision==='truth')for(let i=0;i<5;i++)glow(ctx,110+i*85,135+(i%2)*35,25,'#ffc37d66');
 if(flash>0)""",1)
file.write_text(text,encoding='utf-8')

file=ROOT/'web/showcase-spatial.js'
text=file.read_text(encoding='utf-8')
start=text.index('export async function createLandscape(')
text=text[:start]+"export {createLandscape} from './showcase-landscape.js';\n"
for name in ['loadModels','batchStatic','roomBase','put','light','sign']:
    text=text.replace(('async ' if name=='loadModels' else '')+'function '+name+'(', 'export '+('async ' if name=='loadModels' else '')+'function '+name+'(',1)
file.write_text(text,encoding='utf-8')
