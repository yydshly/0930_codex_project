"""GN14 full star candidate: real star frames, compact fine bundles and official GN.

Preserves the saved v6 scene/hat/eyes/camera/lights. This full character migration
combines a 40k spatial guide map, GN14 half-width return shapes, shorter undercoat
and no flyaway layer. It is not an isolated A/B or a Houdini/paper reproduction.
Preparation and actual OptiX renders use exclusive new files, never old assets.
"""
import argparse
import hashlib
import json
import math
import runpy
import sys
import time
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'artifacts' / 'cycles-study'
OLD = 'character-reference-guide-v6'
SWATCH = 'swatch-reference-gn-bundle-scale-half-live-14'
STEM = 'character-reference-fine-bundle-v14'
COAT = 'Blue pile · coat'
GUIDE = 'Pile guides · editable live input'
MOD = 'Live official hair GN · pile study'
GEOMETRY = 'swatch-reference-gn-nearest-render-3.gn-source.py'
FROZEN = 'character-reference-v3.source.py'

def sha(path):
    with path.open('rb') as f: return hashlib.file_digest(f, 'sha256').hexdigest()

def save_json(path, value):
    with path.open('x', encoding='utf-8') as f: json.dump(value, f, ensure_ascii=False, indent=2)

def digest(a): return hashlib.sha256(np.ascontiguousarray(a).tobytes()).hexdigest()

def attr(data, name, kind, domain, values):
    a = data.attributes.get(name) or data.attributes.new(name, kind, domain)
    a.data.foreach_set('vector' if kind == 'FLOAT_VECTOR' else 'value', np.asarray(values).ravel())

def compression(p):
    hem = .850 + .115*np.exp(-((p[:,0]+.61)/.27)**2) + .180*np.exp(-((p[:,0]-.63)/.27)**2)
    c = np.where((p[:,2] > hem-.06) & (np.abs(p[:,0]+.17)<1.02), .22, 1.)
    for x in [-.43, .27]:
        socket = np.exp(-((p[:,0]-x)/.13)**2 - ((p[:,2]-.21)/.16)**2)
        c *= 1 - .88*socket*(p[:,1]<-.45)
    return c

def replay(base, count):
    rng=np.random.default_rng(51);g=math.ceil(count/32)
    tg=np.arccos(rng.uniform(-.998,.998,g)); ag=rng.uniform(0,math.tau,g)
    t=np.repeat(tg,32)[:count];a=np.repeat(ag,32)[:count]
    t+=rng.normal(0,.023,count);a+=rng.normal(0,.023,count)/np.maximum(np.sin(t),.20)
    t=np.clip(t,.0002,math.pi-.0002)
    return base['surface_frame'](t,a,False)

def main():
    import bpy
    from mathutils.kdtree import KDTree
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--prepare',action='store_true');p.add_argument('--render',choices=['preview','final'])
    o=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    if o.render:
        report=json.loads((OUT/(STEM+'.gn-report.json')).read_text(encoding='utf-8'))
        if sha(OUT/(STEM+'.blend'))!=report['saved_blend_sha256'] or sha(Path(__file__))!=report['wrapper_source_sha256']:
            raise RuntimeError('Frozen candidate source/blend changed')
        suffix='.preview' if o.render=='preview' else ''
        png=OUT/(STEM+suffix+'.png');receipt_path=OUT/(STEM+suffix+'.render.json')
        if png.exists() or receipt_path.exists(): raise FileExistsError(png)
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(STEM+'.blend')))
        scene=bpy.context.scene;scene.render.resolution_x=scene.render.resolution_y=768 if o.render=='preview' else 1536
        scene.cycles.samples=96 if o.render=='preview' else 256
        prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
        for d in prefs.devices:d.use=d.type=='OPTIX'
        scene.cycles.device='GPU';scene.render.filepath=str(png)
        start=time.perf_counter();bpy.ops.render.render(write_still=True)
        receipt={'rendered':True,'kind':'character','stage':o.render,'blend':STEM+'.blend','png':png.name,
                 'resolution':scene.render.resolution_x,'samples':scene.cycles.samples,'seconds':time.perf_counter()-start,
                 'blend_sha256':sha(OUT/(STEM+'.blend')),'png_sha256':sha(png),'wrapper_source_sha256':sha(Path(__file__)),
                 'device':'Cycles OptiX','scope':'New composite full character recipe; visual acceptance separate'}
        save_json(receipt_path,receipt);print('PLUSH_FULL_RENDER',json.dumps(receipt),flush=True);return
    if not o.prepare:p.error('--prepare or --render required')
    for suffix in ('.blend','.source.py','.gn-report.json','.json','.precheck.log','.png'):
        if (OUT/(STEM+suffix)).exists():raise FileExistsError(STEM+suffix)
    dependencies={n:sha(OUT/n) for n in [OLD+'.blend',OLD+'.png',SWATCH+'.blend',SWATCH+'.source.py',GEOMETRY,FROZEN]}
    if dependencies[FROZEN]!='69df6504ddc4412c1279f7f40f2baa8ae45fbedc6649e64cdc7cb1d175039dc3':raise RuntimeError('Frozen full surface changed')
    source=Path(__file__).read_bytes();(OUT/(STEM+'.source.py')).write_bytes(source)
    h=runpy.run_path(str(OUT/GEOMETRY),run_name='_full_gn_helpers');base=runpy.run_path(str(OUT/FROZEN),run_name='_full_frozen_star')
    with (OUT/(STEM+'.precheck.log')).open('x',encoding='utf-8') as log:
        def event(v):
            msg='PLUSH_FULL '+json.dumps(v,ensure_ascii=False);print(msg,flush=True);log.write(msg+'\n');log.flush()
        start=time.perf_counter();bpy.ops.wm.open_mainfile(filepath=str(OUT/(OLD+'.blend')))
        oldcoat=bpy.data.objects[COAT];oldp,oldr=h['curve_arrays'](oldcoat.data)
        if oldp.shape!=(320000,12,3):raise RuntimeError('Saved v6 full coat topology unexpected')
        roots,normals=replay(base,len(oldp));roots=roots.astype(np.float32)
        if roots.tobytes()!=oldp[:,0].tobytes():raise RuntimeError('True star root replay mismatch')
        normals=normals/np.linalg.norm(normals,axis=1,keepdims=True);comp=compression(roots.astype(np.float64))
        before_scene={ob.name:{'matrix_world':[list(row) for row in ob.matrix_world], 'type':ob.type} for ob in bpy.context.scene.objects if ob.type in ('LIGHT','CAMERA') or 'eye' in ob.name.lower() or 'beret' in ob.name.lower()}
        with bpy.data.libraries.load(str(OUT/(SWATCH+'.blend')),link=False) as (available,loaded):
            loaded.objects=[COAT,GUIDE]
        coat,guide=loaded.objects
        template,tr=h['curve_arrays'](guide.data);tn=template[:,0].astype(np.float64)/np.array([.64,.43,.54])**2
        tn/=np.linalg.norm(tn,axis=1,keepdims=True)
        v=template.astype(np.float64)-template[:,0,None].astype(np.float64)
        z=np.sum(v*tn[:,None],axis=2)
        tangent=v-tn[:,None]*z[...,None]
        e1=tangent[:,5];e1/=np.maximum(np.linalg.norm(e1,axis=1,keepdims=True),1e-12);e2=np.cross(tn,e1)
        lx=np.sum(v*e1[:,None],axis=2);ly=np.sum(v*e2[:,None],axis=2)
        # Copy actual GN14 half-width local shapes, varying prototype deterministically.
        ids=np.arange(0,len(roots),8,dtype=np.int32);gr=roots[ids];gn=normals[ids];gc=comp[ids]
        down=np.tile([0.,0.,-1.],(len(ids),1));down-=gn*np.sum(down*gn,axis=1,keepdims=True)
        poles=np.linalg.norm(down,axis=1)<.05;down[poles]=np.cross(gn[poles],[0,1,0]);down/=np.linalg.norm(down,axis=1,keepdims=True)
        side=np.cross(gn,down);turn=np.random.default_rng(14014).normal(0,.65,len(ids))
        gu=down*np.cos(turn[:,None])+side*np.sin(turn[:,None]);gv=np.cross(gn,gu)
        proto=np.arange(len(ids))%len(template);scale=1.55*gc
        gp=(gr[:,None].astype(np.float64)+scale[:,None,None]*(gu[:,None]*lx[proto,:,None]+gv[:,None]*ly[proto,:,None]+gn[:,None]*z[proto,:,None])).astype(np.float32)
        gp[:,0]=gr
        t=np.linspace(0,1,12)[None,:,None]
        # Child rest has the original root radius and a compressed short upright centerline.
        native=(roots[:,None].astype(np.float64)+normals[:,None]*(.038*comp[:,None,None])*(t-.10*t*t)).astype(np.float32);native[:,0]=roots
        tree=KDTree(len(gr))
        for i,r in enumerate(gr):tree.insert(r,i)
        tree.balance();mapping=np.empty(len(roots),np.int32)
        for i,r in enumerate(roots):mapping[i]=tree.find(r)[1]
        event({'stage':'true_star_frames_and_nearest_map_ready','coat':len(roots),'guides':len(gr),'compression_min':float(comp.min()),'mapped_groups':int(np.unique(mapping).size)})
        # Remove only the v6 coat copy in this new scene; historical file remains frozen.
        bpy.data.objects.remove(oldcoat,do_unlink=True);coat.name=COAT;guide.name=GUIDE
        bpy.context.collection.objects.link(coat);bpy.context.collection.objects.link(guide)
        mat=bpy.data.materials.get('Blue fiber BSDF')
        if mat is None:
            mat=next(m for m in bpy.data.materials if 'fiber' in m.name.lower() and 'charcoal' not in m.name.lower())
        temp=base['native_curves']('Full native temporary coat',native,oldr,mat);coat.data=temp.data;bpy.data.objects.remove(temp,do_unlink=True)
        guide_radius=oldr[ids].copy();temp=base['native_curves']('Full native temporary guides',gp,guide_radius,mat);guide.data=temp.data;bpy.data.objects.remove(temp,do_unlink=True)
        for ob,pts,rad,local,c,n in [(coat,native,oldr,mapping,comp,normals),(guide,gp,guide_radius,np.arange(len(gr),dtype=np.int32),gc,gn)]:
            attr(ob.data,'rest_position','FLOAT_VECTOR','POINT',pts)
            attr(ob.data,'root_radius','FLOAT','CURVE',rad[:,0])
            attr(ob.data,'is_guide','BOOLEAN','CURVE',np.full(len(pts),ob==guide,dtype=bool))
            attr(ob.data,'pile_guide_index','INT','CURVE',320000+local)
            attr(ob.data,'guide_curve_index','INT','CURVE',320000+local)
            attr(ob.data,'full_star_normal','FLOAT_VECTOR','CURVE',n.astype(np.float32))
            attr(ob.data,'full_feature_compression','FLOAT','CURVE',c.astype(np.float32))
            ob['curve_count']=len(pts)
        modifier=coat.modifiers[MOD];group=modifier.node_group
        guide_socket=next(s for s in group.interface.items_tree if s.item_type=='SOCKET' and s.in_out=='INPUT' and s.name=='Guide Object')
        getattr(modifier.properties.inputs,guide_socket.identifier).value=guide
        # Scale live Curl Radius by the same face/hat mask: compressed guides stay compressed.
        named=group.nodes.new('GeometryNodeInputNamedAttribute');named.name='Full star feature compression';named.data_type='FLOAT';named.inputs['Name'].default_value='full_feature_compression'
        multiply=group.nodes.new('ShaderNodeMath');multiply.operation='MULTIPLY';multiply.name='Full compressed live Curl radius'
        curl=group.nodes['Curl Hair Curves'];source_socket=curl.inputs['Radius'].links[0].from_socket
        group.links.new(source_socket,multiply.inputs[0]);group.links.new(named.outputs['Attribute'],multiply.inputs[1]);group.links.new(multiply.outputs[0],curl.inputs['Radius'])
        guide.hide_render=True;guide.hide_set(True)
        uc=bpy.data.objects.get('Blue pile · undercoat')
        if uc:
            up,ur=h['curve_arrays'](uc.data);up=up[:,0,None]+.35*(up-up[:,0,None]);uc.data.position_data.foreach_set('vector',up.ravel());uc.data.update_tag()
        fly=bpy.data.objects.get('Blue pile · flyaway')
        if fly:fly.hide_render=True;fly.hide_set(True)
        coat.data.update_tag();guide.data.update_tag();coat.update_tag();guide.update_tag();group.update_tag();bpy.context.view_layer.update()
        final,fr=h['evaluated_coat'](bpy,coat)
        if final.shape!=native.shape or not np.isfinite(final).all() or not np.isfinite(fr).all() or final[:,0].tobytes()!=roots.tobytes() or np.any(fr<=0):raise RuntimeError('Actual final full geometry/root/finite contract failed')
        counts=np.bincount(mapping,minlength=len(gr))
        if np.any(counts==0):raise RuntimeError('Every eighth own root must map to a nonempty guide')
        after_scene={ob.name:{'matrix_world':[list(row) for row in ob.matrix_world], 'type':ob.type} for ob in bpy.context.scene.objects if ob.type in ('LIGHT','CAMERA') or 'eye' in ob.name.lower() or 'beret' in ob.name.lower()}
        if before_scene!=after_scene:raise RuntimeError('Saved v6 eyes/hat/camera/lights transforms changed')
        scene=bpy.context.scene;scene.render.resolution_x=scene.render.resolution_y=1536;scene.cycles.samples=256;scene.render.filepath=str(OUT/(STEM+'.png'))
        scene['candidate_scope']='GN14 fine bundle full star composite: true star normals; face/hat compression; 40k guides; undercoat .35; flyaway hidden; source scene preserved'
        bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(STEM+'.blend')),compress=True)
        report={'status':'engineering_precheck_passed','rendered':False,'kind':'character','blend':STEM+'.blend','png':STEM+'.png','preview_png':STEM+'.preview.png',
                'saved_blend_sha256':sha(OUT/(STEM+'.blend')),'wrapper_source_sha256':sha(Path(__file__)),'source_snapshot':STEM+'.source.py','dependencies':dependencies,
                'scope':'Full compound recipe migration, not isolated A/B; no visual match/softness/paper solver claim',
                'coat':{'object':COAT,'curves':len(native),'controls':12,'roots_float32_sha256':digest(roots),'native_positions_float32_sha256':digest(native),'evaluated_positions_float32_sha256':digest(final),'radii_float32_sha256':digest(fr)},
                'guides':{'object':GUIDE,'curves':len(gr),'selection':'Every eighth original v6 coat root in stable order','selected_root_indices_int32_sha256':digest(ids),'shape':'Actual GN14 half native controls decomposed in swatch normal/tangent frame, reoriented to full numerical star normals, 1.55 times feature-compressed height/width'},
                'mapping':{'attribute':'pile_guide_index','dtype':'INT','domain':'CURVE','offset':320000,'ids_int32_sha256':digest(mapping),'method':'mathutils KDTree Euclidean roots, no dense matrix','minimum_children':int(counts.min()),'maximum_children':int(counts.max()),'mean_children':float(counts.mean())},
                'features':{'normal_attribute':'full_star_normal','compression_attribute':'full_feature_compression','source':'Frozen v3 body_surface/surface_frame outward numerical cross and exact v3 groom face/beret compression formula','compressed_roots':int(np.count_nonzero(comp<.99))},
                'changes':['Live official GN14 Curl/Clump along-length profile/SetHairProfile/rootlock chain','40k actual full root guides /320k children','Star surface normals and face/hat compression in native guide and live Curl radius','Existing full undercoat .35 length and flyaway hidden'],
                'checks':{'native_root_replay_bitwise':True,'actual_final_roots_bitwise':True,'finite_positive_radii':True,'all_guide_groups_nonempty':True,'v6_eyes_hat_camera_lights_transforms_preserved':True,'source_dependencies_unchanged':{n:sha(OUT/n) for n in dependencies}==dependencies},
                'seconds':time.perf_counter()-start,'resolution':1536,'samples':256,'render_receipts':[STEM+'.preview.render.json',STEM+'.render.json']}
        save_json(OUT/(STEM+'.gn-report.json'),report);save_json(OUT/(STEM+'.json'),report)
        event({'stage':'full_asset_ready','stem':STEM,'seconds':report['seconds'],'blend_sha256':report['saved_blend_sha256']})

if __name__=='__main__':main()
