from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'web/games'
def edit(name,changes):
    p=ROOT/name;s=p.read_text(encoding='utf-8')
    for a,b in changes:
        assert a in s,(name,a[:100]);s=s.replace(a,b,1)
    p.write_text(s,encoding='utf-8')

edit('islands-world.js',[
    ("{id:'camp-depart',x:7.7", "{id:'camp-tower',x:7.7,z:.4,name:'云塔航路',kind:'tower'},\n  {id:'camp-depart',x:7.7"),
    ("name:'星纹拓片',kind:'rubbing'}]}\n", "name:'星纹拓片',kind:'rubbing'}]},\n tower:{name:'云塔岛 · 归航灯',spawn:{x:0,z:2.7},lands:[{x:0,z:0,rx:4.7,rz:4.0,n:16},{x:-6.7,z:.4,rx:1.9,rz:2.2,n:12},{x:6.7,z:.4,rx:2.0,rz:2.2,n:12}],targets:[\n  {id:'tower-return',x:0,z:3.0,name:'回营地的风帆',kind:'return'},\n  {id:'tower-note',x:-2.2,z:-1.3,name:'守灯人的留言',kind:'note'},\n  {id:'tower-wind',x:-6.55,z:.4,name:'风向校准台',kind:'wind'},\n  {id:'tower-star',x:6.55,z:.4,name:'归路星环',kind:'star'},\n  {id:'tower-beacon',x:0,z:.2,name:'归航灯开关',kind:'beacon'}]}\n"),
    ("}else{if(x>=-5.35", "}else if(s.area==='tower'){if(x>=-5.4&&x<=-4.1&&z>=-.08&&z<=.88)floor=true;if(s.windAligned&&x>=4.2&&x<=5.15&&z>=-.08&&z<=.88)floor=true;if(Math.hypot(x,z+1.65)<1.04)return false;}else{if(x>=-5.35"),
])

edit('islands.js',[
    ("herb:false,journal", "herb:false,towerStarted:false,wind:0,star:0,windAligned:false,starAligned:false,beaconLit:false,towerReported:false,journal"),
    ("say(area==='ruins'?", "say(area==='tower'?'你抵达真正的云塔岛。塔基失去了光；左侧风向台能接通右岸，旧星纹是校准星环的线索。':area==='ruins'?"),
    ("log(area==='ruins'?", "log(area==='tower'?'第二章 · 风帆抵达云塔岛，调查失明的归航灯。':area==='ruins'?"),
    ("case 'camp-rope':", """case 'camp-tower':if(!s.reported){say('先把遗迹里的两份发现归档，航图才能定位云塔。');event('bump');break;}s.towerStarted=true;enter('tower');break;
  case 'tower-note':log('守灯人留言：风晶指向东，星纹的三角朝上。风向接通桥，星环点亮灯。');say('“风晶指向东；星纹上方是三角。没有归航灯时，远行的人只能等。请替我把它重新点亮。”');break;
  case 'tower-wind':if(s.windAligned){say('风向台已锁在东向，新桥稳稳接到了右侧星环。');break;}s.wind=(s.wind+1)%3;if(s.wind===1){s.windAligned=true;log('以风晶校准东向：云塔右侧绳桥真正接通。');say('东向与风晶共鸣。右侧桥板落稳，星环平台已经能走过去。');art.refresh();event('success');}else{say('风向台现在指向'+['北','东','南'][s.wind]+'。看看守灯人的留言，再旋转校准。');art.refresh();}break;
  case 'tower-star':if(s.starAligned){say('三角已经朝上。星环的光线连到了云塔。');break;}s.star=(s.star+1)%3;if(s.star===2){s.starAligned=true;log('旋转星环，让三角朝上；归航灯获得星光。');say('三角朝上，与旧拓片一致。星环的细光连向塔基，可以返回开灯了。');event('success');}else say('星环现在是'+['圆','方','三角'][s.star]+'朝上。你的拓片和守灯人的留言保留了校准线索。');art.refresh();break;
  case 'tower-beacon':if(!s.windAligned||!s.starAligned){say('塔基没有光。先校准左岸风向，再过桥旋转右岸星环。');event('bump');}else if(!s.beaconLit){s.beaconLit=true;log('归航灯亮起：云海中等待的风帆开始向营地返回。');say('你推上开关。塔顶的金色光束扫过云海，远处等候的风帆回应了一次灯闪。回营地告诉队长，这次你带回了一条能用的归路。');art.refresh();event('success');}else say('归航灯仍在转动。回到营地，把新的航路记进图里。');break;
  case 'tower-return':enter('camp');break;
  case 'camp-rope':"""),
    ("case 'camp-map':if(s.discoveries", "case 'camp-map':if(s.beaconLit&&!s.towerReported){s.towerReported=true;log('第二章归档：云塔归航灯重新亮起，两片浮岛有了夜间航路。');say('队长在航图上画下金色航线：“你找回来的不只是标本。今晚出发的人，知道怎么回家了。” 两章完成，归航灯与营地记录都保留。');art.refresh();event('success');}else if(s.discoveries"),
    ("第一章完成；下一章将调查云塔的信号，尚未开放。", "第一章完成。航路已定位，现在可以接着前往云塔，调查熄灭的归航灯。"),
    ("下一站是云塔信号，下一章尚未开放。", "云塔航路已经开放。带着风晶与星纹，去看看归航灯为什么失明。"),
    ("let goal;if(s.reported)goal='回营查看留下的地图与标本；下一章：云塔信号（尚未开放）'", "let goal;if(s.towerReported)goal='两章探险已归档；航图、标本与亮起的归航灯会保留';else if(s.area==='tower')goal=s.beaconLit?'归航灯已亮，乘风帆回营归档':!s.windAligned?'读守灯人留言，校准左侧风向台':!s.starAligned?'跨过新桥，依照星纹旋转右侧星环':'回到塔基，亲手点亮归航灯';else if(s.beaconLit)goal='把云塔点亮的归航灯记入营地航图';else if(s.reported)goal='第二章已开放：从航台前往云塔岛，修复归航灯'"),
    ("label:'查看留下的标本'}]:[", "label:'查看留下的标本'},...(s.reported?[{id:'camp-tower',label:s.towerReported?'重访亮灯的云塔':'继续第二章 · 云塔归航灯',primary:!s.towerReported}]:[])]:s.area==='tower'?[{id:'tower-note',label:'读守灯人的留言'},{id:'tower-wind',label:s.windAligned?'查看东向风标':'前往左岸，旋转风向台',primary:!s.windAligned},{id:'tower-star',label:s.starAligned?'查看对齐的星环':'前往右岸，旋转星环',disabled:!s.windAligned,primary:s.windAligned&&!s.starAligned},{id:'tower-beacon',label:s.beaconLit?'查看归航灯':'回塔基，点亮归航灯',disabled:!s.windAligned||!s.starAligned,primary:s.starAligned&&!s.beaconLit},{id:'tower-return',label:'乘风帆回营地',primary:s.beaconLit}]:["),
    ("progress:'遗迹发现 '", "progress:(s.towerStarted?'第二章 · '+(s.towerReported?'航路已归档':s.beaconLit?'归航灯已亮':s.starAligned?'星环已对齐':s.windAligned?'右岸桥已接通':'云塔待校准')+' / ':'第一章 · ')+'遗迹发现 '"),
    ("complete:s.reported,", "complete:s.towerReported||(s.reported&&!s.towerStarted),"),
])

edit('islands-art.js',[
    ("q.fillText('云塔 ?',360,352)", "q.fillText(state.towerReported?'归航灯':state.beaconLit?'云塔已亮':'云塔',360,352)"),
    ("function ruins(){", """function tower(){
  scene.background.set('#d1b9b1');scene.fog.color.set('#d1b9b1');
  for(const land of ISLAND_AREAS.tower.lands)island(areaGroup,land,'#8c9993','#637185');
  bridge(-5.4,-4.0,.4,'#b6a285');refs.towerBridge=bridge(4.05,5.22,.4,'#b6a285');refs.towerBridge.visible=state.windAligned;
  boat(target('tower-return'));label(areaGroup,'云塔 · 归航灯',0,6.5,-1.65);
  const base=new T.Group();base.position.set(0,0,-1.65);areaGroup.add(base);cyl(base,0,.18,0,1.12,1.2,.36,'#a5aea6',12);cyl(base,0,2.25,0,.6,.92,4.5,'#b9c8bd',10);
  for(let i=0;i<8;i++){const y=.62+i*.49;line(base,[[-.59,y,.7],[.59,y,.7]],'#708d8a');}
  cyl(base,0,4.63,0,1.1,.95,.25,'#c2c5b7',12);for(let i=0;i<6;i++){const a=i*Math.PI/3;rod(base,[Math.cos(a)*.76,4.72,Math.sin(a)*.76],[Math.cos(a)*.76,5.8,Math.sin(a)*.76],.04,'#6c817f');}
  cyl(base,0,5.9,0,1.08,.16,.35,'#8d7965',12);refs.beacon=rock(base,0,5.24,0,.48,state.beaconLit?'#ffe0a0':'#7698a5',[.62,1.05,.62]);
  if(state.beaconLit){refs.beaconLight=new T.PointLight('#ffe2aa',5,8);refs.beaconLight.position.set(0,5.2,0);base.add(refs.beaconLight);const beam=mesh(base,new T.ConeGeometry(2.8,8,20,1,true),'#f9d58b',4,5.2,0);beam.rotation.z=Math.PI/2;beam.material=new T.MeshBasicMaterial({color:'#ffe2aa',transparent:true,opacity:.13,side:T.DoubleSide,depthWrite:false});refs.beam=base;}
  const note=target('tower-note');box(note,0,.73,0,.76,1.46,.23,'#b9c8bd');label(note,'守灯人留言',0,1.62,.12);
  const wind=target('tower-wind');cyl(wind,0,.46,0,.46,.6,.92,'#a5aea6');refs.windArrow=new T.Group();wind.add(refs.windArrow);refs.windArrow.position.y=1.45;refs.windArrow.rotation.y=(state.wind||0)*Math.PI*.5;rod(refs.windArrow,[-.6,0,0],[.6,0,0],.07,'#ddc18a');rock(refs.windArrow,.65,0,0,.23,'#91c5c4',[1,.45,.65]);label(wind,['北向','东向','南向'][state.wind||0],0,2.12,.2);flag(wind,-.8,-.35,state.windAligned?'#d9bc78':'#799ba9');
  const star=target('tower-star');cyl(star,0,.26,0,.76,.87,.52,'#a5aea6',12);const disc=cyl(star,0,.6,0,.61,.65,.16,'#c2c5b7',12);disc.rotation.y=(state.star||0)*Math.PI*2/3;for(let i=0;i<3;i++){const a=i*Math.PI*2/3;rock(star,Math.cos(a)*.43,.75,Math.sin(a)*.43,.15,i===2?'#d7bd85':'#7e9fa6',[1,.5,1]);}label(star,['圆朝上','方朝上','三角朝上'][state.star||0],0,1.37,.2);if(state.starAligned)line(areaGroup,[[6.55,.8,.4],[0,5.2,-1.65]],'#ead293');
  const control=target('tower-beacon');box(control,0,.42,0,.58,.84,.44,'#8e9fa0');rock(control,0,.92,0,.17,state.beaconLit?'#ffe0a0':'#91c5c4',[1,.5,1]);label(control,state.beaconLit?'灯已亮':'归航灯开关',0,1.34,.25);
  for(const [x,z]of [[-3.1,2],[-3.1,-2.0],[2.9,2.0],[3,-2.15]]){pine(areaGroup,x,z,.65);grass(areaGroup,x+.4,z+.2);}
 }
 function ruins(){"""),
    ("state.area==='camp'?camp():ruins();", "state.area==='camp'?camp():state.area==='tower'?tower():ruins();"),
    ("if(refs.crystal)refs.crystal.rotation", "if(refs.beam)refs.beam.rotation.y=time*.17;if(refs.beacon)refs.beacon.rotation.y=time*.24;if(refs.crystal)refs.crystal.rotation"),
])
print('Opened a playable third island with calibration, actual bridges and return report.')
