"""Independent read-only saved GN8 layer visibility validation.

Only three hide_render controls are authorized. No render or blend saving.
Each output report is exclusively created, leaving earlier evidence immutable.
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
HELPER_PATH = Path(__file__).with_name("validate_spatial_guide_assets.py")
HELPER_SHA256 = "cac3562c116b0e1f1456cf977dc0cdc74ff6c1f1e9d81401f136fe84f4fce3ad"
CONTROL = "swatch-reference-gn-crown-008-live-7"
CONTROL_BLEND_SHA256 = "8ac53a154987ab41d22fb0058444b902bcdf299f555f4706e360b94609c93354"
WRAPPER_SHA256 = "0c8c14cc9d13c9d436f00f5b2c0d14b3b8acc800a3ffc007325d22aa4fad3dd0"
LAYERS = {name: "Blue pile · " + name for name in ("coat", "undercoat", "flyaway")}
COUNTS = {"coat": 85000, "undercoat": 90000, "flyaway": 2500}
CASES = {"coat-only": ["coat"], "undercoat-only": ["undercoat"],
         "flyaway-only": ["flyaway"], "no-flyaway": ["coat", "undercoat"]}
STEMS = {"swatch-reference-gn-" + name + "-8": name for name in CASES}
FROZEN_SOURCES = {
    CONTROL + ".source.py": "ce8d69473c06f0365b75fe3c4e3de3b87988720aeacd30757e2a183b10d22a60",
    "swatch-reference-gn-undercoat-short-live-4.source.py": "5b1d9049cec289828a6e354ce334d37873fa8343c4f5a0aa848315732125609c",
    "swatch-reference-gn-nearest-render-3.gn-source.py": "be7730c0ddba22109ebc31dd44e8660672df7fd2cb8d361093688ce9fcc2c927",
}

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("plush_frozen_gn7_validation_helpers", HELPER_PATH)
v = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v)
q, r, h = v.q, v.r, v.h


def visibility_controls():
    """Actual visibility of every scene object, including backing and lights."""
    flags = ("hide_render", "hide_viewport", "hide_select", "visible_camera", "visible_diffuse",
             "visible_glossy", "visible_transmission", "visible_volume_scatter", "visible_shadow")
    return {obj.name: {"type": obj.type, "hide_get": obj.hide_get(),
                      "flags": {name: getattr(obj, name) for name in flags if hasattr(obj, name)},
                      "modifiers": [[mod.name, mod.type, mod.show_render, mod.show_viewport] for mod in obj.modifiers]}
            for obj in bpy.context.scene.objects}


def expected_visibility(control, visible_layers):
    result = copy.deepcopy(control)
    for layer, name in LAYERS.items():
        result[name]["flags"]["hide_render"] = layer not in visible_layers
    return result


def expected_snapshot(control, visible_layers):
    result = copy.deepcopy(control)
    for layer, name in LAYERS.items():
        result["curves"][name]["object_controls"]["hide_render"] = layer not in visible_layers
    return result


def measured_report_fields(recorded, snapshot, visibility):
    """Cross-check report native records against independent actual measurements."""
    objects = recorded["frozen_scene_state"]["objects"]
    if set(objects) != set(visibility):
        return False
    for name, item in objects.items():
        if item["type"] != visibility[name]["type"] or item["hide_render"] != visibility[name]["flags"]["hide_render"]:
            return False
        if name not in snapshot["curves"]:
            continue
        curve = snapshot["curves"][name]
        source, evaluated = curve["source"], curve["evaluated"]
        for report_key, actual_key in (("positions", "positions_float32_sha256"), ("radii", "radii_float32_sha256"), ("roots", "roots_float32_sha256")):
            if item[report_key] != source[actual_key]:
                return False
        if item["topology"] != [source["curve_count"], source["point_count"] // source["curve_count"]]:
            return False
        for report_key, actual_key in (("evaluated_positions", "positions_float32_sha256"), ("evaluated_radii", "radii_float32_sha256")):
            if report_key in item and item[report_key] != evaluated[actual_key]:
                return False
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assets", nargs="+", default=list(STEMS))
    parser.add_argument("--report", default="hair-layer-validation-v8.json")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    if len(set(args.assets)) != len(args.assets) or any(stem not in STEMS for stem in args.assets):
        parser.error("Select authorized GN8 asset stems without duplicates")
    if not re.fullmatch(r"[A-Za-z0-9_-]+\.json", args.report):
        parser.error("Use a new simple JSON report filename")
    report = {"status": "checking", "checks": [], "errors": [], "check_count": 0,
              "validated_at_utc": datetime.now(timezone.utc).isoformat(), "blender": bpy.app.version_string,
              "validator": str(Path(__file__).relative_to(ROOT)), "control_asset": CONTROL, "cases": {},
              "scope": "Actual saved GN7 .08 to GN8 differences limited to three hide_render controls; complete native/evaluated geometry, GN and scene fixed. Layer render source diagnostics retain backing/floor/lights, have different visible hair counts and are not pixel visibility decompositions or equal-density visual acceptance tests."}
    shared = h.Checks(report)
    output = OUT / args.report
    with output.open("x", encoding="utf-8") as stream:
        try:
            for label, path, expected in (("GN7", HELPER_PATH, HELPER_SHA256), ("GN6", v.HELPER_PATH, v.HELPER_SHA256),
                                          ("GN5", q.HELPER_PATH, q.HELPER_SHA256), ("GN4", r.HELPER_PATH, r.HELPER_SHA256)):
                shared.source(label + " validator helper retains frozen bytes", path, expected)
            control_report = shared.read_json(OUT / (CONTROL + ".gn-report.json"))
            for name, expected in FROZEN_SOURCES.items():
                shared.source("frozen generation dependency matches actual source: " + name, OUT / name, expected)
            control_path = OUT / (CONTROL + ".blend")
            shared.source("actual saved GN7 .08 control matches frozen bytes", control_path, CONTROL_BLEND_SHA256)
            library = h.path_from(control_report["official_asset_library"], ROOT)
            shared.source("official asset source retains actual frozen bytes", library, control_report["official_asset_sha256"])
            bpy.ops.wm.open_mainfile(filepath=str(control_path))
            previous, previous_visibility = r.snapshot(), visibility_controls()
            coat, guide = bpy.context.scene.objects[h.COAT], bpy.context.scene.objects[h.GUIDE]
            identifier = next(item.identifier for item in coat.modifiers[h.MODIFIER].node_group.interface.items_tree
                              if item.item_type == "SOCKET" and item.in_out == "INPUT" and item.name == "Tip Spread")
            report["control_graph_proof"] = q.official_graph_proof(shared, coat, guide, library, identifier)
            shared.check("actual saved GN7 .08 starts with all three hair layers visible and guide hidden",
                         all(not previous_visibility[name]["flags"]["hide_render"] for name in LAYERS.values()) and guide.hide_render)
            report["control_snapshot"], report["control_visibility"] = previous, previous_visibility
            for stem in args.assets:
                checks = q.CaseChecks(shared, stem)
                case, visible = STEMS[stem], CASES[STEMS[stem]]
                candidate = report["cases"][stem] = {}
                meta = checks.read_json(OUT / (stem + ".json"))
                recorded = checks.read_json(OUT / (stem + ".gn-report.json"))
                checks.check("generation descriptor references the frozen actual GN7 .08 control",
                             recorded.get("status") == "engineering_precheck_passed" and recorded.get("control_asset") == CONTROL
                             and recorded.get("source_blend_sha256") == CONTROL_BLEND_SHA256 and meta.get("control_asset") == CONTROL)
                checks.source("new isolated wrapper snapshot matches independently frozen source", h.path_from(recorded["wrapper_source_snapshot"]), WRAPPER_SHA256)
                checks.check("wrapper descriptor agrees with frozen source bytes", recorded["wrapper_source_sha256"] == meta["wrapper_source_sha256"] == WRAPPER_SHA256)
                r.render_evidence(checks, recorded, meta, stem, candidate)
                receipt = candidate["render_receipt"]
                checks.check("real GPU receipt identifies the authorized layer case", receipt.get("case") == case and receipt.get("visible_layers") == visible)
                asset_path = h.path_from(recorded["blend"])
                checks.source("saved blend matches final CPU gate", asset_path, recorded["saved_blend_sha256"])
                bpy.ops.wm.open_mainfile(filepath=str(asset_path))
                actual, actual_visibility = r.snapshot(), visibility_controls()
                checks.check("all actual native/evaluated arrays, attributes, GN, camera/light/material/mesh/render controls fixed except authorized hair hide_render",
                             actual == expected_snapshot(previous, visible))
                checks.check("every scene object and modifier visibility fixed except exact authorized layer combination",
                             actual_visibility == expected_visibility(previous_visibility, visible))
                hide = {layer: layer not in visible for layer in LAYERS}
                checks.check("saved layer descriptor agrees with actual combination and fixed native counts",
                             recorded["layer_change"] == meta["layer_change"]
                             and recorded["layer_change"]["case"] == case and recorded["layer_change"]["visible_layers"] == visible
                             and recorded["layer_change"]["hide_render"] == hide and recorded["layer_change"]["native_layer_counts"] == COUNTS)
                checks.check("report frozen native/visibility fields equal independently read saved data", measured_report_fields(recorded, actual, actual_visibility))
                counts = {layer: actual["curves"][name]["evaluated"]["curve_count"] for layer, name in LAYERS.items()}
                rendered = {obj.name: h.native_curves(obj, evaluated=True)["curve_count"] for obj in bpy.context.scene.objects
                            if obj.type == "CURVES" and not obj.hide_render}
                expected_rendered = {LAYERS[layer]: COUNTS[layer] for layer in visible}
                checks.check("actual visible hair objects and evaluated count equal authorized combination", rendered == expected_rendered and counts == COUNTS,
                             {"actual": rendered, "expected": expected_rendered, "total_rendered_hairs": sum(rendered.values())})
                curves = [h.native_curves(bpy.context.scene.objects[name], evaluated=True) for name in LAYERS.values()]
                checks.check("all saved evaluated hair arrays remain finite with nonnegative radii and positive root radii",
                             all(np.isfinite(c["positions"]).all() and np.isfinite(c["radii"]).all() and (c["radii"] >= 0).all()
                                 and (c["radii"][c["offsets"][:-1]] > 0).all() and c["valid_topology"] for c in curves))
                candidate.update(layer_change=recorded["layer_change"], visible_hair_counts=rendered, total_rendered_hairs=sum(rendered.values()),
                                 candidate_snapshot=actual, candidate_visibility=actual_visibility)
                bpy.ops.wm.open_mainfile(filepath=str(asset_path))
                checks.check("second independent saved reload reproduces all geometry/GN/scene and visibility records",
                             r.snapshot() == actual and visibility_controls() == actual_visibility)
        except Exception as error:
            shared.check("independent saved GN8 inspection completes", False, {"exception": type(error).__name__, "message": str(error)})
        finally:
            try:
                shared.preserve_inputs()
            except Exception as error:
                shared.check("read-only input preservation completes", False, {"exception": type(error).__name__, "message": str(error)})
            report["input_count"], report["check_count"] = len(shared.inputs), len(report["checks"])
            report["status"] = "failed" if report["errors"] else "passed"
            json.dump(report, stream, ensure_ascii=False, indent=2, allow_nan=False)
            stream.write("\n")
    print("PLUSH_LAYER_VALIDATION", json.dumps({"status": report["status"], "checks": report["check_count"], "inputs": report["input_count"],
                                              "errors": report["errors"], "report": str(output)}, ensure_ascii=False), flush=True)
    if report["errors"]:
        raise AssertionError("Saved GN8 validation failed: " + "; ".join(report["errors"]))


if __name__ == "__main__":
    main()
