from pathlib import Path
P=Path(__file__).resolve().parents[1]
s=(P/'tooling/check-thresholds-catalogs.mjs').read_text(encoding='utf-8').replace('thresholds','circuitry').replace("ids=['inverter','phasewalk','transit','cantor']","ids=['prismcube','orbiter','automata','receiver']")
(P/'tooling/check-circuitry-catalogs.mjs').write_text(s,encoding='utf-8')
s=(P/'tooling/finalize-thresholds-package.py').read_text(encoding='utf-8').replace('thresholds','circuitry')
s=s.replace("IDS=['inverter','phasewalk','transit','cantor']","IDS=['prismcube','orbiter','automata','receiver']")
s=s.replace("'voyages','kinetics']","'voyages','kinetics','thresholds']")
s=s.replace("forms.html?left=gravity-inversion&right=dual-world","forms.html?left=twisty-puzzle&right=radial-shooter").replace("forms.html?left=portal-momentum&right=voice-pitch","forms.html?left=auto-battler&right=radio-tuning")
s=s.replace("==91","==95").replace("==100","==104").replace('responsive_fullscreen_native_input_storage_microphone_verified','responsive_fullscreen_native_input_storage_WebGL_audio_verified')
s=s.replace('Production Canvas2D drawing through Skia.','Production draw factories via Skia; prismcube projects actual THREE geometry without GPU.')
(P/'tooling/finalize-circuitry-package.py').write_text(s,encoding='utf-8')
print('Prepared catalog and preservation/build checks')
