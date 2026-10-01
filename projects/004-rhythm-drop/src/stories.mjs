import {identityScore} from './identity-cues.mjs';
import {teamScore} from './team-cues.mjs';
export const STORY_BEATS = 68;
export const stories = [
  {
    id:'night', name:'把一盏灯送到天亮', occasion:'送给深夜还没睡的你', bpm:76,
    synopsis:'一颗怕黑的小光球出发了。它借着自己的微光，点亮沿途的窗，才发现黑夜里还有许多同行的人。',
    music:'原创 · 夜行钢琴与晨光弦乐', ending:'天快亮了。你也可以慢慢来。',
    chapters:[
      {name:'只有一盏灯', subtitle:'凌晨两点，城市睡着了。它决定往前走。',bg:0x07111e,accent:0x90bedc,base:0x1c3546},
      {name:'有人还醒着', subtitle:'每一次轻轻落下，都有一扇窗亮起来。',bg:0x102a38,accent:0xa8efdd,base:0x355a61},
      {name:'一起穿过黑夜', subtitle:'原来，微小的光也能连成一条路。',bg:0x243840,accent:0xffd297,base:0x617274},
      {name:'把光留给明天', subtitle:'灯火留在身后。天边，第一缕晨光来了。',bg:0x79584d,accent:0xffdfb3,base:0x9c8272}
    ],
    lines:[{beat:0,text:'今晚，也还没睡吗？'},{beat:8,text:'有一点怕黑，但还是想出发。'},{beat:18,text:'那扇窗里，也有人醒着。'},{beat:30,text:'等一等，带上这点光。'},{beat:40,text:'原来，我们并不孤单。'},{beat:54,text:'就快到了。'},{beat:62,text:'天快亮了。你也可以慢慢来。'}]
  },
  {
    id:'graduation',name:'下一站，世界',occasion:'毕业典礼 / 送给一起长大的朋友',bpm:92,
    synopsis:'沿着课本走过四年的记忆，在断开的路前停下来。深吸一口气，带着朋友的祝福，跃向新的起点。',
    music:'原创 · 校园钢琴与告别弦乐',ending:'这一程结束了。我们的故事还在继续。',
    chapters:[
      {name:'故事从这里开始',subtitle:'第一次走进教室，连未来都还没有名字。',bg:0x233b3e,accent:0xb4e5d1,base:0x53665e},
      {name:'那些一起的日子',subtitle:'书页、晚风、赶过的作业，还有一起笑过的人。',bg:0x5c4435,accent:0xffcb8c,base:0x98785b},
      {name:'到了说再见的时候',subtitle:'前面的路断开了。告别，原来需要一点勇气。',bg:0x49364d,accent:0xe5c1e0,base:0x846b87},
      {name:'下一站，世界',subtitle:'把祝福放进帽子，把未来留给自己。',bg:0x71604b,accent:0xffe2a7,base:0xb19a74}
    ],
    lines:[{beat:0,text:'还记得第一次来这里吗？'},{beat:10,text:'书很重，日子却过得很快。'},{beat:20,text:'那些一起熬过的夜。'},{beat:30,text:'这一步，留给勇敢的自己。'},{beat:34,text:'再见，不是故事的句号。'},{beat:48,text:'帽子借我一点勇气！'},{beat:62,text:'下一站，世界。'}]
  },
  {
    id:'brand',name:'让一个想法发光',occasion:'虚构品牌 LUMA / 新品发布开场',bpm:124,
    synopsis:'黑暗里，一点微光苏醒。它找到同频的伙伴，收束散落的能量，在短暂的寂静之后，形成自己的名字。',
    music:'原创 · 脉冲电子与品牌声音标记',ending:'LUMA · 让一个想法发光',
    chapters:[
      {name:'一个想法',subtitle:'一切，始于一个微小的火花。',bg:0x0b0c16,accent:0xaaa1ff,base:0x292a42},
      {name:'找到共振',subtitle:'独立的光点，开始拥有同一个节奏。',bg:0x17112f,accent:0xc49aff,base:0x494067},
      {name:'蓄势，聚合',subtitle:'每一次相遇，都让能量更接近完整。',bg:0x201a38,accent:0xe4bdff,base:0x645274},
      {name:'让想法被看见',subtitle:'散落的可能，汇成一个清晰的名字。',bg:0x07141b,accent:0xc4ffed,base:0x476e73}
    ],
    lines:[{beat:0,text:'一个想法。'},{beat:16,text:'找到与你同频的人。'},{beat:32,text:'让可能，开始聚合。'},{beat:48,text:'准备好，被看见。'}]
  },
  {
    id:'rain',name:'雨停以后',occasion:'送给暂时被雨困住的人',bpm:84,
    synopsis:'小光球撑着一把伞，听雨落在水上。它跟着雨滴的旋律慢慢出发，等云层打开，才发现光一直在路上。',
    music:'原创 · 雨滴钟琴与雨后钢琴',ending:'不必急着晴朗。光会慢慢回来。',
    chapters:[
      {name:'先听一会儿雨',subtitle:'今天，可以先不急着出发。',bg:0x101f30,accent:0x8bc9dd,base:0x274452},
      {name:'雨也有自己的节奏',subtitle:'零散的雨滴，慢慢连成旋律。',bg:0x1d3544,accent:0xaadbe2,base:0x385a68},
      {name:'云的缝隙',subtitle:'雨声渐弱。抬头的时候，看见一点光。',bg:0x394d5a,accent:0xe5d5a1,base:0x647472},
      {name:'把伞收起来',subtitle:'留下一圈涟漪，把光带回自己身上。',bg:0x677d79,accent:0xffe2b0,base:0x829a92}
    ],
    lines:[{beat:0,text:'今天，可以先不急着出发。'},{beat:12,text:'听，雨也在轻轻说话。'},{beat:24,text:'试着跟它走一小段。'},{beat:40,text:'云的另一边，会是什么？'},{beat:48,text:'原来，光一直在路上。'},{beat:60,text:'不必急着晴朗。光会慢慢回来。'}]
  },
  {
    id:'identity',name:'先听见自己',occasion:'品牌叙事实验 B / 找到同频，也保留自己',bpm:96,
    synopsis:'微光有自己的声音，却不确定会不会被听见。它遇见路过的人，也遇见接住留白的回声与托住旋律的稳稳。最后，三个不同的角色一起形成新的星座。',
    music:'原创 · 微光钢琴、回声钟琴与稳稳低音',ending:'找到同频，也保留自己。',
    chapters:[
      {name:'先听见自己',subtitle:'短、短、长，然后留一点空白。',bg:0x080e19,accent:0xffbf72,base:0x273244},
      {name:'试着被听见',subtitle:'靠近一点，又退回半步。有人路过，有人停下来。',bg:0x101326,accent:0xc4abff,base:0x343b54},
      {name:'有人接住了留白',subtitle:'一句回应，一层低音，各自的特点开始组成旋律。',bg:0x0e1c28,accent:0x83dece,base:0x31495b},
      {name:'一起成为新的星座',subtitle:'微光仍是微光，回声仍是回声，稳稳仍是稳稳。',bg:0x10212a,accent:0xe5ded0,base:0x395565}
    ],
    lines:[{beat:0,text:'先听一听，自己是什么声音。'},{beat:8,text:'短、短、长。停一下，也没关系。'},{beat:16,text:'试着靠近，又有一点犹豫。'},{beat:24,text:'有人路过。微光继续自己的节奏。'},{beat:27,text:'听，有人接住了那一点空白。'},{beat:35,text:'另一种声音，轻轻托住旋律。'},{beat:44,text:'一起停一下，听清彼此。'},{beat:48,text:'各自的特点，开始形成新的关系。'},{beat:60,text:'找到同频，也保留自己。'}]
  },
  {
    id:'team',name:'周一，第一次评审',occasion:'新成员欢迎 / 拾光工作室团队介绍 · 虚构人物示例',bpm:100,
    synopsis:'新人林夏第一次参加评审。阿澈想把功能做全，她却问：我妈妈会从哪里开始？周野把这个问题变成了可试用的原型。这是他们第一次一起做成一件事。',
    music:'原创 · 林夏的钢琴问句、阿澈的钟琴回应、周野的低音支撑',ending:'欢迎林夏。下一件事，我们一起做。',
    chapters:[
      {name:'周一，加入我们',subtitle:'09:30 / 第一次产品评审',bg:0x14232b,accent:0xffbf72,base:0x354853},
      {name:'一个不同的问题',subtitle:'功能齐全，也会让人无从开始。',bg:0x202435,accent:0xc4abff,base:0x495160},
      {name:'把想法做出来',subtitle:'让爸妈也能独立完成预约。',bg:0x18352f,accent:0x83dece,base:0x45655b},
      {name:'第一次，一起完成',subtitle:'同一个目标，三种不同的能力。',bg:0x263d37,accent:0xe9dec9,base:0x617367}
    ],
    lines:[{beat:0,text:'林夏，欢迎加入拾光。今天一起做一件小事。'},
      {beat:8,text:'我叫林夏。做设计时，我总会先想到使用它的人。'},
      {beat:16,text:'阿澈：功能再多一点，会不会更方便？'},
      {beat:20,text:'林夏：如果是我妈妈，她会从哪里开始？'},
      {beat:24,text:'林夏：可不可以，先只留一个入口？'},
      {beat:27,text:'阿澈：我明白了。把其他功能，往后放。'},
      {beat:32,text:'周野：这个版本，我来做出来。'},
      {beat:40,text:'钢琴提问，钟琴回应，低音把想法托住。'},
      {beat:44,text:'先停一下。站在用户那边，再看一遍。'},
      {beat:48,text:'这一次，爸妈也能自己完成预约。'},
      {beat:56,text:'林夏关心人，阿澈理清方向，周野让它落地。'},
      {beat:62,text:'欢迎林夏。下一件事，我们一起做。'}]
  }
];
export function chapterAt(beat) { return Math.min(3,Math.floor(Math.max(0,beat)/16)); }
export function storyPointAt(story,index) {
  const n=Math.min(64,Math.max(0,index));
  if(story===0)return {x:Math.sin(n*.38)*2.8,y:-n*.15,z:-n*2.25};
  if(story===1)return {x:Math.sin(n*.29)*3.2,y:n*.08+(n>48?(n-48)*.13:0),z:-n*2.2-(n>=32?5:0)};
  if(story===3)return {x:-3+n*.07,y:0,z:3-n*.1};
  if(story===4||story===5)return {x:0,y:0,z:0};
  return {x:Math.sin(n*.5)*Math.max(.5,4-n*.05),y:-n*.09,z:-n*1.95};
}
export function storyBeat(seconds,bpm,trackDuration=null) {
  const raw=trackDuration?seconds/trackDuration*68:seconds*bpm/60,nearest=Math.round(raw);
  return Math.max(0,Math.min(64,Math.abs(raw-nearest)<1e-7?nearest:raw));
}
export function narrativeAt(story,beat) {
  const s=stories[story];let line=s.lines[0];for(const item of s.lines)if(beat>=item.beat)line=item;
  return {chapter:chapterAt(beat),line:line.text,age:beat-line.beat,ending:beat>=64};
}
// Each story repeats a recognizable motif, with rests, harmonic changes and a final cadence.
export function scoreFor(story,i) {
  if(story===4)return identityScore(i);
  if(story===5)return teamScore(i);
  if(i>64)return [];
  const chapter=chapterAt(i),local=i%16,notes=[];
  const add=(midi,beats,gain,type='piano',offset=0)=>notes.push({midi,beats,gain,type:type==='triangle'&&beats>2?'pad':type,offset});
  if(i===64){for(const n of story===0?[48,55,60,64]:story===1?[48,55,60,67]:story===3?[50,57,62,65]:[48,60,67,72])add(n,3.7,.065,'sine');return notes;}
  if(story===0){
    const motif=[64,67,71,67,62,67,69,67],roots=[48,45,53,48];
    if(chapter===0){if(i%2===0)add(motif[(i/2)%8],1.7,.12);}
    else if(chapter===1){add(motif[local%8],1.25,.11);if(local%4===0)add(roots[chapter],3.8,.075,'triangle');}
    else if(chapter===2){if(local===14||local===15)return [];add(motif[local%8]+(local>7?12:0),1.5,.1);if(local%4===0){add(roots[chapter],3.8,.065,'triangle');add(roots[chapter]+7,3.8,.04,'sine');}}
    else{if(local%2===0)add([72,71,67,64,67,64,62,60][local/2],2.2,.105);if(local%4===0){add(48,3.9,.055,'triangle');add(55,3.9,.03);}}
  }else if(story===1){
    const melody=[60,64,67,69,67,64,62,60,62,65,69,71,69,65,64,62];
    if(i===30||i===31)return [];
    if(chapter===0){if(local%2===0)add(melody[local],1.6,.12);}
    else if(chapter===1){add(melody[local],1.1,.11);if(local%4===0)add([48,53,55,48][Math.floor(local/4)],3.5,.06,'triangle');}
    else if(chapter===2){if(local%2===0)add(melody[local]+(local>=8?12:0),1.8,.12);if(local%4===0)add(53,3.8,.065,'triangle');}
    else{add(melody[local]+12,1.5,.1);if(local%4===0){for(const n of [48,55,60])add(n,3.5,.045,'triangle');}if(local%2===1)add(79,.45,.025,'sine',.5);}
  }else if(story===3){
    const motif=[74,69,72,65,74,77,72,69];
    if(chapter===0){if(local%4===0)add(motif[local/4],1.6,.075,'bell');if(local===7||local===13)add(81,.8,.035,'bell',.5);}
    else if(chapter===1){if(local%2===0)add(motif[local/2],1.8,.085,'bell');if(local%4===0)add(50,3.8,.045,'pad');if(local===5||local===11)add(77,.9,.04,'bell',.5);}
    else if(chapter===2){if(local>=12)return [];if(local%2===0)add([65,69,72,77,76,72][local/2],2.2,.095);if(local%4===0)for(const n of [53,60])add(n,3.8,.035,'pad');if(local===2||local===6)add(81,1.1,.04,'bell',.5);}
    else{if(local%2===0)add([77,76,72,69,72,69,65,62][local/2],2.6,.09);if(local%4===0)for(const n of [50,57,62])add(n,3.8,.035,'pad');}
  }else{
    const motif=[60,67,72,79];
    if(i===46||i===47)return []; // Two beats of space before the reveal.
    if(chapter===3){
      if(i===48)add(48,4,.09,'pad');
      if(i>=52&&i<=55)add([60,67,72,79][i-52],3,.115,'piano');
      if(i===56)for(const n of [48,55,60,64])add(n,7,.045,'pad');
      return notes;
    }
    if(chapter===0){if(local%4===0)add(motif[Math.floor(local/4)],.7,.13,'triangle');}
    else{add(motif[local%4],chapter===3?1.8:.65,.1,'triangle');if(local%2===0)add(36,.25,.18,'sine');if(local%4===0)add(chapter===3?48:45,3.7,.07,'triangle');
      if(chapter===2&&local>=8)add(motif[(local+1)%4]+12,.4,.035,'triangle',.5);
      if(chapter===3&&local===0){for(const n of [60,67,72,79])add(n,4,.06,'sine');}
    }
  }
  return notes;
}
