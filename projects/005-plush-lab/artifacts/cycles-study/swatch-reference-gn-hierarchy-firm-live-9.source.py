"""GN9: live parent -> fine guides -> child hair, on frozen GN8 no-flyaway.

Project-authored hierarchical groom, not Houdini or a paper reproduction.
900 existing spatial anchors keep their native shape; other fine guides are
root-fixed scaled .72 then processed by the actual official Clump asset.
Only parent strength differs (.40/.65) between the two composite candidates.
The final coat Curl/Clump/Profile and child-to-fine map remain unchanged.
Official method sources:
https://docs.blender.org/manual/en/5.2/modeling/geometry_nodes/hair/guides/clump_hair_curves.html
https://docs.blender.org/manual/en/5.2/modeling/geometry_nodes/hair/guides/curl_hair_curves.html
https://www.sidefx.com/docs/houdini/nodes/sop/hairclump.html
Clump Preserve Length concerns control segments; no Catmull arc constraint or
width-contact bundling solver is claimed. Geometry checks are not visual QA.
Prepare --case soft|firm --tag NAME --no-render; then --render-saved --tag NAME.
All output files are exclusive. Saved preparation is never resaved by render.
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
OUT = ROOT / "artifacts" / "cycles-study"
CONTROL = "swatch-reference-gn-no-flyaway-8"
COAT = "Blue pile · coat"
GUIDE = "Pile guides · editable live input"
TREE = "PLUSH Parent Clump · hierarchy guides"
MODIFIER = "Live parent clump · hierarchy guides"
PARENT_ATTR = "hierarchy_parent_index"
MASK_ATTR = "hierarchy_is_parent"
RECORD = "swatch-reference-gn-undercoat-short-live-4.source.py"
GEOMETRY = "swatch-reference-gn-nearest-render-3.gn-source.py"
CASES = {"soft": .40, "firm": .65}
DEPENDENCIES = {
    CONTROL+".blend": "3f6723cdb5e7358991357c8898bc13b09a851b3055d7a545e72f6206ebdc22a3",
    CONTROL+".source.py": "0c8c14cc9d13c9d436f00f5b2c0d14b3b8acc800a3ffc007325d22aa4fad3dd0",
    CONTROL+".gn-report.json": "a9ed003ce2aba80eb4d9c9331363baa6f9c1412aaa95e0cfa28c6d9ec0adcd4f",
    RECORD: "5b1d9049cec289828a6e354ce334d37873fa8343c4f5a0aa848315732125609c",
    GEOMETRY: "be7730c0ddba22109ebc31dd44e8660672df7fd2cb8d361093688ce9fcc2c927",
}


def file_sha(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def write_json(path, value):
    with path.open("x", encoding="utf-8") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)


def spatial_parents(points, count=900):
    """FPS argmax first tie; nearest sorted anchor argmin first tie, f64."""
    roots = points[:, 0].astype(np.float64)
    distance = np.full(len(roots), np.inf)
    selected = []
    current = 0
    for _ in range(count):
        selected.append(current)
        distance = np.minimum(distance, np.sum((roots-roots[current])**2, axis=1))
        distance[np.asarray(selected)] = -1.
        current = int(np.argmax(distance))
    anchors = np.sort(np.asarray(selected, dtype=np.int32))
    full = np.sum((roots[:, None]-roots[anchors][None])**2, axis=2)
    mapping = anchors[np.argmin(full, axis=1)].astype(np.int32)
    mask = np.zeros(len(roots), dtype=np.bool_)
    mask[anchors] = True
    if not np.array_equal(mapping[anchors], anchors):
        raise RuntimeError("Duplicate root prevents anchor self map")
    return anchors, mapping, mask


def shortened_guides(points, mask):
    roots = points[:, 0].astype(np.float64)
    result = (roots[:, None]+.72*(points.astype(np.float64)-roots[:, None])).astype(np.float32)
    result[mask] = points[mask]
    result[:, 0] = points[:, 0]
    return result


def build_parent_graph(bpy, guide, strength):
    tree = bpy.data.node_groups.new(TREE, "GeometryNodeTree")
    tree.interface.new_socket(name="Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    tree.interface.new_socket(name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    nodes, links = tree.nodes, tree.links
    def node(kind, name):
        item = nodes.new(kind); item.name = name; item.label = name
        return item
    def attribute(name, kind):
        item = node("GeometryNodeInputNamedAttribute", name)
        item.data_type = kind; item.inputs["Name"].default_value = name
        return item.outputs["Attribute"]
    def math(name, op, a, b):
        item = node("ShaderNodeMath", name); item.operation = op
        for socket, value in zip(item.inputs, (a,b)):
            if isinstance(value, (int,float)): socket.default_value = value
            else: links.new(value, socket)
        return item.outputs[0]
    inp = node("NodeGroupInput", "Original fine guide input")
    out = node("NodeGroupOutput", "Live hierarchical fine guides")
    parent = attribute(PARENT_ATTR, "INT")
    mask = attribute(MASK_ATTR, "BOOLEAN")
    persistent_fine = attribute("pile_guide_index", "INT")
    parameter = node("GeometryNodeSplineParameter", "Fine guide length parameter")
    def smooth(name, start, end):
        item = node("ShaderNodeMapRange", name)
        item.interpolation_type = "SMOOTHSTEP"; item.clamp = True
        item.inputs["From Min"].default_value = start
        item.inputs["From Max"].default_value = end
        item.inputs["To Min"].default_value = 0.
        item.inputs["To Max"].default_value = 1.
        links.new(parameter.outputs["Factor"], item.inputs["Value"])
        return item.outputs["Result"]
    early = smooth("Parent early rise 0 to .40", 0., .40)
    late = smooth("Parent relaxed tip .65 to 1", .65, 1.)
    relaxed = math("Tip relaxation .25", "SUBTRACT", 1., math("Tip quarter", "MULTIPLY", .25, late))
    beta = math("Parent strength", "MULTIPLY", strength, math("Parent length profile", "MULTIPLY", early, relaxed))
    switch = node("GeometryNodeSwitch", "Anchor factor zero"); switch.input_type = "FLOAT"
    links.new(mask, switch.inputs["Switch"]); links.new(beta, switch.inputs["False"])
    switch.inputs["True"].default_value = 0.
    clump = node("GeometryNodeGroup", "ParentClump · official Clump Hair Curves")
    clump.node_tree = bpy.data.node_groups["Clump Hair Curves"]
    links.new(inp.outputs["Geometry"], clump.inputs["Geometry"])
    links.new(parent, clump.inputs["Guide Index"])
    links.new(mask, clump.inputs["Guide Mask"])
    links.new(switch.outputs["Output"], clump.inputs["Factor"])
    for name, value in {"Shape":0., "Tip Spread":0., "Clump Offset":0., "Distance Falloff":0.,
                        "Distance Threshold":0., "Seed":0, "Preserve Length":True, "Existing Guide Map":True}.items():
        clump.inputs[name].default_value = value
    position = node("GeometryNodeInputPosition", "Original input point field")
    index = node("GeometryNodeInputIndex", "Stable point index")
    sample = node("GeometryNodeSampleIndex", "Sample original anchor and root points")
    sample.data_type = "FLOAT_VECTOR"; sample.domain = "POINT"; sample.clamp = False
    links.new(inp.outputs["Geometry"], sample.inputs["Geometry"])
    links.new(position.outputs["Position"], sample.inputs["Value"])
    links.new(index.outputs["Index"], sample.inputs["Index"])
    root = math("Root selection", "LESS_THAN", parameter.outputs["Factor"], 1e-7)
    lock = node("FunctionNodeBooleanMath", "Anchor or root lock"); lock.operation = "OR"
    links.new(mask, lock.inputs[0]); links.new(root, lock.inputs[1])
    pin = node("GeometryNodeSetPosition", "Pin native anchor shape and all roots")
    links.new(clump.outputs["Geometry"], pin.inputs["Geometry"])
    links.new(lock.outputs[0], pin.inputs["Selection"])
    links.new(sample.outputs["Value"], pin.inputs["Position"])
    restore = node("GeometryNodeStoreNamedAttribute", "Restore global fine guide index")
    restore.data_type = "INT"; restore.domain = "CURVE"
    restore.inputs["Name"].default_value = "guide_curve_index"
    links.new(pin.outputs["Geometry"], restore.inputs["Geometry"])
    links.new(persistent_fine, restore.inputs["Value"])
    links.new(restore.outputs["Geometry"], out.inputs["Geometry"])
    modifier = guide.modifiers.new(MODIFIER, "NODES"); modifier.node_group = tree
    return tree


def fixed_state(record):
    result = copy.deepcopy(record)
    result["objects"][COAT].pop("evaluated_positions")
    result["objects"][COAT].pop("evaluated_radii")
    guide = result["objects"][GUIDE]
    for field in ("positions", "evaluated_positions", "evaluated_radii"):
        guide.pop(field)
    guide["attributes"].pop("position")
    for field in (PARENT_ATTR, MASK_ATTR): guide["attributes"].pop(field, None)
    guide["modifiers"] = [x for x in guide["modifiers"] if x["name"] != MODIFIER]
    result["trees"].pop(TREE, None)
    return result


def update(bpy):
    guide = bpy.data.objects[GUIDE]; coat = bpy.data.objects[COAT]
    guide.data.update_tag(); guide.update_tag(); coat.update_tag(); bpy.context.view_layer.update()


def probe(bpy, helper, original, mapping, anchors, coat_mapping, coat_before):
    counts = np.bincount(mapping, minlength=len(original))
    eligible = anchors[counts[anchors] >= 2]
    parent = int(eligible[len(eligible)//2])
    fine = np.flatnonzero(mapping == parent)
    selected = np.isin(coat_mapping, fine)
    changed = original.copy(); changed[parent,5,0] += np.float32(.002)
    guide = bpy.data.objects[GUIDE]
    guide.data.position_data.foreach_set("vector", changed.ravel()); update(bpy)
    p, _ = helper["evaluated_coat"](bpy, bpy.data.objects[COAT])
    movement = np.max(np.abs(p-coat_before), axis=(1,2))
    guide.data.position_data.foreach_set("vector", original.ravel()); update(bpy)
    restored, _ = helper["evaluated_coat"](bpy, bpy.data.objects[COAT])
    if not np.any(movement[selected] > 0) or np.any(movement[~selected] > 0) or p[:,0].tobytes()!=coat_before[:,0].tobytes() or restored.tobytes()!=coat_before.tobytes():
        raise RuntimeError("Hierarchy live probe propagation/root/outside/restoration failed")
    return {"parent_gid":parent, "fine_gids":fine.tolist(), "control_index":5, "x_delta":.002,
            "actual_child_count":int(selected.sum()), "changed_child_count":int(np.count_nonzero(movement[selected])),
            "maximum_displacement":float(movement.max()), "outside_unchanged":True, "roots_unchanged":True, "restore_bitwise":True}


def main():
    import bpy
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--case", choices=tuple(CASES))
    parser.add_argument("--tag", required=True)
    parser.add_argument("--no-render", action="store_true")
    parser.add_argument("--render-saved", action="store_true")
    opt = parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    if not opt.tag or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for c in opt.tag): parser.error("File-safe tag required")
    stem = "swatch-reference-"+opt.tag
    if opt.render_saved:
        if opt.no_render: parser.error("Render and preparation are exclusive")
        for suffix in (".png", ".render.json", ".render.log"):
            if (OUT/(stem+suffix)).exists(): raise FileExistsError(stem+suffix)
        report = json.loads((OUT/(stem+".gn-report.json")).read_text(encoding="utf-8"))
        if file_sha(Path(__file__))!=report["wrapper_source_sha256"] or file_sha(OUT/(stem+".blend"))!=report["saved_blend_sha256"]: raise RuntimeError("Frozen source/blend changed")
        if opt.case and opt.case!=report["hierarchy"]["case"]: parser.error("Saved case differs")
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+".blend")))
        prefs=bpy.context.preferences.addons["cycles"].preferences; prefs.compute_device_type="OPTIX"; prefs.get_devices()
        for device in prefs.devices: device.use=device.type=="OPTIX"
        bpy.context.scene.render.filepath=str(OUT/(stem+".png"))
        started=time.perf_counter(); bpy.ops.render.render(write_still=True)
        receipt={"rendered":True,"kind":"swatch","blend":stem+".blend","png":stem+".png","seconds":time.perf_counter()-started,
                 "resolution":bpy.context.scene.render.resolution_x,"samples":bpy.context.scene.cycles.samples,
                 "blend_sha256":file_sha(OUT/(stem+".blend")),"png_sha256":file_sha(OUT/(stem+".png")),"wrapper_source_sha256":file_sha(Path(__file__))}
        write_json(OUT/(stem+".render.json"),receipt)
        with (OUT/(stem+".render.log")).open("x",encoding="utf-8") as log: log.write(json.dumps(receipt)+"\n")
        print("PLUSH_HIERARCHY_RENDER",json.dumps(receipt),flush=True); return
    if not opt.no_render or not opt.case: parser.error("Preparation requires --no-render --case")
    for suffix in (".blend", ".png", ".source.py", ".json", ".gn-report.json", ".precheck.log"):
        if (OUT/(stem+suffix)).exists(): raise FileExistsError(stem+suffix)
    hashes_before={name:file_sha(OUT/name) for name in DEPENDENCIES}
    if hashes_before!=DEPENDENCIES: raise RuntimeError("Frozen dependencies changed")
    record=runpy.run_path(str(OUT/RECORD),run_name="_frozen_scene_record")
    helper=runpy.run_path(str(OUT/GEOMETRY),run_name="_frozen_geometry_measure")
    source=Path(__file__).read_bytes(); wrapper_sha=hashlib.sha256(source).hexdigest()
    with (OUT/(stem+".source.py")).open("xb") as stream: stream.write(source)
    with (OUT/(stem+".precheck.log")).open("x",encoding="utf-8") as log:
        def event(message): print(message,flush=True);log.write(message+"\n");log.flush()
        started=time.perf_counter(); bpy.ops.wm.open_mainfile(filepath=str(OUT/(CONTROL+".blend")))
        coat=bpy.data.objects[COAT]; guide=bpy.data.objects[GUIDE]
        before=record["scene_record"](bpy,helper)
        p0,r0=helper["evaluated_coat"](bpy,coat); gp0,gr0=helper["curve_arrays"](guide.data)
        anchors,parent_mapping,mask=spatial_parents(gp0); gp=shortened_guides(gp0,mask)
        guide.data.position_data.foreach_set("vector",gp.ravel())
        for name,kind,array in ((PARENT_ATTR,"INT",parent_mapping),(MASK_ATTR,"BOOLEAN",mask)):
            attr=guide.data.attributes.new(name=name,type=kind,domain="CURVE"); attr.data.foreach_set("value",array)
        tree=build_parent_graph(bpy,guide,CASES[opt.case]); update(bpy)
        p,r=helper["evaluated_coat"](bpy,coat); gep,ger=helper["evaluated_coat"](bpy,guide)
        if gep.shape!=gp.shape or gep[:,0].tobytes()!=gp0[:,0].tobytes() or gep[mask].tobytes()!=gp0[mask].tobytes() or ger.tobytes()!=gr0.tobytes(): raise RuntimeError("Guide roots/anchors/count/radii failed")
        if p.shape!=p0.shape or p[:,0].tobytes()!=p0[:,0].tobytes() or r[:,0].tobytes()!=r0[:,0].tobytes() or not np.isfinite(p).all() or not np.isfinite(r).all() or np.any(r<0): raise RuntimeError("Coat roots/root-radius/count/finite failed")
        if gep.tobytes()==gp.tobytes() or p.tobytes()==p0.tobytes(): raise RuntimeError("Hierarchy did not change actual evaluation")
        evaluated=guide.evaluated_get(bpy.context.evaluated_depsgraph_get()).data
        fine_ids=np.empty(len(gp),np.int32); evaluated.attributes["guide_curve_index"].data.foreach_get("value",fine_ids)
        expected=np.empty(len(gp),np.int32); guide.data.attributes["pile_guide_index"].data.foreach_get("value",expected)
        if not np.array_equal(fine_ids,expected): raise RuntimeError("Parent map polluted global fine guide index")
        after=record["scene_record"](bpy,helper)
        if fixed_state(before)!=fixed_state(after): raise RuntimeError("Unexpected native/scene/original graph change")
        child_mapping=np.empty(len(p),np.int32); coat.data.attributes["pile_guide_index"].data.foreach_get("value",child_mapping); child_mapping-=len(p)
        live_probe=probe(bpy,helper,gp,parent_mapping,anchors,child_mapping,p)
        event("PLUSH_HIERARCHY_PROBE "+json.dumps(live_probe))
        if record["scene_record"](bpy,helper)!=after: raise RuntimeError("Probe did not restore complete state")
        bpy.context.scene.render.filepath=str(OUT/(stem+".png"))
        bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+".blend")),compress=True)
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+".blend")))
        if record["scene_record"](bpy,helper)!=after: raise RuntimeError("Save/reopen changed scene")
        event("PLUSH_HIERARCHY_ASSET_READY "+str(OUT/(stem+".blend"))+" wrapper_sha256="+wrapper_sha)
        counts=np.bincount(parent_mapping,minlength=len(gp))[anchors]
        childcounts=np.bincount(child_mapping,minlength=len(gp))
        parentchildren=np.bincount(parent_mapping[child_mapping],minlength=len(gp))[anchors]
        control=json.loads((OUT/(CONTROL+".gn-report.json")).read_text(encoding="utf-8"))
        inherited={k:copy.deepcopy(control[k]) for k in ("baseline_source","baseline_source_sha256","baseline_snapshot","official_asset_library","official_asset_sha256","candidate_parameters","graph","guide_assignment") if k in control}
        hashes_after={name:file_sha(OUT/name) for name in DEPENDENCIES}
        if hashes_before!=hashes_after: raise RuntimeError("Input files changed")
        report={**inherited,"status":"engineering_precheck_passed","rendered":False,"kind":"swatch","candidate_preset":"gn9-hierarchy",
                "control_asset":CONTROL,"blend":stem+".blend","png":stem+".png","resolution":768,"samples":96,
                "source_blend_sha256":DEPENDENCIES[CONTROL+".blend"],"saved_blend_sha256":file_sha(OUT/(stem+".blend")),
                "wrapper_source_snapshot":stem+".source.py","wrapper_source_sha256":wrapper_sha,
                "control_wrapper_source_snapshot":CONTROL+".source.py","control_wrapper_source_sha256":DEPENDENCIES[CONTROL+".source.py"],
                "record_helper_source_snapshot":RECORD,"record_helper_source_sha256":DEPENDENCIES[RECORD],"geometry_helper_source_snapshot":GEOMETRY,"geometry_helper_source_sha256":DEPENDENCIES[GEOMETRY],
                "changes_vs_control":["nonparent_guide_position_scale_0_72","guide_parent_map_attributes","live_official_parent_clump_modifier"],
                "study_scope":"Composite project hierarchical groom candidate; native fine shape plus real live guide preprocessing. Soft/firm differ only parent factor strength. Native coat/child mapping/all radii/UC/FA/scene/original coat graph fixed. Evaluated coat positions/radii are derived. Not Houdini/paper reproduction, arc preservation, solid-volume measurement or visual acceptance.",
                "hierarchy":{"case":opt.case,"strength":CASES[opt.case],"fine_scale":.72,"parent_count":len(anchors),"fine_count":len(gp),"child_count":len(p),
                    "anchor_ids":anchors.tolist(),"parent_mapping_attribute":PARENT_ATTR,"parent_mapping_domain":"CURVE","parent_mapping_coordinate":"actual local fine gid, Euclidean saved f32 roots promoted f64; sorted anchor nearest argmin lowest-gid tie",
                    "fps":"start0; update minimum squared Euclidean distance; selected=-1; np.argmax first tie; 900 iterations; sort selected ascending",
                    "parent_mapping_int32_sha256":helper["array_digest"](parent_mapping),"parent_mask_attribute":MASK_ATTR,"parent_mask_sha256":helper["array_digest"](mask),
                    "native_formula":"nonanchor=f32(root64+.72*(old_point64-root64)); original root bits restored; anchors all points unchanged; old rest_position unchanged",
                    "beta_formula":"s*smoothstep(clamp(t/.40,0,1))*(1-.25*smoothstep(clamp((t-.65)/.35,0,1))); anchor factor0; t=SplineParameter Factor",
                    "modifier":MODIFIER,"tree":TREE,"official_node":"ParentClump · official Clump Hair Curves","official_group":"Clump Hair Curves",
                    "parent_inputs":{"Shape":0.,"Tip Spread":0.,"Clump Offset":0.,"Distance Falloff":0.,"Distance Threshold":0.,"Seed":0,"Preserve Length":True,"Existing Guide Map":True},
                    "pin":"Sample Index POINT/FLOAT_VECTOR original GroupInput Geometry/Position/Index; SetPosition is_parent OR t<1e-7",
                    "fine_index_restore":"Store Named INT/CURVE guide_curve_index=unchanged pile_guide_index (coat count+localfine gid)",
                    "fine_per_parent":helper["summarize"](counts),"children_per_parent":helper["summarize"](parentchildren),"children_per_fine":helper["summarize"](childcounts),"parent_child_counts":parentchildren.tolist(),
                    "source_guide_positions_sha256":helper["array_digest"](gp),"evaluated_guide_positions_sha256":helper["array_digest"](gep),"guide_radii_sha256":helper["array_digest"](gr0),
                    "guide_eval_change_from_scaled_source":helper["summarize"](np.max(np.linalg.norm(gep.astype(np.float64)-gp,axis=-1),axis=1)),"live_parent_probe":live_probe},
                "guides":{"object":GUIDE,"curve_count":len(gp),"points_per_curve":gp.shape[1],"positions_float32_sha256":helper["array_digest"](gp),"evaluated_positions_float32_sha256":helper["array_digest"](gep),"radii_float32_sha256":helper["array_digest"](gr0)},
                "coat":{"object":COAT,"curve_count":len(p),"points_per_curve":p.shape[1],"evaluated":{"positions_float32_sha256":helper["array_digest"](p),"radii_float32_sha256":helper["array_digest"](r)}},
                "checks":{"inputs_before":hashes_before,"inputs_after":hashes_after,"only_authorized_changes":True,"saved_reload_state_exact":True,"guide_roots_and_anchors_bitwise":True,"evaluated_global_fine_map_exact":True,"coat_roots_and_root_radii_bitwise":True,"preparation_seconds":time.perf_counter()-started},
                "frozen_scene_state":after}
        write_json(OUT/(stem+".gn-report.json"),report)
        write_json(OUT/(stem+".json"),{"rendered":False,"kind":"swatch","preset":"gn9-hierarchy","method_report":stem+".gn-report.json","parameter_scope":"Project hierarchical guide changes are reported in method_report; original coat graph parameters retained.","blend":stem+".blend","png":stem+".png","resolution":768,"samples":96,"source_sha256":wrapper_sha})
        event("PLUSH_HIERARCHY_PRECHECK "+json.dumps({"stem":stem,"case":opt.case,"strength":CASES[opt.case],"source_sha256":wrapper_sha,"blend_sha256":report["saved_blend_sha256"],"seconds":report["checks"]["preparation_seconds"]}))


if __name__=="__main__":
    main()
