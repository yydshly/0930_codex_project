/* Export the current renderer and a self-contained, editable understanding map.
 * Requires the same build-time Playwright installation as the browser checks.
 * The web page has no added runtime dependency.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.BLACK_HOLE_PLAYWRIGHT || 'playwright');
const project = path.resolve(__dirname, '..');
const assets = path.join(project, 'web', 'assets');
const urlIndex = process.argv.indexOf('--url');
const url = urlIndex < 0 ? 'http://127.0.0.1:62116/projects/012-black-hole-lab/web/' : process.argv[urlIndex + 1];
const width = 1800, height = 2240;
const palette = { text:'#eef2f7', muted:'#a8b7c8', gold:'#eab775', blue:'#9dc7e9', line:'#334258', panel:'#111c2b' };
const escape = text => String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const parts = [];
const add = markup => parts.push(markup);
function text(x,y,value,size=28,color=palette.text,weight=400,anchor='start') {
  add(`<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${escape(value)}</text>`);
}
function lines(x,y,values,size=27,color=palette.muted,spacing=40) {
  values.forEach((value,index) => text(x,y+index*spacing,value,size,color));
}
function rect(x,y,w,h,fill=palette.panel,radius=14,stroke=palette.line) {
  add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`);
}
function arrow(x1,y1,x2,y2,color=palette.muted) {
  add(`<path d="M ${x1} ${y1} L ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="2"/>`);
  add(`<path d="M ${x2-9} ${y2-6} L ${x2} ${y2} L ${x2-9} ${y2+6}" fill="none" stroke="${color}" stroke-width="2"/>`);
}
function heading(y,index,value) {
  text(80,y,index,25,palette.gold,500);
  text(145,y+2,value,38,palette.text,500);
}

async function main() {
  fs.mkdirSync(assets,{recursive:true});
  const browser = await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1,reducedMotion:'reduce'});
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => window.blackHoleLab?.getState().renderCount > 0,{},{timeout:60000});
    await page.locator('#voice-enabled').uncheck();
    await page.locator('[data-stage="9"]').click();
    await page.locator('#build-next').click();
    await page.locator('#quality').selectOption('balanced');
    await page.locator('[data-preset="cinematic"]').click();
    await page.locator('#false-color').check();
    if (!(await page.evaluate(() => blackHoleLab.getState().paused))) await page.locator('#pause').click();
    await page.addStyleTag({content:'.lab-layout{height:440px!important}.viewer{min-height:0!important}'});
    await page.waitForFunction(() => blackHoleLab.getState().journey.stage === 9);
    const capture = await page.evaluate(() => {
      blackHoleLab.render();
      const state = blackHoleLab.getState();
      if (state.failure) throw new Error(state.failure);
      return { image:document.getElementById('black-hole').toDataURL('image/png'), state:{mass:state.mass,inclination:state.inclination,falseColor:state.falseColor,width:state.width,height:state.height} };
    });
    const effect = Buffer.from(capture.image.split(',')[1],'base64');
    if (effect.length < 10000) throw new Error('Renderer export is unexpectedly empty');
    fs.writeFileSync(path.join(assets,'summary-effect.png'),effect);
    await page.close();

    add(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="map-title map-desc">`);
    add('<title id="map-title">黑洞效果与时空认知总览</title>');
    add('<desc id="map-desc">本项目的黑洞效果与后续讨论总结：外部热气体和光路产生亮盘、亮弧、明暗差及暗影；大质量恒星核心可因支撑不足向内塌缩，形成有事件视界的黑洞。时空影响可测的距离、光路与时钟关系。人体按自身时间生活与衰老，假想旅者一年、地球十年对应真实年龄差。远处收到的光似乎停住，不代表本人冻结；视界内无法返回。橙色画面为温度伪彩，一比十为理论例子。</desc>');
    add('<defs><linearGradient id="page-glow" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#111c2c"/><stop offset="1" stop-color="#080d16"/></linearGradient><clipPath id="effect-clip"><rect x="108" y="314" width="850" height="337" rx="9"/></clipPath></defs>');
    add('<rect width="1800" height="2240" fill="url(#page-glow)"/>');
    add('<g font-family="Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif">');
    text(80,76,'BLACK HOLE LAB  /  012  /  理解整理',24,palette.gold,500);
    text(80,153,'黑洞效果与时空认知总览',64,palette.text,500);
    text(80,209,'定义：事件视界内发出的光，无法抵达遥远外部；亮光来自视界外的气体。',29,palette.muted);

    rect(80,246,1640,458,'#101a28',16);
    text(112,292,'01  这个项目展示的黑洞效果',29,palette.gold,500);
    add(`<image href="${capture.image}" x="108" y="314" width="850" height="337" preserveAspectRatio="xMidYMid slice" clip-path="url(#effect-clip)"/>`);
    text(116,681,'本项目成像导出 · 橙色为温度伪彩 · 并非观测照片',23,palette.muted);
    const effectLabels = [
      ['暗影','光捕获与照明共同决定暗区。','暗影的边缘不等于实体表面。'],
      ['外部亮盘','气体绕行、吸积并发热辐射。','不是黑洞内部发出的光。'],
      ['上下亮弧','背面盘光经过弯曲路径抵达我们。','盘面本身没有向上拱起。'],
      ['两侧明暗差','气体运动与引力改变接收的光。','真实颜色还取决于观测波段。']
    ];
    effectLabels.forEach((label,index) => {
      const y=319+index*106;
      text(1015,y,label[0],28,palette.gold,500);
      lines(1015,y+31,label.slice(1),22,palette.muted,26);
    });

    heading(752,'02','如何形成：一条恒星质量黑洞路线');
    const formation = [
      ['大质量恒星的核心','压力曾经支撑住它'],
      ['晚期核心支撑不足','无法维持原来的平衡'],
      ['物质向中心收缩','自身引力驱动坍缩'],
      ['可能形成黑洞','出现事件视界']
    ];
    formation.forEach((item,index) => {
      const x=80+index*420;
      rect(x,787,380,148,'#131d2a',12);
      text(x+25,847,item[0],30,palette.text,500);
      text(x+25,893,item[1],26,palette.muted);
      if (index<3) arrow(x+389,859,x+411,859,palette.gold);
    });
    lines(80,978,['也可能留下其他恒星残骸；太阳正常演化不会形成黑洞。','附近有合适的气体供给时，才可能出现图中的亮盘。'],26,palette.muted,38);

    heading(1073,'03','后来理解的关系：空间、时间与身体');
    const concepts = [
      ['空间与光路',['光路、距离和运动路径','能出现可测的变化。','引力波可改变镜间距离。']],
      ['时间可以量化',['时间能用秒测量。','不同引力与运动经历，','可积累不同的自身时间。']],
      ['身体按当地时间运行',['钟与当地物理过程相联系。','光钟是测量时间的工具，','那束光不控制人的衰老。']]
    ];
    concepts.forEach((item,index) => {
      const x=80+index*560;
      add(`<path d="M ${x} 1112 H ${x+520}" stroke="${palette.line}" stroke-width="1"/>`);
      text(x,1165,item[0],32,index===0?palette.gold:palette.blue,500);
      lines(x,1221,item[1],28,palette.muted,43);
    });
    text(80,1381,'质量与能量影响时空几何；运动改变经历的路径。每个人随身钟累计的时间，叫“固有时”。',27,palette.text);

    heading(1445,'04','同一次重逢，可以有不同的年龄');
    rect(80,1482,1640,329,'#122033',16,'#3a5571');
    text(118,1530,'假想：同为 30 岁出发，在其他条件相当时，身体按各自的自身时间生活与衰老。',27,palette.muted);
    const journeys = [
      {y:1608,name:'地球朋友',duration:'自身钟累计 10 年',age:'重逢时 40 岁',color:palette.gold},
      {y:1730,name:'旅者',duration:'自身钟累计 1 年',age:'重逢时 31 岁',color:palette.blue}
    ];
    journeys.forEach(item => {
      text(118,item.y+7,item.name,31,palette.text,500);
      rect(333,item.y-40,174,78,'#172b40',10,'#45617b');
      text(420,item.y+10,'30 岁',31,palette.text,500,'middle');
      arrow(530,item.y,1260,item.y,item.color);
      rect(752,item.y-43,318,61,'#122033',0,'#122033');
      text(911,item.y-4,item.duration,31,item.color,500,'middle');
      rect(1286,item.y-40,350,78,'#172b40',10,'#45617b');
      text(1461,item.y+10,item.age,32,item.color,500,'middle');
    });
    text(80,1855,'1:10 是理论示例，不是本页计算行程或已实现人类旅行；实际比例取决于完整经历。',26,palette.muted);

    heading(1920,'05','哪些事情必须分清');
    const boundaries = [
      ['真实时间差',['不同于环境让代谢改变。','本人仍正常生活与衰老。','不会自动增加主观生命时长。']],
      ['远处看到“似乎停住”',['收到的光越来越迟、红、暗。','不代表下落者自己冻结。','下落者的自身时间继续前进。']],
      ['视界内无法返回',['可返回的旅程须留在视界外。','黑洞内部真实结构仍待研究。','没有证据表明它是穿越通道。']]
    ];
    boundaries.forEach((item,index) => {
      const x=80+index*560;
      text(x,1980,item[0],31,palette.text,500);
      lines(x,2025,item[1],26,palette.muted,37);
    });
    text(80,2170,'对我们的意义：理解强引力；把可解释的黑洞效果用于科普、游戏与成像实验。',29,palette.gold,500);
    text(80,2218,'模型：无自旋外部光路 + 简化薄盘 / 形成机制示意   ·   依据：NASA、NIST、Einstein Online、CERN、LIGO',22,palette.muted);
    add('</g></svg>');
    const svg = parts.join('\n');
    const svgPath = path.join(assets,'understanding-map.svg');
    fs.writeFileSync(svgPath,svg,'utf8');
    const mapPage = await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
    await mapPage.goto(pathToFileURL(svgPath).href);
    await mapPage.evaluate(() => document.fonts.ready);
    const overflow = await mapPage.evaluate(() => [...document.querySelectorAll('text')].filter(node => {
      const box=node.getBBox(); return box.x<0 || box.x+box.width>1800 || box.y<0 || box.y+box.height>2240;
    }).map(node => node.textContent));
    if (overflow.length) throw new Error('Map labels out of bounds: '+overflow.join('; '));
    const png = await mapPage.evaluate(async ({source,w,h}) => {
      const image = new Image();
      image.src = source;
      await image.decode();
      const canvas = document.createElementNS('http://www.w3.org/1999/xhtml','canvas');
      canvas.width=w; canvas.height=h;
      canvas.getContext('2d').drawImage(image,0,0,w,h);
      return canvas.toDataURL('image/png');
    },{source:'data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64'),w:width,h:height});
    fs.writeFileSync(path.join(assets,'understanding-map.png'),Buffer.from(png.split(',')[1],'base64'));
    console.log(JSON.stringify({svg:svgPath,png:path.join(assets,'understanding-map.png'),dimensions:[width,height],renderer:capture.state,embeddedImageBytes:effect.length,labelOverflow:overflow},null,2));
  } finally { await browser.close(); }
}
main().catch(error => {console.error(error);process.exitCode=1;});
