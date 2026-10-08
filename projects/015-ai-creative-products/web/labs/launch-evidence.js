import {renderLaunchInputSurface} from './launch-bookends.js';
// One real local workbench operation: retain sources, merge exact duplicates,
// and export the same records shown in the film. No model or source verification.
const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v);};
export const initialEvidence=[
 '选中对象后，其他衣物淡出。 | https://x.com/cambreedesigns/status/2104999693113766152',
 '纸页标题与论证主题相同。 | https://x.com/sevdeawesome/status/2104985610012504181',
 '同一橙点出现在曲线、环字与点阵中。 | https://x.com/uxmiles/status/2104618175803609305',
 '同一橙点出现在曲线、环字与点阵中。 | https://x.com/uxmiles/status/2104618175803609305',
 '待确认：客户是否需要这样的工具。 | '
].join('\n');
export function organizeEvidence(text,question){
 const records=[],included=[],pending=[],merged=[],seen=new Map();
 for(const line of String(text).split(/\r?\n/).filter(s=>s.trim())){
  const split=line.lastIndexOf('|'),claim=(split<0?line:line.slice(0,split)).trim(),rawSource=split<0?'':line.slice(split+1).trim();
  let source='',reason=rawSource?'来源格式待修正':'缺少来源';
  try{const url=new URL(rawSource);if(['https:','http:'].includes(url.protocol))source=url.href;}catch{}
  const record={id:records.length+1,claim,source:source||rawSource,status:'needs-source',reason};
  if(!claim){record.reason='缺少观察内容';pending.push(record);}
  else if(source){const key=claim+'\n'+source;
   if(seen.has(key)){record.status='merged';record.duplicateOf=seen.get(key);record.reason='内容与来源相同';merged.push(record);}
   else{record.status='included';record.reason='保留填写的来源';seen.set(key,record.id);included.push(record);}
  }else pending.push(record);
  records.push(record);
 }
 return{question:String(question).trim(),filename:'研究证据成果.md',rule:'仅合并内容与来源完全相同的记录；缺少内容或有效 HTTP(S) 来源的记录留作待补。未自动核实来源内容。',inputCount:records.length,includedCount:included.length,mergedCount:merged.length,pendingCount:pending.length,records,included,merged,pending};
}
export function evidenceMarkdown(pack){
 const rows=pack.included.map((r,i)=>`${i+1}. ${r.claim}\n   来源：${r.source}`);
 const pending=pack.pending.map(r=>`- [ ] ${r.claim||'补充观察内容'}（${r.reason}${r.source?'；填写来源：'+r.source:''}）`);
 return`# ${pack.question||'研究证据成果'}\n\n输入 ${pack.inputCount} 条；纳入 ${pack.includedCount} 条；合并重复 ${pack.mergedCount} 条；待补 ${pack.pendingCount} 条。\n\n## 有来源的观察\n\n${rows.join('\n\n')||'暂无可纳入记录。'}\n\n## 待补清单\n\n${pending.join('\n')||'暂无待补记录。'}\n\n## 重复合并记录\n\n${pack.merged.map(r=>`- 输入 ${r.id} 合并到输入 ${r.duplicateOf}：${r.claim}`).join('\n')||'暂无重复。'}\n\n## 整理规则\n\n${pack.rule}\n`;
}
function box(c,x,y,w,h,r,fill,line){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();if(line){c.strokeStyle=line;c.lineWidth=1;c.stroke();}}
function text(c,copy,x,y,size,color,width=1080,weight=500){c.font=`${weight} ${size}px Arial,'Microsoft YaHei',sans-serif`;let s=String(copy);while(s.length&&c.measureText(s).width>width)s=s.slice(0,-1);c.fillStyle=color;c.fillText(s+(s!==String(copy)?'…':''),x,y);}
function label(c,copy,x,y,color,size=13){c.font=`500 ${size}px 'Courier New','Microsoft YaHei',monospace`;c.fillStyle=color;c.fillText(copy,x,y);}
function sourceLabel(source){try{const u=new URL(source);return u.hostname+'/'+(u.pathname.split('/').filter(Boolean)[0]||'');}catch{return '待补来源';}}
export function renderEvidenceInput(c,pack,u,{ink,muted,accent,bg,product,detail,headline,sequence}){
 const move=sequence.input,appear=ease((move-.18)/.65),first=pack.records[0];
 renderLaunchInputSurface(c,sequence,{ink,muted,accent,bg});
 c.save();c.globalAlpha=appear;c.textAlign='center';text(c,product,640,157,86,ink,1150,800);c.restore();
 c.save();c.globalAlpha=appear;
 const sx=(578+370*move)/948,sy=(264+36*move)/300;
 c.translate(351-185*move-166*sx,203+16*move-219*sy);c.scale(sx,sy);
 label(c,`INPUT / 研究卡 01 · 共 ${pack.inputCount} 条`,208,260,'#737568');
 text(c,first?.claim||'写下第一条观察，并保留它的来源。',208,338,38,'#1c211b',843,700);
 c.strokeStyle='#c9cec0';c.beginPath();c.moveTo(208,381);c.lineTo(1071,381);c.stroke();
 label(c,'SOURCE',208,416,'#777e70');text(c,first?.source||'待补来源',208,456,19,'#465442',837);
 label(c,'内容和来源，将进入同一份成果包。',208,490,'#777e70',15);c.restore();
 c.save();c.globalAlpha=1-ease(move/.32);c.textAlign='center';text(c,headline.replaceAll('\n',''),640,580,54,ink,1080,800);text(c,`${pack.inputCount} 条研究卡 · 开启本地整理`,640,634,20,muted);c.restore();
 c.save();c.globalAlpha=ease((move-.42)/.58);text(c,pack.question||'观察，先有出处。',83,613,31,ink,1110,600);text(c,detail,83,655,19,muted,1110);c.restore();
}
export function renderEvidenceOutput(c,pack,p,{bg,ink,muted,accent,product,headline,detail,marker=true}){
 if(p<.55){const u=p/.55;
  text(c,headline.replaceAll('\n',''),83,126,49,ink,1120,800);
  label(c,u>.5?`TODO / ${pack.pendingCount} 条待补`:`INPUT / ${pack.inputCount} 条研究卡`,116,176,muted,16);label(c,`KEEP / ${pack.includedCount} 条有来源`,735,176,muted,16);
  const shown=pack.records.slice(0,6),step=shown.length>5?58:69;
  for(const r of shown){const kept=pack.included.findIndex(s=>s.id===(r.duplicateOf||r.id)),pending=pack.pending.findIndex(s=>s.id===r.id),k=ease((u-.08-(r.id-1)*.035)/.69),startY=207+(r.id-1)*step,targetY=215+(r.status==='needs-source'?pending:kept)*63,x=116+(r.status==='needs-source'?0:619*k),y=startY+(targetY-startY)*k;
   c.save();c.globalAlpha=r.status==='merged'?1-ease((k-.5)/.5):1;
   box(c,x,y,430,57,3,r.status==='needs-source'&&k>.7?'#eee8da':'#fffdf4','#24291d29');
   label(c,String(r.id).padStart(2,'0'),x+16,y+23,'#7c8274',12);text(c,r.claim||'补充观察内容',x+51,y+24,19,'#273421',355,600);
   label(c,k>.7?(r.status==='needs-source'?r.reason:r.status==='merged'?`合并到 ${r.duplicateOf}`:sourceLabel(r.source)):sourceLabel(r.source),x+51,y+45,'#69725e',12);
   c.restore();
  }
  label(c,`${pack.mergedCount} 条重复合并 · ${pack.pendingCount} 条待补来源`,116,645,muted,17);
  if(pack.inputCount>6)label(c,`画面展示前 6 条，成果包包含全部 ${pack.inputCount} 条。`,116,674,muted,13);
  c.fillStyle=accent;c.beginPath();c.arc(674,340,15,0,Math.PI*2);c.fill();
 }else{const u=(p-.55)/.45,enter=ease(u/.3);
  c.save();c.globalAlpha=enter;c.translate(0,(1-enter)*25);
  box(c,111,111,1058,481,5,'#f5f1e5');label(c,'EXPORT / 实际成果文件',159,158,'#73776a',14);
  text(c,pack.filename,159,232,53,'#20281c',943,800);text(c,pack.question||'研究证据成果',159,288,27,'#43533b',919,600);
  c.strokeStyle='#bcc3b2';c.beginPath();c.moveTo(159,310);c.lineTo(1120,310);c.stroke();
  pack.included.slice(0,3).forEach((r,i)=>{text(c,`${i+1}. ${r.claim}`,159,354+i*57,24,'#293c22',903,600);label(c,sourceLabel(r.source),183,378+i*57,'#727e68',13);});
  if(!pack.includedCount)text(c,'暂未纳入观察：先补充内容与来源。',159,373,27,'#73776a',900);
  if(pack.includedCount>3)label(c,`其余 ${pack.includedCount-3} 条也保留在实际文件中。`,159,520,'#727e68',14);
  label(c,`${pack.includedCount} 条纳入 · ${pack.mergedCount} 条重复合并 · ${pack.pendingCount} 条待补`,159,560,'#43533b',18);
  if(marker){c.fillStyle=accent;c.beginPath();c.arc(1116,154,14,0,Math.PI*2);c.fill();}c.restore();
  text(c,product,83,642,34,ink,650,800);label(c,'同一输入 · 同一画面 · 同一文件',759,640,muted,17);text(c,detail,83,675,18,muted,1110);
 }
}
