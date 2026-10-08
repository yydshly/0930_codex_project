import {PRINCIPLE_LEARNING} from './principle-learning.js';
import {calibrationStatusText} from './calibration-status.js';
import {feedingPresentation} from './feeding-status.js';
export const PRINCIPLE_TOPICS={
 fish:{effect:'鱼群保持间距、逐渐对齐并聚集；转弯平滑，游动交替推进和滑行。',method:'Boids 将分离、方向对齐、群体聚集与游走合成转向；提前采样池岸距离和梯度避障，限制角速度与角加速度。鱼身用三个球近似，成对校正重叠。',boundary:'这是规则驱动的行为模拟。三个球是碰撞近似，未求解鱼体与水的完整流体耦合。'},
 motion:{effect:'鱼身从头到尾摆动增强，转弯时弯曲；快游时收鳍，减速时展开。',method:'GPU 行进波叠加转弯曲率。对位移函数解析求导，用逆转置变换修正法线，使高光跟随弯曲的身体；摆尾频率、幅度和展鳍由运动状态驱动。',boundary:'解析法线修正覆盖脊柱弯曲和成对鳍旋转；微小鳍膜、口唇和背鳍折叠仍使用近似法线。'},
 startle:{effect:'手靠近时附近的鱼先警觉，近距离刺激后转身加速、略微下潜并散开，随后逐渐恢复游动。',method:'距离阈值触发警觉和一次受惊事件；每条受影响的鱼获得偏向外侧的避让方向。限制转速、转向加速度与游速，并随固定步长模拟时间平滑衰减反应。手短暂靠近后收回，不追赶逃开的鱼。',boundary:'这是可验证的行为规则示范，没有推断真实鱼的情绪。真实锦鲤可能因饲养习惯和环境而出现不同反应；当前猫也不会扑鱼或进入水域。'},
 water:{effect:'点击水面出现扩散涟漪；浅游的鱼带动水面，风浪与倒影变化，水下颜色随深度变化。',method:'128² GPU 纹理保存高度与速度，固定 1/60 秒差分更新，双缓冲交换并由池岸遮罩约束。摆尾相位驱动一对正负高度源，强度随游速增加、浸深衰减；逆解静止坐标后注入共同波场。四组 Gerstner 波同时产生水平/竖直位移，解析切线与波纹梯度决定法线；Fresnel、Beer–Lambert 与 GGX 计算反射、吸光和太阳高光。',boundary:'涟漪及鱼游扰动是二维波源近似，未求解鱼体周围流速和涡量。CPU 镜像差分波与解析风浪共同驱动浮料；GPU 半浮点会有微小精度差。池底焦散为程序光斑，未做光线追踪。'},
 feeding:{effect:'手捏持六粒饲料，松指落水，鱼上浮张嘴吸入；浮料随波面起伏、轻微漂移并倾斜。',method:'26 骨骼蒙皮手通过指腹 CCD 约束捏合；状态机控制伸手、松指、退场。落水时逆解波面的静止坐标，随 Gerstner 轨道和差分涟漪运动，沿共同法线倾斜；风推动缓慢漂移，岸线和障碍约束移动。鱼按实际嘴口追食、吸入和计数。',boundary:'漂移采用规定的弱风流，未求解真实流速。本页手用 WebXR 网格和 CCD；原作采用 SDF 手部与预设骨骼角度。接触与吞食为动画及几何近似。'},
 geometry:{effect:'青蛙与停栖蜻蜓随睡莲起伏和倾斜，乌龟按当前水面下潜；庭院猫起身、巡游、停坐，尾巴与四肢随动作变化。',method:'睡莲使用共享波面的位移与法线，停驻动物继承叶片坐标系；跳跃追踪当前落点，乌龟进出水按状态机连续过渡，并对游泳轨迹作池岸安全投影。青蛙、乌龟主体由 SDF 平滑融合形体，经 Surface Nets 在零交叉网格提取曲面；蜻蜓用分段几何与曲面翅膀。庭院猫用关节层级控制四肢，用骨骼蒙皮连续弯曲尾巴；状态机切换观察、起身、步行和坐下；按路线弧长推进错相步态，支撑阶段向后移脚补偿前进，摆动阶段平滑抬脚与落脚。坐姿绕肩部支点旋转，头部反向补偿。固定前景观察方向与池岸构图偏移共同确定镜头。固定干地路线用完整父变换的逆矩阵保持世界尺度与落脚。锦鲤用插值截面连接网格；庭院用参数几何建模，花纹和部分微表面由噪声与曲线生成。',boundary:'动物运动是规定的运动学与接触近似，没有求解浮力、身体水动力或柔性茎；猫采用固定路线和运动学步态，弯道落脚仍为近似，尚未使用任意地形寻路或全身动力学。模型为参数化构造；真实扫描 GLB 可另行导入，当前庭院尺寸仍为设计估值。'},
 lighting:{effect:'鱼身和水面有反光，建筑接缝有阴影，黄昏改变日照与氛围。',method:'物理材质按粗糙度和法线计算反射。鱼皮叠加鳞片微凹凸、局部粗糙度与湿润层，黄金鱼保留金属响应；细节按屏幕导数滤波。关闭鱼体材质细节可在同一姿态下作对照。阴影贴图与屏幕空间环境遮蔽补充接触阴影，辉光处理亮部，ACES 色调映射将 HDR 转为可显示画面；水面另用 GGX 高光。',boundary:'屏幕空间环境遮蔽只利用当前视角的深度；环境光与焦散使用近似，没有完整全局光照求解。'},
 performance:{effect:'大量树叶和庭院构件共同出现在场景中；远处细节减少闪烁，水下鱼体更清晰。暂停后镜头仍可操作，静止的倒影与水下画面可复用。',method:'模拟以1/60秒固定步长推进；动物跟随镜头用1−exp(−λΔt)计算平滑系数，OrbitControls阻尼同样按实际帧时间换算。累积帧时间，绘制时插值前后姿态、形变参数和两帧波场。树叶实例化、静态构件合批、鱼体共享几何。用屏幕导数估算鳞片和鳍条的像素占地，远处混合平均细节以减少混叠。折射按画布分辨率在512–1024px分配，远景倒影保持512px；运行时近景两者1024px、每帧更新，并限制竖屏纹理大小。暂停后核对姿态、几何、材质输入和镜头：内容不变便复用倒影与折射；进入暂停、恢复运行或输入变化时刷新，主画面仍持续绘制。',boundary:'实时累计推进率=固定步长累计推进时间/有效帧输入时间，不计暂停、后台或实验台离线步进。每帧最多追赶12步（0.2秒），超量丢弃；暂停或后台返回不补跑。插值仅用于显示，屏幕滤波会减少微细节；静止复用减少重复离屏绘制，不能保证硬件帧率。当前锦鲤仍独立绘制，未迁移原作鱼群 InstancedMesh。'},
 calibration:{effect:'导入模型上的两个基准点按已知直线长度校准，水域、鱼群和投喂沿同一尺度构造。',method:'Raycaster只与当前模型的可见三角形求交，将两点转为未缩放模型坐标；比例s=L真实/||p₂−p₁||模型，并统一应用到模型。校准JSON记录模型指纹、两点及已知长度；绑定JSON保存水域并可附校准记录。可查看或粘贴JSON，经相同校验后应用；重新选点可取消回退，成功应用才替换旧校准。改倍率后旧世界坐标水域失效。',boundary:'两点给出3D直线距离，不是曲面路径长度；统一缩放不能修复扫描形变。精度取决于已知长度、选点和模型。当前支持倍率0.05–5，超范围拒绝而不截断。'},
};
export function bindPrinciples({getCourtyard,selectTab,prepareInteraction}){
 const select=document.getElementById('principle-select'),demo=document.getElementById('principle-demo'),metrics=document.getElementById('principle-metrics');
 if(!select)return {update(){}};
 let renderedKey=null;
 function update(){const key=select.value,data=PRINCIPLE_TOPICS[key],c=getCourtyard();
  if(renderedKey!==key){const learning=PRINCIPLE_LEARNING[key];for(const [id,text]of [['principle-effect',data.effect],['principle-method',data.method],['principle-value',learning.value],['principle-verify',learning.verify],['principle-boundary',data.boundary]])document.getElementById(id).textContent=text;renderedKey=key;}
  demo.disabled=key==='calibration'?!c?.imported:!!c?.imported&&(key==='geometry'||(!c.hasDynamics&&!['lighting','performance'].includes(key)));
  if(!c){metrics.textContent='进入场景后显示当前运行状态。';return;}
  if(c.imported&&(key==='geometry'||(!c.hasDynamics&&!['lighting','performance','calibration'].includes(key)))){metrics.textContent=key==='geometry'?'青蛙与乌龟属于程序庭院；返回庭院后可观察。':'当前导入模型尚未绑定水域；应用动态绑定后可观察这个效果。';return;}
  const m=c.school.metrics||{},number=(v,d=2)=>Number.isFinite(v)?v.toFixed(d):'—';
  if(key==='calibration'){const s=c.binding.getState().calibration;metrics.textContent=!c.imported?'先导入GLB或加载程序示例，再选取两个基准点。':calibrationStatusText(s,c.settings.modelScale);}
  else if(key==='fish')metrics.textContent=`${c.settings.fishCount} 条鱼 · 邻鱼朝向一致度 ${number(m.alignment)} · 平均邻域质心偏移 ${number(m.cohesion)} 场景单位 · 分离强度 ${number(m.separation)} · ${c.settings.paused?'已暂停':'模拟运行中'}`;
  else if(key==='motion'){const f=c.followFish||c.school.fish[0];metrics.textContent=`转速 ${number(f?.turnRate)} rad/s · 摆尾幅度 ${number(f?.amp?.value,3)} 鱼体局部单位 · 展鳍 ${number(f?.state.uSpread?.value)} · 形变法线修正${c.experiment.parameters.normalCorrection?'开启':'关闭'}`;}
  else if(key==='water')metrics.textContent=`${c.water.simulation.enabled?'GPU 差分波':'解析涟漪回退'} · ${c.water.simulation.size}² · 已推进 ${c.water.simulation.stepCount} 步 · 摆尾扰动 ${c.school.surfaceWakeCount} 组${c.settings.surfaceWakes?'':'（关闭）'} · 倒影 ${c.water.target.width}px / 水下 ${c.water.refractionTarget.width}px`;
  else if(key==='feeding'){const h=c.interaction,data=feedingPresentation({round:c.school.feeding.latest(),mode:h.mode,phase:h.phase,paused:c.settings.paused,simulationActive:c.active&&!document.hidden,cumulative:c.school.consumed,fishCount:c.settings.fishCount});metrics.textContent=`${data.status} · ${data.counts}`;}
  else if(key==='startle'){const s=c.school.startleState;metrics.textContent=s?`${({idle:'平静',alert:'警觉',startled:'惊散',recovering:'恢复'})[s.phase]} · 当前响应 ${s.affectedFish} 条 · 触发 ${s.triggerCount} 次 · 反应强度 ${number(s.intensity)} · ${c.settings.paused?'已暂停':'模拟运行中'}`:'等待鱼群反应数据。';}
  else if(key==='geometry')metrics.textContent=`共享波面睡莲 9 片 · 青蛙 ${c.animals.frog.state} · 乌龟 ${c.animals.turtle.state} · 庭院猫 ${({observe:'观察',stand:'起身',walk:'步行',sit:'坐下'})[c.animals.cat?.state]??'待机'} · SDF / 关节与骨骼蒙皮`;
  else if(key==='lighting')metrics.textContent=`${c.settings.hour.toFixed(1)} 时 · 曝光 ${c.settings.exposure.toFixed(2)} · 鱼皮细节${c.settings.fishDetail?'开启':'关闭对照'} · SSAO / 辉光 / ACES 已启用`;
  else {let instanced=0;c.scene.traverseVisible(o=>{if(o.isInstancedMesh)instanced++;});metrics.textContent=`实时累计推进率 ${c.simulationClock.advancementRate===null?'—':number(c.simulationClock.advancementRate*100,1)+'%'} · 固定步长 1/60 s · 本帧 ${c.simulationClock.last.steps} 步 · 追赶丢弃 ${number(c.simulationClock.droppedSeconds)} s · 可见实例化对象 ${instanced} · 本帧绘制调用 ${c.renderer.info.render.calls} · 三角形 ${Math.round(c.renderer.info.render.triangles).toLocaleString('zh-CN')} · 水面离屏更新 ${c.water?.passStats?.updates??0} 次`;}
 }
 document.getElementById('principle-controls').addEventListener('click',async()=>{await selectTab('scene');
  const key=select.value,learning=PRINCIPLE_LEARNING[key];let target,focus;
  if(learning.target==='experiment'){target=document.getElementById('algorithm-experiments');target.open=true;
   focus=document.getElementById(({motion:'exp-normal-correction',water:'exp-water-debug'})[key]||'exp-open');
  }else if(learning.target==='glb-panel'){target=document.getElementById('glb-panel');target.open=true;
   focus=document.getElementById(getCourtyard()?.imported?'calibration-pick':'binding-demo');
  }else{focus=document.querySelector(({feeding:'#hand-inspect',startle:'#stroke',geometry:'#cat-observe',lighting:'#fish-detail',performance:'#setting-fishCount'})[key]);target=focus;}
  if(target){target.scrollIntoView({behavior:'auto',block:'center'});if(focus&&!focus.disabled)focus.focus({preventScroll:true});}
 });
 select.addEventListener('change',update);
 demo.addEventListener('click',async()=>{await selectTab('scene');const c=getCourtyard();if(!c||demo.disabled)return;prepareInteraction();
  const key=select.value;c.interaction.stop();c.updateSettings({paused:false,autoTour:false});
  if(key==='fish'){if(!c.settings.fishCount)c.updateSettings({fishCount:7});c.school.feedUntil=0;c.setView('shoal');c.onStatus({message:'观察鱼群：间距、方向对齐、聚集与推进—滑行'});}
  else if(key==='motion'){if(!c.settings.fishCount)c.updateSettings({fishCount:7});c.inspectFish('whole');}
  else if(key==='water'){c.setView('pond');const p=c.school.habitat?.feedPoint||{x:-.8,z:1.3};c.water.addRipple(p.x,p.z,c.time,.035);c.onStatus({message:'已加入水面扰动；也可点击池塘查看涟漪传播'});}
  else if(key==='feeding')c.feed();
  else if(key==='startle')c.stroke();
  else if(key==='geometry')c.observe('cat');
  else if(key==='calibration'){document.getElementById('glb-panel').open=true;c.fitModel();c.binding.beginCalibration();document.getElementById('viewport').scrollIntoView({behavior:'auto',block:'center'});}
  else if(key==='lighting'){c.updateSettings({weather:'dusk',hour:18.3});if(!c.imported)c.setView('deck');}
  else if(!c.imported)c.setView('aerial');
  const view=({fish:'shoal',motion:'fish',water:'pond',geometry:'cat',lighting:'deck',performance:'aerial'})[key];if(view&&!c.imported)document.getElementById('view-select').value=view;
  update();
 });update();return {update};
}
function phaseLabel(phase){return ({idle:'待机',approach:'伸手',pinch:'捏持',release:'松指',relax:'放松',withdraw:'收回',inspect:'观察',contact:'接触',waiting:'等待',lower:'降手'})[phase]||phase;}
