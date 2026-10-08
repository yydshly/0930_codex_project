export const ORIGINAL_PLUSH_VIEWER='https://superspl.at/s?id=ca6a4c9b';
export const ORIGINAL_PLUSH_PAGE='https://superspl.at/scene/ca6a4c9b';
export function plushViewFromUrl(href){return new URL(href).searchParams.get('plushView')==='reference'?'reference':'native';}
export function plushViewUrl(href,view){const url=new URL(href);if(view==='reference')url.searchParams.set('plushView','reference');else url.searchParams.delete('plushView');return url.href;}
/** Both asset choices use the application's existing camera, canvas and scene. */
export function mountPlushReferenceView({stage,nativeStage,nativeControls,nativeExtras=[],keepNativeControls=false,context='creation',nativeLabel='我的创作',onViewChange=()=>{},onAction=()=>{},root=document,browser=window}={}){
  const make=(tag,className,text)=>{const element=root.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=text;return element;};
  const button=text=>{const element=make('button','',text);element.type='button';return element;};
  const link=(text,href)=>{const element=make('a','',text);element.href=href;element.target='_blank';element.rel='noopener noreferrer';return element;};
  const prefix='plush-view-'+context;stage.classList.add('plush-view-host');nativeStage.id ||=prefix+'-native';nativeStage.setAttribute('role','tabpanel');
  const tabs=make('div','plush-view-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','选择角色资产');
  const own=button(nativeLabel),original=button('蓝绒星仔');
  for(const [tab,view] of [[own,'native'],[original,'reference']]){tab.id=prefix+'-tab-'+view;tab.dataset.plushViewTab=view;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',nativeStage.id);tabs.append(tab);}
  const panel=make('section','plush-reference-panel');panel.hidden=true;panel.setAttribute('aria-label','角色资产来源');
  const credit=make('div','plush-reference-credit');credit.append(link('Felipe · abstrakt',ORIGINAL_PLUSH_PAGE),link('CC BY 4.0','https://creativecommons.org/licenses/by/4.0/'));panel.append(credit);stage.prepend(tabs);stage.append(panel);
  const sidebar=make('section','plush-reference-details');sidebar.hidden=true;sidebar.setAttribute('aria-label','蓝绒星仔创作');
  sidebar.append(make('span','plush-reference-eyebrow','LOCAL ASSET / 3D GAUSSIAN SPLATTING'),make('h2','','蓝绒星仔'),make('p','','完整原作资产已适配到当前三维场景。细密卷绒、眼睛和贝雷帽一起保留。'));
  const guide=make('div','plush-reference-guide');guide.append(make('h3','','开始互动'),make('p','',context==='world'?'点击地面让星仔走过去，点击角色弹跳；家具和角色在同一个场景中。开启梳理后，按住蓝色绒毛拖动，关闭梳理即可继续行走。':'拖动画面旋转，滚轮缩放，点击星仔弹跳。开启梳理后，按住蓝色绒毛拖动，关闭梳理即可继续旋转。'));sidebar.append(guide);
  const actions=make('div','plush-reference-actions'),actionControls=[];
  for(const [action,title] of [['front','回到正面'],['spin','转台旋转'],['bounce','弹一下'],['png','保存图片']]){
    const control=button(title);control.dataset.plushAction=action;control.disabled=true;if(action==='spin')control.setAttribute('aria-pressed','false');
    control.addEventListener('click',()=>{if(control.disabled)return;if(action==='spin')control.setAttribute('aria-pressed',String(control.getAttribute('aria-pressed')!=='true'));onAction(action);});actions.append(control);actionControls.push(control);
  }
  sidebar.append(actions);
  const fields=make('div','plush-reference-fields');
  const tintLabel=make('label','','整体色调'),tint=make('input','');tint.type='color';tint.id=prefix+'-tint';tint.value='#ffffff';tint.disabled=true;tintLabel.setAttribute('for',tint.id);tintLabel.append(tint);
  const sizeLabel=make('label','','角色大小'),size=make('input','');size.type='range';size.id=prefix+'-size';size.min=.65;size.max=1.35;size.step=.01;size.value=1;size.disabled=true;sizeLabel.setAttribute('for',size.id);sizeLabel.append(size);
  tint.addEventListener('input',()=>{if(!tint.disabled)onAction('tint',tint.value);});size.addEventListener('input',()=>{if(!size.disabled)onAction('size',Number(size.value));});
  fields.append(tintLabel,sizeLabel);sidebar.append(fields);actionControls.push(tint,size);
  const furSection=make('section','plush-reference-fur');furSection.append(make('h3','','绒毛编辑'));
  const furFields=make('div','plush-reference-fields'),furSliders={};
  for(const [key,title,min,max,initial] of [['length','毛长 · 相对原作',.65,1.65,1],['curl','增加卷曲',0,1,0]]){
    const label=make('label',''),text=make('span','',title),output=make('output','',Math.round(initial*100)+'%'),input=make('input','');
    input.type='range';input.id=prefix+'-fur-'+key;input.min=min;input.max=max;input.step=.01;input.value=initial;input.disabled=true;label.setAttribute('for',input.id);label.append(text,output,input);furFields.append(label);actionControls.push(input);furSliders[key]={input,output};
    input.addEventListener('input',()=>{if(input.disabled)return;output.textContent=Math.round(Number(input.value)*100)+'%';onAction('fur-'+key,Number(input.value));});
    for(const event of ['change','blur'])input.addEventListener(event,()=>{if(!input.disabled)onAction('finish');});
  }
  furSection.append(furFields);
  const furActions=make('div','plush-reference-actions'),brush=button('开启梳理');brush.dataset.plushAction='groom';brush.setAttribute('aria-pressed','false');brush.disabled=true;brush.addEventListener('click',()=>{if(!brush.disabled)onAction('groom');});furActions.append(brush);actionControls.push(brush);
  const clear=button('清除梳理');clear.dataset.plushAction='clear-groom';clear.disabled=true;clear.addEventListener('click',()=>{if(!clear.disabled)onAction('clear-groom');});furActions.append(clear);actionControls.push(clear);
  const historyControls={};let ready=false,canUndo=false,canRedo=false;
  for(const [action,title] of [['undo','撤销修改'],['redo','重做修改']]){const control=button(title);control.dataset.plushAction=action;control.disabled=true;control.addEventListener('click',()=>{if(!control.disabled)onAction(action);});furActions.append(control);historyControls[action]=control;}
  const syncHistory=()=>{historyControls.undo.disabled=!ready||!canUndo;historyControls.redo.disabled=!ready||!canRedo;};
  furSection.append(furActions,make('p','plush-reference-fur-help','先调毛长和卷曲，再开启梳理拖动。每次拖动或滑杆调整算一步，可连续修改。100% 毛长、0% 增加卷曲为原作。'));sidebar.append(furSection);
  for(const control of [tint,size])for(const event of ['change','blur'])control.addEventListener(event,()=>{if(!control.disabled)onAction('finish');});
  const reset=button('恢复原作全部样式');reset.dataset.plushAction='reset';reset.disabled=true;reset.addEventListener('click',()=>{if(reset.disabled)return;tint.value='#ffffff';size.value=1;for(const key of ['length','curl']){const value=key==='length'?1:0;furSliders[key].input.value=value;furSliders[key].output.textContent=Math.round(value*100)+'%';}onAction('reset');});actions.append(reset);actionControls.push(reset);
  const loadText=make('p','plush-reference-load','正在准备本地角色资产…');loadText.setAttribute('role','status');loadText.setAttribute('aria-live','polite');sidebar.append(loadText);
  sidebar.append(make('p','plush-reference-scope','资产由 abstrakt 制作，以 CC BY 4.0 授权；本项目增加坐标适配、场景与互动。原作没有独立毛发曲线，这里的毛长、卷曲和梳理通过蓝色绒毛高斯的形变实现，黑色眼睛和帽子受保护。它适合调整原有质感；逐根修剪请切回「'+nativeLabel+'」。'));
  const destinations=make('nav','plush-reference-destinations');destinations.setAttribute('aria-label','在其他工作台创作');
  for(const [key,title,file] of [['creation','绒毛创作','index.html'],['world','小世界','world.html'],['splat','展示台','splat.html']]){const destination=make('a','',title);destination.href=file+'?plushView=reference';if(key===context)destination.setAttribute('aria-current','page');destinations.append(destination);}
  sidebar.append(destinations);nativeControls.parentElement.insertBefore(sidebar,nativeControls);
  const extraVisibility=new Map(nativeExtras.map(element=>[element,element.hidden]));let current='native';
  function select(view,{focus=false,updateUrl=true,notify=true}={}){
    if(!['native','reference'].includes(view))return;const changed=view!==current;current=view;const showingOriginal=view==='reference';
    if(changed&&showingOriginal)for(const element of nativeExtras)extraVisibility.set(element,element.hidden);
    stage.dataset.plushView=view;nativeStage.hidden=false;nativeStage.inert=false;nativeStage.setAttribute('aria-labelledby',prefix+'-tab-'+view);
    nativeControls.hidden=showingOriginal&&!keepNativeControls;nativeControls.inert=nativeControls.hidden;panel.hidden=!showingOriginal;sidebar.hidden=!showingOriginal;
    for(const [element,hidden] of extraVisibility){if(showingOriginal)element.hidden=true;else if(changed)element.hidden=hidden;}
    for(const tab of [own,original]){const active=tab.dataset.plushViewTab===view;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;if(active&&focus)tab.focus();}
    if(updateUrl){const href=plushViewUrl(browser.location.href,view);if(href!==browser.location.href)browser.history.replaceState(browser.history.state,'',href);}
    if(changed&&notify)onViewChange(view);
  }
  for(const tab of [own,original]){
    tab.addEventListener('click',()=>select(tab.dataset.plushViewTab));
    tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();select(event.key==='Home'?'native':event.key==='End'?'reference':current==='native'?'reference':'native',{focus:true});});
  }
  browser.addEventListener('popstate',()=>select(plushViewFromUrl(browser.location.href),{updateUrl:false}));select(plushViewFromUrl(browser.location.href),{updateUrl:false,notify:false});
  return {select,view:()=>current,canInteract:()=>true,status(message,{ready:isReady=true}={}){ready=isReady;loadText.textContent=message;for(const control of actionControls)control.disabled=!ready;syncHistory();},setStyle({tint:color='#ffffff',size:scale=1,fur={length:1,curl:0}}={}){tint.value=color||'#ffffff';size.value=scale;for(const key of ['length','curl']){const value=fur[key]??(key==='length'?1:0);furSliders[key].input.value=value;furSliders[key].output.textContent=Math.round(value*100)+'%';}},setSpinning(value){actions.children[1].setAttribute('aria-pressed',String(!!value));},setGrooming(value){brush.setAttribute('aria-pressed',String(!!value));brush.textContent=value?'结束梳理':'开启梳理';stage.dataset.plushGrooming=String(!!value);},setHistory({undo=false,redo=false}={}){canUndo=undo;canRedo=redo;syncHistory();}};
}
