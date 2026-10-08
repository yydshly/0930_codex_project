from pathlib import Path
import shutil
p=Path(__file__).resolve().parents[1]
web=p/'web'
backup=p/'assets/worlds-product/source-before'
backup.mkdir(parents=True,exist_ok=True)
for name in ['games.js','games.html','games.css']:
    if not (backup/name).exists():shutil.copy2(web/name,backup/name)
path=web/'games.js';s=path.read_text(encoding='utf-8')
assert 'createWorldsInterface' not in s
s="import {createWorldsInterface,renderWorldActions} from './worlds-interface.js?v=1';\n"+s
for name in ['detective','wuxia','ecology','wasteland','dream','arcade','inn','islands']:
    s=s.replace("'./games/"+name+".js'","'./games/"+name+".js?v=2'")
old="const actions=JSON.stringify(u.actions||[]);if(actions!==actionKey){actionKey=actions;$('#game-actions').replaceChildren(...(u.actions||[]).map(a=>{const b=document.createElement('button');b.type='button';b.textContent=a.label;b.dataset.command=a.id;b.disabled=!!a.disabled;b.className=a.primary?'primary':'';b.addEventListener('click',()=>{if(paused)return;current.command(a.id);sync();saveAll();current.element.focus({preventScroll:true})});return b}))}}"
assert old in s
s=s.replace(old,"const actions=JSON.stringify(u.actions||[]);if(actions!==actionKey){actionKey=actions;renderWorldActions($('#game-actions'),u.actions||[],runCommand,id)}worldUI.sync(u)}\nfunction runCommand(command){if(paused||worldUI.blocking||!current)return;current.command(command);sync();saveAll();if(!worldUI.blocking)current.element.focus({preventScroll:true})}")
s=s.replace("function choose(which){if(!factories[which])which='detective';saveAll();","function choose(which){if(!factories[which])which='detective';worldUI.close();saveAll();")
s=s.replace("(id==='movers'&&!document.body.classList.contains('embedded')?productHome:actionHome)","(!document.body.classList.contains('embedded')?productHome:actionHome)")
s=s.replace("if(id==='movers'&&(document.fullscreenElement===", "if(document.fullscreenElement===")
# Keep the chosen game's sound/reset controls within an embedded or fullscreen game view.
s=s.replace("||document.body.classList.contains('embedded')))$('.view-tools')", "||document.body.classList.contains('embedded'))$('.view-tools')")
s=s.replace("if(id==='movers'&&!document.body.classList.contains('embedded'))(full?", "if(!document.body.classList.contains('embedded'))(full?")
s=s.replace("if(e.target.closest('button')||!accepted.includes(e.code))return", "if(worldUI.blocking||e.target.closest('button')||!accepted.includes(e.code))return")
s=s.replace("e.preventDefault();if(paused)return;keys.add", "e.preventDefault();if(paused||worldUI.blocking)return;keys.add")
s=s.replace("if(!paused){const steps=", "if(!paused&&!worldUI.blocking){const steps=")
s=s.replace("choose(new URLSearchParams(location.search)","const worldUI=createWorldsInterface({getId:()=>id,getGame:()=>current,onCommand:runCommand});\nchoose(new URLSearchParams(location.search)")
path.write_text(s,encoding='utf-8')
path=web/'games.html';s=path.read_text(encoding='utf-8').replace('games.js?v=13','games.js?v=14').replace('<link rel="stylesheet" href="moving-day.css?v=7">','<link rel="stylesheet" href="moving-day.css?v=7"><link rel="stylesheet" href="worlds-product.css?v=1">')
s=s.replace('新故事 · 扩展第二轮','可亲历的故事').replace('九种方向 · 各自可玩','九个小世界').replace('Extension V2','Playable Stories')
path.write_text(s,encoding='utf-8')
print('Integrated product shell without changing save envelopes.')
