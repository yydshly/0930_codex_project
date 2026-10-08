from pathlib import Path
import subprocess,sys,time,json,urllib.request
P=Path(__file__).resolve().parents[1]
def health():
 try:
  with urllib.request.urlopen('http://127.0.0.1:8963/health',timeout=1) as r:return json.loads(r.read())
 except Exception:return None
if health()=={'service':'frontier-room','version':1}:print('Existing frontier room service is ready.');raise SystemExit(0)
log=P/'notes/frontier-room-service.log'
with log.open('ab') as stream:
 process=subprocess.Popen([sys.executable,str(P/'tooling/frontier-room-server.py')],cwd=P,stdout=stream,stderr=stream,creationflags=subprocess.CREATE_NO_WINDOW if sys.platform=='win32' else 0)
for _ in range(30):
 if health()=={'service':'frontier-room','version':1}:
  (P/'notes/frontier-room-service-20261004.json').write_text(json.dumps({'pid':process.pid,'bind':'127.0.0.1','port':8963,'health':'ready','mode':'hidden local companion','started':'2026-10-04'},indent=2),encoding='utf-8');print('Hidden frontier room service ready on 8963.');raise SystemExit(0)
 if process.poll() is not None:break
 time.sleep(.1)
raise SystemExit('Room service did not start; inspect notes/frontier-room-service.log')
