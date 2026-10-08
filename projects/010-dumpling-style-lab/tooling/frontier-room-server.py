"""Loopback companion for the original social-deduction demonstration.

No bots. Authoritative hidden roles, per-player tasks, meetings and voting.
Run: python tooling/frontier-room-server.py (static site remains on 8962).
"""
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
import json,secrets,time,threading,argparse
ALLOWED={'http://127.0.0.1:8962','http://localhost:8962'}
STATIONS=['meeting','engine','comms','garden']
PATTERNS={'engine':[2,1,3],'comms':[1,3,2],'garden':[3,2,1]}
class RoomError(Exception):pass
class Rooms:
 def __init__(self):self.rooms={};self.lock=threading.RLock()
 def log(self,r,text):r['log'].append(text);r['log']=r['log'][-24:];r['revision']+=1
 def player(self,name):return dict(id=secrets.token_hex(4),token=secrets.token_urlsafe(24),name=str(name or '旅人')[:18],role='crew',alive=True,station='meeting',tasks=[],seen=time.time(),meetings=0)
 def expiry(self,r):
  if r['phase']=='play' and r['sabotage'] and time.time()>r['deadline']:r['phase']='ended';r['winner']='潜伏者';self.log(r,'危机未及时解除 · 潜伏者获胜')
  if r['phase']=='meeting' and time.time()>r['meeting_end']:self.resolve(r)
 def resolve(self,r):
  tally={}
  for target in r['votes'].values():tally[target]=tally.get(target,0)+1
  if tally:
   high=max(tally.values());tops=[k for k,v in tally.items() if v==high]
   if len(tops)==1 and tops[0]!='skip':
    p=next((p for p in r['players'] if p['id']==tops[0]),None)
    if p:p['alive']=False;self.log(r,p['name']+' 被投票隔离')
   else:self.log(r,'本轮票数相同或选择跳过，无人被隔离')
  else:self.log(r,'本轮没有有效投票，无人被隔离')
  r['phase']='play';r['votes']={};r['meeting_cooldown']=time.time()+12
  alive=[p for p in r['players'] if p['alive']]
  if not any(p['role']=='impostor' for p in alive):r['phase']='ended';r['winner']='船员';self.log(r,'潜伏者已被隔离 · 船员获胜')
  elif sum(p['role']=='crew' for p in alive)<=1:r['phase']='ended';r['winner']='潜伏者';self.log(r,'潜伏者掌握议会 · 潜伏者获胜')
 def view(self,r,p):
  self.expiry(r);return dict(room=r['code'],revision=r['revision'],host=r['host'],self=p['id'],role=p['role'] if r['phase']!='lobby' else None,alive=p['alive'],phase=r['phase'],winner=r['winner'],players=[{k:q[k] for k in ['id','name','alive','station']} for q in r['players']],tasks=p['tasks'][:],patterns=PATTERNS if p['role']=='crew' else {},progress=sum(len(q['tasks']) for q in r['players'] if q['role']=='crew'),goal=sum(q['role']=='crew' for q in r['players'])*3,sabotage=r['sabotage'],deadline=max(0,int(r['deadline']-time.time())) if r['sabotage'] else 0,meeting_seconds=max(0,int(r['meeting_end']-time.time())) if r['phase']=='meeting' else 0,voted=p['id'] in r['votes'],votes_count=len(r['votes']),log=r['log'][:])
 def call(self,data):
  with self.lock:
   now=time.time();self.rooms={k:r for k,r in self.rooms.items() if now-r['created']<21600};action=data.get('action');code=str(data.get('room','')).upper()
   if action=='create':
    if len(self.rooms)>=100:raise RoomError('房间已满，请稍后再试')
    code=''.join(secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ23456789') for _ in range(6))
    p=self.player(data.get('name'));r=dict(code=code,created=now,players=[p],host=p['id'],phase='lobby',winner='',sabotage=False,deadline=0,meeting_end=0,meeting_cooldown=0,sabotage_cooldown=0,votes={},revision=1,log=['房间已创建 · 等待三至六位真实玩家']);self.rooms[code]=r
    return dict(token=p['token'],view=self.view(r,p))
   r=self.rooms.get(code)
   if not r:raise RoomError('房间不存在或已过期，请新建房间')
   if action=='join':
    if r['phase']!='lobby':raise RoomError('本局已经开局，请等待新房间')
    if len(r['players'])>=6:raise RoomError('房间已有六位玩家')
    p=self.player(data.get('name'));r['players'].append(p);self.log(r,p['name']+' 加入房间');return dict(token=p['token'],view=self.view(r,p))
   p=next((q for q in r['players'] if secrets.compare_digest(q['token'],str(data.get('token','')))),None)
   if not p:raise RoomError('玩家身份失效，请重新加入房间')
   p['seen']=now;self.expiry(r)
   if action=='poll':return dict(view=self.view(r,p))
   if action=='leave':
    if r['phase']=='lobby':
     r['players'].remove(p)
     if not r['players']:del self.rooms[code];return dict(left=True)
     if r['host']==p['id']:r['host']=r['players'][0]['id']
     self.log(r,p['name']+' 离开房间')
    else:raise RoomError('本局进行中，可关闭页面；身份可用原窗口重新进入')
    return dict(left=True)
   if action=='start':
    if p['id']!=r['host'] or r['phase']!='lobby':raise RoomError('只有房主可以从大厅开局')
    if len(r['players'])<3:raise RoomError('至少需要三位真实玩家；可用其他窗口加入')
    impostor=secrets.choice(r['players']);impostor['role']='impostor';r['phase']='play';self.log(r,'深海航行开始 · 身份仅本人可见')
   elif action=='vote':
    if r['phase']!='meeting' or not p['alive']:raise RoomError('现在不能投票')
    target=data.get('target');eligible=[q['id'] for q in r['players'] if q['alive']]
    if target!='skip' and target not in eligible:raise RoomError('投票目标无效')
    if p['id'] in r['votes']:raise RoomError('本轮已经投票')
    r['votes'][p['id']]=target;self.log(r,p['name']+' 已提交投票')
    if len(r['votes'])==len(eligible):self.resolve(r)
   elif action=='chat':
    if r['phase']!='meeting' or not p['alive']:raise RoomError('讨论只在会议中进行')
    message=str(data.get('message','')).strip()[:160]
    if not message:raise RoomError('请输入讨论内容')
    if now-p.get('chat_at',0)<.7:raise RoomError('请稍等再发言')
    p['chat_at']=now;self.log(r,p['name']+'：'+message)
   else:
    if r['phase']!='play' or not p['alive']:raise RoomError('当前阶段不能进行此操作')
    if action=='move':
     station=data.get('station')
     if station not in STATIONS:raise RoomError('工位无效')
     if now-p.get('move_at',0)<.4:raise RoomError('正在通行，请稍等')
     p['station']=station;p['move_at']=now;r['revision']+=1
    elif action=='task':
     station=p['station']
     if station not in PATTERNS:raise RoomError('请先去任务工位')
     if station in p['tasks']:raise RoomError('这个任务已经完成')
     if p['role']=='crew':
      if data.get('pattern')!=PATTERNS[station]:raise RoomError('三个旋钮的顺序还不正确')
      p['tasks'].append(station)
     self.log(r,p['name']+' 在工位操作了设备')
     if sum(len(q['tasks']) for q in r['players'] if q['role']=='crew')>=sum(q['role']=='crew' for q in r['players'])*3:r['phase']='ended';r['winner']='船员';self.log(r,'全部航行任务完成 · 船员获胜')
    elif action=='sabotage':
     if p['role']!='impostor' or p['station']!='engine':raise RoomError('当前不能制造机房危机')
     if r['sabotage'] or now<r['sabotage_cooldown']:raise RoomError('危机装置正在冷却')
     r['sabotage']=True;r['deadline']=now+40;r['sabotage_cooldown']=now+60;self.log(r,'机房出现危机 · 四十秒内需要现场修复')
    elif action=='repair':
     if p['role']!='crew' or p['station']!='engine' or not r['sabotage']:raise RoomError('请由船员到机房现场修复')
     if data.get('pattern')!=[3,1,2]:raise RoomError('危机修复需要旋钮 3、1、2')
     r['sabotage']=False;self.log(r,p['name']+' 解除机房危机')
    elif action=='meeting':
     if p['station']!='meeting' or now<r['meeting_cooldown'] or p['meetings']>=2:raise RoomError('请到议会区，等待会议冷却；每人可召集两次')
     if r['sabotage']:raise RoomError('先解除机房危机，再召集会议')
     p['meetings']+=1;r['phase']='meeting';r['meeting_end']=now+60;r['votes']={};self.log(r,p['name']+' 召集会议 · 讨论后投票')
    else:raise RoomError('未知操作')
   return dict(view=self.view(r,p))
def server(rooms=None):
 store=rooms or Rooms()
 class Handler(BaseHTTPRequestHandler):
  def log_message(self,*args):pass
  def send(self,status,data):
   body=json.dumps(data,ensure_ascii=False).encode();self.send_response(status);origin=self.headers.get('Origin')
   if origin in ALLOWED:self.send_header('Access-Control-Allow-Origin',origin)
   self.send_header('Vary','Origin');self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
  def do_OPTIONS(self):
   if self.headers.get('Origin') not in ALLOWED:return self.send(403,{'error':'来源不匹配'})
   self.send_response(204);self.send_header('Access-Control-Allow-Origin',self.headers['Origin']);self.send_header('Access-Control-Allow-Headers','Content-Type');self.send_header('Access-Control-Allow-Methods','POST, GET, OPTIONS');self.send_header('Vary','Origin');self.end_headers()
  def do_GET(self):self.send(200,{'service':'frontier-room','version':1}) if self.path=='/health' else self.send(404,{'error':'路径不存在'})
  def do_POST(self):
   if self.path!='/room':return self.send(404,{'error':'路径不存在'})
   if self.headers.get('Origin') not in ALLOWED:return self.send(403,{'error':'来源不匹配'})
   try:
    size=int(self.headers.get('Content-Length','0'))
    if size<2 or size>8192:raise RoomError('请求大小无效')
    data=json.loads(self.rfile.read(size));result=store.call(data);self.send(200,result)
   except (RoomError,ValueError,TypeError,AttributeError) as e:self.send(400,{'error':str(e)})
 return Handler
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8963);args=parser.parse_args();http=ThreadingHTTPServer(('127.0.0.1',args.port),server());print('Frontier room ready at 127.0.0.1:'+str(args.port),flush=True);http.serve_forever()
