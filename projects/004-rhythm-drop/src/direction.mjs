import { ballAt } from './timeline.mjs';
import { storyPointAt } from './stories.mjs';
import {identityState} from './identity-cues.mjs';
import {teamState} from './team-cues.mjs';

export const ease = t => {const n=Math.max(0,Math.min(1,t));return n*n*(3-2*n);};
// Story time and travel time differ: pauses and the long leap belong to the film.
export function directedPose(story,beat,height=2.1){
  const b=Math.max(0,Math.min(64,beat)),path=n=>storyPointAt(story,n);
  if(story===4){const state=identityState(b);return {...state.hero,index:Math.floor(b),phase:0,travel:b};}
  if(story===5){const state=teamState(b);return {...state.hero,index:Math.floor(b),phase:0,travel:b};}
  if(story===3){
    const travel=ease((b-12)/44)*64,p=path(travel),breath=Math.sin(b*Math.PI/2)*.035*(1-ease((b-52)/12));
    return {...p,y:.62+breath*height/2.1,index:Math.floor(travel),phase:0,travel};
  }
  if(story===2){
    const gather=ease((b-32)/24),pulse=Math.sin(b*Math.PI)*(.035+ease(b/24)*.08);
    return {x:Math.sin(b*.2)*(1-gather)*.5,y:1+pulse,z:0,index:Math.floor(b),phase:b%1,travel:b};
  }
  let travel=story===0?(b<6?0:(b-6)*64/58):b;
  if(story===1){
    if(b>=30&&b<32)travel=30;
    else if(b>=32&&b<36){
      const t=(b-32)/4,a=path(30),c=path(33),u=ease(t);
      return {x:a.x+(c.x-a.x)*u,y:a.y+(c.y-a.y)*u+.62+Math.sin(t*Math.PI)*(height+2),z:a.z+(c.z-a.z)*u,index:30,phase:t,travel:30+3*u};
    }else if(b>=36)travel=33+(b-36)*31/28;
  }
  const pose=ballAt(travel,height,path);
  // Quiet breathing at the opening and final landing; no perpetual end-frame bounce.
  if(story===0&&b<6)pose.y+=Math.sin(b*Math.PI/6)*.055;
  return {...pose,travel};
}
