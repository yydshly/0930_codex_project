'use strict';
(() => {
  const D=WITR_DATA;
  const state={os:'windows',scenario:'port',mode:'standard',step:0,result:null};
  const $=id=>document.getElementById(id);
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function pressed(selector,key,value){document.querySelectorAll(selector).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[key]===value)));}
  function output(r){
    if(state.mode==='json') return JSON.stringify({demo:true,schema:'witr-lab/1 (教学结构，非上游原样输出)',platform:r.platform,target:r.query,process:r.process,ancestry:r.ancestry,source:r.source,context:{cwd:r.cwd,git:r.git,container:r.container||null},warnings:r.warnings},null,2);
    if(state.mode==='tree') return r.ancestry.length?r.ancestry.map((p,i)=>'  '.repeat(Math.max(0,i-1))+(i?'└─ ':'')+p.name+' (pid '+p.pid+')').join('\n'):'容器元数据查询\n宿主机进程链：本示例不提供\nDocker / Compose 项目：demo\n└─ demo-redis-1 [redis:7]';
    if(r.container) return `Container   ${r.container.name}\nImage       ${r.container.image}\nSource      ${r.source}\nProject     ${r.container.project}\nService     ${r.container.service}\nPort        6379 (示例映射)\n\n示例不提供跨虚拟机的完整进程链。`;
    return `Process     ${r.process.name} (pid ${r.process.pid})\nCommand     ${r.command}\nSource      ${r.source}\nWorking Dir ${r.cwd}\nGit         ${r.git}\n${r.file?'File        '+r.file:r.port?'Socket      127.0.0.1:'+r.port:'Service     demo-worker'}\n\n${r.ancestry.map(p=>p.name).join(' → ')}`;
  }
  function renderResult(r){
    state.result=r;$('output').textContent=output(r);$('source-tag').textContent=r.source;$('meaning').textContent=r.meaning;
    $('chain-caption').textContent=r.container?'容器管理关系示意；不等同于操作系统父进程链。':'根据当前父进程关系逐级追溯。';
    const nodes=r.container?[{name:'Docker',note:'容器运行时'},{name:'demo',note:'Compose 项目'},{name:'demo-redis-1',note:'redis:7 · 查询目标'}]:r.ancestry;
    $('chain').innerHTML=nodes.map((p,i)=>`<li class="${i===nodes.length-1?'target':''}"><span class="node-icon" aria-hidden="true">${i===nodes.length-1?'›_':'⌘'}</span><span class="node-info"><strong>${escape(p.name)}</strong><small>${escape(p.note)}</small></span>${p.pid?`<span class="node-pid">PID ${p.pid}</span>`:''}</li>`).join('');
    $('result-meta').innerHTML=r.container?'<span><strong>demo</strong>Compose 项目</span><span><strong>redis:7</strong>镜像示例</span>':`<span><strong>${r.memory}</strong>内存 · 示例</span><span><strong>${r.cpu}</strong>CPU · ${state.os==='windows'||state.os==='linux'?'生命周期平均示例':'ps 口径示例'}</span><span><strong>${r.ancestry.length}</strong>可见进程节点</span>`;
    $('exit-code').textContent='EXIT 0 · 示例查询成功';pressed('[data-mode]','mode',state.mode);
  }
  function renderStep(){const names=['定位 PID','采集状态','追溯祖先','识别来源','组织结果'];$('pipeline').innerHTML=names.map((name,i)=>`<button data-step="${i}" aria-pressed="${state.step===i}"><span>0${i+1}</span>${name}</button>`).join('');const s=D.steps(state.os)[state.step];$('step-label').textContent=D.platforms[state.os].name.toUpperCase()+' / STEP 0'+(state.step+1);$('step-title').textContent=s[0];$('step-description').textContent=s[1];$('step-evidence').textContent=s[2];$('step-source').href=D.source(s[3]);}
  function selectScenario(scenario){state.scenario=scenario;const r=D.fixture(state.os,scenario);$('command').value=r.query;$('scenario-question').textContent=r.question;pressed('[data-scenario]','scenario',scenario);renderResult(r);$('status').textContent=`已载入 ${r.platform} ${$('scenario-question').textContent}（示例）`;}
  function selectOS(os){state.os=os;pressed('[data-os]','os',os);$('os-label').textContent=D.platforms[os].name.toUpperCase();selectScenario(state.scenario);renderStep();}
  function fail(message,code){state.result=null;$('output').textContent=message;$('exit-code').textContent=`EXIT ${code} · 示例`;$('chain').replaceChildren();$('source-tag').textContent='未生成结果';$('meaning').textContent='请使用上方场景按钮载入示例，或在示例数据范围内修改命令。';$('result-meta').replaceChildren();$('chain-caption').textContent='本次查询没有可展示的启动链。';$('status').textContent=message;}
  function runQuery(command){
    // Only parse a narrow instructional command grammar. No shell execution.
    const tokens=command.trim().match(/"[^"\n]*"|'[^'\n]*'|[^\s]+/g)||[];
    if(tokens.shift()!=='witr') return fail('请输入以 witr 开头的查询；此演示不执行其他命令。',4);
    const modes=tokens.filter(t=>['--json','--tree','--short','--verbose','--warnings'].includes(t));
    const args=tokens.filter(t=>!modes.includes(t));
    if(modes.length>1) return fail('本演示每次支持一个输出选项。上游支持的完整组合请参阅官方说明。',4);
    const flags={'--port':'port','-o':'port','--pid':'pid','-p':'pid','--file':'file','-f':'file','--container':'container','-c':'container'};
    let found;
    const all=['port','pid','file','container'].map(s=>D.fixture(state.os,s));
    if(args.length===2 && Object.hasOwn(flags,args[0])){const kind=flags[args[0]],value=args[1].replace(/^(["'])(.*)\1$/,'$2');if(!value)return fail('查询目标不能为空。',4);if(['pid','port'].includes(kind)&&(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)<1||(kind==='port'&&Number(value)>65535)))return fail('PID 必须为正整数，端口必须在 1–65535 之间。',4);found=all.find(r=>kind==='port'?r.port!==null&&r.port===Number(value):kind==='pid'?r.process?.pid===Number(value):kind==='file'?r.file===value:r.container&&[r.container.name,r.container.image,r.container.service].some(n=>n.includes(value)));}
    else if(args.length===1&&!args[0].startsWith('-')){const matches=all.filter(r=>r.process?.name.includes(args[0]));if(matches.length>1)return fail('多个示例进程匹配：'+matches.map(r=>r.process.name+' (PID '+r.process.pid+')').join('、')+'。请使用 --pid 指定。',4);found=matches[0];}
    else return fail('此演示支持一个查询目标，例如 witr --port 3000。可附加 --json、--tree、--short、--verbose 或 --warnings。',4);
    if(!found)return fail('示例数据中未找到匹配项。这不代表你的电脑上没有该进程。',2);
    state.mode=modes[0]==='--json'?'json':modes[0]==='--tree'?'tree':modes.length?'standard':state.mode;
    state.scenario=found.scenario;pressed('[data-scenario]','scenario',state.scenario);$('scenario-question').textContent=found.question;found.query=command;renderResult(found);
    if(modes[0]==='--short')$('output').textContent=found.ancestry.length?found.ancestry.map(p=>`${p.name} (${p.pid})`).join(' → '):'Docker / Compose → demo → demo-redis-1（管理关系）';
    if(modes[0]==='--warnings')$('output').textContent='本示例没有预设规则警告；不代表实际系统健康。';
    if(modes[0]==='--verbose')$('output').textContent+='\n\nMemory      '+found.memory+' (示例)\nCPU         '+found.cpu+' (示例，非实时)';
    $('status').textContent='查询完成；结果来自 '+found.platform+' 示例快照。';
    return {demo:true,platform:state.os,scenario:found.scenario,process:found.process};
  }
  document.querySelectorAll('[data-os]').forEach(b=>b.addEventListener('click',()=>selectOS(b.dataset.os)));
  document.querySelectorAll('[data-scenario]').forEach(b=>b.addEventListener('click',()=>selectScenario(b.dataset.scenario)));
  document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.mode;pressed('[data-mode]','mode',state.mode);if(state.result)renderResult(state.result);}));
  $('pipeline').addEventListener('click',e=>{const b=e.target.closest('button[data-step]');if(b){state.step=Number(b.dataset.step);renderStep();document.querySelector(`[data-step="${state.step}"]`).focus();}});
  $('query-form').addEventListener('submit',e=>{e.preventDefault();runQuery($('command').value);});
  $('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('output').textContent);$('status').textContent='结果已复制。';}catch{$('status').textContent='浏览器不允许自动复制，请选中结果文本手动复制。';}});
  $('matrix').innerHTML=D.matrix.map(row=>'<tr><th scope="row">'+row[0]+'</th>'+row.slice(1).map(v=>`<td class="${v.startsWith('有限')?'limited':v==='不支持'?'no':''}">${v}</td>`).join('')+'</tr>').join('');
  const links=[['上游 README','README.md'],['进程追溯算法','internal/proc/ancestry.go'],['来源检测规则','internal/source/detect.go'],['统一分析流程','internal/pipeline/analyze.go'],['跨平台采集目录','internal/proc'],['上游 Apache-2.0 许可','LICENSE']];
  $('source-links').innerHTML=links.map(([label,path])=>`<a href="${D.source(path)}" target="_blank" rel="noreferrer">${label} ↗</a>`).join('')+`<small class="muted">研究提交 ${D.commit.slice(0,7)} · 2026-09-29</small>`;
  selectOS(state.os);
  // Progressive enhancement: unsupported browsers keep the full visible demo.
  if(document.modelContext?.registerTool){const lifecycle=new AbortController();try{Promise.resolve(document.modelContext.registerTool({name:'configure_witr_demo',description:'切换 witr 教学演示的平台和场景。仅更改页面示例，不查询本机。',inputSchema:{type:'object',properties:{platform:{type:'string',enum:Object.keys(D.platforms)},scenario:{type:'string',enum:['port','pid','file','container']}},required:['platform','scenario'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||!Object.hasOwn(D.platforms,input.platform)||!['port','pid','file','container'].includes(input.scenario)||Object.keys(input).some(k=>!['platform','scenario'].includes(k)))throw new Error('无效的平台或场景');selectOS(input.platform);selectScenario(input.scenario);return {demo:true,platform:state.os,scenario:state.scenario,query:$('command').value};}},{signal:lifecycle.signal})).catch(()=>{});}catch{}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
})();
