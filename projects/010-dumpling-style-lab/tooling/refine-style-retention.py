from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
file=ROOT/'web/showcase.js';text=file.read_text(encoding='utf-8')
text="import {createLegacyToolbar} from './showcase-legacy.js';\n"+text
old="filter='全部'"
assert old in text
text=text.replace(old,"filter=(params.get('play')||'legacy-inn').startsWith('legacy-')?'原有九款':'全部'",1)
text=text.replace("filter==='原有九款'&&d.legacy", "filter==='原有九款'&&d.legacy||filter==='新十二款'&&!d.legacy||filter==='已完成'&&records[d.id]?.completed",1)
text=text.replace("for(const f of ['全部','四个优先','动作','空间','策略','故事','生活','原有九款'])", "for(const f of ['原有九款','新十二款','全部','四个优先','已完成','动作','空间','策略','故事','生活'])",1)
text=text.replace("choose(params.get('play')||'afterdark')", "choose(params.get('play')||'legacy-inn')",1)
text=text.replace("const d=directionMap[id];mount.dataset.kind=", "const d=directionMap[id];legacyUI.sync();mount.dataset.kind=",1)
text=text.replace("if(token===request)$('#play-loading').hidden=true", "if(token===request){$('#play-loading').hidden=true;legacyUI.request()}",1)
anchor="renderGallery();choose(params.get('play')"
assert anchor in text
text=text.replace(anchor,"""const legacyUI=createLegacyToolbar({getId:()=>currentId,onSwitch:legacyId=>{
 if(!directionMap[legacyId]?.legacy)return;currentId=legacyId;const d=directionMap[legacyId];$('#play-title').textContent=d.title;$('#play-category').textContent='原有世界 / '+d.subtitle;$('#play-description').textContent=d.description;$('#play-scope').textContent=d.scope;const u=new URL(location.href);u.searchParams.set('play',legacyId);history.replaceState(null,'',u);legacyUI.sync();renderGallery();
}});
"""+anchor,1)
file.write_text(text,encoding='utf-8')
file=ROOT/'web/showcase.html';text=file.read_text(encoding='utf-8').replace('showcase.css?v=2','showcase.css?v=3').replace('showcase.js?v=2','showcase.js?v=3')
text=text.replace('每一种世界，<br>都有另一种玩法。','喜欢的世界，<br>可以继续留下来。')
text=text.replace('走进悬疑，掌握战斗，破解空间，构建策略。<br>从经典案例出发，亲手体验画面与规则如何一起改变感受。','原有九款与全部画风继续保留，每款分别记住你的选择。<br>再从十二个扩展试玩里，寻找下一种想体验的玩法。')
text=text.replace('四个优先方向已放在最前面。<br>每个入口都有自己的操作、目标与结果。','原有世界与扩展试玩分别展示。<br>每个入口都有自己的操作、目标与结果。')
file.write_text(text,encoding='utf-8')
file=ROOT/'web/games.js';text=file.read_text(encoding='utf-8').replace("./art-direction.js?v=2","./art-direction.js?v=3");file.write_text(text,encoding='utf-8')
