from pathlib import Path
root=Path(__file__).resolve().parent
def replace(file,old,new):
 p=root/file;t=p.read_text(encoding='utf-8');assert t.count(old)==1,(file,old[:65],t.count(old));p.write_text(t.replace(old,new),encoding='utf-8')
replace('check-world-rules.mjs','modules.set(file,m);await m.link(spec=>moduleAt(path.resolve(path.dirname(file),spec)));return m}', 'modules.set(file,m);return m}')
replace('check-world-rules.mjs',"if(m.status!=='evaluated')await m.evaluate();", "if(m.status==='unlinked')await m.link((spec,referrer)=>moduleAt(path.resolve(path.dirname(referrer.identifier),spec)));if(m.status!=='evaluated')await m.evaluate();")
replace('check-showcase-release.cjs',"assert(await p.locator('.world-card').count()===21);", "assert(await p.locator('.world-card').count()===9);await p.getByRole('button',{name:'全部',exact:true}).click();assert(await p.locator('.world-card').count()===21);")
replace('check-showcase-play.cjs',"name,exact:true", "name:name==='结束一天'?/^结束一天/:name==='浇水'?'浇水所选田地':name==='收获'?'收获所选田地':name,exact:typeof name==='string'&&name!=='结束一天'")
print('Updated module linking and checks for the retained-world default and contextual controls.')
