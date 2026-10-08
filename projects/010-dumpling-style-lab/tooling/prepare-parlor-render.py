from pathlib import Path
P=Path(__file__).resolve().parents[1]
s=(P/'tooling/render-thresholds-scenes.mjs').read_text(encoding='utf-8').replace('thresholds','parlor').replace('Thresholds','Parlor')
s=s.replace('i<4','i<3').replace('new Canvas(2240,1260)','new Canvas(3360,630)').replace('i%2*1120,Math.floor(i/2)*630','i*1120,0').replace('native microphone or browser persistence','browser keyboard/touch input, fullscreen or persistence')
(P/'tooling/render-parlor-scenes.mjs').write_text(s,encoding='utf-8')
f=P/'web/showcase-parlor-kit.js';s=f.read_text(encoding='utf-8').replace('start:p,p,moved:false','start:{...p},p:{...p},moved:false')
a="if(id==='lexicon'){if(e.key"
b="if(id==='cascade'&&!e.repeat&&['KeyQ','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();run(e.code==='KeyQ'?'rotate:-1':'hold');}if(id==='lexicon'){if(e.key"
assert a in s;s=s.replace(a,b).replace("e.preventDefault();run('letter',e.key.toUpperCase());","e.preventDefault();e.stopPropagation?.();run('letter',e.key.toUpperCase());")
f.write_text(s,encoding='utf-8')
