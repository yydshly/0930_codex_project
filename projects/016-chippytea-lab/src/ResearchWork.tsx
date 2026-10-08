import React, { useEffect, useRef, useState } from 'react';
import { InkBox } from './upstream/components/InkBox';
import { FishSvg, Tape, MugDoodle } from './upstream/components/art';
import { getAudioContext, playChime } from './upstream/lib/chime';
import snapshotData from '../web/research-state.json';

type Check = { id:string; label:string; required:boolean; outcome:'pass'|'fail'|'optional'; path:string; detail:string };
type Receipt = { id:string; projectId:number; name:string; serial:number; fingerprint:string; checkedAt:string; current?:boolean; checks:Check[] };
type Project = { id:number; slug:string; name:string; status:string; path:string; cover:string; reference?:string; repo?:string; checks:Check[]; ready:boolean; fingerprint:string; receipt:Receipt|null };
type WorkState = { mode:'live'|'snapshot'; scannedAt:string; projects:Project[]; receipts:Receipt[]; total:number; readyCount:number; uncollectedReadyCount:number; ledgerPath:string };
const snapshot = snapshotData as unknown as WorkState;
const fallback = {...snapshot, mode:'snapshot' as const};
const number = (n:number) => String(n).padStart(3,'0');
const date = (value:string) => new Date(value).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
const local = ['127.0.0.1','localhost'].includes(window.location.hostname);
export const workUrl = local ? 'http://127.0.0.1:8977/projects/016-chippytea-lab/?view=research' : './?view=research';
function coverUrl(p:Project) { return p.cover ? `./assets/research-covers/${number(p.id)}${p.cover.slice(p.cover.lastIndexOf('.'))}` : ''; }

async function request(url:string, options?:RequestInit) {
  const controller=new AbortController(); const timeout=window.setTimeout(()=>controller.abort(),7000);
  try {
    const response=await fetch(url,{...options,signal:controller.signal,cache:'no-store'});
    if(!response.headers.get('content-type')?.includes('application/json')) throw new Error('当前预览没有连接本机核验服务。');
    const result=await response.json();
    if(!response.ok) throw new Error(result.error || '核验失败，请检查工作区资料。');
    return result;
  } finally { window.clearTimeout(timeout); }
}

export function ResearchWork() {
  const [state,setState]=useState<WorkState>(fallback);
  const [selected,setSelected]=useState(snapshot.projects.some(p=>p.id===16)?16:snapshot.projects[0]?.id);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [filter,setFilter]=useState<'all'|'pending'|'collected'>('all');
  const [sound,setSound]=useState(true);
  const [soundStatus,setSoundStatus]=useState('入册时播放 0.67 秒短音效');
  const [message,setMessage]=useState('选一份真实研究，核对资料后，让它进入收集册。');
  const [error,setError]=useState('');
  const [displayTotal,setDisplayTotal]=useState(snapshot.total);
  const [arriving,setArriving]=useState<number|null>(null);
  const [stamp,setStamp]=useState<number|null>(null);
  const [flight,setFlight]=useState<{project:Project;from:DOMRect;to:DOMRect}|null>(null);
  const [receiptOpen,setReceiptOpen]=useState(false);
  const [evidenceOpen,setEvidenceOpen]=useState(false);
  const [query,setQuery]=useState('');
  const paperRef=useRef<HTMLDivElement>(null);
  const actionRef=useRef<HTMLDivElement>(null);
  const albumRef=useRef<HTMLDivElement>(null);
  const flightRef=useRef<HTMLDivElement>(null);
  const timers=useRef<number[]>([]);
  const countRaf=useRef(0);
  const counterValue=useRef(snapshot.total);
  const mounted=useRef(true);
  const active=state.projects.find(p=>p.id===selected) || state.projects[0];
  const listed=state.projects.filter(p=>(filter==='all'||(filter==='pending'?!p.receipt:!!p.receipt)) && `${number(p.id)} ${p.name}`.toLowerCase().includes(query.toLowerCase()));

  useEffect(()=>{
    document.title='研究收集册 · 真实工作与完成反馈';
    mounted.current=true; void refresh(false);
    return()=>{mounted.current=false;timers.current.forEach(window.clearTimeout);cancelAnimationFrame(countRaf.current);};
  },[]);

  async function refresh(announce=true) {
    if(!local){setLoading(false);setState(fallback);setMessage('公开站展示构建时的资料与回执快照；重新核验和保存需运行本机服务。');return;}
    setLoading(true);setError('');
    try {
      const result=await request('/api/research/state');
      if(mounted.current) {
        setState(result);counterValue.current=result.total;setDisplayTotal(result.total);
        if(!announce){
          const preferred=[16,15,8,10].map(id=>result.projects.find((p:Project)=>p.id===id&&!p.receipt&&p.ready)).find(Boolean);
          const next=preferred||result.projects.find((p:Project)=>!p.receipt&&p.ready);
          if(next)setSelected(next.id);
        }
        if(announce)setMessage('已重新读取当前工作区，核验结果已更新。');
      }
    } catch(e) {
      if(mounted.current){setState(fallback);counterValue.current=fallback.total;setDisplayTotal(fallback.total);setError(`${(e as Error).message} 正在展示构建时的只读快照。`);}
    } finally { if(mounted.current)setLoading(false); }
  }

  useEffect(()=>{
    if(!flight || !flightRef.current) return;
    const node=flightRef.current;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduced){setFlight(null);setArriving(null);return;}
    const from=flight.from;
    const to=albumRef.current?.querySelector(`[data-project-id="${flight.project.id}"]`)?.getBoundingClientRect()||flight.to;
    const endX=to.left+to.width/2-from.left-from.width/2;
    const endY=to.top+to.height/2-from.top-from.height/2;
    const scale=Math.min(0.75,to.width*.95/from.width);
    const animation=node.animate([
      {transform:'translate(0,0) rotate(0deg) scale(1)',opacity:1,offset:0},
      {transform:`translate(${endX*.48}px,${Math.min(-45,endY*.35)}px) rotate(-7deg) scale(.8)`,opacity:1,offset:.4},
      {transform:`translate(${endX}px,${endY}px) rotate(3deg) scale(${scale})`,opacity:1,offset:.88},
      {transform:`translate(${endX}px,${endY}px) rotate(0deg) scale(${scale*.95})`,opacity:0,offset:1},
    ],{duration:1300,easing:'cubic-bezier(.22,.7,.3,1)',fill:'forwards'});
    animation.onfinish=()=>{if(mounted.current){setFlight(null);setArriving(null);}};
    return()=>animation.cancel();
  },[flight]);

  function tickTo(total:number,reduced:boolean) {
    const from=counterValue.current;const start=performance.now();cancelAnimationFrame(countRaf.current);
    function step(now:number){const p=reduced?1:Math.min(1,(now-start)/800);counterValue.current=Math.round(from+(total-from)*(1-Math.pow(1-p,3)));setDisplayTotal(counterValue.current);if(p<1)countRaf.current=requestAnimationFrame(step);}
    countRaf.current=requestAnimationFrame(step);
  }

  async function collect() {
    if(!active || state.mode!=='live' || busy || loading) return;
    setBusy(true);setError('');setReceiptOpen(false);
    setMessage(`正在核对 ${number(active.id)} 的目录、来源、说明、研究笔记和主索引…`);
    let audioAvailable=false;
    if(sound) try{const context=getAudioContext(); await context.resume(); audioAvailable=context.state==='running'; setSoundStatus(audioAvailable?'声音已就绪':'浏览器暂未开放声音');}catch{setSoundStatus('浏览器暂未开放声音');}
    try {
      const result=await request('/api/research/collect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:active.id})});
      const fresh:WorkState=await request('/api/research/state').catch(()=>({
        ...state,scannedAt:result.receipt.checkedAt,total:result.total,
        projects:state.projects.map(p=>p.id===active.id?result.project:p),
        receipts:result.newReceipt?[...state.receipts,result.receipt]:state.receipts.map(r=>r.projectId===active.id?result.receipt:r),
      }));
      if(!mounted.current)return;
      setState(fresh);setStamp(active.id);
      if(result.newReceipt){
        const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const anchor=actionRef.current?.getBoundingClientRect(); const to=albumRef.current?.getBoundingClientRect();
        const from=anchor?new DOMRect(anchor.left,anchor.top-115,Math.min(340,anchor.width),245):undefined;
        if(!reduced && from && to){setArriving(active.id);setFlight({project:active,from,to});}
        setMessage(`「${active.name}」已入册。第 ${number(result.receipt.serial)} 张回执已保存到工作区。`);
        timers.current.push(window.setTimeout(()=>{if(mounted.current){tickTo(fresh.total,reduced);if(sound && audioAvailable){playChime();setSoundStatus('已播放本次入册短音效');}}},reduced?0:1000));
      }else{
        counterValue.current=fresh.total;setDisplayTotal(fresh.total);
        setMessage(result.updatedReceipt?'资料发生变化，核验回执已更新；收集数量保持不变。':'这份研究已收录，本次核对没有增加数量。');
      }
      timers.current.push(window.setTimeout(()=>mounted.current&&setStamp(null),1800));
    }catch(e){setError((e as Error).message);setMessage('本次没有入册，收集数量保持不变。');}
    finally{if(mounted.current)setBusy(false);}
  }

  function exportReceipt() {
    if(!active?.receipt)return;
    const text=JSON.stringify({type:'workspace-research-receipt',scope:'工作区资料与索引结构核验，不代表研究质量、浏览器验收或原生能力通过',...active.receipt},null,2);
    const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`research-${number(active.id)}-receipt.json`;a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  if(!active)return <main className="work-shell"><h1>工作区还没有研究记录。</h1></main>;
  const passed=active.checks.filter(c=>c.required && c.outcome==='pass').length;
  const required=active.checks.filter(c=>c.required).length;
  const collected=!!active.receipt;
  return <div className="research-work">
    <header className="work-header"><a className="work-brand" href="./"><FishSvg height={28} uid="work-brand"/><span>研究收集册 <small>CHIPPYTEA LAB / 016</small></span></a><div className="work-header-links"><a href="./">理解与全部入口</a><a href="./?view=source">原作对照</a><a href="../../">总索引 ↗</a></div></header>
    <main className="work-shell">
      <section className="work-intro"><div><p className="eyebrow">一个来自我们工作区的真实场景</p><h1>让一份研究，<br/><span>落在册里。</span></h1><p>我们经常看一个案例、理解它、做成展示，再整理进索引。<br className="desktop-break"/>核对留下的资料，让这次积累有一个清楚的落点。</p></div><div className="work-explanation"><MugDoodle/><p>真实项目 → 资料核验 → 保存回执<br/><strong>卡片入册 · 数字增长 · 短声音</strong></p><span>声音和动画，只在新增回执确认后发生。</span></div></section>
      <div className="work-sourcebar"><span className={`work-dot ${state.mode==='live'?'live':''}`}/><strong>{loading?'正在连接工作区':state.mode==='live'?'已连接本机工作区':'只读工作区快照'}</strong><span>{date(state.scannedAt)} 核对</span><button onClick={()=>refresh()} disabled={busy||loading}>刷新资料</button></div>
      {state.mode==='snapshot' && !loading && <div className="work-offline"><p>当前展示构建时的真实资料快照。入册需要本机核验服务。</p>{local?<a href={workUrl}>打开本机入册体验 ↗</a>:<span>下载项目并运行 research_server.py，可核验自己的工作区。</span>}</div>}
      <div className="work-stats"><div><strong>{state.projects.length}</strong><span>在册项目</span></div><div><strong>{state.readyCount}</strong><span>资料核验符合条件</span></div><div className="collection-count"><strong>{loading?'—':displayTotal}</strong><span>已保存入册回执</span></div><p>数量来自当前项目记录，<br/>用来说明反复流程，不代表每天的耗时统计。</p></div>
      <div className="work-grid">
        <aside className="work-picker"><div className="picker-heading"><h2>选一份研究</h2><span>{listed.length} 项</span></div><label className="work-search"><span>查找项目</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="编号或项目名"/></label><div className="work-filters" aria-label="筛选研究"><button aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>全部</button><button aria-pressed={filter==='pending'} onClick={()=>setFilter('pending')}>待入册</button><button aria-pressed={filter==='collected'} onClick={()=>setFilter('collected')}>已入册</button></div><div className="project-picker-list">{listed.map(p=><button disabled={busy} onClick={()=>{setSelected(p.id);setReceiptOpen(false);setError('');setMessage('核验当前资料后，保存一张不会重复计数的回执。');}} key={p.id} aria-pressed={p.id===active.id} className={`project-pick ${p.receipt?'collected':''}`}><span className="pick-number">{number(p.id)}</span><span><strong>{p.name.split(' · ')[0]}</strong><small>{p.receipt?(p.receipt.current===false?'资料有更新':'已入册'):p.ready?'可核验入册':'资料待补齐'} · {p.status}</small></span><span className="pick-mark" aria-hidden="true">{p.receipt?'✓':'→'}</span></button>)}{listed.length===0&&<p className="picker-empty">这个筛选下还没有研究。</p>}</div></aside>
        <div className="work-main">
          <div className="research-paper" ref={paperRef}><Tape uid="research-paper" className="research-tape"/><div className="paper-top"><p className="eyebrow">RESEARCH RECORD / {number(active.id)}</p><span className={`paper-status ${collected?'collected':''}`}>{collected?'已入册':active.ready?'资料齐备':'待补齐'}</span></div><div className="paper-title"><div><h2>{active.name}</h2><p>{active.path}</p></div>{active.cover && <img src={coverUrl(active)} alt={`${active.name} 的实际项目封面`}/>}</div><div className="paper-divider"><span>资料核验</span><span>{passed} / {required} 项必要资料</span></div><ul className={`research-checks ${evidenceOpen?'show-evidence':''}`}>{active.checks.map(c=><li key={c.id} className={`check-${c.outcome}`}><span className="check-symbol" aria-hidden="true">{c.outcome==='pass'?'✓':c.outcome==='fail'?'!':'·'}</span><div><strong>{c.label}{!c.required&&<small>可选</small>}</strong><p>{c.detail}</p><code>{c.path}</code></div></li>)}</ul><button className="evidence-toggle" onClick={()=>setEvidenceOpen(!evidenceOpen)}>{evidenceOpen?'收起核验依据':'查看核验依据'}</button><p className="check-scope">核对文件、来源和索引的结构；内容质量、实际效果和浏览器验收由对应研究记录说明。</p><div className="paper-actions" ref={actionRef}><InkBox variant="primary" seed={901} className="collect-button" onClick={collect} disabled={busy||loading||state.mode!=='live'||!active.ready}>{busy?'正在核验…':collected?(active.receipt?.current===false?'更新核验回执':'再次核对资料'):'核验并入册'}</InkBox>{[1,2,3,4,5,6,7,8,9,10,11,12,13,15,16].includes(active.id)?<a href={`../${number(active.id)}-${active.slug}/`}>查看实际展示 ↗</a>:<span>该项目尚未公开部署</span>}</div>{collected&&<div className="receipt-links"><button onClick={()=>setReceiptOpen(!receiptOpen)}>{receiptOpen?'收起回执':'查看已保存回执'}</button><button onClick={exportReceipt}>导出回执 JSON</button></div>}{receiptOpen&&active.receipt&&<div className="receipt-details"><strong>第 {number(active.receipt.serial)} 张 · {date(active.receipt.checkedAt)}</strong><code>{active.receipt.id}</code><p>指纹 {active.receipt.fingerprint.slice(0,16)}…</p><p>该项目仅占一个收集位置；资料更新时可以复核，数量不增加。</p></div>}{stamp===active.id&&<div className="verified-stamp" aria-hidden="true">核验已保存</div>}</div>
          <div className={`work-feedback ${error?'has-error':''}`} role="status"><strong>{error || message}</strong><span>{busy?'正在读取实际资料，确认后才保存。':collected?'回执保存在当前工作区；刷新浏览器后仍然保留。':'每个项目只占一个收集位置，检查未通过时不入册。'}</span></div>
          <div className="work-sound"><label><input type="checkbox" checked={sound} onChange={e=>{setSound(e.target.checked);setSoundStatus(e.target.checked?'入册时播放 0.67 秒短音效':'声音已关闭');}}/>入册时播放轻声音</label><span>{sound?soundStatus:'声音已关闭'}</span><button onClick={()=>{setSound(true);try{playChime();setSoundStatus('已试听短音效');}catch{setSoundStatus('浏览器暂未开放声音');}}}>试听</button></div>
        </div>
      </div>
      <section className="research-album" ref={albumRef}><div className="album-heading"><div><p className="eyebrow">THE WORK WE HAVE KEPT</p><h2>已经留下的积累。</h2></div><span>{displayTotal} 份回执 · 永远可以回来查看</span></div>{state.receipts.length===0?<div className="album-empty"><p>收集册还没有回执。</p><span>选择一份已有研究，完成核验后，第一张卡片会落在这里。</span></div>:<div className="album-cards">{state.receipts.map(r=>{const p=state.projects.find(p=>p.id===r.projectId);return <button data-project-id={r.projectId} key={r.id} onClick={()=>{setSelected(r.projectId);setReceiptOpen(true);setMessage('这是已经核验并保存的研究回执。');}} className={`album-card ${arriving===r.projectId?'arrival-pending':''}`}><span className="album-serial">第 {number(r.serial)} 张</span>{p?.cover?<img src={coverUrl(p)} alt=""/>:<div className="album-no-cover">{number(r.projectId)}<span>暂无封面</span></div>}<strong>{r.name.split(' · ')[0]}</strong><small>{date(r.checkedAt)} · 已核验入册</small></button>;})}</div>}</section>
      <section className="work-thinking"><div><p className="eyebrow">这次实验回答什么</p><h2>把“做过了”，变成可回看的积累。</h2></div><p>研究是当前工作区里反复出现的流程。每次都有来源、说明、展示和索引，容易花时间核对，也容易只感到“又做完一项”。这次用真实资料核验减少漏项，再给保存成功一个短暂、明确的完成反馈。</p><p>可以继续观察：是否更容易发现缺失资料，是否知道这次保存了什么，是否愿意回来找旧研究。当前没有测量节省时间、完成率或留存变化。</p></section>
      <footer className="work-footer"><span>真实读取工作区记录 · 回执持久保存 · 无重复计数</span><a href="./source-notice.html">绘图与声音来源</a><a href="./">回到 Chippytea 研究</a></footer>
    </main>
    {flight&&<div ref={flightRef} className="flying-research-card" style={{left:flight.from.left,top:flight.from.top,width:flight.from.width,height:Math.min(flight.from.height,300)}} aria-hidden="true"><span>第 {number(state.total)} 张研究回执</span>{flight.project.cover&&<img src={coverUrl(flight.project)} alt=""/>}<strong>{flight.project.name}</strong><small>来源与资料已核验</small></div>}
  </div>;
}
