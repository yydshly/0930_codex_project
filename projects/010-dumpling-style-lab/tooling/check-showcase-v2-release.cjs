const {chromium}=require('./browser.cjs'),fs=require('fs/promises'),path=require('path'),assert=require('assert');
(async()=>{
 const root=path.resolve(__dirname,'..'),browser=await chromium.launch({headless:true,args:['--ignore-gpu-blocklist','--enable-webgl']}),p=await browser.newPage({viewport:{width:960,height:800}}),errors=[],missing=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))missing.push(r.url())});
 await p.goto('http://127.0.0.1:8962/showcase.html?qa=1&play=order#play');await p.waitForFunction(()=>gameShowcase?.ready);
 const rules=await p.evaluate(async()=>{
   const {sevenBag}=await import('./showcase-2d.js'),{scoreHand}=await import('./showcase-table.js');
   return {bags:Array.from({length:24},()=>sevenBag()).every(b=>b.length===7&&new Set(b).size===7),base:scoreHand([0,18,24]).score,cargo:scoreHand([0,18,24],4).score,routeAndSupport:scoreHand([0,18,24],0,{supportBonus:6,routeBonus:.15}).score};
 });assert(rules.bags&&rules.base===21&&rules.cargo===27&&rules.routeAndSupport===33);
 await p.locator('#play-start').click();await p.locator('#play-sound').click();
 const audio=await p.evaluate(async()=>{const {preloadAudio}=await import('./showcase-audio.js'),context=new AudioContext(),decoded=await preloadAudio(context);await context.close();return {samples:decoded.length,decoded:decoded.every(r=>r.status==='fulfilled')}});assert(audio.samples>=12&&audio.decoded);
 await p.locator('#play-mount').focus();await p.keyboard.press('p');assert(await p.locator('#play-paused').isVisible());await p.locator('#play-resume').click();
 // All builder progress below is earned through its native controls.
 await p.evaluate(()=>gameShowcase.select('builder'));await p.waitForFunction(()=>gameShowcase.current==='builder'&&gameShowcase.ready);await p.locator('#play-start').click();
 const action=name=>p.locator('#play-actions').getByRole('button',{name,exact:true}).click();
 for(let i=0;i<3;i++){await action('建造方块');if(i<2)await action('选择下一格')}
 await p.evaluate(()=>gameShowcase.save());await p.reload();await p.waitForFunction(()=>gameShowcase?.ready);await p.locator('#play-start').click();
 let builder=await p.evaluate(()=>structuredClone(gameShowcase.state));assert(builder.stock===5&&Object.keys(builder.blocks).length===3);
 await action('挖回方块');builder=await p.evaluate(()=>structuredClone(gameShowcase.state));assert(builder.stock===6&&!builder.blocks['2:0']);
 const bridgeRestoration={built:3,restored:true,removedAfterRestore:true};
 // Restore a genuinely earned ending from the actual-input report, never invent a win.
 const earned=JSON.parse(await fs.readFile(path.join(root,'notes/showcase-play-check.json'))).results.find(r=>r.id==='afterdark').state;
 assert(earned.end&&earned.chapter===2&&earned.log);
 await p.evaluate(s=>localStorage.setItem('dumpling-showcase-qa-v1-afterdark',JSON.stringify({version:1,state:s})),earned);
 await p.goto('http://127.0.0.1:8962/showcase.html?qa=1&play=afterdark#play');await p.waitForFunction(()=>gameShowcase?.ready);await p.locator('#play-start').click();
 assert((await p.locator('.world-card[data-id=afterdark] .card-badge').textContent()).includes('已完成'));
 await p.locator('#play-actions').getByRole('button',{name:'重走这一夜',exact:true}).click();assert((await p.evaluate(()=>gameShowcase.state.chapter))===0);
 const records=await p.evaluate(()=>JSON.parse(localStorage.getItem('dumpling-showcase-qa-v1-records')));assert(records.afterdark.completed&&records.afterdark.endings.includes('truth'));
 await browser.close();
 const site=path.resolve(root,'../../_site/projects/010-dumpling-style-lab');
 for(const file of ['showcase-combat.js','showcase-landscape.js','showcase-audio.js','assets/showcase/rail-prop-0.webp','assets/showcase/nature/tree_oak.glb','assets/showcase/nature/License.txt','assets/showcase/audio/rpg-audio/knifeSlice.ogg','assets/showcase/audio/rpg-audio/License.txt','assets/showcase/audio/interface-sounds/License.txt'])await fs.access(path.join(site,file));
 const model=await fs.readFile(path.join(site,'assets/showcase/nature/tree_oak.glb')),gltf=JSON.parse(model.subarray(20,20+model.readUInt32LE(12)).toString());assert(gltf.materials?.length&&!gltf.images?.length,'Nature meshes carry authored material colors without an external texture');
 const reportPath=path.join(root,'notes/showcase-release-check.json'),previous=JSON.parse(await fs.readFile(reportPath));
 await fs.writeFile(reportPath,JSON.stringify({...previous,at:new Date().toISOString(),v2:{rules,audio,bridgeRestoration,endingRecordsAndReplay:true,publicNaturePropsAudioAndLicenses:true,errors,missing}},null,2));
 assert(!errors.length&&!missing.length,JSON.stringify({errors,missing}));console.log('V2 audio decoding, reward formulas, seven-shape bags, saved bridge removal, ending records, replay and public art bundle passed');
})().catch(e=>{console.error(e);process.exitCode=1});
