from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
t=(ROOT/'tooling/check-game-forms.cjs').read_text(encoding='utf-8')
t=t.replace('gameShowcase.total),45','gameShowcase.total),49').replace('.count(),36','.count(),40').replace('All 36 presentation forms','All 40 presentation forms')
t=t.replace("'co-op':'tandem'","'co-op':'tandem','mini-golf':'putt','train-dispatch':'signal',fishing:'angler',artillery:'battery'")
t=t.replace('assets/game-forms/comparison-desktop.png','assets/game-forms/motion-qa/comparison-regression-desktop.png').replace('assets/game-forms/comparison-mobile.png','assets/game-forms/motion-qa/comparison-regression-mobile.png').replace('notes/game-forms-check-20261003.json','notes/motion-regression-check-20261003.json')
(ROOT/'tooling/check-motion-regression.cjs').write_text(t,encoding='utf-8')
print('Created new batch regression without overwriting earlier evidence.')
