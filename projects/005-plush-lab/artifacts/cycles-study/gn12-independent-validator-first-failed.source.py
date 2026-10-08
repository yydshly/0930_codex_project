"""Independent saved GN12 Curl Random Offset scope check; CPU read only.

The actual two saved cases are inspected. Temporary post-Curl output/field
and guide dependency probes are restored in memory. No asset save or render.
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
HELPER = Path(__file__).with_name("validate_clump_profile_assets.py")
HELPER_SHA = "0c4eeb0913b6a75bf8a6db55570ca8025d52847798055d66dc05e414a7d0e62e"
CONTROL = "swatch-reference-gn-clump-profile-live7-11"
CONTROL_SHA = "487e857487a6489bfb09371575d29ee6f793af460976ba1af593569f1382c26d"
HISTORY_SHA = "9b2f6380da8bf33f4b020b8932e993410483fbb5871078b651f7ce94d8baf14d"
CURL = "Curl Hair Curves"
OFFSET = "Input_16"
CHILD_NODE = "GN12 child-only curl phase offset"
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("gn12_immutable_gn11_helpers", HELPER)
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)
c, w, r, h = g.c, g.w, g.r, g.h


def array_same(a, b):
    return a.dtype == b.dtype and a.shape == b.shape and a.tobytes() == b.tobytes()


def socket_by_id(collection, identifier):
    return next(socket for socket in collection if socket.identifier == identifier)


def graph_scope(checks, baseline, tree, mode):
    actual = h.group_semantics(tree)["record"]
    expected = copy.deepcopy(baseline["record"])
    curl = tree.nodes[CURL]
    offset = socket_by_id(curl.inputs, OFFSET)
    checks.check("actual Random Offset socket is the pinned FLOAT Input_16", offset.name == "Random Offset" and offset.type == "VALUE")
    if mode == "all_curves":
        inputs = expected["nodes"][CURL]["inputs"]
        pinned = next(item for item in inputs if item[0] == OFFSET)
        if pinned[1] != 0.0:
            raise AssertionError("Frozen GN11 Random Offset is not zero")
        pinned[1] = 1.0
        checks.check("all-curves case changes only the actual unlinked Curl Random Offset default 0 to 1", not offset.is_linked and offset.default_value == 1.0 and actual == expected)
    else:
        node = tree.nodes[CHILD_NODE]
        reader = tree.nodes["Read is_guide"]
        stripped = copy.deepcopy(actual)
        added = stripped["nodes"].pop(CHILD_NODE)
        edges = [edge for edge in stripped["links"] if edge[0] == CHILD_NODE or edge[2] == CHILD_NODE]
        stripped["links"] = [edge for edge in stripped["links"] if edge not in edges]
        expected_edges = sorted([
            [reader.name, reader.outputs["Attribute"].identifier, node.name, node.inputs[1].identifier, 0],
            [node.name, node.outputs[0].identifier, curl.name, offset.identifier, 0],
        ])
        checks.check("child-only case adds exactly 1 minus existing BOOLEAN is_guide; all original graph/profile/library controls stay exact",
                     stripped == expected and added["type"] == "ShaderNodeMath" and node.operation == "SUBTRACT"
                     and node.use_clamp is False and node.inputs[0].default_value == 1.0
                     and not node.inputs[0].is_linked and reader.data_type == "BOOLEAN"
                     and reader.inputs["Name"].default_value == "is_guide" and sorted(edges) == expected_edges
                     and offset.is_linked)
    return actual


def compare_fixed(checks, baseline, actual, base_visibility, visibility, base_coat, coat):
    scene_exact = (base_visibility == visibility and all(baseline[key] == actual[key] for key in ("noncoat_controls", "mesh_topology", "modifier_inputs")))
    native_exact = set(baseline["curves"]) == set(actual["curves"])
    derived_exact = native_exact
    for name, old in baseline["curves"].items():
        new = actual["curves"][name]
        native_exact &= all(old[key] == new[key] for key in ("source", "source_attributes", "object_controls"))
        if name != h.COAT:
            derived_exact &= old["evaluated"] == new["evaluated"] and old["evaluated_attributes"] == new["evaluated_attributes"]
        else:
            old_record, new_record = copy.deepcopy(old["evaluated"]), copy.deepcopy(new["evaluated"])
            for key in ("positions_float32_sha256", "radii_float32_sha256"):
                old_record.pop(key); new_record.pop(key)
            excluded = {"position", "radius"}
            derived_exact &= old_record == new_record and {key: value for key, value in old["evaluated_attributes"].items() if key not in excluded} == {key: value for key, value in new["evaluated_attributes"].items() if key not in excluded}
    roots = (array_same(base_coat["roots"], coat["roots"])
             and array_same(base_coat["radii"][base_coat["offsets"][:-1]], coat["radii"][coat["offsets"][:-1]]))
    checks.check("full scene/camera/lights/materials/backing meshes/modifier settings and visibility remain frozen GN11", scene_exact)
    checks.check("every native guide/coat/UC/FA position/radius/rest/map and object control remains bitwise frozen", native_exact)
    checks.check("evaluated noncoat layers and all coat attributes outside authorized position/radius remain exact", derived_exact)
    checks.check("actual evaluated child roots and root radii remain bitwise fixed", roots)


def post_curl(checks, coat, normal, label, expected_mode):
    tree = coat.modifiers[h.MODIFIER].node_group
    curl = tree.nodes[CURL]
    offset = socket_by_id(curl.inputs, OFFSET)
    output = next(node for node in tree.nodes if node.type == "GROUP_OUTPUT" and node.is_active_output)
    output_socket = next(socket for socket in output.inputs if socket.type == "GEOMETRY")
    edge = next(edge for edge in tree.links if edge.to_node == output and edge.to_socket == output_socket)
    original_socket = edge.from_socket
    scene_before, visibility_before = r.snapshot(), w.visibility_controls()
    store = None
    try:
        store = tree.nodes.new("GeometryNodeStoreNamedAttribute")
        store.domain, store.data_type = "CURVE", "FLOAT"
        store.inputs["Name"].default_value = "__independent_gn12_random_offset"
        tree.links.new(next(socket for socket in curl.outputs if socket.type == "GEOMETRY"), store.inputs["Geometry"])
        if offset.is_linked:
            tree.links.new(next(edge.from_socket for edge in tree.links if edge.to_node == curl and edge.to_socket == offset), store.inputs["Value"])
        else:
            store.inputs["Value"].default_value = offset.default_value
        tree.links.new(store.outputs["Geometry"], output_socket)
        actual = g.reload_update(coat)
        evaluated = coat.evaluated_get(bpy.context.evaluated_depsgraph_get())
        guide_attr = evaluated.data.attributes["is_guide"]
        field_attr = evaluated.data.attributes["__independent_gn12_random_offset"]
        guide_mask = h.get_array(guide_attr.data, "value", dtype=np.bool_)
        offsets = h.get_array(field_attr.data, "value")
        domain_ok = (guide_attr.domain == field_attr.domain == "CURVE" and guide_attr.data_type == "BOOLEAN"
                     and field_attr.data_type == "FLOAT" and actual["curve_count"] == 87657
                     and np.all(np.diff(actual["offsets"]) == 12) and int(guide_mask.sum()) == 2657
                     and len(offsets) == len(guide_mask) == actual["curve_count"])
        expected = np.zeros(len(guide_mask), dtype=np.float32) if expected_mode == "control" else (np.ones(len(guide_mask), dtype=np.float32) if expected_mode == "all_curves" else (~guide_mask).astype(np.float32))
        checks.check(label + ": actual post-Curl is_guide and adapted Random Offset have CURVE domain; values match exact intended scope", domain_ok and array_same(offsets, expected))
        points_mask = np.repeat(guide_mask, np.diff(actual["offsets"]))
        result = {"guide_positions": actual["positions"][points_mask].copy(), "guide_radii": actual["radii"][points_mask].copy(),
                  "positions": actual["positions"].copy(), "radii": actual["radii"].copy(), "roots": actual["roots"].copy(),
                  "offsets": actual["offsets"].copy(), "guide_mask": guide_mask.copy(), "actual_offset": offsets.copy()}
        result["record"] = {"geometry_stage": "actual official Curl output before GN11 Capture/Profile and official Clump",
                            "curve_count": actual["curve_count"], "guide_count": int(guide_mask.sum()), "child_count": int((~guide_mask).sum()),
                            "is_guide_bool_sha256": h.array_hash(guide_mask, np.bool_), "actual_offset_float32_sha256": h.array_hash(offsets),
                            "guide_offset_unique": np.unique(offsets[guide_mask]).tolist(), "child_offset_unique": np.unique(offsets[~guide_mask]).tolist(),
                            "guides_position_float32_sha256": h.array_hash(result["guide_positions"]), "guides_radius_float32_sha256": h.array_hash(result["guide_radii"]),
                            "basis": "Actual saved official Curl output is temporarily routed through a CURVE FLOAT Store Named Attribute for the actual Random Offset socket source. Classification uses the existing actual CURVE BOOLEAN is_guide. This is field scope evidence, not radians or rendered quality."}
    finally:
        if store is not None:
            tree.nodes.remove(store)
        tree.links.new(original_socket, output_socket)
        restored = g.reload_update(coat)
        checks.check(label + ": temporary field/output probe restores complete scene/graph/native/evaluation bitwise",
                     h.curve_record(restored) == h.curve_record(normal) and r.snapshot() == scene_before and w.visibility_controls() == visibility_before)
    return result


def zero_offset_probe(checks, coat, normal, base_coat, mode):
    tree = coat.modifiers[h.MODIFIER].node_group
    offset = socket_by_id(tree.nodes[CURL].inputs, OFFSET)
    saved_default = offset.default_value
    saved_from = next((edge.from_socket for edge in tree.links if edge.to_socket == offset and edge.to_node == tree.nodes[CURL]), None)
    try:
        for edge in list(tree.links):
            if edge.to_socket == offset and edge.to_node == tree.nodes[CURL]:
                tree.links.remove(edge)
        offset.default_value = 0.0
        bypassed = g.reload_update(coat)
        exact = h.curve_record(bypassed) == h.curve_record(base_coat)
        checks.check(mode + ": restoring only Random Offset zero bitwise reproduces frozen GN11 evaluated child geometry/radii", exact)
        result = {"gn11_reproduced_bitwise": exact, "evaluated": h.curve_record(bypassed)}
    finally:
        offset.default_value = saved_default
        if saved_from is not None:
            tree.links.new(saved_from, offset)
        restored = g.reload_update(coat)
        checks.check(mode + ": original actual Random Offset case restores positions/radii bitwise", h.curve_record(restored) == h.curve_record(normal))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--all-curves", required=True)
    parser.add_argument("--child-only", required=True)
    parser.add_argument("--source-sha", required=True)
    parser.add_argument("--source-script", required=True)
    parser.add_argument("--report", default="hair-curl-phase-scope-validation-v12.json")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    if any(not re.fullmatch(r"swatch-reference-gn-[A-Za-z0-9_-]+-12", stem) for stem in (args.all_curves, args.child_only)) or args.all_curves == args.child_only:
        parser.error("Use the two producer-confirmed GN12 successful saved stems")
    if not re.fullmatch(r"[a-f0-9]{64}", args.source_sha) or not re.fullmatch(r"[A-Za-z0-9_-]+\.py", args.source_script) or not re.fullmatch(r"[A-Za-z0-9_-]+\.json", args.report):
        parser.error("Use confirmed source SHA and exclusive source/report names")
    report = {"status": "checking", "checks": [], "errors": [], "cases": {}, "control_asset": CONTROL,
              "validated_at_utc": datetime.now(timezone.utc).isoformat(), "blender": bpy.app.version_string,
              "validator": str(Path(__file__).relative_to(ROOT)),
              "scope": "Independent saved GN12 Random Offset all-curves vs child-only scope; actual post-Curl CURVE mask/field/guide buffers; immutable native/history/GN11 profile/official groups/scene, reversible causal and guide propagation checks, saved reloads and completed GPU receipts. CPU only, no asset save/render. No visual acceptance or physical softness claims."}
    checks = h.Checks(report)
    with (OUT / args.report).open("x", encoding="utf-8") as stream:
        try:
            checks.track(Path(__file__))
            checks.source("frozen GN11 independent helper bytes", HELPER, HELPER_SHA)
            checks.source("frozen GN11 independent report bytes", OUT / "hair-clump-profile-validation-v11.json", HISTORY_SHA)
            historical = checks.read_json(OUT / "hair-clump-profile-validation-v11.json")
            mismatches = []
            for entry in historical["checks"]:
                if entry["check"].startswith("read-only input preserved: "):
                    path = h.path_from(entry["check"].removeprefix("read-only input preserved: "), ROOT)
                    if checks.track(path) != entry["details"]["sha256_before"]:
                        mismatches.append(h.label_path(path))
            checks.check("all historical GN11 inputs retain their previously pinned SHA256", not mismatches, {"mismatches": mismatches})
            checks.source("frozen GN11 saved control bytes", OUT / (CONTROL + ".blend"), CONTROL_SHA)
            checks.source("current final GN12 authoring source bytes", Path(__file__).with_name(args.source_script), args.source_sha)
            bpy.ops.wm.open_mainfile(filepath=str(OUT / (CONTROL + ".blend")))
            baseline, base_visibility = r.snapshot(), w.visibility_controls()
            base_coat = h.native_curves(bpy.context.scene.objects[h.COAT], evaluated=True)
            camera_forward = list(bpy.context.scene.camera.matrix_world.col[2].xyz)
            control_post = post_curl(checks, bpy.context.scene.objects[h.COAT], base_coat, "GN11 control", "control")
            report["control_post_curl"] = control_post["record"]
            for mode, stem in (("all_curves", args.all_curves), ("child_only", args.child_only)):
                recorded = checks.read_json(OUT / (stem + ".gn-report.json"))
                meta = checks.read_json(OUT / (stem + ".json"))
                checks.source(mode + ": frozen actual authoring snapshot bytes", h.path_from(recorded["wrapper_source_snapshot"]), args.source_sha)
                checks.check(mode + ": CPU gate references frozen GN11 and final source", recorded["status"] == "engineering_precheck_passed" and recorded["control_asset"] == CONTROL and recorded["source_blend_sha256"] == CONTROL_SHA and recorded["wrapper_source_sha256"] == args.source_sha)
                result = report["cases"][stem] = {"mode": mode}
                c.render_evidence(checks, recorded, meta, stem, result)
                checks.source(mode + ": actual saved blend bytes match CPU precheck", OUT / (stem + ".blend"), recorded["saved_blend_sha256"])
                bpy.ops.wm.open_mainfile(filepath=str(OUT / (stem + ".blend")))
                actual, visibility = r.snapshot(), w.visibility_controls()
                coat, guide = bpy.context.scene.objects[h.COAT], bpy.context.scene.objects[h.GUIDE]
                evaluated = h.native_curves(coat, evaluated=True)
                compare_fixed(checks, baseline, actual, base_visibility, visibility, base_coat, evaluated)
                graph_scope(checks, baseline["tree"], coat.modifiers[h.MODIFIER].node_group, mode)
                post = post_curl(checks, coat, evaluated, mode, mode)
                guide_equal = array_same(post["guide_positions"], control_post["guide_positions"]) and array_same(post["guide_radii"], control_post["guide_radii"])
                guide_displacement = np.linalg.norm(post["guide_positions"].astype(np.float64) - control_post["guide_positions"].astype(np.float64), axis=1).reshape(-1, 12).max(axis=1)
                changed_guides = int(np.count_nonzero(guide_displacement > 1e-8))
                checks.check(mode + ": post-Curl guide buffers obey the intended phase scope", guide_equal if mode == "child_only" else changed_guides > 0)
                checks.check(mode + ": post-Curl curve mask/topology/roots stay fixed", array_same(post["guide_mask"], control_post["guide_mask"]) and array_same(post["offsets"], control_post["offsets"]) and array_same(post["roots"], control_post["roots"]))
                result["post_curl"] = {**post["record"], "guides_bitwise_equal_gn11": guide_equal, "changed_guide_curve_count": changed_guides, "maximum_guide_displacement_scene_units": float(guide_displacement.max())}
                result["causal_zero_offset_probe"] = zero_offset_probe(checks, coat, evaluated, base_coat, mode)
                ids = h.get_array(coat.data.attributes["pile_guide_index"].data, "value", dtype=np.int32)
                result["independent_live_guide_probe"] = c.independent_live_probe(checks, coat, guide, evaluated, ids)
                checks.check(mode + ": all reversible probes restore entire saved graph/scene/attributes/visibility", r.snapshot() == actual and w.visibility_controls() == visibility)
                result["coat_geometry"] = c.measure_geometry(checks, base_coat, evaluated, camera_forward, "actual " + mode + " coat")
                checks.check(mode + ": actual saved child geometry genuinely differs from GN11", result["coat_geometry"]["changed_curve_count"] > 0)
                result["derived_radius_response"] = {"changed_point_count": int(np.count_nonzero(evaluated["radii"] != base_coat["radii"])), "point_count": evaluated["point_count"], "maximum_absolute_delta": float(np.max(np.abs(evaluated["radii"].astype(np.float64) - base_coat["radii"].astype(np.float64)))), "basis": "Actual evaluated downstream radius response; native radii and evaluated root radii fixed. Not a physical fiber-diameter or visual-softness claim."}
                result["saved_snapshot"] = actual
                for reload_number in (1, 2):
                    bpy.ops.wm.open_mainfile(filepath=str(OUT / (stem + ".blend")))
                    checks.check(mode + ": saved reload " + str(reload_number) + " reproduces complete buffers/graph/scene bitwise", r.snapshot() == actual and w.visibility_controls() == visibility)
        except Exception as error:
            checks.check("independent GN12 saved scope inspection completes", False, {"exception": type(error).__name__, "message": str(error)})
        finally:
            checks.preserve_inputs()
            report["input_count"], report["check_count"] = len(checks.inputs), len(report["checks"])
            report["status"] = "failed" if report["errors"] else "passed"
            json.dump(report, stream, ensure_ascii=False, indent=2, allow_nan=False); stream.write("\n")
    print("PLUSH_CURL_PHASE_SCOPE_VALIDATION", json.dumps({key: report[key] for key in ("status", "check_count", "input_count", "errors")}, ensure_ascii=False), flush=True)
    if report["errors"]:
        raise AssertionError("Saved GN12 validation failed: " + "; ".join(report["errors"]))


if __name__ == "__main__":
    main()
