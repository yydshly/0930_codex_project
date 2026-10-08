// Selected fortune-cookie component, retaining the source texture, half masks and motion.
import {scope} from './runtime.js';
const tips=[
 ['Make the next step easy.','让客户看完之后，知道下一步怎么做。'],
 ['A clear offer beats ten clever adjectives.','具体的交付，比十个形容词更有用。'],
 ['Let people try the product.','给客户一个能亲手尝试的产品体验。'],
 ['Show what changes, and why.','让交互讲清参数改变了什么。'],
 ['A small detail can tell a big story.','一个小细节，也可以讲出品牌故事。'],
 ['Good motion has a reason.','好的动效，应该帮助用户理解。'],
 ['Leave them with a useful takeaway.','让客户带走配置、方案或需求记录。'],
 ['One good question starts a better project.','一个具体问题，可以开始一次有效讨论。'],
 ['Make your service easy to understand.','先让人理解你的服务，再邀请他咨询。'],
 ['Compare the choices, then choose.','看清差异之后，再做选择。'],
 ['Design the discovery, not just the screen.','设计一次有趣的发现，而不仅是一张页面。'],
 ['Test the experience with real people.','让真实用户验证体验与业务价值。']
];
const KEY='cs011-fortune-v1';
function load(){try{const d=JSON.parse(localStorage.getItem(KEY)||'null');if(d&&Number.isInteger(d.count)&&d.count>=0&&Array.isArray(d.deck)&&d.deck.every(i=>Number.isInteger(i)&&i>=0&&i<tips.length))return d;}catch(_){}return {count:0,deck:[]};}
function deck(){const a=tips.map((_,i)=>i);for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;}
export function mount(host,{reduced,onState}){
 host.innerHTML=`<div class="native-effect native-cookie"><div class="native-heading"><span>05 / YOUR FORTUNE</span><h3>Crack it <em>open.</em></h3><p>点一下，饼干开裂，纸条展开。</p></div><div class="native-cookie-invite"><span data-cookie-phase>ONE SMALL DISCOVERY</span><button type="button" data-cookie-open>打开饼干 ↗</button><small>原站照片贴图 · 开裂与纸条在此实时运行</small></div><div class="native-cookie-body"><button type="button" class="fortune-cookie" aria-label="打开幸运饼干"><span class="native-cookie-halo" aria-hidden="true"></span><span class="half l" aria-hidden="true"></span><span class="half r" aria-hidden="true"></span><span class="cookie-crumbs" aria-hidden="true"></span></button><div class="fortune-slip"><span data-fortune role="status">Tap the cookie.</span><small data-fortune-zh>轻轻点一下，看看里面写了什么。</small><small class="native-lucky" data-lucky>LUCKY NUMBERS 11 · 24 · 52</small></div></div><div class="native-cookie-foot"><span>OPENED HERE <b data-count>0</b></span><button type="button" data-cookie-reset>重置本机记录</button></div></div>`;
 const life=scope(host),button=host.querySelector('.fortune-cookie'),text=host.querySelector('[data-fortune]'),translation=host.querySelector('[data-fortune-zh]'),slip=host.querySelector('.fortune-slip'),crumbs=host.querySelector('.cookie-crumbs'),saved=load();let typing=0,busy=false,generation=0,rejoin=0;
 function hud(){const open=button.classList.contains('cracked');host.querySelector('[data-count]').textContent=saved.count;host.querySelector('[data-cookie-open]').textContent=open?'再开一个 ↗':'打开饼干 ↗';host.querySelector('[data-cookie-phase]').textContent=open?'YOUR FORTUNE IS HERE':'ONE SMALL DISCOVERY';button.setAttribute('aria-label',open?'再打开一个幸运饼干':'打开幸运饼干');onState({本机打开次数:saved.count,提示库:tips.length+' 条，洗牌后不重复',状态:open?'已打开':'待打开',接入:'原站静态照片 + 本地 CSS 开裂控制器'});}
 function showTip(en,zh){cancelAnimationFrame(typing);translation.textContent=zh;if(reduced){text.textContent=en;return;}text.textContent='';const start=performance.now();function type(now){const n=Math.floor((now-start)/22);text.textContent=en.slice(0,n);if(n<en.length)typing=requestAnimationFrame(type);}typing=requestAnimationFrame(type);}
 function crack(){if(busy)return;busy=true;const gen=++generation;clearTimeout(rejoin);const go=()=>{if(gen!==generation)return;if(!saved.deck.length)saved.deck=deck();const [en,zh]=tips[saved.deck.pop()];saved.count++;try{localStorage.setItem(KEY,JSON.stringify(saved));}catch(_){}button.classList.add('cracked');crumbs.replaceChildren();if(!reduced)for(let i=0;i<18;i++){const el=document.createElement('i'),a=Math.random()*6.28,d=60+Math.random()*120;el.style.setProperty('--x',Math.cos(a)*d+'px');el.style.setProperty('--y',Math.sin(a)*d+'px');crumbs.append(el);}host.querySelector('[data-lucky]').textContent='LUCKY NUMBERS '+[11,Math.floor(Math.random()*90+10),Math.floor(Math.random()*90+10)].join(' · ');hud();life.timeout(()=>{if(gen!==generation)return;slip.classList.add('open');showTip(en,zh);},reduced?0:180);life.timeout(()=>{if(gen===generation)busy=false;},reduced?0:600);};if(button.classList.contains('cracked')){button.classList.remove('cracked');slip.classList.remove('open');life.timeout(go,reduced?0:420);}else go();}
 life.listen(button,'click',crack);
 life.listen(host.querySelector('[data-cookie-open]'),'click',crack);
 life.listen(host.querySelector('[data-cookie-reset]'),'click',()=>{generation++;busy=false;clearTimeout(rejoin);cancelAnimationFrame(typing);saved.count=0;saved.deck=[];try{localStorage.removeItem(KEY);}catch(_){}button.classList.remove('cracked');slip.classList.remove('open');text.textContent='Tap the cookie.';translation.textContent='轻轻点一下，看看里面写了什么。';crumbs.replaceChildren();hud();});
 hud();return {dispose(){clearTimeout(rejoin);cancelAnimationFrame(typing);life.dispose();}};
}
