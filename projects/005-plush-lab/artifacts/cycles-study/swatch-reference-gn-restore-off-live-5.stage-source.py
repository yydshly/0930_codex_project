import bpy,runpy,numpy as np,json,hashlib
from pathlib import Path
root=Path('F:/codex_project/0930_codex_project/projects/005-plush-lab')
path=root/'artifacts/cycles-study/swatch-reference-gn-undercoat-short-live-4.blend'
hpath=root/'artifacts/cycles-study/swatch-reference-gn-nearest-render-3.gn-source.py'
before={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in [path,hpath,root/'tooling/blender/plush_hair_nodes_study.py']}
h=runpy.run_path(str(hpath),run_name='_readhelpers')
bpy.ops.wm.open_mainfile(filepath=str(path))
coat=bpy.data.objects['Blue pile · coat']; guide=bpy.data.objects['Pile guides · editable live input']
tree=coat.modifiers['Live official hair GN · pile study'].node_group
axes=np.array([.64,.43,.54])
def stats(p):
    p64=p.astype(np.float64); q=p64/(axes*axes); height=(np.sum((p64/axes)**2,axis=-1)-1)/(2*np.linalg.norm(q,axis=-1))
    normal=p64[:,0]/(axes*axes); normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
    d=p64-p64[:,:1]; z=np.sum(d*normal[:,None],axis=-1)
    first=p64[:,1]-p64[:,0]; first/=np.linalg.norm(first,axis=-1,keepdims=True)
    peak,minimum,arc,below,deep,exposure=h['sampled_height'](p)
    return {'count':len(p),'crown_median':float(np.median(peak)),'crown_p95':float(np.percentile(peak,95)),'below_minus_001_fraction':float(np.mean(minimum<-.001)),'deep_arc_fraction_mean':float(deep.mean()),'root_tangent_normal_dot_median':float(np.median(np.sum(first*normal,axis=-1))),'root_local_normal_height_by_control_median':np.median(z,axis=0).tolist(),'sampled_arc_mean':float(arc.mean())}
gp,gr=h['curve_arrays'](guide.data)
print('RAW_GUIDE',json.dumps(stats(gp)))
rp,rr=h['curve_arrays'](coat.data)
print('REST',json.dumps(stats(rp)))
out=next(n for n in tree.nodes if n.type=='GROUP_OUTPUT'); link=out.inputs['Geometry'].links[0]; original=link.from_socket
for stage in ['Curl Hair Curves','Clump Hair Curves','Restore Curve Segment Length','Set Hair Curve Profile']:
    tree.links.remove(out.inputs['Geometry'].links[0]); tree.links.new(tree.nodes[stage].outputs[0],out.inputs['Geometry']); tree.update_tag(); coat.update_tag(); bpy.context.view_layer.update()
    ep,er=h['evaluated_coat'](bpy,coat)
    print('STAGE',stage,json.dumps({'coat':stats(ep[:85000]),'guide':stats(ep[85000:])}))
tree.links.remove(out.inputs['Geometry'].links[0]); tree.links.new(original,out.inputs['Geometry']); tree.update_tag(); coat.update_tag(); bpy.context.view_layer.update()
ep,er=h['evaluated_coat'](bpy,coat); print('FINAL',json.dumps(stats(ep)))
for asset in ['Curl Hair Curves','Clump Hair Curves','Restore Curve Segment Length']:
    group=tree.nodes[asset].node_tree
    print('OFFICIAL_INTERNAL',asset)
    for n in group.nodes:
        if n.bl_idname in ['ShaderNodeVectorMath','ShaderNodeMath','GeometryNodeSetPosition','GeometryNodeSampleIndex','GeometryNodeSampleCurve','GeometryNodeGroup','ShaderNodeMix']:
            print(n.name,n.bl_idname,getattr(n,'operation',''), n.node_tree.name if n.type=='GROUP' else '',[(s.name,[(l.from_node.name,l.from_socket.name) for l in s.links]) for s in n.inputs if s.is_linked])
after={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in [path,hpath,root/'tooling/blender/plush_hair_nodes_study.py']}
print('INPUT_SHA_UNCHANGED',before==after)
