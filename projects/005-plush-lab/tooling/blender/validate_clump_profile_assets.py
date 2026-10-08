"""Independent CPU-only inspection of saved GN11 along-length clump profile.

No rendering or asset saving. Temporary field/output and causal routing probes
are restored in memory; every tracked input is hashed before and after.
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
HELPER_PATH = Path(__file__).with_name("validate_compact_coil_assets.py")
HELPER_SHA = "06b9733671fa4e4c210faac17f46cf4f08d7197a8071ad2e41a5d49fb52f1e9c"
CONTROL = "swatch-reference-gn-compact-coil-clumped-live3-10"
CONTROL_SHA = "b01f575e01a1fe6e94f07eceadfe6442dc20b1ef5105b22a18cb565a2bdcb878"
POINTS = np.array([[0., 0.], [.18, .15], [.40, .25], [.65, .25], [.85, .75], [1., 1.]])
FACTOR = float(np.float32(.88))
NAMES = {"parameter": "GN11 post-Curl length parameter",
         "capture": "GN11 capture post-Curl arc coordinate",
         "curve": "GN11 linear Clump weight profile",
         "clamp": "GN11 clamp profile 0 to 1",
         "multiply": "GN11 actual Clump strength times profile"}
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("gn11_frozen_gn10_inspection", HELPER_PATH)
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)
w, v, q, r, h = c.w, c.v, c.q, c.r, c.h


def link(tree, source, output, target, input_socket):
    return h.linked(tree, source, output, target, input_socket)


def reload_update(coat):
    coat.modifiers[h.MODIFIER].node_group.update_tag()
    coat.update_tag(refresh={"DATA"})
    bpy.context.view_layer.update()
    return h.native_curves(coat, evaluated=True)


def compare_fixed(checks, before, after, visibility, actual_visibility):
    checks.check("all scene object visibility and modifier lists remain fixed", visibility == actual_visibility)
    checks.check("camera/lights/material/world/render/backing mesh controls remain exact",
                 all(before[key] == after[key] for key in ("noncoat_controls", "mesh_topology", "modifier_inputs")))
    checks.check("actual fixed typed Clump Factor / Shape / Tip Spread",
                 after["modifier_inputs"]["Clump Factor"] == FACTOR
                 and after["modifier_inputs"]["Clump Shape"] == float(np.float32(.20))
                 and after["modifier_inputs"]["Tip Spread"] == float(np.float32(.003)))
    checks.check("native curve object set unchanged", set(before["curves"]) == set(after["curves"]))
    for name, frozen in before["curves"].items():
        actual = after["curves"][name]
        if name != h.COAT:
            checks.check("every native/evaluated buffer and attribute remains bitwise exact: " + name, frozen == actual)
            continue
        checks.check("every native coat position/radius/rest/map and object control remains bitwise exact",
                     all(frozen[key] == actual[key] for key in ("source", "source_attributes", "object_controls")))
        old, new = copy.deepcopy(frozen["evaluated"]), copy.deepcopy(actual["evaluated"])
        for key in ("positions_float32_sha256", "radii_float32_sha256"):
            old.pop(key); new.pop(key)
        checks.check("evaluated child count/topology/root/material records remain exact", old == new)
        old = {key: value for key, value in frozen["evaluated_attributes"].items() if key not in {"position", "radius"}}
        new = {key: value for key, value in actual["evaluated_attributes"].items() if key not in {"position", "radius"}}
        checks.check("every derived coat attribute outside position/radius remains exact", old == new)


def inspect_profile_graph(checks, frozen_tree, tree):
    actual = h.group_semantics(tree)
    old, new = frozen_tree["record"], actual["record"]
    checks.check("outer interface and all old nodes/defaults/nested official contents remain exact",
                 old["tree_type"] == new["tree_type"] and old["interface"] == new["interface"]
                 and all(new["nodes"].get(name) == value for name, value in old["nodes"].items()))
    added_names = set(new["nodes"]) - set(old["nodes"])
    added = {name: tree.nodes[name] for name in added_names}
    expected_types = {"GeometryNodeSplineParameter", "GeometryNodeCaptureAttribute", "ShaderNodeFloatCurve", "ShaderNodeClamp", "ShaderNodeMath"}
    checks.check("exactly five named intended field-profile node types added", set(added_names) == set(NAMES.values()) and len(added) == 5 and {node.bl_idname for node in added.values()} == expected_types,
                 {name: node.bl_idname for name, node in added.items()})
    if len(added) != 5 or {node.bl_idname for node in added.values()} != expected_types:
        raise ValueError("Unexpected added graph nodes")
    parameter, capture, curve, clamp, multiply = [next(node for node in added.values() if node.bl_idname == kind) for kind in
        ("GeometryNodeSplineParameter", "GeometryNodeCaptureAttribute", "ShaderNodeFloatCurve", "ShaderNodeClamp", "ShaderNodeMath")]
    inp = next(node for node in tree.nodes if node.type == "GROUP_INPUT")
    curl, clump = tree.nodes["Curl Hair Curves"], tree.nodes["Clump Hair Curves"]
    curl_geometry = next(socket for socket in curl.outputs if socket.type == "GEOMETRY")
    clump_geometry = clump.inputs["Geometry"]
    captured_in = next(socket for socket in capture.inputs if socket.type == "VALUE")
    captured_out = next(socket for socket in capture.outputs if socket.type == "VALUE")
    checks.check("POINT FLOAT capture stores the actual post-Curl Spline Parameter Factor",
                 capture.domain == "POINT" and len(capture.capture_items) == 1 and capture.capture_items[0].data_type == "FLOAT"
                 and link(tree, parameter, parameter.outputs["Factor"], capture, captured_in)
                 and link(tree, curl, curl_geometry, capture, capture.inputs["Geometry"]))
    actual_points = np.array([list(point.location) for point in curve.mapping.curves[0].points])
    checks.check("linear Float Curve profile has exactly the six authorized points",
                 actual_points.shape == POINTS.shape and np.max(np.abs(actual_points - POINTS)) < 4e-8
                 and all(point.handle_type == "VECTOR" for point in curve.mapping.curves[0].points)
                 and curve.inputs["Factor"].default_value == 1., actual_points.tolist())
    checks.check("clamp 0..1 and multiply use actual .88 input before existing official Clump Factor",
                 clamp.clamp_type == "MINMAX" and clamp.inputs["Min"].default_value == 0. and clamp.inputs["Max"].default_value == 1.
                 and multiply.operation == "MULTIPLY" and not multiply.use_clamp
                 and link(tree, capture, captured_out, curve, curve.inputs["Value"])
                 and link(tree, curve, curve.outputs["Value"], clamp, clamp.inputs["Value"])
                 and link(tree, clamp, clamp.outputs["Result"], multiply, multiply.inputs[1])
                 and link(tree, inp, inp.outputs["Clump Factor"], multiply, multiply.inputs[0])
                 and link(tree, multiply, multiply.outputs[0], clump, clump.inputs["Factor"])
                 and link(tree, capture, capture.outputs["Geometry"], clump, clump_geometry))
    removed = {tuple(item) for item in old["links"]} - {tuple(item) for item in new["links"]}
    introduced = {tuple(item) for item in new["links"]} - {tuple(item) for item in old["links"]}
    expected_removed = {(curl.name, curl_geometry.identifier, clump.name, clump_geometry.identifier, 0),
                        (inp.name, inp.outputs["Clump Factor"].identifier, clump.name, clump.inputs["Factor"].identifier, 0)}
    def edge(a, o, b, i):
        return (a.name, o.identifier, b.name, i.identifier, 0)
    expected_added = {edge(curl, curl_geometry, capture, capture.inputs["Geometry"]),
                      edge(parameter, parameter.outputs["Factor"], capture, captured_in),
                      edge(capture, captured_out, curve, curve.inputs["Value"]),
                      edge(curve, curve.outputs["Value"], clamp, clamp.inputs["Value"]),
                      edge(clamp, clamp.outputs["Result"], multiply, multiply.inputs[1]),
                      edge(inp, inp.outputs["Clump Factor"], multiply, multiply.inputs[0]),
                      edge(multiply, multiply.outputs[0], clump, clump.inputs["Factor"]),
                      edge(capture, capture.outputs["Geometry"], clump, clump_geometry)}
    checks.check("only the two intended old links are replaced by exactly eight profile links",
                 removed == expected_removed and introduced == expected_added,
                 {"removed": sorted(removed), "added": sorted(introduced)})
    return {"parameter": parameter, "capture": capture, "curve": curve, "clamp": clamp, "multiply": multiply,
            "captured_out": captured_out, "input": inp, "clump": clump}, actual


def effective_field_probe(checks, coat, nodes, original):
    tree = coat.modifiers[h.MODIFIER].node_group
    output = next(node for node in tree.nodes if node.type == "GROUP_OUTPUT" and node.is_active_output)
    output_socket = next(socket for socket in output.inputs if socket.type == "GEOMETRY")
    original_link = next(edge for edge in tree.links if edge.to_node == output and edge.to_socket == output_socket)
    original_from, original_socket = original_link.from_node, original_link.from_socket
    stores, result = [], {}
    values = {"s": (nodes["capture"], nodes["captured_out"]),
              "w": (nodes["curve"], nodes["curve"].outputs["Value"]),
              "effective": (nodes["multiply"], nodes["multiply"].outputs[0])}
    try:
        current = nodes["capture"].outputs["Geometry"]
        for name, (_, field) in values.items():
            store = tree.nodes.new("GeometryNodeStoreNamedAttribute")
            stores.append(store)
            store.domain, store.data_type = "POINT", "FLOAT"
            store.inputs["Name"].default_value = "__independent_gn11_" + name
            tree.links.new(current, store.inputs["Geometry"])
            tree.links.new(field, store.inputs["Value"])
            current = store.outputs["Geometry"]
        tree.links.new(current, output_socket)
        evaluated = reload_update(coat)
        evaluated_obj = coat.evaluated_get(bpy.context.evaluated_depsgraph_get())
        for name in values:
            attr = evaluated_obj.data.attributes["__independent_gn11_" + name]
            checks.check("actual probe field is finite FLOAT on POINT: " + name,
                         attr.domain == "POINT" and attr.data_type == "FLOAT" and len(attr.data) == evaluated["point_count"])
            result[name] = h.get_array(attr.data, "value")
        checks.check("post-Curl field probe includes coat and temporary guides with 12 controls",
                     evaluated["curve_count"] == 85000 + 2657 and np.all(np.diff(evaluated["offsets"]) == 12))
        s, weight, effective = (result[name].astype(np.float64) for name in ("s", "w", "effective"))
        expected = np.interp(s, POINTS[:, 0], POINTS[:, 1])
        error_w = float(np.max(np.abs(weight - expected)))
        error_effective = float(np.max(np.abs(effective - np.clip(expected, 0, 1) * FACTOR)))
        exact_factor = (np.clip(result["w"], np.float32(0), np.float32(1)) * np.float32(.88))
        checks.check("actual Float Curve table approximates independent piecewise-linear w(s); actual Factor is bitwise .88*clamp(w)",
                     np.isfinite(s).all() and np.isfinite(weight).all() and np.isfinite(effective).all()
                     and error_w < .003 and error_effective < .003
                     and result["effective"].tobytes() == exact_factor.tobytes(),
                     {"maximum_weight_error": error_w, "maximum_effective_error": error_effective,
                      "linear_table_tolerance": .003, "actual_factor_matches_actual_weight_float32_bitwise": result["effective"].tobytes() == exact_factor.tobytes()})
        roots, tips = evaluated["offsets"][:-1], evaluated["offsets"][1:] - 1
        end_error = {"s_tip_absolute_error_max": float(np.max(np.abs(s[tips] - 1))),
                     "w_tip_absolute_error_max": float(np.max(np.abs(weight[tips] - 1))),
                     "factor_tip_absolute_error_max": float(np.max(np.abs(effective[tips] - FACTOR)))}
        checks.check("actual captured coordinate is monotone; root exact 0, normalized tip within declared float32 tolerances",
                     np.all(s[roots] == 0) and np.all(effective[roots] == 0) and np.all(weight[roots] == 0)
                     and end_error["s_tip_absolute_error_max"] <= 1e-7
                     and end_error["w_tip_absolute_error_max"] <= 1e-6
                     and end_error["factor_tip_absolute_error_max"] <= 1e-6
                     and np.min(np.diff(s.reshape(-1, 12), axis=1)) >= 0,
                     {**end_error, "s_tip_tolerance": 1e-7, "w_tip_tolerance": 1e-6, "factor_tip_tolerance": 1e-6})
        measured = {"curve_count": evaluated["curve_count"], "point_count": evaluated["point_count"],
                    "maximum_weight_error": error_w, "maximum_effective_error": error_effective,
                    "endpoint_errors": end_error,
                    "fields": {name: {"float32_sha256": h.array_hash(data), "summary": h.summary(data),
                        "per_control_median": np.median(data.reshape(-1, 12), axis=0).tolist()} for name, data in result.items()},
                    "basis": "Actual POINT attributes of temporary evaluated post-Curl geometry, including 85000 coat and 2657 guides. Blender Curve Mapping table with VECTOR control handles approximates independent piecewise-linear interpolation of pinned six points (declared max tolerance .003); multiplication checked bitwise against actual clamp(weight)*f32(.88). Temporary Store Named Attribute nodes and output routing removed; no saving/rendering."}
    finally:
        for store in stores:
            tree.nodes.remove(store)
        tree.links.new(original_socket, output_socket)
        restored = reload_update(coat)
        checks.check("field probe restores evaluated normal output positions/radii/topology bitwise", h.curve_record(restored) == h.curve_record(original))
    return measured


def causal_bypass(checks, coat, nodes, control, original):
    tree = coat.modifiers[h.MODIFIER].node_group
    clump = nodes["clump"]
    result = None
    try:
        tree.links.new(nodes["input"].outputs["Clump Factor"], clump.inputs["Factor"])
        bypassed = reload_update(coat)
        same = h.curve_record(bypassed) == h.curve_record(control)
        checks.check("temporarily bypassing only outer profile restores frozen GN10 evaluated child positions/radii bitwise", same)
        result = {"gn10_reproduced_bitwise": same, "bypassed_evaluated": h.curve_record(bypassed),
                  "scope": "Actual saved GN11 geometry output remains through Capture; only Factor link temporarily replaced with original Group Input Socket_6. Existing official internal Clump Shape/length logic stays unchanged."}
    finally:
        tree.links.new(nodes["multiply"].outputs[0], clump.inputs["Factor"])
        restored = reload_update(coat)
        checks.check("causal Factor bypass restores actual GN11 evaluated geometry/radii bitwise", h.curve_record(restored) == h.curve_record(original))
    return result


def grouped_transverse_spread(control, actual, guides, ids):
    """Control-index matched tangent-plane covariance, independently computed."""
    guide_count = guides["curve_count"]
    counts = np.bincount(ids, minlength=guide_count)
    gp = guides["positions"].reshape(-1, 12, 3).astype(np.float64)
    pairs = [item["positions"].reshape(-1, 12, 3).astype(np.float64) for item in (control, actual)]
    answer = {}
    for index in (5, 6, 10, 11):
        tangent = gp[:, min(11, index + 1)] - gp[:, index - 1]
        norm = np.linalg.norm(tangent, axis=1)
        valid = (counts >= 4) & (norm > 1e-12)
        tangent = tangent / np.maximum(norm[:, None], 1e-12)
        widths = []
        for positions in pairs:
            p = positions[:, index]
            mean = np.stack([np.bincount(ids, weights=p[:, axis], minlength=guide_count) for axis in range(3)], axis=1) / np.maximum(counts[:, None], 1)
            offset = p - mean[ids]
            transverse = offset - tangent[ids] * np.sum(offset * tangent[ids], axis=1, keepdims=True)
            square = np.sum(transverse * transverse, axis=1)
            rms = np.sqrt(np.bincount(ids, weights=square, minlength=guide_count) / np.maximum(counts - 1, 1))
            widths.append(rms)
        before, after = (values[valid] for values in widths)
        positive = before > 1e-12
        answer[str(index)] = {"matched_guide_count": int(np.count_nonzero(valid)), "control_rms": h.summary(before),
                             "candidate_rms": h.summary(after), "paired_delta": h.summary(after - before),
                             "paired_ratio": h.summary(after[positive] / before[positive]),
                             "fraction_expanded_by_more_than_1e_8": float(np.mean(after - before > 1e-8))}
    return {"controls": answer, "basis": "Every eligible saved pile_guide_index group with >=4 children; child positions centered on their group mean at native control index 5/6 (middle) and 10/11 (end), projected onto unchanged native guide central-difference tangent plane (tip uses one-sided 11-10), sample covariance denominator n-1, RMS=sqrt(trace). Same guide frame and matched control index, scene units. A grouped centerline spread proxy, not contact, cross-sectional solid area, exact arc-matched width or visual softness."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--asset", default="swatch-reference-gn-clump-profile-live7-11")
    parser.add_argument("--source-sha", required=True)
    parser.add_argument("--report", default="hair-clump-profile-validation-v11.json")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    if not re.fullmatch(r"swatch-reference-gn-clump-profile-[A-Za-z0-9_-]+-11", args.asset) or not re.fullmatch(r"[a-f0-9]{64}", args.source_sha):
        parser.error("Use the producer-confirmed GN11 successful saved stem and frozen source SHA")
    if not re.fullmatch(r"[A-Za-z0-9_-]+\.json", args.report):
        parser.error("Use a new exclusive JSON report filename")
    report = {"status": "checking", "checks": [], "errors": [], "cases": {}, "control_asset": CONTROL,
              "validated_at_utc": datetime.now(timezone.utc).isoformat(), "blender": bpy.app.version_string,
              "validator": str(Path(__file__).relative_to(ROOT)),
              "scope": "Independent read-only saved GN11 effective POINT clump profile, immutable native/scene/history, reversible actual field and causal bypass probes, actual child geometry, guide perturbation/restore, two disk reloads and real completed GPU receipt. No rendering or asset save. No physical bundling/softness or visual acceptance claim."}
    checks = h.Checks(report)
    with (OUT / args.report).open("x", encoding="utf-8") as stream:
        try:
            checks.track(Path(__file__))
            checks.source("immutable GN10 independent validator bytes", HELPER_PATH, HELPER_SHA)
            checks.source("immutable successful GN10 independent report bytes", OUT / "hair-compact-coil-validation-v10.json", "a19cf24a15bf4aeb5362d75d8f886addf6402938782183f4c7c0d485b9cb5bc3")
            historical = checks.read_json(OUT / "hair-compact-coil-validation-v10.json")
            for entry in historical["checks"]:
                if entry["check"].startswith("read-only input preserved: "):
                    path = h.path_from(entry["check"].removeprefix("read-only input preserved: "), ROOT)
                    checks.source("historical input retains previously verified SHA: " + h.label_path(path), path, entry["details"]["sha256_before"])
            checks.source("actual fixed GN10 saved control bytes", OUT / (CONTROL + ".blend"), CONTROL_SHA)
            recorded = checks.read_json(OUT / (args.asset + ".gn-report.json"))
            meta = checks.read_json(OUT / (args.asset + ".json"))
            checks.source("actual frozen GN11 authoring source snapshot", h.path_from(recorded["wrapper_source_snapshot"]), args.source_sha)
            checks.source("current GN11 authoring source retains frozen successful bytes", Path(__file__).with_name("plush_clump_profile_study.py"), args.source_sha)
            checks.check("CPU gate identifies exact GN10 saved control and frozen successful source",
                         recorded["status"] == "engineering_precheck_passed" and recorded["control_asset"] == CONTROL
                         and recorded["source_blend_sha256"] == CONTROL_SHA and recorded["wrapper_source_sha256"] == args.source_sha)
            candidate = report["cases"][args.asset] = {}
            c.render_evidence(checks, recorded, meta, args.asset, candidate)
            checks.source("actual saved GN11 matches completed CPU gate bytes", OUT / (args.asset + ".blend"), recorded["saved_blend_sha256"])
            bpy.ops.wm.open_mainfile(filepath=str(OUT / (CONTROL + ".blend")))
            frozen, visibility = r.snapshot(), w.visibility_controls()
            control_coat = h.native_curves(bpy.context.scene.objects[h.COAT], evaluated=True)
            control_guides = h.native_curves(bpy.context.scene.objects[h.GUIDE])
            camera_forward = list(bpy.context.scene.camera.matrix_world.col[2].xyz)
            bpy.ops.wm.open_mainfile(filepath=str(OUT / (args.asset + ".blend")))
            actual, actual_visibility = r.snapshot(), w.visibility_controls()
            compare_fixed(checks, frozen, actual, visibility, actual_visibility)
            coat, guide = bpy.context.scene.objects[h.COAT], bpy.context.scene.objects[h.GUIDE]
            source, evaluated, guides = h.native_curves(coat), h.native_curves(coat, evaluated=True), h.native_curves(guide)
            checks.check("saved CPU descriptor matches actual native guides and evaluated child position/radius buffers",
                         recorded["guides"]["positions_float32_sha256"] == h.array_hash(guides["positions"])
                         and recorded["guides"]["radii_float32_sha256"] == h.array_hash(guides["radii"])
                         and recorded["coat"]["positions_float32_sha256"] == h.array_hash(evaluated["positions"])
                         and recorded["coat"]["radii_float32_sha256"] == h.array_hash(evaluated["radii"]))
            h.verify_native(checks, "actual saved evaluated coat", evaluated, 85000)
            h.verify_native(checks, "actual fixed guides", guides, 2657)
            nodes, graph = inspect_profile_graph(checks, frozen["tree"], coat.modifiers[h.MODIFIER].node_group)
            candidate["effective_field_probe"] = effective_field_probe(checks, coat, nodes, evaluated)
            candidate["causal_bypass"] = causal_bypass(checks, coat, nodes, control_coat, evaluated)
            checks.check("temporary field and bypass probes restore complete saved graph/scene/attributes", r.snapshot() == actual and w.visibility_controls() == actual_visibility)
            ids = h.get_array(coat.data.attributes["pile_guide_index"].data, "value", dtype=np.int32)
            candidate["independent_live_guide_probe"] = c.independent_live_probe(checks, coat, guide, evaluated, ids)
            checks.check("independent guide perturbation restores complete saved scene", r.snapshot() == actual and w.visibility_controls() == actual_visibility)
            candidate["derived_radius_response"] = q.radius_response(checks, control_coat, evaluated)
            candidate["guide_geometry"] = c.measure_geometry(checks, control_guides, guides, camera_forward, "guide")
            candidate["coat_geometry"] = c.measure_geometry(checks, control_coat, evaluated, camera_forward, "coat")
            checks.check("actual outer profile genuinely changes evaluated child geometry", candidate["coat_geometry"]["changed_curve_count"] > 0)
            candidate["grouped_transverse_spread"] = grouped_transverse_spread(control_coat, evaluated, guides, ids - 85000)
            candidate.update(candidate_snapshot=actual, control_snapshot=frozen, effective_profile_points=POINTS.tolist(),
                             effective_global_factor=FACTOR, unchanged_internal_clump_shape=float(np.float32(.20)), unchanged_tip_spread=float(np.float32(.003)))
            bpy.ops.wm.open_mainfile(filepath=str(OUT / (args.asset + ".blend")))
            checks.check("second saved disk reload reproduces every native/evaluated attribute, graph, scene and visibility", r.snapshot() == actual and w.visibility_controls() == actual_visibility)
        except Exception as error:
            checks.check("independent GN11 inspection completes", False, {"exception": type(error).__name__, "message": str(error)})
        finally:
            checks.preserve_inputs()
            report["input_count"], report["check_count"] = len(checks.inputs), len(report["checks"])
            report["status"] = "failed" if report["errors"] else "passed"
            json.dump(report, stream, ensure_ascii=False, indent=2, allow_nan=False); stream.write("\n")
    print("PLUSH_CLUMP_PROFILE_VALIDATION", json.dumps({key: report[key] for key in ("status", "check_count", "input_count", "errors")}, ensure_ascii=False), flush=True)
    if report["errors"]:
        raise AssertionError("Saved GN11 validation failed: " + "; ".join(report["errors"]))


if __name__ == "__main__":
    main()
