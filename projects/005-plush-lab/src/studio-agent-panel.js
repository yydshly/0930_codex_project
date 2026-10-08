import {STUDIO_AGENT_TASKS,runStudioAgentTask} from './studio-agent.js';

/** A local task view. Every status comes from an actual run; results stay drafts. */
export function mountStudioAgentPanel({readStore,openNote,download,viewReminders}) {
  const $=selector=>document.querySelector(selector);
  const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
  const taskSelect=$('#agent-task'),steps=$('#agent-steps'),events=$('#agent-events');
  let activeRun=null,result=null,source=null,sourceTaskId=null,disposed=false,eventCount=0;
  const listeners=[],timers=new Set();
  const listen=(element,event,fn)=>{element.addEventListener(event,fn);listeners.push(()=>element.removeEventListener(event,fn));};
  const fingerprint=(taskId,data)=>JSON.stringify(taskId==='notes_digest'?data.notes:taskId==='reminders_check'?data.reminders:{notes:data.notes,reminders:data.reminders,memories:data.memories,messageCounts:{total:data.messages.length,user:data.messages.filter(message=>message.role==='user').length}});
  const taskById=id=>STUDIO_AGENT_TASKS.find(task=>task.id===id);
  function activity(state,text) {
    const label=$('#agent-avatar-status');label.hidden=false;label.textContent=text;
    label.dataset.state=state;label.closest('.world-card').dataset.agentState=state;
  }
  function state(label,text,kind='idle') {
    $('#agent-state').textContent=label;$('#agent-state').dataset.state=kind;$('#agent-summary').textContent=text;
    activity(kind,text);
  }
  function renderPlan(task) {
    steps.replaceChildren();
    for(const [index,step] of task.steps.entries()) {
      const row=node('li',undefined,'agent-step');row.dataset.stepId=step.id;row.dataset.status='pending';
      const number=node('span',String(index+1),'agent-step-number'),content=node('div',undefined,'agent-step-content');
      content.append(node('strong',step.title),node('code',step.tool),node('p','等待执行','agent-step-detail'));
      row.append(number,content,node('span','待执行','agent-step-state'));steps.append(row);
    }
  }
  function appendEvent(packet) {
    const labels={started:'任务开始',completed:'任务完成',failed:'任务失败',cancelled:'任务已停止'};
    const statusLabels={running:'开始调用',completed:'调用完成',failed:'调用失败'};
    const line=packet.type==='step'?`${statusLabels[packet.status]||packet.status} · ${packet.tool} · ${packet.detail||''}`:
      `${labels[packet.type]||packet.type} · ${packet.error||packet.summary||packet.title||''}`;
    const row=node('li');row.append(node('time',new Date().toLocaleTimeString('zh-CN',{hour12:false})),node('span',line));events.append(row);
    eventCount++;$('#agent-event-count').textContent=String(eventCount);
    while(events.childElementCount>30)events.firstElementChild.remove();
  }
  function onEvent(run,packet) {
    if(disposed||activeRun!==run)return;
    appendEvent(packet);
    if(packet.type==='step') {
      const row=Array.from(steps.children).find(item=>item.dataset.stepId===packet.stepId);if(!row)return;
      row.dataset.status=packet.status;row.querySelector('.agent-step-state').textContent={running:'执行中',completed:'已完成',failed:'失败'}[packet.status]||packet.status;
      row.querySelector('.agent-step-detail').textContent=packet.detail||'';
      if(packet.status==='running')state('执行中',row.querySelector('strong').textContent,'running');
    }
  }
  function yieldControl(run) {
    if(disposed||activeRun!==run||run.abort.signal.aborted)return Promise.resolve();
    if(!run.stepMode)return new Promise(resolve=>{const timer=setTimeout(()=>{timers.delete(timer);resolve();},0);timers.add(timer);run.release=()=>{clearTimeout(timer);timers.delete(timer);resolve();};});
    const remaining=Array.from(steps.children).find(row=>row.dataset.status==='pending');
    state('等待继续',remaining?'下一步：'+remaining.querySelector('strong').textContent:'等待任务继续','waiting');$('#agent-next').hidden=false;
    return new Promise(resolve=>{run.release=()=>{run.release=null;$('#agent-next').hidden=true;resolve();};});
  }
  function resetTask() {
    const task=taskById(taskSelect.value);$('#agent-description').textContent=task.description;renderPlan(task);
    result=null;source=null;sourceTaskId=null;$('#agent-result').hidden=true;events.replaceChildren();eventCount=0;$('#agent-event-count').textContent='0';
    state('待命','准备执行：'+task.title);$('#agent-next').hidden=true;
  }
  for(const task of STUDIO_AGENT_TASKS){const option=node('option',task.title);option.value=task.id;taskSelect.append(option);}
  listen(taskSelect,'change',resetTask);
  listen($('#agent-next'),'click',()=>activeRun?.release?.());
  listen($('#agent-stop'),'click',()=>{if(!activeRun)return;activeRun.abort.abort();activeRun.release?.();$('#agent-stop').disabled=true;});
  listen($('#agent-form'),'submit',async event=>{
    event.preventDefault();if(disposed||activeRun)return;
    const task=taskById(taskSelect.value);resetTask();
    const run={abort:new AbortController(),stepMode:$('#agent-step-mode').checked,release:null};activeRun=run;
    $('#agent-run').disabled=true;taskSelect.disabled=true;$('#agent-step-mode').disabled=true;$('#agent-stop').disabled=false;
    try {
      const completed=await runStudioAgentTask({taskId:task.id,now:Date.now,signal:run.abort.signal,onEvent:packet=>onEvent(run,packet),yieldControl:()=>yieldControl(run),readStore:()=>{
        const current=readStore();if(current.ok){source=fingerprint(task.id,current.data);sourceTaskId=task.id;}return current;
      }});
      if(disposed||activeRun!==run||run.abort.signal.aborted)return;
      result=completed;$('#agent-result-title').textContent=completed.title;$('#agent-result-body').textContent=completed.body;$('#agent-result').hidden=false;
      $('#agent-reminders').hidden=task.id!=='reminders_check';state('已完成',completed.summary,'completed');
      recordsChanged(readStore());
    } catch(error) {
      if(disposed||activeRun!==run)return;
      if(error.name==='AbortError') {
        for(const row of steps.children)if(row.dataset.status!=='completed'){row.dataset.status='cancelled';row.querySelector('.agent-step-state').textContent='已停止';}
        state('已停止','任务已停止，现有记录保持原样。','cancelled');
      } else state('执行失败',error.message||'无法完成任务，请重新运行。','failed');
    } finally {
      if(activeRun===run&&!disposed){activeRun=null;$('#agent-run').disabled=false;taskSelect.disabled=false;$('#agent-step-mode').disabled=false;$('#agent-stop').disabled=true;$('#agent-next').hidden=true;}
    }
  });
  listen($('#agent-save-note'),'click',()=>{if(result)openNote({...result.noteDraft,shareWithAI:false});});
  listen($('#agent-export'),'click',()=>{if(result)download('# '+result.title+'\n\n'+result.body,'md','text/markdown;charset=utf-8');});
  listen($('#agent-reminders'),'click',viewReminders);
  function recordsChanged(current) {
    if(disposed||!result||!sourceTaskId)return;
    const stale=!current.ok||fingerprint(sourceTaskId,current.data)!==source;
    $('#agent-result').classList.toggle('stale',stale);
    if(stale){$('#agent-summary').textContent=current.ok?'本机记录已更新，当前结果来自上次快照。重新运行可获取最新结果。':'当前无法读取本机记录，结果来自上次成功读取的快照。';}
    else if(!activeRun)$('#agent-summary').textContent=result.summary;
  }
  resetTask();
  return {recordsChanged,dispose(){disposed=true;activeRun?.abort.abort();activeRun?.release?.();activeRun=null;for(const timer of timers)clearTimeout(timer);timers.clear();for(const off of listeners)off();}};
}
