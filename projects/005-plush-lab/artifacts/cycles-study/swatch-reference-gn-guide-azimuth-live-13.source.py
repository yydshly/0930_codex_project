"""GN13: rigid full-return-coil guide azimuths on frozen GN11 geometry.

Only native guide positions change. PCG64 default_rng(seed12013) independent
uniform angles rotate whole guides about each fixed ellipsoid root normal.
No crown or arc re-normalization. Native rigid invariants, curved-surface
crown proxies, and final derived child arcs are reported separately.
CPU preparation creates immutable source/report/blend; GPU render is separate.
"""
import argparse
import hashlib
import json
import runpy
import sys
import time
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts'/'cycles-study'
BASE='swatch-reference-gn-clump-profile-live7-11'
COAT='Blue pile · coat'
GUIDE='Pile guides · editable live input'
MODIFIER='Live official hair GN · pile study'
SEED=12013
AXES=np.array([.64,.43,.54],np.float64)
PINNED={BASE+'.blend':'487e857487a6489bfb09371575d29ee6f793af460976ba1af593569f1382c26d',
        BASE+'.source.py':'145239a928aeb057a7470ddeb81ff04612a2e7b71028e0738854ba471141247a',
        BASE+'.gn-report.json':'f03501392edf8f299006fff499d589dfb60b47124db9f716dc01cdab52f0e744'}

def sha(path):
    with path.open('rb') as f: return hashlib.file_digest(f,'sha256').hexdigest()

def dump(path,value):
    with path.open('x',encoding='utf-8') as f: json.dump(value,f,ensure_ascii=False,indent=2)

def rotate_guides(original):
    roots=original[:,0].astype(np.float64)
    normal=roots/AXES**2; normal/=np.linalg.norm(normal,axis=1,keepdims=True)
    angles=np.random.default_rng(SEED).uniform(0.,np.pi*2.,size=len(original))
    vector=original.astype(np.float64)-roots[:,None,:]
    cosine=np.cos(angles)[:,None,None]; sine=np.sin(angles)[:,None,None]
    dot=np.sum(normal[:,None,:]*vector,axis=2,keepdims=True)
    rotated=roots[:,None,:]+vector*cosine+np.cross(normal[:,None,:],vector)*sine+normal[:,None,:]*dot*(1.-cosine)
    result=rotated.astype(np.float32); result[:,0]=original[:,0]
    return result,normal,angles,rotated

def set_guides(bpy,gn11,positions):
    guide=bpy.data.objects[GUIDE]; guide.data.position_data.foreach_set('vector',positions.ravel())
    guide.data.update_tag(); guide.update_tag(); gn11['update'](bpy)

def main():
    import bpy
    parser=argparse.ArgumentParser(description=__doc__); parser.add_argument('--tag',required=True)
    parser.add_argument('--no-render',action='store_true'); parser.add_argument('--render-saved',action='store_true')
    opt=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    if not opt.tag or any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_' for c in opt.tag): parser.error('File-safe tag required')
    stem='swatch-reference-'+opt.tag
    if opt.render_saved:
        for suffix in ('.png','.render.json','.render.log'):
            if (OUT/(stem+suffix)).exists(): raise FileExistsError(stem+suffix)
        report=json.loads((OUT/(stem+'.gn-report.json')).read_text(encoding='utf-8'))
        if sha(Path(__file__))!=report['wrapper_source_sha256'] or sha(OUT/(stem+'.blend'))!=report['saved_blend_sha256']: raise RuntimeError('Frozen source/blend changed')
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+'.blend')))
        prefs=bpy.context.preferences.addons['cycles'].preferences; prefs.compute_device_type='OPTIX'; prefs.get_devices()
        for device in prefs.devices: device.use=device.type=='OPTIX'
        bpy.context.scene.render.filepath=str(OUT/(stem+'.png'))
        started=time.perf_counter(); bpy.ops.render.render(write_still=True)
        receipt={'rendered':True,'kind':'swatch','blend':stem+'.blend','png':stem+'.png','seconds':time.perf_counter()-started,
                 'resolution':bpy.context.scene.render.resolution_x,'samples':bpy.context.scene.cycles.samples,'blend_sha256':sha(OUT/(stem+'.blend')),
                 'png_sha256':sha(OUT/(stem+'.png')),'wrapper_source_sha256':sha(Path(__file__))}
        dump(OUT/(stem+'.render.json'),receipt)
        with (OUT/(stem+'.render.log')).open('x',encoding='utf-8') as f: f.write(json.dumps(receipt)+'\n')
        print('PLUSH_GUIDE_AZIMUTH_RENDER',json.dumps(receipt),flush=True); return
    if not opt.no_render: parser.error('Preparation requires --no-render')
    for suffix in ('.blend','.png','.source.py','.json','.gn-report.json','.precheck.log'):
        if (OUT/(stem+suffix)).exists(): raise FileExistsError(stem+suffix)
    if {n:sha(OUT/n) for n in PINNED}!=PINNED: raise RuntimeError('GN11 base hashes changed')
    inherited=json.loads((OUT/(BASE+'.gn-report.json')).read_text(encoding='utf-8')); dependencies={**inherited['dependencies'],**PINNED}
    if {n:sha(OUT/n) for n in dependencies}!=dependencies: raise RuntimeError('Inherited inputs changed')
    source=Path(__file__).read_bytes(); source_sha=hashlib.sha256(source).hexdigest()
    with (OUT/(stem+'.source.py')).open('xb') as f: f.write(source)
    gn11=runpy.run_path(str(OUT/(BASE+'.source.py')),run_name='_gn13_gn11_helpers')
    h=runpy.run_path(str(OUT/gn11['GEOMETRY']),run_name='_gn13_geometry'); rec=runpy.run_path(str(OUT/gn11['RECORD']),run_name='_gn13_record')
    gn10=runpy.run_path(str(OUT/(gn11['BASE']+'.source.py')),run_name='_gn13_shape')
    with (OUT/(stem+'.precheck.log')).open('x',encoding='utf-8') as log:
        def event(value):
            message='PLUSH_GUIDE_AZIMUTH '+json.dumps(value,ensure_ascii=False); print(message,flush=True); log.write(message+'\n'); log.flush()
        started=time.perf_counter(); event({'stage':'frozen_inputs_verified','source_sha256':source_sha,'seed':SEED})
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(BASE+'.blend')))
        coat=bpy.data.objects[COAT]; tree=coat.modifiers[MODIFIER].node_group; tree_name=tree.name
        p0,r0=h['evaluated_coat'](bpy,coat); gp0,gr0=h['curve_arrays'](bpy.data.objects[GUIDE].data)
        if gp0.shape!=(2657,12,3) or p0.shape!=(85000,12,3): raise RuntimeError('Unexpected frozen guide/coat topology')
        before=gn11['scene_snapshot'](bpy,h,rec); profile0=gn11['mapping_record'](tree)
        gp,normal,angles,rotated64=rotate_guides(gp0); set_guides(bpy,gn11,gp)
        actual_gp,actual_gr=h['curve_arrays'](bpy.data.objects[GUIDE].data); p,r=h['evaluated_coat'](bpy,coat)
        if actual_gp.tobytes()!=gp.tobytes() or actual_gp[:,0].tobytes()!=gp0[:,0].tobytes() or actual_gr.tobytes()!=gr0.tobytes(): raise RuntimeError('Native rotation/root/radius scope mismatch')
        if p.shape!=p0.shape or p[:,0].tobytes()!=p0[:,0].tobytes() or r[:,0].tobytes()!=r0[:,0].tobytes() or not np.isfinite(p).all() or not np.isfinite(r).all(): raise RuntimeError('Final topology/root/root-radius/finite mismatch')
        changed=int(np.count_nonzero(np.any(p!=p0,axis=(1,2))))
        if changed==0: raise RuntimeError('Native guide azimuth did not reach actual coat')
        after=gn11['scene_snapshot'](bpy,h,rec)
        if gn10['fixed_state'](before,'Socket_6',False)!=gn10['fixed_state'](after,'Socket_6',False) or gn11['mapping_record'](tree)!=profile0: raise RuntimeError('Unauthorized native rest/radii/map/IDs/scene/node changes')
        set_guides(bpy,gn11,gp0); baseline_p,baseline_r=h['evaluated_coat'](bpy,coat)
        if baseline_p.tobytes()!=p0.tobytes() or baseline_r.tobytes()!=r0.tobytes() or gn11['scene_snapshot'](bpy,h,rec)!=before: raise RuntimeError('Native baseline restore not exact')
        set_guides(bpy,gn11,gp); final_p,final_r=h['evaluated_coat'](bpy,coat)
        if final_p.tobytes()!=p.tobytes() or final_r.tobytes()!=r.tobytes() or gn11['scene_snapshot'](bpy,h,rec)!=after: raise RuntimeError('Rotation reapply not exact')
        native0=gn10['guide_shape'](gp0,h); native=gn10['guide_shape'](gp,h); child0=gn10['guide_shape'](p0,h); child=gn10['guide_shape'](p,h)
        arc0=h['catmull_rom_lengths'](gp0); arc=h['catmull_rom_lengths'](gp)
        child_arc0=h['catmull_rom_lengths'](p0); child_arc=h['catmull_rom_lengths'](p)
        root64=gp0[:,0].astype(np.float64)
        projection0=np.sum((gp0.astype(np.float64)-root64[:,None])*normal[:,None],axis=2)
        projection=np.sum((gp.astype(np.float64)-root64[:,None])*normal[:,None],axis=2)
        projection64=np.sum((rotated64-root64[:,None])*normal[:,None],axis=2)
        segment0=np.linalg.norm(np.diff(gp0.astype(np.float64),axis=1),axis=2); segment=np.linalg.norm(np.diff(gp.astype(np.float64),axis=1),axis=2)
        rigid={'normal_projection_f64_absolute_error_max':float(np.max(np.abs(projection64-projection0))),
               'normal_projection_saved_f32_absolute_error_max':float(np.max(np.abs(projection-projection0))),
               'control_segment_length_absolute_error_max':float(np.max(np.abs(segment-segment0))),
               'native_catmull_arc_relative_error_max':float(np.max(np.abs(arc/arc0-1.))),
               'native_catmull_arc_paired_ratio':h['summarize'](arc/arc0),
               'definition':'Whole-guide rigid rotations preserve Euclidean geometry and root-normal projections in f64; saved f32 rounding is measured. Curved-surface crown and actual downstream child arcs are not rigid invariants.'}
        if rigid['normal_projection_saved_f32_absolute_error_max']>2e-7 or rigid['control_segment_length_absolute_error_max']>3e-7 or rigid['native_catmull_arc_relative_error_max']>2e-5: raise RuntimeError('Saved f32 rigid invariants outside rounding tolerance')
        comparison={'native_guide_crown_paired_delta':h['summarize'](h['sampled_height'](gp)[0]-h['sampled_height'](gp0)[0]),
                    'actual_child_crown_paired_delta':h['summarize'](h['sampled_height'](p)[0]-h['sampled_height'](p0)[0]),
                    'actual_child_arc_paired_ratio':h['summarize'](child_arc/child_arc0)}
        event({'stage':'scope_and_geometry_passed','changed_final_coat_curves':changed,'rigid':rigid,
               'native_crown_medians':[native0['crown']['median'],native['crown']['median']],
               'actual_child_crown_medians':[child0['crown']['median'],child['crown']['median']],
               'actual_child_arc_medians':[child0['arc_order32']['median'],child['arc_order32']['median']]})
        bpy.context.scene.render.filepath=str(OUT/(stem+'.png')); bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')),compress=True)
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+'.blend')))
        if gn11['scene_snapshot'](bpy,h,rec)!=after or gn11['mapping_record'](bpy.data.node_groups[tree_name])!=profile0: raise RuntimeError('Save/reload mismatch')
        if {n:sha(OUT/n) for n in dependencies}!=dependencies: raise RuntimeError('Prior assets changed')
        report={'status':'engineering_precheck_passed','rendered':False,'kind':'swatch','candidate_preset':'gn13-guide-azimuth','control_asset':BASE,
                'blend':stem+'.blend','png':stem+'.png','resolution':768,'samples':96,'source_blend_sha256':PINNED[BASE+'.blend'],'saved_blend_sha256':sha(OUT/(stem+'.blend')),
                'wrapper_source_snapshot':stem+'.source.py','wrapper_source_sha256':source_sha,'dependencies':dependencies,
                'study_scope':'Only whole native guide positions rigidly rotate. 2657 guides/85000 coat/12 controls, native roots/radii/rest/IDs/nearest map, GN11 profile, official groups and camera/light/material/UC/FA fixed. No crown or arc re-normalization; derived child positions/radii may change. No contact solver or visual acceptance claimed.',
                'rotation':{'seed':SEED,'generator':'numpy.random.default_rng(12013), PCG64, uniform(0,2*pi,size=2657), native guide order',
                            'root_normal':'unit(float64(original_root) / [0.64,0.43,0.54]^2)',
                            'formula':'root + v*cos(theta) + cross(n,v)*sin(theta) + n*dot(n,v)*(1-cos(theta)); float64 computation, float32 cast, restore root bits',
                            'angle_float64_sha256':h['array_digest'](angles),'angles':h['summarize'](angles),'rigid_invariants':rigid,'normalization':'none'},
                'guides':{'object':GUIDE,'curve_count':len(gp),'points_per_curve':gp.shape[1],'positions_float32_sha256':h['array_digest'](gp),'radii_float32_sha256':h['array_digest'](gr0),'control_shape':native0,'actual_shape':native},
                'coat':{'object':COAT,'curve_count':len(p),'points_per_curve':p.shape[1],'changed_curve_count':changed,'positions_float32_sha256':h['array_digest'](p),'radii_float32_sha256':h['array_digest'](r),'control_shape':child0,'actual_shape':child,'comparison':comparison},
                'profile_fixed':profile0,'checks':{'only_authorized_guide_position_change':True,'all_native_roots_radii_rest_ids_maps_fixed':True,'all_original_nodes_profile_scene_fixed':True,'final_roots_and_root_radii_bitwise':True,'baseline_restore_and_rotation_reapply_bitwise':True,'save_reload_exact':True,'preparation_seconds':time.perf_counter()-started},
                'frozen_scene_state':after,'render_receipt':stem+'.render.json'}
        dump(OUT/(stem+'.gn-report.json'),report); dump(OUT/(stem+'.json'),{'rendered':False,'kind':'swatch','preset':report['candidate_preset'],'method_report':stem+'.gn-report.json','blend':stem+'.blend','png':stem+'.png','resolution':768,'samples':96,'source_sha256':source_sha})
        event({'stage':'asset_ready','stem':stem,'source_sha256':source_sha,'blend_sha256':report['saved_blend_sha256'],'rendered':False})

if __name__=='__main__': main()
