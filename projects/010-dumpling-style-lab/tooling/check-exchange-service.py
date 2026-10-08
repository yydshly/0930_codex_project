from pathlib import Path
import importlib.util,tempfile,json,concurrent.futures,urllib.request,urllib.error,threading
P=Path(__file__).resolve().parents[1];spec=importlib.util.spec_from_file_location('relay',P/'tooling/exchange-relay-server.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);checks=[]
route=[36,24,25,26,27,15,16,28,40,52,64,65,66,67,68,56,44,32,33,34,35,47];owner='a'*48;carrier='b'*48
def check(name,value):assert value,name;checks.append(name)
def rejects(fn):
 try:fn()
 except m.RelayError:return True
 return False
with tempfile.TemporaryDirectory() as tmp:
 assert Path(tmp).resolve().is_relative_to(Path(tempfile.gettempdir()).resolve())
 db=Path(tmp)/'relay.sqlite3';r=m.Relay(db);published=r.call({'action':'publish','key':owner,'route':route});code=published['code'];check('valid route published without recipient or completion',published['status']=='waiting' and published['step']==0)
 check('same publish retry is idempotent',r.call({'action':'publish','key':owner,'route':route})==published)
 check('lost publish response recoverable by owner identity',r.call({'action':'lookup','key':owner})==published)
 check('invalid route cannot be published',rejects(lambda:r.call({'action':'publish','key':'c'*48,'route':[36,47]})))
 check('originator cannot claim its own identity',rejects(lambda:r.call({'action':'claim','key':owner,'code':code})))
 claimed=r.call({'action':'claim','key':carrier,'code':code});check('independent recipient claims route from database',claimed['status']=='claimed' and claimed['route']==route)
 check('second claimant rejected',rejects(lambda:r.call({'action':'claim','key':'c'*48,'code':code})))
 check('unauthorized record read rejected',rejects(lambda:r.call({'action':'read','key':'d'*48,'code':code})))
 check('recipient cannot skip ahead',rejects(lambda:r.call({'action':'walk','key':carrier,'code':code,'from':0,'to':route[4]})))
 first=r.call({'action':'walk','key':carrier,'code':code,'from':0,'to':route[1]});check('first step updates authoritative position',first['step']==1)
 check('lost-response step retry idempotent',r.call({'action':'walk','key':carrier,'code':code,'from':0,'to':route[1]})==first)
 r=m.Relay(db);check('restart preserves claim and progress',r.call({'action':'read','key':carrier,'code':code})==first)
 for i in range(1,len(route)-1):result=r.call({'action':'walk','key':carrier,'code':code,'from':i,'to':route[i+1]})
 check('ordinary steps reach terminal and genuine completion',result['status']=='complete' and result['step']==len(route)-1)
 check('author sees same final result after recipient finish',r.call({'action':'read','key':owner,'code':code})==result)
 check('completed retry cannot advance twice',r.call({'action':'walk','key':carrier,'code':code,'from':len(route)-2,'to':route[-1]})==result)
 race=r.call({'action':'publish','key':'e'*48,'route':route});
 def claim(key):
  try:return r.call({'action':'claim','key':key,'code':race['code']})['status']=='claimed'
  except m.RelayError:return False
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(claim,['f'*48,'0'*48]))
 check('concurrent claims admit exactly one recipient',sum(results)==1)
 server=m.ThreadingHTTPServer(('127.0.0.1',0),m.handler_for(r));thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();url='http://127.0.0.1:'+str(server.server_port)
 def http(origin,data):
  req=urllib.request.Request(url+'/relay',data=json.dumps(data).encode(),headers={'Origin':origin,'Content-Type':'application/json'})
  try:
   with urllib.request.urlopen(req) as v:return v.status,dict(v.headers),json.loads(v.read())
  except urllib.error.HTTPError as e:return e.code,dict(e.headers),json.loads(e.read())
 check('HTTP rejects foreign origin before mutation',http('https://foreign.example',{'action':'read','key':owner,'code':code})[0]==403)
 status,headers,body=http('http://127.0.0.1:8962',{'action':'read','key':owner,'code':code});check('HTTP creator receives final route and allowed CORS',status==200 and body['status']=='complete' and headers['Access-Control-Allow-Origin']=='http://127.0.0.1:8962')
 check('HTTP invalid identity rejected',http('http://127.0.0.1:8962',{'action':'read','key':'bad','code':code})[0]==400)
 server.shutdown();server.server_close();thread.join()
(P/'notes/exchange-service-checks-20261004.json').write_text(json.dumps({'passed':True,'count':len(checks),'checks':checks,'scope':'Independent identities, SQLite persistence and actual HTTP; isolated test database, no real user records.'},indent=2),encoding='utf-8');print('Exchange relay service:',len(checks),'passed')
