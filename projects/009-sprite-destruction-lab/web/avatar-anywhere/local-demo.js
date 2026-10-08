import {mountAvatarAnywhere} from './controller.js';

const launch=document.getElementById('launch-demo');
let instance;
launch?.addEventListener('click',()=>{
  document.querySelector('.demo-workspace')?.scrollIntoView({block:'center',behavior:'instant'});
  if(instance){instance.show();return;}
  instance=mountAvatarAnywhere({capture:async()=>{
    if(!globalThis.html2canvas)throw new Error('本页演示截图依赖未加载，请刷新。');
    // The installable extension uses captureVisibleTab; this page uses a local DOM renderer.
    return html2canvas(document.documentElement,{scale:Math.min(devicePixelRatio||1,2),x:scrollX,y:scrollY,width:innerWidth,height:innerHeight,windowWidth:innerWidth,windowHeight:innerHeight,scrollX,scrollY,logging:false,backgroundColor:null,useCORS:false});
  }});
  globalThis.AvatarAnywhere=instance;
});
