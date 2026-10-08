const changed=(a,b)=>a.some((v,i)=>Math.abs(v-b[i])>1e-7);

// Screen-space transmission and its depth reconstruction must use one camera.
// Active distant views reuse at most one frame. Frozen poses may reuse until
// camera or content changes, including the first frame on either side of pause.
export function waterPassDecision(current,previous){
 if(!previous)return 'initial';
 if(current.width!==previous.width||current.height!==previous.height)return 'resize';
 if(current.revision!==previous.revision)return 'invalidate';
 if(changed(current.projection,previous.projection))return 'projection';
 if(changed(current.world,previous.world))return 'camera';
 if(!!current.paused!==!!previous.paused)return current.paused?'pause':'resume';
 if(current.paused){if(current.content==null||current.content!==previous.content)return 'content';return 'reuse';}
 if(current.altitude<1.8)return 'near';
 return current.frame-previous.frame>=2?'cadence':'reuse';
}
