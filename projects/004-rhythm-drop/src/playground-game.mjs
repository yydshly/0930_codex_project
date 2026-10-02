export const sounds = [
  {name:'哆',midi:60,color:'#dea37c'},
  {name:'来',midi:62,color:'#b2c49c'},
  {name:'咪',midi:64,color:'#a9bfcd'},
  {name:'嗦',midi:67,color:'#d4a5b0'},
  {name:'啦',midi:69,color:'#d7c284'},
];
export const echo = [0,2,3];
export const inputPhases = ['explore','echoInput','welcome','free'];
export function newGame(){return {phase:'intro',first:[],answer:0,welcome:[],melody:[],hint:false};}

// Rhythm is expressive: only the order matters in the listening game.
export function reduceGame(state,action){
  if(action.type==='start')return {...newGame(),phase:'explore'};
  if(action.type==='advance'){
    if(action.from!==state.phase)return state;
    const next={firstReply:'echoListen',echoListen:'echoInput',echoTogether:'welcome',finale:'complete',freeListen:'free'}[state.phase];
    return next?{...state,phase:next,hint:false}:state;
  }
  if(action.type==='free'&&state.phase==='complete')return {...state,phase:'free',melody:[]};
  if(action.type==='listen'&&['complete','free'].includes(state.phase)&&state.melody.length)return {...state,phase:'freeListen'};
  if(action.type!=='tap'||!inputPhases.includes(state.phase)||!Number.isInteger(action.tile)||!sounds[action.tile])return state;
  const tile=action.tile;
  if(state.phase==='explore'){
    const first=[...state.first,tile];return {...state,first,phase:first.length===3?'firstReply':'explore'};
  }
  if(state.phase==='echoInput'){
    if(tile!==echo[state.answer])return {...state,hint:true};
    const answer=state.answer+1;return {...state,answer,hint:false,phase:answer===echo.length?'echoTogether':'echoInput'};
  }
  if(state.phase==='welcome'){
    const welcome=[...state.welcome,tile];return {...state,welcome,melody:welcome,phase:welcome.length===4?'finale':'welcome'};
  }
  return {...state,melody:[...state.melody,tile].slice(-16)};
}

export function readMelody(raw){
  try{const value=JSON.parse(raw);return Array.isArray(value)&&value.length>0&&value.length<=16&&value.every(n=>Number.isInteger(n)&&n>=0&&n<sounds.length)?value:[];}catch{return [];}
}

export function responseScore(phrase,{step=.58,ensemble=false}={}){
  return phrase.flatMap((tile,index)=>{
    const result=[{at:index*step,tile,role:'he',midi:sounds[tile].midi+12}];
    if(ensemble){result.push({at:index*step,tile,role:'mumu',midi:sounds[tile].midi});if(index%2===0)result.push({at:index*step,tile,role:'mai',midi:48});if(index%2===1)result.push({at:index*step,tile,role:'dou',midi:sounds[tile].midi+12});}
    return result;
  });
}
