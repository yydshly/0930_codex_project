from pathlib import Path
P=Path(__file__).resolve().parents[1]
f=P/'tooling/check-circuitry-catalogs.mjs';s=f.read_text(encoding='utf-8').replace('circuitry','parlor').replace("ids=['prismcube','orbiter','automata','receiver']","ids=['cascade','patience','lexicon']")
(P/'tooling/check-parlor-catalogs.mjs').write_text(s,encoding='utf-8')
f=P/'tooling/finalize-circuitry-package.py';s=f.read_text(encoding='utf-8').replace('circuitry','parlor')
changes=[
 ("IDS=['prismcube','orbiter','automata','receiver']","IDS=['cascade','patience','lexicon']"),
 ("'kinetics','thresholds']","'kinetics','thresholds','circuitry']"),
 ("'kinetics','thresholds'] else","'kinetics','thresholds','circuitry'] else"),
 ("'Production draw factories via Skia; prismcube projects actual THREE geometry without GPU.'","'Production Canvas2D draw factories via Skia, from normal commands and actual state.'"),
 ("'forms.html?left=twisty-puzzle&right=radial-shooter','forms.html?left=auto-battler&right=radio-tuning'","'forms.html?left=falling-blocks&right=solitaire','forms.html?left=word-deduction&right=nonogram'"),
 ("cua.getState failed during initialization: windows sandbox helper_unknown_error; setup refresh had errors; kernel exited code 1","cua.getState failed twice during initialization: trusted Node process exited unexpectedly; kernel reset, rerun your request"),
 ("responsive_fullscreen_native_input_storage_WebGL_audio_verified","responsive_fullscreen_native_input_storage_verified"),
 ("==95","==98"),("==104","==107")]
for a,b in changes:
 if a in s:s=s.replace(a,b)
 else:assert a=="'kinetics','thresholds'] else",a
(P/'tooling/finalize-parlor-package.py').write_text(s,encoding='utf-8')
assert "'thresholds','circuitry']" in s
assert "'check-'+name+'-'+kind" in s
print('Prepared catalog, preservation, previous circuitry regressions and package checks')
