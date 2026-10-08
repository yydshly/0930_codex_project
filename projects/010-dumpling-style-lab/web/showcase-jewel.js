import {W,H,images,canvasSurface,cover,action} from './showcase-core.js';

export const JEWEL_COLORS=['amber','jade','rose','violet','blue','pearl'];
export const JEWEL_BOUNDS={x:355,y:72,cell:64,cols:8,rows:8,width:512,height:512};
const names=['琥珀','翡翠','玫瑰晶','紫水晶','蓝宝石','月光石'],ink=['#ffd681','#a6e2c2','#f4a9b8','#c8b1ed','#a4cffa','#e3e6e6'];
const ORDER=10,MOVES=22,SEED=20261003;
const idx=(r,c)=>r*8+c,adjacent=(a,b)=>Math.abs(a%8-b%8)+Math.abs(Math.floor(a/8)-Math.floor(b/8))===1;
export function jewelMatches(board){
 const found=new Set();
 for(let r=0;r<8;r++)for(let c=0;c<8;){const color=board[idx(r,c)];let end=c+1;while(end<8&&board[idx(r,end)]===color)end++;if(color!==null&&color!==undefined&&end-c>=3)for(let k=c;k<end;k++)found.add(idx(r,k));c=end}
 for(let c=0;c<8;c++)for(let r=0;r<8;){const color=board[idx(r,c)];let end=r+1;while(end<8&&board[idx(end,c)]===color)end++;if(color!==null&&color!==undefined&&end-r>=3)for(let k=r;k<end;k++)found.add(idx(k,c));r=end}
 return [...found].sort((a,b)=>a-b);
}
export function jewelLegalMoves(board){const moves=[];for(let a=0;a<64;a++)for(const b of [a%8<7?a+1:-1,a<56?a+8:-1])if(b>=0&&board[a]!==board[b]){const trial=[...board];[trial[a],trial[b]]=[trial[b],trial[a]];if(jewelMatches(trial).length)moves.push([a,b])}return moves}
function random(s){let x=s.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return s.rng/4294967296}
function newBoard(s){let board;do{board=[];for(let r=0;r<8;r++)for(let c=0;c<8;c++){const allowed=[0,1,2,3,4,5].filter(v=>!(c>1&&board[idx(r,c-1)]===v&&board[idx(r,c-2)]===v)&&!(r>1&&board[idx(r-1,c)]===v&&board[idx(r-2,c)]===v));board.push(allowed[Math.floor(random(s)*allowed.length)])}}while(!jewelLegalMoves(board).length);return board}
function fresh(){const s={version:1,rng:SEED,board:[],phase:'idle',anim:null,selected:null,hint:[],hintTime:0,moves:MOVES,turns:0,score:0,orders:{amber:0,blue:0},combo:0,maxCombo:0,cascades:0,removed:0,invalidSwaps:0,shuffles:0,autoShuffles:0,hints:0,won:false,elapsed:0,availableMoves:0,lastClear:[],lastTurnRemoved:0,message:'委托：收集琥珀与蓝宝石各 10 枚。点两枚相邻宝石交换，三枚同色成线即可交付。'};s.board=newBoard(s);s.availableMoves=jewelLegalMoves(s.board).length;return s}
function restore(raw){
 if(!raw||raw.version!==1||!Array.isArray(raw.board)||raw.board.length!==64||!raw.board.every(v=>Number.isInteger(v)&&v>=0&&v<6))return fresh();
 const s={...fresh(),...structuredClone(raw)};
 for(const key of ['rng','moves','turns','score','combo','maxCombo','cascades','removed','invalidSwaps','shuffles','autoShuffles','hints','elapsed','lastTurnRemoved'])if(!Number.isFinite(s[key])||s[key]<0)return fresh();
 s.rng=(s.rng>>>0)||SEED;s.moves=Math.min(MOVES,Math.floor(s.moves));s.selected=Number.isInteger(s.selected)&&s.selected>=0&&s.selected<64?s.selected:null;
 if(!s.orders||!['amber','blue'].every(k=>Number.isInteger(s.orders[k])&&s.orders[k]>=0))return fresh();
 s.hint=Array.isArray(s.hint)?s.hint.filter(i=>Number.isInteger(i)&&i>=0&&i<64):[];s.hintTime=Math.max(0,Number(s.hintTime)||0);
 if(!['idle','swap','return','clear','fall','shuffle','won','lost'].includes(s.phase))return fresh();
 if(['swap','return','clear','fall','shuffle'].includes(s.phase)){
  const a=s.anim;if(!a||!Number.isFinite(a.t)||!Number.isFinite(a.duration)||a.duration<=0)return fresh();a.t=Math.max(0,Math.min(a.t,a.duration));
  if(['swap','return'].includes(s.phase)&&(!Number.isInteger(a.a)||!Number.isInteger(a.b)||!adjacent(a.a,a.b)))return fresh();
  if(s.phase==='clear'&&(!Array.isArray(a.cells)||!a.cells.length||a.cells.some(i=>!Number.isInteger(i)||i<0||i>=64)))return fresh();
  if(s.phase==='fall'&&(!Array.isArray(a.tiles)||a.tiles.length!==64||a.tiles.some(t=>!Number.isInteger(t.color)||t.color<0||t.color>5||!Number.isFinite(t.from)||!Number.isInteger(t.to)||t.to<0||t.to>=64)))return fresh();
  if(s.phase==='shuffle'&&(!Array.isArray(a.oldBoard)||a.oldBoard.length!==64||a.oldBoard.some(v=>!Number.isInteger(v)||v<0||v>5)))return fresh();
 }else s.anim=null;
 s.won=s.phase==='won';s.availableMoves=jewelLegalMoves(s.board).length;return s;
}

export async function createJewel({host,input,saved,notify,sfx}){
 const art=await images(['room',...JEWEL_COLORS],'assets/game-forms/jewel/'),{element,ctx}=canvasSurface(host),controller=new AbortController();let s=restore(saved),active=false,drag=null,dragQueue=[];
 element.setAttribute('aria-label','璀璨配单。点击或拖动两枚相邻宝石；横向或纵向三枚同色会消除，下落后继续连消。22 步内收集琥珀与蓝宝石各 10 枚。');
 element.style.touchAction='none';
 const center=i=>({x:JEWEL_BOUNDS.x+(i%8+.5)*64,y:JEWEL_BOUNDS.y+(Math.floor(i/8)+.5)*64});
 function cellAt(p){const c=Math.floor((p.x-JEWEL_BOUNDS.x)/64),r=Math.floor((p.y-JEWEL_BOUNDS.y)/64);return c>=0&&c<8&&r>=0&&r<8?idx(r,c):null}
 function point(e){const r=element.getBoundingClientRect(),scale=Math.min(r.width/W,r.height/H),w=W*scale,h=H*scale;return {x:(e.clientX-r.left-(r.width-w)/2)/scale,y:(e.clientY-r.top-(r.height-h)/2)/scale}}
 element.addEventListener('pointerdown',e=>{if(!active||s.phase!=='idle')return;const p=point(e),a=cellAt(p);if(a!==null)drag={a,p,id:e.pointerId}},{signal:controller.signal});
 element.addEventListener('pointerup',e=>{if(!drag||e.pointerId!==drag.id)return;const p=point(e),dx=p.x-drag.p.x,dy=p.y-drag.p.y;if(active&&s.phase==='idle'&&Math.max(Math.abs(dx),Math.abs(dy))>19){const r=Math.floor(drag.a/8),c=drag.a%8,rr=r+(Math.abs(dy)>Math.abs(dx)?Math.sign(dy):0),cc=c+(Math.abs(dx)>=Math.abs(dy)?Math.sign(dx):0);if(rr>=0&&rr<8&&cc>=0&&cc<8)dragQueue.push([drag.a,idx(rr,cc)])}drag=null},{signal:controller.signal});
 element.addEventListener('pointercancel',()=>{drag=null},{signal:controller.signal});
 function beginClear(cells){s.phase='clear';s.anim={t:0,duration:.28,cells};s.selected=null;s.hint=[];s.hintTime=0;s.maxCombo=Math.max(s.maxCombo,s.combo);s.message=s.combo>1?'第 '+s.combo+' 段连消 · 下落再次成线，额外得分。':'配色成线 · '+cells.length+' 枚宝石正在收集。';sfx(s.combo>1?'success':'pickup')}
 function swap(a,b){if(s.phase!=='idle'||!adjacent(a,b))return;s.selected=null;s.hint=[];s.hintTime=0;s.phase='swap';s.anim={a,b,t:0,duration:.19};s.message='正在交换相邻宝石…';sfx('turn')}
 function tap(i){if(s.phase!=='idle'||i===null)return;if(s.selected===null){s.selected=i;s.message='已选择 '+names[s.board[i]]+'。再点相邻宝石，或向相邻格拖动。'}else if(s.selected===i){s.selected=null;s.message='选择已取消。找一组可以横向或纵向成线的宝石。'}else if(adjacent(s.selected,i))swap(s.selected,i);else{s.selected=i;s.message='已改选 '+names[s.board[i]]+'。交换需要两格相邻。'}}
 function shuffle(cost=0){if(s.phase!=='idle'||s.moves<cost)return;const oldBoard=[...s.board];let next;for(let attempt=0;attempt<120;attempt++){next=[...oldBoard];for(let i=63;i>0;i--){const j=Math.floor(random(s)*(i+1));[next[i],next[j]]=[next[j],next[i]]}if(!jewelMatches(next).length&&jewelLegalMoves(next).length)break;next=null}if(!next)next=newBoard(s);s.moves-=cost;s.shuffles++;if(!cost)s.autoShuffles++;s.board=next;s.selected=null;s.hint=[];s.hintTime=0;s.phase='shuffle';s.anim={t:0,duration:.48,oldBoard};s.message=cost?'重新排布宝石，消耗 2 步。':'没有可成线的交换，宝石正在自动重排，不消耗步数。';sfx('shuffle')}
 function settle(){s.anim=null;s.selected=null;s.availableMoves=jewelLegalMoves(s.board).length;
  if(s.orders.amber>=ORDER&&s.orders.blue>=ORDER){s.phase='won';s.won=true;s.message='琥珀与蓝宝石都已配齐。这份珠宝委托完成了。';sfx('success');notify('璀璨配单完成 · '+s.turns+' 次有效交换，最高 '+s.maxCombo+' 段连消。');return}
  if(s.moves===0){s.phase='lost';s.message='步数已用完。订单还差 '+Math.max(0,ORDER-s.orders.amber)+' 枚琥珀、'+Math.max(0,ORDER-s.orders.blue)+' 枚蓝宝石。可以重新配单。';sfx('hurt');return}
  s.phase='idle';if(!s.availableMoves){shuffle();return}s.message=s.combo>1?'完成 '+s.combo+' 段连消，收集 '+s.lastTurnRemoved+' 枚。继续为订单选择交换。':'交换完成，宝石已落稳。优先寻找琥珀与蓝宝石的成线机会。';
 }
 function finishPhase(){const a=s.anim;
  if(s.phase==='swap'){const trial=[...s.board];[trial[a.a],trial[a.b]]=[trial[a.b],trial[a.a]];const cells=jewelMatches(trial);if(!cells.length){s.phase='return';s.anim={...a,t:0};s.invalidSwaps++;s.message='这次交换没有三枚同色成线，宝石退回，不消耗步数。';sfx('hurt')}else{s.board=trial;s.moves--;s.turns++;s.combo=1;s.lastTurnRemoved=0;beginClear(cells)}}
  else if(s.phase==='return'){s.phase='idle';s.anim=null;s.message='宝石已退回 · 步数保留。试试让横向或纵向三枚同色相连。'}
  else if(s.phase==='clear'){
   const remaining=[...s.board];s.lastClear=a.cells.map(i=>({index:i,color:s.board[i]}));for(const i of a.cells){const color=s.board[i];if(color===0)s.orders.amber++;if(color===4)s.orders.blue++;remaining[i]=null}s.removed+=a.cells.length;s.lastTurnRemoved+=a.cells.length;s.score+=a.cells.length*100*s.combo;
   const next=new Array(64),tiles=[];for(let c=0;c<8;c++){let target=7;for(let r=7;r>=0;r--)if(remaining[idx(r,c)]!==null){const color=remaining[idx(r,c)],to=idx(target,c);next[to]=color;tiles.push({color,from:r,to});target--}const empties=target+1;for(let r=target;r>=0;r--){const color=Math.floor(random(s)*6),to=idx(r,c);next[to]=color;tiles.push({color,from:r-empties,to})}}
   s.board=next;s.phase='fall';s.anim={t:0,duration:.43,tiles};s.message='宝石下落并补入空位…';
  }else if(s.phase==='fall'){const cells=jewelMatches(s.board);if(cells.length){s.combo++;s.cascades++;beginClear(cells)}else settle()}
  else if(s.phase==='shuffle')settle();
 }
 function hint(){if(s.phase!=='idle')return;const options=jewelLegalMoves(s.board);if(!options.length){shuffle();return}let best=options[0],score=-1;for(const pair of options){const trial=[...s.board];[trial[pair[0]],trial[pair[1]]]=[trial[pair[1]],trial[pair[0]]];const cells=jewelMatches(trial),value=cells.reduce((sum,i)=>sum+(trial[i]===0&&s.orders.amber<ORDER||trial[i]===4&&s.orders.blue<ORDER?4:1),0);if(value>score){score=value;best=pair}}s.hint=best;s.hintTime=4;s.hints++;s.message='金色边框提示一对可成线的相邻宝石。点两枚交换，提示不消耗步数。';sfx('turn')}
 function restart(){s=fresh();drag=null;dragQueue=[];sfx('shuffle')}
 function tick(dt){s.elapsed+=dt;s.hintTime=Math.max(0,s.hintTime-dt);if(!s.hintTime)s.hint=[];if(s.phase==='idle'){for(const [a,b] of dragQueue)swap(a,b);for(const p of input.pointers)tap(cellAt(p))}dragQueue=[];if(s.anim){s.anim.t+=dt;if(s.anim.t>=s.anim.duration)finishPhase()}}
 function box(x,y,w,h,fill='#041e1cce',stroke='#c8a35c5a',radius=12){ctx.fillStyle=fill;ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(x,y,w,h,radius);ctx.fill();ctx.stroke()}
 function text(t,x,y,size=16,color='#f6e5bd',align='center',weight='400'){ctx.font=weight+' '+size+'px "Microsoft YaHei",sans-serif';ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(t,x,y)}
 function gem(color,x,y,size=54,alpha=1){const im=art[JEWEL_COLORS[color]],scale=size/Math.max(im.width,im.height);ctx.save();ctx.globalAlpha=alpha;ctx.shadowColor='#0009';ctx.shadowBlur=7;ctx.shadowOffsetY=3;ctx.drawImage(im,x-im.width*scale/2,y-im.height*scale/2,im.width*scale,im.height*scale);ctx.restore()}
 function draw(){
  cover(ctx,art.room);ctx.fillStyle='#00161233';ctx.fillRect(0,0,W,H);
  box(174,97,161,458,'#041e1ce3','#cba96688',15);text('LAPIDARY / 01',254,125,11,'#cbb986');text('璀璨配单',254,162,25,'#ffe5ae','center','600');text('珠宝工坊的晚间委托',254,186,11,'#a7b9a7');
  ctx.strokeStyle='#cba9664d';ctx.beginPath();ctx.moveTo(194,205);ctx.lineTo(315,205);ctx.stroke();
  const order=(color,key,y)=>{gem(color,214,y,34);text(names[color],246,y-4,13,ink[color],'left');text(Math.min(ORDER,s.orders[key])+' / '+ORDER,246,y+17,17,'#f2e5c4','left','600');box(197,y+30,117,4,'#062420','#9f895628',2);ctx.fillStyle=ink[color];ctx.fillRect(198,y+31,115*Math.min(1,s.orders[key]/ORDER),2);if(s.orders[key]>=ORDER)text('✓',311,y+7,17,'#b6e8cc')};order(0,'amber',244);order(4,'blue',318);
  text('余下步数',254,401,12,'#b3c0aa');text(String(s.moves).padStart(2,'0'),254,445,40,s.moves<=4?'#f0a995':'#ffdd99','center','600');text('本单得分',254,478,12,'#b3c0aa');text(s.score.toLocaleString(),254,505,21,'#f6e5c4','center','600');text('最高 '+s.maxCombo+' 段连消',254,534,12,'#c5ccb4');
  box(347,64,528,528,'#031b1ad4','#d8b675a0',15);const {x,y,cell}=JEWEL_BOUNDS;
  for(let i=0;i<64;i++){const p=center(i),r=Math.floor(i/8),c=i%8;ctx.fillStyle=(r+c)%2?'#102f2d67':'#153a3452';ctx.fillRect(x+c*cell+2,y+r*cell+2,60,60);ctx.strokeStyle='#aec4a919';ctx.strokeRect(x+c*cell+2.5,y+r*cell+2.5,59,59);if(s.selected===i||s.hint.includes(i)){ctx.save();ctx.shadowColor=s.selected===i?'#ffe0a9':'#eacb77';ctx.shadowBlur=14;box(p.x-29,p.y-29,58,58,'#e7cc6d12',s.selected===i?'#fff0bf':'#e3c575',9);ctx.restore()}}
  const t=s.anim?Math.min(1,s.anim.t/s.anim.duration):0,ease=t*t*(3-2*t);
  ctx.save();ctx.beginPath();ctx.rect(x,y,512,512);ctx.clip();
  if(s.phase==='fall'){for(const tile of s.anim.tiles){const dest=center(tile.to),row=Math.floor(tile.to/8),fromY=y+(tile.from+.5)*64;gem(tile.color,dest.x,fromY+(dest.y-fromY)*ease)}}
  else if(s.phase==='shuffle'){for(let i=0;i<64;i++){const p=center(i);if(t<.5)gem(s.anim.oldBoard[i],p.x,p.y,54*(1-t*1.4),1-t*2);else gem(s.board[i],p.x,p.y,54*(.3+(t-.5)*1.4),(t-.5)*2)}}
  else for(let i=0;i<64;i++){
   const p=center(i);if(['swap','return'].includes(s.phase)&&(i===s.anim.a||i===s.anim.b)){const other=center(i===s.anim.a?s.anim.b:s.anim.a),travel=s.phase==='swap'?ease:1-ease;gem(s.board[i],p.x+(other.x-p.x)*travel,p.y+(other.y-p.y)*travel)}
   else if(s.phase==='clear'&&s.anim.cells.includes(i)){const alpha=1-ease;gem(s.board[i],p.x,p.y,54*(1+.18*Math.sin(t*Math.PI)),alpha);ctx.save();ctx.globalAlpha=Math.sin(t*Math.PI)*.8;ctx.strokeStyle=ink[s.board[i]];ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,20+18*t,0,Math.PI*2);ctx.stroke();ctx.restore()}
   else gem(s.board[i],p.x,p.y);
  }ctx.restore();
  text('8 × 8  /  横向与纵向三枚成线',611,43,13,'#e7d7ad');text(s.phase==='idle'?'点击相邻两枚 · 也可拖向相邻格':'正在配色 · '+({swap:'交换',return:'退回',clear:'收集',fall:'下落',shuffle:'重排',won:'订单完成',lost:'步数用完'}[s.phase]),611,615,13,'#e5d8b7');
  if(s.combo>1&&['clear','fall'].includes(s.phase)){box(894,229,122,103,'#032320e8','#e6bc76aa',12);text('CASCADE',955,254,11,'#d7c88b');text('× '+s.combo,955,295,31,'#ffdc89','center','600');text('连消加分',955,319,12,'#ccd9bb')}
  if(['won','lost'].includes(s.phase)){
   ctx.fillStyle='#011613b8';ctx.fillRect(x,y,512,512);box(399,204,426,239,'#082923f5','#d9b775bb',14);text(s.won?'委托已完成':'再为这份委托试一次',612,257,s.won?32:25,s.won?'#ffe0a4':'#ecc7ab','center','600');text(s.won?'琥珀与蓝宝石各十枚，已装入礼盒。':'步数用完，订单还差一点。',612,298,17,'#e3dfc5');text(s.score.toLocaleString()+' 分   /   '+s.turns+' 次交换   /   '+s.maxCombo+' 段连消',612,341,16,'#bcd7c3');text('下方「重新配单」开始新的委托',612,394,14,'#d6cbab')
  }
 }
 return {tick,draw,onStart(){active=true},setActive(value){active=!!value;if(!active){drag=null;dragQueue=[]}},getState:()=>({...structuredClone(s),bounds:{...JEWEL_BOUNDS},colors:JEWEL_COLORS.map((id,i)=>({id,name:names[i],index:i})),targets:{amber:ORDER,blue:ORDER},moveBudget:MOVES}),getStatus:()=>({goal:s.won?'珠宝委托已配齐':s.phase==='lost'?'本单结束 · 可重新配单':'22 步内收集琥珀与蓝宝石各 10 枚',message:s.message,stats:['琥珀 '+Math.min(ORDER,s.orders.amber)+' / '+ORDER,'蓝宝石 '+Math.min(ORDER,s.orders.blue)+' / '+ORDER,'余下 '+s.moves+' 步','得分 '+s.score,'最高 '+s.maxCombo+' 段连消'],actions:[action('换位提示',hint,s.phase!=='idle'),action('重排（耗 2 步）',()=>shuffle(2),s.phase!=='idle'||s.moves<2),action('重新配单',restart)]}),dispose(){controller.abort();drag=null;dragQueue=[]}};
}
