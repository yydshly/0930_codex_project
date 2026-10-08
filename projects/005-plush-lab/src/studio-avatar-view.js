export const ORIGINAL_PLUSH_VIEWER='https://superspl.at/s?id=ca6a4c9b';

/** Keep the interactive world alive while showing the author's independent viewer. */
export function mountStudioAvatarView({root=document,onViewChange=()=>{}}={}) {
  const $=selector=>root.querySelector(selector);
  const tabs=Array.from(root.querySelectorAll('[data-avatar-view]'));
  const frame=$('#studio-reference-viewer'),stage=$('#studio-reference-stage');
  let current='companion';
  function select(view,{focus=false,updateHash=true,notify=true}={}) {
    if(!['companion','reference'].includes(view))return;
    const original=view==='reference';
    current=view;
    stage.closest('.world-card').dataset.avatarView=view;
    for(const tab of tabs){
      const active=tab.dataset.avatarView===view;
      tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
      $('#avatar-panel-'+tab.dataset.avatarView).hidden=!active;
      if(active&&focus)tab.focus();
    }
    $('#dress-link').hidden=original;$('#reference-credit-link').hidden=!original;
    $('#avatar-view-note').hidden=!original;
    // Set src once, on the user's first selection. Switching back does not reload either frame.
    if(original&&!frame.getAttribute('src'))frame.setAttribute('src',ORIGINAL_PLUSH_VIEWER);
    if(updateHash){
      const hash=original?'#reference':'';
      if(window.location.hash!==hash)window.history.replaceState(null,'',window.location.pathname+window.location.search+hash);
    }
    if(notify)onViewChange(view);
  }
  for(const tab of tabs){
    tab.addEventListener('click',()=>select(tab.dataset.avatarView));
    tab.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();const index=tabs.indexOf(tab);
      const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
      select(tabs[next].dataset.avatarView,{focus:true});
    });
  }
  const status=$('#studio-reference-status');
  $('#studio-reference-reload').addEventListener('click',()=>{
    frame.setAttribute('src',ORIGINAL_PLUSH_VIEWER);
    status.textContent='正在重载 SuperSplat 原作，请稍候。也可以从上方作者链接打开原作。';
  });
  const fullscreen=$('#studio-reference-fullscreen');
  fullscreen.disabled=typeof stage.requestFullscreen!=='function';
  fullscreen.addEventListener('click',async()=>{
    try{await stage.requestFullscreen();}
    catch{status.textContent='浏览器未能进入全屏，可打开独立展台或原作页面观看。';}
  });
  $('#studio-reference-exit').addEventListener('click',async()=>{
    try{if(root.fullscreenElement)await root.exitFullscreen();}catch{}
  });
  root.addEventListener('fullscreenchange',()=>{fullscreen.textContent=root.fullscreenElement===stage?'已进入全屏':'全屏观看';});
  window.addEventListener('hashchange',()=>select(window.location.hash==='#reference'?'reference':'companion',{updateHash:false}));
  // Mount without firing the callback before the caller has received this controller.
  if(window.location.hash==='#reference'){
    select('reference',{updateHash:false,notify:false});
  }
  return {select,canInteract:()=>current==='companion',view:()=>current};
}
