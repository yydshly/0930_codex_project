from pathlib import Path
P=Path(__file__).resolve().parents[1]/'web'
p=P/'showcase-foundry-kit.js';s=p.read_text(encoding='utf-8')
s=s.replace('jump=false;stroke=null;panel?.release();','jump=false;if(stroke&&element?.hasPointerCapture?.(stroke.pointerId))element.releasePointerCapture(stroke.pointerId);stroke=null;panel?.release();')
s=s.replace('return;e.preventDefault();if(maps[id][e.code])','return;e.preventDefault();e.stopPropagation?.();if(maps[id][e.code])')
s=s.replace('x:Math.floor((x-MAKER.x)/MAKER.cell),y:Math.floor((y-MAKER.y)/MAKER.cell)','x:clamp(Math.floor((x-MAKER.x)/MAKER.cell),-1,24),y:clamp(Math.floor((y-MAKER.y)/MAKER.cell),-1,11)')
s=s.replace('stroke={grid:structuredClone(state.grid)','stroke={pointerId:e.pointerId,grid:structuredClone(state.grid)')
s=s.replace("element.addEventListener(type,()=>{stroke=null;},{signal});", "element.addEventListener(type,()=>{if(stroke&&element.hasPointerCapture?.(stroke.pointerId))element.releasePointerCapture(stroke.pointerId);stroke=null;},{signal});")
p.write_text(s,encoding='utf-8')
p=P/'showcase-foundry.js';s=p.read_text(encoding='utf-8');s=s.replace('setActive:v=>controller.setActive(v),dispose()', 'setActive:v=>controller.setActive(v),onStart:()=>controller.setActive(true),command:controller.command,dispose()');p.write_text(s,encoding='utf-8')
p=P/'showcase-foundry-rules.js';s=p.read_text(encoding='utf-8');s=s.replace('s.q=s.q.map(v=>v/m);s.beacon=', 'if(Math.abs(m-1)>1e-12)s.q=s.q.map(v=>v/m);s.beacon=');p.write_text(s,encoding='utf-8')
print('Isolated game keys, released captures, supported host Start and exact valid restore')
