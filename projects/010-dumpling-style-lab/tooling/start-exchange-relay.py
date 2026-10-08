from pathlib import Path
import subprocess,sys,time,json,urllib.request
P=Path(__file__).resolve().parents[1]
def health():
 try:
  with urllib.request.urlopen('http://127.0.0.1:8971/health',timeout=1) as r:return json.loads(r.read())
 except Exception:return None
if health() and health().get('service')=='exchange-relay':print('Existing relay ready on 8971');raise SystemExit(0)
with (P/'notes/exchange-relay-service.log').open('ab') as stream:
 process=subprocess.Popen([sys.executable,str(P/'tooling/exchange-relay-server.py')],cwd=P,stdout=stream,stderr=stream,creationflags=subprocess.CREATE_NO_WINDOW if sys.platform=='win32' else 0)
for _ in range(30):
 if health() and health().get('service')=='exchange-relay':
  (P/'notes/exchange-relay-service-20261004.json').write_text(json.dumps({'pid':process.pid,'bind':'127.0.0.1','port':8971,'persistent_database':'notes/exchange-relay.sqlite3','started':'2026-10-04'},indent=2),encoding='utf-8');print('Hidden persistent relay ready on 8971');raise SystemExit(0)
 if process.poll() is not None:break
 time.sleep(.1)
raise SystemExit('Relay did not start')
