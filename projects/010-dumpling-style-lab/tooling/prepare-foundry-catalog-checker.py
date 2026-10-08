from pathlib import Path
P=Path(__file__).resolve().parents[1];s=(P/'tooling/check-trajectories-catalogs.mjs').read_text(encoding='utf-8')
s=s.replace('trajectories-preservation','foundry-preservation').replace("ids=['dicework','synchro','perigee']", "ids=['rigworks','drift','levelsmith']").replace('if(trajectoryIds.has(id))','if(foundryIds.has(id))')
(P/'tooling/check-foundry-catalogs.mjs').write_text(s,encoding='utf-8');print('Prepared complete old/new catalog comparison')
