from pathlib import Path
import json
P=Path(__file__).resolve().parents[1];W=P/'web'
entries=[
 dict(form='inventory-loadout',id='satchel',name='背包空间配装',title='行囊工坊',family='策略',view='俯视工作台 / 空间装备',action='摆放 · 旋转 · 邻接 · 检验',description='把不同形状的装备放进行囊，用位置和相邻组合改变攻击、防护和补给，再实际检验远行结果。',compare='与整理拼图不同：布局不仅要放得下，还决定装备属性；同样物件换位置就会改变战斗结果。',scope='六种原创透明装备、6×5 行囊及两处封闭格、拖动与点按、四向旋转、实际形状碰撞与空间占用、三种正交邻接联动、移回托盘、撤销、真实逐轮配装检验、胜负与本地独立保存。当前为固定装备和一次守卫遭遇，没有完整随机冒险进程。',reference='Backpack Hero / 空间摆放影响能力',url='https://store.steampowered.com/app/1970580/Backpack_Hero/',next='可扩展装备形状、插槽、邻接规则、背包升级和不同任务的配装选择。',controls='选择或拖动装备 · 点击行囊放置 · R 旋转 · 方向键调整 · Enter 放置 · 检验配装',dimension='2D / 空间策略'),
 dict(form='auction-bidding',id='gavel',name='限时竞价拍卖',title='钟声拍卖',family='策略',view='拍卖现场 / 鉴定与竞价席',action='鉴定 · 出价 · 等落槌 · 留预算',description='观察拍品鉴定、竞争者和倒计时，决定追价或放弃；只有真实成交才扣款，三件拍品形成实际收藏账目。',compare='与牌桌选牌不同：价格由连续竞争改变，出价时机和保留预算影响后续机会。',scope='三件原创拍品、拍卖厅美术、鉴定范围、两个本地竞价角色、真实倒计时、近结束出价延时、预算限制、实际成交扣款、成交价与估值收益、三场结果、本地保存。当前对手是本地规则角色，不是联网真人拍卖，也不是现实资产交易。',reference="Dealer’s Life 2 / 鉴定与拍卖决策",url='https://store.steampowered.com/app/1343670/Dealers_Life_2/',next='可扩展竞价性格、拍品线索、密封出价、轮换收藏目标与多人房间。',controls='查看鉴定 · 选择加价档位 · 看竞争与落槌 · 下一件拍品 · 可暂停观察',dimension='2D / 经济决策'),
 dict(form='asynchronous-relay',id='postway',name='跨窗口异步接力',title='月湾接力',family='空间',view='路线地图 / 制图与接棒两端',action='画路线 · 发布 · 接棒 · 步进送达',description='一个窗口留下经过驿站的路线，另一个窗口用接力码读取并继续运输；共享进度保存在本机服务中。',compare='与同屏双人和动作录制不同：两端不必同时在线，后来的窗口使用先前保存的真实路线和任务状态。',scope='原创月湾地图、12×7 实际网格与岩脊、相邻不重复路线、三座驿站与港口、六位接力码、独立身份领取、权威一步移动、HTTP 与 SQLite 持久化、重复请求恢复、双方状态核对、暂停与本地身份保存。服务仅绑定本机 127.0.0.1:8971，当前不是互联网多人持久世界，没有模拟的另一玩家。',reference='Death Stranding / 间接协作的参考方向',url='https://store.steampowered.com/app/1850570/DEATH_STRANDING_DIRECTORS_CUT/',next='可扩展多段接力、不同任务贡献、公开部署后的跨设备接棒与持久地图建设。',controls='制图端点格或方向键画路线 · 发布后复制六位码 · 打开接棒窗口输入 · 沿金线逐步送达',dimension='2D / 异步参与')
]
files=['forms.html','forms.js','game-forms-catalog.js','showcase-catalog.js','showcase.html','showcase.js'];sources={f:(W/f).read_text(encoding='utf-8') for f in files};assert 'exchangeIds' not in sources['showcase.js']
def edit(f,a,b):
 assert a in sources[f],(f,a);sources[f]=sources[f].replace(a,b)
ids=[e['id'] for e in entries];quoted=','.join(json.dumps(x) for x in ids);forms=[];directions=[]
for e in entries:
 forms.append(json.dumps(dict(id=e['form'],play=e['id'],name=e['name'],dimension=e['dimension'],view=e['view'],action=e['action'],rhythm=e['action'],reference=e['reference'],description=e['description'],compare=e['compare'],next=e['next']),ensure_ascii=False))
 vals=[e[k] for k in ['id','title','name','family','view','reference','url']]+['assets/game-forms/exchange/previews/'+e['id']+'.webp']+[e[k] for k in ['description','scope','controls']];directions.append('item('+','.join(json.dumps(v,ensure_ascii=False) for v in vals)+')')
edit('game-forms-catalog.js','export const gameFormMap=','gameForms.push(\n'+',\n'.join(forms)+'\n);\nexport const gameFormMap=')
edit('showcase-catalog.js','for(const direction of newDirections)if(','newDirections.push(\n'+',\n'.join(directions)+'\n);\nfor(const d of newDirections)if('+json.dumps(ids)+'.includes(d.id))d.previewKind="生产 Canvas2D 场景绘制预览";\nfor(const direction of newDirections)if(')
edit('showcase-catalog.js','"drift","levelsmith"].includes','"drift","levelsmith",'+quoted+'].includes')
edit('showcase.js','foundryIds=new Set([','exchangeIds=new Set(['+quoted+']),foundryIds=new Set([')
edit('showcase.js','"drift","levelsmith"]),originalEdition','"drift","levelsmith",'+quoted+']),originalEdition')
edit('showcase.js','if(foundryIds.has(id)){',"if(exchangeIds.has(id)){factoryModules.exchange??=await import('./showcase-exchange.js?v=20261004-1');return factoryModules.exchange.createExchange({...options,id})}if(foundryIds.has(id)){")
edit('showcase.js','"levelsmith",\'putt\'','"levelsmith",'+quoted+',\'putt\'')
for f in ['forms.js','showcase.js']:edit(f,'showcase-catalog.js?v=20261004-19','showcase-catalog.js?v=20261004-20')
edit('forms.js','game-forms-catalog.js?v=20261004-16','game-forms-catalog.js?v=20261004-17')
edit('forms.html','104 种','107 种');edit('forms.html','104 FORM','107 FORM');edit('forms.html','forms.js?v=29','forms.js?v=30');edit('forms.html','本轮新增：','上一批：')
links=''.join('<a href="forms.html?left='+a+'&amp;right='+b+'#compare">本轮新增：'+t+' ↗</a>' for a,b,t in [('inventory-loadout','auction-bidding','空间配装 × 限时竞价'),('asynchronous-relay','co-op','异步接力 × 既有同屏合作')]);edit('forms.html','<div class="new-form-entry">','<div class="new-form-entry">'+links)
edit('showcase.html','一百零四','一百零七');edit('showcase.html','113 个','116 个');edit('showcase.html','<b>104</b>','<b>107</b>');edit('showcase.html','showcase.js?v=43','showcase.js?v=44')
for f,s in sources.items():(W/f).write_text(s,encoding='utf-8')
(P/'notes/exchange-catalog-entries-20261004.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2),encoding='utf-8');print('Integrated 107 forms / 116 entrances, previous entries retained')
