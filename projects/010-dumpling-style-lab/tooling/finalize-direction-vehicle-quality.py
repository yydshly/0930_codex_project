"""Record actual image sizes and bounded acceptance from completed evidence."""
import json
from pathlib import Path
from PIL import Image

project = Path(__file__).resolve().parents[1]
notes = project / 'notes'
browser_path = notes / 'direction-vehicle-browser-20261005.json'
browser = json.loads(browser_path.read_text('utf-8'))
assert browser['passed'] and len(browser['checks']) == 16 and len(browser['screenshots']) == 5
for capture in browser['screenshots']:
    with Image.open(capture['file']) as image:
        capture['capture_size'] = list(image.size)
        capture['format'] = image.format
browser_path.write_text(json.dumps(browser, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
assets = []
for name in ['landscape.png', 'terrain-atlas.png']:
    with Image.open(project / 'web/assets/directions/vehicle' / name) as image:
        assets.append({'file': f'web/assets/directions/vehicle/{name}', 'size': list(image.size), 'mode': image.mode, 'generated': True})
rules = json.loads((notes / 'direction-vehicle-rules-20261005.json').read_text('utf-8'))
controller = json.loads((notes / 'direction-vehicle-controller-20261005.json').read_text('utf-8'))
regression = json.loads((notes / 'direction-vehicle-regressions-20261005.json').read_text('utf-8'))
assert rules['passed'] and len(rules['checks']) == 49
assert controller['passed'] and len(controller['checks']) == 35
assert regression['passed'] and regression['total_checks'] == 356
quality = {
    'date': '2026-10-05', 'passed': True, 'status': 'accepted_in_recorded_local_sample_scope',
    'scope': 'Tenth original local direction of the initial ten-reference batch. Real Three.js/WebGL vehicle and scene, four independent terrain contacts and spring/damper heave/pitch/roll, bounded x/z driving, fixed 320 kg handoffs and real bridge return. Original local simplified engineering sample; no upstream Rigs code or soft-body solver is ported.',
    'visual_evidence': browser['screenshots'], 'original_bitmap_assets': assets,
    'art_provenance': 'assets/directions/vehicle-generation-20261005.json',
    'model_sources': ['https://kenney.nl/assets/car-kit', 'https://kenney.nl/assets/nature-kit'],
    'source_notice': 'web/assets/directions/vehicle/SOURCE-NOTICE.json',
    'primary_reference': 'https://www.rigsofrods.org/',
    'implemented': ['Authored CC0 truck, wheel, crate, cone, axle, pine and rock GLBs; unchanged source files', 'Two original generated PNGs sampled into ground and distant valley surfaces', 'Dense exact playable heightfield plus matching coarse surroundings', 'Physical four-wheel position, contact, compression, steering and rotation', 'Load changes actual mass from 1250 to 1570 kg and real sprung response', 'Different comfort and firm spring/damper settings', 'Actual stopped garage/depot/site actions and east bridge route requirement', 'Chase, orbit and overview cameras over one world', 'Manual and ordinary-rule demonstration with midway takeover', 'Dedicated paused save restoration', 'Native whole-stage fullscreen and internal synchronized route/actions', '390 px responsive layout with compact suspension panel and internally scrolling controls'],
    'repairs_verified': ['Body dimensions aligned to engine track and visible physical tires', 'Loading-stage model/cargo alignment and window/vehicle markings', 'Workshop entrances face the approach road', 'Overview surrounds hide exposed blue ground void', 'Terrain colors and UV scale joined across coarse/dense meshes', 'Reusable route GPU attributes and no stale route frustum bound', 'Completed test applies zero-speed parking hold', 'Narrow suspension overlay moved above the truck'],
    'verification': {'new_rules': 49, 'new_controller_callbacks': 35, 'actual_prior_scripts': 18, 'actual_prior_checks': 356, 'total_direction_checks': 440, 'browser_checks': 16, 'final_browser_captures': 5, 'site_tests': 21, 'built_demos': 19},
    'reports': {'rules': 'notes/direction-vehicle-rules-20261005.json', 'controller': 'notes/direction-vehicle-controller-20261005.json', 'prior_rerun': 'notes/direction-vehicle-regressions-20261005.json', 'browser': 'notes/direction-vehicle-browser-20261005.json', 'package': 'notes/direction-vehicle-package-20261005.json'},
    'preservation_requirement': {'protected_prior_web_files': 2618, 'readme_historical_suffix_bytes': 80349, 'original_forms': 107, 'original_entrances': 116},
    'acceptance_limits': ['The 16 browser assertions are only the recorded interactions and viewports; broad compatibility is not asserted', '390×844 is a desktop viewport override, not a physical phone', 'Multi-owner touch, error/retry and held-key timing are covered by production controller callbacks, not physical multi-touch hardware', 'No long-duration frame-rate or GPU-memory benchmark', 'Not a professional rigid-body engineering simulator, soft-body deformation or vehicle damage', 'No multiplayer, persistent server world or original-game port', 'No claim that all possible game types have been exhausted', 'Human emotional value, continued play and commercial product maturity remain unverified']
}
(notes / 'direction-vehicle-quality-20261005.json').write_text(json.dumps(quality, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'passed': True, 'browser_checks': 16, 'captures': [{'file': Path(c['file']).name, 'capture': c['capture_size'], 'viewport': c['viewport']} for c in browser['screenshots']], 'original_images': assets}, ensure_ascii=False))
