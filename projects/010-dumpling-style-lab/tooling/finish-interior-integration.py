from pathlib import Path
root=Path(__file__).resolve().parents[1]/'web'
def replace(file,old,new):
 p=root/file;t=p.read_text(encoding='utf-8');assert t.count(old)==1,(file,old[:70],t.count(old));p.write_text(t.replace(old,new),encoding='utf-8')
replace('showcase.html','<link rel="stylesheet" href="play-inspection.css?v=1">','<link rel="stylesheet" href="play-inspection.css?v=1"><link rel="stylesheet" href="showcase-refinements.css?v=1">')
replace('showcase.js','finished=false;spatialEnding.hidden=true;','finished=false;spatialEnding.hidden=true;inspection.sync(null);')
replace('showcase.js',"if(directionMap[currentId]?.legacy){notify('保留的世界请使用游戏内的暂停按钮。');return}","if(directionMap[currentId]?.legacy){mount.querySelector('iframe')?.contentWindow?.postMessage({type:'dumpling-host-command',command:'pause'},location.origin);return}")
replace('showcase.js',"$('#play-sound').onclick=()=>{sound=!sound;", "$('#play-sound').onclick=()=>{if(directionMap[currentId]?.legacy){mount.querySelector('iframe')?.contentWindow?.postMessage({type:'dumpling-host-command',command:'sound'},location.origin);return}sound=!sound;")
replace('showcase.js',"currentId=id;statusKey=actionKey='';", "currentId=id;$('#play-sound').textContent=sound?'声音：开':'声音：关';$('#play-sound').setAttribute('aria-pressed',String(sound));statusKey=actionKey='';")
replace('showcase.js',"if(e.data?.type==='dumpling-extension-resize')", "if(e.data?.type==='dumpling-extension-controls'){paused=!!e.data.paused;$('#play-pause').textContent=paused?'继续':'暂停';$('#play-pause').setAttribute('aria-pressed',String(paused));$('#play-sound').textContent=e.data.sound?'声音：开':'声音：关';$('#play-sound').setAttribute('aria-pressed',String(!!e.data.sound))}if(e.data?.type==='dumpling-extension-resize')")
replace('games.js',"if(document.body.classList.contains('embedded')){new ResizeObserver", """if(document.body.classList.contains('embedded')){
 const controls=()=>parent.postMessage({type:'dumpling-extension-controls',paused,sound},location.origin);
 for(const target of ['#game-pause','#game-sound'])$(target).addEventListener('click',controls);
 window.addEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin||e.data?.type!=='dumpling-host-command')return;const control={pause:'#game-pause',sound:'#game-sound'}[e.data.command];if(control)$(control).click()});
 queueMicrotask(controls);new ResizeObserver""")
replace('showcase.js',"$('#play-scope').textContent=d.scope;const u=new URL", "$('#play-scope').textContent=d.scope;$('#play-controls').textContent=d.controls;$('#play-reference').textContent=d.reference;$('#play-reference').href=d.source||'./#original';const u=new URL")
replace('art-preferences.js',"let world=null,first=true;", "let world=null,first=true,lastAnnounce='';")
replace('art-preferences.js',"function announce(){if(parent!==window)parent.postMessage({type:'dumpling-art-preference',game:world,look:direction,favorite:!!preferences[world]?.favorite},location.origin)}", "function announce(force=false){const data={type:'dumpling-art-preference',game:world,look:direction,favorite:!!preferences[world]?.favorite},key=JSON.stringify(data);if(parent!==window&&(force||key!==lastAnnounce)){lastAnnounce=key;parent.postMessage(data,location.origin)}}")
replace('art-preferences.js',"type==='dumpling-art-request')announce()", "type==='dumpling-art-request')announce(true)")
replace('art-preferences.js',"initialPreference):preferences[game]?.look||'paint';first=false;", "initialPreference):preferences[game]?.look||'paint';if(first&&initialLook&&supported(initialLook,game)){preferences[game]={look:initialLook,favorite:preferences[game]?.look===initialLook&&!!preferences[game]?.favorite};persist()}first=false;")
replace('play-inspection.css','--panel:var(--card);--ink:var(--ink);--muted:var(--muted);--line:var(--line)', '--panel:var(--card)')
replace('showcase-inspection.js',"p.growth>=2?'good':p.seed&&!p.water?'warn':'')),note:'手中工具：'", "p.growth>=2?'good':p.seed&&!p.water?'warn':'')).map((p,i)=>({...p,command:'plot-'+i,action:'选择这块田地',selected:s.selected===i})),note:'手中工具：'")
print('Integrated inspector, retained-world controls and per-game preferences.')
