from pathlib import Path
P=Path(__file__).resolve().parents[1];f=P/'web/showcase-trajectories-rules.js';s=f.read_text(encoding='utf-8')
for a,b in [("return {...base,ship:","return {...base,simTime:0,ship:"),("const h=d*.35*s.warp;if(throttle)","const h=d*.35*s.warp;s.simTime+=h;if(throttle)"),("s.time*.35>=45","s.simTime>=45"),("b.time*.35>=45","b.simTime>=45"),("id==='perigee'&&(!r.ship","id==='perigee'&&(!num(r.simTime)||r.simTime<0||!r.ship")]:
 assert a in s,a;s=s.replace(a,b)
f.write_text(s,encoding='utf-8');print('Simulation clock follows actual accelerated orbital time')
