from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
for name in ('check-action-forms.cjs','check-arcade-forms.cjs','check-interaction-forms.cjs','check-strategy-forms.cjs','check-game-forms.cjs'):
    p=ROOT/'tooling'/name
    t=p.read_text(encoding='utf-8').replace('gameShowcase.total),34','gameShowcase.total),37').replace('.count(),25','.count(),28').replace('.form-card\').length===25','.form-card\').length===28').replace("('.pending-forms article').count(),7","('.pending-forms article').count(),4")
    t=t.replace('25 playable forms','28 playable forms').replace('25 form cards, seven genuinely pending','28 form cards, four genuinely pending').replace('All 25 presentation types','All 28 presentation types').replace('Twenty-two playable form cards, three genuinely pending forms','Twenty-eight playable form cards, four genuinely pending forms')
    if name=='check-game-forms.cjs' and "'flight-sim':'pilot'" not in t:
        t=t.replace("pinball:'pinball'}", "pinball:'pinball','flight-sim':'pilot','rail-shooter':'rail','point-click':'archive'}")
        assert "'flight-sim':'pilot'" in t
    p.write_text(t,encoding='utf-8')
print('Updated live form-count assertions and regression map to 28 / 37 / 4')
