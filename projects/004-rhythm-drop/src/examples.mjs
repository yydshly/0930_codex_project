import {validateWork} from './works.mjs';

// Scene and score stay intact; these letters give each movement a concrete recipient.
export const examples=[
  {storyId:'graduation',title:'写给一起长大的你',occasion:'毕业典礼 / 给同桌、室友与一起熬过夜的人',bpm:88,ending:'下一站各自精彩。回头时，我们还在。',chapters:[
    {title:'第一次相遇',line:'那年九月，我们还不知道彼此的名字。'},
    {title:'一起走过的日子',line:'后来，借过的笔、熬过的夜，都成了我们。'},
    {title:'把勇气留给下一站',line:'这次没有标准答案，往前走就好。'},
    {title:'我们各自发光',line:'走不同的路，也记得偶尔说声：我很好。'}]},
  {storyId:'night',title:'给凌晨还醒着的你',occasion:'深夜陪伴 / 给正在独自消化心事的人',bpm:72,ending:'天会慢慢亮。你也可以慢慢来。',chapters:[
    {title:'先陪你坐一会儿',line:'今晚，不急着把所有事情想明白。'},
    {title:'只走眼前这一小段',line:'先喝一口水，再把肩膀放松一点。'},
    {title:'还有人为你留灯',line:'那些亮着的窗，也有人和你一样还醒着。'},
    {title:'等第一束光',line:'等天亮了，我们再决定下一步。'}]},
  {storyId:'rain',title:'今天先照顾好自己',occasion:'雨天问候 / 送给刚刚经历失落的朋友',bpm:80,ending:'雨停以后，你可以重新出发。',chapters:[
    {title:'允许今天下雨',line:'如果今天很难过，就先在伞下待一会儿。'},
    {title:'听见自己的呼吸',line:'不用解释。有人愿意陪你把这场雨等完。'},
    {title:'给心事一点空隙',line:'你不必立刻振作，也不必假装已经没事。'},
    {title:'把伞慢慢收起来',line:'等你准备好了，我们一起走进有光的地方。'}]},
  {storyId:'brand',title:'此刻，向前',occasion:'LUMA 新品开场 / 一次从微小想法到共同出发的亮相',bpm:120,brand:'LUMA',ending:'让好的想法，走进每一天。',chapters:[
    {title:'一个小小的开始',line:'它最初，只是深夜写下的一句话。'},
    {title:'有人愿意一起试试',line:'当更多人回应，一个想法开始有了形状。'},
    {title:'把力量聚在此刻',line:'每一次打磨，都在靠近今天的答案。'},
    {title:'现在，向前',line:'LUMA。把这束光，交到你的手中。'}]}
].map(work=>validateWork({format:'rhythm-drop-work',version:1,brand:'LUMA',...work}));
