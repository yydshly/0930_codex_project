"""GN12: official Curl per-curve phase offsets on immutable GN11 guides.

Two scopes only: all joined curves receive Random Offset 1; child-only
curves receive 1-is_guide. Official guide-shared phase, own-ID random value,
seed, frequency/radius/factors, GN11 profile and scene remain unchanged.
CPU prepare precedes saved-asset GPU render. No width/contact solver claim.
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
OFFSET_NODE='GN12 child-only curl phase offset'
SOCKET='Input_16'
PINNED={BASE+'.blend':'487e857487a6489bfb09371575d29ee6f793af460976ba1af593569f1382c26d',
        BASE+'.source.py':'145239a928aeb057a7470ddeb81ff04612a2e7b71028e0738854ba471141247a',
        BASE+'.gn-report.json':'f03501392edf8f299006fff499d589dfb60b47124db9f716dc01cdab52f0e744'}

def sha(path):
    with path.open('rb') as f: return hashlib.file_digest(f,'sha256').hexdigest()

def dump(path,value):
    with path.open('x',encoding='utf-8') as f: json.dump(value,f,ensure_ascii=False,indent=2)

def configure(tree,scope):
    socket=next(s for s in tree.nodes['Curl Hair Curves'].inputs if s.identifier==SOCKET)
    if socket.is_linked or socket.default_value!=0.: raise RuntimeError('Expected real unlinked Random Offset zero')
    if scope=='all': socket.default_value=1.; return None
    if tree.nodes['Read is_guide'].data_type!='BOOLEAN': raise RuntimeError('Guide mask is not BOOLEAN')
    node=tree.nodes.new('ShaderNodeMath'); node.name=OFFSET_NODE; node.operation='SUBTRACT'; node.inputs[0].default_value=1.
    tree.links.new(tree.nodes['Read is_guide'].outputs['Attribute'],node.inputs[1]); tree.links.new(node.outputs['Value'],socket)
    return node

def unconfigure(tree,node):
    if node is None:
        next(s for s in tree.nodes['Curl Hair Curves'].inputs if s.identifier==SOCKET).default_value=0.
    else: tree.nodes.remove(node)

def post_curl(bpy,tree,h,gn11,scope):
    output=tree.nodes['Group Output'].inputs['Geometry']; final=output.links[0].from_socket
    curl=tree.nodes['Curl Hair Curves']; offset=next(s for s in curl.inputs if s.identifier==SOCKET)
    store=tree.nodes.new('GeometryNodeStoreNamedAttribute'); store.domain='CURVE'; store.data_type='FLOAT'; store.inputs['Name'].default_value='gn12_effective_offset_probe'
    tree.links.new(curl.outputs['Hair Curves'],store.inputs['Geometry'])
    if offset.is_linked: tree.links.new(offset.links[0].from_socket,store.inputs['Value'])
    else: store.inputs['Value'].default_value=offset.default_value
    try:
        tree.links.new(store.outputs['Geometry'],output); gn11['update'](bpy)
        data=bpy.data.objects[COAT].evaluated_get(bpy.context.evaluated_depsgraph_get()).data
        p,r=h['curve_arrays'](data); count=len(p)
        mask=np.empty(count,np.bool_); data.attributes['is_guide'].data.foreach_get('value',mask)
        field=np.empty(count,np.float32); data.attributes['gn12_effective_offset_probe'].data.foreach_get('value',field)
        expected=np.ones(count,np.float32) if scope=='all' else (~mask).astype(np.float32) if scope=='children' else np.zeros(count,np.float32)
        if not np.array_equal(field,expected): raise RuntimeError('Actual CURVE offset scope mismatch')
        result={'stage':'official Curl output before GN11 POINT capture and Clump','domain':'CURVE','curve_count':count,
                'child_curve_count':int((~mask).sum()),'guide_curve_count':int(mask.sum()),
                'guide_offset_values':np.unique(field[mask]).tolist(),'child_offset_values':np.unique(field[~mask]).tolist(),
                'guide_positions_sha256':h['array_digest'](p[mask]),'guide_radii_sha256':h['array_digest'](r[mask])}
    finally:
        tree.nodes.remove(store); tree.links.new(final,output); gn11['update'](bpy)
    return p,r,mask,result

def main():
    import bpy
    parser=argparse.ArgumentParser(description=__doc__); parser.add_argument('--scope',choices=['all','children'],required=True)
    parser.add_argument('--tag',required=True); parser.add_argument('--no-render',action='store_true'); parser.add_argument('--render-saved',action='store_true')
    opt=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    if not opt.tag or any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_' for c in opt.tag): parser.error('File-safe tag required')
    stem='swatch-reference-'+opt.tag
    if opt.render_saved:
        for suffix in ('.png','.render.json','.render.log'):
            if (OUT/(stem+suffix)).exists(): raise FileExistsError(stem+suffix)
        report=json.loads((OUT/(stem+'.gn-report.json')).read_text(encoding='utf-8'))
        if sha(Path(__file__))!=report['wrapper_source_sha256'] or sha(OUT/(stem+'.blend'))!=report['saved_blend_sha256'] or opt.scope!=report['phase']['scope']: raise RuntimeError('Frozen source/blend/scope changed')
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+'.blend')))
        prefs=bpy.context.preferences.addons['cycles'].preferences; prefs.compute_device_type='OPTIX'; prefs.get_devices()
        for device in prefs.devices: device.use=device.type=='OPTIX'
        bpy.context.scene.render.filepath=str(OUT/(stem+'.png'))
        started=time.perf_counter(); bpy.ops.render.render(write_still=True)
        receipt={'rendered':True,'kind':'swatch','scope':opt.scope,'blend':stem+'.blend','png':stem+'.png','seconds':time.perf_counter()-started,
                 'resolution':bpy.context.scene.render.resolution_x,'samples':bpy.context.scene.cycles.samples,'blend_sha256':sha(OUT/(stem+'.blend')),
                 'png_sha256':sha(OUT/(stem+'.png')),'wrapper_source_sha256':sha(Path(__file__))}
        dump(OUT/(stem+'.render.json'),receipt)
        with (OUT/(stem+'.render.log')).open('x',encoding='utf-8') as f: f.write(json.dumps(receipt)+'\n')
        print('PLUSH_CURL_PHASE_RENDER',json.dumps(receipt),flush=True); return
    if not opt.no_render: parser.error('Preparation requires --no-render')
    for suffix in ('.blend','.png','.source.py','.json','.gn-report.json','.precheck.log'):
        if (OUT/(stem+suffix)).exists(): raise FileExistsError(stem+suffix)
    if {n:sha(OUT/n) for n in PINNED}!=PINNED: raise RuntimeError('GN11 base hashes changed')
    inherited=json.loads((OUT/(BASE+'.gn-report.json')).read_text(encoding='utf-8')); dependencies={**inherited['dependencies'],**PINNED}
    if {n:sha(OUT/n) for n in dependencies}!=dependencies: raise RuntimeError('Inherited inputs changed')
    source=Path(__file__).read_bytes(); source_sha=hashlib.sha256(source).hexdigest()
    with (OUT/(stem+'.source.py')).open('xb') as f: f.write(source)
    gn11=runpy.run_path(str(OUT/(BASE+'.source.py')),run_name='_gn12_gn11_helpers')
    h=runpy.run_path(str(OUT/gn11['GEOMETRY']),run_name='_gn12_geometry'); rec=runpy.run_path(str(OUT/gn11['RECORD']),run_name='_gn12_record')
    gn10=runpy.run_path(str(OUT/(gn11['BASE']+'.source.py')),run_name='_gn12_shape')
    with (OUT/(stem+'.precheck.log')).open('x',encoding='utf-8') as log:
        def event(value):
            message='PLUSH_CURL_PHASE '+json.dumps(value,ensure_ascii=False); print(message,flush=True); log.write(message+'\n'); log.flush()
        started=time.perf_counter(); event({'stage':'frozen_inputs_verified','scope':opt.scope,'source_sha256':source_sha})
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(BASE+'.blend')))
        coat=bpy.data.objects[COAT]; tree=coat.modifiers[MODIFIER].node_group; tree_name=tree.name
        p0,r0=h['evaluated_coat'](bpy,coat); gp,gr=h['curve_arrays'](bpy.data.objects[GUIDE].data)
        before=gn11['scene_snapshot'](bpy,h,rec); profile0=gn11['mapping_record'](tree)
        curl0_p,curl0_r,curl0_mask,curl0_info=post_curl(bpy,tree,h,gn11,'baseline')
        node=configure(tree,opt.scope); gn11['update'](bpy); p,r=h['evaluated_coat'](bpy,coat)
        curl_p,curl_r,mask,curl_info=post_curl(bpy,tree,h,gn11,opt.scope)
        if not np.array_equal(mask,curl0_mask) or p.shape!=p0.shape or p[:,0].tobytes()!=p0[:,0].tobytes() or r[:,0].tobytes()!=r0[:,0].tobytes() or not np.isfinite(p).all() or not np.isfinite(r).all(): raise RuntimeError('Topology/root/radius/finite mismatch')
        guides_equal=curl_p[mask].tobytes()==curl0_p[mask].tobytes(); guide_radii_equal=curl_r[mask].tobytes()==curl0_r[mask].tobytes()
        if opt.scope=='children' and not (guides_equal and guide_radii_equal): raise RuntimeError('Child-only scope altered actual post-Curl guides')
        changed=int(np.count_nonzero(np.any(p!=p0,axis=(1,2))))
        if changed==0: raise RuntimeError('Phase scope has no final actual effect')
        restored_p,restored_r=h['evaluated_coat'](bpy,coat)
        if restored_p.tobytes()!=p.tobytes() or restored_r.tobytes()!=r.tobytes(): raise RuntimeError('Output probe restoration mismatch')
        unconfigure(tree,node); gn11['update'](bpy)
        baseline_p,baseline_r=h['evaluated_coat'](bpy,coat)
        if baseline_p.tobytes()!=p0.tobytes() or baseline_r.tobytes()!=r0.tobytes() or gn11['scene_snapshot'](bpy,h,rec)!=before or gn11['mapping_record'](tree)!=profile0: raise RuntimeError('Original buffers/graph/scene/profile scope mismatch')
        configure(tree,opt.scope); gn11['update'](bpy)
        final_p,final_r=h['evaluated_coat'](bpy,coat)
        if final_p.tobytes()!=p.tobytes() or final_r.tobytes()!=r.tobytes(): raise RuntimeError('Phase reapplication is not deterministic')
        after=gn11['scene_snapshot'](bpy,h,rec)
        event({'stage':'actual_scope_passed','changed_final_coat_curves':changed,'post_curl':curl_info,'post_curl_guides_positions_bitwise_vs_gn11':guides_equal,'post_curl_guides_radii_bitwise_vs_gn11':guide_radii_equal})
        mapping=np.empty(len(p),np.int32); coat.data.attributes['pile_guide_index'].data.foreach_get('value',mapping); mapping-=len(p)
        shape=gn10['guide_shape'](p,h); spread=gn11['bundle_spread'](p,gp,mapping,h)
        event({'stage':'geometry_measured','actual_coat_crown_median':shape['crown']['median']})
        bpy.context.scene.render.filepath=str(OUT/(stem+'.png')); bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')),compress=True)
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+'.blend')))
        if gn11['scene_snapshot'](bpy,h,rec)!=after or gn11['mapping_record'](bpy.data.node_groups[tree_name])!=profile0: raise RuntimeError('Save/reload mismatch')
        if {n:sha(OUT/n) for n in dependencies}!=dependencies: raise RuntimeError('Prior assets changed')
        report={'status':'engineering_precheck_passed','rendered':False,'kind':'swatch','candidate_preset':'gn12-curl-phase-'+opt.scope,'control_asset':BASE,
                'blend':stem+'.blend','png':stem+'.png','resolution':768,'samples':96,'source_blend_sha256':PINNED[BASE+'.blend'],'saved_blend_sha256':sha(OUT/(stem+'.blend')),
                'wrapper_source_snapshot':stem+'.source.py','wrapper_source_sha256':source_sha,'dependencies':dependencies,
                'study_scope':'Official own-ID Curl phase offset scope only; all native guides/coat/radii/rest/maps, GN11 profile, official groups and camera/light/material/UC/FA fixed. Derived final radii may change due to unchanged downstream profile. No width/contact solver or visual acceptance claimed.',
                'phase':{'scope':opt.scope,'curl_node':'Curl Hair Curves','socket_identifier':SOCKET,'socket_name':'Random Offset','formula':'1' if opt.scope=='all' else '1 - is_guide',
                         'node':None if opt.scope=='all' else OFFSET_NODE,'named_attribute_node':'Read is_guide','named_attribute_type':'BOOLEAN',
                         'internal_behavior':'Official guide-ID shared random phase plus own-curve-ID random value times Random Offset; seed0 unchanged. Frequency internally multiplies 3 times accumulated segment length, then phase uses 2pi. Random Offset is not asserted to be radians.',
                         'actual_inputs':{'factor':.70,'radius':.006,'frequency':.85,'curl_start':.15,'factor_start':.70,'factor_end':.70,'seed':0},
                         'post_curl_baseline':curl0_info,'post_curl_actual':curl_info,'post_curl_guides_positions_bitwise_vs_gn11':guides_equal,'post_curl_guides_radii_bitwise_vs_gn11':guide_radii_equal,
                         'post_curl_changed_child_curves':int(np.count_nonzero(np.any(curl_p[~mask]!=curl0_p[~mask],axis=(1,2)))),
                         'post_curl_changed_guide_curves':int(np.count_nonzero(np.any(curl_p[mask]!=curl0_p[mask],axis=(1,2))))},
                'guides':{'object':GUIDE,'curve_count':len(gp),'positions_float32_sha256':h['array_digest'](gp),'radii_float32_sha256':h['array_digest'](gr)},
                'coat':{'object':COAT,'curve_count':len(p),'points_per_curve':p.shape[1],'changed_curve_count':changed,'positions_float32_sha256':h['array_digest'](p),'radii_float32_sha256':h['array_digest'](r),'shape':shape,'bundle_spread':spread},
                'profile_fixed':profile0,'checks':{'only_authorized_changes':True,'all_native_buffers_and_scene_unchanged':True,'roots_and_root_radii_bitwise':True,'baseline_bypass_and_probe_restore_bitwise':True,'save_reload_exact':True,'preparation_seconds':time.perf_counter()-started},
                'frozen_scene_state':after,'render_receipt':stem+'.render.json'}
        dump(OUT/(stem+'.gn-report.json'),report); dump(OUT/(stem+'.json'),{'rendered':False,'kind':'swatch','preset':report['candidate_preset'],'method_report':stem+'.gn-report.json','blend':stem+'.blend','png':stem+'.png','resolution':768,'samples':96,'source_sha256':source_sha})
        event({'stage':'asset_ready','stem':stem,'source_sha256':source_sha,'blend_sha256':report['saved_blend_sha256'],'rendered':False})

if __name__=='__main__': main()
