import pathlib

root=pathlib.Path(__file__).resolve().parents[1]
replacements={
 'gameShowcase.total),41':'gameShowcase.total),45',
 "locator('.form-card').count(),32":"locator('.form-card').count(),36",
 "locator('option').count(),32":"locator('option').count(),36",
 "querySelectorAll('.form-card').length===32":"querySelectorAll('.form-card').length===36",
 'All 32 presentation types':'All 36 presentation forms',
 'All 36 presentation types':'All 36 presentation forms',
 '32 form cards':'36 form cards',
 '32 playable forms':'36 playable forms',
 '32 forms, no pending':'36 forms, no pending',
}
for file in (root/'tooling').glob('check-*-forms.cjs'):
 text=file.read_text(encoding='utf-8');original=text
 for a,b in replacements.items():text=text.replace(a,b)
 if file.name=='check-game-forms.cjs' and "'command-rpg':'party'" not in text:
  needle="'visual-novel':'novel'}"
  assert needle in text
  text=text.replace(needle,"'visual-novel':'novel','command-rpg':'party','city-planning':'district','physics-puzzle':'balance','co-op':'tandem'}")
 if text!=original:file.write_text(text,encoding='utf-8');print('Updated count assertions:',file.name)
