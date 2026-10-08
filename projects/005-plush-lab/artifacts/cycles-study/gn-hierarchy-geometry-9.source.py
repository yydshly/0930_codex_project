"""Read-only actual saved GN8/GN9 geometry and temporary coat stage outputs.
No save, no render, no GPU. Group Output is bypassed in memory to official
Curl/Clump output; native joined curve order and is_guide mask are read, then
the final link is restored and final positions/radii must match bitwise.
Arc = specified uniform Catmull-Rom duplicate endpoint/order32 model on saved
float32 controls, not measured engine arc. Clouds are centerline proxies.
"""
import hashlib
import json
import runpy
import time
from pathlib import Path
import bpy
import numpy as np

OUT=Path(__file__).resolve().parent
NAME="gn-hierarchy-geometry-9"
COAT="Blue pile · coat"
GUIDE="Pile guides · editable live input"
STEMS=("swatch-reference-gn-no-flyaway-8","swatch-reference-gn-hierarchy-soft-live-9","swatch-reference-gn-hierarchy-firm-live-9")
EXPECTED={STEMS[0]+".blend":"3f6723cdb5e7358991357c8898bc13b09a851b3055d7a545e72f6206ebdc22a3",
          STEMS[1]+".blend":"f18e81a23251943313fcaf021a3a5e1e50b87bbda45f99ab1f0b605953906664",
          STEMS[2]+".blend":"b56cf9ec0f68e7ceeb988fbc219ce86a6d1913785230654020911b3e5c00a057",
          "swatch-reference-gn-nearest-render-3.gn-source.py":"be7730c0ddba22109ebc31dd44e8660672df7fd2cb8d361093688ce9fcc2c927"}

def file_sha(p):
    with p.open("rb") as f:return hashlib.file_digest(f,"sha256").hexdigest()

def cloud(points, targets, mapping, h):
    result={}
    for j in (3,6,9,11):
        result[str(j)]={"absolute_child_to_joined_guide_distance":h["summarize"](np.linalg.norm(points[:,j].astype(np.float64)-targets[mapping,j],axis=-1))}
        gids=mapping; g=len(targets); counts=np.bincount(gids,minlength=g)
        means=np.zeros((g,3))
        for axis in range(3): means[:,axis]=np.bincount(gids,weights=points[:,j,axis],minlength=g)/np.maximum(counts,1)
        delta=points[:,j].astype(np.float64)-means[gids]
        result[str(j)]["within_fine_center_cloud_rms"]=h["summarize"](np.sqrt(np.bincount(gids,weights=np.sum(delta**2,axis=-1),minlength=g)/np.maximum(counts,1)))
    return result

for suffix in (".json",".raw.log"):
    if (OUT/(NAME+suffix)).exists():raise FileExistsError(NAME+suffix)
before={n:file_sha(OUT/n) for n in EXPECTED}
if before!=EXPECTED:raise RuntimeError("Frozen inputs changed")
h=runpy.run_path(str(OUT/"swatch-reference-gn-nearest-render-3.gn-source.py"),run_name="_readonly_geometry")
results={}; baseline_p=None; baseline_gp=None; baseline_arc=None
started=time.perf_counter()
with (OUT/(NAME+".raw.log")).open("x",encoding="utf-8") as log:
    def emit(v):
        line=json.dumps(v,ensure_ascii=False);print(line,flush=True);log.write(line+"\n");log.flush()
    for stem in STEMS:
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+".blend")))
        coat=bpy.data.objects[COAT];guide=bpy.data.objects[GUIDE]
        gp,gr=h["curve_arrays"](guide.data);gep,ger=h["evaluated_coat"](bpy,guide)
        p,r=h["evaluated_coat"](bpy,coat)
        mapping=np.empty(len(p),np.int32);coat.data.attributes["pile_guide_index"].data.foreach_get("value",mapping);mapping-=len(p)
        g_arc=h["catmull_rom_lengths"](gp);ge_arc=h["catmull_rom_lengths"](gep);arc=h["catmull_rom_lengths"](p)
        if baseline_p is None:baseline_p=p.copy();baseline_gp=gp.copy();baseline_arc=arc.copy();baseline_garc=g_arc.copy()
        record={"native_guide_arc":h["summarize"](g_arc),"evaluated_guide_arc":h["summarize"](ge_arc),"guide_arc_ratio_from_control":h["summarize"](ge_arc/baseline_garc),
                "parent_modifier_arc_ratio_from_native":h["summarize"](ge_arc/g_arc),"coat_arc":h["summarize"](arc),"coat_arc_ratio_from_control":h["summarize"](arc/baseline_arc),
                "coat_curve_max_point_displacement_from_control":h["summarize"](np.max(np.linalg.norm(p.astype(np.float64)-baseline_p,axis=-1),axis=1)),
                "changed_coat_curve_count":int(np.count_nonzero(np.any(p!=baseline_p,axis=(1,2)))),"final_coat_positions_sha256":h["array_digest"](p),"stages":{}}
        tree=coat.modifiers["Live official hair GN · pile study"].node_group
        output=next(n for n in tree.nodes if n.type=="GROUP_OUTPUT").inputs["Geometry"]
        final_socket=output.links[0].from_socket
        try:
            for stage in ("Curl Hair Curves","Clump Hair Curves"):
                tree.links.new(tree.nodes[stage].outputs[0],output);coat.update_tag(refresh={"DATA"});bpy.context.view_layer.update()
                joined,_=h["evaluated_coat"](bpy,coat)
                actual=coat.evaluated_get(bpy.context.evaluated_depsgraph_get()).data
                isguide=np.empty(len(joined),np.bool_);actual.attributes["is_guide"].data.foreach_get("value",isguide)
                if np.flatnonzero(isguide).tolist()!=list(range(len(p),len(p)+len(gp))):raise RuntimeError("Actual joined guide order differs")
                child=joined[:len(p)];target=joined[len(p):]
                record["stages"][stage]={"point_positions_sha256":h["array_digest"](joined),"actual_first_guide_curve":int(np.flatnonzero(isguide)[0]),"centerline_clouds":cloud(child,target,mapping,h),
                                          "coat_crown_height":h["summarize"](h["sampled_height"](child)[0])}
        finally:
            tree.links.new(final_socket,output);coat.update_tag(refresh={"DATA"});bpy.context.view_layer.update()
        restored,rr=h["evaluated_coat"](bpy,coat)
        if restored.tobytes()!=p.tobytes() or rr.tobytes()!=r.tobytes():raise RuntimeError("Stage bypass not restored bitwise")
        record["final_state_restored_bitwise"]=True
        results[stem]=record;emit({"asset":stem,"measurements":record})
    after={n:file_sha(OUT/n) for n in EXPECTED}
    if before!=after:raise RuntimeError("Saved inputs mutated")
    report={"scope":"Fresh actual CPU read-only measurements; no render/no save. Temporary Group Output stage bypass restored bitwise. Joined guide curve is_guide mask verifies real order. Local cloud distances describe centerlines, not widths/contact/visibility.",
            "basis":"float32 controls -> float64 uniform Catmull-Rom duplicate endpoint integration order32; not engine arc. Crown signed analytic ellipsoid sampled approximate height, not exact closest projection or pixels.",
            "source_snapshot":NAME+".source.py","source_sha256":file_sha(Path(__file__)),"input_sha256_before":before,"input_sha256_after":after,"seconds":time.perf_counter()-started,"results":results}
    with (OUT/(NAME+".json")).open("x",encoding="utf-8") as f:json.dump(report,f,ensure_ascii=False,indent=2)
    emit({"report":NAME+".json","seconds":report["seconds"],"input_sha_preserved":True})
