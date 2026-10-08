"""GN7 authored spatial return-crown guides on frozen saved GN5.

Only editable guide non-root positions change. The existing live official
pipeline, historical rest_position attributes, all roots/radii/counts/mapping,
native coat, other layers, camera/lights/material stay fixed. This project
authored groom is not a paper/Houdini reproduction or official preset output.
CPU --no-render --amplitude .08|.16 --tag gn-crown-008-live-7 (or016).
GPU later --render-saved --tag same_tag. Existing outputs never replaced.
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
CONTROL = "swatch-reference-gn-restore-off-live-5"
COAT = "Blue pile · coat"
GUIDE = "Pile guides · editable live input"
MODIFIER = "Live official hair GN · pile study"
RECORD_HELPER = "swatch-reference-gn-undercoat-short-live-4.source.py"
GEOMETRY_HELPER = "swatch-reference-gn-nearest-render-3.gn-source.py"
CLOUD_HELPER = "swatch-reference-gn-tip-spread-006-live2-6.source.py"
DEPENDENCIES = {
    CONTROL+".blend": "782f8f4e718b944223527b7bf47126fab74bc9f578a45c2634223526afc410ed",
    CONTROL+".source.py": "55bb71225b66485972ecf1fa693ba9d06baff28e827135413fd81549dcc30abf",
    CONTROL+".gn-report.json": "ee182aaaf09a818839cf2cfcc8f301014613b6b7184279d7128c35213b66e486",
    RECORD_HELPER: "5b1d9049cec289828a6e354ce334d37873fa8343c4f5a0aa848315732125609c",
    GEOMETRY_HELPER: "be7730c0ddba22109ebc31dd44e8660672df7fd2cb8d361093688ce9fcc2c927",
    CLOUD_HELPER: "56f0991c6b40aec0efe72065ddc3ebdf9b0030ec189eedc454eee97b56c8f06d",
}


def file_sha(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def write_json(path, value):
    with path.open("x", encoding="utf-8") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)


def fixed_state(record):
    result = copy.deepcopy(record)
    result["objects"][COAT].pop("evaluated_positions")
    result["objects"][COAT].pop("evaluated_radii")
    guide = result["objects"][GUIDE]
    guide.pop("positions")
    guide.pop("evaluated_positions")
    guide["attributes"].pop("position")
    return result


def crown_guides(original, amplitude, helper):
    """Frozen float32 roots/control5 frames, no RNG or arc normalization."""
    roots = original[:,0].astype(np.float64)
    axes = np.array([.64,.43,.54])
    n = roots/(axes*axes)
    n /= np.linalg.norm(n,axis=-1,keepdims=True)
    e1 = original[:,5].astype(np.float64)-roots
    e1 -= n*np.sum(e1*n,axis=-1,keepdims=True)
    norm = np.linalg.norm(e1,axis=-1,keepdims=True)
    if np.any(norm < 1e-8):
        raise RuntimeError("Frozen guide control5 has degenerate tangent projection")
    e1 /= norm
    e2 = np.cross(n,e1)
    lengths = helper["catmull_rom_lengths"](original)
    prototype = np.arange(len(original))%3
    theta = np.array([.80,.92,.86])[prototype,None]
    frequency = np.array([1.10,1.35,1.60])[prototype,None]
    t = np.linspace(0,1,original.shape[1])[None,:]
    L = lengths[:,None]
    x = .10*L*(1-np.cos(1.55*np.pi*t))
    y = amplitude*L*np.sin(frequency*np.pi*t)*np.sin(np.pi*t)
    z = L*(.58*np.sin(theta*np.pi*t)+.12*t)
    result = (roots[:,None]+e1[:,None]*x[...,None]+e2[:,None]*y[...,None]+n[:,None]*z[...,None]).astype(np.float32)
    result[:,0] = original[:,0]
    return result, lengths


def guide_shape(points, helper):
    centered = points.astype(np.float64)-np.mean(points.astype(np.float64),axis=1,keepdims=True)
    singular = np.linalg.svd(centered,compute_uv=False)
    peak,minimum,arc,below,deep,_ = helper["sampled_height"](points)
    n = points[:,0].astype(np.float64)/np.array([.64,.43,.54])**2
    n /= np.linalg.norm(n,axis=-1,keepdims=True)
    tangent = points[:,1].astype(np.float64)-points[:,0].astype(np.float64)
    tangent /= np.linalg.norm(tangent,axis=-1,keepdims=True)
    return {"scope": "Saved float32 authored guide controls; best-fit plane RMS=Smin/sqrt(control_count), centered SVD; sampled signed analytic ellipsoid height, not pixel visibility.",
            "best_fit_plane_rms": helper["summarize"](singular[:,-1]/np.sqrt(points.shape[1])),
            "minimum_to_maximum_singular_ratio": helper["summarize"](singular[:,-1]/singular[:,0]),
            "crown_height": helper["summarize"](peak), "below_minus_0_001_fraction": float(np.mean(minimum<-.001)),
            "first_segment_normal_dot": helper["summarize"](np.sum(tangent*n,axis=-1)),
            "arc_length_order32": helper["summarize"](helper["catmull_rom_lengths"](points))}


def main():
    import bpy
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--amplitude",type=float,choices=(.08,.16))
    parser.add_argument("--tag",required=True)
    parser.add_argument("--no-render",action="store_true")
    parser.add_argument("--render-saved",action="store_true")
    opt = parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    if not opt.tag or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for c in opt.tag):
        parser.error("--tag must be a nonempty file-safe name")
    stem = "swatch-reference-"+opt.tag
    if opt.render_saved:
        if opt.no_render:
            parser.error("--render-saved and --no-render are exclusive")
        for suffix in (".png",".render.json",".render.log"):
            if (OUT/(stem+suffix)).exists():
                raise FileExistsError(stem+suffix)
        report = json.loads((OUT/(stem+".gn-report.json")).read_text(encoding="utf-8"))
        if file_sha(Path(__file__)) != report["wrapper_source_sha256"] or file_sha(OUT/(stem+".blend")) != report["saved_blend_sha256"]:
            raise RuntimeError("Frozen source or saved scene changed")
        if opt.amplitude is not None and opt.amplitude != report["guide_change"]["amplitude"]:
            parser.error("Amplitude differs from saved case")
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+".blend")))
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type="OPTIX"
        prefs.get_devices()
        for device in prefs.devices:
            device.use=device.type=="OPTIX"
        bpy.context.scene.render.filepath=str(OUT/(stem+".png"))
        started=time.perf_counter()
        bpy.ops.render.render(write_still=True)
        receipt={"rendered":True,"kind":"swatch","blend":stem+".blend","png":stem+".png","seconds":time.perf_counter()-started,
                 "resolution":bpy.context.scene.render.resolution_x,"samples":bpy.context.scene.cycles.samples,
                 "blend_sha256":file_sha(OUT/(stem+".blend")),"png_sha256":file_sha(OUT/(stem+".png")),"wrapper_source_sha256":file_sha(Path(__file__))}
        write_json(OUT/(stem+".render.json"),receipt)
        with (OUT/(stem+".render.log")).open("x",encoding="utf-8") as log:
            log.write(json.dumps(receipt)+"\n")
        print("PLUSH_STRUCTURAL_GROOM_RENDER",json.dumps(receipt),flush=True)
        return
    if not opt.no_render or opt.amplitude is None:
        parser.error("Preparation requires --no-render --amplitude .08|.16")
    for suffix in (".blend",".png",".source.py",".json",".gn-report.json",".precheck.log"):
        if (OUT/(stem+suffix)).exists():
            raise FileExistsError(stem+suffix)
    hashes_before={str(OUT/name):file_sha(OUT/name) for name in DEPENDENCIES}
    if any(hashes_before[str(OUT/name)]!=expected for name,expected in DEPENDENCIES.items()):
        raise RuntimeError("Frozen dependency SHA changed")
    record_helper=runpy.run_path(str(OUT/RECORD_HELPER),run_name="_frozen_scene_record")
    helper=runpy.run_path(str(OUT/GEOMETRY_HELPER),run_name="_frozen_geometry_measure")
    cloud_helper=runpy.run_path(str(OUT/CLOUD_HELPER),run_name="_frozen_cloud_measure")
    source=Path(__file__).read_bytes()
    with (OUT/(stem+".source.py")).open("xb") as stream:
        stream.write(source)
    with (OUT/(stem+".precheck.log")).open("x",encoding="utf-8") as log:
        def event(message):
            print(message,flush=True);log.write(message+"\n");log.flush()
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(CONTROL+".blend")))
        coat=bpy.data.objects[COAT];guide=bpy.data.objects[GUIDE]
        before=record_helper["scene_record"](bpy,helper)
        p0,r0=helper["evaluated_coat"](bpy,coat)
        gp0,gr=helper["curve_arrays"](guide.data)
        rest,native_r=helper["curve_arrays"](coat.data)
        gp,old_lengths=crown_guides(gp0,opt.amplitude,helper)
        if not np.isfinite(gp).all() or gp[:,0].tobytes()!=gp0[:,0].tobytes():
            raise RuntimeError("Authored guide finite/root check failed")
        shape_before=guide_shape(gp0,helper);shape_after=guide_shape(gp,helper)
        event("PLUSH_STRUCTURAL_GUIDE_PRECHECK "+json.dumps({"amplitude":opt.amplitude,"old_crown_median":shape_before["crown_height"]["median"],"new_crown_median":shape_after["crown_height"]["median"],"new_plane_rms_median":shape_after["best_fit_plane_rms"]["median"],"new_root_normal_dot_median":shape_after["first_segment_normal_dot"]["median"]}))
        guide.data.position_data.foreach_set("vector",gp.ravel())
        guide.data.update_tag();guide.update_tag();coat.update_tag();bpy.context.view_layer.update()
        after=record_helper["scene_record"](bpy,helper)
        if fixed_state(before)!=fixed_state(after):
            raise RuntimeError("Unexpected change beyond guide position and derived coat")
        p,r=helper["evaluated_coat"](bpy,coat)
        if p.shape!=p0.shape or p[:,0].tobytes()!=rest[:,0].tobytes() or r[:,0].tobytes()!=r0[:,0].tobytes() or not np.isfinite(p).all() or not np.isfinite(r).all() or np.any(r<0.):
            raise RuntimeError("Evaluated root/root-radius/count/finite verification failed")
        if p.tobytes()==p0.tobytes():
            raise RuntimeError("Authored guides did not change live evaluated coat")
        bpy.context.scene.render.filepath=str(OUT/(stem+".png"))
        bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+".blend")),compress=True)
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+".blend")))
        if record_helper["scene_record"](bpy,helper)!=after:
            raise RuntimeError("Saved/reloaded scene changed")
        wrapper_sha=hashlib.sha256(source).hexdigest()
        event("PLUSH_STRUCTURAL_GROOM_ASSET_READY "+str(OUT/(stem+".blend"))+" wrapper_sha256="+wrapper_sha)
        control=json.loads((OUT/(CONTROL+".gn-report.json")).read_text(encoding="utf-8"))
        inherited={k:copy.deepcopy(control[k]) for k in ("baseline_source","baseline_source_sha256","baseline_snapshot","official_asset_library","official_asset_sha256","candidate_parameters","graph","guide_assignment","noncoat")}
        arc=helper["catmull_rom_lengths"](p);arc0=helper["catmull_rom_lengths"](p0);new_guide_lengths=helper["catmull_rom_lengths"](gp)
        mapping=np.empty(len(p),dtype=np.int32)
        bpy.data.objects[COAT].data.attributes["pile_guide_index"].data.foreach_get("value",mapping)
        mapping-=len(p)
        hashes_after={str(OUT/name):file_sha(OUT/name) for name in DEPENDENCIES}
        if hashes_before!=hashes_after:
            raise RuntimeError("Frozen inputs changed")
        report={**inherited,"status":"engineering_precheck_passed","rendered":False,"kind":"swatch","candidate_preset":"gn7","control_asset":CONTROL,
                "blend":stem+".blend","png":stem+".png","resolution":bpy.context.scene.render.resolution_x,"samples":bpy.context.scene.cycles.samples,
                "source_blend_sha256":DEPENDENCIES[CONTROL+".blend"],"saved_blend_sha256":file_sha(OUT/(stem+".blend")),"wrapper_source_snapshot":stem+".source.py","wrapper_source_sha256":wrapper_sha,
                "control_wrapper_source_snapshot":CONTROL+".source.py","control_wrapper_source_sha256":DEPENDENCIES[CONTROL+".source.py"],
                "record_helper_source_snapshot":RECORD_HELPER,"record_helper_source_sha256":DEPENDENCIES[RECORD_HELPER],"geometry_helper_source_snapshot":GEOMETRY_HELPER,"geometry_helper_source_sha256":DEPENDENCIES[GEOMETRY_HELPER],
                "changes_vs_control":["authored_guide_positions"],"study_scope":"Project-authored compact upright spatial return crowns, only native guide positions changed. Historical guide rest_position staysGN5 with external Restore0. Native coat/mapping/all radii/other layers/scene/official pipeline fixed; evaluated coat positions/radii derived. Not a paper/Houdini reproduction, length constraint or visual match.",
                "guide_change":{"mode":"authored_spatial_return_crowns","amplitude":opt.amplitude,"object":GUIDE,"allowed_native_attributes":["position"],"historical_rest_position":"GN5 unchanged; external RestoreFactor0 and unchanged roots do not enforce its historical segment lengths",
                                "frame":"n=unit(root/axes^2),axes=.64/.43/.54;e1=unit((old_control5-root)-n*dot(old_control5-root,n));e2=cross(n,e1)",
                                "scale":"L=order32 uniform Catmull-Rom length of each old savedfloat32 guide,duplicate endpoints; no output arc normalization",
                                "formula":"g=root+e1*.10L(1-cos(1.55*pi*t))+e2*amplitude*L*sin(f*pi*t)*sin(pi*t)+n*L(.58sin(theta*pi*t)+.12t);castfloat32;root originalbits restored",
                                "t":"linspace(0,1,12)","prototype":"guide_index modulo3","theta":[.80,.92,.86],"frequency":[1.10,1.35,1.60],
                                "before_positions_float32_sha256":helper["array_digest"](gp0),"after_positions_float32_sha256":helper["array_digest"](gp),"radii_float32_sha256":helper["array_digest"](gr)},
                "guides":{"object":GUIDE,"curve_count":len(gp),"points_per_curve":gp.shape[1],"positions_float32_sha256":helper["array_digest"](gp),"control_shape":shape_before,"authored_shape":shape_after,
                          "arc_ratio_to_control":helper["summarize"](new_guide_lengths/old_lengths),"budget_scope":"Measured only; not normalized or constrained to control length"},
                "coat":{"native_component":"Curves","curve_count":len(p),"points_per_curve":p.shape[1],"finite":True,"root_bits_equal_frozen_v3":True,"root_error_max":0.,
                        "input_positions_float32_sha256":helper["array_digest"](rest),"evaluated_positions_float32_sha256":helper["array_digest"](p),"evaluated_radii_float32_sha256":helper["array_digest"](r),
                        "radius_root":helper["summarize"](r[:,0]),"radius_tip":helper["summarize"](r[:,-1]),"tip_to_root_radius_ratio":helper["summarize"](r[:,-1]/r[:,0]),
                        "evaluated_radius_response":{"scope":"Derived unchanged Profile evaluation on changed spline parameter","changed_point_fraction":float(np.mean(r!=r0)),"root_bits_equal":True},
                        "arc_length":{"basis":"Uniform Catmull-Rom duplicate endpoints model on float32 controls promotedfloat64; not engine arc","quadrature_order":32,"evaluated":helper["summarize"](arc),"control_gn5":helper["summarize"](arc0),"relative_change_from_control":helper["summarize"](arc/arc0-1),"constraint_scope":"No historical rest arc constraint; Clump internal Preserve Length remains true with its own pre-clump reference"}},
                "checks":{"only_guide_positions_and_derived_coat_changed":True,"guide_root_bits_exact":True,"native_radii_and_all_other_attributes_exact":True,"coat_roots_bits_exact":True,"coat_root_radii_bits_exact":True,"finite":True,"saved_reload_state_exact":True,"input_hashes_before":hashes_before,"input_hashes_after":hashes_after},
                "child_center_clouds":cloud_helper["slice_clouds"](p,gp,mapping,helper),"height_profile_diagnostic":helper["height_profile_diagnostic"](bpy),"render_receipt":stem+".render.json"}
        write_json(OUT/(stem+".gn-report.json"),report)
        write_json(OUT/(stem+".json"),{"kind":"swatch","rendered":False,"blend":stem+".blend","png":stem+".png","resolution":report["resolution"],"samples":report["samples"],"control_asset":CONTROL,
                    "source_blend_sha256":report["source_blend_sha256"],"source_snapshot":stem+".source.py","source_sha256":wrapper_sha,"method_report":stem+".gn-report.json","render_receipt":stem+".render.json","parameter_scope":report["study_scope"]})
        event("PLUSH_STRUCTURAL_GROOM_PRECHECK_PASS "+json.dumps({"report":stem+".gn-report.json","amplitude":opt.amplitude,"wrapper_sha256":wrapper_sha,"rendered":False}))


if __name__=="__main__":
    main()
