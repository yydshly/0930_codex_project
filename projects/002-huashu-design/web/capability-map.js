const canvas=document.querySelector('#canvas'),map=document.querySelector('#map'),scale=document.querySelector('#scale');
let width=2400,fit=true;
function setWidth(next,center=true){const old=width;const x=(canvas.scrollLeft+canvas.clientWidth/2)/old,y=(canvas.scrollTop+canvas.clientHeight/2)/old;width=Math.max(canvas.clientWidth,Math.min(4800,next));map.style.width=width+'px';scale.textContent=Math.round(width/2400*100)+'%';document.querySelector('#minus').disabled=width<=canvas.clientWidth;document.querySelector('#plus').disabled=width>=4800;if(center){canvas.scrollLeft=x*width-canvas.clientWidth/2;canvas.scrollTop=y*width-canvas.clientHeight/2;}}
document.querySelector('#fit').onclick=()=>{fit=true;setWidth(canvas.clientWidth,false);canvas.scrollTo(0,0);document.querySelector('#chapter').value='0';};
document.querySelector('#actual').onclick=()=>{fit=false;setWidth(2400);};
document.querySelector('#plus').onclick=()=>{fit=false;setWidth(width*1.35);};
document.querySelector('#minus').onclick=()=>{fit=false;setWidth(width/1.35);};
document.querySelector('#chapter').onchange=e=>{fit=false;setWidth(Math.max(canvas.clientWidth,1680),false);canvas.scrollTo(0,Number(e.target.value)*width/2400);};
new ResizeObserver(()=>{if(fit)setWidth(canvas.clientWidth,false);}).observe(canvas);
setWidth(canvas.clientWidth,false);
