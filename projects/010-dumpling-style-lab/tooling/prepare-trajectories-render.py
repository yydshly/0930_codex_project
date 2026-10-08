from pathlib import Path
P=Path(__file__).resolve().parents[1];s=(P/'tooling/render-parlor-scenes.mjs').read_text(encoding='utf-8').replace('parlor','trajectories').replace('Parlor','Trajectories').replace('playTrajectories','playTrajectory')
(P/'tooling/render-trajectories-scenes.mjs').write_text(s,encoding='utf-8');print('Prepared nine production frames from normal playthroughs')
