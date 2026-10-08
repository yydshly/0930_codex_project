import {GRID,DX} from './world.js';

export function createSimSlots(){return Array.from({length:12},()=>{const data=new ArrayBuffer(80);return {data,f:new Float32Array(data),u:new Uint32Array(data)};});}
export function writeSimSlot(slot,state,count,step,iteration,sourceCount,sourceFlow){
  const {f,u}=slot;
  u[0]=GRID[0];u[1]=GRID[1];u[2]=GRID[2];u[3]=count;
  f[4]=1/120;f[5]=DX;f[6]=state.gravity;f[7]=state.viscosity;
  f[8]=state.source[0]/DX+GRID[0]/2;f[9]=state.source[1]/DX;f[10]=state.source[2]/DX+GRID[2]/2;f[11]=sourceFlow;
  u[12]=step;u[13]=iteration;u[14]=iteration===2?1:0;u[15]=sourceCount;
  f[16]=state.flow;f[17]=16384/count;f[18]=0;f[19]=0;
  return slot.data;
}
