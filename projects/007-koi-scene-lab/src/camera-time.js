// Match the existing 60 Hz response while measuring elapsed render time.
export function frameBlend(seconds, fractionAt60Hz=.12) {
  if(!Number.isFinite(seconds)||seconds<=0)return 0;
  if(!Number.isFinite(fractionAt60Hz)||fractionAt60Hz<0||fractionAt60Hz>1)
    throw new RangeError('相机平滑系数须在 0 到 1 之间');
  if(fractionAt60Hz===1)return 1;
  return -Math.expm1(60*Math.log1p(-fractionAt60Hz)*seconds);
}

// OrbitControls r160 receives deltaTime for autorotation, but its damping is
// still per update. Apply one elapsed-time coefficient per rendered frame.
// Restore the public setting so input-event updates retain their normal gain.
export function updateOrbitControls(controls, seconds=1/60) {
  const elapsed=Number.isFinite(seconds)&&seconds>0?seconds:0;
  const damping=controls.dampingFactor;
  if(controls.enableDamping)controls.dampingFactor=frameBlend(elapsed,damping);
  try{return controls.update(elapsed);}
  finally{controls.dampingFactor=damping;}
}
