(() => {
  "use strict";
  const engine=window.MotionWorkshopEngine;
  const $=selector=>document.querySelector(selector);
  const canvas=$("#motion-canvas");
  let config=engine.normalize(engine.defaults),image=null,time=config.duration*.25,playing=false,start=0,raf=0,loadRevision=0;
  const bindings={from:"text-from",to:"text-to",entrance:"entrance",easing:"easing",stagger:"stagger",duration:"duration",hold:"first-hold",endHold:"last-hold",ratio:"ratio",fontSize:"font-size",foreground:"foreground",background:"background"};
  const actionNames={rise:"从下方进入",fade:"淡入",bounce:"弹入",none:"直接出现"};
  const easeNames={smooth:"轻缓起止",elastic:"弹性回落",linear:"匀速"};
  const descriptions={match:"保留相同字符并沿基线移到新字位；删字原位缩小，新字或图片在目标字位长大。",type:"第一句退出后，第二句从左到右逐字出现，带输入光标。",pulse:"第一句退出后，第二句的字符依次放大再回落；邻字让位，最后回到完整布局。",particles:"把文字或图片采样成碎片，先散开，再沿确定路径聚合成第二句，最后接回清晰文字与图片。"};
  function status(message){$("#workshop-status").textContent=message;}
  function populate(){Object.entries(bindings).forEach(([key,id])=>$("#"+id).value=String(config[key]));$("#show-guides").checked=config.guides;$("#image-slot").value=String(config.image?.slot||2);}
  function readControls(){
    const changes={...config};
    Object.entries(bindings).forEach(([key,id])=>changes[key]=$("#"+id).value);
    changes.guides=$("#show-guides").checked;
    if(config.image)changes.image={...config.image,slot:Number($("#image-slot").value)};
    return engine.normalize(changes);
  }
  function paintPhases(){
    const track=$("#phase-track");track.replaceChildren();
    engine.phases(config).forEach(phase=>{const button=document.createElement("button");button.type="button";button.style.flex=String(phase.seconds);button.textContent=phase.name;button.title=`${(phase.start*config.duration).toFixed(2)} – ${(phase.end*config.duration).toFixed(2)} 秒`;
      button.dataset.phase=phase.id;button.addEventListener("click",()=>{stop();time=(phase.start+Math.min(.04,(phase.end-phase.start)/2))*config.duration;render();});track.append(button);});
  }
  function render(){
    const frame=engine.render(canvas,config,time,image);
    $("#motion-time").value=String(Math.round(time/config.duration*1000));
    $("#play-time").value=`${time.toFixed(2)} / ${config.duration.toFixed(2)} s`;
    $("#recipe-name").textContent=engine.names[config.effect];
    $("#phase-number").textContent=`第 ${frame.index+1} 步`;
    $("#phase-name").textContent=frame.phase.name;
    $("#frame-description").textContent=frame.text;
    const begins=frame.phase.start*config.duration;
    $("#frame-math").textContent=`时间 ${time.toFixed(2)} 秒 → 阶段进度 (${time.toFixed(2)} − ${begins.toFixed(2)}) ÷ ${frame.phase.seconds.toFixed(2)} = ${Math.round(frame.progress*100)}% → 计算元素状态并重画。`;
    $("#calculated-state").textContent=frame.calculation;
    $("#visible-result").textContent=`${time.toFixed(2)} 秒时的画面`;
    $("#duration-output").value=config.duration.toFixed(1)+" 秒";
    const stagger=engine.effectiveStagger(config,Math.max(engine.split(config.from).length,engine.split(config.to).length));
    $("#stagger-output").value=stagger.toFixed(2)+" 秒";
    $("#first-hold").value=Number(config.hold.toFixed(2));$("#last-hold").value=Number(config.endHold.toFixed(2));
    document.querySelectorAll("[data-recipe]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.recipe===config.effect)));
    document.querySelectorAll("[data-phase]").forEach(button=>button.setAttribute("aria-current",button.dataset.phase===frame.phase.id?"step":"false"));
    $("#image-status").textContent=config.image?`${config.image.name} · ${config.to?`第二句第 ${config.image.slot} 字`:"尚未显示，请填写第二句"}`:"未选择图片";
    $("#image-slot").max=String(Math.max(1,engine.split(config.to).length));
    if(config.image)$("#image-slot").value=String(config.image.slot);
    $("#remove-image").hidden=!config.image;
  }
  function stop(){playing=false;cancelAnimationFrame(raf);$("#play-motion").textContent="▶ 播放";}
  function tick(now){if(!playing)return;time=Math.min(config.duration,(now-start)/1000);render();if(time>=config.duration)stop();else raf=requestAnimationFrame(tick);}
  function play(restart=false){stop();if(restart||time>=config.duration)time=0;playing=true;start=performance.now()-time*1000;$("#play-motion").textContent="Ⅱ 暂停";raf=requestAnimationFrame(tick);}
  function update(changed){stop();const progress=time/config.duration;config=readControls();time=Math.min(config.duration,progress*config.duration);$("#changed-control").textContent=changed;paintPhases();render();makeRequest();}
  function makeRequest(){
    const purpose=$("#purpose").value.trim()||"动态标题";
    const delivery=$("#delivery").value;
    const dimensions=engine.dimensions(config.ratio);
    const phaseText=engine.phases(config).map(phase=>`${(phase.start*config.duration).toFixed(2)}–${(phase.end*config.duration).toFixed(2)} 秒：${phase.id==="enter"?"第一句"+actionNames[config.entrance]:phase.id==="hold"?"第一句完整停留":phase.id==="change"?descriptions[config.effect]:"第二句完整停留"}`).join("\n");
    const output=delivery==="web"?"交付可运行网页，提供播放/暂停、重播、时间轴，以及文案、颜色和时长的修改入口。":delivery==="video"?"先提供可拖动时间轴的网页预览，再使用逐帧渲染与编码交付 30 fps 的 MP4，并保留可编辑配置。此实验室只提供 PNG/JSON；MP4 编码环节需要另外实现。":"交付可批量替换文案和素材的模板，明确数据字段、缺失值处理与命名规则，并先用 3 行示例数据验证。批量渲染与文件管理需要另外实现。";
    const imageLine=config.image?(config.to?`\n图片：用附图「${config.image.name}」替换第二句第 ${config.image.slot} 字，保持图片比例，随该字位一起运动。请同时提供配方 JSON 与实际素材。`:`\n素材「${config.image.name}」已载入，但第二句为空，请先补齐文案并确定图片位置。`):"";
    $("#request-text").value=`请制作一段用于「${purpose}」的动效。\n\n内容：\n第一句：「${config.from}」\n第二句：「${config.to}」${imageLine}\n\n动作：\n进场采用${actionNames[config.entrance]}；变化采用「${engine.names[config.effect]}」。\n${descriptions[config.effect]}\n移动节奏采用${easeNames[config.easing]}，逐字间隔约 ${engine.effectiveStagger(config,Math.max(engine.split(config.from).length,engine.split(config.to).length)).toFixed(2)} 秒。\n\n时间编排：\n${phaseText}\n总长 ${config.duration.toFixed(2)} 秒。\n\n样式：\n画幅 ${config.ratio}，预览尺寸 ${dimensions.width} × ${dimensions.height}；居中排版，字号基准 ${config.fontSize}px，长句自动缩小以适应画幅。\n文字颜色 ${config.foreground}，背景颜色 ${config.background}。\n\n交付：\n${output}\n\n验收：\n文案正确且完整可读；结尾有 ${config.endHold.toFixed(2)} 秒停留；字号变化时邻字不发生意外遮挡；图片保持比例；横屏和竖屏都适应画布。\n相同配置与同一个时间点得到相同画面，拖动时间轴可以检查任何一帧。\n保留一个由「配置 + 时间 t」驱动的绘制入口，便于后续组合新动作或逐帧导出。`;
  }
  function download(blob,name){const link=document.createElement("a"),src=URL.createObjectURL(blob);link.href=src;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(src),1000);}
  async function loadImage(next){
    const revision=++loadRevision;
    if(!next){image=null;return;}
    const candidate=new Image();candidate.src=next.dataURL;await candidate.decode();
    if(candidate.naturalWidth*candidate.naturalHeight>16000000)throw new Error("图片尺寸较大，请使用不超过 1600 万像素的图片。");
    if(revision===loadRevision)image=candidate;
  }
  async function setConfig(input){
    stop();const next=engine.normalize(input);await loadImage(next.image);config=next;time=config.duration*.25;populate();paintPhases();render();makeRequest();
    return config;
  }
  $("#motion-form").addEventListener("submit",event=>event.preventDefault());
  $("#motion-form").addEventListener("input",event=>{if(event.target.type==="file")return;const label=event.target.closest("label");update(label?.childNodes[0]?.textContent?.trim()||"配置");});
  $("#show-guides").addEventListener("change",()=>update("字位与轨迹辅助线"));
  document.querySelectorAll("[data-recipe]").forEach(button=>button.addEventListener("click",()=>{config.effect=button.dataset.recipe;update("变化算法："+engine.names[config.effect]);play(true);}));
  $("#play-motion").addEventListener("click",()=>playing?stop():play());
  $("#restart-motion").addEventListener("click",()=>play(true));
  $("#motion-time").addEventListener("input",event=>{stop();time=Number(event.target.value)/1000*config.duration;render();});
  $("#purpose").addEventListener("input",makeRequest);$("#delivery").addEventListener("change",makeRequest);
  $("#image-file").addEventListener("change",async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try{
      if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>3*1024*1024)throw new Error("请选择不超过 3 MB 的 PNG、JPG 或 WebP。");
      const dataURL=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
      const next={dataURL,name:file.name,slot:Number($("#image-slot").value)};
      await loadImage(next);config.image=next;update("图片与替换字位");status("图片已放入目标字位，可拖到后半段观察。");
    }catch(error){status(error.message||"图片无法读取。");}finally{event.target.value="";}
  });
  $("#remove-image").addEventListener("click",()=>{loadRevision++;config.image=null;image=null;update("移除图片");});
  $("#download-recipe").addEventListener("click",()=>{download(new Blob([JSON.stringify({schema:"motion-workshop-v1",config},null,2)],{type:"application/json"}),"motion-workshop-recipe.json");status("配方已保存，图片会随配方保留。");});
  $("#recipe-file").addEventListener("change",async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try{if(file.size>6*1024*1024)throw new Error("配方文件过大。");const payload=JSON.parse(await file.text());if(payload.schema!=="motion-workshop-v1"||!payload.config||payload.config.version!==1)throw new Error("请选择本实验室保存的 v1 配方 JSON。");await setConfig(payload.config);status("配方已载入，内容、图片与参数已恢复。");}catch(error){status("载入失败："+error.message);}finally{event.target.value="";}
  });
  $("#download-frame").addEventListener("click",()=>{const output=document.createElement("canvas");engine.render(output,config,time,image,{guides:false});output.toBlob(blob=>{if(blob){download(blob,`motion-${config.effect}-${output.width}x${output.height}.png`);status("当前帧 PNG 已保存，导出不包含辅助线。");}});});
  $("#copy-request").addEventListener("click",async()=>{
    const value=$("#request-text").value;
    const copiedFeedback=()=>{$("#copy-request").textContent="已复制 ✓";setTimeout(()=>$("#copy-request").textContent="复制需求",2000);};
    try{await navigator.clipboard.writeText(value);status("需求已复制，可以直接发给我继续制作。");copiedFeedback();}
    catch{const field=$("#request-text");field.focus();field.select();const copied=document.execCommand("copy");status(copied?"需求已复制。":"需求已选中，请按 Ctrl+C 复制。");if(copied)copiedFeedback();}
  });
  document.querySelectorAll("[data-example]").forEach(button=>button.addEventListener("click",async()=>{
    const examples={gentle:{...config,effect:"match",entrance:"fade",easing:"smooth",duration:6,hold:1,endHold:1.2,stagger:.02},sequence:{...config,effect:"type",entrance:"bounce",easing:"elastic",duration:4.8,hold:.8,endHold:1,stagger:.1},"new-algorithm":{...config,effect:"particles",entrance:"rise",easing:"smooth",duration:5.4,hold:.7,endHold:1}};
    await setConfig(examples[button.dataset.example]);$("#experiment").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});play(true);
  }));
  document.addEventListener("visibilitychange",()=>{if(document.hidden)stop();});
  window.MotionWorkshop={getConfig:()=>structuredClone(config),setConfig,seek:value=>{stop();time=Math.max(0,Math.min(config.duration,Number(value)||0));render();},render,makeRequest};
  populate();paintPhases();render();makeRequest();
})();
