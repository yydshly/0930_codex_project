import bpy,runpy,numpy as np,json,hashlib
from pathlib import Path
root=Path('F:/codex_project/0930_codex_project/projects/005-plush-lab'); out=root/'artifacts/cycles-study'; stems=['swatch-reference-gn-restore-off-live-5','swatch-reference-gn-tip-spread-006-live2-6','swatch-reference-gn-tip-spread-009-live2-6']; files=[out/(s+'.blend') for s in stems]+[out/(s+'.source.py') for s in stems]; hashes={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
h=runpy.run_path(str(out/'swatch-reference-gn-nearest-render-3.gn-source.py'),run_name='_helper')
records={}; arrays={}
class CPUReadRenderGraph(bpy.types.RenderEngine):
    bl_idname='PLUSH_CPU_READ_RENDER_GRAPH'
    bl_label='Read-only CPU render graph diagnostic'
    bl_use_preview=False
    bl_use_shading_nodes=True
    def render(self,depsgraph):
        obj=depsgraph.scene_eval.objects['Blue pile · coat']; p,r=h['curve_arrays'](obj.evaluated_get(depsgraph).data)
        arrays[(current,'RENDER')]=(p.copy(),r.copy()); records[current]['render']={'mode':depsgraph.mode,'position_sha256':h['array_digest'](p),'radius_sha256':h['array_digest'](r),'count':len(p),'finite':bool(np.isfinite(p).all() and np.isfinite(r).all())}
        result=self.begin_result(0,0,1,1);self.end_result(result)
bpy.utils.register_class(CPUReadRenderGraph)
for current in stems:
    bpy.ops.wm.open_mainfile(filepath=str(out/(current+'.blend'))); c=bpy.data.objects['Blue pile · coat']; d=bpy.context.evaluated_depsgraph_get(); p,r=h['curve_arrays'](c.evaluated_get(d).data); arrays[(current,'VIEWPORT')]=(p.copy(),r.copy()); mod=c.modifiers['Live official hair GN · pile study']; t=mod.node_group
    flags={o.name:{'hide_render':o.hide_render,'hide_viewport':o.hide_viewport,'hide_set':o.hide_get(),'modifiers':[{ 'name':m.name,'show_render':m.show_render,'show_viewport':m.show_viewport} for m in o.modifiers]} for o in bpy.context.scene.objects if o.type=='CURVES'}
    records[current]={'viewport':{'mode':d.mode,'position_sha256':h['array_digest'](p),'radius_sha256':h['array_digest'](r),'count':len(p)},'flags':flags,'tip_spread':float(getattr(mod.properties.inputs,'Socket_8').value),'restore_factor':float(t.nodes['Restore Curve Segment Length'].inputs['Factor'].default_value),'saved_render_engine':bpy.context.scene.render.engine}
    bpy.context.scene.render.engine=CPUReadRenderGraph.bl_idname
    bpy.ops.render.render(write_still=False)
    vp,vr=arrays[(current,'VIEWPORT')];rp,rr=arrays[(current,'RENDER')];records[current]['viewport_render_position_bits_equal']=vp.tobytes()==rp.tobytes();records[current]['viewport_render_radius_bits_equal']=vr.tobytes()==rr.tobytes()
for s in stems[1:]:
    for mode in ['VIEWPORT','RENDER']:
        p0,r0=arrays[(stems[0],mode)];p,r=arrays[(s,mode)]; delta=np.linalg.norm(p.astype(float)-p0.astype(float),axis=-1);records[s][mode+'_vs_GN5']={'changed_position_fraction':float(np.mean(np.any(p!=p0,axis=-1))),'max_displacement':float(delta.max()),'mean_displacement':float(delta.mean()),'changed_radius_fraction':float(np.mean(r!=r0)),'roots_bits_equal':p[:,0].tobytes()==p0[:,0].tobytes()}
print('READONLY_RENDER_DEPSGRAPH',json.dumps(records));print('INPUT_SHA_UNCHANGED',hashes=={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in files});print('METHOD','Custom Python RenderEngine receives actual RENDER depsgraph; reads native evaluated Curves only, creates1x1 dummy result, no Cycles/GPU/no write_still/no blend save. All source settings restored by next file load; unchanged disks verified.')
