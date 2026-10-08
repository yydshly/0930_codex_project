from pathlib import Path
root=Path(__file__).resolve().parents[1]/'web'
p=root/'play-inspection.css';t=p.read_text(encoding='utf-8')
for name in ['ink','muted','panel','line','good','warn','risk']:t=t.replace('--'+name,'--inspection-'+name)
t=t.replace('--inspection-panel:var(--card)', '--inspection-panel:var(--card);--inspection-ink:var(--ink);--inspection-muted:var(--muted);--inspection-line:var(--line);--inspection-good:var(--selected);--inspection-warn:var(--accent)')
p.write_text(t,encoding='utf-8')
p=root/'showcase.js';t=p.read_text(encoding='utf-8')
t=t.replace("let finished=false;", "let finished=false,legacyVisible=null;")
old="function frame(now){const dt=Math.min(.25,(now-last)/1000);last=now;"
new="function frame(now){const dt=Math.min(.25,(now-last)/1000);last=now;if(directionMap[currentId]?.legacy){const rect=mount.getBoundingClientRect(),visible=rect.bottom>0&&rect.top<innerHeight&&!document.hidden;if(visible!==legacyVisible){legacyVisible=visible;mount.querySelector('iframe')?.contentWindow?.postMessage({type:'dumpling-extension-visibility',visible},location.origin)}}else legacyVisible=null;"
assert t.count(old)==1;t=t.replace(old,new)
t=t.replace("$('#play-loading').hidden=true;legacyUI.request()", "$('#play-loading').hidden=true;legacyVisible=null;legacyUI.request()")
p.write_text(t,encoding='utf-8')
# The stylesheet also needs a new query for a tab already open on the old revision.
for file in ['showcase.html','games.html']:
 p=root/file;p.write_text(p.read_text(encoding='utf-8').replace('play-inspection.css?v=1','play-inspection.css?v=2'),encoding='utf-8')
print('Inspection text follows each retained world palette; embedded controls avoid duplication.')
