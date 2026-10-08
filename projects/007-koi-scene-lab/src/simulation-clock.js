// A render frame may advance zero, one, or several equal simulation ticks.
// Bound catch-up work; hidden/paused time is intentionally not replayed.
export class SimulationClock {
 constructor({step=1/60,maxSteps=12}={}){if(!Number.isFinite(step)||step<=0||!Number.isInteger(maxSteps)||maxSteps<1)throw new Error('Invalid simulation clock');this.step=step;this.maxSteps=maxSteps;this.reset();}
 reset(){this.accumulator=0;this.totalSteps=0;this.droppedSeconds=0;this.inputSeconds=0;this.last={steps:0,alpha:1,simulatedSeconds:0,droppedSeconds:0};}
 get advancementRate(){return this.inputSeconds>0?Math.min(1,this.totalSteps*this.step/this.inputSeconds):null;}
 suspend(){this.accumulator=0;this.last={steps:0,alpha:1,simulatedSeconds:0,droppedSeconds:0};return this.last;}
 advance(seconds,tick,{enabled=true}={}){
  if(!Number.isFinite(seconds)||seconds<0)throw new Error('Invalid frame duration');
  if(!enabled)return this.suspend();
  this.inputSeconds+=seconds;
  const budget=this.step*this.maxSteps,input=this.accumulator+seconds,dropped=Math.max(0,input-budget);
  this.accumulator=Math.min(input,budget);const steps=Math.min(this.maxSteps,Math.floor((this.accumulator+1e-10)/this.step));
  for(let i=0;i<steps;i++)tick(this.step);
  this.accumulator=Math.max(0,this.accumulator-steps*this.step);if(this.accumulator<1e-10)this.accumulator=0;
  this.totalSteps+=steps;this.droppedSeconds+=dropped;
  this.last={steps,alpha:Math.min(1,this.accumulator/this.step),simulatedSeconds:steps*this.step,droppedSeconds:dropped};return this.last;
 }
}
