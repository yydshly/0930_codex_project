"""GN11: one external along-length Clump profile on frozen GN10 geometry.

POINT Capture evaluates Spline Parameter Factor on actual post-Curl joined
Curves, before official Clump. Linear VECTOR Float Curve controls modulate
the linked .88 modifier factor. Official Shape/TipSpread/length restoration
remain active and unmodified; external factor is not final deformation weight.
SideFX Hair Clump length-profile rationale is a method reference, not a claim
to implement its Accurate Bundling, width/contact, or Houdini solver.
CPU --no-render --tag NAME; separate GPU --render-saved --tag NAME.
"""
import argparse
import copy
import hashlib
import json
import runpy
import sys
import time
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'artifacts' / 'cycles-study'
BASE = 'swatch-reference-gn-compact-coil-clumped-live3-10'
ZERO = 'swatch-reference-gn-compact-coil-unclumped-live3-10'
RECORD = 'swatch-reference-gn-undercoat-short-live-4.source.py'
GEOMETRY = 'swatch-reference-gn-nearest-render-3.gn-source.py'
COAT = 'Blue pile · coat'
GUIDE = 'Pile guides · editable live input'
MODIFIER = 'Live official hair GN · pile study'
KNOTS = [(0.,0.),(.18,.15),(.40,.25),(.65,.25),(.85,.75),(1.,1.)]
NAMES = {'parameter':'GN11 post-Curl length parameter',
         'capture':'GN11 capture post-Curl arc coordinate',
         'curve':'GN11 linear Clump weight profile',
         'clamp':'GN11 clamp profile 0 to 1',
         'multiply':'GN11 actual Clump strength times profile'}
DEPENDENCIES = {
    BASE+'.blend':'b01f575e01a1fe6e94f07eceadfe6442dc20b1ef5105b22a18cb565a2bdcb878',
    BASE+'.source.py':'b72713f128b68ad2b344216f22c34e3046a61e8f1933ed1909fb49d4cd74f5c8',
    BASE+'.gn-report.json':'83f801b88ce5f6f94dca6fd87dee6bd4528a4a587374b9390b4f53c98d071eee',
    ZERO+'.blend':'a6251dcdbaab1bb225bb2334138f95a9094da9aadc567ffe55ca3b99f1ec7b49',
    RECORD:'5b1d9049cec289828a6e354ce334d37873fa8343c4f5a0aa848315732125609c',
    GEOMETRY:'be7730c0ddba22109ebc31dd44e8660672df7fd2cb8d361093688ce9fcc2c927'}

def file_sha(path):
    with path.open('rb') as f: return hashlib.file_digest(f,'sha256').hexdigest()

def write_json(path,value):
    with path.open('x',encoding='utf-8') as f: json.dump(value,f,ensure_ascii=False,indent=2)

def update(bpy):
    bpy.data.objects[COAT].modifiers[MODIFIER].node_group.update_tag()
    bpy.data.objects[COAT].update_tag(refresh={'DATA'})
    bpy.context.view_layer.update()

def scene_snapshot(bpy,h,rec):
    value=rec['scene_record'](bpy,h)
    for tree in value['trees'].values(): tree['links'].sort()
    for tree in value['materials'].values():
        if isinstance(tree,dict) and 'links' in tree: tree['links'].sort()
    if 'world_tree' in value['scene']: value['scene']['world_tree']['links'].sort()
    return value

def mapping_record(tree):
    node=tree.nodes[NAMES['curve']]; capture=tree.nodes[NAMES['capture']]
    return {'nodes':NAMES,'capture_domain':capture.domain,
            'capture_items':[[i.name,i.data_type] for i in capture.capture_items],
            'curve_points':[[float(p.location.x),float(p.location.y),p.handle_type] for p in node.mapping.curves[0].points],
            'use_clip':node.mapping.use_clip,'extend':node.mapping.extend}

def add_profile(tree):
    nodes=tree.nodes; links=tree.links; clump=nodes['Clump Hair Curves']
    geometry_link=clump.inputs['Geometry'].links[0]
    factor_link=clump.inputs['Factor'].links[0]
    source_geometry=geometry_link.from_socket; source_factor=factor_link.from_socket
    removed=[[l.from_node.name,l.from_socket.identifier,l.to_node.name,l.to_socket.identifier] for l in (geometry_link,factor_link)]
    links.remove(geometry_link); links.remove(factor_link)
    parameter=nodes.new('GeometryNodeSplineParameter'); parameter.name=NAMES['parameter']
    capture=nodes.new('GeometryNodeCaptureAttribute'); capture.name=NAMES['capture']; capture.domain='POINT'
    capture.capture_items.clear(); capture.capture_items.new('FLOAT','s')
    curve=nodes.new('ShaderNodeFloatCurve'); curve.name=NAMES['curve']; curve.mapping.initialize()
    points=curve.mapping.curves[0].points
    points[0].location=KNOTS[0]; points[-1].location=KNOTS[-1]
    for x,y in KNOTS[1:-1]: points.new(x,y)
    for p in points: p.handle_type='VECTOR'
    curve.mapping.use_clip=False; curve.mapping.update(); curve.inputs['Factor'].default_value=1.
    clamp=nodes.new('ShaderNodeClamp'); clamp.name=NAMES['clamp']
    clamp.inputs['Min'].default_value=0.; clamp.inputs['Max'].default_value=1.
    multiply=nodes.new('ShaderNodeMath'); multiply.name=NAMES['multiply']; multiply.operation='MULTIPLY'
    added=[]
    for origin,target in [(source_geometry,capture.inputs['Geometry']),
                          (parameter.outputs['Factor'],capture.inputs['s']),
                          (capture.outputs['Geometry'],clump.inputs['Geometry']),
                          (capture.outputs['s'],curve.inputs['Value']),
                          (curve.outputs['Value'],clamp.inputs['Value']),
                          (source_factor,multiply.inputs[0]),
                          (clamp.outputs['Result'],multiply.inputs[1]),
                          (multiply.outputs['Value'],clump.inputs['Factor'])]:
        l=links.new(origin,target)
        added.append([l.from_node.name,l.from_socket.identifier,l.to_node.name,l.to_socket.identifier])
    return removed,added

def fixed_record(record,tree_name,removed,added):
    result=copy.deepcopy(record)
    result['objects'][COAT].pop('evaluated_positions'); result['objects'][COAT].pop('evaluated_radii')
    tree=result['trees'][tree_name]
    if any(n['name'] in NAMES.values() for n in tree['nodes']):
        tree['nodes']=[n for n in tree['nodes'] if n['name'] not in NAMES.values()]
        tree['links']=[l for l in tree['links'] if l not in added]+removed
    for t in result['trees'].values(): t['links'].sort()
    return result

def field_probe(bpy,tree,h,expected_p,expected_r):
    output=tree.nodes['Group Output'].inputs['Geometry']; final=output.links[0].from_socket
    source=tree.nodes[NAMES['capture']].outputs['Geometry']; temporary=[]
    names=['gn11_probe_s','gn11_probe_w','gn11_probe_factor']
    sockets=[tree.nodes[NAMES['capture']].outputs['s'],tree.nodes[NAMES['clamp']].outputs['Result'],tree.nodes[NAMES['multiply']].outputs['Value']]
    try:
        for name,socket in zip(names,sockets):
            node=tree.nodes.new('GeometryNodeStoreNamedAttribute'); temporary.append(node)
            node.domain='POINT'; node.data_type='FLOAT'; node.inputs['Name'].default_value=name
            tree.links.new(source,node.inputs['Geometry']); tree.links.new(socket,node.inputs['Value']); source=node.outputs['Geometry']
        tree.links.new(source,output); update(bpy)
        data=bpy.data.objects[COAT].evaluated_get(bpy.context.evaluated_depsgraph_get()).data
        p,_=h['curve_arrays'](data); arrays=[]
        for name in names:
            a=np.empty(len(data.points),np.float32); attr=data.attributes[name]
            if attr.domain!='POINT': raise RuntimeError('Probe field domain mismatch')
            attr.data.foreach_get('value',a); arrays.append(a.reshape(len(p),p.shape[1]))
        s,w,factor=arrays
        expected=np.interp(s.ravel(),[x for x,y in KNOTS],[y for x,y in KNOTS]).reshape(s.shape)
        error=float(np.max(np.abs(w-expected)))
        print('PLUSH_PROFILE_FIELD_DIAGNOSTIC',json.dumps({'s_min':float(s.min()),'s_max':float(s.max()),'root_min':float(s[:,0].min()),'root_max':float(s[:,0].max()),'tip_min':float(s[:,-1].min()),'tip_max':float(s[:,-1].max()),'w_root_min':float(w[:,0].min()),'w_root_max':float(w[:,0].max()),'w_tip_min':float(w[:,-1].min()),'w_tip_max':float(w[:,-1].max()),'negative_step_count':int(np.count_nonzero(np.diff(s,axis=1)<0)),'first_s':s[0].tolist(),'first_w':w[0].tolist(),'weight_error':error}),flush=True)
        tip_s_error=float(np.max(np.abs(s[:,-1]-1.)))
        tip_w_error=float(np.max(np.abs(w[:,-1]-1.)))
        if not np.isfinite(s).all() or not np.all(s[:,0]==0) or tip_s_error>1e-7 or np.any(np.diff(s,axis=1)<0):
            raise RuntimeError('Actual POINT arc coordinate bounds/endpoints/order failed')
        if not np.all(w[:,0]==0) or tip_w_error>1e-6 or error>.003:
            raise RuntimeError('Actual linear Curve Mapping response failed')
        if factor.tobytes()!=(w*np.float32(.88)).tobytes(): raise RuntimeError('Actual linked multiplier response failed')
        result={'geometry_stage':'actual official Curl output, joined coat then guides, immediately before official Clump',
                'domain':'POINT','joined_curves':len(p),'points_per_curve':p.shape[1],
                'root_s_w_factor':[float(s[0,0]),float(w[0,0]),float(factor[0,0])],
                'tip_s_w_factor':[float(s[0,-1]),float(w[0,-1]),float(factor[0,-1])],
                'max_tip_s_error':tip_s_error,'max_tip_w_error':tip_w_error,'tip_s_tolerance':1e-7,'tip_w_tolerance':1e-6,
                'monotone_s':True,'max_abs_weight_error_vs_linear_control_interpolation':error,
                'weight_error_scope':'Float Curve actual engine CurveMapping table on native control points; VECTOR handles; tolerance .003. This is the external Factor field only.',
                's':h['summarize'](s),'w':h['summarize'](w),'external_factor':h['summarize'](factor)}
    finally:
        for node in temporary: tree.nodes.remove(node)
        tree.links.new(final,output); update(bpy)
    restored_p,restored_r=h['evaluated_coat'](bpy,bpy.data.objects[COAT])
    if restored_p.tobytes()!=expected_p.tobytes() or restored_r.tobytes()!=expected_r.tobytes(): raise RuntimeError('Field probe restoration failed')
    result['restore_bitwise']=True
    return result

def bundle_spread(points,guides,mapping,h):
    result={}; groups=[np.flatnonzero(mapping==gid) for gid in range(len(guides))]
    eligible=[gid for gid,indices in enumerate(groups) if len(indices)>=8]
    for j in (5,6,10,11):
        minor=[]; major=[]
        for gid in eligible:
            tangent=guides[gid,min(j+1,11)].astype(np.float64)-guides[gid,j-1].astype(np.float64)
            tangent/=np.linalg.norm(tangent)
            cloud=points[groups[gid],j].astype(np.float64); cloud-=cloud.mean(axis=0)
            cloud-=np.sum(cloud*tangent,axis=1,keepdims=True)*tangent
            eig=np.linalg.eigvalsh(cloud.T@cloud/len(cloud)); axes=np.sqrt(np.maximum(eig,0))
            minor.append(axes[-2]); major.append(axes[-1])
        result[str(j)]={'groups':len(eligible),'minor_std':h['summarize'](np.array(minor)),
                        'major_std':h['summarize'](np.array(major))}
    return {'definition':'Same persistent nearest-root child-to-guide map; >=8 children/group. At native control indices 5,6,10,11, center each actual child group and project onto plane perpendicular to fixed native guide control tangent (central secant, endpoint backward secant). Two covariance sqrt eigenvalues. Geometry spread proxy, not physical radius/contact or matched arc fraction/rendered softness.',
            'slices':result}

def main():
    import bpy
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tag',required=True); parser.add_argument('--no-render',action='store_true'); parser.add_argument('--render-saved',action='store_true')
    opt=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    if not opt.tag or any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_' for c in opt.tag): parser.error('File-safe tag required')
    stem='swatch-reference-'+opt.tag
    if opt.render_saved:
        for suffix in ('.png','.render.json','.render.log'):
            if (OUT/(stem+suffix)).exists(): raise FileExistsError(stem+suffix)
        report=json.loads((OUT/(stem+'.gn-report.json')).read_text(encoding='utf-8'))
        if file_sha(Path(__file__))!=report['wrapper_source_sha256'] or file_sha(OUT/(stem+'.blend'))!=report['saved_blend_sha256']: raise RuntimeError('Frozen source/blend changed')
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+'.blend')))
        prefs=bpy.context.preferences.addons['cycles'].preferences; prefs.compute_device_type='OPTIX'; prefs.get_devices()
        for device in prefs.devices: device.use=device.type=='OPTIX'
        bpy.context.scene.render.filepath=str(OUT/(stem+'.png'))
        started=time.perf_counter(); bpy.ops.render.render(write_still=True)
        receipt={'rendered':True,'kind':'swatch','blend':stem+'.blend','png':stem+'.png','seconds':time.perf_counter()-started,
                 'resolution':bpy.context.scene.render.resolution_x,'samples':bpy.context.scene.cycles.samples,
                 'blend_sha256':file_sha(OUT/(stem+'.blend')),'png_sha256':file_sha(OUT/(stem+'.png')),'wrapper_source_sha256':file_sha(Path(__file__))}
        write_json(OUT/(stem+'.render.json'),receipt)
        with (OUT/(stem+'.render.log')).open('x',encoding='utf-8') as f: f.write(json.dumps(receipt)+'\n')
        print('PLUSH_CLUMP_PROFILE_RENDER',json.dumps(receipt),flush=True); return
    if not opt.no_render: parser.error('Prepare requires --no-render')
    for suffix in ('.blend','.png','.source.py','.json','.gn-report.json','.precheck.log'):
        if (OUT/(stem+suffix)).exists(): raise FileExistsError(stem+suffix)
    hashes={n:file_sha(OUT/n) for n in DEPENDENCIES}
    if hashes!=DEPENDENCIES: raise RuntimeError('Frozen input hashes changed')
    source=Path(__file__).read_bytes(); source_sha=hashlib.sha256(source).hexdigest()
    with (OUT/(stem+'.source.py')).open('xb') as f: f.write(source)
    rec=runpy.run_path(str(OUT/RECORD),run_name='_gn11_record')
    h=runpy.run_path(str(OUT/GEOMETRY),run_name='_gn11_geometry')
    gn10=runpy.run_path(str(OUT/(BASE+'.source.py')),run_name='_gn11_fixed_coil_helpers')
    with (OUT/(stem+'.precheck.log')).open('x',encoding='utf-8') as log:
        def event(value):
            message='PLUSH_CLUMP_PROFILE '+json.dumps(value,ensure_ascii=False); print(message,flush=True); log.write(message+'\n'); log.flush()
        started=time.perf_counter()
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(ZERO+'.blend'))); pzero,rzero=h['evaluated_coat'](bpy,bpy.data.objects[COAT])
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(BASE+'.blend')))
        coat=bpy.data.objects[COAT]; guide=bpy.data.objects[GUIDE]; tree=coat.modifiers[MODIFIER].node_group; tree_name=tree.name
        before=scene_snapshot(bpy,h,rec); p0,r0=h['evaluated_coat'](bpy,coat); gp,gr=h['curve_arrays'](guide.data)
        mapping=np.empty(len(p0),np.int32); coat.data.attributes['pile_guide_index'].data.foreach_get('value',mapping); mapping-=len(p0)
        removed,added=add_profile(tree); update(bpy); p,r=h['evaluated_coat'](bpy,coat)
        if p.shape!=p0.shape or p[:,0].tobytes()!=p0[:,0].tobytes() or r[:,0].tobytes()!=r0[:,0].tobytes() or not np.isfinite(p).all() or not np.isfinite(r).all(): raise RuntimeError('Coat topology/root/root-radius/finite mismatch')
        changed=int(np.count_nonzero(np.any(p!=p0,axis=(1,2))))
        if changed==0: raise RuntimeError('Profile had no actual evaluated effect')
        after=scene_snapshot(bpy,h,rec); map_after=mapping_record(tree)
        if fixed_record(before,tree_name,removed,added)!=fixed_record(after,tree_name,removed,added): raise RuntimeError('Unauthorized native/scene/original node change')
        fields=field_probe(bpy,tree,h,p,r)
        curve=tree.nodes[NAMES['curve']]
        for point in curve.mapping.curves[0].points: point.location.y=1.
        curve.mapping.update(); update(bpy); flat_p,flat_r=h['evaluated_coat'](bpy,coat)
        flat_probe={'maximum_position_difference_vs_gn10':float(np.max(np.abs(flat_p-p0))),
                    'maximum_radius_difference_vs_gn10':float(np.max(np.abs(flat_r-r0))),
                    'positions_bitwise_equal':flat_p.tobytes()==p0.tobytes(),'radii_bitwise_equal':flat_r.tobytes()==r0.tobytes()}
        print('PLUSH_PROFILE_CONSTANT_DIAGNOSTIC',json.dumps(flat_probe),flush=True)
        clump=tree.nodes['Clump Hair Curves']; profile_socket=clump.inputs['Factor'].links[0].from_socket
        actual_factor=tree.nodes['Group Input'].outputs['Clump Factor']
        tree.links.new(actual_factor,clump.inputs['Factor']); update(bpy)
        bypass_p,bypass_r=h['evaluated_coat'](bpy,coat)
        if bypass_p.tobytes()!=p0.tobytes() or bypass_r.tobytes()!=r0.tobytes(): raise RuntimeError('Original factor bypass did not reproduce GN10 bitwise')
        tree.links.new(profile_socket,clump.inputs['Factor'])
        for point,(x,y) in zip(curve.mapping.curves[0].points,KNOTS): point.location.y=y
        curve.mapping.update(); update(bpy)
        restored_p,restored_r=h['evaluated_coat'](bpy,coat)
        if restored_p.tobytes()!=p.tobytes() or restored_r.tobytes()!=r.tobytes(): raise RuntimeError('Profile restore mismatch')
        live=gn10['probe'](bpy,h,gp,mapping,p)
        if scene_snapshot(bpy,h,rec)!=after or mapping_record(tree)!=map_after: raise RuntimeError('Full probe scene restoration mismatch')
        event({'stage':'actual_graph_and_fields_passed','changed_coat_curves':changed,'field_probe':fields,'original_factor_bypass_reproduces_gn10_bitwise':True,'constant_one_profile_probe':flat_probe,'live_guide_probe':live})
        guide_shape=gn10['guide_shape'](gp,h)
        shapes={label:gn10['guide_shape'](points,h) for label,points in [('gn10_clumped',p0),('gn11_profile',p),('gn10_unclumped',pzero)]}
        spreads={label:bundle_spread(points,gp,mapping,h) for label,points in [('gn10_clumped',p0),('gn11_profile',p),('gn10_unclumped',pzero)]}
        event({'stage':'geometry_measured','native_guide_crown_median':guide_shape['crown']['median'],'actual_coat_crown_medians':{k:v['crown']['median'] for k,v in shapes.items()},'bundle_spread':spreads})
        bpy.context.scene.render.filepath=str(OUT/(stem+'.png')); bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')),compress=True)
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+'.blend')))
        if scene_snapshot(bpy,h,rec)!=after or mapping_record(bpy.data.node_groups[tree_name])!=map_after: raise RuntimeError('Save/reload state mismatch')
        if {n:file_sha(OUT/n) for n in DEPENDENCIES}!=hashes: raise RuntimeError('Frozen source assets changed')
        inherited=json.loads((OUT/(BASE+'.gn-report.json')).read_text(encoding='utf-8'))
        report={'status':'engineering_precheck_passed','rendered':False,'kind':'swatch','candidate_preset':'gn11-clump-profile','control_asset':BASE,'zero_comparison_asset':ZERO,
                'blend':stem+'.blend','png':stem+'.png','resolution':768,'samples':96,'source_blend_sha256':DEPENDENCIES[BASE+'.blend'],'saved_blend_sha256':file_sha(OUT/(stem+'.blend')),
                'wrapper_source_snapshot':stem+'.source.py','wrapper_source_sha256':source_sha,'dependencies':hashes,
                'official_asset_library':inherited.get('official_asset_library'),'official_asset_sha256':inherited.get('official_asset_sha256'),
                'changes_vs_control':['five outer profile nodes','Curl to Clump geometry routed through POINT Capture','linked Clump Factor routed through profile multiplier'],
                'study_scope':'One along-length external factor profile; all native guides, native coat, radii/rest/maps/UC/FA, official groups, material/camera/lighting/render settings unchanged. No width-aware packing/contact solver, child curl phase authoring, physical thickness or visual acceptance claimed.',
                'profile':{**map_after,'tree':tree_name,'knots':KNOTS,'factor_modifier_identifier':'Socket_6','factor_modifier_value':.88,'external_factor_formula':'.88 * clamp(actual VECTOR Float Curve(s),0,1)',
                           's_geometry_stage':fields['geometry_stage'],'shape':.20,'tip_spread':.003,'internal_behavior':'Official Clump independently applies Shape length mask to factor and guide target; Preserve Length true plus unchanged downstream profile. External factor is not final point displacement/blend weight.',
                           'removed_links':removed,'added_links':added,'field_probe':fields,'original_factor_bypass_reproduces_gn10_bitwise':True,'constant_one_profile_probe':flat_probe,'live_guide_probe':live},
                'guides':{'object':GUIDE,'curve_count':len(gp),'points_per_curve':gp.shape[1],'positions_float32_sha256':h['array_digest'](gp),'radii_float32_sha256':h['array_digest'](gr),'shape':guide_shape},
                'coat':{'object':COAT,'curve_count':len(p),'points_per_curve':p.shape[1],'positions_float32_sha256':h['array_digest'](p),'radii_float32_sha256':h['array_digest'](r),'changed_curve_count':changed,'comparison_shapes':shapes,'bundle_spread':spreads},
                'checks':{'only_authorized_changes':True,'all_native_buffers_and_scene_unchanged':True,'coat_roots_and_root_radii_bitwise':True,'probe_restoration_exact':True,'saved_reload_state_exact':True,'preparation_seconds':time.perf_counter()-started},
                'frozen_scene_state':after,'render_receipt':stem+'.render.json'}
        write_json(OUT/(stem+'.gn-report.json'),report)
        write_json(OUT/(stem+'.json'),{'rendered':False,'kind':'swatch','preset':'gn11-clump-profile','method_report':stem+'.gn-report.json','blend':stem+'.blend','png':stem+'.png','resolution':768,'samples':96,'source_sha256':source_sha})
        event({'stage':'asset_ready','stem':stem,'source_sha256':source_sha,'blend_sha256':report['saved_blend_sha256'],'rendered':False})

if __name__=='__main__': main()
