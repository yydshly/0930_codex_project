from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'web/showcase.html'
t=p.read_text(encoding='utf-8').replace('<b>22</b>扩展方向','<b>25</b>扩展方向').replace('<b>15</b>视角与界面','<b>18</b>视角与界面').replace('31','34').replace('showcase.js?v=8','showcase.js?v=9')
p.write_text(t,encoding='utf-8')
for name in ('check-game-forms.cjs','check-arcade-forms.cjs','check-interaction-forms.cjs','check-strategy-forms.cjs'):
    p=ROOT/'tooling'/name
    t=p.read_text(encoding='utf-8').replace('gameShowcase.total),31','gameShowcase.total),34').replace("('.form-card').count(),22", "('.form-card').count(),25").replace("'.form-card').length===22", "'.form-card').length===25").replace("('.pending-forms article').count(),3", "('.pending-forms article').count(),7").replace("locator('option').count(),22", "locator('option').count(),25").replace('All 22 presentation types','All 25 presentation types').replace('22 form cards, three genuinely pending','25 form cards, seven genuinely pending')
    if name=='check-game-forms.cjs':t=t.replace("'turn-tactics':'tactics'}", "'turn-tactics':'tactics',sports:'sports',stealth:'stealth',pinball:'pinball'}")
    p.write_text(t,encoding='utf-8')
print('Finished current counts and retained previous checks')
