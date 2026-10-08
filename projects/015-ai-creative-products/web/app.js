(() => {
  'use strict';
  const sources = window.SOURCE_DATA;
  const research = window.RESEARCH_DATA;
  const $ = (selector) => document.querySelector(selector);
  if (!sources?.cases?.length || !research?.cases?.length) {
    $('#case-detail').innerHTML = '<div class="detail-panel"><h2>研究资料未能加载</h2><p>请刷新页面，或通过本地 HTTP 服务打开。原帖入口仍可查阅。</p></div>';
    return;
  }
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const cases = sources.cases.map(source => ({...source, ...(research.cases.find(item => item.id === source.id) || {})}));
  const products = research.products || [];
  let mediaSlowTimer;
  const state = {view:'effects', caseId:1, caseFilter:'全部', search:'', detailTab:'evidence', productFilter:'全部', productId:products[0]?.id};
  const number = id => String(id).padStart(2,'0');
  const list = values => `<ul class="clean">${(values || []).map(value=>`<li>${escape(value)}</li>`).join('')}</ul>`;
  const announce = text => {$('#status-message').textContent = text;};
  const formatDuration = seconds => {const total=Math.round(Number(seconds)||0);return `${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}`;};
  const caseChips = ids => `<div class="case-chips">${(ids||[]).map(id=>{const item=cases.find(c=>c.id===id);return item?`<button class="case-chip" type="button" data-case-link="${id}">${number(id)} ${escape(item.title)}</button>`:'';}).join('')}</div>`;
  const pills = (values,current,attr) => values.map(value=>`<button class="pill" type="button" ${attr}="${escape(value)}" aria-pressed="${value===current}">${escape(value)}</button>`).join('');
  const getVisibleCases = () => cases.filter(item => (state.caseFilter==='全部'||item.category===state.caseFilter) && [item.title,item.author,item.category,item.ability,item.idea,...(item.confirmed||[]),...(item.pipeline||[]),...(item.extensions||[])].join(' ').toLocaleLowerCase().includes(state.search.trim().toLocaleLowerCase()));
  function renderCaseList() {
    const visible = getVisibleCases();
    if(visible.length&&!visible.some(item=>item.id===state.caseId)){state.caseId=visible[0].id;renderCaseDetail();history.replaceState(null,'',`#case-${number(state.caseId)}`);}
    $('#case-detail').hidden=visible.length===0;
    if(!visible.length)$('#case-media video')?.pause();
    $('#case-filters').innerHTML=pills(['全部','网站','游戏','视频','音乐','世界'],state.caseFilter,'data-case-filter');
    $('#case-count').textContent = `${visible.length} / 10 个来源案例`;
    $('#case-empty').hidden=visible.length>0;
    $('#case-list').innerHTML=visible.map(item=>`<button class="case-card" type="button" data-case-id="${item.id}" aria-pressed="${item.id===state.caseId}"><img src="${escape(item.poster)}" alt="" width="95" height="73" loading="lazy"><div><div class="card-meta"><b>${number(item.id)}</b><span>${escape(item.category)}</span></div><h3>${escape(item.title)}</h3></div></button>`).join('');
    if(window.matchMedia('(max-width:850px)').matches){const card=$('#case-list [aria-pressed="true"]');if(card)$('#case-list').scrollLeft=card.offsetLeft-$('#case-list').offsetLeft;}
    renderCaseNavigator();
  }
  function renderCaseNavigator(){const container=$('#case-navigator');if(!container)return;const visible=getVisibleCases(),index=visible.findIndex(item=>item.id===state.caseId);container.innerHTML=`<button type="button" data-case-step="-1" ${index<=0?'disabled':''}>← 上一个</button><span>当前筛选 · 第 ${Math.max(index+1,0)} / ${visible.length} 例</span><button type="button" data-case-step="1" ${index<0||index>=visible.length-1?'disabled':''}>下一个 →</button>`;}
  function evidencePanel(item) {
    return `<div class="fact-columns"><div class="fact-block"><h4>原文确认</h4>${list(item.confirmed)}</div><div class="fact-block unknown"><h4>尚未确认</h4>${list(item.unknown)}</div></div><details class="source-quote"><summary>查看作者原文</summary><p lang="en">${escape(item.text)}</p></details>`;
  }
  function thinkingPanel(item) {
    return `<h4>创作思路</h4><p>${escape(item.idea)}</p><div class="process-label"><h4>从输入到结果</h4><span class="badge">${escape(item.pipelineStatus)}</span></div><ol class="process-list">${(item.pipeline||[]).map((step,i)=>`<li><span>${number(i+1)}</span>${escape(step)}</li>`).join('')}</ol><h4>值得沉淀的部分</h4>${list(item.reusable)}${item.pipelineStatus!=='原作者披露'?'<p class="subtle-note">这条流程包含我们的实现推演，供复用能力时参考；不能据此认定原作者用了相同工具或步骤。</p>':''}`;
  }
  function extensionPanel(item) {
    const linked=products.filter(product=>(item.productIds||[]).includes(product.id));
    return `<h4>能力可以延伸到哪里</h4>${list(item.extensions)}<div class="extension-links">${linked.map(product=>`<button class="extension-link" type="button" data-product-link="${escape(product.id)}"><span><b>${escape(product.title)}</b><br>${escape(product.tagline)}</span><span aria-hidden="true">↗</span></button>`).join('')}</div><p class="subtle-note">以上是我们提出的产品方向，需通过最小版本与真实用户试用验证。</p>`;
  }
  function renderCaseDetail() {
    clearTimeout(mediaSlowTimer);
    const previousVideo=$('#case-media video');
    if(previousVideo){previousVideo.pause();previousVideo.removeAttribute('src');previousVideo.load();}
    const item=cases.find(c=>c.id===state.caseId)||cases[0];
    const limited=item.id===3||item.id===4||item.id===7;
    const tabs=[['evidence','作品与事实'],['thinking','制作思路'],['extension','产品扩展']];
    $('#case-detail').innerHTML=`<div class="detail-top"><div class="detail-kicker"><b>CASE ${number(item.id)}</b><span>${escape(item.category)}</span><span class="badge">${limited?'流程信息有限':'原文已核对'}</span></div><h2>${escape(item.title)}</h2><p>${escape(item.ability)}</p><div class="source-line"><span>作者 ${escape(item.author.startsWith('@')?item.author:'@'+item.author)}</span><span>${formatDuration(item.duration)} 展示视频</span><a href="${escape(item.url)}" target="_blank" rel="noreferrer">打开原帖 ↗</a></div></div><div class="media-stage" id="case-media"><img class="media-poster" src="${escape(item.poster)}" alt="${escape(item.title)}的原作视频封面"><button class="play-original" type="button" id="play-original" aria-label="播放${escape(item.title)}的原作者视频"><span class="play-icon" aria-hidden="true">▶</span><b>播放原作者视频</b><span>点击后加载媒体 · ${formatDuration(item.duration)}</span></button></div><p class="media-caption">原作视频，不是本项目复刻。展示结果与制作流程分别核对。</p><div class="detail-tabs" role="tablist" aria-label="案例阅读角度">${tabs.map(([key,title])=>`<button class="detail-tab" type="button" id="detail-tab-${key}" data-detail-tab="${key}" role="tab" aria-selected="${key===state.detailTab}" aria-controls="detail-panel" tabindex="${key===state.detailTab?'0':'-1'}">${title}</button>`).join('')}</div><div id="detail-panel" class="detail-panel" role="tabpanel" aria-labelledby="detail-tab-${state.detailTab}">${state.detailTab==='evidence'?evidencePanel(item):state.detailTab==='thinking'?thinkingPanel(item):extensionPanel(item)}</div>`;
    $('#case-detail').insertAdjacentHTML('afterbegin','<nav id="case-navigator" class="case-navigator" aria-label="按当前筛选浏览案例"></nav>');renderCaseNavigator();
    const demo=window.DEMO_DATA?.find(record=>record.id===item.id);
    if(demo)$('#case-detail .detail-top').insertAdjacentHTML('afterend',`<div class="case-demo-link"><div><b>对应产品：${escape(demo.product)}</b><p>${escape(demo.title)} · ${escape(demo.task)}</p></div><button type="button" data-demo-id="${item.id}">操作本例演示 ↗</button></div>`);
  }
  function switchCase(id,scroll=false,keepTab=false) {
    const found=cases.find(item=>item.id===Number(id));if(!found)return;
    if((state.caseFilter!=='全部'&&found.category!==state.caseFilter)||(state.search&&!JSON.stringify(found).toLocaleLowerCase().includes(state.search.toLocaleLowerCase()))){state.caseFilter='全部';state.search='';$('#case-search').value='';}
    state.caseId=found.id;if(!keepTab)state.detailTab='evidence';renderCaseList();renderCaseDetail();
    if(scroll)$('#case-detail').scrollIntoView({block:'start'});
    announce(`已选择案例 ${number(found.id)}：${found.title}`);
  }
  function renderCapabilities() {
    const groups=[{title:'结构与叙事',ids:[1,2,3,4],text:'把作品、信息或故事组织成可阅读、可观看、可交互的体验。内容结构和镜头意图先于视觉包装。'},{title:'交互与物理',ids:[2,5,8,10],text:'用状态、碰撞、规则与反馈形成可玩闭环。浏览器负责实时运行，模型负责帮助实现和调试。'},{title:'音乐与时间',ids:[4,6],text:'把节奏、乐句和时间轴变成动作与镜头。第 6 例披露了 Python 与 Blender 流程，第 4 例工具未知。'},{title:'场景与素材整合',ids:[7,9],text:'第 9 例将环境程序、外部 3D 素材与多模型代码整合成世界；第 7 例只有展示，技术细节仍未知。'}];
    $('#capability-lanes').innerHTML=groups.map(group=>`<article class="capability-lane"><div class="lane-heading"><h4>${group.title}</h4><span>${group.ids.length} 个参考</span></div><p>${group.text}</p>${caseChips(group.ids)}</article>`).join('');
    $('#principles').innerHTML=(research.principles||[]).map((item,i)=>`<article class="principle"><h4><span>${number(i+1)}</span>${escape(item.title)}</h4><p>${escape(item.body)}</p>${caseChips(item.caseIds)}</article>`).join('');
    $('#evidence-rows').innerHTML=cases.map(item=>`<tr><td><button type="button" data-case-link="${item.id}">${number(item.id)} ${escape(item.title)}</button></td><td>${escape((item.confirmed||[])[0])}</td><td>${escape(item.pipelineStatus)}</td><td>${escape((item.unknown||[])[0])}</td></tr>`).join('');
    $('#technical-references').innerHTML=(research.references||[]).filter(item=>!item.url.startsWith('https://x.com')).map(item=>`<li><a href="${escape(item.url)}" target="_blank" rel="noreferrer">${escape(item.title)} ↗</a></li>`).join('');
  }
  function renderProducts() {
    $('#product-filters').innerHTML=pills(['全部','优先验证','第二阶段','长期探索'],state.productFilter,'data-product-filter');
    const visible=products.filter(product=>state.productFilter==='全部'||product.priority===state.productFilter);
    if(visible.length&&!visible.some(product=>product.id===state.productId)){state.productId=visible[0].id;renderProductDetail();}
    $('#product-grid').innerHTML=visible.map((product,i)=>`<article class="product-card" data-selected="${product.id===state.productId}"><div class="meta"><span>${number(products.indexOf(product)+1)} / ${escape(product.difficulty)}难度</span><span class="priority" data-priority="${escape(product.priority)}">${escape(product.priority)}</span></div><h3>${escape(product.title)}</h3><p class="tagline">${escape(product.tagline)}</p><p class="audience">适合 ${escape(product.audience)}</p><button type="button" data-product-id="${escape(product.id)}">${product.id===state.productId?'正在阅读计划':'查看最小版本与验证'} ↗</button></article>`).join('');
    $('#product-comparison').innerHTML=products.map(product=>`<tr><td><button type="button" data-product-link="${escape(product.id)}">${escape(product.title)}</button></td><td>${escape(product.job)}</td><td>${escape(product.difficulty)}</td><td>${escape(product.priority)}</td><td>${escape((product.acceptance||[])[0])}</td></tr>`).join('');
    $('#roadmap-steps').innerHTML=(research.roadmap||[]).map(item=>`<article class="roadmap-step"><p class="eyebrow">${escape(item.stage)}</p><h3>${escape(item.title)}</h3><p>${escape(item.goal)}</p><p class="deliverable"><b>交付</b> ${escape(item.deliverable)}<br><b>验证</b> ${escape(item.validation)}</p></article>`).join('');
  }
  function renderProductDetail() {
    window.EffectGallery?.releaseWithin($('#product-detail'));
    const product=products.find(item=>item.id===state.productId)||products[0];if(!product)return;
    $('#product-detail').innerHTML=`<div class="product-detail-header"><div><p class="eyebrow">PRODUCT PLAN / ${escape(product.priority)} · ${escape(product.difficulty)}难度</p><h3>${escape(product.title)}</h3><p>${escape(product.job)}</p></div><button class="export-button" type="button" id="export-product">导出产品计划 ↓</button></div><div class="product-detail-body"><div class="io-row"><div><span>用户提供什么</span><p>${escape(product.input)}</p></div><div class="io-arrow" aria-hidden="true">→</div><div><span>用户得到什么</span><p>${escape(product.output)}</p></div></div><div class="plan-grid"><div><h4>使用流程</h4><ol class="process-list">${(product.loop||[]).map((step,i)=>`<li><span>${number(i+1)}</span>${escape(step)}</li>`).join('')}</ol></div><div><h4>第一版只做这些</h4>${list(product.mvp)}<h4>怎样判断值得继续</h4>${list(product.acceptance)}</div><div><h4>复用我们已有的什么</h4><p>${escape(product.connection)}</p></div><div><h4>后续怎样扩展</h4>${list(product.later)}</div></div><div class="product-bottom"><div><h4>价值与收费思路</h4><p>${escape(product.value)}</p><p>${escape(product.pricingHypothesis)}</p></div><div><h4>目前最需要解决的问题</h4><p>${escape(product.risk)}</p></div></div><div class="source-cases"><h4>回到能力来源</h4>${caseChips(product.caseIds)}</div></div>`;
    $('#product-detail .product-detail-header').insertAdjacentHTML('afterend',`<section class="product-effects" aria-label="关联案例效果"><h4>参考案例的实际效果</h4><p>以下为原作者演示，作为本产品方向的能力参考。</p><div id="product-effect-gallery" data-case-ids="${(product.caseIds||[]).join(',')}"></div></section>`);
    const demos=(window.DEMO_DATA||[]).filter(item=>(product.caseIds||[]).includes(item.id));
    if(demos.length)$('#product-detail .product-detail-header').insertAdjacentHTML('afterend',`<div class="working-demo-link"><div><b>逐例对应的可操作产品</b><div class="product-demo-list">${demos.map(item=>`<button type="button" class="product-demo-chip" data-demo-id="${item.id}">${number(item.id)} · ${escape(item.title)} ↗</button>`).join('')}</div></div></div>`);
    window.EffectGallery?.renderInto($('#product-effect-gallery'),product.caseIds);
  }
  function switchProduct(id,scroll=false){const product=products.find(p=>p.id===id);if(!product)return;if(state.productFilter!=='全部'&&state.productFilter!==product.priority)state.productFilter='全部';state.productId=id;renderProducts();renderProductDetail();$('.product-strategy').open=true;if(scroll)$('#product-detail').scrollIntoView({block:'start'});announce(`已打开${product.title}产品计划`);}
  function setView(view){if(!['effects','cases','capabilities','products','demo'].includes(view))return;if(state.view!==view)document.querySelectorAll('video').forEach(video=>video.pause());state.view=view;document.body.dataset.activeView=view;document.querySelectorAll('.view').forEach(section=>{section.hidden=section.id!==`view-${view}`;});window.DemoGallery?.setActive(view==='demo');document.querySelectorAll('.main-nav [data-view]').forEach(link=>{if(link.dataset.view===view)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});}
  function applyHash(){const hash=decodeURIComponent(location.hash.slice(1));if(hash.startsWith('demo-')){setView('demo');window.DemoGallery?.select(Number(hash.slice(5)));}else if(hash.startsWith('case-')){setView('cases');switchCase(Number(hash.slice(5)));}else if(hash.startsWith('product-')){setView('products');switchProduct(hash.slice(8));}else if(hash==='compare'){setView('products');$('.product-strategy').open=true;$('#product-decision-board').scrollIntoView({block:'start'});}else if(hash==='roadmap'){setView('products');$('.product-strategy').open=true;$('#roadmap').scrollIntoView({block:'start'});}else if(['effects','cases','capabilities','products','demo'].includes(hash)){setView(hash);}else setView('effects');}
  function navigate(hash){if(location.hash!==hash)history.pushState(null,'',hash);applyHash();}
  function exportPlan(){const product=products.find(p=>p.id===state.productId);if(!product)return;const bullets=items=>(items||[]).map(item=>`- ${item}`).join('\n');const text=`# ${product.title}\n\n研究日期：2026-10-02\n\n这是基于案例能力提出的产品假设，尚未进行市场或付费验证。\n\n## 用户与需求\n\n用户：${product.audience}\n\n任务：${product.job}\n\n输入：${product.input}\n\n输出：${product.output}\n\n## 使用流程\n\n${bullets(product.loop)}\n\n## 最小版本\n\n${bullets(product.mvp)}\n\n## 验证标准\n\n${bullets(product.acceptance)}\n\n## 可复用基础\n\n${product.connection}\n\n## 后续扩展\n\n${bullets(product.later)}\n\n## 价值与收费假设\n\n${product.value}\n\n${product.pricingHypothesis}\n\n## 难点\n\n${product.risk}\n\n## 能力来源\n\n${(product.caseIds||[]).map(id=>{const item=cases.find(c=>c.id===id);return item?`- ${number(id)} ${item.title}：${item.url}`:'';}).join('\n')}\n`;
    const url=URL.createObjectURL(new Blob(['\uFEFF'+text],{type:'text/markdown;charset=utf-8'}));const anchor=document.createElement('a');anchor.href=url;anchor.download=`${product.id}-产品计划.md`;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('产品计划已导出');}
  function playOriginal(){
    clearTimeout(mediaSlowTimer);
    document.querySelectorAll('video').forEach(video=>video.pause());
    const item=cases.find(c=>c.id===state.caseId),stage=$('#case-media');
    const previous=stage.querySelector('video');
    if(previous){previous.pause();previous.removeAttribute('src');previous.load();}
    const showError=()=>{stage.setAttribute('aria-busy','false');stage.innerHTML=`<div class="media-error"><p>原作媒体暂时无法加载。</p><div class="media-actions"><button type="button" id="play-original">重新加载</button><a href="${escape(item.url)}" target="_blank" rel="noreferrer">在原帖观看 ↗</a></div></div>`;};
    if(!item.videoUrl){showError();return;}
    const video=document.createElement('video');
    video.controls=true;video.playsInline=true;video.preload='metadata';video.poster=item.poster;
    video.setAttribute('aria-label',`${item.title}原作视频`);video.src=item.videoUrl;
    const status=document.createElement('div');status.className='media-loading';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const waiting=message=>{status.hidden=false;status.innerHTML=`<span class="loading-dot" aria-hidden="true"></span><span>${escape(message)}</span>`;};
    waiting('正在连接原作视频…');
    stage.setAttribute('aria-busy','true');stage.replaceChildren(video,status);
    const connected=()=>video.isConnected&&stage.contains(video);
    const ready=()=>{if(!connected())return;clearTimeout(mediaSlowTimer);status.hidden=true;stage.setAttribute('aria-busy','false');};
    video.addEventListener('playing',ready);
    video.addEventListener('waiting',()=>{if(connected())waiting('缓冲中，稍候继续播放…');});
    video.addEventListener('error',()=>{if(!connected())return;clearTimeout(mediaSlowTimer);showError();});
    mediaSlowTimer=setTimeout(()=>{if(!connected()||video.currentTime>0)return;status.hidden=false;status.innerHTML=`<span>仍在等待媒体，可稍候或重新加载。</span><div class="media-actions"><button type="button" id="play-original">重试</button><a href="${escape(item.url)}" target="_blank" rel="noreferrer">原帖 ↗</a></div>`;},12000);
    video.play().catch(()=>{if(connected()&&!video.error){clearTimeout(mediaSlowTimer);waiting('请点击播放器的播放键继续。');stage.setAttribute('aria-busy','false');}});
  }
  function scrollRoute(){const hash=location.hash.slice(1);const target=hash.startsWith('demo-')?'#demo-stage':hash.startsWith('case-')?'#view-cases':['effects','cases','capabilities','products','demo'].includes(hash)?'#view-'+hash:null;if(target)$(target)?.scrollIntoView({block:'start',behavior:'instant'});}
  document.addEventListener('click',event=>{const link=event.target.closest('a');if(!link)return;const hash=link.getAttribute('href');if(!/^#(effects|cases|capabilities|products|demo|demo-\d+|case-\d+)$/.test(hash||''))return;event.preventDefault();navigate(hash);requestAnimationFrame(scrollRoute);});
  document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;
    if(button.dataset.demoId){navigate('#demo-'+number(button.dataset.demoId));$('#demo-stage').scrollIntoView({block:'start'});return;}
    if(button.dataset.effectAnalysis){navigate('#case-'+number(button.dataset.effectAnalysis));$('#view-cases').scrollIntoView({block:'start'});state.detailTab='thinking';$('#detail-tab-thinking').click();return;}
    if(button.id==='reset-case-search'){state.search='';state.caseFilter='全部';$('#case-search').value='';renderCaseList();announce('已清除搜索与筛选');return;}
    if(button.dataset.caseStep){const visible=getVisibleCases(),index=visible.findIndex(item=>item.id===state.caseId),next=visible[index+Number(button.dataset.caseStep)];if(next){switchCase(next.id,false,true);history.replaceState(null,'',`#case-${number(next.id)}`);$('#case-navigator [data-case-step="'+button.dataset.caseStep+'"]').focus();}return;}
    if(button.dataset.caseFilter){state.caseFilter=button.dataset.caseFilter;renderCaseList();return;}
    if(button.dataset.caseId){switchCase(button.dataset.caseId);history.replaceState(null,'',`#case-${number(state.caseId)}`);return;}
    if(button.dataset.detailTab){state.detailTab=button.dataset.detailTab;const item=cases.find(c=>c.id===state.caseId);document.querySelectorAll('[data-detail-tab]').forEach(tab=>{tab.setAttribute('aria-selected',String(tab.dataset.detailTab===state.detailTab));tab.tabIndex=tab.dataset.detailTab===state.detailTab?0:-1;});$('#detail-panel').setAttribute('aria-labelledby',button.id);$('#detail-panel').innerHTML=state.detailTab==='evidence'?evidencePanel(item):state.detailTab==='thinking'?thinkingPanel(item):extensionPanel(item);return;}
    if(button.id==='play-original'){playOriginal();return;}
    if(button.dataset.caseLink){navigate(`#case-${number(button.dataset.caseLink)}`);$('#view-cases').scrollIntoView({block:'start'});return;}
    if(button.dataset.productFilter){state.productFilter=button.dataset.productFilter;renderProducts();return;}
    if(button.dataset.productId){switchProduct(button.dataset.productId,true);history.replaceState(null,'',`#product-${button.dataset.productId}`);return;}
    if(button.dataset.productLink){navigate(`#product-${button.dataset.productLink}`);$('#product-detail').scrollIntoView({block:'start'});return;}
    if(button.id==='export-product')exportPlan();
  });
  document.addEventListener('keydown',event=>{if(!event.target.matches('[data-detail-tab]'))return;const tabs=[...document.querySelectorAll('[data-detail-tab]')];const index=tabs.indexOf(event.target);let next=index;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();tabs[next].click();tabs[next].focus();});
  $('#case-search').addEventListener('input',event=>{state.search=event.target.value;renderCaseList();});
  window.addEventListener('hashchange',()=>{applyHash();scrollRoute();});
  window.addEventListener('popstate',()=>{applyHash();scrollRoute();});
  window.addEventListener('load',scrollRoute,{once:true});
  renderCaseList();renderCaseDetail();renderCapabilities();renderProducts();renderProductDetail();applyHash();
  requestAnimationFrame(scrollRoute);
})();
