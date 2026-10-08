"""GN10: root-local compact 3D return coils, with final Clump isolation.

Saved GN8 no-flyaway is the control. Native guides alone are authored; their
sampled signed-ellipsoid crowns are retained by changing only the normal
component, never by uniformly shrinking XYZ. Same guides in both cases:
clumped retains .88; unclumped changes that existing final Clump Factor to 0.
Official Curl/Clump/Profile assets and Cycles/Chiang remain the actual pipeline.
This authored geometry is not a paper/Houdini solver or physical arc/contact
constraint. Geometric crown height is not visible softness or acceptance.
CPU prepare --case clumped|unclumped --tag NAME --no-render, then separate
--render-saved --tag NAME. Exclusive outputs; render never resaves the blend.
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
MODIFIER = "Live official hair GN · pile study"
RECORD = "swatch-reference-gn-undercoat-short-live-4.source.py"
GEOMETRY = "swatch-reference-gn-nearest-render-3.gn-source.py"
CASES = {"clumped": .88, "unclumped": 0.}
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


def smooth(value):
    v = np.clip(value, 0., 1.)
    return v*v*(3.-2.*v)


def coil_guides(original, helper):
    """Deterministic f64 authoring, f32 controls, crown-matched normal only."""
    roots = original[:,0].astype(np.float64)
    normal = roots/np.array([.64,.43,.54])**2
    normal /= np.linalg.norm(normal, axis=-1, keepdims=True)
    e1 = original[:,5].astype(np.float64)-roots
    e1 -= normal*np.sum(e1*normal, axis=-1, keepdims=True)
    norms = np.linalg.norm(e1, axis=-1, keepdims=True)
    if np.any(norms < 1e-8):
        raise RuntimeError("Frozen tangent frame degeneracy")
    e1 /= norms
    e2 = np.cross(normal,e1)
    crown = helper["sampled_height"](original)[0]
    if np.any(crown <= 1e-6):
        raise RuntimeError("Frozen control crown too small")
    proto = np.arange(len(original))%3
    t = np.linspace(0.,1.,original.shape[1])[None,:]
    u = smooth((t-.16)/.84)
    phi = np.array([5.05,5.30,5.55])[proto,None]*u
    stem = np.array([.18,.22,.20])[proto,None]
    width = np.array([.46,.52,.43])[proto,None]
    depth = np.array([.22,.27,.31])[proto,None]
    H = crown[:,None]
    x = width*H*np.sin(phi)
    y = depth*H*(1.-np.cos(phi))*np.sin(np.pi*u)
    z = H*(stem*smooth(t/.20)+(1.-stem)*.5*(1.-np.cos(phi)))
    lateral = roots[:,None]+e1[:,None]*x[...,None]+e2[:,None]*y[...,None]
    def points(scale):
        result = (lateral+normal[:,None]*(z*scale[:,None])[...,None]).astype(np.float32)
        result[:,0] = original[:,0]
        return result
    low = np.full(len(original),.15)
    high = np.full(len(original),2.)
    if np.any(helper["sampled_height"](points(low))[0] >= crown) or np.any(helper["sampled_height"](points(high))[0] <= crown):
        raise RuntimeError("Crown target not bracketed")
    for _ in range(20):
        middle = .5*(low+high)
        peak = helper["sampled_height"](points(middle))[0]
        low = np.where(peak < crown,middle,low)
        high = np.where(peak >= crown,middle,high)
    scale = .5*(low+high)
    result = points(scale)
    error = helper["sampled_height"](result)[0]-crown
    if float(np.max(np.abs(error))) > 2e-7:
        raise RuntimeError("Authored guide sampled crown mismatch")
    return result, {"normal_scale":helper["summarize"](scale),
                    "sampled_crown_error":helper["summarize"](error),
                    "sampled_crown_absolute_error_max":float(np.max(np.abs(error)))}


def fixed_state(record, factor_id, ignore_factor):
    result = copy.deepcopy(record)
    result["objects"][COAT].pop("evaluated_positions")
    result["objects"][COAT].pop("evaluated_radii")
    guide = result["objects"][GUIDE]
    guide.pop("positions")
    guide.pop("evaluated_positions")
    guide["attributes"].pop("position")
    if ignore_factor:
        item = next(n for n in result["objects"][COAT]["modifiers"] if n["name"]==MODIFIER)
        item["inputs"].pop(factor_id)
    return result


def update(bpy):
    guide = bpy.data.objects[GUIDE]
    guide.data.update_tag(); guide.update_tag()
    bpy.data.objects[COAT].update_tag(); bpy.context.view_layer.update()


def guide_shape(points, h):
    centered = points.astype(np.float64)-points.astype(np.float64).mean(axis=1,keepdims=True)
    singular = np.linalg.svd(centered,compute_uv=False)
    peak,minimum,_,below,deep,_ = h["sampled_height"](points)
    return {"crown":h["summarize"](peak),"minimum":h["summarize"](minimum),
            "best_fit_plane_rms":h["summarize"](singular[:,-1]/np.sqrt(points.shape[1])),
            "minimum_to_maximum_singular_ratio":h["summarize"](singular[:,-1]/singular[:,0]),
            "arc_order32":h["summarize"](h["catmull_rom_lengths"](points)),
            "end_to_root_distance":h["summarize"](np.linalg.norm(points[:,-1].astype(np.float64)-points[:,0],axis=-1)),
            "inside_arc_fraction_mean":float(below.mean()),"below_minus_0_001_arc_fraction_mean":float(deep.mean()),
            "scope":"Saved f32 controls, uniform Catmull-Rom duplicate endpoints. Eight GL nodes per segment for signed analytic ellipsoid height; order32 arc. Centerline geometry only; not radii/contact/visibility/softness."}


def probe(bpy, helper, original, mapping, coat_before):
    counts = np.bincount(mapping,minlength=len(original))
    eligible = np.flatnonzero(counts>=2)
    gid = int(eligible[len(eligible)//2])
    selected = mapping==gid
    changed = original.copy(); changed[gid,5,0] += np.float32(.002)
    bpy.data.objects[GUIDE].data.position_data.foreach_set("vector",changed.ravel()); update(bpy)
    p,_ = helper["evaluated_coat"](bpy,bpy.data.objects[COAT])
    movement = np.max(np.abs(p-coat_before),axis=(1,2))
    bpy.data.objects[GUIDE].data.position_data.foreach_set("vector",original.ravel()); update(bpy)
    restored,_ = helper["evaluated_coat"](bpy,bpy.data.objects[COAT])
    if not np.any(movement[selected]>0) or np.any(movement[~selected]>0) or p[:,0].tobytes()!=coat_before[:,0].tobytes() or restored.tobytes()!=coat_before.tobytes():
        raise RuntimeError("Guide live probe propagation/root/outside/restoration failed")
    return {"guide_gid":gid,"control_index":5,"x_delta":.002,
            "actual_mapped_children":int(selected.sum()),"changed_mapped_children":int(np.count_nonzero(movement[selected])),
            "maximum_displacement":float(movement.max()),"outside_unchanged":True,"roots_unchanged":True,"restore_bitwise":True}


def main():
    import bpy
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--case",choices=tuple(CASES))
    parser.add_argument("--tag",required=True)
    parser.add_argument("--no-render",action="store_true")
    parser.add_argument("--render-saved",action="store_true")
    opt = parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    if not opt.tag or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for c in opt.tag):
        parser.error("File-safe tag required")
    stem = "swatch-reference-"+opt.tag
    if opt.render_saved:
        if opt.no_render: parser.error("Render and preparation are exclusive")
        for suffix in (".png",".render.json",".render.log"):
            if (OUT/(stem+suffix)).exists(): raise FileExistsError(stem+suffix)
        report = json.loads((OUT/(stem+".gn-report.json")).read_text(encoding="utf-8"))
        if file_sha(Path(__file__))!=report["wrapper_source_sha256"] or file_sha(OUT/(stem+".blend"))!=report["saved_blend_sha256"]:
            raise RuntimeError("Frozen source/blend changed")
        if opt.case and opt.case!=report["coil"]["case"]: parser.error("Saved case differs")
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
        print("PLUSH_COMPACT_COIL_RENDER",json.dumps(receipt),flush=True); return
    if not opt.no_render or not opt.case: parser.error("Preparation requires --no-render --case")
    for suffix in (".blend",".png",".source.py",".json",".gn-report.json",".precheck.log"):
        if (OUT/(stem+suffix)).exists(): raise FileExistsError(stem+suffix)
    hashes_before={n:file_sha(OUT/n) for n in DEPENDENCIES}
    if hashes_before!=DEPENDENCIES: raise RuntimeError("Frozen dependencies changed")
    record=runpy.run_path(str(OUT/RECORD),run_name="_frozen_scene_record")
    h=runpy.run_path(str(OUT/GEOMETRY),run_name="_frozen_geometry_measure")
    source=Path(__file__).read_bytes(); wrapper_sha=hashlib.sha256(source).hexdigest()
    with (OUT/(stem+".source.py")).open("xb") as stream: stream.write(source)
    with (OUT/(stem+".precheck.log")).open("x",encoding="utf-8") as log:
        def event(message): print(message,flush=True);log.write(message+"\n");log.flush()
        started=time.perf_counter(); bpy.ops.wm.open_mainfile(filepath=str(OUT/(CONTROL+".blend")))
        coat=bpy.data.objects[COAT]; guide=bpy.data.objects[GUIDE]
        modifier=coat.modifiers[MODIFIER]
        tree=modifier.node_group; tree_name=tree.name; clump=tree.nodes["Clump Hair Curves"]
        factor_id=next(s.identifier for s in tree.interface.items_tree if s.item_type=="SOCKET" and s.in_out=="INPUT" and s.name=="Clump Factor")
        factor_link=clump.inputs["Factor"].links[0] if clump.inputs["Factor"].is_linked else None
        if factor_link is None or factor_link.from_node.type!="GROUP_INPUT" or factor_link.from_socket.identifier!=factor_id:
            raise RuntimeError("Final Clump Factor is not linked to actual modifier input")
        before=record["scene_record"](bpy,h)
        p0,r0=h["evaluated_coat"](bpy,coat); gp0,gr0=h["curve_arrays"](guide.data)
        gp,normalization=coil_guides(gp0,h)
        guide.data.position_data.foreach_set("vector",gp.ravel())
        getattr(modifier.properties.inputs,factor_id).value=CASES[opt.case]; update(bpy)
        p,r=h["evaluated_coat"](bpy,coat); gep,ger=h["evaluated_coat"](bpy,guide)
        if gep.tobytes()!=gp.tobytes() or ger.tobytes()!=gr0.tobytes() or gp[:,0].tobytes()!=gp0[:,0].tobytes() or not np.isfinite(gp).all():
            raise RuntimeError("Guide count/root/radii/native evaluation failed")
        if p.shape!=p0.shape or p[:,0].tobytes()!=p0[:,0].tobytes() or r[:,0].tobytes()!=r0[:,0].tobytes() or not np.isfinite(p).all() or not np.isfinite(r).all() or np.any(r<0):
            raise RuntimeError("Coat root/root-radius/count/finite failed")
        if p.tobytes()==p0.tobytes(): raise RuntimeError("Guides did not change actual evaluated coat")
        after=record["scene_record"](bpy,h)
        ignore_factor=opt.case=="unclumped"
        if fixed_state(before,factor_id,ignore_factor)!=fixed_state(after,factor_id,ignore_factor):
            raise RuntimeError("Unexpected native/scene/original graph change")
        mapping=np.empty(len(p),np.int32);coat.data.attributes["pile_guide_index"].data.foreach_get("value",mapping);mapping-=len(p)
        live_probe=probe(bpy,h,gp,mapping,p)
        if record["scene_record"](bpy,h)!=after: raise RuntimeError("Probe did not restore complete state")
        event("PLUSH_COMPACT_COIL_PROBE "+json.dumps(live_probe))
        guide_before=guide_shape(gp0,h); guide_after=guide_shape(gp,h)
        coat_before=guide_shape(p0,h); coat_after=guide_shape(p,h)
        event("PLUSH_COMPACT_COIL_GEOMETRY "+json.dumps({"case":opt.case,"guide_crown_before":guide_before["crown"]["median"],"guide_crown_after":guide_after["crown"]["median"],"guide_plane_rms":guide_after["best_fit_plane_rms"]["median"],"coat_crown_before":coat_before["crown"]["median"],"coat_crown_after":coat_after["crown"]["median"],"normalization":normalization}))
        bpy.context.scene.render.filepath=str(OUT/(stem+".png"))
        bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+".blend")),compress=True)
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+".blend")))
        if record["scene_record"](bpy,h)!=after: raise RuntimeError("Save/reopen changed scene")
        control=json.loads((OUT/(CONTROL+".gn-report.json")).read_text(encoding="utf-8"))
        inherited={k:copy.deepcopy(control[k]) for k in ("baseline_source","baseline_source_sha256","baseline_snapshot","official_asset_library","official_asset_sha256","candidate_parameters","graph","guide_assignment") if k in control}
        hashes_after={n:file_sha(OUT/n) for n in DEPENDENCIES}
        if hashes_before!=hashes_after: raise RuntimeError("Input files changed")
        report={**inherited,"status":"engineering_precheck_passed","rendered":False,"kind":"swatch","candidate_preset":"gn10-compact-coil",
                "control_asset":CONTROL,"blend":stem+".blend","png":stem+".png","resolution":768,"samples":96,
                "source_blend_sha256":DEPENDENCIES[CONTROL+".blend"],"saved_blend_sha256":file_sha(OUT/(stem+".blend")),
                "wrapper_source_snapshot":stem+".source.py","wrapper_source_sha256":wrapper_sha,
                "record_helper_source_snapshot":RECORD,"record_helper_source_sha256":DEPENDENCIES[RECORD],
                "geometry_helper_source_snapshot":GEOMETRY,"geometry_helper_source_sha256":DEPENDENCIES[GEOMETRY],
                "changes_vs_control":["authored_native_guide_nonroot_positions"]+(["actual_modifier_Clump_Factor_0_88_to_0"] if ignore_factor else []),
                "study_scope":"Project root-local compact 3D return coils. Compared with GN8 only native guide nonroot position changes, plus final Clump Factor for unclumped control. Identical guides in both cases. No XYZ shortening, GN9 parent graph, physical arc/contact, paper reproduction or visual acceptance claimed.",
                "coil":{"case":opt.case,"final_clump_factor":CASES[opt.case],"tree":tree_name,"clump_node":"Clump Hair Curves","factor_modifier_identifier":factor_id,"factor_is_linked_from_group_input":True,
                        "frame":"root=f64(savedf32);n=unit(root/[.64,.43,.54]^2);e1=unit(project(oldcontrol5-root,on tangent));e2=cross(n,e1)",
                        "prototype":"guide index modulo3","phase_end":[5.05,5.30,5.55],"width":[.46,.52,.43],"depth":[.22,.27,.31],"stem":[.18,.22,.20],
                        "formula":"t=linspace(0,1,12);u=smoothstep(clamp((t-.16)/.84));phi=phase[gid%3]*u;H=sampled GN8 crown;x=width*H*sin(phi);y=depth*H*(1-cos(phi))*sin(pi*u);z=H*(stem*smoothstep(clamp(t/.20))+(1-stem)*.5*(1-cos(phi)));g=f32(root+e1*x+e2*y+n*z*scale);restore rootbits",
                        "normalization":"Per-guide normal-only scale bracket .15..2, 20 bisections against same frozen sampled signed-ellipsoid crown. f32 evaluated each iteration; maxabs target tolerance2e-7 scene unit. x/y unchanged; no output arc preservation.",
                        **normalization,"live_guide_probe":live_probe},
                "guides":{"object":GUIDE,"curve_count":len(gp),"points_per_curve":gp.shape[1],"positions_float32_sha256":h["array_digest"](gp),"radii_float32_sha256":h["array_digest"](gr0),"control_shape":guide_before,"authored_shape":guide_after,
                          "arc_ratio_to_control":h["summarize"](h["catmull_rom_lengths"](gp)/h["catmull_rom_lengths"](gp0))},
                "coat":{"object":COAT,"curve_count":len(p),"points_per_curve":p.shape[1],"positions_float32_sha256":h["array_digest"](p),"radii_float32_sha256":h["array_digest"](r),"control_shape":coat_before,"evaluated_shape":coat_after,
                        "changed_curve_count":int(np.count_nonzero(np.any(p!=p0,axis=(1,2)))),"arc_ratio_to_control":h["summarize"](h["catmull_rom_lengths"](p)/h["catmull_rom_lengths"](p0))},
                "checks":{"inputs_before":hashes_before,"inputs_after":hashes_after,"only_authorized_changes":True,"saved_reload_state_exact":True,"guide_root_bits_exact":True,"coat_roots_and_root_radii_bitwise":True,"preparation_seconds":time.perf_counter()-started},
                "frozen_scene_state":after,"render_receipt":stem+".render.json"}
        write_json(OUT/(stem+".gn-report.json"),report)
        write_json(OUT/(stem+".json"),{"rendered":False,"kind":"swatch","preset":"gn10-compact-coil","method_report":stem+".gn-report.json","blend":stem+".blend","png":stem+".png","resolution":768,"samples":96,"source_sha256":wrapper_sha,"parameter_scope":report["study_scope"]})
        event("PLUSH_COMPACT_COIL_ASSET_READY "+json.dumps({"blend":stem+".blend","blend_sha256":report["saved_blend_sha256"],"wrapper_sha256":wrapper_sha,"case":opt.case,"rendered":False}))


if __name__=="__main__":
    main()
