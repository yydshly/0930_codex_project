import bpy,runpy,numpy as np,json,hashlib
from pathlib import Path
root=Path('F:/codex_project/0930_codex_project/projects/005-plush-lab'); asset=root/'artifacts/cycles-study/swatch-reference-gn-restore-off-live-5.blend'; watched=[asset,root/'artifacts/cycles-study/swatch-reference-gn-restore-off-live-5.source.py',root/'tooling/blender/plush_hair_nodes_study.py']; hashes={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in watched}
h=runpy.run_path(str(root/'artifacts/cycles-study/swatch-reference-gn-nearest-render-3.gn-source.py'),run_name='_h')
bpy.ops.wm.open_mainfile(filepath=str(asset)); obj=bpy.data.objects['Blue pile · coat']; guide=bpy.data.objects['Pile guides · editable live input']; mod=obj.modifiers['Live official hair GN · pile study'];tree=mod.node_group
p0,r0=h['evaluated_coat'](bpy,obj); gp,gr=h['curve_arrays'](guide.data); ids=np.empty(len(p0),dtype=np.int32);obj.data.attributes['pile_guide_index'].data.foreach_get('value',ids);ids-=len(p0);groups=[np.flatnonzero(ids==g) for g in range(len(gp))];valid=[(g,idx) for g,idx in enumerate(groups) if len(idx)>=8]
D=gp.astype(float)-gp[:,:1].astype(float);sv=np.linalg.svd(D,compute_uv=False);print('GUIDE_PLANARITY',json.dumps({'smin_smax':h['summarize'](sv[:,-1]/sv[:,0]),'middle_smax':h['summarize'](sv[:,1]/sv[:,0])}))
def measure(p):
    peak,minimum,arc,below,deep,_=h['sampled_height'](p); result={'crown_median':float(np.median(peak)),'inward_1mm_fraction':float(np.mean(minimum<-.001)),'arc_mean_order8':float(arc.mean())}
    for j in [5,8,11]:
        eig=np.asarray([np.linalg.eigvalsh(np.cov(p[idx,j].astype(float),rowvar=False)) for g,idx in valid]);eig=np.maximum(eig,0); result['crosssection_control'+str(j)]={'smallest_std_median':float(np.median(np.sqrt(eig[:,0]))),'middle_std_median':float(np.median(np.sqrt(eig[:,1]))),'largest_std_median':float(np.median(np.sqrt(eig[:,2]))),'smallest_to_largest_median':float(np.median(np.sqrt(eig[:,0]/eig[:,2])))}
    return result
print('BASELINE',json.dumps(measure(p0)))
for label,identifier,value in [('tip_spread_009','Socket_8',.009),('clump_factor_065','Socket_6',.65),('curl_radius_012','Socket_4',.012)]:
    socket=getattr(mod.properties.inputs,identifier);old=socket.value;socket.value=value;obj.update_tag();bpy.context.view_layer.update();p,r=h['evaluated_coat'](bpy,obj);m=measure(p);m['max_position_displacement']=float(np.max(np.linalg.norm(p.astype(float)-p0.astype(float),axis=-1)));m['roots_bit_equal']=p[:,0].tobytes()==p0[:,0].tobytes();print('READONLY_RESPONSE',label,json.dumps(m));socket.value=old;obj.update_tag();bpy.context.view_layer.update()
clump=tree.nodes['Clump Hair Curves'].node_tree
for name in ['Random Value','Random Value.001','Vector Math.012','Vector Math.025','Switch','Switch.002','Vector Math.011','Mix','Group.001','Group.005']:
    n=clump.nodes.get(name)
    if n:
        print('INTERNAL',name,n.bl_idname,getattr(n,'data_type',''),getattr(n,'operation',''),[(s.identifier,s.name,list(s.default_value) if hasattr(s,'default_value') and hasattr(s.default_value,'__len__') and not isinstance(s.default_value,str) else str(s.default_value) if hasattr(s,'default_value') else None,[(l.from_node.name,l.from_socket.name) for l in s.links]) for s in n.inputs], 'outputs', [(s.name,[(l.to_node.name,l.to_socket.name) for l in s.links]) for s in n.outputs])
p,r=h['evaluated_coat'](bpy,obj);print('RESTORED_BITS',p.tobytes()==p0.tobytes(),r.tobytes()==r0.tobytes());print('INPUT_SHA_UNCHANGED',hashes=={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in watched})
