from pathlib import Path
import importlib.util,threading,json,urllib.request,urllib.error,unittest,time
from http.server import ThreadingHTTPServer
P=Path(__file__).resolve().parents[1];spec=importlib.util.spec_from_file_location('frontier_room',P/'tooling/frontier-room-server.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
class RoomChecks(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.rooms=mod.Rooms();cls.server=ThreadingHTTPServer(('127.0.0.1',0),mod.server(cls.rooms));cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start();cls.api='http://127.0.0.1:'+str(cls.server.server_address[1])+'/room';cls.frames={}
 @classmethod
 def tearDownClass(cls):cls.server.shutdown();cls.server.server_close()
 def call(self,action,client=None,**kwargs):
  data={'action':action,**(client or {}),**kwargs};request=urllib.request.Request(self.api,json.dumps(data).encode(),{'Content-Type':'application/json','Origin':'http://127.0.0.1:8962'});return json.loads(urllib.request.urlopen(request,timeout=3).read())
 def room(self):
  a=self.call('create',name='青蓝');room=a['view']['room'];clients=[{'room':room,'token':a['token']}]
  for name in ['珊瑚','琥珀']:clients.append({'room':room,'token':self.call('join',room=room,name=name)['token']})
  return clients
 def started(self):
  c=self.room();self.call('start',c[0]);views=[self.call('poll',p)['view'] for p in c];return c,views
 def move(self,c,station):
  self.rooms.rooms[c['room']]['players'][next(i for i,p in enumerate(self.rooms.rooms[c['room']]['players']) if p['token']==c['token'])]['move_at']=0
  return self.call('move',c,station=station)
 def test_01_minimum_and_host(self):
  a=self.call('create',name='房主');c={'room':a['view']['room'],'token':a['token']}
  with self.assertRaises(urllib.error.HTTPError):self.call('start',c)
  b=self.call('join',room=c['room'],name='来客')
  with self.assertRaises(urllib.error.HTTPError):self.call('start',{'room':c['room'],'token':b['token']})
 def test_02_hidden_roles_and_auth(self):
  c,v=self.started();self.assertEqual(sum(x['role']=='impostor' for x in v),1)
  for view in v:
   self.assertTrue(all('role' not in p and 'token' not in p for p in view['players']))
   if view['role']=='impostor':self.assertEqual(view['patterns'],{})
  with self.assertRaises(urllib.error.HTTPError):self.call('poll',room=c[0]['room'],token='invalid')
 def test_03_tasks_and_completion(self):
  c=self.room();self.frames['initial']=self.call('poll',c[0])['view'];self.call('start',c[0]);v=[self.call('poll',p)['view'] for p in c];crew=[p for p,x in zip(c,v) if x['role']=='crew'];self.frames['progress']=self.call('poll',crew[0])['view']
  for player in crew:
   for station,pattern in mod.PATTERNS.items():
    self.move(player,station)
    with self.assertRaises(urllib.error.HTTPError):self.call('task',player,pattern=[0,0,0])
    result=self.call('task',player,pattern=pattern)
  self.assertEqual(result['view']['winner'],'船员');self.frames['complete']=result['view']
 def test_04_fake_task_no_progress(self):
  c,v=self.started();i=next(p for p,x in zip(c,v) if x['role']=='impostor');self.move(i,'garden');r=self.call('task',i,pattern=[3,2,1]);self.assertEqual(r['view']['progress'],0)
 def test_05_discussion_and_vote(self):
  c,v=self.started();impostor=next(x['self'] for x in v if x['role']=='impostor');self.call('meeting',c[0]);self.call('chat',c[0],message='我在机房看到了操作')
  for p in c:r=self.call('vote',p,target=impostor)
  self.assertEqual(r['view']['winner'],'船员');self.assertTrue(any('我在机房' in x for x in r['view']['log']))
 def test_06_sabotage_repair_and_timeout(self):
  c,v=self.started();imp=next(p for p,x in zip(c,v) if x['role']=='impostor');crew=next(p for p,x in zip(c,v) if x['role']=='crew');self.move(imp,'engine');self.call('sabotage',imp);self.move(crew,'engine')
  with self.assertRaises(urllib.error.HTTPError):self.call('meeting',c[0])
  r=self.call('repair',crew,pattern=[3,1,2]);self.assertFalse(r['view']['sabotage']);room=self.rooms.rooms[imp['room']];room['sabotage_cooldown']=0;self.call('sabotage',imp);room['deadline']=time.time()-1;r=self.call('poll',crew);self.assertEqual(r['view']['winner'],'潜伏者')
 def test_07_cors(self):
  request=urllib.request.Request(self.api,b'{"action":"create"}',{'Content-Type':'application/json','Origin':'http://foreign.invalid'})
  with self.assertRaises(urllib.error.HTTPError) as error:urllib.request.urlopen(request)
  self.assertEqual(error.exception.code,403)
 def test_08_leave_and_room_capacity(self):
  c=self.room();self.call('leave',c[0]);r=self.call('poll',c[1]);self.assertEqual(r['view']['host'],r['view']['self'])
  for i in range(4):self.call('join',room=c[1]['room'],name='玩家'+str(i))
  with self.assertRaises(urllib.error.HTTPError):self.call('join',room=c[1]['room'],name='满员')
suite=unittest.defaultTestLoader.loadTestsFromTestCase(RoomChecks);result=unittest.TextTestRunner(verbosity=1).run(suite)
(P/'notes/frontier-room-check-20261004.json').write_text(json.dumps({'passed':result.wasSuccessful(),'checks':result.testsRun,'method':'HTTP contract with three separate authorized test clients, isolated local test server. No messages sent to other people. Hidden roles, tasks, discussion, votes, sabotage, repairs, auth, CORS and capacity.'},ensure_ascii=False,indent=2),encoding='utf-8')
(P/'notes/frontier-room-preview-states-20261004.json').write_text(json.dumps(RoomChecks.frames,ensure_ascii=False,indent=2),encoding='utf-8')
raise SystemExit(0 if result.wasSuccessful() else 1)
