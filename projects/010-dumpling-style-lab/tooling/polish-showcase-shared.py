from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
file=ROOT/'web/showcase.js';text=file.read_text(encoding='utf-8')
text=text.replace("function sfx(kind){if(!sound||!audio)return;", "function sfx(kind){if(!sound||!audio)return;if(playSample(kind,audio))return;if(kind==='step')return;",1)
text=text.replace("badge.textContent=d.legacy?", "badge.textContent=records[d.id]?.completed?'已完成 ✓':d.legacy?",1)
text=text.replace("function sync(){if(!current)return;", "function sync(){if(!current)return;recordFinish();",1)
text=text.replace("async function choose(id,scroll=false,reset=false){spatialEnding.hidden=true;", "async function choose(id,scroll=false,reset=false){finished=false;spatialEnding.hidden=true;",1)
text=text.replace("current=game;$('#play-loading')", "current=game;const restored=game.getState();finished=!!(restored.won||restored.phase==='won'||restored.end||restored.phase==='ended'&&restored.letter);$('#play-loading')",1)
text=text.replace("audio.resume();sfx('pickup')", "audio.resume();preloadAudio(audio);sfx('pickup')",1)
text=text.replace("$('#empty-results').hidden=visible.length>0", "$('#empty-results').hidden=visible.length>0;$('.collection-summary').lastElementChild.textContent='已完成 '+newDirections.filter(d=>records[d.id]?.completed).length+'/12 · 点击卡片进入试玩'",1)
text=text.replace("window.addEventListener('pagehide',save);", "mount.addEventListener('keydown',e=>{if(e.target.closest('button,input,select'))return;if(e.code==='KeyP'){e.preventDefault();pause()}if(e.code==='KeyF'){e.preventDefault();$('#play-full').click()}});window.addEventListener('pagehide',save);",1)
file.write_text(text,encoding='utf-8')
file=ROOT/'web/showcase.html';text=file.read_text(encoding='utf-8').replace('showcase.css?v=1','showcase.css?v=2').replace('showcase.js?v=1','showcase.js?v=2');file.write_text(text,encoding='utf-8')
file=ROOT.parent.parent/'scripts/build_site.py';text=file.read_text(encoding='utf-8');old="asset.suffix.lower() in {'.glb', '.json'}";assert old in text;text=text.replace(old,"asset.suffix.lower() in {'.glb', '.json', '.ogg'}",1);file.write_text(text,encoding='utf-8')
