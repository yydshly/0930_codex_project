import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DemoPanel } from './upstream/components/DemoPanel';
import { Karaoke } from './upstream/components/Karaoke';
import { InkBox } from './upstream/components/InkBox';
import { FishSvg, WordmarkSvg, Tape, MugDoodle, Underlined } from './upstream/components/art';
import { paintWrap, paintChip } from './upstream/lib/draw';
import { playChime } from './upstream/lib/chime';
import { ResearchWork, workUrl } from './ResearchWork';
import { Experience } from './Experience';
import { WorldExperience } from './WorldExperience';
import { Overview } from './Overview';

const upstream = 'https://github.com/richiemcilroy/chippytea/tree/f245695';
const capabilityGroups = [
  {name:'发现空间', title:'先发现，再决定。', intro:'原生应用在获准的位置建立索引，把文件大小、类别、原因与后果放在一起。', items:[['分类发现','应用与工具缓存、构建目录、依赖、下载及大型个人文件。不同类别使用不同规则。'],['保留与历史','SQLite 保存索引、保留选择、清理历史和成果账本；支持失效位置的重连。'],['有限重复检查','用户主动发起，只比较已索引的部分旧／大型个人文件，验证内容并复检双方；不是全盘去重。']]},
  {name:'审阅与复核', title:'温暖的画风，清楚的后果。', intro:'每次操作前再次检查对象和证据。估算大小、执行状态与真实成果分别表达。', items:[['说明后果','展示识别依据，以及删除后重新编译、安装依赖等影响。个人文件仍需用户判断。'],['再次核对','复核授权位置、对象身份、活动状态与类别。发生变化的对象需要重新审阅。'],['操作有边界','个人文件等走废纸篓；认可的开发产物与工具缓存才可能永久清理。并非保证任何文件都可安全删。']]},
  {name:'成果与计奖', title:'成果有凭证，奖励才落下。', intro:'真实应用把保守核算的永久释放空间记到账本。薯条是装饰计数，没有货币价值。', items:[['100 MB → 一根薯条','每 100,000,000 字节保守计入空间产生一根薯条，不足的部分继续结转。'],['移到废纸篓不计奖','文件仍占用空间。预估大小、待执行的操作都不能直接当作已释放成果。'],['奖励也可能为零','分配证据、完成状态和可用空间观察共同限制计入量；共享、快照和环境变化会影响核算。']]},
  {name:'原生架构', title:'界面和引擎，各做擅长的事。', intro:'这是完整产品的源码仓库。官网组件展示交互，原生引擎承担实际文件系统操作。', items:[['SwiftUI · 原生界面','菜单栏面板、Finder／废纸篓集成、权限与位置管理，以及统一的纸墨绘图。'],['Rust · 本地引擎','有边界的发现、SQLite 索引、文件系统策略、清理流程与持久化账本。'],['运行条件','Apple Silicon、macOS 14+、Xcode、Python 与 Rust。本研究在 Windows 制作，未实机运行 Mac 引擎。']]},
];

const opportunities = [
  {name:'功能演出', tag:'优先试点 · 一份研究的演出', title:'让功能结果，长出一段声画。', desc:'用真实完成事件启动一个有开场、推进、高潮和收尾的视听段落，让角色、动作、字幕和音乐共享一套世界与时间。', links:[['015 · 任务冒险','../015-ai-creative-products/']], input:'真实研究资料、项目名称和回执编号', output:'笔记联接 + 翻页装订 + 音乐时间轴 + 交互特效', first:'24 秒自有研究视觉已实现；MiniMax 配乐生成后，再验证完整音画同步与重播。', boundary:'当前真实入册作为承载案例；演出可重播，重播不重复计入成果。'},
  {name:'音乐叙事', tag:'内容模板 · 004 / 008', title:'同一首歌，有共同的时间轴。', desc:'把歌词、文字动效、段落换场和点按互动放在同一时钟里，再换成我们自己的角色和音乐。', links:[['004 · 音乐叙事参考','../004-rhythm-drop/'],['008 · 可编辑文字动效','../008-cellmotion/']], input:'有权使用的音频 + 词级时间 + 段落', output:'逐词高亮 + 场景编排 + 轻量互动', first:'为一段原创音乐做词级数据与三个段落状态，验证暂停、跳转和重开同步。', boundary:'004 已归档，作为案例参考。中文分词、时间编辑与音乐素材仍需制作。'},
  {name:'品牌组件', tag:'视觉积累 · 010', title:'画风可以沉淀成代码。', desc:'把色板、轮廓、控件状态与角色统一起来，让我们的生活产品从入口到结果都像同一个世界。', links:[['010 · 手绘生活产品','../010-dumpling-style-lab/']], input:'我们的品牌色、角色和生活物件', output:'统一控件 + 状态动作 + 成果表达', first:'为“搬家日”制作一组列表、按钮、等待和完成状态，检查中文与手机布局。', boundary:'上游没有打包好的通用组件库；抽取接口与适配不同产品仍是我们的工作。'},
];

function SectionTitle({number, eyebrow, title, children}:any) {
  return <div className="section-heading"><div className="section-index">{number}</div><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{children && <p className="section-intro">{children}</p>}</div></div>;
}

function TaskTrial() {
  const [done, setDone] = useState<number[]>([]);
  const [sound, setSound] = useState(false);
  const [display, setDisplay] = useState(0);
  const [message, setMessage] = useState('选择一项，体验完成后的收集反馈。');
  const canvas = useRef<HTMLCanvasElement>(null);
  const previous = useRef(0);
  const total = done.reduce((n,id)=>n+id+1,0);
  const tasks = ['归纳一项产品能力','记录一次可验证结果','交付一份研究卡片'];
  useEffect(()=>{
    const node = canvas.current;
    const ctx = node?.getContext('2d');
    if (!node || !ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = previous.current;
    previous.current = total;
    const dpr = Math.min(window.devicePixelRatio || 1,2);
    node.width = 360*dpr; node.height = 190*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    let raf=0; const started=performance.now();
    const draw=(now:number)=>{
      const t = reduced ? 1 : Math.min(1,(now-started)/1350);
      ctx.clearRect(0,0,360,190);
      ctx.save();ctx.translate(0,48);paintWrap(ctx,360,140,total,0);ctx.restore();
      if (total>from && t<1) for(let i=0;i<Math.max(6,total-from);i++) {
        const p=(t-i*0.03)/0.82;
        if (p>0 && p<1) {
          const x=180+(i%3-1)*55*p;
          const y=12+144*p*p;
          ctx.save();ctx.translate(x,y);ctx.rotate(p*5+i);paintChip(ctx,0,0,22+i%3*4,330+i*7);ctx.restore();
        }
      }
      setDisplay(Math.round(from+(total-from)*(1-Math.pow(1-t,3))));
      if(t<1) raf=requestAnimationFrame(draw);
    };
    raf=requestAnimationFrame(draw);
    return()=>cancelAnimationFrame(raf);
  },[total]);
  function complete(id:number) {
    if(done.includes(id)) return;
    setDone([...done,id]);setMessage(`已确认「${tasks[id]}」，收集 ${id+1} 根薯条。`);
    if(sound && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) playChime();
  }
  function reset() {setDone([]);setMessage('已重置本轮体验，可以重新完成任务。');}
  function save() {
    const result={project:'016-chippytea-lab',type:'original-task-feedback-trial',completed:done.map(id=>({task:tasks[id],reward:id+1})),chips:total,scope:'浏览器内体验记录，不代表真实业务成果或空间清理',createdAt:new Date().toISOString()};
    const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='chippytea-task-trial.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    setMessage('本轮结果已导出为 JSON。');
  }
  return <InkBox as="div" variant="card" seed={681} className="trial-card"><div className="trial-header"><span className="eyebrow">最小反馈原型</span><span className="tag">浏览器内示例</span></div><h3>把完成，装进纸包。</h3><p className="fine">复用原作绘图与短音效，体验一个原创的任务成果反馈流程。</p><div className="trial-art"><canvas ref={canvas} aria-hidden="true"/><div className="trial-number"><strong>{display}</strong><span>根薯条 · 本轮成果</span></div></div><div className="task-list">{tasks.map((task,id)=><button className={`task-row ${done.includes(id)?'done':''}`} key={task} onClick={()=>complete(id)} disabled={done.includes(id)}><span className="task-index">0{id+1}</span><span>{task}</span><span>{done.includes(id)?'已收集':`完成 +${id+1}`}</span></button>)}</div><p className="trial-status" role="status">{message}</p><div className="trial-actions"><label><input type="checkbox" checked={sound} onChange={e=>setSound(e.target.checked)}/>开启短音效</label><button onClick={reset}>重置</button><button onClick={save}>导出结果</button></div><p className="tiny">每项只计一次；刷新会重置。接到真实产品时，应由完成凭证触发并持久保存。</p></InkBox>;
}

function App() {
  const [capability,setCapability]=useState(0);
  const [opportunity,setOpportunity]=useState(0);
  const [demoKey,setDemoKey]=useState(0);
  const [seed,setSeed]=useState(120);
  const [boiling,setBoiling]=useState(true);
  const [sampleClicks,setSampleClicks]=useState(0);
  const [gallery,setGallery]=useState(0);
  const cap=capabilityGroups[capability];const value=opportunities[opportunity];
  const galleryItems=[['source-home.jpg','01 · 纸墨入口','正文清晰，手绘集中在品牌与控件。'],['source-review.jpg','02 · 清理前审阅','识别依据、影响与操作方式明确出现。'],['source-result.jpg','03 · 成果反馈','虚构结果被转换成纸包、数字和薯条。'],['source-bridge.jpg','04 · 歌曲桥段','歌词、角色、节拍与段落共同编排。']];
  return <>
    <a className="skip-link" href="#main">跳到正文</a>
    <header className="site-header"><a className="brand" href="#top"><span className="boil-hover"><FishSvg height={32} uid="lab-brand"/><WordmarkSvg height={24}/></span><span className="lab-label">研究 · 016</span></a><nav aria-label="页内导航"><a href="./">理解总览</a><a href="#capabilities">产品能力</a><a href="#style">手绘风格</a><a href="#music">音乐互动</a><a href="#value">我们的价值</a></nav><a className="source-link" href="https://github.com/richiemcilroy/chippytea" target="_blank" rel="noreferrer">GitHub ↗</a></header>
    <main id="main">
      <section className="hero" id="top"><div className="hero-copy"><p className="eyebrow">CHIPPYTEA · OPEN SOURCE FIELD NOTES</p><h1>把空间，<br/>变成<Underlined seed={121}>一包薯条。</Underlined></h1><p className="hero-lead">一个认真清理文件、轻轻奖励你的 Mac 工具。我们研究它如何把实用能力、纸墨画风、成果动画和音乐连接起来。</p><div className="hero-tags"><span>SwiftUI + Rust</span><span>macOS 14+</span><span>代码与绘图 MIT</span></div><div className="hero-actions"><InkBox href="#value" variant="primary" seed={43} className="cta">看看对我们的价值</InkBox><a href="#capabilities">先理解产品能力 ↓</a></div><div className="hero-note"><Tape uid="hero-note" className="note-tape"/><p>值得带走的思路</p><strong>让功能结果，长出动画、音乐和特效。</strong><span>可复用实现已公开；留存和转化效果仍需验证。</span></div><p className="source-caption">研究日期 2026-10-02 · 源码快照 <a href={upstream}>f245695</a><br/>Mac 清理引擎未实机运行。本页先展示有证据的能力与网页交互。</p></div><div className="hero-demo"><div className="demo-topline"><span>原作组件 · 可以操作</span><button onClick={()=>setDemoKey(demoKey+1)}>重置演示</button></div><DemoPanel key={demoKey}/><p className="demo-caption">点击 Clean up → 阅读后果 → 选择操作 → 观察反馈。<br/><strong>虚构文件与内存数据，不扫描或删除设备文件。</strong></p></div></section>

      <section className="chapter" id="capabilities"><SectionTitle number="01" eyebrow="WHAT IT CAN DO" title="画风亲切，能力也要说清楚。">原生软件负责实际清理；官网负责让人看懂与体验。两层能力分别判断。</SectionTitle><div className="tab-list" role="tablist" aria-label="产品能力">{capabilityGroups.map((g,i)=><button role="tab" aria-selected={capability===i} aria-controls={`cap-panel-${i}`} id={`cap-tab-${i}`} key={g.name} onClick={()=>setCapability(i)}>{g.name}</button>)}</div><div role="tabpanel" id={`cap-panel-${capability}`} aria-labelledby={`cap-tab-${capability}`} className="cap-panel"><div className="cap-intro"><h3>{cap.title}</h3><p>{cap.intro}</p><a href={upstream}>查看对应源码与说明 ↗</a></div><div className="cap-cards">{cap.items.map(([title,desc],i)=><InkBox as="div" variant="card" seed={212+i*7+capability} className="cap-card" key={title}><span className="card-number">0{i+1}</span><h4>{title}</h4><p>{desc}</p></InkBox>)}</div></div><div className="workflow" aria-label="从发现到成果的流程"><div><span>01 / 发现</span><strong>候选与估算</strong><p>找到机会，不能直接等同可删空间。</p></div><div><span>02 / 审阅</span><strong>原因与后果</strong><p>用户决定，再验证对象和操作条件。</p></div><div><span>03 / 执行</span><strong>结果与核算</strong><p>永久完成后，用证据保守计入空间。</p></div><div><span>04 / 反馈</span><strong>收藏与记忆</strong><p>计数、容器与短声音表达已确认成果。</p></div></div></section>

      <section className="chapter" id="style"><SectionTitle number="02" eyebrow="ONE MATERIAL, ONE WORLD" title="纸、墨、金色。做成一套语言。">界面、应用插画、官网与歌曲共享绘图原语。可控的不规则，带来手画的温度。</SectionTitle><div className="style-grid"><InkBox as="div" variant="card" seed={seed} className="style-playground"><Tape uid="style-tape" className="sample-tape"/><p className="eyebrow">可操作的原作绘图</p><div className={`art-samples ${boiling?'boil-on':''}`}><FishSvg height={75} uid="sample-fish"/><WordmarkSvg height={36}/><MugDoodle/></div><div className="sample-buttons"><InkBox variant="primary" seed={seed+1} onClick={()=>setSampleClicks(sampleClicks+1)} className="sample-button">点击，像重描一笔</InkBox><InkBox variant="quiet" seed={seed+5} onClick={()=>setSeed(seed+13)} className="sample-button">改变笔画种子</InkBox></div><div className="style-controls"><label><input type="checkbox" checked={boiling} onChange={e=>setBoiling(e.target.checked)}/>线条三帧循环</label><span role="status">已点击 {sampleClicks} 次 · 种子 {seed}</span></div><p className="fine">悬停和按下改变轮廓；三组种子交替产生约 6 fps 的重绘感。</p></InkBox><div className="style-explanation"><div className="palette">{[['#FAF5EA','纸底'],['#33302B','墨线'],['#F2B63C','金色'],['#3F5FA8','笔蓝']].map(([color,label])=><div key={color}><span style={{background:color}}/><strong>{label}</strong><code>{color}</code></div>)}</div><ol className="style-principles"><li><strong>不规则，有共同的规则。</strong><p>固定种子扰动轮廓，二次曲线平滑。SVG 与 Canvas 共享同一套路径生成方法。</p></li><li><strong>手绘集中，正文清楚。</strong><p>角色、数字、胶带与控件负责气氛；系统字体负责阅读，不让全部信息一起抖动。</p></li><li><strong>动作与成果一起发生。</strong><p>薯条飞落、纸包回弹、数字增长与短音效，表达同一次已确认结果。</p></li></ol></div></div><div className="gallery"><div className="gallery-label"><p className="eyebrow">原作网页 · 实际截图</p><h3>{galleryItems[gallery][1]}</h3><p>{galleryItems[gallery][2]}</p><div className="gallery-tabs" role="tablist" aria-label="原作截图">{galleryItems.map((g,i)=><button role="tab" aria-selected={gallery===i} key={g[1]} onClick={()=>setGallery(i)} aria-label={`查看${g[1]}`}>0{i+1}</button>)}</div><a href="https://www.chippytea.com/" target="_blank" rel="noreferrer">打开原作官网 ↗</a></div><figure><img src={`./assets/${galleryItems[gallery][0]}`} alt={`Chippytea官网实测截图：${galleryItems[gallery][1]}`} loading="lazy"/><figcaption>原作截图 · 2026-10-02；用于研究，不是本项目原创作品。</figcaption></figure></div></section>

      <section className="chapter" id="music"><SectionTitle number="03" eyebrow="A SONG YOU CAN PLAY" title="品牌歌曲，也能成为一个小场景。">跟着词唱，点按抛薯条。歌词、角色与换场共享歌曲时间，画面有自己的段落。</SectionTitle><div className="music-grid"><div className="music-copy"><p className="tag">原作 Karaoke 组件 · 本地适配</p><h3>按下播放，进入纸墨舞台。</h3><p>逐词金色擦亮、跳动指示物、游动的鱼、桥段拍手与段落标签。你可以暂停、跳转、点按互动，也可以随时关闭。</p><div className="karaoke-launch"><Karaoke/></div><p className="music-credit">原曲由官网远程播放，需要网络。歌曲权益独立于代码许可。<br/>本地适配使用稳定备用节拍；歌词和段落按音频时间同步。</p><a href="https://www.chippytea.com/" target="_blank" rel="noreferrer">资源不可用时，前往官网体验 ↗</a></div><div className="music-poster"><img src="./assets/source-song.jpg" alt="原作歌曲场景：金色歌词、鱼和薯条纸包" loading="lazy"/><span>原作网页实测画面</span></div></div><div className="clock-row"><div><span>音频主时间</span><strong>定位当前歌词</strong><p>以播放器 currentTime 为共同基准。</p></div><div><span>词级时间</span><strong>擦亮与指示物</strong><p>逐词开始与结束，控制进度和跳动。</p></div><div><span>段落 + 节拍</span><strong>换场与动作</strong><p>主歌、副歌、桥段有不同的编排。</p></div></div></section>

      <section className="chapter value-chapter" id="value"><SectionTitle number="04" eyebrow="WHAT WE CAN TAKE FORWARD" title="对我们的价值，在完成之后。">把声音主钟、段落编排、统一绘图与交互特效，迁移到我们自己的功能场景。</SectionTitle><div className="value-grid"><div className="value-copy"><div className="tab-list" role="tablist" aria-label="价值方向">{opportunities.map((v,i)=><button role="tab" aria-selected={opportunity===i} id={`value-tab-${i}`} aria-controls={`value-panel-${i}`} key={v.name} onClick={()=>setOpportunity(i)}>{v.name}</button>)}</div><div role="tabpanel" id={`value-panel-${opportunity}`} aria-labelledby={`value-tab-${opportunity}`}><p className="eyebrow value-tag">{value.tag}</p><h3>{value.title}</h3><p className="value-desc">{value.desc}</p><dl><div><dt>接入什么</dt><dd>{value.input}</dd></div><div><dt>得到什么</dt><dd>{value.output}</dd></div><div><dt>先验证什么</dt><dd>{value.first}</dd></div></dl><p className="value-boundary">{value.boundary}</p><div className="related-links">{value.links.map(([title,url])=><a href={url} key={url}>{title} ↗</a>)}</div></div></div><InkBox as="div" variant="card" seed={681} className="trial-card"><p className="eyebrow">自有场景的表达</p><h3>角色、关系与规则，长出三个小世界。</h3><p>三个小世界保持 32 秒四幕：自己选一块岛面种下发现，看它生根展叶；裁缝把补丁分三针缝牢，影子追着灯光倾身起舞。花园和影子可开启 MiniMax 原创配乐，月亮仍静音待生成；也可连续看完三场，让每次收藏留下变化。</p><a href={workUrl}>分别体验三个原创场景 ↗</a></InkBox></div><InkBox as="div" variant="card" seed={841} className="takeaway"><p className="eyebrow">采用判断</p><h3>先让角色与规则成立，再让功能加入。</h3><p>原创角色、世界规则和用户动作之间的关系可以反复发展；确认完成的功能事件可以加入演出和积累。更高的完成率、留存、传播和转化，仍需要真实用户验证。</p><span>建议推进：原创角色与规则 → 分幕动作与互动 → 原创音乐编排 → 接入真实功能事件。</span></InkBox></section>

      <section className="chapter" id="daily-work"><SectionTitle number="05" eyebrow="ORIGINAL CHARACTER WORLDS" title="把功能结果，编成一段声画。">用独立角色、荒诞规则与互动编排，探索收藏、整理和尝试如何发展出原创场景。</SectionTitle><div className="daily-work-preview"><div><p className="eyebrow">原创角色 · 32 秒四幕 · 29 个 PNG 素材</p><h3>三个原创互动小世界</h3><p>v10 可以在岛上选位种下星种，幼苗按你的位置生长；补丁一针针缝牢，拖动灯光引出影子的倾身与压身。暂停也能即兴，支持三场连演；花园与影子可开启各自的 MiniMax 原创配乐。</p></div><a href={workUrl}>分别体验三个小世界 ↗</a></div></section>
      <section className="chapter" id="task-trial"><details><summary>历史任务反馈实验 · 浏览器内存数据</summary><p>保留早期任务、薯条与短音效的对照实验；它复用原作元素，与我们的三个原创世界分别展示。刷新重置，不能证明真实业务成果。</p><TaskTrial/></details></section>
      <footer className="site-footer"><div><p className="eyebrow">016 · CHIPPYTEA LAB</p><p>官网观察 + 固定源码研究 + 本地交互展示。<br/>没有验证原生清理性能、完整无障碍或商业收益。</p></div><div><a href="https://github.com/richiemcilroy/chippytea">上游仓库 ↗</a><a href="https://www.chippytea.com/">原作官网 ↗</a><a href="./source-notice.html">来源、改编与许可</a><a href="../../">返回研究总览</a></div></footer>
    </main>
  </>;
}

const params=new URLSearchParams(window.location.search);
createRoot(document.getElementById('root')!).render(params.get('view')==='experience'||(params.get('view')==='research'&&params.get('mode')!=='records')?<WorldExperience/>:params.get('view')==='folio'?<Experience/>:params.get('view')==='research'?<ResearchWork/>:params.get('view')==='source'?<App/>:<Overview/>);
