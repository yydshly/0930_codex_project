from pathlib import Path
root=Path(__file__).resolve().parents[1]/'web'
def replace(file,old,new):
    p=root/file
    text=p.read_text(encoding='utf-8')
    assert text.count(old)==1,(file,old[:75],text.count(old))
    p.write_text(text.replace(old,new),encoding='utf-8')

replace('games/inn.js','return {title:state.day>7?',"return {guestInfo:{name:p.name,job:p.job,need:v.need,checks:fit(state.selected).checks,stayingGood:fit().good},title:state.day>7?")
replace('games/wasteland.js',"return {title:s.scenario==='signal'?","return {forecast:f,title:s.scenario==='signal'?")
replace('games/arcade.js',"function getUI(){return {title:","function getUI(){const ps=course().platforms,at=ps[Math.min(s.checkpoint,ps.length-1)],next=ps[s.checkpoint+1];return {routeInfo:{total:ps.length,next:next?{gap:next.x-(at.x+at.w),rise:at.y-next.y}:null},title:")

ecology_helper="""export function forecastPatches(patches,season,delta){
 const canopy=patches.filter(p=>p.plant==='wood'&&p.age>=2&&p.health>0);
 return patches.map(p=>{const shade=canopy.some(q=>q.id!==p.id&&Math.hypot(q.x-p.x,q.y-p.y)<225)?1:0;
  const water=clamp(p.water+season.rain-season.evap+delta+(p.wet?1:0)+shade,0,9);
  const good=p.plant==='bare'||(p.plant==='reed'?water>=3:p.plant==='flowers'?water>=2&&water<=5:water>=2&&water<=6);
  return {...p,before:p.water,oldHealth:p.health,water,age:p.age+(p.plant==='bare'?0:1),health:clamp(p.health+(good?0:-2),0,3),reason:good?'适合当前植被':'水位超出适宜范围'};
 });
}
"""
replace('games/ecology.js'," function evolve(){",ecology_helper.replace('export function',' function')+" function evolve(){")
old="canopy=s.patches.filter(p=>p.plant==='wood'&&p.age>=2&&p.health>0);for(const p of s.patches){const shaded=canopy.some(q=>q.id!==p.id&&Math.hypot(q.x-p.x,q.y-p.y)<225)?1:0;const inlet=p.wet?1:0;p.water=clamp(p.water+season.rain-season.evap+GATES[s.gate].delta+inlet+shaded,0,9);if(p.plant!=='bare'){p.age++;const good=p.plant==='reed'?p.water>=3:p.plant==='flowers'?p.water>=2&&p.water<=5:p.water>=2&&p.water<=6;p.health=clamp(p.health+(good?0:-2),0,3);"
new="preview=forecastPatches(s.patches,season,GATES[s.gate].delta);for(let i=0;i<s.patches.length;i++){const p=s.patches[i],next=preview[i];p.water=next.water;if(p.plant!=='bare'){p.age=next.age;p.health=next.health;"
replace('games/ecology.js',old,new)
replace('games/ecology.js',"return {title:'小小生态岛", "return {patchForecast:s.complete?s.patches.map(p=>({...p,before:p.water,oldHealth:p.health,reason:'季末记录'})):forecastPatches(s.patches,next,GATES[s.gate].delta),title:'小小生态岛")
replace('games.js',"./worlds-interface.js?v=7","./worlds-interface.js?v=8")
replace('games.js',"./world-progress.js?v=2","./world-progress.js?v=3")
# The host's script query changes, so these game modules need their own cache version too.
for name in ['inn','ecology','wasteland','arcade']:
    p=root/'games.js'
    text=p.read_text(encoding='utf-8')
    import re
    text,n=re.subn(r"(\./games/"+name+r"\.js\?v=)(\d+)",lambda m:m[1]+str(int(m[2])+1),text)
    assert n==1,name
    p.write_text(text,encoding='utf-8')
print('Added state-driven interiors for the nine retained worlds.')
