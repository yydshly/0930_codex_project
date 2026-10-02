const clamp=value=>Math.min(1,Math.max(0,value));
const mix=(a,b,t)=>a+(b-a)*t;
export const ease=(from,to,time)=>{const t=clamp((time-from)/(to-from));return t*t*(3-2*t);};

// Staging is authored around attention and turn-taking, not a looping dance.
// These cues share the audio clock, so a pause freezes acting and framing.
export function directEpisode({phase='intro',elapsed=0,friendProgress,holding=0,reducedMotion=false}={}){
  const t=Math.max(0,elapsed),meeting=phase==='accepted'||phase==='complete';
  const walk=friendProgress===undefined?(phase==='complete'?1:ease(.85,2.10,t)):clamp(friendProgress);
  const turn=meeting?(phase==='complete'?1:ease(.25,1.45,t)):0;
  const kong={mode:'waiting',emotion:'curious',look:-.75,lean:-.035,gesture:'rest',breath:1};
  const zhe={mode:'listening',emotion:'curious',look:-.65,lean:.03,gesture:'rest',walking:meeting&&walk>0&&walk<1};
  if(['question','listening'].includes(phase))Object.assign(kong,{mode:'listening',emotion:'attentive',lean:-.075,gesture:'listen'});
  if(phase==='crowded')Object.assign(kong,{emotion:t<.55?'eager':'embarrassed',look:t<.55?-.4:0,lean:.035,gesture:t<.55?'offer':'tuck'});
  if(phase==='ready')Object.assign(kong,{emotion:'hopeful',look:-.5,gesture:'tuck',lean:-.015});
  if(phase==='rest')Object.assign(kong,{emotion:'calm',look:0,gesture:'settle',breath:1-clamp(holding)*.7,lean:0});
  if(phase==='reply')Object.assign(kong,{mode:'replying',emotion:'hopeful',look:.2,gesture:'offer',lean:.025});
  if(meeting){
    Object.assign(kong,{mode:'listening',emotion:t<.8&&phase!=='complete'?'surprised':'glad',look:mix(.2,.8,turn),lean:mix(.025,-.018,turn),gesture:phase==='complete'?'wave':t>3.9?'offer':'welcome'});
    Object.assign(zhe,{mode:phase==='accepted'&&t>2.1?'replying':'listening',emotion:'glad',gesture:phase==='complete'?'wave':t>2.1?'offer':'welcome'});
  }
  const cameras={intro:[-1.35,1.30,-.35,5.25],question:[-1.35,1.32,-.25,5.10],crowded:[-.75,1.34,.45,4.25],ready:[-.8,1.34,.4,4.4],listening:[-1.32,1.32,-.25,5.10],rest:[-.75,1.34,.45,4.35],reply:[-.7,1.33,.55,4.65],accepted:[-.35,1.35,.25,5.05],complete:[.12,1.36,.57,4.45]};
  const framing=[...(cameras[phase]??cameras.intro)];
  if(phase==='accepted')framing[0]=mix(-1.55,.08,walk);
  return {
    kong,zhe,camera:reducedMotion?cameras.intro:framing,
    kongYaw:mix(-.26,.30,turn),friendVisible:meeting&&(phase==='complete'||t>=.45||friendProgress!==undefined),
    friend:{x:mix(-2.66,1.13,walk),z:mix(-.86,.65,walk)+Math.sin(walk*Math.PI)*.33,walk,emerge:phase==='complete'?1:ease(.25,.70,t)},
    connection:phase==='complete'?1:meeting?ease(3.5,5.25,t):0,
  };
}

export function noteMotion(age,{height=.25,reducedMotion=false}={}){
  if(!Number.isFinite(age)||age<0||age>.82)return {y:0,squash:0,lean:0};
  if(reducedMotion)return {y:0,squash:Math.sin(Math.min(1,age/.60)*Math.PI)*.014,lean:0};
  if(age<.075)return {y:0,squash:Math.sin(age/.075*Math.PI/2)*.075,lean:0};
  if(age<.43){const t=(age-.075)/.355;return {y:Math.sin(t*Math.PI)*height,squash:-Math.sin(t*Math.PI)*.045,lean:Math.sin(t*Math.PI)*.025};}
  const settle=(age-.43)/.39;return {y:0,squash:Math.sin(settle*Math.PI*2)*Math.exp(-settle*3)*.055,lean:0};
}
