"""Generate the authorized 30-part MiniMax narration once; keep keys outside public files."""
import argparse,concurrent.futures,hashlib,json,os,re,subprocess,threading,time,urllib.error,urllib.request
from datetime import datetime,timezone
from pathlib import Path
from urllib.parse import urlsplit
PROJECT=Path(__file__).resolve().parents[1]
SCRIPT=PROJECT/'notes/narration-script.json'
REPORT=PROJECT/'notes/narration-generation.json'
PUBLIC=PROJECT/'web'
AUDIO=PUBLIC/'audio/narration'
LOCK=threading.Lock()
MODEL='speech-2.8-hd'
VOICE='doc_commentary'
ORIGINS={'api.minimax.cn','api.minimaxi.com','api.minimax.io'}
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):raise RuntimeError('API redirects refused')
def stamp():return datetime.now(timezone.utc).isoformat()
def save(path,data):
 path.parent.mkdir(parents=True,exist_ok=True)
 temp=path.with_suffix(path.suffix+'.tmp');temp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');temp.replace(path)
def credentials(env_file):
 vals={}
 if env_file:
  for line in Path(env_file).read_text(encoding='utf-8-sig').splitlines():
   m=re.match(r'^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$',line)
   if m:vals[m[1]]=m[2].strip().strip(chr(34)).strip(chr(39))
 key=vals.get('MINIMAX_API_KEY') or os.getenv('MINIMAX_API_KEY','')
 base=vals.get('MINIMAX_API_BASE') or os.getenv('MINIMAX_API_BASE','https://api.minimax.cn')
 u=urlsplit(base)
 if u.scheme!='https' or u.hostname not in ORIGINS or u.username or u.password or u.port not in (None,443) or u.query or u.fragment or u.path not in ('','/','/v1','/v1/'):raise ValueError('MiniMax official HTTPS origin required')
 if not key or '\n' in key or '\r' in key:raise ValueError('MiniMax credential unavailable')
 return key,'https://'+u.hostname
def probe(path):
 info=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration,size:stream=codec_name,sample_rate,channels','-of','json',str(path)],capture_output=True,text=True,check=True)
 d=json.loads(info.stdout);duration=float(d['format']['duration'])
 subprocess.run(['ffmpeg','-v','error','-i',str(path),'-f','null','-'],check=True,capture_output=True)
 if duration<2:raise ValueError('Audio unexpectedly short')
 return duration,d
def subtitle_data(url,duration):
 if not url:return []
 u=urlsplit(url)
 if u.scheme!='https' or not u.hostname or u.username or u.password:raise ValueError('Invalid provider subtitle URL')
 with urllib.request.urlopen(url,timeout=60) as r:data=json.load(r)
 if isinstance(data,dict):data=data.get('subtitles') or data.get('data') or data.get('subtitle') or []
 out=[]
 for item in data if isinstance(data,list) else []:
  text=str(item.get('text','')).strip();start=item.get('time_begin',item.get('start',0));end=item.get('time_end',item.get('end',0))
  # MiniMax sentence time_begin/time_end are milliseconds.
  start=float(start)/1000;end=float(end)/1000
  if text and end>=start:out.append({'start':round(start,3),'end':round(min(duration,end),3),'text':text})
 return out
def assemble_course(segments,report):
 ordered=sorted(segments,key=lambda s:(s['stage'],s['cue']))
 records=[report['segments'].get(f"{s['stage']:02d}-{s['cue']:02d}",{})for s in ordered]
 if any(r.get('status')!='succeeded' or r.get('fingerprint')!=s['fingerprint'] or not (PUBLIC/s['src']).is_file()for s,r in zip(ordered,records)):return
 fingerprint=hashlib.sha256(''.join(r['sha256']for r in records).encode()).hexdigest()
 target=AUDIO/'full-course.mp3'
 old=report.get('fullCourse',{})
 if old.get('fingerprint')==fingerprint and target.is_file() and hashlib.sha256(target.read_bytes()).hexdigest()==old.get('sha256'):return
 listing=AUDIO/'.concat-list.txt';temporary=AUDIO/'.full-course.tmp.mp3'
 listing.write_text(''.join("file '"+Path(s['src']).name+"'\n"for s in ordered),encoding='utf-8')
 try:
  subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',str(listing),'-c','copy',str(temporary)],capture_output=True,check=True)
  duration,_=probe(temporary)
  if abs(duration-sum(r['duration']for r in records))>.5:raise ValueError('Merged narration duration mismatch')
  temporary.replace(target)
  report['fullCourse']={'src':'audio/narration/full-course.mp3','duration':duration,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'fingerprint':fingerprint}
 finally:
  listing.unlink(missing_ok=True);temporary.unlink(missing_ok=True)
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--env-file');parser.add_argument('--generate',action='store_true');parser.add_argument('--limit',type=int,default=30);parser.add_argument('--workers',type=int,default=3)
 args=parser.parse_args();script=json.loads(SCRIPT.read_text(encoding='utf-8'))
 segments=[]
 for chapter in script['chapters']:
  if len(chapter['segments'])!=3:raise ValueError('Each chapter requires all three speech segments')
  for seg in chapter['segments']:
   text=seg['speech'].strip()
   if not text or len(text)>=10000:raise ValueError('Invalid speech length')
   payload={'model':MODEL,'text':text,'stream':False,'voice_setting':{'voice_id':VOICE,'speed':.95,'vol':1,'pitch':0,'emotion':'calm'},'audio_setting':{'sample_rate':32000,'bitrate':128000,'format':'mp3','channel':1},'language_boost':'Chinese','subtitle_enable':True,'subtitle_type':'sentence','output_format':'hex'}
   raw=json.dumps(payload,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()
   segments.append({'stage':chapter['stage'],'cue':seg['cue'],'payload':payload,'fingerprint':hashlib.sha256(raw).hexdigest(),'src':f"audio/narration/{chapter['stage']:02d}-{seg['cue']:02d}.mp3"})
 if len(segments)!=30 or sorted((s['stage'],s['cue'])for s in segments)!=[(s,c)for s in range(10)for c in range(3)]:raise ValueError('Full 10 chapter / 30 cue coverage required')
 billed=sum(sum(2 if '\u4e00'<=c<='\u9fff' else 1 for c in s['payload']['text'])for s in segments)
 estimate=round(billed*3.5/10000,4)
 if estimate>5:raise ValueError('Unexpectedly long script; estimated speech charge exceeds this bounded production')
 report=json.loads(REPORT.read_text(encoding='utf-8'))if REPORT.exists()else {'provider':'MiniMax','model':MODEL,'voice':VOICE,'priceSource':'https://platform.minimax.cn/docs/guides/pricing-paygo','segments':{}}
 report.update(updatedAt=stamp(),estimatedInputUnits=billed,estimatedListPriceCNY=estimate,requestedSegments=30,scriptSha256=hashlib.sha256(SCRIPT.read_bytes()).hexdigest())
 def manifest():
  chapters=[]
  for ch in script['chapters']:
   chapter={'stage':ch['stage'],'title':ch['title'],'segments':[]}
   for seg in ch['segments']:
    key=f"{ch['stage']:02d}-{seg['cue']:02d}";receipt=report['segments'].get(key,{})
    chapter['segments'].append({**seg,'src':f'audio/narration/{key}.mp3','duration':receipt.get('duration',0),'subtitles':([{**line,'source':'minimax-sentence'} for line in receipt.get('subtitles',[])] or ([{'start':0,'end':receipt.get('duration',0),'text':seg['speech'],'source':'full-segment'}] if receipt.get('duration',0)>0 else [])),'available':receipt.get('status')=='succeeded'})
   chapters.append(chapter)
  data={'version':script['version'],'provider':'MiniMax','model':MODEL,'voice':VOICE,'language':'zh-CN','chapters':chapters,'ready':all(s['available']for c in chapters for s in c['segments']),'totalDuration':round(sum(s['duration']for c in chapters for s in c['segments']),3)}
  target=PUBLIC/'narration.js';temporary=target.with_suffix('.js.tmp');temporary.write_text('/* Pre-generated MiniMax narration. No credentials or runtime API calls. */\nwindow.BlackHoleNarration=Object.freeze('+json.dumps(data,ensure_ascii=False,separators=(',',':'))+');\n',encoding='utf-8');temporary.replace(target)
  save(REPORT,report)
 if not args.generate:assemble_course(segments,report);manifest();print(json.dumps({'segments':30,'estimatedCNY':estimate,'model':MODEL,'voice':VOICE}));return
 key,base=credentials(args.env_file)
 def work(seg):
  ident=f"{seg['stage']:02d}-{seg['cue']:02d}";dest=PUBLIC/seg['src']
  with LOCK:
   old=report['segments'].get(ident)
   if old and old.get('fingerprint')==seg['fingerprint'] and old.get('status')=='succeeded' and dest.exists():print('CACHED '+ident,flush=True);return
   if old and old.get('status')in('submitting','submission_unknown'):raise RuntimeError('Unknown prior request '+ident+'; inspect before generating again')
   report['segments'][ident]={'status':'submitting','fingerprint':seg['fingerprint'],'startedAt':stamp(),'inputCharacters':len(seg['payload']['text'])};save(REPORT,report)
  raw=json.dumps(seg['payload'],ensure_ascii=False).encode();req=urllib.request.Request(base+'/v1/t2a_v2',data=raw,headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'})
  try:
   with urllib.request.build_opener(NoRedirect()).open(req,timeout=180)as res:result=json.load(res)
   code=result.get('base_resp',{}).get('status_code',0)
   if code:raise ValueError('MiniMax '+str(code)+': '+str(result.get('base_resp',{}).get('status_msg','Rejected')).replace(key,'[REDACTED]')[:180])
   data=result.get('data')or{};audio=data.get('audio')
   if data.get('status')!=2 or not isinstance(audio,str)or not audio:raise RuntimeError('Incomplete MiniMax response')
   output=bytes.fromhex(audio);dest.parent.mkdir(parents=True,exist_ok=True);temp=dest.with_suffix('.mp3.part');temp.write_bytes(output);temp.replace(dest)
   duration,metadata=probe(dest)
   try:subtitles=subtitle_data(data.get('subtitle_file')or result.get('subtitle_file'),duration)
   except Exception:subtitles=[]
   info=result.get('extra_info')or{}
   record={'status':'succeeded','fingerprint':seg['fingerprint'],'completedAt':stamp(),'src':seg['src'],'duration':duration,'providerDurationMs':info.get('audio_length'),'bytes':len(output),'sha256':hashlib.sha256(output).hexdigest(),'usageCharacters':info.get('usage_characters'),'inputCharacters':len(seg['payload']['text']),'traceId':result.get('trace_id'),'subtitles':subtitles,'metadata':metadata}
   with LOCK:report['segments'][ident]=record;manifest()
   print(json.dumps({'segment':ident,'seconds':round(duration,2),'bytes':len(output),'subtitles':len(subtitles)},ensure_ascii=False),flush=True)
  except Exception as error:
   state='rejected'if isinstance(error,(urllib.error.HTTPError,ValueError))else'submission_unknown'
   message=str(error).replace(key,'[REDACTED]')[:240]
   with LOCK:report['segments'][ident].update(status=state,error=message);manifest()
   raise RuntimeError(ident+': '+message)from None
 manifest()
 with concurrent.futures.ThreadPoolExecutor(max_workers=min(3,max(1,args.workers)))as pool:
  futures=[pool.submit(work,s)for s in segments[:args.limit]]
  for f in concurrent.futures.as_completed(futures):f.result()
 with LOCK:assemble_course(segments,report);manifest()
 print(json.dumps({'complete':all(r.get('status')=='succeeded'for r in report['segments'].values())and len(report['segments'])==30,'generated':sum(r.get('status')=='succeeded'for r in report['segments'].values()),'totalSeconds':round(sum(r.get('duration',0)for r in report['segments'].values()),2)}),flush=True)
if __name__=='__main__':main()
