"""GN6 controlled Tip Spread study on saved GN5, without regenerating groom.

CPU: --no-render --value .006|.009 --tag gn-tip-spread-006-live-6 (or 009).
Later GPU: --render-saved --tag same_tag. Existing outputs never overwritten.
Only modifier Tip Spread is changed; evaluated coat position/radius responses
are derived by the unchanged official graph. Native data and scene stay fixed.
Tip Spread scales a random guide-frame offset in scene coordinates, not a
dimensionless root-offset fraction. No volume/length/visual-match guarantee.
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
MODIFIER = "Live official hair GN · pile study"
SOCKET = "Socket_8"
RECORD_HELPER = "swatch-reference-gn-undercoat-short-live-4.source.py"
GEOMETRY_HELPER = "swatch-reference-gn-nearest-render-3.gn-source.py"
DEPENDENCIES = {
    CONTROL+".blend": "782f8f4e718b944223527b7bf47126fab74bc9f578a45c2634223526afc410ed",
    CONTROL+".source.py": "55bb71225b66485972ecf1fa693ba9d06baff28e827135413fd81549dcc30abf",
    CONTROL+".gn-report.json": "ee182aaaf09a818839cf2cfcc8f301014613b6b7184279d7128c35213b66e486",
    RECORD_HELPER: "5b1d9049cec289828a6e354ce334d37873fa8343c4f5a0aa848315732125609c",
    GEOMETRY_HELPER: "be7730c0ddba22109ebc31dd44e8660672df7fd2cb8d361093688ce9fcc2c927",
    "character-reference-v3.source.py": "69df6504ddc4412c1279f7f40f2baa8ae45fbedc6649e64cdc7cb1d175039dc3",
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
    modifier = next(m for m in result["objects"][COAT]["modifiers"] if m["name"] == MODIFIER)
    modifier["inputs"][SOCKET] = "allowed_Tip_Spread_change"
    return result


def slice_clouds(points, guides, mapping, helper):
    """Center-line dispersion at matched controls; not fiber/entity volume."""
    counts = np.bincount(mapping, minlength=len(guides))
    groups = [(g, np.flatnonzero(mapping == g)) for g in np.flatnonzero(counts >= 8)]
    result = {"scope": "3D child center-position covariance at matching control indices. sqrt(eigenvalues) axes; not tangent-normal cross section, solid volume or image visibility.",
              "minimum_children": 8, "group_count": len(groups), "child_coverage_fraction": float(sum(len(idx) for _, idx in groups)/len(points)), "slices": {}}
    for j in (5, 8, 11):
        eigen = np.maximum(np.asarray([np.linalg.eigvalsh(np.cov(points[idx,j].astype(np.float64),rowvar=False)) for _, idx in groups]), 0.)
        result["slices"][str(j)] = {"smallest_std_median": float(np.median(np.sqrt(eigen[:,0]))),
                                  "middle_std_median": float(np.median(np.sqrt(eigen[:,1]))),
                                  "largest_std_median": float(np.median(np.sqrt(eigen[:,2]))),
                                  "smallest_to_largest_median": float(np.median(np.sqrt(eigen[:,0]/eigen[:,2])))}
    return result


def main():
    import bpy
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--value", type=float, choices=(.006, .009))
    parser.add_argument("--tag", required=True)
    parser.add_argument("--no-render", action="store_true")
    parser.add_argument("--render-saved", action="store_true")
    opt = parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    if not opt.tag or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for c in opt.tag):
        parser.error("--tag must be a nonempty file-safe name")
    stem = "swatch-reference-"+opt.tag
    if opt.render_saved:
        if opt.no_render:
            parser.error("--render-saved and --no-render are exclusive")
        for suffix in (".png", ".render.json", ".render.log"):
            if (OUT/(stem+suffix)).exists():
                raise FileExistsError(stem+suffix)
        metadata = json.loads((OUT/(stem+".gn-report.json")).read_text(encoding="utf-8"))
        if file_sha(Path(__file__)) != metadata["wrapper_source_sha256"] or file_sha(OUT/(stem+".blend")) != metadata["saved_blend_sha256"]:
            raise RuntimeError("Frozen GN6 source or saved scene changed")
        if opt.value is not None and opt.value != metadata["tip_spread_change"]["requested_after"]:
            parser.error("--value differs from saved case")
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+".blend")))
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "OPTIX"
        prefs.get_devices()
        for device in prefs.devices:
            device.use = device.type == "OPTIX"
        bpy.context.scene.render.filepath = str(OUT/(stem+".png"))
        start = time.perf_counter()
        bpy.ops.render.render(write_still=True)
        receipt = {"rendered": True, "kind": "swatch", "blend": stem+".blend", "png": stem+".png", "seconds": time.perf_counter()-start,
                   "resolution": bpy.context.scene.render.resolution_x, "samples": bpy.context.scene.cycles.samples,
                   "blend_sha256": file_sha(OUT/(stem+".blend")), "png_sha256": file_sha(OUT/(stem+".png")), "wrapper_source_sha256": file_sha(Path(__file__))}
        write_json(OUT/(stem+".render.json"), receipt)
        with (OUT/(stem+".render.log")).open("x", encoding="utf-8") as log:
            log.write(json.dumps(receipt)+"\n")
        print("PLUSH_BUNDLE_VOLUME_RENDER", json.dumps(receipt), flush=True)
        return
    if not opt.no_render or opt.value is None:
        parser.error("Preparation requires --no-render --value .006|.009")
    for suffix in (".blend", ".png", ".source.py", ".json", ".gn-report.json", ".precheck.log"):
        if (OUT/(stem+suffix)).exists():
            raise FileExistsError(stem+suffix)
    hashes_before = {str(OUT/name): file_sha(OUT/name) for name in DEPENDENCIES}
    if any(hashes_before[str(OUT/name)] != expected for name, expected in DEPENDENCIES.items()):
        raise RuntimeError("Frozen dependency SHA changed")
    record_helper = runpy.run_path(str(OUT/RECORD_HELPER), run_name="_frozen_gn4_scene_helper")
    helper = runpy.run_path(str(OUT/GEOMETRY_HELPER), run_name="_frozen_gn3_geometry_helper")
    source = Path(__file__).read_bytes()
    with (OUT/(stem+".source.py")).open("xb") as stream:
        stream.write(source)
    with (OUT/(stem+".precheck.log")).open("x", encoding="utf-8") as log:
        def event(message):
            print(message, flush=True)
            log.write(message+"\n")
            log.flush()
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(CONTROL+".blend")))
        event("Loaded frozen GN5; no groom regeneration")
        coat = bpy.data.objects[COAT]
        modifier = coat.modifiers[MODIFIER]
        tree = modifier.node_group
        socket = getattr(modifier.properties.inputs, SOCKET)
        before_value = float(socket.value)
        if before_value != float(np.float32(.003)) or tree.nodes["Restore Curve Segment Length"].inputs["Factor"].default_value != 0. or tree.nodes["Clump Hair Curves"].inputs["Preserve Length"].default_value is not True:
            raise RuntimeError("Saved GN5 control parameters differ")
        before = record_helper["scene_record"](bpy, helper)
        p0, r0 = helper["evaluated_coat"](bpy, coat)
        rest, native_r = helper["curve_arrays"](coat.data)
        socket.value = opt.value
        actual_value = float(socket.value)
        coat.update_tag()
        bpy.context.view_layer.update()
        after = record_helper["scene_record"](bpy, helper)
        if fixed_state(before) != fixed_state(after):
            raise RuntimeError("Change outside modifier Tip Spread and derived evaluated coat")
        p, r = helper["evaluated_coat"](bpy, coat)
        if p.shape != p0.shape or p[:,0].tobytes() != rest[:,0].tobytes() or r[:,0].tobytes() != r0[:,0].tobytes() or not np.isfinite(p).all() or not np.isfinite(r).all() or np.any(r < 0.):
            raise RuntimeError("Root/radius/count/finite check failed")
        if p.tobytes() == p0.tobytes():
            raise RuntimeError("Tip Spread had no evaluated response")
        bpy.context.scene.render.filepath = str(OUT/(stem+".png"))
        bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+".blend")), compress=True)
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(stem+".blend")))
        if record_helper["scene_record"](bpy, helper) != after:
            raise RuntimeError("Saved/reloaded state changed")
        wrapper_sha = hashlib.sha256(source).hexdigest()
        event("PLUSH_BUNDLE_VOLUME_ASSET_READY "+str(OUT/(stem+".blend"))+" wrapper_sha256="+wrapper_sha)
        control = json.loads((OUT/(CONTROL+".gn-report.json")).read_text(encoding="utf-8"))
        inherited = {k: copy.deepcopy(control[k]) for k in ("baseline_source", "baseline_source_sha256", "baseline_snapshot", "official_asset_library", "official_asset_sha256", "candidate_parameters", "guides", "graph", "guide_assignment", "noncoat")}
        inherited["guides"].pop("evaluated_target_shape", None)  # old inherited GN4 value is not this evaluation
        inherited["graph"]["modifier_inputs"]["Tip Spread"]["value"] = actual_value
        arc = helper["catmull_rom_lengths"](p)
        arc0 = helper["catmull_rom_lengths"](p0)
        arc_rest = helper["catmull_rom_lengths"](rest)
        gp, _ = helper["curve_arrays"](bpy.data.objects["Pile guides · editable live input"].data)
        mapping = np.empty(len(p), dtype=np.int32)
        coat = bpy.data.objects[COAT]
        coat.data.attributes["pile_guide_index"].data.foreach_get("value", mapping)
        mapping -= len(p)
        hashes_after = {str(OUT/name): file_sha(OUT/name) for name in DEPENDENCIES}
        if hashes_before != hashes_after:
            raise RuntimeError("Frozen inputs changed")
        report = {**inherited, "status": "engineering_precheck_passed", "rendered": False, "kind": "swatch", "candidate_preset": "gn6", "control_asset": CONTROL,
                  "blend": stem+".blend", "png": stem+".png", "resolution": bpy.context.scene.render.resolution_x, "samples": bpy.context.scene.cycles.samples,
                  "source_blend_sha256": DEPENDENCIES[CONTROL+".blend"], "saved_blend_sha256": file_sha(OUT/(stem+".blend")),
                  "wrapper_source_snapshot": stem+".source.py", "wrapper_source_sha256": wrapper_sha,
                  "control_wrapper_source_snapshot": CONTROL+".source.py", "control_wrapper_source_sha256": DEPENDENCIES[CONTROL+".source.py"],
                  "record_helper_source_snapshot": RECORD_HELPER, "record_helper_source_sha256": DEPENDENCIES[RECORD_HELPER],
                  "geometry_helper_source_snapshot": GEOMETRY_HELPER, "geometry_helper_source_sha256": DEPENDENCIES[GEOMETRY_HELPER],
                  "changes_vs_control": ["tip_spread_modifier_input"], "study_scope": "One input change from saved GN5: Tip Spread only. All native data/radii/mapping/guides/UC/FA and graph/defaults/other modifier inputs/scene fixed. Derived evaluated coat positions/radii may change. No visual/physical volume or arc-preservation claim.",
                  "tip_spread_change": {"modifier": MODIFIER, "node_group": tree.name, "input": "Tip Spread", "socket_identifier": SOCKET,
                                        "before": before_value, "requested_after": opt.value, "after": actual_value,
                                        "unit_scope": "Scene-coordinate displacement amplitude of fixed per-CurveID random vector in guide frame before internal length restoration; not a dimensionless root-offset ratio",
                                        "external_restore_factor": 0., "clump_preserve_length": True},
                  "coat": {"native_component": "Curves", "curve_count": len(p), "points_per_curve": p.shape[1], "finite": True,
                           "root_bits_equal_frozen_v3": True, "root_error_max": 0., "input_positions_float32_sha256": helper["array_digest"](rest),
                           "evaluated_positions_float32_sha256": helper["array_digest"](p), "evaluated_radii_float32_sha256": helper["array_digest"](r),
                           "radius_root": helper["summarize"](r[:,0]), "radius_tip": helper["summarize"](r[:,-1]),
                           "tip_to_root_radius_ratio": helper["summarize"](r[:,-1]/r[:,0]),
                           "evaluated_radius_change_from_control": {"scope": "Derived evaluation of unchanged official Profile on changed spline parameter", "changed_point_fraction": float(np.mean(r!=r0)), "absolute_delta": helper["summarize"](np.abs(r.astype(float)-r0.astype(float))), "root_bits_equal": True},
                           "arc_length": {"basis": "Uniform Catmull-Rom duplicate endpoints model; float32 controls promoted float64; not engine arc", "quadrature_order": 32,
                                          "evaluated": helper["summarize"](arc), "control_gn5": helper["summarize"](arc0), "input_rest": helper["summarize"](arc_rest),
                                          "relative_change_from_control": helper["summarize"](arc/arc0-1), "absolute_relative_change_from_rest": helper["summarize"](np.abs(arc/arc_rest-1)),
                                          "constraint_scope": "External Restore remains0; no straight-rest segment-length or Catmull arc constraint. Clump internal Preserve Length reference is pre-clump geometry."}},
                  "checks": {"only_tip_spread_and_derived_evaluated_coat_changed": True, "native_data_and_radii_exact": True, "roots_bits_exact": True,
                             "evaluated_root_radii_bits_exact": True, "saved_reload_state_exact": True, "finite": True, "input_hashes_before": hashes_before, "input_hashes_after": hashes_after},
                  "child_center_clouds": slice_clouds(p,gp,mapping,helper), "height_profile_diagnostic": helper["height_profile_diagnostic"](bpy),
                  "mechanism_diagnostic": "gn-tip-spread-mechanism-1.provenance.json", "render_receipt": stem+".render.json"}
        write_json(OUT/(stem+".gn-report.json"), report)
        write_json(OUT/(stem+".json"), {"kind": "swatch", "rendered": False, "blend": stem+".blend", "png": stem+".png", "resolution": report["resolution"], "samples": report["samples"],
                    "control_asset": CONTROL, "source_blend_sha256": report["source_blend_sha256"], "source_snapshot": stem+".source.py", "source_sha256": wrapper_sha,
                    "method_report": stem+".gn-report.json", "render_receipt": stem+".render.json", "parameter_scope": report["study_scope"]})
        event("PLUSH_BUNDLE_VOLUME_PRECHECK_PASS "+json.dumps({"report": stem+".gn-report.json", "wrapper_sha256": wrapper_sha, "value": actual_value, "rendered": False}))


if __name__ == "__main__":
    main()
