const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{const x=clamp(v);return x*x*(3-2*x);};
export const BPM=96,END_BEAT=80,DURATION=END_BEAT*60/BPM;
export const chapters=[
  {at:0,title:'大家都有自己的节拍',line:'新来的木木，还不知道怎么加入。',detail:'01 / 看见 · 先听一听',social:'一个新来的人，站在关系的边缘。'},
  {at:16,title:'总是，慢了半拍',line:'试着跟上，却好像怎么也跳不对。',detail:'02 / 试探 · 允许犹豫',social:'困难被看见，比要求跟上更重要。'},
  {at:32,title:'我给你，留一个位置',line:'小禾停下来。我们按你的节拍，试一次。',detail:'03 / 回应 · 留一拍给你',social:'留出空间，给对方一个参与的机会。'},
  {at:48,title:'原来，我们可以一起跳',line:'不同的声音，也可以成为一段合奏。',detail:'04 / 一起 · 听见彼此',social:'合作让各自的特点一起发挥作用。'},
  {at:64,title:'这一回，换我等你',line:'木木回过头，把一个节拍借给另一个人。',detail:'05 / 传递 · 把善意带下去',social:'被接住的人，也能成为接住别人的人。'}
];
const framePaths={
  mumu:[[0,-3.35,1.9],[12,-2.9,1.9],[16,-2.2,1.7],[20,-.7,1.7],[24,-.1,1.75],[28,-1.7,1.8],[32,-1.85,1.8],[36,-1.1,1.8],[44,-.65,1.7],[48,-.65,1.7],[64,-.65,1.7],[68,-2.1,1.95],[72,-1.25,1.8],[76,-.7,1.7]],
  he:[[0,.65,.5],[16,.65,-.45],[28,.65,-.45],[32,.65,1.3],[36,.7,1.6],[44,.65,.5],[64,.65,.5],[76,.75,.65]],
  mai:[[0,-.65,-1.9],[16,.65,-1.9],[32,-.65,-1.1],[48,-.65,-1.8],[64,1.55,-.8],[76,1.65,-.65]],
  dou:[[0,-5.2,2],[64,-5.2,2],[68,-3.35,2.1],[72,-2,1.95],[76,-1.85,1.8]]
};
export function positionAt(role,beat){
  const frames=framePaths[role],b=clamp(beat,0,END_BEAT);
  const index=frames.findLastIndex(f=>b>=f[0]);const a=frames[Math.max(0,index)],next=frames[index+1];
  if(!next)return {x:a[1],z:a[2]};const t=smooth((b-a[0])/(next[0]-a[0]));return {x:a[1]+(next[1]-a[1])*t,z:a[2]+(next[2]-a[2])*t};
}
export const score=[];
function note(beat,role,midi,length=1,gain=.12,type='piano'){score.push({beat,role,midi,length,gain,type});}
// Each child's phrase has a recognizable place in the same musical conversation.
for(let b=0;b<16;b+=4){[0,1,2.5].forEach((o,i)=>note(b+o,'he',[76,79,81][(i+b/4)%3],.7,.09,'bell'));if(b%8===0)note(b,'mai',48,3.3,.035,'pad');}
for(let b=0;b<24;b+=2)note(b,'mai',b%4===0?48:55,1.1,.046);
note(8,'mumu',72,1.6,.10);note(12,'mumu',74,1.4,.09);
for(const [b,m]of [[16,72],[18.5,74],[21,76],[24.5,71],[26,69]])note(b,'mumu',m,.65,.11);
for(const [b,m]of [[16,76],[18,79],[20,81],[22,79],[24,76]])note(b,'he',m,.55,.075,'bell');
// All voices rest at 28–32: the invitation needs room to be heard.
for(const [b,m]of [[32,72],[34,74],[35.5,76]])note(b,'mumu',m,1.1,.12);
for(const [b,m]of [[36.5,79],[38,81],[39.5,79]])note(b,'he',m,.9,.105,'bell');
for(const [b,m]of [[40,72],[42,74],[43,76],[44.5,79],[46,76]])note(b,b<44?'mumu':'he',m,.8,.10,b<44?'piano':'bell');
for(let b=48;b<64;b+=4){[0,1,2].forEach((o,i)=>note(b+o,'mumu',[72,76,79,81][(i+(b-48)/4)%4],.85,.11));note(b+3,'he',b<56?81:84,1.2,.085,'bell');for(const m of [b<56?48:53,b<56?55:60])note(b,'mai',m,3.8,.026,'pad');}
for(let b=48;b<64;b+=2)note(b,'mai',b<56?(b%4===0?48:55):(b%4===0?53:60),1.2,.043);
note(64,'dou',67,1.7,.095);note(66,'dou',69,1.5,.09);
for(const [b,m]of [[68,72],[70,74],[71.5,76]])note(b,'mumu',m,1.15,.10);
note(72,'dou',72,1.1,.1);note(73.5,'he',79,1.1,.075,'bell');note(74.5,'dou',76,1.1,.10);
for(const [role,m,type,gain]of [['mumu',79,'piano',.08],['he',84,'bell',.06],['mai',48,'pad',.035],['mai',55,'pad',.03],['dou',76,'piano',.07]])note(76,role,m,4,gain,type);
score.sort((a,b)=>a.beat-b.beat);
export function chapterAt(beat){return chapters[Math.min(4,Math.max(0,Math.floor(clamp(beat,0,END_BEAT)/16)))];}
export function pulseAt(role,beat){return Math.min(1,score.reduce((sum,n)=>{const age=beat-n.beat;return n.role===role&&age>=0&&age<1?sum+Math.exp(-age*5):sum;},0));}
export function jumpAt(role,beat){
  if(beat>=76||beat<0)return 0;
  const active=role==='mumu'?(beat>=16&&beat<28)||(beat>=40&&beat<64):role==='he'?beat<28||(beat>=40&&beat<64):role==='mai'?beat<24||(beat>=48&&beat<64):beat>=72&&beat<76;
  if(!active)return 0;
  // A flight lands exactly on the next musical onset; irregular phrases keep their rests.
  const onsets=score.filter(n=>n.role===role&&n.type!=='pad').map(n=>n.beat);
  if(role==='mai')onsets.push(...[0,4,8,12,16,20,48,52,56,60,64]);
  const unique=[...new Set(onsets)].sort((a,b)=>a-b);const landing=unique.find(b=>b>beat);
  const previous=unique.findLast(b=>b<=beat);if(previous===undefined||landing===undefined)return 0;
  const span=landing-previous;if(span>3.5)return 0;
  const phase=(beat-previous)/span;return Math.sin(Math.PI*phase)*(.32+(role==='mumu'&&beat<28?.10:.14));
}
export function childState(role,beat){const b=clamp(beat,0,END_BEAT),position=positionAt(role,b);if(b>=48&&b<64){position.x+=Math.sin((b-48)*Math.PI/2)*.22;position.z+=Math.sin((b-48)*Math.PI/4)*.10;}return {...position,y:jumpAt(role,b),pulse:pulseAt(role,b),visible:role!=='dou'||b>=64,worried:role==='mumu'&&b>=22&&b<34,beckon:(role==='he'&&b>=30&&b<42)||(role==='mumu'&&b>=66&&b<73),celebrate:b>=76,walking:Math.abs(positionAt(role,Math.max(0,b-.05)).x-position.x)>.001};}
