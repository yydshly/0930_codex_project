(() => {
  "use strict";
  const base = "https://opc8838-hub.github.io/font-animation/";
  const catalog = window.CELLMOTION_CATALOG;
  const $ = (selector) => document.querySelector(selector);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const categories = {all:"全部",type:"文字排版",graphic:"图标与图形",media:"图片与媒体",flow:"流动与路径",space:"立体空间",physics:"物理粒子"};
  const quickIds = ["glyphmorph","letterpulse","iconburst","typecascade","split-flip","beforeafter"];
  const priority = [...quickIds,"sproutshift","mistlift","dotresolve","pathwriter","impactbuild","ribbonink"];
  const ready = catalog.effects.filter((effect) => effect.status === "ready").sort((a,b) => {
    const rank = (id) => priority.includes(id) ? priority.indexOf(id) : 100;
    return rank(a.id) - rank(b.id);
  });
  const insight = {
    glyphmorph:{observe:"重复字符保留身份并迁移；旧字缩小，新字长大，一句话自然变成下一句。",use:"品牌口号、概念变化、连续卖点"},
    letterpulse:{observe:"独立字形依次放大、缩向两端，再回到一个完整词。字号与位置同时变化。",use:"开场标题、活动主题、关键词强调"},
    iconburst:{observe:"图标与文字共享节拍，图标翻面聚拢，再接上颜色变化和字图替换。",use:"品牌介绍、产品功能、动态图文"},
    typecascade:{observe:"字形按错峰节奏倾倒、坠落与切换，信息依次进入画面。",use:"短视频章节、动态排版、信息接力"},
    "split-flip":{observe:"画面整块旋转，覆盖层上下扫过；颜色、图片或视频成为两层内容。",use:"视频转场、商品展示、画面切换"},
    beforeafter:{observe:"原图与效果图先建立对照，再用进度环和切换突出结果。进度环是演示编排。",use:"修图前后、设计成果、效果对比"},
    sproutshift:{observe:"字符逐次生长和变形，短句像新芽一样接续出现。",use:"理念短片、成长主题、品牌文案"},
    mistlift:{observe:"字符带着上升和消散的运动交接，使文字切换显得轻盈。",use:"情绪文案、轻量标题、连续短句"},
    dotresolve:{observe:"字符通过像素或点状结构的解析呈现，强调从碎片到完整的过程。",use:"科技主题、数据概念、标题显现"},
    pathwriter:{observe:"字形沿路径被写出，运动顺序本身就是内容出现的顺序。",use:"署名、手写表达、开场文字"},
    impactbuild:{observe:"大字冲入、横向拖影，再接出新句，用速度和尺度制造冲击。",use:"活动宣传、节奏短片、重点文案"},
    ribbonink:{observe:"笔迹与彩带纹理沿路径流动，形成有方向的书写轨迹。",use:"创意标题、手写表达、视觉片段"},
    searchtyping:{observe:"搜索框里逐字打入文案，配合镜头推进与退远。静态封面只显示某一时刻，请进入原编辑器看运动。",use:"功能演示、搜索过程、科技内容"},
    zerogflip:{observe:"中心图片卡片在空间中翻转，完成后可切换下一张图。静态封面不代表完整运动。",use:"图片轮播、商品展示、视觉转场"},
    scrapbin:{observe:"文字变成纸张，逐步揉皱并落入垃圾桶，用物理过程讲一个简短动作。",use:"删除提示、创意叙事、概念演示"}
  };
  let selected = ready.find((effect) => effect.id === "glyphmorph");
  let category = "all";
  let expanded = false;
  let playWhenVisible = false;
  const video = $("#main-video");
  const poster = $("#main-poster");
  const url = (path) => new URL(path, base).href;
  const create = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function selectEffect(id, jump = false) {
    const next = ready.find((effect) => effect.id === id);
    if (!next) return;
    selected = next;
    video.pause();
    video.removeAttribute("src");
    video.load();
    $("#video-error").hidden = true;
    const details = insight[next.id] || {observe:next.description + "。具体运动请查看原编辑器；不同效果提供的参数各有区别。",use:categories[next.category] + "相关的动态标题与视觉片段"};
    $("#effect-english").textContent = next.english.toUpperCase();
    $("#effect-name").textContent = next.name;
    $("#effect-description").textContent = next.description;
    $("#effect-observe").textContent = details.observe;
    $("#effect-use").textContent = details.use;
    $("#effect-source").href = url(next.href);
    $("#error-link").href = url(next.href);
    $("#stage-label").textContent = next.video ? "原作视频 / " + next.english : "静态封面 / " + next.english;
    poster.hidden = Boolean(next.video);
    video.hidden = !next.video;
    poster.src = url(next.poster);
    poster.alt = next.name + "原作静态封面";
    $("#replay").disabled = !next.video;
    $("#playback-rate").disabled = !next.video;
    if (next.video) {
      video.poster = url(next.poster);
      video.src = url(next.video);
      video.playbackRate = Number($("#playback-rate").value);
      $("#play-status").textContent = "正在加载原作视频…";
      if (!reduced.matches) video.play().catch(() => {$("#play-status").textContent = "点击播放器播放原作";});
    } else {
      $("#play-status").textContent = "当前为静态封面 · 点击「体验原编辑器」看运动";
    }
    document.querySelectorAll(".pick").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.select === id)));
    if (jump) $("#main-stage").scrollIntoView({behavior:reduced.matches?"instant":"smooth",block:"start"});
  }

  function buildPicks() {
    quickIds.forEach((id) => {
      const effect = ready.find((item) => item.id === id);
      const button = create("button","pick");
      button.type = "button";
      button.dataset.select = id;
      button.setAttribute("aria-pressed",String(id === selected.id));
      button.setAttribute("aria-label","播放" + effect.name + "原作预览");
      const frame = create("div","pick-image");
      const img = create("img");
      img.src = url(effect.poster); img.alt = ""; img.loading = "lazy";
      frame.append(img); button.append(frame,create("strong",null,effect.name));
      $("#quick-picks").append(button);
    });
  }

  function buildFilters() {
    Object.entries(categories).forEach(([key,label]) => {
      const button = create("button",null,label);
      button.type="button";button.dataset.category=key;
      button.setAttribute("aria-pressed",String(key===category));
      button.append(create("small",null,String(ready.filter(e=>key==="all"||e.category===key).length)));
      $("#filters").append(button);
    });
  }

  function renderCatalog() {
    const filtered = ready.filter((effect) => category === "all" || effect.category === category);
    const displayed = category === "all" && !expanded ? filtered.slice(0,12) : filtered;
    const grid = $("#effect-grid"); grid.replaceChildren();
    displayed.forEach((effect) => {
      const card = create("article","effect-card");
      const button = create("button");button.type="button";button.dataset.select=effect.id;
      button.setAttribute("aria-label","查看"+effect.name+(effect.video?"原作视频":"静态封面与编辑器"));
      const frame = create("span","card-image");
      const img = create("img");img.src=url(effect.poster);img.alt=effect.name+"封面";img.loading="lazy";
      img.addEventListener("error",()=>frame.classList.add("card-error"));
      frame.append(img,create("small",null,effect.video?"▶ 原作视频":"静态封面"));
      const title = create("span","card-title",effect.name);title.append(create("b",null,"↗"));
      button.append(frame,title,create("span","card-description",effect.description));card.append(button);grid.append(card);
    });
    $("#catalog-count").textContent = "展示 " + displayed.length + " / " + filtered.length + " 项";
    $("#show-all").hidden = category!=="all";
    $("#show-all").textContent = expanded ? "收起目录 ↑" : "查看全部 37 项 ↓";
    document.querySelectorAll("#filters button").forEach((button)=>button.setAttribute("aria-pressed",String(button.dataset.category===category)));
  }

  video.addEventListener("loadedmetadata",()=> {
    if (selected.video) $("#play-status").textContent="原作者视频 · "+video.duration.toFixed(2)+" 秒 · 循环预览";
  });
  video.addEventListener("error",()=> {
    if(video.getAttribute("src")){$("#video-error").hidden=false;$("#play-status").textContent="视频加载失败 · 可独立打开原作";}
  });
  poster.addEventListener("error",()=> {if(!selected.video){$("#video-error").hidden=false;$("#play-status").textContent="封面加载失败 · 可独立打开原作";}});
  $("#replay").addEventListener("click",()=>{video.currentTime=0;video.play().catch(()=>{});});
  $("#playback-rate").addEventListener("change",(event)=>{video.playbackRate=Number(event.target.value);});
  $("#filters").addEventListener("click",(event)=>{const button=event.target.closest("[data-category]");if(button){category=button.dataset.category;renderCatalog();}});
  $("#show-all").addEventListener("click",()=>{expanded=!expanded;renderCatalog();});
  document.addEventListener("click",(event)=>{const button=event.target.closest("[data-select]");if(button)selectEffect(button.dataset.select,!button.classList.contains("pick"));});
  new IntersectionObserver(([entry])=> {
    if(!entry.isIntersecting){playWhenVisible=!video.paused;video.pause();}
    else if(playWhenVisible&&!reduced.matches&&selected.video){video.play().catch(()=>{});playWhenVisible=false;}
  },{threshold:0.15}).observe($("#main-stage"));

  document.querySelectorAll("video[data-case]").forEach((player)=> {
    const id=player.dataset.case;
    player.src=url("assets/cellmotion/cases/case-"+id+".mp4");
    player.poster=url("assets/cellmotion/cases/case-"+id+"-poster.jpg");
    player.addEventListener("play",()=>{video.pause();document.querySelectorAll("video[data-case]").forEach(other=>{if(other!==player)other.pause();});});
    player.addEventListener("error",()=> {
      const caption=player.closest("figure").querySelector("figcaption");
      const link=create("a",null,"原站播放 ↗");link.href=player.src;link.target="_blank";link.rel="noopener noreferrer";
      caption.replaceChildren(create("span",null,"暂未加载"),link);
    });
  });

  const dialog=$("#editor-dialog");
  $("#open-editor").addEventListener("click",()=> {
    video.pause();
    $("#editor-dialog-title").textContent=selected.name+"编辑器";
    $("#dialog-source").href=url(selected.href);
    $("#editor-frame").src=url(selected.href);
    $("#editor-frame").title=selected.name+"原作者编辑器";
    dialog.showModal();
  });
  $("#close-editor").addEventListener("click",()=>dialog.close());
  dialog.addEventListener("close",()=>{$("#editor-frame").src="about:blank";});
  dialog.addEventListener("click",(event)=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});

  // Original teaching model. It illustrates matching and interpolation; it is not the upstream renderer.
  const svgNS="http://www.w3.org/2000/svg";
  const from=Array.from("让创意生长"),to=Array.from("创意自由生长");
  const slot=(index,length)=>400+(index-(length-1)/2)*85;
  const claimed=new Set();
  const tracks=from.map((char,index)=> {
    const match=to.findIndex((candidate,j)=>candidate===char&&!claimed.has(j));
    if(match>=0)claimed.add(match);
    return {char,x0:slot(index,from.length),x1:match>=0?slot(match,to.length):slot(index,from.length),kind:match>=0?"kept":"removed"};
  });
  to.forEach((char,index)=>{if(!claimed.has(index))tracks.push({char,x0:slot(index,to.length),x1:slot(index,to.length),kind:"added"});});
  const colors={kept:"#dbe56c",removed:"#ff9077",added:"#93baff"};
  tracks.forEach(track=> {
    if(track.kind==="kept") {const path=document.createElementNS(svgNS,"line");path.setAttribute("x1",track.x0);path.setAttribute("x2",track.x1);path.setAttribute("y1",170);path.setAttribute("y2",170);path.setAttribute("class","glyph-path");$("#glyph-lines").append(path);}
    const group=document.createElementNS(svgNS,"g");
    const text=document.createElementNS(svgNS,"text");text.textContent=track.char;text.setAttribute("class","glyph-char");text.setAttribute("fill",colors[track.kind]);group.append(text);$("#glyph-layer").append(group);track.node=group;
  });
  let labPlaying=false,labStart=0,labFrame=0;
  function renderLab(progress) {
    const p=Math.max(0,Math.min(1,progress));
    const smooth=(value)=>{const v=Math.max(0,Math.min(1,value));return v*v*(3-2*v);};
    const e=smooth((p-.2)/.6);
    tracks.forEach(track=> {
      const scale=track.kind==="kept"?1:track.kind==="removed"?1-smooth(p/.22):smooth((p-.78)/.22);
      const x=track.x0+(track.x1-track.x0)*e;
      track.node.setAttribute("transform",`translate(${x} 125) scale(${scale})`);
      track.node.setAttribute("opacity",String(track.kind==="kept"?1:scale));
    });
    $("#lab-progress").textContent=Math.round(p*100)+"%";
    $("#lab-time").value=(p*2).toFixed(2)+" s";
    const title=p<=.02?"先确定字符的位置":p>=.98?"得到新句，再等待下一拍":p<.22?"删除的字，在原位退出":p<.78?"重复的字，迁移到新字位":"新增的字，在目标位置长大";
    $("#lab-phase").textContent=title;
    $("#lab-phase-description").textContent=p<=.02?"起点是「让创意生长」。系统还会计算「创意自由生长」的布局，然后匹配重复的「创、意、生、长」。":p>=.98?"保留的字到了新位置，「让」已经退出，「自、由」完整出现。时间轴继续前进，就能接出下一段文案。":p<.22?"「让」在目标句里没有匹配项，先在原处缩小并淡出。示意图把三个过程错开，便于观察。":p<.78?"「创、意、生、长」保持同一字符身份，向新的字位移动。缓动曲线让移动在起点与终点自然减速。":"目标句新增了「自、由」。它们已经有确定的位置，逐步放大并淡入，填上新句中的空位。";
  }
  function stopLab(){labPlaying=false;cancelAnimationFrame(labFrame);$("#lab-play").textContent="▶";$("#lab-play").setAttribute("aria-label","播放原理示意");}
  function labTick(now){if(!labPlaying)return;const p=Math.min(1,(now-labStart)/2000);$("#lab-scrubber").value=String(p*1000);renderLab(p);if(p>=1)stopLab();else labFrame=requestAnimationFrame(labTick);}
  $("#lab-scrubber").addEventListener("input",event=>{stopLab();renderLab(Number(event.target.value)/1000);});
  $("#lab-play").addEventListener("click",()=>{if(labPlaying){stopLab();return;}let p=Number($("#lab-scrubber").value)/1000;if(p>=1)p=0;labPlaying=true;labStart=performance.now()-p*2000;$("#lab-play").textContent="Ⅱ";$("#lab-play").setAttribute("aria-label","暂停原理示意");labFrame=requestAnimationFrame(labTick);});
  document.addEventListener("visibilitychange",()=>{if(document.hidden){video.pause();stopLab();document.querySelectorAll("video[data-case]").forEach(player=>player.pause());}});
  buildPicks();buildFilters();renderCatalog();selectEffect(selected.id);renderLab(0);
})();
