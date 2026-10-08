from pathlib import Path
P=Path(__file__).resolve().parents[1];s=(P/'tooling/check-parlor-catalogs.mjs').read_text(encoding='utf-8').replace('parlor','trajectories').replace("ids=['cascade','patience','lexicon']","ids=['dicework','synchro','perigee']").replace('trajectoriesIds','trajectoryIds');(P/'tooling/check-trajectories-catalogs.mjs').write_text(s,encoding='utf-8')
s=(P/'tooling/finalize-parlor-package.py').read_text(encoding='utf-8').replace('parlor','trajectories');changes=[
 ("IDS=['cascade','patience','lexicon']","IDS=['dicework','synchro','perigee']"),
 ("'thresholds','circuitry']","'thresholds','circuitry','parlor']"),
 ("'forms.html?left=falling-blocks&right=solitaire','forms.html?left=word-deduction&right=nonogram'","'forms.html?left=dice-combination&right=simultaneous-tactics','forms.html?left=orbital-navigation&right=flight-sim'"),
 ("cua.getState failed twice during initialization","cua.getState failed during initialization"),
 ("==98","==101"),("==107","==110")]
for a,b in changes:
 assert a in s,a;s=s.replace(a,b)
(P/'tooling/finalize-trajectories-package.py').write_text(s,encoding='utf-8');print('Prepared old parlor regressions, catalog comparison and packaging checks')
