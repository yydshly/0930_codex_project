export const phrase=[60,62,64];
export const signature=[{at:0,voice:'kong',midi:60,length:.30},{at:.55,voice:'kong',midi:62,length:.30},{at:1.7,voice:'kong',midi:64,length:.6}];
export const signatures={kong:signature,zhe:[{at:0,voice:'zhe',midi:72,length:.28},{at:.48,voice:'zhe',midi:76,length:.28},{at:1.05,voice:'zhe',midi:79,length:.38}],dong:[{at:0,voice:'dong',midi:48,length:.45},{at:1,voice:'dong',midi:48,length:.45},{at:2,voice:'dong',midi:55,length:.55}],su:[{at:0,voice:'su',midi:81,length:.2},{at:.25,voice:'su',midi:79,length:.2},{at:1,voice:'su',midi:76,length:.55}]};
export const performanceScore=[
  ...phrase.map((midi,i)=>({at:1+i*.65,voice:'zhe',midi:midi+12,length:.38,pan:-.5})),
  ...phrase.map((midi,i)=>({at:5.25+i*.7,voice:'kong',midi,length:.4})),
  {at:8.15,voice:'zhe',midi:76,length:.5},{at:8.8,voice:'kong',midi:64,length:.65},
];
export const REST_LENGTH=.75;
export const MEETING_LENGTH=5.65;
export const meetingScore=[
  ...phrase.map((midi,i)=>({at:2.1+i*.65,voice:'zhe',midi:midi+12,length:.4})),
  {at:4.45,voice:'kong',midi:64,length:.70,gain:.8},
  {at:4.45,voice:'zhe',midi:76,length:.70,gain:.8},
];
export const filmScore=[
  ...phrase.map((midi,i)=>({at:1+i*.7,voice:'zhe',midi:midi+12,length:.36,pan:-.5})),
  ...phrase.map((midi,i)=>({at:3.78+i*.11,voice:'kong',midi,length:.36,gain:.82})),
  ...phrase.map((midi,i)=>({at:6.9+i*.85,voice:'zhe',midi:midi+12,length:.38,pan:-.5})),
  ...phrase.map((midi,i)=>({at:11.35+i*.85,voice:'kong',midi,length:.42})),
  ...meetingScore.map(note=>({...note,at:13.9+note.at})),
];
const filmChapters=[[0,'intro'],[.8,'question'],[3.6,'crowded'],[5.2,'ready'],[6.5,'listening'],[10,'rest'],[11.2,'reply'],[13.9,'accepted'],[19.55,'complete']];
export function filmAt(time){
  const t=Math.min(20,Math.max(0,time)),chapter=filmChapters.findLast(([at])=>t>=at);
  return {time:t,phase:chapter[1],elapsed:t-chapter[0],complete:t===20};
}
export function performanceAt(time){
  const t=Math.min(10,Math.max(0,time));
  return {time:t,chapter:t<4?'听完':t<5.25?'留白':'回应',kongMode:t<4?'listening':t<5.25?'waiting':'replying',zheVisible:t>=7.7,complete:t===10};
}
export function newEpisode(){return {phase:'intro',answer:0,hint:false,heldAt:null};}
export function reduceEpisode(state,action){
  if(action.type==='start')return {...newEpisode(),phase:'question'};
  if(action.type==='advance'&&action.from===state.phase){
    const next={question:'crowded',crowded:'ready',listening:'rest',accepted:'complete'}[state.phase];
    return next?{...state,phase:next,heldAt:null}:state;
  }
  if(action.type==='listen'&&['ready','rest','reply'].includes(state.phase))return {...newEpisode(),phase:'listening'};
  if(action.type==='hold'&&state.phase==='rest'&&state.heldAt===null&&Number.isFinite(action.time))return {...state,heldAt:action.time,hint:false};
  if(action.type==='release'&&state.phase==='rest')return {...state,heldAt:null,hint:true};
  if(action.type==='tick'&&state.phase==='rest'&&state.heldAt!==null&&action.time-state.heldAt>=REST_LENGTH)return {...state,phase:'reply',heldAt:null,hint:false};
  if(action.type==='note'&&state.phase==='reply'&&Number.isInteger(action.index)&&action.index>=0&&action.index<phrase.length){
    if(action.index!==state.answer)return {...state,hint:true};
    const answer=state.answer+1;return {...state,answer,hint:false,phase:answer===phrase.length?'accepted':'reply'};
  }
  return state;
}
export function readProgress(raw){try{const value=JSON.parse(raw);return value?.version===1&&value?.episode1===true;}catch{return false;}}
