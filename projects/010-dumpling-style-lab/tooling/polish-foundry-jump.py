from pathlib import Path
p=Path(__file__).resolve().parents[1]/'web/showcase-foundry-rules.js';s=p.read_text(encoding='utf-8');s=s.replace('r.vy=-10.4;','r.vy=-11.5;');p.write_text(s,encoding='utf-8');print('More forgiving jump clearance, keeping real gravity and collisions')
