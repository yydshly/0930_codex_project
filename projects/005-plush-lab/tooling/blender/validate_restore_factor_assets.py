"""Independent saved GN Restore Factor 1 -> 0 validation; no render/save.

GN4's validator stays unchanged. Its immutable helper functions are reused for
native arrays, official group comparison, and reversible in-memory guide probes.
Output JSON is exclusively created; historical reports cannot be overwritten.
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
HELPER_PATH = Path(__file__).with_name("validate_hair_nodes_assets.py")
HELPER_SHA256 = "6399a952b2e0568ba0a63ed9d17a71ef90e300b4a990c7581de3dfe948e374ce"
CONTROL = "swatch-reference-gn-undercoat-short-live-4"
RESTORE_NODE = "Restore Curve Segment Length"
RESTORE_SOCKET = "Factor"

spec = importlib.util.spec_from_file_location("plush_gn4_validation_helpers", HELPER_PATH)
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)


def single_socket_expected(record, node_name, identifier, before=1.0, after=0.0):
    """Make only one permitted change to the independent control tree record."""
    result = copy.deepcopy(record)
    sockets = result["nodes"][node_name]["inputs"]
    matches = [socket for socket in sockets if socket[0] == identifier]
    if len(matches) != 1 or matches[0][1] != before:
        raise ValueError("Control record does not contain exactly one expected Restore Factor input")
    matches[0][1] = after
    return result


def snapshot():
    curves = {}
    for obj in bpy.context.scene.objects:
        if obj.type != "CURVES":
            continue
        source, evaluated = h.native_curves(obj), h.native_curves(obj, evaluated=True)
        evaluated_obj = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
        curves[obj.name] = {
            "source": h.curve_record(source), "source_attributes": h.frozen_native_attributes(obj),
            "evaluated": h.curve_record(evaluated),
            "evaluated_attributes": h.frozen_native_attributes(evaluated_obj),
            "object_controls": {"matrix_world": [list(row) for row in obj.matrix_world],
                                "hide_render": obj.hide_render, "hide_viewport": obj.hide_viewport,
                                "hide_get": obj.hide_get()},
        }
    coat = bpy.context.scene.objects[h.COAT]
    return {"curves": curves, "noncoat_controls": h.noncoat_controls(),
            "mesh_topology": h.mesh_topology_snapshot(), "modifier_inputs": h.live_input_record(coat),
            "tree": h.group_semantics(coat.modifiers[h.MODIFIER].node_group)}


def compare_control(checks, previous, actual, socket_identifier):
    checks.check("Restore experiment preserves exact native curve object set", set(previous["curves"]) == set(actual["curves"]))
    for name, old in previous["curves"].items():
        new = actual["curves"].get(name)
        if new is None:
            raise RuntimeError("Fixed saved curve object missing: " + name)
        if name != h.COAT:
            checks.check("Restore-only experiment leaves all native/evaluated attributes unchanged: " + name, new == old)
            continue
        for key in ("source", "source_attributes", "object_controls"):
            checks.check("Restore-only experiment keeps source coat unchanged: " + key, new[key] == old[key])
        old_evaluated, new_evaluated = copy.deepcopy(old["evaluated"]), copy.deepcopy(new["evaluated"])
        old_position_sha = old_evaluated.pop("positions_float32_sha256")
        new_position_sha = new_evaluated.pop("positions_float32_sha256")
        old_evaluated.pop("radii_float32_sha256")
        new_evaluated.pop("radii_float32_sha256")
        checks.check("Restore-only evaluated coat keeps topology/counts/roots/materials bitwise equal GN4", new_evaluated == old_evaluated)
        checks.check("Restore Factor change genuinely changes actual evaluated coat positions", old_position_sha != new_position_sha,
                     {"control_positions_float32_sha256": old_position_sha, "candidate_positions_float32_sha256": new_position_sha})
        old_attributes = {key: value for key, value in old["evaluated_attributes"].items() if key not in {"position", "radius"}}
        new_attributes = {key: value for key, value in new["evaluated_attributes"].items() if key not in {"position", "radius"}}
        checks.check("Restore-only evaluated coat keeps every attribute outside position/radius bitwise equal GN4", new_attributes == old_attributes)
    for name in ("noncoat_controls", "mesh_topology", "modifier_inputs"):
        checks.check("Restore-only experiment keeps actual saved GN4 controls unchanged: " + name, actual[name] == previous[name])
    expected = single_socket_expected(previous["tree"]["record"], RESTORE_NODE, socket_identifier)
    checks.check("complete actual GN tree differs from saved GN4 only at Restore Factor 1 to 0",
                 actual["tree"]["record"] == expected,
                 {"socket_identifier": socket_identifier, "control_tree_sha256": previous["tree"]["sha256"],
                  "candidate_tree_sha256": actual["tree"]["sha256"]})


class RestoreGraphChecks:
    """Reuse GN4 graph checks, replacing its obsolete Factor=1 expectation.

    No graph value is mutated. Only the named check's old expectation is replaced
    with a direct read of Factor=0; the rest of the GN4 graph checks are retained.
    """
    def __init__(self, checks, restore):
        self.checks, self.restore = checks, restore

    def check(self, label, condition, details=None):
        if label == "actual official Restore factor1/pin0 uses live reference positions":
            restore = self.restore
            return self.checks.check("actual official Restore factor0/pin0 retains linked live reference positions",
                                     restore.inputs[RESTORE_SOCKET].default_value == 0
                                     and not restore.inputs[RESTORE_SOCKET].is_linked
                                     and restore.inputs["Pin at Parameter"].default_value == 0
                                     and restore.inputs["Reference Position"].is_linked)
        return self.checks.check(label, condition, details)


def render_evidence(checks, recorded, meta, asset, report):
    checks.check("CPU engineering metadata/report retain the same generation render fact",
                 recorded.get("rendered") is meta.get("rendered"))
    report["engineering_generation_rendered"] = recorded.get("rendered") is True
    receipt_name = recorded.get("render_receipt") or meta.get("render_receipt")
    checks.check("GN5 references one exclusively created separate render receipt",
                 receipt_name == meta.get("render_receipt") == recorded.get("render_receipt") == asset + ".render.json")
    receipt = checks.read_json(h.path_from(receipt_name))
    checks.check("separate receipt records completed rendering at actual saved controls",
                 receipt.get("rendered") is True and receipt.get("kind") == meta["kind"]
                 and receipt.get("resolution") == meta["resolution"] and receipt.get("samples") == meta["samples"]
                 and receipt.get("blend") == recorded["blend"] and receipt.get("png") == recorded["png"])
    checks.source("render receipt matches unchanged actual saved blend", h.path_from(receipt["blend"]), receipt["blend_sha256"])
    checks.source("render receipt matches actual saved PNG bytes", h.path_from(receipt["png"]), receipt["png_sha256"])
    checks.check("receipt wrapper SHA matches actual frozen GN5 snapshot", receipt.get("wrapper_source_sha256") == recorded["wrapper_source_sha256"])
    image = bpy.data.images.load(str(h.path_from(receipt["png"])), check_existing=False)
    try:
        pixels = np.empty(len(image.pixels), dtype=np.float32)
        image.pixels.foreach_get(pixels)
        checks.check("rendered PNG decodes at saved resolution with finite pixels",
                     list(image.size) == [meta["resolution"]]*2 and np.isfinite(pixels).all())
    finally:
        bpy.data.images.remove(image)
    for suffix in (".log", ".precheck.log", ".render.log"):
        path = OUT / (asset + suffix)
        if path.is_file():
            checks.track(path)
    report["asset_rendered"], report["render_receipt"] = receipt.get("rendered") is True, receipt


def measure_arcs(checks, original, source, previous, evaluated):
    arrays = {name: h.lengths(curves["positions"], curves["offsets"]) for name, curves in (
        ("v3", original), ("rest", source), ("GN4_evaluated", previous), ("GN5_evaluated", evaluated))}
    checks.check("all independent actual saved Catmull-Rom arc measurements finite and positive",
                 all(np.isfinite(value).all() and (value > 0).all() for value in arrays.values()))
    return {"quadrature_order": 32, "measurements": {name: h.summary(value) for name, value in arrays.items()},
            "GN5_to_rest_ratio": h.summary(arrays["GN5_evaluated"]/arrays["rest"]),
            "GN5_to_GN4_ratio": h.summary(arrays["GN5_evaluated"]/arrays["GN4_evaluated"]),
            "absolute_relative_change_from_rest": h.summary(np.abs(arrays["GN5_evaluated"]/arrays["rest"]-1)),
            "relative_change_from_v3": h.summary(arrays["GN5_evaluated"]/arrays["v3"]-1),
            "scope": "Order32 uniform Catmull-Rom on actual saved float32 controls, duplicated endpoints. No prior candidate drift constants, v3 preservation requirement or physical-simulation claim."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--asset", default="swatch-reference-gn-restore-off-live-5")
    parser.add_argument("--report", default="hair-nodes-render-validation-v5.json")
    args = parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    if not re.fullmatch(r"[A-Za-z0-9_-]+", args.asset) or not re.fullmatch(r"[A-Za-z0-9_-]+\.json", args.report):
        parser.error("Use simple artifact stems and a new JSON filename")
    report = {"status": "checking", "checks": [], "errors": [], "check_count": 0,
              "validated_at_utc": datetime.now(timezone.utc).isoformat(),
              "validator": str(Path(__file__).relative_to(ROOT)), "blender": bpy.app.version_string,
              "asset": args.asset,
              "scope": "Independent actual saved Restore Factor single-socket comparison, official source, native/evaluated curves, guide dependency and input preservation. Engineering verification does not establish visual acceptance or physical/paper-method reproduction."}
    checks = h.Checks(report)
    output = OUT / args.report
    with output.open("x", encoding="utf-8") as stream:
        try:
            checks.source("GN4 validator helper remains its frozen verified bytes", HELPER_PATH, HELPER_SHA256)
            meta = checks.read_json(OUT / (args.asset + ".json"))
            recorded = checks.read_json(OUT / (args.asset + ".gn-report.json"))
            checks.check("saved engineering generation completed", recorded.get("status") == "engineering_precheck_passed")
            checks.check("candidate file metadata agree with actual requested native artifact",
                         recorded.get("blend") == meta.get("blend") == args.asset + ".blend"
                         and recorded.get("png") == meta.get("png") == args.asset + ".png")
            checks.check("GN5 uses the authorized saved GN4 control", recorded.get("control_asset") == CONTROL)
            checks.source("actual GN5 wrapper snapshot matches recorded frozen source", h.path_from(recorded["wrapper_source_snapshot"]), recorded["wrapper_source_sha256"])
            checks.source("actual inherited baseline source remains frozen v3", h.path_from(recorded["baseline_source"], ROOT), h.BASE_SHA256)
            checks.source("actual inherited baseline snapshot remains frozen v3", h.path_from(recorded["baseline_snapshot"]), h.BASE_SHA256)
            library = h.path_from(recorded["official_asset_library"], ROOT)
            checks.source("actual official library matches recorded source bytes", library, recorded["official_asset_sha256"])
            render_evidence(checks, recorded, meta, args.asset, report)
            baseline_meta = checks.read_json(OUT / "swatch-reference-v3.json")
            baseline_path = h.path_from(baseline_meta["blend"])
            checks.track(baseline_path)
            bpy.ops.wm.open_mainfile(filepath=str(baseline_path))
            original = h.native_curves(bpy.context.scene.objects[h.COAT])
            control_report = checks.read_json(OUT / (CONTROL + ".gn-report.json"))
            checks.source("actual saved GN4 control retains its own frozen source", h.path_from(control_report["wrapper_source_snapshot"]), control_report["wrapper_source_sha256"])
            checks.source("GN5 references the exact actual frozen GN4 helper source", h.path_from(recorded["control_wrapper_source_snapshot"]), recorded["control_wrapper_source_sha256"])
            checks.check("GN5 inherited helper source agrees with saved control report", recorded["control_wrapper_source_sha256"] == control_report["wrapper_source_sha256"])
            control_path = h.path_from(control_report["blend"])
            control_sha = checks.track(control_path)
            checks.check("GN5 source blend SHA matches actual saved GN4", recorded.get("source_blend_sha256") == control_sha)
            bpy.ops.wm.open_mainfile(filepath=str(control_path))
            previous = snapshot()
            previous_evaluated = h.native_curves(bpy.context.scene.objects[h.COAT], evaluated=True)
            previous_restore = bpy.context.scene.objects[h.COAT].modifiers[h.MODIFIER].node_group.nodes[RESTORE_NODE]
            identifier = previous_restore.inputs[RESTORE_SOCKET].identifier
            checks.check("actual saved GN4 Restore Factor control is unlinked 1", previous_restore.inputs[RESTORE_SOCKET].default_value == 1
                         and not previous_restore.inputs[RESTORE_SOCKET].is_linked)
            candidate_path = h.path_from(recorded["blend"])
            checks.track(candidate_path)
            bpy.ops.wm.open_mainfile(filepath=str(candidate_path))
            coat, guide = bpy.context.scene.objects[h.COAT], bpy.context.scene.objects[h.GUIDE]
            restore = coat.modifiers[h.MODIFIER].node_group.nodes[RESTORE_NODE]
            change = recorded["restore_change"]
            checks.check("saved intervention descriptor agrees with the actual single Restore socket",
                         change.get("socket_identifier") == identifier == restore.inputs[RESTORE_SOCKET].identifier
                         and change.get("before") == 1 and change.get("after") == 0
                         and change.get("node_group") == h.TREE and change.get("node") == RESTORE_NODE
                         and change.get("socket") == RESTORE_SOCKET)
            checks.check("actual saved GN5 Restore Factor is unlinked zero", restore.inputs[RESTORE_SOCKET].default_value == 0
                         and not restore.inputs[RESTORE_SOCKET].is_linked)
            actual = snapshot()
            compare_control(checks, previous, actual, identifier)
            report["control_asset"], report["control_snapshot"], report["candidate_snapshot"] = CONTROL, previous, actual
            report["restore_change"] = {"node": RESTORE_NODE, "socket": RESTORE_SOCKET,
                                         "socket_identifier": identifier, "before": 1, "after": 0}
            source, guide_source, evaluated = h.native_curves(coat), h.native_curves(guide), h.native_curves(coat, evaluated=True)
            count = original["curve_count"]
            for label, curves, expected in (("source coat", source, count), ("evaluated coat", evaluated, count),
                                            ("independent guides", guide_source, previous["curves"][h.GUIDE]["source"]["curve_count"])):
                h.verify_native(checks, label, curves, expected)
            checks.check("actual saved source/evaluated coat roots retain every v3 bit",
                         h.array_hash(source["roots"]) == h.array_hash(evaluated["roots"]) == h.array_hash(original["roots"]))
            checks.check("actual evaluated root-radius bits retain the actual saved GN4 values",
                         h.array_hash(evaluated["radii"][evaluated["offsets"][:-1]])
                         == h.array_hash(previous_evaluated["radii"][previous_evaluated["offsets"][:-1]]))
            checks.check("actual evaluated coat radii are finite and strictly positive",
                         np.isfinite(evaluated["radii"]).all() and (evaluated["radii"] > 0).all())
            radius_delta = evaluated["radii"].astype(np.float64)-previous_evaluated["radii"].astype(np.float64)
            changed_radius = evaluated["radii"].view(np.uint32) != previous_evaluated["radii"].view(np.uint32)
            report["evaluated_radius_response"] = {
                "changed_point_count": int(np.count_nonzero(changed_radius)),
                "changed_point_fraction": float(np.mean(changed_radius)),
                "maximum_absolute_radius_delta": float(np.max(np.abs(radius_delta))),
                "candidate_radii_float32_sha256": h.array_hash(evaluated["radii"]),
                "control_radii_float32_sha256": h.array_hash(previous_evaluated["radii"]),
                "absolute_delta": h.summary(np.abs(radius_delta)),
                "scope": "Evaluated radii may respond through the unchanged downstream profile to the changed curve geometry/parameterization. Source radii and evaluated root radii remain fixed."}
            checks.check("actual source/evaluated coat position SHA match recorded native measurements",
                         h.array_hash(source["positions"]) == recorded["coat"]["input_positions_float32_sha256"]
                         and h.array_hash(evaluated["positions"]) == recorded["coat"]["evaluated_positions_float32_sha256"])
            checks.check("actual evaluated coat radii SHA matches newly saved generation measurement",
                         h.array_hash(evaluated["radii"]) == recorded["coat"]["evaluated_radii_float32_sha256"])
            mapping, report["guide_assignment"] = h.read_saved_mapping(checks, coat, guide, source, guide_source, recorded)
            h.curve_attribute(checks, "coat", coat, "is_guide", "BOOLEAN", np.zeros(count, dtype=np.bool_))
            gcount = guide_source["curve_count"]
            h.curve_attribute(checks, "guides", guide, "is_guide", "BOOLEAN", np.ones(gcount, dtype=np.bool_))
            h.curve_attribute(checks, "guides", guide, "pile_guide_index", "INT", count + np.arange(gcount, dtype=np.int32))
            # Evaluation above precedes all fresh canonical library imports.
            report["graph"] = h.verify_graph(RestoreGraphChecks(checks, restore), coat, guide, recorded, library)
            report["joined_domain_probe"] = h.joined_domain_probe(checks, coat, guide, evaluated, original["roots"], mapping)
            report["guide_probe"] = h.guide_probe(checks, coat, guide, evaluated, original["roots"], mapping)
            report["measured_arc_length"] = measure_arcs(checks, original, source, previous_evaluated, evaluated)
            counts = {obj.name: h.native_curves(obj, evaluated=True)["curve_count"] for obj in bpy.context.scene.objects if obj.type == "CURVES" and not obj.hide_render}
            checks.check("actual rendered native hair count remains 177500 with helpers hidden", sum(counts.values()) == 177500,
                         {"rendered_layers": counts, "actual_total": sum(counts.values())})
            report["source_coat"], report["evaluated_coat"], report["guides"] = h.curve_record(source), h.curve_record(evaluated), h.curve_record(guide_source)
        except Exception as error:
            checks.check("independent saved Restore Factor inspection completes", False,
                         {"exception": type(error).__name__, "message": str(error)})
        finally:
            try:
                checks.preserve_inputs()
            except Exception as error:
                checks.check("input preservation completes", False, {"exception": type(error).__name__, "message": str(error)})
            report["input_count"], report["check_count"] = len(checks.inputs), len(report["checks"])
            report["status"] = "failed" if report["errors"] else "passed"
            json.dump(report, stream, ensure_ascii=False, indent=2, allow_nan=False)
            stream.write("\n")
    print("PLUSH_RESTORE_FACTOR_VALIDATION", json.dumps({"status": report["status"], "checks": report["check_count"],
          "inputs": report["input_count"], "errors": report["errors"], "report": str(output)}, ensure_ascii=False), flush=True)
    if report["errors"]:
        raise AssertionError("Saved Restore Factor validation failed: " + "; ".join(report["errors"]))


if __name__ == "__main__":
    main()
