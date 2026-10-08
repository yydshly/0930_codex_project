import {createShoreline} from './fish-steering.js';
const NS='http://www.w3.org/2000/svg';
const node=(tag,attributes={})=>{const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attributes))e.setAttribute(k,String(v));return e;};
export function createExperimentPlot(state){
 const a=state.results.baseline,b=state.results.current,reference=a||b,container=document.createElement('div');container.className='experiment-plot';
 const title=document.createElement('h3');title.textContent='俯视轨迹与位置对照';const label=document.createElement('label');label.textContent='跟踪锦鲤 ';const select=document.createElement('select');select.setAttribute('aria-label','选择轨迹中的锦鲤');
 for(let i=0;i<reference.positions.length;i++){const option=document.createElement('option');option.value=i;option.textContent='第 '+(i+1)+' 条';select.append(option);}label.append(select);
 const svg=node('svg',{viewBox:'0 0 560 330',role:'img','aria-label':'同一起点运行的 A 与 B 锦鲤轨迹和最终位置'});
 const caption=document.createElement('p');caption.textContent='蓝色 A · 红色 B；实线为所选鱼每0.25秒记录的轨迹，圆点为全部鱼的终点，灰线连接两组终点差。';
 container.append(title,label,svg,caption);
 function render(){svg.replaceChildren();const habitat=state.baseline.context.habitat,outline=habitat?.polygon||createShoreline(reference.settings.pondScale).vertices,all=[...outline,...(a?.positions||[]).map(p=>({x:p[0],z:p[2]})),...(b?.positions||[]).map(p=>({x:p[0],z:p[2]}))];
  const minX=Math.min(...all.map(p=>p.x)),maxX=Math.max(...all.map(p=>p.x)),minZ=Math.min(...all.map(p=>p.z)),maxZ=Math.max(...all.map(p=>p.z)),scale=Math.min(500/Math.max(.1,maxX-minX),260/Math.max(.1,maxZ-minZ)),cx=(minX+maxX)/2,cz=(minZ+maxZ)/2;
  const map=(x,z)=>[280+(x-cx)*scale,158+(z-cz)*scale];
  const path=points=>points.map((p,i)=>(i?'L':'M')+map(p.x,p.z).join(',')).join(' ');
  svg.append(node('path',{d:path(outline)+' Z',fill:'#e8f0ea',stroke:'#aebdb0','stroke-width':1.5}));
  for(const o of habitat?.obstacles||[]){const [x,y]=map(o.x,o.z);svg.append(node('circle',{cx:x,cy:y,r:o.radius*scale,fill:'#d0d6cf',stroke:'#a2afa2'}));}
  for(let i=0;i<Math.min(a?.positions.length||0,b?.positions.length||0);i++){const [x1,y1]=map(a.positions[i][0],a.positions[i][2]),[x2,y2]=map(b.positions[i][0],b.positions[i][2]);svg.append(node('line',{x1,y1,x2,y2,stroke:'#7c8c7d','stroke-opacity':.45,'stroke-width':1}));}
  const chosen=Number(select.value)||0;
  for(const [result,color,name]of [[a,'#4178ae','A'],[b,'#c25f46','B']])if(result){
   const track=(result.history||[]).filter(s=>s.positions[chosen]).map(s=>({x:s.positions[chosen][0],z:s.positions[chosen][2]}));
   if(track.length)svg.append(node('path',{d:path(track),fill:'none',stroke:color,'stroke-width':2.5,'stroke-linecap':'round','data-track':name}));
   for(const [i,p]of result.positions.entries()){const [cx,cy]=map(p[0],p[2]),circle=node('circle',{cx,cy,r:i===chosen?5.5:3,fill:color,'fill-opacity':i===chosen?1:.55,stroke:i===chosen?'white':'none','stroke-width':1.4,'data-endpoint':name});const info=node('title');info.textContent=name+' 第'+(i+1)+'条：('+p[0].toFixed(3)+', '+p[2].toFixed(3)+')';circle.append(info);svg.append(circle);}
  }
  const metres=Math.max(.1,Math.min(1,Math.round((maxX-minX)*.2*10)/10)),length=metres*scale;svg.append(node('line',{x1:30,y1:306,x2:30+length,y2:306,stroke:'#526b59','stroke-width':2}));const text=node('text',{x:30,y:295,fill:'#526b59','font-size':11});text.textContent=metres+' 场景单位';svg.append(text);
 }
 select.addEventListener('change',render);render();return container;
}
