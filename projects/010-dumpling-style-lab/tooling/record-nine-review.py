import hashlib,json
from pathlib import Path
P=Path(__file__).resolve().parents[1]
package=json.loads((P/'notes/nine-package-check-20261004.json').read_text(encoding='utf-8'))
assert package['passed'] and not package['acceptance_complete']
records=[]
for row in json.loads((P/'assets/game-forms/nine-qa/render-review.json').read_text(encoding='utf-8'))['results']:
 f=P/f"assets/game-forms/nine-qa/{row['id']}-{row['frame']}.png"
 records.append({'id':row['id'],'frame':row['frame'],'path':str(f.relative_to(P)).replace('\\','/'),'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'review':'All initial/progress/complete contact sheets inspected; fold initial, watch complete and relay operator also inspected individually. Actual production factory draw(), Skia; no browser CSS.'})
review={
 'date':'2026-10-04','new_forms':9,'total_forms':60,'total_entrances':69,
 'implemented':['grappling','perspective-illusion','object-restoration','terrain-digging','rolling-collection','ink-territory','squad-following','service-workflow','asymmetric-coop'],
 'original_art':{'new_backgrounds':9,'new_transparent_atlases':2,'manifest':'assets/game-forms/nine-generation-20261004.json','reused_material':'web/assets/game-forms/roll/limestone.webp; protected original unchanged'},
 'verified':{'rules_and_lifecycle':74,'all_nine_normal_command_playthroughs_complete':True,'mid_and_complete_state_json_round_trips':True,'native_button_full_workflows':['repair','kitchen','relay'],'production_draw_initial_progress_complete':27,'pause_state_and_pixels':True,'old_web_files_unchanged':package['preservation']['files'],'site_tests':package['counts']['site'],'old_checks':{k:v for k,v in package['counts'].items() if k not in ['new','site','build']},'static_demos_built':package['counts']['build'],'packaged_hash_targets':package['packaged']['targets'],'local_http_all_200':all(v['status']==200 for v in package['local_http'])},
 'visual_refinements':['Continuous stone bridge surfaces, material grain and depth sorting replace repeated exposed pillar faces.','Diggable stone uses connected material and exposed tunnel edges instead of a visible rock tile grid.','Ink coverage uses continuous irregular pigment outlines and spray particles instead of checkerboard cells.','Completion banner keeps the repaired watch, collector sphere, bridge and other results visible.','Generated watch layers expose a moving second hand on test.','Kitchen native work button follows actual preparation/cooking/delivery state.','Selected anchors/parts/stations are highlighted; unavailable commands disabled.','Squad workers and cargo cross the repaired bridge through its actual location.'],
 'preservation':package['preservation'],
 'not_verified':['Browser CSS/layout','390px viewport and actual touchscreen','Desktop and narrow-screen fullscreen','Actual browser keyboard focus, pointer cancellation and tab switching','Browser localStorage refresh restore','Full interactive comparison embed behavior'],
 'browser_blocker':package['browser_qa'],
 'quality_gate':{'automated_and_offscreen_passed':True,'browser_acceptance_complete':False,'product_quality_certified':False,'next_required':'Resume browser QA when CUA can initialize; play all nine, test refresh/resume, narrow screen/fullscreen, native input cancellation/focus and old-entry switching. Fix any findings before marking acceptance complete.'},
 'scope_document':'notes/nine-forms-20261004.md','renders':records,
 'production_sources':{name:hashlib.sha256((P/'web'/name).read_bytes()).hexdigest() for name in ['showcase-nine.js','showcase-nine-rules.js']}
}
(P/'notes/nine-quality-review-20261004.json').write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'new_forms':9,'automated_passed':True,'browser_acceptance_complete':False,'old_files_preserved':review['verified']['old_web_files_unchanged'],'production_frames_reviewed':len(records)},ensure_ascii=False))
