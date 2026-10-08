"""One GN14 full loft candidate, based on saved fine-bundle full character.

Actual native child length and guide normal height x1.65, guide tangent x1.25,
Clump peak .65, a front/lower broad fill. Face/hat compression and real star
frames remain. This is an explicit composite full recipe, not isolated A/B.
All old assets are immutable; the actual evaluated geometry is verified.
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
BASE='character-reference-fine-bundle-v14'
STEM='character-reference-soft-pile-v14'
COAT='Blue pile · coat'
GUIDE='Pile guides · editable live input'
MOD='Live official hair GN · pile study'

def sha(path):
    with path.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()

def dump(path,value):
    with path.open('x',encoding='utf-8') as f:json.dump(value,f,ensure_ascii=False,indent=2)

def read(data,name,vector=False):
    a=data.attributes[name];result=np.empty(len(a.data)*(3 if vector else 1),np.float32)
    a.data.foreach_get('vector' if vector else 'value',result)
    return result.reshape(-1,3) if vector else result

def main():
    import bpy
    from mathutils import Vector
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--prepare',action='store_true');p.add_argument('--render',choices=['preview','final'])
    o=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    if o.render:
        report=json.loads((OUT/(STEM+'.gn-report.json')).read_text(encoding='utf-8'))
        if sha(OUT/(STEM+'.blend'))!=report['saved_blend_sha256'] or sha(Path(__file__))!=report['wrapper_source_sha256']:raise RuntimeError('Frozen candidate changed')
        suffix='.preview' if o.render=='preview' else '';png=OUT/(STEM+suffix+'.png');receipt=OUT/(STEM+suffix+'.render.json')
        if png.exists() or receipt.exists():raise FileExistsError(png)
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(STEM+'.blend')));scene=bpy.context.scene
        scene.render.resolution_x=scene.render.resolution_y=768 if o.render=='preview' else 1536;scene.cycles.samples=96 if o.render=='preview' else 256
        prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
        for d in prefs.devices:d.use=d.type=='OPTIX'
        scene.cycles.device='GPU';scene.render.filepath=str(png);start=time.perf_counter();bpy.ops.render.render(write_still=True)
        value={'rendered':True,'kind':'character','stage':o.render,'blend':STEM+'.blend','png':png.name,'resolution':scene.render.resolution_x,'samples':scene.cycles.samples,
               'seconds':time.perf_counter()-start,'blend_sha256':sha(OUT/(STEM+'.blend')),'png_sha256':sha(png),'wrapper_source_sha256':sha(Path(__file__)),
               'device':'Cycles OptiX','scope':'Composite loft + lower Clump peak + front fill; geometry itself rendered, visual acceptance separate'}
        dump(receipt,value);print('PLUSH_SOFT_PILE_RENDER',json.dumps(value),flush=True);return
    if not o.prepare:p.error('--prepare or --render required')
    for suffix in ('.blend','.source.py','.json','.gn-report.json','.png','.precheck.log'):
        if (OUT/(STEM+suffix)).exists():raise FileExistsError(STEM+suffix)
    baseline=json.loads((OUT/(BASE+'.gn-report.json')).read_text(encoding='utf-8'))
    dependencies={BASE+s:sha(OUT/(BASE+s)) for s in ['.blend','.source.py','.gn-report.json']}
    if dependencies[BASE+'.blend']!=baseline['saved_blend_sha256']:raise RuntimeError('Base blend changed')
    (OUT/(STEM+'.source.py')).write_bytes(Path(__file__).read_bytes())
    h=runpy.run_path(str(OUT/'swatch-reference-gn-nearest-render-3.gn-source.py'),run_name='_loft_helpers')
    start=time.perf_counter();bpy.ops.wm.open_mainfile(filepath=str(OUT/(BASE+'.blend')))
    coat=bpy.data.objects[COAT];guide=bpy.data.objects[GUIDE];cp,cr=h['curve_arrays'](coat.data);gp,gr=h['curve_arrays'](guide.data);before,br=h['evaluated_coat'](bpy,coat)
    for ob,pts in [(coat,cp),(guide,gp)]:
        roots=pts[:,0].astype(np.float64);normal=read(ob.data,'full_star_normal',True).astype(np.float64);normal/=np.linalg.norm(normal,axis=1,keepdims=True)
        delta=pts.astype(np.float64)-roots[:,None];axial=normal[:,None]*np.sum(delta*normal[:,None],axis=2,keepdims=True)
        changed=(roots[:,None]+1.65*axial+(1.25 if ob==guide else 1.)*(delta-axial)).astype(np.float32);changed[:,0]=pts[:,0]
        ob.data.position_data.foreach_set('vector',changed.ravel());ob.data.attributes['rest_position'].data.foreach_set('vector',changed.ravel());ob.data.update_tag();ob.update_tag()
    modifier=coat.modifiers[MOD]
    socket=next(s for s in modifier.node_group.interface.items_tree if s.item_type=='SOCKET' and s.in_out=='INPUT' and s.name=='Clump Factor')
    getattr(modifier.properties.inputs,socket.identifier).value=.65
    # Keep the original v6 lights; add one broad lower-front soft source.
    light=bpy.data.lights.new('GN14 broad lower-front fill','AREA');light.energy=260.;light.shape='DISK';light.size=5.
    ob=bpy.data.objects.new('GN14 broad lower-front fill',light);bpy.context.collection.objects.link(ob);ob.location=(0.,-4.2,.3)
    ob.rotation_euler=(Vector((0.,0.,.1))-ob.location).to_track_quat('-Z','Y').to_euler()
    modifier.node_group.update_tag();bpy.context.view_layer.update();actual,r=h['evaluated_coat'](bpy,coat)
    if actual.shape!=before.shape or actual[:,0].tobytes()!=before[:,0].tobytes() or not np.isfinite(actual).all() or not np.isfinite(r).all() or np.any(r<=0):raise RuntimeError('Actual loft output root/finite contract failed')
    changed_count=int(np.count_nonzero(np.any(actual!=before,axis=(1,2))))
    if changed_count==0:raise RuntimeError('Authored loft did not propagate')
    # Native normal projection is a compact geometry check, not rendered softness.
    normals=read(coat.data,'full_star_normal',True).astype(np.float64)
    oldheight=np.sum((before-before[:,0,None]).astype(np.float64)*normals[:,None],axis=2).max(axis=1)
    newheight=np.sum((actual-actual[:,0,None]).astype(np.float64)*normals[:,None],axis=2).max(axis=1)
    scene=bpy.context.scene;scene.render.resolution_x=scene.render.resolution_y=1536;scene.cycles.samples=256;scene.render.filepath=str(OUT/(STEM+'.png'))
    scene['candidate_scope']='Composite loft recipe: child normal 1.65, guide normal 1.65/tangent1.25, Clump.65, front fill260/size5; retained original feature compression'
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(STEM+'.blend')),compress=True)
    report={'status':'engineering_precheck_passed','rendered':False,'kind':'character','blend':STEM+'.blend','png':STEM+'.png','preview_png':STEM+'.preview.png',
            'saved_blend_sha256':sha(OUT/(STEM+'.blend')),'wrapper_source_sha256':sha(Path(__file__)),'source_snapshot':STEM+'.source.py','dependencies':dependencies,
            'inherited_frozen_dependencies':baseline['dependencies'],'coat':baseline['coat'],'guides':baseline['guides'],'mapping':baseline['mapping'],'features':baseline['features'],
            'scope':'Compound full recipe. Increases actual strand/guide centerline dimensions and reduces Clump. Not isolated A/B, physical contact solve, paper reproduction or visual matching claim.',
            'changes':{'native_child_normal_scale':1.65,'native_guide_normal_scale':1.65,'native_guide_tangent_scale':1.25,'clump_peak':.65,'new_light':{'name':ob.name,'type':'AREA','energy':260.,'size':5.,'location':list(ob.location)},'undercoat':'inherited .35','flyaway':'inherited hidden'},
            'actual_geometry':{'changed_curves':changed_count,'normal_projection_peak_median_before':float(np.median(oldheight)),'normal_projection_peak_median_after':float(np.median(newheight)),
                               'evaluated_positions_float32_sha256':hashlib.sha256(actual.tobytes()).hexdigest(),'radii_float32_sha256':hashlib.sha256(r.tobytes()).hexdigest()},
            'checks':{'actual_final_roots_bitwise':True,'finite_positive_radii':True,'base_source_files_unchanged':{n:sha(OUT/n) for n in dependencies}==dependencies},
            'seconds':time.perf_counter()-start,'resolution':1536,'samples':256}
    # Updated final hashes avoid carrying base geometry hashes into the new report.
    report['coat']=dict(baseline['coat']);report['coat']['evaluated_positions_float32_sha256']=report['actual_geometry']['evaluated_positions_float32_sha256'];report['coat']['radii_float32_sha256']=report['actual_geometry']['radii_float32_sha256']
    report['coat']['native_positions_float32_sha256']=hashlib.sha256(h['curve_arrays'](coat.data)[0].tobytes()).hexdigest()
    dump(OUT/(STEM+'.gn-report.json'),report);dump(OUT/(STEM+'.json'),report)
    with (OUT/(STEM+'.precheck.log')).open('x',encoding='utf-8') as f:f.write(json.dumps(report['actual_geometry'])+'\n')
    print('PLUSH_SOFT_PILE_READY',json.dumps({'stem':STEM,'seconds':report['seconds'],'actual_geometry':report['actual_geometry']}),flush=True)

if __name__=='__main__':main()
