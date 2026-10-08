import React, {useCallback, useEffect, useRef, useState} from 'react';
import {PerformanceStage} from './PerformanceStage';
import {createPerformanceAudio, MUSIC_SRC, MUSIC_SECONDS} from './performanceAudio';
import snapshotData from '../web/research-state.json';
import musicReceipt from '../notes/music-generation.json';

type Receipt={projectId:number;serial:number;id:string;checkedAt:string};
type Project={id:number;slug:string;name:string;cover:string;ready:boolean;receipt:Receipt|null};
type State={mode:string;projects:Project[];receipts:Receipt[];total:number};
type Phase='preview'|'checking'|'playing'|'paused'|'ended';
const pad=(n:number)=>String(n).padStart(3,'0');
const cover=(p:Project)=>p.cover?`./assets/research-covers/${pad(p.id)}${p.cover.slice(p.cover.lastIndexOf('.'))}`:'';
const fallback={...snapshotData,mode:'snapshot'} as unknown as State;
const musicReady=String(musicReceipt.status)==='succeeded';
const local=['127.0.0.1','localhost'].includes(window.location.hostname);

async function request(path:string,options?:RequestInit){
  if(!local)throw new Error('公开站使用只读资料快照，核验与保存需运行本机服务。');
  const controller=new AbortController();const timer=window.setTimeout(()=>controller.abort(),7000);
  try{
    const response=await fetch(path,{...options,cache:'no-store',signal:controller.signal});
    if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('当前是静态预览，请连接本机 8977 服务进行资料核验。');
    const data=await response.json();if(!response.ok)throw new Error(data.error||'资料核验未通过。');return data;
  }finally{clearTimeout(timer);}
}

export function Experience(){
  const [state,setState]=useState<State>(fallback);
  const [selected,setSelected]=useState(16);
  const [phase,setPhase]=useState<Phase>('preview');
  const [runKey,setRunKey]=useState(0);
  const [muted,setMuted]=useState(false);
  const [loading,setLoading]=useState(true);
  const [notice,setNotice]=useState(musicReady?'静音预演正在循环。点击播放，让配乐与画面一起开始。':'纸墨预演正在循环。MiniMax 配乐准备中。');
  const [error,setError]=useState('');
  const phaseRef=useRef<Phase>('preview');
  const audio=useRef<ReturnType<typeof createPerformanceAudio>|null>(null);
  const audioElement=useRef<HTMLAudioElement|null>(null);
  const previewStart=useRef(performance.now());
  const mounted=useRef(true);
  const version=useRef(0);
  const playingProject=useRef<Project|null>(null);
  const active=state.projects.find(p=>p.id===selected)||state.projects[0];
  const project=playingProject.current&&phase!=='preview'?playingProject.current:active;
  function change(next:Phase){phaseRef.current=next;setPhase(next);}
  const clock=useCallback(()=>{
    if(phaseRef.current==='preview'||phaseRef.current==='checking')return (performance.now()-previewStart.current)/1000/MUSIC_SECONDS*16%16;
    if(phaseRef.current==='ended')return 16;
    return audio.current ? audio.current.time()/audio.current.duration()*16 : 0;
  },[]);
  const energy=useCallback(()=>audio.current?.energy()||0,[]);
  useEffect(()=>{
    document.title='研究成册 · 纸墨与音乐实验';mounted.current=true;
    request('/api/research/state').then(data=>{if(mounted.current)setState(data);}).catch(()=>{if(mounted.current)setNotice(musicReady?'静态资料预演。已保存的成果也可以播放声画演出。':'静态资料预演。MiniMax 配乐准备中。');}).finally(()=>{if(mounted.current)setLoading(false);});
    return()=>{mounted.current=false;version.current++;audio.current?.dispose();};
  },[]);
  async function perform(){
    if(!active||phaseRef.current==='checking')return;
    if(!musicReady){stop();setNotice('配乐准备中，先看纸墨预演。');return;}
    const currentVersion=++version.current;
    audio.current?.stop();playingProject.current=active;
    change('checking');setError('');setNotice(state.mode==='live'?'正在核对这份真实研究…':'正在准备已保存成果的演出…');
    try{
      let serial=active.receipt?.serial||0;
      if(state.mode==='live'&&!active.receipt){
        const result=await request('/api/research/collect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:active.id})});
        if(!mounted.current||currentVersion!==version.current)return;
        serial=result.receipt.serial;
        setState(current=>({...current,total:result.total,projects:current.projects.map(p=>p.id===active.id?result.project:p),receipts:result.newReceipt?[...current.receipts,result.receipt]:current.receipts.map(r=>r.projectId===active.id?result.receipt:r)}));
        playingProject.current={...active,receipt:result.receipt};
        setNotice(result.newReceipt?`真实回执 #${pad(serial)} 已保存，这次完成开始演出。`:`真实回执 #${pad(serial)} · 重演这份成果，收集数量保持不变。`);
      }else{
        if(!active.receipt)throw new Error('这份资料还没有已保存回执。请打开本机核验服务，或选择已入册的研究。');
        setNotice(`${state.mode==='live'?'真实':'快照'}回执 #${pad(serial)} · 重演已保存的成果，收集数量保持不变。`);
      }
      if(!audioElement.current)throw new Error('配乐播放器尚未准备好。');
      const track=audio.current||createPerformanceAudio(audioElement.current);audio.current=track;track.setMuted(muted);
      await track.start();
      if(!mounted.current||currentVersion!==version.current)return;
      setRunKey(key=>key+1);change('playing');
    }catch(e){if(!mounted.current||currentVersion!==version.current)return;audio.current?.stop();playingProject.current=null;change('preview');setError((e as Error).message);setNotice('当前演出未开始。补齐提示中的资料后，可以再播放。');}
  }
  async function togglePause(){
    if(phaseRef.current==='playing'){audio.current?.pause();change('paused');}
    else if(phaseRef.current==='paused'){try{await audio.current?.resume();change('playing');}catch{setError('音频暂未恢复，请重新播放。');}}
  }
  const stop=useCallback(()=>{version.current++;audio.current?.stop();playingProject.current=null;previewStart.current=performance.now();phaseRef.current='preview';setPhase('preview');setRunKey(key=>key+1);setNotice('静音预演正在循环。可以选择另一份成果再演一次。');},[]);
  const finish=useCallback(()=>{if(phaseRef.current==='playing'){audio.current?.stop();phaseRef.current='ended';setPhase('ended');}},[]);
  useEffect(()=>{function escape(event:KeyboardEvent){if(event.key==='Escape')stop();}window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[stop]);
  if(!project)return <main><h1>工作区还没有研究项目。</h1></main>;
  return <div className={`experience experience-${phase}`}>
    <audio ref={audioElement} src={musicReady?MUSIC_SRC:undefined} preload="auto" data-provider={musicReady?'MiniMax':'pending'} onEnded={finish}/>
    <PerformanceStage project={{id:project.id,name:project.name,coverUrl:cover(project),serial:project.receipt?.serial||0}} playing={phase!=='paused'&&phase!=='ended'} runKey={runKey} clock={clock} energy={energy} onComplete={finish} onClose={stop}/>
    <header className="experience-header"><a href="./" className="experience-brand"><svg width="30" height="35" viewBox="0 0 34 40" fill="none" aria-hidden="true"><path d="M6 3 29 4 28 35 5 36 6 3ZM9 2 8 36M12 10 24 11M12 16 22 16M12 22 25 23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M20 3 20 13 23 10 26 13 26 4" fill="#c9a05a"/></svg><span>研究成册<span>让线索，成为自己的成果。</span></span></a><div className="experience-nav"><a href="./?view=research&mode=records">资料与真实回执</a><a href="./?view=source">Chippytea 风格来源</a></div></header>
    <div className="experience-mode"><span className={phase==='playing'?'pulse-live':''}/>{phase==='preview'?(musicReady?'静音预演 · 点击下方开启配乐':'纸墨预演 · 配乐准备中'):phase==='checking'?'核对真实资料':phase==='paused'?'已暂停 · 音乐与画面一起停住':phase==='ended'?'这一份成果，留下了。':'MiniMax 配乐 × 纸墨动画 · 随音乐一起展开'}</div>
    <div className="experience-dock">
      <div className="experience-source"><label htmlFor="experience-project">今天演出哪份研究</label><select id="experience-project" value={selected} disabled={phase==='checking'||phase==='playing'||phase==='paused'} onChange={e=>{stop();setSelected(Number(e.target.value));}}>{state.projects.map(p=><option value={p.id} key={p.id}>{pad(p.id)} · {p.name.split(' · ')[0]}{p.receipt?' · 已入册':''}</option>)}</select><span>{state.mode==='live'?'来自本机真实工作区':'已保存资料快照'} · {state.total} 份回执</span></div>
      <div className="experience-actions"><button className="experience-play" onClick={perform} disabled={loading||phase==='checking'||(state.mode==='live'&&!active.ready&&!active.receipt)}>{phase==='checking'?'核验中…':phase==='ended'?'↻ 再演一次':phase==='playing'||phase==='paused'?'↻ 从头演出':(musicReady?'▶ 播放：音乐 + 完整演出':'↻ 重新观看纸墨预演')}<small>24 秒 · 连线、批注、翻页、装订与落印</small></button><div className="experience-small-controls">{(phase==='playing'||phase==='paused')&&<button onClick={togglePause}>{phase==='paused'?'继续':'暂停'}</button>}{musicReady&&<button aria-pressed={muted} onClick={()=>{setMuted(!muted);audio.current?.setMuted(!muted);}}>{muted?'打开声音':'静音'}</button>}{phase!=='preview'&&<button onClick={stop}>回到预演</button>}</div></div>
      <div className="experience-score"><span>为“研究成册”而作</span><strong>线索 → 联接 → 装订 → 入册</strong><small>{musicReady?'MiniMax 配乐 · 纸墨动画':'MiniMax 配乐准备中'}</small></div>
      <p className={`experience-notice ${error?'is-error':''}`} role="status">{error||notice}</p>
    </div>
  </div>;
}
