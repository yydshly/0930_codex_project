"""Independent saved GN13 guide azimuth validation; CPU read only.

Reconstruct the declared root-normal rigid rotation without importing the
producer. All reversible in-memory probes restore the candidate exactly.
No render or asset save. Float32 rigidity drift is measured, not normalized.
"""

import argparse
import copy
import importlib.util
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import bpy
import numpy as np


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "artifacts" / "cycles-study"
HELPER = Path(__file__).with_name("validate_curl_phase_scope_assets.py")
HELPER_SHA = "c4f374f757ee8417bc6eb57475b1fbe4ef7214319c354bfd674e6a8d1e4a48a6"
HISTORY = "hair-curl-phase-scope-validation-v12-r2.json"
HISTORY_SHA = "cd624cc4750d79d34f4424ed53ab9c8deecc748b173b320456b1cdbcb0636208"
CONTROL = "swatch-reference-gn-clump-profile-live7-11"
CONTROL_SHA = "487e857487a6489bfb09371575d29ee6f793af460976ba1af593569f1382c26d"
AXES = np.array([.64, .43, .54], dtype=np.float64)
SEED = 12013
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("gn13_frozen_saved_inspection", HELPER)
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)
g, c, w, r, h = p.g, p.c, p.w, p.r, p.h


def array_same(a, b):
    return a.dtype == b.dtype and a.shape == b.shape and a.tobytes() == b.tobytes()


def reconstruct(control):
    if control["curve_count"] != 2657 or not np.all(np.diff(control["offsets"]) == 12):
        raise ValueError("Frozen baseline requires 2657 guides, 12 controls each")
    old = control["positions"].reshape(2657, 12, 3)
    roots = old[:, 0].astype(np.float64)
    normals = roots / (AXES * AXES)
    normals /= np.linalg.norm(normals, axis=1, keepdims=True)
    angles = np.random.default_rng(SEED).uniform(0., np.pi * 2., size=len(old))
    delta = old.astype(np.float64) - roots[:, None, :]
    cosine = np.cos(angles)[:, None, None]
    sine = np.sin(angles)[:, None, None]
    ideal = (roots[:, None, :] + delta * cosine
             + np.cross(normals[:, None, :], delta) * sine
             + normals[:, None, :] * np.sum(normals[:, None, :] * delta, axis=2, keepdims=True) * (1. - cosine))
    expected = ideal.astype(np.float32)
    expected[:, 0] = old[:, 0]
    return old, roots, normals, angles, ideal, expected


def compare_scope(checks, baseline, actual, base_visibility, visibility):
    checks.check("entire scene/material/light/camera/render/meshes/typed controls and visibility remain frozen GN11",
                 base_visibility == visibility and all(baseline[key] == actual[key] for key in ("noncoat_controls", "mesh_topology", "modifier_inputs")))
    checks.check("complete actual GN11 graph, profile mapping, interface and nested official assets remain bitwise fixed",
                 baseline["tree"] == actual["tree"])
    stripped = copy.deepcopy(actual["curves"])
    expected = copy.deepcopy(baseline["curves"])
    for name in (h.GUIDE, h.COAT):
        stages = ("source", "evaluated") if name == h.GUIDE else ("evaluated",)
        for stage in stages:
            excluded = {"positions_float32_sha256"}
            attrs = {"position"}
            if name == h.COAT:
                excluded.add("radii_float32_sha256")
                attrs.add("radius")
            for target in (stripped[name], expected[name]):
                for key in excluded:
                    target[stage].pop(key)
                target[stage + "_attributes"] = {key: value for key, value in target[stage + "_attributes"].items() if key not in attrs}
    checks.check("all native coat/UC/hidden flyaway, guide radii/rest/IDs/maps and evaluated attributes outside authorized positions/derived coat radii stay exact",
                 stripped == expected)


def rigidity(checks, control, actual):
    old, roots, normals, angles, ideal, expected = reconstruct(control)
    new = actual["positions"].reshape(2657, 12, 3)
    exact = array_same(new, expected)
    checks.check("every saved native guide coordinate exactly matches independent seeded Rodrigues f64 to f32 reconstruction with original root bits restored", exact,
                 {"actual_sha256": h.array_hash(new), "independent_expected_sha256": h.array_hash(expected),
                  "maximum_absolute_difference_scene_units": float(np.max(np.abs(new.astype(np.float64) - expected)))})
    checks.check("all 2657 native roots and every native radius remain bitwise GN11; guide object has no modifiers",
                 array_same(actual["roots"], control["roots"]) and array_same(actual["radii"], control["radii"])
                 and len(bpy.context.scene.objects[h.GUIDE].modifiers) == 0)
    quantization = new.astype(np.float64) - ideal
    qnorm = np.linalg.norm(quantization, axis=2)
    projection_before = np.sum((old.astype(np.float64) - roots[:, None, :]) * normals[:, None, :], axis=2)
    projection_after = np.sum((new.astype(np.float64) - roots[:, None, :]) * normals[:, None, :], axis=2)
    projection_error = projection_after - projection_before
    pair_before = np.linalg.norm(old.astype(np.float64)[:, :, None, :] - old.astype(np.float64)[:, None, :, :], axis=3)
    pair_after = np.linalg.norm(new.astype(np.float64)[:, :, None, :] - new.astype(np.float64)[:, None, :, :], axis=3)
    pair_error = pair_after - pair_before
    before_arc = h.lengths(control["positions"], control["offsets"], 32)
    ideal_arc = h.lengths(ideal.reshape(-1, 3), control["offsets"], 32)
    after_arc = h.lengths(actual["positions"], actual["offsets"], 32)
    error_arc_bound = h.lengths(quantization.reshape(-1, 3), control["offsets"], 32)
    numerical_guard = 1e-13
    checks.check("actual normal projections and all control-pair distances satisfy measured f32 quantization bounds",
                 np.all(np.abs(projection_error) <= qnorm + numerical_guard)
                 and np.all(np.abs(pair_error) <= qnorm[:, :, None] + qnorm[:, None, :] + numerical_guard))
    checks.check("all guide Catmull GL32 arcs retain rigid-rotation values within integrated quantization-derivative bounds",
                 np.max(np.abs(ideal_arc - before_arc)) < numerical_guard
                 and np.all(np.abs(after_arc - before_arc) <= error_arc_bound + numerical_guard))
    changed = np.any(new != old, axis=(1, 2))
    checks.check("every native guide actually changes under the seeded full-bundle azimuth rotation", changed.all())
    return {"seed": SEED, "guide_count": 2657, "controls_per_guide": 12,
            "ellipsoid_half_axes_scene_units": AXES.tolist(), "angles_radians": h.summary(angles),
            "angles_float64_sha256": h.array_hash(angles, np.float64), "changed_guide_count_bitwise": int(changed.sum()),
            "normal_projection_error_per_guide": h.summary(np.abs(projection_error).max(axis=1)),
            "maximum_absolute_normal_projection_error_scene_units": float(np.abs(projection_error).max()),
            "maximum_absolute_control_pair_distance_error_scene_units": float(np.abs(pair_error).max()),
            "control_arc": h.summary(before_arc), "candidate_arc": h.summary(after_arc),
            "paired_arc_ratio": h.summary(after_arc / before_arc), "paired_arc_error": h.summary(after_arc - before_arc),
            "maximum_absolute_arc_error_scene_units": float(np.abs(after_arc - before_arc).max()),
            "maximum_float32_quantization_vector_scene_units": float(qnorm.max()),
            "maximum_integrated_quantization_derivative_arc_bound_scene_units": float(error_arc_bound.max()),
            "float64_rotation_arc_error_maximum_scene_units": float(np.abs(ideal_arc - before_arc).max()),
            "basis": "Independent default_rng(12013) uniform[0,2pi) in saved guide order; n=unit(root/axes^2); Rodrigues root-relative rigid rotation in f64, cast f32, restore original root bits. Normal projection and 12x12 control-pair Euclidean distances use actual f32 controls promoted f64. Guide arcs are duplicated-endpoint uniform Catmull-Rom GL32. Error bounds are actual f32 quantization norms (pair sum), and GL32 integral of derivative quantization norm plus 1e-13 f64 guard. No secondary arc/crown normalization. Analytic ellipsoid crown and final child geometry are not rigid invariants or visual acceptance."}


def causal_original_guides(checks, coat, guide, rotated, evaluated, base_guides, base_coat):
    try:
        guide.data.position_data.foreach_set("vector", base_guides["positions"].ravel())
        guide.data.update_tag(); guide.update_tag(refresh={"DATA"})
        reset = g.reload_update(coat)
        exact = h.curve_record(reset) == h.curve_record(base_coat)
        checks.check("replacing only rotated guides with original GN11 buffers bitwise reproduces GN11 final coat positions/radii", exact)
        result = {"gn11_final_coat_reproduced_bitwise": exact, "evaluated_record": h.curve_record(reset)}
    finally:
        guide.data.position_data.foreach_set("vector", rotated["positions"].ravel())
        guide.data.update_tag(); guide.update_tag(refresh={"DATA"})
        restored = g.reload_update(coat)
        checks.check("restoring rotated guide buffers exactly restores the saved candidate native/evaluated positions/radii",
                     h.curve_record(h.native_curves(guide)) == h.curve_record(rotated)
                     and h.curve_record(restored) == h.curve_record(evaluated))
    return result


def intermediate_roots(before, after):
    delta = after["roots"].astype(np.float64) - before["roots"].astype(np.float64)
    distance = np.linalg.norm(delta, axis=1)
    changed = np.any(after["roots"] != before["roots"], axis=1)
    guides = after["guide_mask"]
    return {"bitwise_equal_gn11": array_same(after["roots"], before["roots"]),
            "changed_child_roots_bitwise": int((changed & ~guides).sum()), "changed_guide_roots_bitwise": int((changed & guides).sum()),
            "maximum_child_euclidean_delta_scene_units": float(distance[~guides].max()),
            "maximum_guide_euclidean_delta_scene_units": float(distance[guides].max()),
            "maximum_absolute_coordinate_delta_scene_units": float(np.abs(delta).max()),
            "basis": "Measured official intermediate Curl output before Profile/Clump and final RootLock, separately recorded without bitwise equality requirement or presumed rounding cause. Native guide roots and final normal-output child roots/root radii remain strict bitwise invariants."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--asset", required=True)
    parser.add_argument("--source-sha", required=True)
    parser.add_argument("--source-script", default="plush_guide_azimuth_study.py")
    parser.add_argument("--report", default="hair-guide-azimuth-validation-v13.json")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    if not re.fullmatch(r"swatch-reference-gn-[A-Za-z0-9_-]+-13", args.asset) or not re.fullmatch(r"[a-f0-9]{64}", args.source_sha):
        parser.error("Use producer-confirmed successful GN13 saved stem and frozen source SHA")
    if not re.fullmatch(r"[A-Za-z0-9_-]+\.py", args.source_script) or not re.fullmatch(r"[A-Za-z0-9_-]+\.json", args.report):
        parser.error("Use simple source and exclusive report names")
    report = {"status": "checking", "checks": [], "errors": [], "asset": args.asset, "control_asset": CONTROL,
              "validated_at_utc": datetime.now(timezone.utc).isoformat(), "blender": bpy.app.version_string,
              "validator": str(Path(__file__).relative_to(ROOT)),
              "scope": "Independent actual saved GN13 native seeded rigid guide rotation reconstruction, measured f32 rigidity error, fixed root/radii/rest/maps/profile/official graph/UC/hiddenFA/scene, actual child response, original-guide and single-guide reversible probes, two disk reloads, completed GPU PNG/receipts, pre/post input SHA preservation. CPU only; no save/render; no crown or final child arc invariance, physical contact, fidelity or visual acceptance claim."}
    checks = h.Checks(report)
    with (OUT / args.report).open("x", encoding="utf-8") as stream:
        try:
            checks.track(Path(__file__))
            checks.source("immutable GN12 inspection helper bytes", HELPER, HELPER_SHA)
            checks.source("immutable GN12 r2 report bytes", OUT / HISTORY, HISTORY_SHA)
            historical = checks.read_json(OUT / HISTORY)
            mismatches = []
            for entry in historical["checks"]:
                if entry["check"].startswith("read-only input preserved: "):
                    path = h.path_from(entry["check"].removeprefix("read-only input preserved: "), ROOT)
                    if checks.track(path) != entry["details"]["sha256_before"]:
                        mismatches.append(h.label_path(path))
            checks.check("all 64 previously pinned historical GN12 inputs retain exact SHA256", not mismatches, {"mismatches": mismatches})
            checks.source("frozen actual GN11 baseline bytes", OUT / (CONTROL + ".blend"), CONTROL_SHA)
            checks.source("actual final GN13 source bytes", Path(__file__).with_name(args.source_script), args.source_sha)
            bpy.ops.wm.open_mainfile(filepath=str(OUT / (CONTROL + ".blend")))
            baseline, base_visibility = r.snapshot(), w.visibility_controls()
            base_guides = h.native_curves(bpy.context.scene.objects[h.GUIDE])
            base_coat = h.native_curves(bpy.context.scene.objects[h.COAT], evaluated=True)
            camera_forward = list(bpy.context.scene.camera.matrix_world.col[2].xyz)
            base_post = p.post_curl(checks, bpy.context.scene.objects[h.COAT], base_coat, "GN11 control", "control")
            recorded = checks.read_json(OUT / (args.asset + ".gn-report.json"))
            meta = checks.read_json(OUT / (args.asset + ".json"))
            checks.source("frozen actual GN13 authoring snapshot bytes", h.path_from(recorded["wrapper_source_snapshot"]), args.source_sha)
            checks.check("actual authoring provenance references frozen GN11 and exact source; producer pass flag is not a validation input",
                         recorded["control_asset"] == CONTROL and recorded["source_blend_sha256"] == CONTROL_SHA
                         and recorded["wrapper_source_sha256"] == args.source_sha)
            c.render_evidence(checks, recorded, meta, args.asset, report)
            checks.source("actual saved GN13 blend bytes match authoring descriptor", OUT / (args.asset + ".blend"), recorded["saved_blend_sha256"])
            bpy.ops.wm.open_mainfile(filepath=str(OUT / (args.asset + ".blend")))
            actual, visibility = r.snapshot(), w.visibility_controls()
            coat, guide = bpy.context.scene.objects[h.COAT], bpy.context.scene.objects[h.GUIDE]
            guides, source = h.native_curves(guide), h.native_curves(coat)
            evaluated = h.native_curves(coat, evaluated=True)
            compare_scope(checks, baseline, actual, base_visibility, visibility)
            report["rotation"] = rigidity(checks, base_guides, guides)
            checks.check("guide evaluation is exactly authored native rotated controls and all saved coat counts/12-control topology stay fixed",
                         h.curve_record(guides) == h.curve_record(h.native_curves(guide, evaluated=True))
                         and source["curve_count"] == evaluated["curve_count"] == 85000
                         and np.all(np.diff(source["offsets"]) == 12) and np.all(np.diff(evaluated["offsets"]) == 12))
            root_radii = evaluated["radii"][evaluated["offsets"][:-1]]
            base_root_radii = base_coat["radii"][base_coat["offsets"][:-1]]
            final_roots = array_same(evaluated["roots"], base_coat["roots"])
            final_radius = array_same(root_radii, base_root_radii)
            checks.check("all actual final normal-output 85000 child roots and root radii remain strictly bitwise GN11", final_roots and final_radius)
            report["final_roots"] = {"child_count": 85000, "positions_bitwise_equal_gn11": final_roots, "radii_bitwise_equal_gn11": final_radius}
            post = p.post_curl(checks, coat, evaluated, "GN13 actual", "control")
            checks.check("intermediate official Curl counts/mask/offset topology remain frozen", array_same(base_post["guide_mask"], post["guide_mask"]) and array_same(base_post["offsets"], post["offsets"]))
            report["post_curl_roots"] = intermediate_roots(base_post, post)
            report["causal_original_guides"] = causal_original_guides(checks, coat, guide, guides, evaluated, base_guides, base_coat)
            ids = h.get_array(coat.data.attributes["pile_guide_index"].data, "value", dtype=np.int32)
            report["independent_live_guide_probe"] = c.independent_live_probe(checks, coat, guide, evaluated, ids)
            checks.check("all reversible probes exactly restore full saved graph/scene/native attributes/evaluation/visibility", r.snapshot() == actual and w.visibility_controls() == visibility)
            report["guide_geometry"] = c.measure_geometry(checks, base_guides, guides, camera_forward, "guide rotation")
            report["coat_geometry"] = c.measure_geometry(checks, base_coat, evaluated, camera_forward, "rotated-guide coat")
            checks.check("all 85000 actual final child curves respond to full-bundle guide azimuth authoring", report["coat_geometry"]["changed_curve_count"] == 85000)
            report["derived_radius_response"] = {"changed_point_count": int(np.count_nonzero(evaluated["radii"] != base_coat["radii"])),
                "point_count": evaluated["point_count"], "maximum_absolute_delta_scene_units": float(np.max(np.abs(evaluated["radii"].astype(np.float64) - base_coat["radii"].astype(np.float64)))),
                "basis": "Actual evaluated downstream radius response, native radii and final root radii bitwise fixed; not calibrated physical fiber diameter or softness."}
            report["saved_snapshot"] = actual
            for number in (1, 2):
                bpy.ops.wm.open_mainfile(filepath=str(OUT / (args.asset + ".blend")))
                checks.check("saved disk reload " + str(number) + " reproduces all actual native/evaluated attributes/graph/scene/visibility", r.snapshot() == actual and w.visibility_controls() == visibility)
        except Exception as error:
            checks.check("independent saved GN13 inspection completes", False, {"exception": type(error).__name__, "message": str(error)})
        finally:
            checks.preserve_inputs()
            report["input_count"], report["check_count"] = len(checks.inputs), len(report["checks"])
            report["status"] = "failed" if report["errors"] else "passed"
            json.dump(report, stream, ensure_ascii=False, indent=2, allow_nan=False); stream.write("\n")
    print("PLUSH_GUIDE_AZIMUTH_VALIDATION", json.dumps({key: report[key] for key in ("status", "check_count", "input_count", "errors")}, ensure_ascii=False), flush=True)
    if report["errors"]:
        raise AssertionError("Saved GN13 validation failed: " + "; ".join(report["errors"]))


if __name__ == "__main__":
    main()
