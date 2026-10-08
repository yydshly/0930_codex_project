import {initProjectJournal} from './project-journal.js';

// Reuse the existing journal and its storage, without changing character recipes.
let storage=null;
try{storage=window.localStorage;}catch{}
initProjectJournal({storage});

const viewer=document.querySelector('#viewer');
const viewport=document.querySelector('#reference-viewport');
const fullscreen=document.querySelector('#reference-fullscreen');
const status=document.querySelector('#reference-status');

fullscreen.addEventListener('click',async()=>{
  try{
    if(document.fullscreenElement===viewport)await document.exitFullscreen();
    else await viewport.requestFullscreen();
  }catch{
    status.textContent='当前浏览器未能进入全屏，可以使用查看器内部全屏按钮或打开原作页面。';
  }
});
document.addEventListener('fullscreenchange',()=>{
  fullscreen.textContent=document.fullscreenElement===viewport?'退出全屏':'全屏观看';
});
if(!document.fullscreenEnabled)fullscreen.hidden=true;

document.querySelector('#reference-reload').addEventListener('click',()=>{
  // A frame load event cannot confirm a cross-origin WebGL scene is ready.
  viewer.src='https://superspl.at/s?id=ca6a4c9b';
  status.textContent='已重新请求原作展台；首次加载约 114 MB，请稍候。';
});
