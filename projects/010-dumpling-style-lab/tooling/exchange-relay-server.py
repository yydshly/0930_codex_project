"""Loopback asynchronous relay with persistent routes and authoritative steps."""
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import sqlite3,secrets,json,threading,argparse,re,time
from contextlib import contextmanager
C=12;START=36;GOAL=47;PICKUPS={15,66,33};BLOCKED={5,6,17,18,29,41,53,77,78,39,51,63}
def valid_route(route):
 if not isinstance(route,list) or not 1<=len(route)<=84 or route[0]!=START or route[-1]!=GOAL or any(type(n)!=int or n<0 or n>=84 or n in BLOCKED for n in route):return False
 if len(set(route))!=len(route) or not PICKUPS.issubset(route):return False
 return all(abs(a%C-b%C)+abs(a//C-b//C)==1 for a,b in zip(route,route[1:]))
class RelayError(Exception):pass
class Relay:
 def __init__(self,path):
  self.path=str(path);self.lock=threading.RLock()
  with self.db() as db:db.execute('CREATE TABLE IF NOT EXISTS routes(code TEXT PRIMARY KEY, owner TEXT UNIQUE NOT NULL, carrier TEXT, route TEXT NOT NULL, step INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT "waiting", created REAL NOT NULL)')
 @contextmanager
 def db(self):
  connection=sqlite3.connect(self.path,timeout=10)
  try:
   with connection:yield connection
  finally:connection.close()
 def view(self,row):return {'code':row[0],'route':json.loads(row[3]),'step':row[4],'status':row[5]}
 def call(self,data):
  key=data.get('key','');action=data.get('action');code=data.get('code','')
  if not isinstance(key,str) or not re.fullmatch('[a-f0-9]{48}',key):raise RelayError('身份凭据无效，请从原窗口继续或重新发布')
  with self.lock,self.db() as db:
   if action=='publish':
    route=data.get('route')
    if not valid_route(route):raise RelayError('路线需相邻、不重复、避开岩脊、经过三座驿站并到达港口')
    old=db.execute('SELECT * FROM routes WHERE owner=?',(key,)).fetchone()
    if old:
     if json.loads(old[3])!=route:raise RelayError('同一次发布不能替换原路线')
     return self.view(old)
    code=''.join(secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ23456789') for _ in range(6))
    while db.execute('SELECT code FROM routes WHERE code=?',(code,)).fetchone():code=''.join(secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ23456789') for _ in range(6))
    db.execute('INSERT INTO routes(code,owner,route,created) VALUES(?,?,?,?)',(code,key,json.dumps(route),time.time()))
   elif action=='lookup':
    row=db.execute('SELECT * FROM routes WHERE owner=?',(key,)).fetchone()
    if not row:raise RelayError('该制图身份尚无已发布路线，可以重新发布')
    return self.view(row)
   else:
    if not isinstance(code,str) or not re.fullmatch('[A-Z2-9]{6}',code):raise RelayError('接力码无效')
    row=db.execute('SELECT * FROM routes WHERE code=?',(code,)).fetchone()
    if not row:raise RelayError('没有找到这条接力记录，请核对六位码')
    if action=='claim':
     if row[2] and not secrets.compare_digest(row[2],key):raise RelayError('这条路线已有接棒窗口；请在该窗口继续')
     if secrets.compare_digest(row[1],key):raise RelayError('请用接棒窗口的独立身份领取路线')
     if not row[2]:db.execute('UPDATE routes SET carrier=?,status="claimed" WHERE code=?',(key,code))
    elif action=='read':
     if not any(v and secrets.compare_digest(v,key) for v in row[1:3]):raise RelayError('无权读取这条接力进度')
    elif action=='walk':
     if not row[2] or not secrets.compare_digest(row[2],key):raise RelayError('请先在接棒窗口读取路线')
     route=json.loads(row[3]);step=row[4];start=data.get('from');target=data.get('to')
     if type(start)!=int or type(target)!=int:raise RelayError('步进数据无效')
     # A repeated response-lost request returns the same authoritative position.
     if start==step-1 and target==route[step]:return self.view(row)
     if row[5]=='complete' or start!=step or step+1>=len(route) or target!=route[step+1]:raise RelayError('只能沿真实路线前进一格，不能跳过路段')
     step+=1;db.execute('UPDATE routes SET step=?,status=? WHERE code=?',(step,'complete' if step==len(route)-1 else 'claimed',code))
    else:raise RelayError('操作不存在')
   return self.view(db.execute('SELECT * FROM routes WHERE code=?',(code,)).fetchone())
ALLOWED={'http://127.0.0.1:8962','http://localhost:8962'}
def handler_for(relay):
 class Handler(BaseHTTPRequestHandler):
  def log_message(self,*args):pass
  def response(self,status,data):
   b=json.dumps(data,ensure_ascii=False).encode();self.send_response(status);origin=self.headers.get('Origin','')
   if origin in ALLOWED:self.send_header('Access-Control-Allow-Origin',origin)
   self.send_header('Vary','Origin');self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
  def do_GET(self):self.response(200,{'service':'exchange-relay','version':1,'scope':'loopback persistent relay'}) if self.path=='/health' else self.response(404,{'error':'Not found'})
  def do_OPTIONS(self):
   if self.headers.get('Origin') not in ALLOWED:return self.response(403,{'error':'Origin rejected'})
   self.send_response(204);self.send_header('Access-Control-Allow-Origin',self.headers['Origin']);self.send_header('Access-Control-Allow-Methods','POST');self.send_header('Access-Control-Allow-Headers','Content-Type');self.end_headers()
  def do_POST(self):
   if self.path!='/relay':return self.response(404,{'error':'Not found'})
   if self.headers.get('Origin') not in ALLOWED:return self.response(403,{'error':'Origin rejected'})
   try:
    length=int(self.headers.get('Content-Length','0'))
    if not 0<length<16000:raise RelayError('请求尺寸无效')
    data=json.loads(self.rfile.read(length))
    if not isinstance(data,dict):raise RelayError('请求格式无效')
    self.response(200,relay.call(data))
   except (RelayError,ValueError,TypeError) as e:self.response(400,{'error':str(e)})
 return Handler
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8971);parser.add_argument('--db',default=str(Path(__file__).resolve().parents[1]/'notes/exchange-relay.sqlite3'));args=parser.parse_args();ThreadingHTTPServer(('127.0.0.1',args.port),handler_for(Relay(args.db))).serve_forever()
