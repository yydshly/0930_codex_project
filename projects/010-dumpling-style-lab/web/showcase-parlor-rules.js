export const PARLOR_IDS=['cascade','patience','lexicon'];
export const BLOCK_W=10,BLOCK_H=18;
export const SHAPES=[[[0,1],[1,1],[2,1],[3,1]],[[1,0],[2,0],[1,1],[2,1]],[[1,0],[0,1],[1,1],[2,1]],[[0,0],[0,1],[1,1],[2,1]],[[2,0],[0,1],[1,1],[2,1]],[[1,0],[2,0],[0,1],[1,1]],[[0,0],[1,0],[1,1],[2,1]]];
export const SUITS=['♠','♥','♣','♦'];
export const WORDS=['SHORE','LIGHT','BLOOM','CRANE','GRAIN','POINT','NIGHT','RIGHT','SIGHT','MIGHT','LATER','TRAIL','BRICK','STONE','GRACE','SLATE','ROAST','PLANT','STAMP','GLOOM','CROWN','BROWN','FRAME','FLAME'];
export const WORD_TARGETS=WORDS.slice(0,6),WORD_CLUES=['海陆相接的位置','让黑暗变得可见','花朵舒展的时刻','一种长腿鸟，也可指吊机','谷物的一粒','位置、尖端或观点'];
const copy=v=>structuredClone(v),finite=v=>typeof v==='number'&&Number.isFinite(v),integer=v=>Number.isInteger(v),mod=(v,n)=>(v%n+n)%n,emptyBoard=()=>Array.from({length:BLOCK_H},()=>Array(BLOCK_W).fill(-1));
export function blockCells(p){let cells=SHAPES[p.kind].map(v=>[...v]);if(p.kind!==1)for(let i=0;i<mod(p.rotation,4);i++)cells=cells.map(([x,y])=>[(p.kind===0?3:2)-y,x]);return cells.map(([x,y])=>({x:p.x+x,y:p.y+y}));}
export function blockFits(s,p){return blockCells(p).every(({x,y})=>x>=0&&x<BLOCK_W&&y>=-4&&y<BLOCK_H&&(y<0||s.board[y][x]<0));}
export function blockLanding(s,p=s.piece){const q=copy(p);while(blockFits(s,{...q,y:q.y+1}))q.y++;return q;}
const blockQueue=(n,mode)=> (mode==='guided'?[0,0,2,4,1,6,5,3]:[2,0,1,5,3,6,4])[mod(n,mode==='guided'?8:7)];
export function nextBlocks(s,n=3){return Array.from({length:n},(_,i)=>blockQueue(s.index+i,s.mode));}
export function freshParlor(id,choice){const common={id,version:1,time:0,moves:0,won:false,failed:false,message:''};
 if(id==='cascade'){const mode=choice==='free'?'free':'guided',board=emptyBoard();if(mode==='guided')for(let y=16;y<18;y++)for(let x=0;x<6;x++)board[y][x]=7;return {...common,mode,board,piece:{kind:blockQueue(0,mode),x:3,y:-1,rotation:0},index:1,hold:null,held:false,running:false,fall:0,lock:0,resets:0,clear:null,dropFx:null,score:0,lines:0,drops:0};}
 if(id==='patience'){const c=(s,r,up=false)=>({id:s*5+r-1,suit:s,rank:r,up}),columns=[[c(0,1,true)],[c(1,5),c(1,1,true)],[c(0,4),c(0,5),c(2,1,true)],[c(1,3),c(1,4),c(2,5),c(3,1,true)]],stock=[[0,2],[1,2],[2,2],[3,2],[0,3],[2,3],[3,3],[2,4],[3,4],[3,5]].map(([s,r])=>c(s,r));return {...common,columns,stock,waste:[],foundations:[0,0,0,0],selected:null,history:[],flip:null,redeals:0,hint:null};}
 if(id==='lexicon'){const round=integer(choice)?mod(choice,6):0;return {...common,round,target:WORD_TARGETS[round],guesses:[],draft:'',reveal:null};}throw Error('Unknown parlor '+id);
}
const validPiece=p=>p&&integer(p.kind)&&p.kind>=0&&p.kind<7&&integer(p.x)&&p.x>=-3&&p.x<=9&&integer(p.y)&&p.y>=-4&&p.y<18&&integer(p.rotation)&&p.rotation>=0&&p.rotation<4;
export const isRed=card=>card.suit===1||card.suit===3;
function validDeck(r){if(!Array.isArray(r.columns)||r.columns.length!==4||!Array.isArray(r.stock)||!Array.isArray(r.waste)||!Array.isArray(r.foundations)||r.foundations.length!==4||r.foundations.some(v=>!integer(v)||v<0||v>5))return false;
 const cards=[...r.columns.flat(),...r.stock,...r.waste];if(cards.some(c=>!c||!integer(c.suit)||c.suit<0||c.suit>3||!integer(c.rank)||c.rank<1||c.rank>5||c.id!==c.suit*5+c.rank-1||typeof c.up!=='boolean'))return false;
 const ids=cards.map(c=>c.id);for(let s=0;s<4;s++)for(let rank=1;rank<=r.foundations[s];rank++)ids.push(s*5+rank-1);if(ids.length!==20||new Set(ids).size!==20||r.stock.some(c=>c.up)||r.waste.some(c=>!c.up))return false;
 return r.columns.every(pile=>Array.isArray(pile)&&pile.length<=20&&(!pile.length||pile.at(-1).up)&&pile.every((c,i)=>!i||!pile[i-1].up||c.up&&pile[i-1].rank===c.rank+1&&isRed(pile[i-1])!==isRed(c)));
}
function selectedCards(s,selection=s.selected){if(!selection)return [];if(selection.source==='waste')return s.waste.length?[s.waste.at(-1)]:[];if(selection.source==='column'&&integer(selection.col)&&selection.col>=0&&selection.col<4&&integer(selection.i)&&selection.i>=0&&selection.i<s.columns[selection.col].length){const a=s.columns[selection.col].slice(selection.i);return a.every(c=>c.up)?a:[];}return [];}
export {selectedCards};
export function scoreWord(guess,target){const marks=Array(5).fill(0),left={};for(let i=0;i<5;i++){if(guess[i]===target[i])marks[i]=2;else left[target[i]]=(left[target[i]]||0)+1;}for(let i=0;i<5;i++)if(marks[i]!==2&&left[guess[i]]>0){marks[i]=1;left[guess[i]]--;}return marks;}
export function letterKnowledge(s){const seen={};for(const g of s.guesses)for(let i=0;i<5;i++)seen[g.word[i]]=Math.max(seen[g.word[i]]??-1,g.marks[i]);return seen;}
export function restoreParlor(id,raw){const r=raw?.state??raw,b=freshParlor(id,id==='cascade'?r?.mode:r?.round);if(!r||r.id!==id||r.version!==1)return b;try{
 if(!finite(r.time)||r.time<0||!integer(r.moves)||r.moves<0||typeof r.message!=='string'||typeof r.failed!=='boolean')return freshParlor(id);
 if(id==='cascade'){
  if(!['guided','free'].includes(r.mode)||!Array.isArray(r.board)||r.board.length!==18||r.board.some(row=>!Array.isArray(row)||row.length!==10||row.some(v=>!integer(v)||v< -1||v>7))||!validPiece(r.piece)||!integer(r.index)||r.index<1||r.index>100000||!(r.hold===null||integer(r.hold)&&r.hold>=0&&r.hold<7)||typeof r.held!=='boolean'||typeof r.running!=='boolean'||!['fall','lock'].every(k=>finite(r[k])&&r[k]>=0&&r[k]<=1.2)||!integer(r.resets)||r.resets<0||r.resets>15||!['score','lines','drops'].every(k=>integer(r[k])&&r[k]>=0))return b;
  if(r.clear&&(!Array.isArray(r.clear.rows)||!r.clear.rows.length||r.clear.rows.length>4||new Set(r.clear.rows).size!==r.clear.rows.length||r.clear.rows.some(y=>!integer(y)||y<0||y>=18||r.board[y].some(v=>v<0))||!finite(r.clear.time)||r.clear.time<0||r.clear.time>.28))return b;
  if(r.dropFx&&(!validPiece(r.dropFx.from)||!validPiece(r.dropFx.to)||!finite(r.dropFx.age)||r.dropFx.age<0||r.dropFx.age>.55))return b;
  if(!r.failed&&!r.clear&&r.lines<(r.mode==='guided'?2:6)&&!blockFits(r,r.piece))return b;
 }
 if(id==='patience'&&(!validDeck(r)||!Array.isArray(r.history)||r.history.length>128||r.history.some(v=>!validDeck(v))||r.selected&&!selectedCards(r).length||!integer(r.redeals)||r.redeals<0||r.flip&&(!integer(r.flip.col)||r.flip.col<0||r.flip.col>3||!finite(r.flip.age)||r.flip.age<0||r.flip.age>.3)||r.hint!==null&&typeof r.hint!=='string'))return b;
 if(id==='lexicon'&&(!integer(r.round)||r.round<0||r.round>=6||r.target!==WORD_TARGETS[r.round]||!Array.isArray(r.guesses)||r.guesses.length>6||r.guesses.some(g=>!WORDS.includes(g.word)||JSON.stringify(g.marks)!==JSON.stringify(scoreWord(g.word,r.target)))||new Set(r.guesses.map(g=>g.word)).size!==r.guesses.length||typeof r.draft!=='string'||!/^[A-Z]{0,5}$/.test(r.draft)||r.reveal&&(!integer(r.reveal.row)||r.reveal.row!==r.guesses.length-1||!finite(r.reveal.age)||r.reveal.age<0||r.reveal.age>.85)))return b;
 for(const k of Object.keys(b))if(Object.hasOwn(r,k))b[k]=copy(r[k]);
 if(id==='cascade')b.won=!b.clear&&b.lines>=(b.mode==='guided'?2:6);if(id==='patience')b.won=b.foundations.every(v=>v===5);if(id==='lexicon'){b.won=!b.reveal&&b.guesses.at(-1)?.word===b.target;b.failed=!b.reveal&&!b.won&&b.guesses.length===6;}return b;
 }catch{return freshParlor(id);}}
function spawnBlock(s,kind){s.piece={kind:kind??blockQueue(s.index++,s.mode),x:3,y:-1,rotation:0};s.fall=s.lock=s.resets=0;s.held=false;if(!blockFits(s,s.piece)){s.failed=true;s.running=false;s.message='堆叠到顶了，调整旋转和落点后重试。';}}
function lockBlock(s){const cells=blockCells(s.piece);if(cells.some(v=>v.y<0)){s.failed=true;s.running=false;s.message='上方空间已经不足。重新开始，再利用空槽。';return;}for(const p of cells)s.board[p.y][p.x]=s.piece.kind;s.drops++;const rows=s.board.map((r,i)=>r.every(v=>v>=0)?i:-1).filter(v=>v>=0);if(rows.length)s.clear={rows,time:0};else spawnBlock(s);}
function adjustBlock(s,candidate){if(!blockFits(s,candidate))return false;s.piece=candidate;if(s.lock>0&&s.resets<15){s.lock=0;s.resets++;}return true;}
const deckSnapshot=s=>copy({columns:s.columns,stock:s.stock,waste:s.waste,foundations:s.foundations});
function rememberDeck(s){s.history.push(deckSnapshot(s));s.history=s.history.slice(-128);s.hint=null;}
function canMoveDeck(s,selection,target){const cards=selectedCards(s,selection),first=cards[0];if(!first)return false;if(target.type==='foundation')return cards.length===1&&target.col===first.suit&&s.foundations[first.suit]===first.rank-1;if(target.type!=='column'||!integer(target.col)||target.col<0||target.col>=4||selection.source==='column'&&selection.col===target.col)return false;const top=s.columns[target.col].at(-1);return top?top.up&&top.rank===first.rank+1&&isRed(top)!==isRed(first):first.rank===5;}
export function deckHint(s){const choices=s.columns.flatMap((pile,col)=>pile.filter(c=>c.up).map(c=>({source:'column',col,i:pile.indexOf(c)})));if(s.waste.length)choices.push({source:'waste'});for(const q of choices){const c=selectedCards(s,q)[0];if(canMoveDeck(s,q,{type:'foundation',col:c.suit}))return `把${q.source==='waste'?'翻牌区':'第 '+(q.col+1)+' 列'}的 ${c.rank===1?'A':c.rank}${SUITS[c.suit]} 放到同花归位区。`;}
 for(const q of choices.filter(q=>q.source==='waste'||q.i>0))for(let col=0;col<4;col++)if(canMoveDeck(s,q,{type:'column',col})){const c=selectedCards(s,q)[0];return `将 ${c.rank===1?'A':c.rank}${SUITS[c.suit]} 移到第 ${col+1} 列，试着揭开压住的牌。`;}return s.stock.length?'还可从发牌区翻一张牌。':s.waste.length?'可重新翻发牌堆，或撤销上一步调整。':'可撤销上一步，重新整理。';}
export function commandParlor(s,k,v){if(k==='restart'){Object.assign(s,freshParlor(s.id,s.id==='cascade'?s.mode:s.round));return true;}if(s.id==='cascade'&&k==='mode'&&['guided','free'].includes(v)){Object.assign(s,freshParlor(s.id,v));return true;}if(s.id==='lexicon'&&k==='next'){Object.assign(s,freshParlor(s.id,s.round+1));return true;}if(s.won&&!(s.id==='patience'&&k==='undo'))return false;let ok=false;
 if(s.id==='cascade'){
  if(k==='launch'&&!s.failed){s.running=!s.running;ok=true;}
  if(!s.running||s.failed||s.clear)return ok;
  if(k==='move'&&[1,-1].includes(v))ok=adjustBlock(s,{...s.piece,x:s.piece.x+v});
  if(k==='rotate'&&[1,-1].includes(v)){const p={...s.piece,rotation:mod(s.piece.rotation+v,4)};for(const [x,y] of [[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1],[0,-2]])if(adjustBlock(s,{...p,x:p.x+x,y:p.y+y})){ok=true;break;}}
  if(k==='down'&&blockFits(s,{...s.piece,y:s.piece.y+1})){s.piece.y++;s.score++;s.fall=0;ok=true;}
  if(k==='drop'){const from=copy(s.piece),to=blockLanding(s);s.score+=(to.y-from.y)*2;s.piece=to;s.dropFx={from,to,age:0};lockBlock(s);ok=true;}
  if(k==='hold'&&!s.held){const kind=s.piece.kind,previous=s.hold;s.hold=kind;spawnBlock(s,previous??undefined);s.held=true;ok=true;}
 }
 if(s.id==='patience'){
  if(k==='select'){const q=v?.source==='waste'?{source:'waste'}:v?.source==='column'?{source:'column',col:v.col,i:v.i??s.columns[v.col]?.length-1}:null;if(q&&selectedCards(s,q).length){s.selected=q;ok=true;}}
  if(k==='deselect'){s.selected=null;ok=true;}
  if(k==='draw'&&(s.stock.length||s.waste.length)){rememberDeck(s);if(s.stock.length)s.waste.push({...s.stock.shift(),up:true});else{s.stock=s.waste.map(c=>({...c,up:false}));s.waste=[];s.redeals++;}s.selected=null;s.flip=null;ok=true;}
  if(k==='move'&&v&&canMoveDeck(s,s.selected,v)){rememberDeck(s);const q=s.selected,cards=q.source==='waste'?[s.waste.pop()]:s.columns[q.col].splice(q.i);if(v.type==='foundation')s.foundations[v.col]++;else s.columns[v.col].push(...cards);if(q.source==='column'){const top=s.columns[q.col].at(-1);if(top&&!top.up){top.up=true;s.flip={col:q.col,age:0};}}s.selected=null;s.won=s.foundations.every(v=>v===5);ok=true;}
  if(k==='move'&&!ok)s.message=!selectedCards(s).length?'先选一张明牌，或一组相连的明牌。':v?.type==='foundation'?'归位区要按同花 A、2、3、4、5 依次放入单张牌。':'叠牌要红黑交替、点数递减；空列从 5 开始。';
  if(k==='undo'&&s.history.length){Object.assign(s,s.history.pop());s.selected=s.flip=s.hint=null;s.won=s.foundations.every(v=>v===5);ok=true;}
  if(k==='hint'){s.hint=deckHint(s);s.message=s.hint;ok=true;}
 }
 if(s.id==='lexicon'&&!s.failed&&!s.reveal){
  if(k==='draft'&&typeof v==='string'){s.draft=v.toUpperCase().replace(/[^A-Z]/g,'').slice(0,5);ok=true;}
  if(k==='letter'&&typeof v==='string'&&/^[A-Z]$/.test(v)&&s.draft.length<5){s.draft+=v;ok=true;}
  if(k==='delete'&&s.draft.length){s.draft=s.draft.slice(0,-1);ok=true;}
  if(k==='guess'){if(!WORDS.includes(s.draft)){s.message='请提交词库中的五字母单词；也可从下方候选词填入。';return false;}if(s.guesses.some(g=>g.word===s.draft)){s.message='这个词已经试过了，换一个词比较线索。';return false;}s.guesses.push({word:s.draft,marks:scoreWord(s.draft,s.target)});s.draft='';s.reveal={row:s.guesses.length-1,age:0};ok=true;}
  if(k==='hint'){s.message='本轮词义线索：'+WORD_CLUES[s.round];ok=true;}
 }
 if(ok){s.moves++;if(!['hint','guess'].includes(k))s.message='';}return ok;
}
function stepBlocks(s,dt){if(!s.running||s.failed)return;s.time+=dt;if(s.dropFx){s.dropFx.age+=dt;if(s.dropFx.age>=.55)s.dropFx=null;}if(s.clear){s.clear.time+=dt;if(s.clear.time>=.28-1e-7){const n=s.clear.rows.length;s.board=s.board.filter((_,i)=>!s.clear.rows.includes(i));while(s.board.length<18)s.board.unshift(Array(10).fill(-1));s.lines+=n;s.score+=[0,100,300,500,800][n];s.clear=null;s.won=s.lines>=(s.mode==='guided'?2:6);if(s.won){s.running=false;s.message='横排已经整理好，空间重新打开了。';}else spawnBlock(s);}return;}
 s.fall+=dt;const interval=Math.max(.22,1.05-s.lines*.08);if(s.fall>=interval){s.fall-=interval;if(blockFits(s,{...s.piece,y:s.piece.y+1}))s.piece.y++;}if(blockFits(s,{...s.piece,y:s.piece.y+1}))s.lock=0;else{s.lock+=dt;if(s.lock>=.35)lockBlock(s);}}
export function stepParlor(s,dt){if(s.won)return;dt=Math.max(0,Math.min(.1,finite(dt)?dt:0));for(let left=dt;left>1e-7;){const d=Math.min(1/60,left);left-=d;if(s.id==='cascade')stepBlocks(s,d);else{s.time+=d;if(s.id==='patience'&&s.flip){s.flip.age+=d;if(s.flip.age>=.3)s.flip=null;}if(s.id==='lexicon'&&s.reveal){s.reveal.age+=d;if(s.reveal.age>=.85-1e-7){s.reveal=null;s.won=s.guesses.at(-1).word===s.target;s.failed=!s.won&&s.guesses.length===6;s.message=s.won?'每一格线索，都找到了位置。':s.failed?'六次线索已用完。答案是 '+s.target+'，可以换一个谜词。':'';}}}if(s.won)break;}}
