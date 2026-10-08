import { catalog } from './catalog.js';
const escape = value => String(value).replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const scenes = {
  catalog: {
    title: '研究集互动首页', type: '真实仓库内容', threshold: .35,
    brief: '把当前研究集中的真实项目标题与摘要变成可破坏的内容，完成后继续阅读研究。',
    goal: '破坏 35% 的标记内容。', outcome: '出现真实项目入口，继续查看能力与原理。',
    className: '', background: '#eef3f6',
    html: () => `<div class="scene-nav"><span class="scene-wordmark">OPEN SOURCE FIELD NOTES</span><span>本仓库 · ${catalog.length} 项研究</span></div><div class="scene-head"><p class="scene-kicker">PLAY / EXPLORE / UNDERSTAND</p><h2 data-destructible>把好奇心，变成一次探索。</h2><p>这些卡片来自真实 projects.json。打碎之后，再进入研究。</p></div><div class="catalog-cards">${catalog.slice(0,3).map(p=>`<article class="catalog-card" data-destructible data-tag="project-${p.id}"><span class="number">PROJECT ${String(p.id).padStart(3,'0')}</span><h3>${escape(p.name.split(' · ')[0])}</h3><p>${escape(p.summary.split('；')[0])}</p></article>`).join('')}</div><div class="scene-bottom"><span>REAL CATALOG / LOCAL INTERACTION</span><span>完成阈值 35%</span></div>`,
    result: () => `<h3>探索继续：进入真实研究项目</h3><p>你已打碎 35% 的内容。互动完成后的阅读动作可以独立记录。</p>${catalog.slice(0,3).map(p=>`<a target="_blank" rel="noopener noreferrer" data-followup="project-${p.id}" href="https://yydshly.github.io/0930_codex_project/projects/${String(p.id).padStart(3,'0')}-${escape(p.slug)}/">${escape(p.name.split(' · ')[0])} ↗</a>`).join('')}`
  },
  campaign: {
    title:'活动页 · 打碎旧价', type:'可操作业务示例', threshold:.8, goalTag:'price',
    brief:'活动页把旧价做成一个明确目标。射击票券，打碎旧价区域，再揭晓可复制的示例活动码。',
    goal:'打碎 80% 的旧价票券区域。', outcome:'解锁活动码的复制操作，记录完成与复制事件。',
    className:'campaign-dom', background:'#faf1df',
    html:()=>`<div class="scene-nav"><span class="scene-wordmark">FIELD / GOODS</span><span>活动流程示例 · 无真实订单</span></div><div class="campaign-top"><div class="campaign-copy"><p class="scene-kicker">BREAK THE OLD PRICE</p><h2 data-destructible>旧价退场。<br>惊喜登场。</h2><p>瞄准右侧票券，打碎旧价，揭晓新的活动码。</p></div><div class="sale-ticket" data-destructible data-tag="price"><div><small>原价 · 示例商品</small><div class="old-price">¥299</div></div><p class="sale-caption">打碎这张票券<br>揭晓活动码</p></div></div><div class="campaign-tags"><div class="campaign-tag" data-destructible>01 / 瞄准旧价</div><div class="campaign-tag" data-destructible>02 / 完成任务</div><div class="campaign-tag" data-destructible>03 / 复制活动码</div></div><div class="scene-bottom"><span>CAMPAIGN FLOW / DEMONSTRATION</span><span>目标：旧价区域 80%</span></div>`,
    result:()=>`<h3>旧价已退场，活动码已揭晓。</h3><p>示例活动码：<strong>BREAK20-DEMO</strong>。这是流程演示，不能用于真实购物。</p><button id="copy-coupon">复制示例活动码</button><span id="coupon-state"></span>`
  },
  classroom: {
    title:'课堂 · 碰撞与冲量',type:'实时物理实验',threshold:.25,
    brief:'打开刚体边界，调节重力与冲量。对比不同条件下受击碎片的运动，而不是观看预录动画。',
    goal:'破坏 25% 的实验面板，并观察落体与碰撞。',outcome:'得到参数实验建议，可下载这次操作记录。',
    className:'classroom-dom',background:'#122d3c',
    html:()=>`<div class="scene-nav"><span class="scene-wordmark">PHYSICS / LIVE LAB</span><span>二维刚体 · 即时计算</span></div><div class="scene-head"><p class="scene-kicker">FORCE / GRAVITY / COLLISION</p><h2 data-destructible>一发射击，观察三种变化。</h2><p>碎片解除固定，获得速度，然后受重力与碰撞影响。</p></div><div class="physics-cards"><article class="physics-card" data-destructible><strong>01</strong><h3>静态 → 动态</h3><p>没有命中前，面板固定在页面上。</p></article><article class="physics-card" data-destructible><strong>02</strong><h3>冲量改变速度</h3><p>强度越高，碎片初始运动越明显。</p></article><article class="physics-card" data-destructible><strong>03</strong><h3>重力改变轨迹</h3><p>重力为零时，不会产生重力下落。</p></article></div><div class="physics-equation" data-destructible>Δp = J　　F = ma</div><div class="scene-bottom"><span>LIVE CALCULATION / MATTER.JS</span><span>目标：面板 25%</span></div>`,
    result:()=>`<h3>现在做一次对照实验。</h3><p>把重力设为 0、冲量设为 2，再复原重试。对比默认参数，观察碎片是否仍向下加速。显示刚体边界可看到纹理与碰撞形状的对应关系。</p><button id="show-parameters">打开实验参数</button>`
  }
};
