from pathlib import Path
p=Path(__file__).resolve().parent/'check-game-forms.cjs'
s=p.read_text(encoding='utf-8')
s=s.replace('gameShowcase.total),22','gameShowcase.total),25')
s=s.replace("('.form-card').count(),13","('.form-card').count(),16")
s=s.replace("desk:'checkpoint'}","desk:'checkpoint','beat-em-up':'brawler','vertical-shooter':'skyline',racing:'coast'}")
s=s.replace("'automation','desk'])","'automation','desk','beat-em-up','vertical-shooter','racing'])")
s=s.replace('All 13 presentation types','All 16 presentation types')
p.write_text(s,encoding='utf-8')
