"""GN14: actual smaller root bundles, paired whole-guide lateral scale.

Frozen GN11 coat/layers/scene/profile. Keep 2657 original guide roots, append
7971 deterministic farthest coat roots, and write actual nearest curve maps.
Wide case transports frozen guide/rest shapes; half case changes only native
guide tangent components. No XYZ/crown/arc normalization or contact solver.
CPU immutable preparation and actual GPU rendering are separate operations.
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

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts'/'cycles-study'
BASE='swatch-reference-gn-clump-profile-live7-11'
COAT='Blue pile · coat'
GUIDE='Pile guides · editable live input'
MODIFIER='Live official hair GN · pile study'
AXES=np.array([.64,.43,.54],np.float64)
TARGET=10628
PINNED={BASE+'.blend':'487e857487a6489bfb09371575d29ee6f793af460976ba1af593569f1382c26d',
        BASE+'.source.py':'145239a928aeb057a7470ddeb81ff04612a2e7b71028e0738854ba471141247a',
        BASE+'.gn-report.json':'f03501392edf8f299006fff499d589dfb60b47124db9f716dc01cdab52f0e744'}

def sha(path):
    with path.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()

def dump(path,value):
    with path.open('x',encoding='utf-8') as f:json.dump(value,f,ensure_ascii=False,indent=2)

def normal(roots):
    n=roots.astype(np.float64)/AXES**2
    return n/np.linalg.norm(n,axis=-1,keepdims=True)

def values(data,name):
    a=data.attributes[name]
    dtype={'FLOAT_VECTOR':np.float32,'FLOAT':np.float32,'INT':np.int32,'BOOLEAN':bool}[a.data_type]
    size=3 if a.data_type=='FLOAT_VECTOR' else 1
    result=np.empty(len(a.data)*size,dtype=dtype)
    a.data.foreach_get('vector' if size==3 else 'value',result)
    return result.reshape(-1,3) if size==3 else result

def put(data,name,array):
    a=data.attributes[name]
    a.data.foreach_set('vector' if a.data_type=='FLOAT_VECTOR' else 'value',np.asarray(array).ravel())

def farthest_roots(roots,old_roots,old_ids,event):
    r=roots.astype(np.float64);old=old_roots.astype(np.float64)
    minimum=np.sum((r-old[old_ids])**2,axis=1)
    selected=np.empty(TARGET-len(old),dtype=np.int32)
    for j in range(len(selected)):
        i=int(np.argmax(minimum));selected[j]=i
        delta=r-r[i];np.minimum(minimum,np.einsum('ij,ij->i',delta,delta),out=minimum)
        if (j+1)%2000==0:event({'stage':'farthest_roots','appended':j+1,'remaining':len(selected)-j-1})
    return np.concatenate([old_roots,roots[selected]]).astype(np.float32),selected

def transport(points,old_roots,new_roots,parent_ids):
    """Shortest normal alignment; nearest parents exclude antipodal normals."""
    a=normal(old_roots)[parent_ids];b=normal(new_roots)
    c=np.sum(a*b,axis=1)
    if np.any(c<-.99):raise RuntimeError('Antipodal parent normal; no ambiguous rotation allowed')
    k=np.cross(a,b)[:,None,:]
    v=points[parent_ids].astype(np.float64)-old_roots[parent_ids,None,:].astype(np.float64)
    rotated=v+np.cross(k,v)+np.cross(k,np.cross(k,v))/(1.+c[:,None,None])
    out=(new_roots[:,None,:].astype(np.float64)+rotated).astype(np.float32)
    out[:,0]=new_roots
    return out,c

def half_guides(points):
    root=points[:,0].astype(np.float64);n=normal(points[:,0])
    v=points.astype(np.float64)-root[:,None,:]
    axial=n[:,None,:]*np.sum(v*n[:,None,:],axis=2,keepdims=True)
    out=(root[:,None,:]+axial+.5*(v-axial)).astype(np.float32)
    out[:,0]=points[:,0]
    return out

def bundle_measure(roots,guide_roots,ids,h):
    order=np.argsort(ids,kind='stable');counts=np.bincount(ids,minlength=len(guide_roots));ends=np.cumsum(counts)
    n=normal(guide_roots);span=np.zeros(len(counts));radius=np.zeros(len(counts));start=0
    for i,end in enumerate(ends):
        q=roots[order[start:end]].astype(np.float64)-guide_roots[i].astype(np.float64);start=end
        if len(q)==0:continue
        q-=n[i]*np.sum(q*n[i],axis=1,keepdims=True)
        radius[i]=np.linalg.norm(q,axis=1).max()
        span[i]=np.linalg.norm(q[:,None,:]-q[None,:,:],axis=2).max()
    distance=np.linalg.norm(roots.astype(np.float64)-guide_roots[ids].astype(np.float64),axis=1)
    return {'child_count_summary':h['summarize'](counts),'empty_groups':int(np.count_nonzero(counts==0)),
            'root_to_guide_distance':h['summarize'](distance),'root_tangent_pair_diameter_nonempty':h['summarize'](span[counts>0]),
            'max_root_tangent_radius_nonempty':h['summarize'](radius[counts>0]),
            'scope':'Actual native saved f32 roots promoted f64; analytic ellipsoid tangent at each actual guide root; exact maximum pair distance over actual mapped member roots. Scene units, not geodesic, physical volume or softness.'}

def lateral_measure(points,h):
    v=points.astype(np.float64)-points[:,0,None,:].astype(np.float64);n=normal(points[:,0])
    projection=np.sum(v*n[:,None,:],axis=2)
    lateral=v-n[:,None,:]*projection[...,None]
    return {'max_tangent_excursion_controls':h['summarize'](np.linalg.norm(lateral,axis=2).max(axis=1)),
            'max_normal_projection_controls':h['summarize'](projection.max(axis=1)),
            'scope':'12 native controls only; centerline local components, not contact or sampled spline envelope.'}

def wide_fixed(state):
    s=copy.deepcopy(state)
    for key in ('positions','radii','roots','topology','attributes','evaluated_positions','evaluated_radii'):
        s['objects'][GUIDE].pop(key,None)
    for key in ('evaluated_positions','evaluated_radii'):s['objects'][COAT].pop(key,None)
    for name in ('pile_guide_index','guide_curve_index'):s['objects'][COAT]['attributes'].pop(name,None)
    return s

def main():
    import bpy
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--tag',required=True);parser.add_argument('--case',choices=['wide','half'],required=True)
    parser.add_argument('--wide-tag');parser.add_argument('--no-render',action='store_true');parser.add_argument('--render-saved',action='store_true')
    opt=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    for tag in (opt.tag,opt.wide_tag):
        if tag is not None and (not tag or any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_' for c in tag)):parser.error('File-safe tag required')
    stem='swatch-reference-'+opt.tag
    if opt.render_saved:
        for suffix in ('.png','.render.json','.render.log'):
            if (OUT/(stem+suffix)).exists():raise FileExistsError(stem+suffix)
        report=json.loads((OUT/(stem+'.gn-report.json')).read_text(encoding='utf-8'))
        if sha(Path(__file__))!=report['wrapper_source_sha256'] or sha(OUT/(stem+'.blend'))!=report['saved_blend_sha256']:raise RuntimeError('Frozen source/blend changed')
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+'.blend')))
        prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
        for device in prefs.devices:device.use=device.type=='OPTIX'
        bpy.context.scene.render.filepath=str(OUT/(stem+'.png'));started=time.perf_counter();bpy.ops.render.render(write_still=True)
        receipt={'rendered':True,'kind':'swatch','case':opt.case,'blend':stem+'.blend','png':stem+'.png','seconds':time.perf_counter()-started,
                 'resolution':bpy.context.scene.render.resolution_x,'samples':bpy.context.scene.cycles.samples,'blend_sha256':sha(OUT/(stem+'.blend')),
                 'png_sha256':sha(OUT/(stem+'.png')),'wrapper_source_sha256':sha(Path(__file__))}
        dump(OUT/(stem+'.render.json'),receipt)
        with (OUT/(stem+'.render.log')).open('x',encoding='utf-8') as f:f.write(json.dumps(receipt)+'\n')
        print('PLUSH_BUNDLE_SCALE_RENDER',json.dumps(receipt),flush=True);return
    if not opt.no_render:parser.error('CPU preparation requires --no-render')
    if opt.case=='half' and not opt.wide_tag:parser.error('Half case requires frozen --wide-tag')
    for suffix in ('.blend','.png','.source.py','.json','.gn-report.json','.precheck.log'):
        if (OUT/(stem+suffix)).exists():raise FileExistsError(stem+suffix)
    inherited=json.loads((OUT/(BASE+'.gn-report.json')).read_text(encoding='utf-8'));dependencies={**inherited['dependencies'],**PINNED}
    control=BASE;wide_report=None
    if opt.case=='half':
        control='swatch-reference-'+opt.wide_tag;wide_report=json.loads((OUT/(control+'.gn-report.json')).read_text(encoding='utf-8'))
        if wide_report['case']!='wide' or wide_report['wrapper_source_sha256']!=sha(Path(__file__)):raise RuntimeError('Half must use exact frozen wide source')
        dependencies.update({control+suffix:sha(OUT/(control+suffix)) for suffix in ('.blend','.source.py','.gn-report.json')})
    if {name:sha(OUT/name) for name in dependencies}!=dependencies:raise RuntimeError('Frozen input changed')
    source=Path(__file__).read_bytes();source_sha=hashlib.sha256(source).hexdigest()
    with (OUT/(stem+'.source.py')).open('xb') as f:f.write(source)
    gn11=runpy.run_path(str(OUT/(BASE+'.source.py')),run_name='_gn14_gn11');h=runpy.run_path(str(OUT/gn11['GEOMETRY']),run_name='_gn14_geometry')
    rec=runpy.run_path(str(OUT/gn11['RECORD']),run_name='_gn14_record');gn10=runpy.run_path(str(OUT/(gn11['BASE']+'.source.py')),run_name='_gn14_shape')
    with (OUT/(stem+'.precheck.log')).open('x',encoding='utf-8') as log:
        def event(value):
            message='PLUSH_BUNDLE_SCALE '+json.dumps(value,ensure_ascii=False);print(message,flush=True);log.write(message+'\n');log.flush()
        started=time.perf_counter();event({'stage':'frozen_inputs_verified','case':opt.case,'source_sha256':source_sha})
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(control+'.blend')))
        coat=bpy.data.objects[COAT];guide=bpy.data.objects[GUIDE];data=guide.data;tree=coat.modifiers[MODIFIER].node_group;tree_name=tree.name
        cp,cr=h['curve_arrays'](coat.data);gp0,gr0=h['curve_arrays'](data);p0,r0=h['evaluated_coat'](bpy,coat)
        before=gn11['scene_snapshot'](bpy,h,rec);profile0=gn11['mapping_record'](tree)
        if cp.shape!=(85000,12,3):raise RuntimeError('Coat native count changed')
        guide_rest0=values(data,'rest_position').reshape(-1,12,3);root_radius0=values(data,'root_radius');old_map=values(coat.data,'pile_guide_index')-len(cp)
        if opt.case=='wide':
            if gp0.shape!=(2657,12,3):raise RuntimeError('Frozen guide topology changed')
            old_bundle=bundle_measure(cp[:,0],gp0[:,0],old_map,h)
            roots,selected=farthest_roots(cp[:,0],gp0[:,0],old_map,event)
            parent=h['nearest_guide_ids'](roots,gp0[:,0]);gp,cosine=transport(gp0,gp0[:,0],roots,parent)
            rest,_=transport(guide_rest0,gp0[:,0],roots,parent)
            gp[:len(gp0)]=gp0;rest[:len(gp0)]=guide_rest0
            radii=gr0[parent].copy();radii[:len(gp0)]=gr0
            root_radius=root_radius0[parent].copy();root_radius[:len(gp0)]=root_radius0
            ids=h['nearest_guide_ids'](cp[:,0],roots)
            data.add_curves([12]*(TARGET-len(gp0)));data.set_types(type='CATMULL_ROM')
            put(data,'rest_position',rest);put(data,'radius',radii);put(data,'root_radius',root_radius)
            put(data,'is_guide',np.ones(TARGET,dtype=bool))
            for name in ('pile_guide_index','guide_curve_index'):
                put(data,name,len(cp)+np.arange(TARGET,dtype=np.int32));put(coat.data,name,len(cp)+ids)
            guide['curve_count']=TARGET
            construction={'old_guide_count':2657,'new_guide_count':TARGET,'appended_coat_root_indices':selected.tolist(),
                          'appended_coat_root_indices_int32_sha256':h['array_digest'](selected),'parent_guide_ids_int32_sha256':h['array_digest'](parent),
                          'farthest_algorithm':'Start saved f64 squared root distances to actual existing nearest guide;7971 argmax(min_distance_squared) selects lowest coat index on ties, append saved f32 coat roots and update all minimum squared distances;original2657 roots/order preserved.',
                          'transport':'Parent nearest frozen guide with exact helper tie rule; a=oldnormal,b=newnormal,k=cross(a,b),c=dot(a,b);vrot=v+cross(k,v)+cross(k,cross(k,v))/(1+c). f64 then f32/rootbits restore. Reject c<-.99; first2657 guide/rest/radii kept bitwise.',
                          'minimum_parent_normal_cosine':float(cosine.min()),'new_rest':'Same normal transport of frozen parent root-relative rest; never candidate-specific rest. Native coat rest untouched.',
                          'new_radii':'Copy parent 12 native radii and parent CURVE root_radius;old2657 values bitwise preserved.',
                          'original_bundle':old_bundle}
        else:
            if gp0.shape!=(TARGET,12,3):raise RuntimeError('Wide guide topology mismatch')
            gp=half_guides(gp0);radii=gr0;rest=guide_rest0;root_radius=root_radius0;ids=old_map;roots=gp0[:,0];construction=copy.deepcopy(wide_report['construction'])
        data.position_data.foreach_set('vector',gp.ravel());data.update_tag();guide.update_tag();coat.data.update_tag();gn11['update'](bpy)
        actual_gp,actual_gr=h['curve_arrays'](data);p,r=h['evaluated_coat'](bpy,coat)
        if actual_gp.tobytes()!=gp.tobytes() or actual_gr.tobytes()!=radii.tobytes() or values(data,'rest_position').tobytes()!=rest.reshape(-1,3).tobytes() or values(data,'root_radius').tobytes()!=root_radius.tobytes():raise RuntimeError('Actual native guide construction mismatch')
        if h['curve_arrays'](coat.data)[0].tobytes()!=cp.tobytes() or h['curve_arrays'](coat.data)[1].tobytes()!=cr.tobytes():raise RuntimeError('Native coat positions/radii changed')
        if gp[:,0].tobytes()!=roots.tobytes() or p.shape!=p0.shape or p[:,0].tobytes()!=p0[:,0].tobytes() or r[:,0].tobytes()!=r0[:,0].tobytes() or not np.isfinite(p).all() or not np.isfinite(r).all():raise RuntimeError('Final root/root_radius/finite contract failed')
        joined=h['verify_join'](bpy,coat,guide,cp)
        after=gn11['scene_snapshot'](bpy,h,rec)
        fixed=(wide_fixed(before)==wide_fixed(after)) if opt.case=='wide' else (gn10['fixed_state'](before,'Socket_6',False)==gn10['fixed_state'](after,'Socket_6',False))
        if not fixed or gn11['mapping_record'](tree)!=profile0:raise RuntimeError('Unauthorized non-guide/graph/profile/scene change')
        bundle=bundle_measure(cp[:,0],gp[:,0],ids,h);native=gn10['guide_shape'](gp,h);child=gn10['guide_shape'](p,h)
        child_before=gn10['guide_shape'](p0,h);lateral=lateral_measure(gp,h)
        changed=int(np.count_nonzero(np.any(p!=p0,axis=(1,2))))
        event({'stage':'scope_and_geometry_passed','case':opt.case,'guides':len(gp),'changed_final_coat_curves':changed,'bundle':bundle,
               'guide_lateral':lateral,'actual_child_crown_median':child['crown']['median'],'actual_child_arc_median':child['arc_order32']['median']})
        bpy.context.scene.render.filepath=str(OUT/(stem+'.png'));bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')),compress=True)
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+'.blend')))
        if gn11['scene_snapshot'](bpy,h,rec)!=after or gn11['mapping_record'](bpy.data.node_groups[tree_name])!=profile0:raise RuntimeError('Save/reload mismatch')
        if {name:sha(OUT/name) for name in dependencies}!=dependencies:raise RuntimeError('Prior assets changed')
        report={'status':'engineering_precheck_passed','rendered':False,'kind':'swatch','candidate_preset':'gn14-bundle-scale','case':opt.case,'control_asset':control,'gn11_base':BASE,
                'blend':stem+'.blend','png':stem+'.png','resolution':768,'samples':96,'source_blend_sha256':sha(OUT/(control+'.blend')),'saved_blend_sha256':sha(OUT/(stem+'.blend')),
                'wrapper_source_snapshot':stem+'.source.py','wrapper_source_sha256':source_sha,'dependencies':dependencies,'construction':construction,
                'study_scope':'A adds spatial guides and actually remaps children;B uses identical A roots/rest/radii/maps/graph and scales only guide root-local tangent components .5. Coat/layers native geometry/rest and scene/profile fixed;no XYZ/crown/arc normalization/contact solver/visual acceptance.',
                'guide_assignment':{'persistent_attribute':'pile_guide_index','also_initialized_attribute':'guide_curve_index','data_type':'INT','domain':'CURVE','guide_index_offset':85000,'guide_count':TARGET,
                                    'metric':'3D Euclidean root nearest, saved f32 roots promoted f64;helper checks exact candidate squared distances and lowest guide ID tie','mapping_int32_sha256':h['array_digest']((85000+ids).astype(np.int32)),**bundle},
                'lateral_scale':1. if opt.case=='wide' else .5,'guides':{'object':GUIDE,'curve_count':len(gp),'points_per_curve':12,'positions_float32_sha256':h['array_digest'](gp),'radii_float32_sha256':h['array_digest'](radii),'rest_float32_sha256':h['array_digest'](rest),'actual_shape':native,'lateral':lateral},
                'coat':{'object':COAT,'curve_count':len(p),'points_per_curve':12,'changed_curve_count':changed,'positions_float32_sha256':h['array_digest'](p),'radii_float32_sha256':h['array_digest'](r),'control_shape':child_before,'actual_shape':child},
                'profile_fixed':profile0,'joined_index_contract':joined,'checks':{'authorized_native_scope':True,'coat_native_positions_radii_rest_fixed':True,'all_original_nodes_profile_scene_fixed':True,'final_roots_and_root_radii_bitwise':True,'save_reload_exact':True,'preparation_seconds':time.perf_counter()-started},
                'frozen_scene_state':after,'render_receipt':stem+'.render.json'}
        dump(OUT/(stem+'.gn-report.json'),report);dump(OUT/(stem+'.json'),{'rendered':False,'kind':'swatch','preset':report['candidate_preset'],'case':opt.case,'method_report':stem+'.gn-report.json','blend':stem+'.blend','png':stem+'.png','resolution':768,'samples':96,'source_sha256':source_sha})
        event({'stage':'asset_ready','stem':stem,'source_sha256':source_sha,'blend_sha256':report['saved_blend_sha256'],'rendered':False})

if __name__=='__main__':main()
