// Case 07 only: static, original exhibit models explain our actual local projects.
// A displayed miniature is not the live project; page links open its real controls.
export const exhibitContents={
 'visual-systems':{role:'纸档案、主题色与实际展厅画面',relatedCases:[1],page:'./?id=1',pageLabel:'打开实际空间作品集',description:'将品牌与展示系统做成一处可以近看的档案陈列：双页作品册、三种展厅主题样板，以及 CASE 01 的实际运行画面。',takeaway:'纸档案对应“聚焦 → 翻开 → 阅读”的成果层级；主题样板对应白盒、黑盒与陶土三种已有皮肤。打开实际页面，可以编辑名称与主题并导出离线展厅。',objects:['双页作品档案','三种展厅主题样板','CASE 01 实际运行画面'],image:'../media/demo-01.webp',boundary:'这里是静态陈列模型；翻开、主题编辑和 HTML 导出在实际作品集页面中操作。'},
 'product-lab':{role:'实体琴键、机器人与猫、默认配方谱板',relatedCases:[6],page:'./?id=6',pageLabel:'打开实际钢琴配方原型',description:'产品原型展位展示 CASE 06 的微缩实体钢琴、机器人与猫，以及默认专注旋律的谱板。它们说明同一配方如何驱动声音、琴键和角色动作。',takeaway:'静态谱板为默认专注配方示意：32 音符、90 BPM，并不随另一个页面的编辑实时变化。进入实际原型，可以编辑、播放与导出。当前参观状态另由本集市记录。',objects:['微缩实体琴键','原创机器人与猫','默认 32 音符 / 90 BPM 谱板','CASE 06 实际运行画面'],image:'../media/demo-06.webp',defaultRecipe:{mode:'static-default-illustration',mood:'calm',noteCount:32,tempo:90},boundary:'陈列模型与谱板为静态默认配方示意，不播放声音，也不代表其它页面当前编辑值。'},
 'research-notes':{role:'路线沙盘、来源册、案例索引与参观凭证',relatedCases:[7],page:'../#demo-07',pageLabel:'查看本例原作与独立分析',description:'研究档案把本例的来源、空间结论与参观证据摆到桌面：沙盘对应入口、广场与三个展位，来源册记录原片 00:22 的眼平集市，索引抽屉区分观察、结论与验收。',takeaway:'原作者工具链未确认。发现、走近与查看是三个不同状态；下面的凭证读取本次真实记录，导出的 JSON 保留三者与步行距离。',objects:['本例入口与三展位路线沙盘','原片 00:22 来源册','观察 / 结论 / 验收索引抽屉','本次真实参观凭证'],boundary:'沙盘是当前固定布局的缩尺说明，不是可编辑地图；原作 NPC 对话能力未确认，也未在此复现。'}
};

export function buildExhibit(group,booth,ctx){
 const {T,box,mesh,geo,mat,palette,textures,heroTexture,sites}=ctx;
 const paper=mat('#eee4ce'),pageEdge=mat('#c7bca0'),ink=mat('#385447'),brass=mat('#a58a59',{metalness:.62,roughness:.36}),black=mat('#292e2a'),green=mat('#8aa897'),blue=mat('#587681');
 const sphere=(r,x,y,z,material,parent=group)=>mesh(geo(new T.SphereGeometry(r,16,10)),material,x,y,z,parent);
 const boardTexture=(draw,width=768,height=512)=>{const c=document.createElement('canvas');c.width=width;c.height=height;const g=c.getContext('2d');g.fillStyle='#f0e7d0';g.fillRect(0,0,width,height);g.fillStyle='#405047';draw(g,width,height);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;textures.push(t);return t;};
 const printed=(texture,w,h,x,y,z)=>{box(w+.08,h+.08,.065,palette.wood,x,y,z,group);return box(w,h,.073,mat('#ffffff',{map:texture,roughness:.92}),x,y,z+.017,group);};
 const title=(text,w,h,x,y,z)=>printed(boardTexture(g=>{g.font='600 42px sans-serif';g.textAlign='center';g.fillText(text,384,276);}),w,h,x,y,z);
 const book=(label,x,y,z,color,tilt=0)=>{
  const b=new T.Group();b.position.set(x,y,z);b.rotation.set(-.08,tilt,0);group.add(b);
  box(.43,.58,.105,mat(color),0,0,0,b);box(.39,.53,.065,paper,.016,0,.028,b);
  for(let n=0;n<6;n++)box(.395,.006,.068,pageEdge,.017,-.24+n*.085,.031,b);
  box(.025,.59,.113,brass,-.21,0,.005,b);
  const t=boardTexture(g=>{g.font='700 56px sans-serif';g.textAlign='center';g.fillText(label,384,240);g.font='23px monospace';g.fillText('FIELD / RESEARCH',384,330);});
  box(.375,.51,.008,mat('#ffffff',{map:t}),.015,0,.071,b);return b;
 };
 if(booth.id==='visual-systems'){
  // One readable gallery image, rather than three identical photo frames.
  printed(heroTexture,1.15,.72,-.72,1.43,-.46);
  for(const x of [-1.13,-.30])box(.045,.45,.05,palette.wood,x,1.17,-.50,group);
  const archive=new T.Group();archive.position.set(.45,1.40,.13);group.add(archive);
  for(const side of [-1,1]){const leaf=new T.Group();leaf.position.x=side*.23;leaf.rotation.y=side*.20;archive.add(leaf);box(.45,.61,.065,palette.wood,0,0,0,leaf);box(.405,.565,.068,paper,0,0,.006,leaf);for(let n=0;n<5;n++)box(.29,.009,.005,pageEdge,0,-.16+n*.042,.044,leaf);box(.27,.14,.012,side<0?green:blue,0,.135,.044,leaf);}
  box(.03,.62,.095,brass,0,0,.008,archive);
  // Theme colors physically correspond to the three existing case 01 skins.
  for(let n=0;n<3;n++){const tile=box(.33,.045,.40,mat(['#efeee7','#20221f','#f0e6d4'][n]),-.85+n*.46,1.047,.43,group);tile.rotation.y=(n-1)*.08;box(.24,.035,.05,brass,-.85+n*.46,1.08,.42,group);}
  title('ARCHIVE / 01',.90,.17,.44,1.04,.75);
  book('FORM',1.05,1.32,-.35,'#5d7b67',-.19);
 }else if(booth.id==='product-lab'){
  // Static miniature of the actual music product, built from original simple solids.
  box(2.35,.16,.87,palette.wood,-.05,1.09,.18,group);box(2.15,.64,.18,palette.wood,-.05,1.36,-.31,group);box(2.28,.07,.23,palette.wood,-.05,1.72,-.32,group);
  for(let n=0;n<17;n++){const x=-1.02+n*.12;box(.11,.055,.40,paper,x,1.21,.40,group);if(![2,6].includes(n%7)&&n<16)box(.067,.05,.24,black,x+.061,1.258,.29,group);}
  const robot=new T.Group();robot.position.set(-.47,1.32,.12);group.add(robot);box(.24,.22,.18,green,0,.16,0,robot);box(.30,.23,.21,green,0,.38,0,robot);box(.245,.145,.018,black,0,.38,.114,robot);
  for(const side of [-1,1]){sphere(.025,side*.065,.405,.135,paper,robot);const arm=box(.045,.18,.055,brass,side*.16,.135,.08,robot);arm.rotation.z=side*.40;box(.085,.025,.095,ink,side*.19,.048,.12,robot);}
  const cat=new T.Group();cat.position.set(.55,1.27,.20);group.add(cat);const body=sphere(.135,0,.11,0,black,cat);body.scale.set(1.6,.75,.8);sphere(.105,.14,.23,.04,black,cat);
  for(const x of [.08,.20]){mesh(geo(new T.ConeGeometry(.043,.11,4)),black,x,.34,.04,cat);sphere(.013,x,.24,.137,brass,cat);}for(const x of [-.11,.09])box(.057,.045,.075,black,x,.015,.06,cat);const tail=mesh(geo(new T.TorusGeometry(.13,.027,6,14,Math.PI*1.25)),black,-.16,.16,0,cat);tail.rotation.y=Math.PI/2;
  const score=boardTexture(g=>{g.textAlign='center';g.font='600 38px sans-serif';g.fillText('DEFAULT / CALM',384,70);g.font='25px monospace';g.fillText('32 NOTES · 90 BPM',384,116);const notes=[60,64,67,72,69,67,64,62,60,64,65,69,67,64,62,60];for(let row=0;row<2;row++){const y=195+row*165;g.strokeStyle='#7b806e';g.lineWidth=2;for(let j=0;j<5;j++){g.beginPath();g.moveTo(50,y+j*16);g.lineTo(718,y+j*16);g.stroke();}for(let n=0;n<8;n++){const x=80+n*83,yy=y+72-(notes[row*8+n]-60)*4;g.beginPath();g.ellipse(x,yy,10,6,-.2,0,Math.PI*2);g.fill();g.fillRect(x+8,yy-40,3,40);}}});
  printed(score,.48,.48,-.02,1.51,-.205);printed(heroTexture,.64,.43,-1.14,1.56,-.38);title('DEFAULT RECIPE',.88,.15,.0,1.09,.76);
 }else{
  // Archive drawers give observation, conclusions and verification separate slots.
  box(.80,.73,.41,palette.wood,-.91,1.395,-.37,group);
  for(let n=0;n<3;n++){box(.69,.19,.08,paper,-.91,1.155+n*.235,-.126,group);box(.13,.018,.05,brass,-.91,1.155+n*.235,-.074,group);const label=boardTexture(g=>{g.textAlign='center';g.font='600 40px sans-serif';g.fillText(['OBSERVATION','CONCLUSION','VERIFICATION'][n],384,74);},768,112);box(.49,.052,.008,mat('#ffffff',{map:label}),-.91,1.21+n*.235,-.079,group);}
  const index=boardTexture(g=>{g.font='600 45px sans-serif';g.textAlign='center';g.fillText('07 / SOURCE INDEX',384,77);},768,112);printed(index,.74,.11,-.91,1.826,-.17);
  // Same current entrance / plaza / stall coordinates, shown as a static relief map.
  box(1.61,.065,.92,palette.wood,.38,1.035,.22,group);box(1.51,.018,.83,paper,.38,1.075,.22,group);
  const map=(x,z)=>({x:.38+x*.064,z:.22+(z+1)*.043});
  for(const [x,z]of [[-7,5.8],[1.4,6],[-8,-6],[8,-6],[-4.4,-10.8],[4.4,-10.8]]){const p=map(x,z);box(.12,.10,.12,pageEdge,p.x,1.13,p.z,group);const roof=mesh(geo(new T.ConeGeometry(.105,.095,4)),mat('#95634f'),p.x,1.225,p.z,group);roof.rotation.y=Math.PI/4;}
  for(const [id,site] of Object.entries(sites)){const p=map(site.x,site.z);mesh(geo(new T.CylinderGeometry(.038,.038,.032,12)),mat(id==='visual-systems'?'#477c62':id==='product-lab'?'#b9724f':'#4a7183'),p.x,1.115,p.z,group);}
  for(let n=0;n<9;n++){const p=map(-2.55,10.8-n*1.1);box(.026,.008,.02,brass,p.x,1.095,p.z,group);}
  const fountain=map(0,-2);mesh(geo(new T.CylinderGeometry(.077,.083,.034,16)),blue,fountain.x,1.105,fountain.z,group);
  book('SOURCE',.15,1.41,-.36,'#597783',-.12);book('07',.72,1.41,-.43,'#786653',.08);title('SOURCE · 00:22',.94,.16,.29,1.04,.76);
 }
 // A shared physical catalogue edge changes only on approach/view, not an animation loop.
 const feedbackCanvas=document.createElement('canvas');feedbackCanvas.width=768;feedbackCanvas.height=112;const feedbackTexture=new T.CanvasTexture(feedbackCanvas);feedbackTexture.colorSpace=T.SRGBColorSpace;textures.push(feedbackTexture);
 const feedbackMaterial=mat('#ffffff',{map:feedbackTexture,roughness:.94});box(1.25,.14,.075,palette.wood,.0,.76,.73,group);box(1.18,.106,.080,feedbackMaterial,.0,.76,.75,group);
 let prior;
 const feedback=({near=false,viewed=false}={})=>{const value=viewed?'viewed':near?'near':'idle';if(value===prior)return;prior=value;const g=feedbackCanvas.getContext('2d');g.fillStyle=viewed?'#385b49':near?'#efe3b8':'#eee5cd';g.fillRect(0,0,768,112);g.fillStyle=viewed?'#f5efd8':'#405346';g.textAlign='center';g.font='600 35px sans-serif';g.fillText(viewed?'已查看 · 记录已保存':near?'已走近 · 按 E 查看':booth.number+' / '+booth.category,384,70);feedbackTexture.needsUpdate=true;};feedback();
 return {feedback,objects:[...booth.objects],role:booth.role};
}
