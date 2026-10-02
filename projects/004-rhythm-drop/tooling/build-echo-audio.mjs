import {writeFile} from 'node:fs/promises';
import {renderDryScore} from '../src/echo-sound.mjs';
import {signatures,performanceScore,filmScore} from '../src/echo-story.mjs';
import {emotionScore,EMOTION_DURATION} from '../src/echo-emotion.mjs';
function wav({left,right,sampleRate}){
  const data=Buffer.alloc(44+left.length*4);data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVE',8);data.write('fmt ',12);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(2,22);data.writeUInt32LE(sampleRate,24);data.writeUInt32LE(sampleRate*4,28);data.writeUInt16LE(4,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(left.length*4,40);
  for(let i=0;i<left.length;i++)for(const [channel,samples]of [[0,left],[1,right]]){const value=samples[i];if(!Number.isFinite(value)||Math.abs(value)>=.98)throw new Error('Invalid or clipped audio');data.writeInt16LE(Math.round(value*32767),44+i*4+channel*2);}
  return data;
}
export async function buildEchoAudio(root){
  for(const [id,score]of Object.entries(signatures))await writeFile(root+'web/echo/'+({kong:'kongkong',zhe:'zhezhe',dong:'dongdong',su:'susu'}[id])+'-signature.wav',wav(renderDryScore(score,4)));
  await writeFile(root+'web/echo/kongkong-performance.wav',wav(renderDryScore(performanceScore,10)));
  await writeFile(root+'web/echo/kongkong-story.wav',wav(renderDryScore(filmScore,20)));
  await writeFile(root+'web/echo/unfinished-greeting.wav',wav(renderDryScore(emotionScore,EMOTION_DURATION)));
}
