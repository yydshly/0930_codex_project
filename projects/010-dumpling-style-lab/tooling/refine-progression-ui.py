from pathlib import Path
root=Path(__file__).resolve().parents[1]/'web'
def edit(name,changes):
 p=root/name;s=p.read_text(encoding='utf-8')
 for a,b in changes:
  assert a in s,(name,a[:100]);s=s.replace(a,b,1)
 p.write_text(s,encoding='utf-8')
edit('worlds-interface.js',[
 ('goal.after(progress);let progressKey', 'let progressKey'),
 ("document.querySelector('#game-stage').after(dialogue);", "document.querySelector('#game-stage').after(dialogue);dialogue.after(progress);"),
])
edit('games/islands.js',[
 ("let route=[],pending", "if(s.reported&&!s.towerStarted&&s.message.includes('尚未开放'))s.message='航图已定位云塔。第二章的航路开放了：前往云塔岛，调查熄灭的归航灯。';\n let route=[],pending"),
 ("label:s.discoveries.length===2&&!s.reported?'归档两条线索':'查看营地航图',primary:s.discoveries.length===2&&!s.reported", "label:s.beaconLit&&!s.towerReported?'归档云塔航路':s.discoveries.length===2&&!s.reported?'归档两条线索':'查看营地航图',primary:s.beaconLit&&!s.towerReported||s.discoveries.length===2&&!s.reported"),
 ("primary:!s.towerReported}]:[])", "primary:!s.towerStarted&&!s.towerReported}]:[])"),
])
edit('games/islands-art.js',[
 ('w=0,h=0;', 'w=0,h=0,lastSpan=0;'),
 ("aim.set(state.area==='camp'?1.4:0,.2+info.transition*.35,0);", "aim.set(state.area==='camp'?1.4:0,(state.area==='tower'?1.0:.2)+info.transition*.35,0);"),
 ('if(ww!==w||hh!==h){w=ww;', "const span=state.area==='tower'?10.6:9.8;if(ww!==w||hh!==h||lastSpan!==span){lastSpan=span;w=ww;"),
 ('camera.left=-9.8;camera.right=9.8;camera.top=9.8/aspect;camera.bottom=-9.8/aspect;', 'camera.left=-span;camera.right=span;camera.top=span/aspect;camera.bottom=-span/aspect;'),
 ('refs.beam=base;', 'refs.beam=beam;'),
])
edit('games/inn.js',[
 ("if(state.phase==='departed')list.push({id:'next-day'", "if(state.phase==='finished'&&state.day===7)list.push({id:'next-chapter',x:805,y:530,w:146,h:60});\n    if(state.phase==='departed')list.push({id:'next-day'"),
 ("else{text('房间和相遇都留下了。翻看回访簿，继续回信篇。',480,542,16,'#846345','center');}", "else if(state.day===7){text('房间与过去的相遇保留，熟悉的来客会再回来。',369,542,14,'#846345','center');actionCard('next-chapter',805,535,140,'继续 · 回信篇');}else{text('十日的停留与三封新信，都留在回访簿里。',480,542,16,'#846345','center');}"),
])
print('Refined chapter handoff, tower framing and game-first layout.')
