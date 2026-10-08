from pathlib import Path
P=Path(__file__).resolve().parents[1]
s=(P/'tooling/check-kinetics-catalogs.mjs').read_text(encoding='utf-8').replace('kinetics','thresholds').replace("['ribbon','rescue','rewind','nested']","['inverter','phasewalk','transit','cantor']")
(P/'tooling/check-thresholds-catalogs.mjs').write_text(s,encoding='utf-8')
s=(P/'tooling/finalize-kinetics-package.py').read_text(encoding='utf-8').replace('kinetics','thresholds').replace("['ribbon','rescue','rewind','nested']","['inverter','phasewalk','transit','cantor']")
s=s.replace("'horizons','voyages']","'horizons','voyages','kinetics']")
s=s.replace("'frontier','studio','horizons','voyages']","'frontier','studio','horizons','voyages','kinetics']")
s=s.replace('left=draw-guidance&right=autonomous-rescue','left=gravity-inversion&right=dual-world').replace('left=world-rewind&right=recursive-scale','left=portal-momentum&right=voice-pitch')
s=s.replace("==87", "==91").replace("==96", "==100")
s=s.replace("Actual THREE meshes/cameras/UVs through explicit depth-buffered software projection, production HUD.' if id=='nested' else '","")
s=s.replace("responsive_fullscreen_native_input_storage_webgl_verified", "responsive_fullscreen_native_input_storage_microphone_verified")
s=s.replace('cua.getState failed during initialization: trusted Node process exited unexpectedly; kernel reset, rerun your request','cua.getState failed during initialization: windows sandbox helper_unknown_error; setup refresh had errors; kernel exited code 1')
(P/'tooling/finalize-thresholds-package.py').write_text(s,encoding='utf-8')
print('Prepared catalog and package checkers')
