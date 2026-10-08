"""GN5: saved GN4, only the outer Restore Curve Segment Length Factor 1 -> 0.

Clump's internal Preserve Length stays enabled. No groom regeneration, guide
change or rest-length guarantee. CPU: --no-render; GPU later: --render-saved.
All outputs exclusive; the engineering report stays rendered:false, and an
actual render writes its separate receipt. This is not visual acceptance.
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
CONTROL = "swatch-reference-gn-undercoat-short-live-4"
STEM = "swatch-reference-gn-restore-off-5"
TREE = "PLUSH Live Official Hair · pile study"
NODE = "Restore Curve Segment Length"
COAT = "Blue pile · coat"
RECORD_HELPER_SHA = "5b1d9049cec289828a6e354ce334d37873fa8343c4f5a0aa848315732125609c"
GEOMETRY_HELPER = "swatch-reference-gn-nearest-render-3.gn-source.py"
GEOMETRY_HELPER_SHA = "be7730c0ddba22109ebc31dd44e8660672df7fd2cb8d361093688ce9fcc2c927"


def file_sha(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def write_json(path, value):
    with path.open("x", encoding="utf-8") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)


def fixed_state(record, socket_id):
    result = copy.deepcopy(record)
    result["objects"][COAT].pop("evaluated_positions")
    node = next(n for n in result["trees"][TREE]["nodes"] if n["name"] == NODE)
    item = next(item for item in node["inputs"] if item[0] == socket_id)
    item[1] = "allowed_Factor_change"
    return result


def stage_diagnostic(input_hashes):
    """Previously measured actual GN4 in a no-save/no-render CPU process."""
    temp = Path("C:/Users/yun68/AppData/Local/Temp/plush_gn4_stage_readonly.py")
    return {"scope": "Read-only actual saved GN4 stage evaluation; root output links changed only in memory, restored, no blend save/render. Not opacity/pixel occlusion.",
            "inputs_sha256": input_hashes, "measurement_input_sha_unchanged": True,
            "measurement_script": str(temp), "measurement_script_sha256": file_sha(temp),
            "method": {"ellipsoid_half_axes": [.64, .43, .54], "height": "(sum((p/axes)^2)-1)/(2*norm(p/axes^2))",
                       "curve_samples": "Eight Gauss-Legendre samples on every uniform Catmull-Rom segment, duplicated endpoint controls; curve crown=max sampled height",
                       "bypass": "Temporarily connect outer Group Output Geometry to each official group's geometry output. Joined output coat first85000 then2657 guides; take first85000 for coat. Restore original output link at end.",
                       "normal_profile": "At 12 saved controls, dot(point-root, normalized(root/axes^2)); summarized median per control",
                       "root_tangent": "normalized(control1-control0) dot normalized(root/axes^2)"},
            "raw_guides": {"count": 2657, "crown_median": .01862271539568429, "crown_p95": .02298751206465578,
                           "below_minus_0_001_fraction": 0., "root_tangent_normal_dot_median": .9609634628823615,
                           "root_local_normal_height_control_median": [0., .004773254018604659, .009121642211389195, .012653197893379244, .015042205095738427, .016126030853311275, .016002177232646422, .01688688481592352, .01653312973642795, .014176669472089063, .0114335376687157, .008690436722186168]},
            "coat_stages": {
                "Curl Hair Curves": {"crown_median": .021260510723226267, "below_minus_0_001_fraction": 0., "deep_arc_fraction_mean": 0., "arc_mean_order8": .03922611413984708},
                "Clump Hair Curves": {"crown_median": .01616611159151194, "below_minus_0_001_fraction": .0032941176470588237, "deep_arc_fraction_mean": .00009300619245604708, "arc_mean_order8": .039204551661996906},
                "Restore Curve Segment Length": {"crown_median": .013165960307003339, "below_minus_0_001_fraction": .4451764705882353, "deep_arc_fraction_mean": .07354615605709192, "arc_mean_order8": .04012902284449533},
                "Set Hair Curve Profile": {"crown_median": .013165960307003339, "below_minus_0_001_fraction": .4451764705882353, "deep_arc_fraction_mean": .07354615605709192}},
            "official_internal_evidence": {"Restore Curve Segment Length": "Current Curve Segment Direction scaled by Mix(current segment length, Reference Position adjacent-point distance, Factor); Accumulate Field Leading, root position, optional pinned translation. No surface constraint in this tree.",
                                           "Clump Hair Curves": "Mix current Position toward sampled guide Position plus root/frame offsets; its own Restore Curve Segment Length is selected by Preserve Length, using captured pre-clump position as reference.",
                                           "Curl Hair Curves": "Sample guide by current Spline Parameter Length, combine guide-position difference with rotating frame offset, apply along-length Factor as Set Position Offset."},
            "limitations": "First-order signed analytic ellipsoid height, not strict closest projection or pixel occlusion. Stage sampling includes native joined guides; final root lock is separately verified in GN5. This diagnosis does not promise thick reference curls."}


def main():
    import bpy
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--no-render", action="store_true")
    parser.add_argument("--render-saved", action="store_true")
    opt = parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    if opt.render_saved:
        if opt.no_render:
            parser.error("--no-render and --render-saved are exclusive")
        for suffix in (".png", ".render.json", ".render.log"):
            if (OUT/(STEM+suffix)).exists():
                raise FileExistsError(STEM+suffix)
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(STEM+".blend")))
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "OPTIX"
        prefs.get_devices()
        for device in prefs.devices:
            device.use = device.type == "OPTIX"
        bpy.context.scene.render.filepath = str(OUT/(STEM+".png"))
        start = time.perf_counter()
        bpy.ops.render.render(write_still=True)
        receipt = {"rendered": True, "kind": "swatch", "blend": STEM+".blend", "png": STEM+".png", "seconds": time.perf_counter()-start,
                   "resolution": bpy.context.scene.render.resolution_x, "samples": bpy.context.scene.cycles.samples,
                   "blend_sha256": file_sha(OUT/(STEM+".blend")), "png_sha256": file_sha(OUT/(STEM+".png")),
                   "wrapper_source_sha256": file_sha(Path(__file__))}
        write_json(OUT/(STEM+".render.json"), receipt)
        with (OUT/(STEM+".render.log")).open("x", encoding="utf-8") as log:
            log.write(json.dumps(receipt)+"\n")
        print("PLUSH_RESTORE_OFF_RENDER", json.dumps(receipt), flush=True)
        return
    if not opt.no_render:
        parser.error("CPU preparation requires --no-render; GPU later --render-saved")
    for suffix in (".blend", ".png", ".source.py", ".json", ".gn-report.json", ".precheck.log", ".stage-diagnostic.json"):
        if (OUT/(STEM+suffix)).exists():
            raise FileExistsError(STEM+suffix)
    record_path = OUT/(CONTROL+".source.py")
    geom_path = OUT/GEOMETRY_HELPER
    if file_sha(record_path) != RECORD_HELPER_SHA or file_sha(geom_path) != GEOMETRY_HELPER_SHA:
        raise RuntimeError("Frozen read helpers changed")
    record_helper = runpy.run_path(str(record_path), run_name="_frozen_gn4_record_helper")
    helper = runpy.run_path(str(geom_path), run_name="_frozen_gn3_geometry_helper")
    watched = [OUT/(CONTROL+suffix) for suffix in (".blend", ".source.py", ".json", ".gn-report.json")]+[geom_path]
    hashes_before = {str(p): file_sha(p) for p in watched}
    source = Path(__file__).read_bytes()
    with (OUT/(STEM+".source.py")).open("xb") as stream:
        stream.write(source)
    with (OUT/(STEM+".precheck.log")).open("x", encoding="utf-8") as log:
        def event(message):
            print(message, flush=True)
            log.write(message+"\n")
            log.flush()
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(CONTROL+".blend")))
        event("Loaded saved GN4; no regeneration")
        coat = bpy.data.objects[COAT]
        before = record_helper["scene_record"](bpy, helper)
        old_p, old_r = helper["evaluated_coat"](bpy, coat)
        rest, native_r = helper["curve_arrays"](coat.data)
        tree = coat.modifiers["Live official hair GN · pile study"].node_group
        socket = tree.nodes[NODE].inputs["Factor"]
        if socket.is_linked or socket.default_value != 1.:
            raise RuntimeError("GN4 external Restore Factor is not unlinked 1")
        if tree.nodes["Clump Hair Curves"].inputs["Preserve Length"].default_value is not True:
            raise RuntimeError("Clump internal length preservation changed")
        socket_id = socket.identifier
        socket.default_value = 0.
        tree.update_tag()
        coat.update_tag()
        bpy.context.view_layer.update()
        after = record_helper["scene_record"](bpy, helper)
        if fixed_state(before, socket_id) != fixed_state(after, socket_id):
            raise RuntimeError("Unexpected native/scene/evaluated-radius change outside Restore Factor")
        new_p, new_r = helper["evaluated_coat"](bpy, coat)
        if new_p[:, 0].tobytes() != rest[:, 0].tobytes() or new_r.tobytes() != old_r.tobytes() or new_p.shape != old_p.shape or not np.isfinite(new_p).all():
            raise RuntimeError("Root/radius/count/finite verification failed")
        if new_p.tobytes() == old_p.tobytes():
            raise RuntimeError("Restore Factor0 did not change evaluated coat")
        bpy.context.scene.render.filepath = str(OUT/(STEM+".png"))
        bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(STEM+".blend")), compress=True)
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(STEM+".blend")))
        if record_helper["scene_record"](bpy, helper) != after:
            raise RuntimeError("Saved/reloaded state changed")
        wrapper_sha = hashlib.sha256(source).hexdigest()
        event("PLUSH_RESTORE_OFF_ASSET_READY "+str(OUT/(STEM+".blend"))+" wrapper_sha256="+wrapper_sha)
        arc_before = helper["catmull_rom_lengths"](old_p)
        arc_after = helper["catmull_rom_lengths"](new_p)
        arc_rest = helper["catmull_rom_lengths"](rest)
        segments_rest = np.linalg.norm(np.diff(rest.astype(np.float64),axis=1),axis=-1)
        segments_after = np.linalg.norm(np.diff(new_p.astype(np.float64),axis=1),axis=-1)
        control = json.loads((OUT/(CONTROL+".gn-report.json")).read_text(encoding="utf-8"))
        inherited = {k: control[k] for k in ("baseline_source", "baseline_source_sha256", "baseline_snapshot", "official_asset_library", "official_asset_sha256", "candidate_parameters", "guides", "graph", "guide_assignment", "noncoat")}
        inherited["graph"]["official_inputs"][NODE]["Factor"] = 0.
        delta = np.linalg.norm(new_p.astype(np.float64)-old_p.astype(np.float64),axis=-1)
        coat_report = {"native_component": "Curves", "curve_count": len(new_p), "points_per_curve": new_p.shape[1], "finite": True,
                       "root_bits_equal_frozen_v3": True, "root_error_max": 0.,
                       "input_positions_float32_sha256": helper["array_digest"](rest), "evaluated_positions_float32_sha256": helper["array_digest"](new_p),
                       "evaluated_radii_float32_sha256": helper["array_digest"](new_r), "radius_root": helper["summarize"](new_r[:,0]),
                       "radius_tip": helper["summarize"](new_r[:,-1]), "tip_to_root_radius_ratio": helper["summarize"](new_r[:,-1]/new_r[:,0]),
                       "change_from_gn4": helper["summarize"](delta),
                       "arc_length": {"basis": "Uniform Catmull-Rom duplicate endpoints model; float32 controls promoted float64, not engine arc", "quadrature_order": 32,
                                      "control_gn4": helper["summarize"](arc_before), "input_rest": helper["summarize"](arc_rest), "evaluated": helper["summarize"](arc_after),
                                      "absolute_relative_change_from_rest": helper["summarize"](np.abs(arc_after/arc_rest-1)),
                                      "relative_change_from_gn4": helper["summarize"](arc_after/arc_before-1),
                                      "constraint_scope": "External Restore Factor0 does not enforce original straight-rest control-segment lengths or Catmull-Rom arc. Clump internal Preserve Length remains true and uses its own pre-clump reference."},
                       "control_segment_relative_change_from_rest": helper["summarize"](segments_after/segments_rest-1)}
        hashes_after = {str(p): file_sha(p) for p in watched}
        if hashes_before != hashes_after:
            raise RuntimeError("Input files changed")
        report = {**inherited, "status": "engineering_precheck_passed", "rendered": False, "kind": "swatch", "candidate_preset": "gn5", "control_asset": CONTROL,
                  "blend": STEM+".blend", "png": STEM+".png", "resolution": bpy.context.scene.render.resolution_x, "samples": bpy.context.scene.cycles.samples,
                  "source_blend_sha256": hashes_before[str(OUT/(CONTROL+".blend"))], "wrapper_source_snapshot": STEM+".source.py", "wrapper_source_sha256": wrapper_sha,
                  "record_helper_source_snapshot": CONTROL+".source.py", "record_helper_source_sha256": RECORD_HELPER_SHA,
                  "control_wrapper_source_snapshot": CONTROL+".source.py", "control_wrapper_source_sha256": RECORD_HELPER_SHA,
                  "geometry_helper_source_snapshot": GEOMETRY_HELPER, "geometry_helper_source_sha256": GEOMETRY_HELPER_SHA,
                  "changes_vs_control": ["external_restore_factor"], "study_scope": "One change from saved GN4: outer Restore Factor1->0 only. UC.35, guides, native coat/mapping/radii/count, all other nodes/modifier settings/material/camera/light fixed. No claim of visual reference match.",
                  "restore_change": {"node_group": TREE, "node": NODE, "socket": "Factor", "socket_identifier": socket_id, "before": 1., "after": 0., "clump_preserve_length": True},
                  "coat": coat_report, "checks": {"only_restore_factor_and_evaluated_coat_positions_changed": True, "native_data_exact": True, "roots_bits_exact": True,
                                                   "evaluated_radii_bits_exact": True, "saved_reload_state_exact": True, "finite": True,
                                                   "input_hashes_before": hashes_before, "input_hashes_after": hashes_after},
                  "height_profile_diagnostic": helper["height_profile_diagnostic"](bpy), "render_receipt": STEM+".render.json"}
        write_json(OUT/(STEM+".gn-report.json"), report)
        write_json(OUT/(STEM+".stage-diagnostic.json"), stage_diagnostic(hashes_before))
        write_json(OUT/(STEM+".json"), {"kind": "swatch", "rendered": False, "blend": STEM+".blend", "png": STEM+".png", "resolution": report["resolution"], "samples": report["samples"],
                    "control_asset": CONTROL, "source_blend_sha256": report["source_blend_sha256"], "source_snapshot": STEM+".source.py", "source_sha256": wrapper_sha,
                    "method_report": STEM+".gn-report.json", "render_receipt": STEM+".render.json", "parameter_scope": report["study_scope"]})
        event("PLUSH_RESTORE_OFF_PRECHECK_PASS "+json.dumps({"report": STEM+".gn-report.json", "wrapper_sha256": wrapper_sha, "rendered": False}))


if __name__ == "__main__":
    main()
