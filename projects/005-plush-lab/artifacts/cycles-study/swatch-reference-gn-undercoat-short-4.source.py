"""GN4: shorten saved GN3 undercoat geometry around fixed float32 roots.

No groom is regenerated. The sole geometry change is UC root+.35*(point-root),
including its lateral spread. Radii/count and the live outer groom stay fixed.
Run with Blender --python this_file -- --no-render, then --render-saved.
The frozen wrapper, inherited GN3 helper/baseline, and saved input blend are
separate reproducibility dependencies. Engineering checks are not visual QA.
Existing files are never overwritten; rendering writes a new render receipt.
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
if ROOT.name != "005-plush-lab":
    ROOT = Path(__file__).resolve().parents[2]  # frozen artifact has same depth
OUT = ROOT / "artifacts" / "cycles-study"
CONTROL = "swatch-reference-gn-nearest-render-3"
STEM = "swatch-reference-gn-undercoat-short-4"
UC = "Blue pile · undercoat"
SCALE = .35
HELPER_SHA = "be7730c0ddba22109ebc31dd44e8660672df7fd2cb8d361093688ce9fcc2c927"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def file_sha(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def write_json(path, value):
    with path.open("x", encoding="utf-8") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)


def values(value):
    if hasattr(value, "name"):
        return [value.bl_rna.identifier, value.name]
    if isinstance(value, (str, bool, int, float)) or value is None:
        return value
    try:
        return [values(x) for x in value]
    except TypeError:
        return str(value)


def native_attributes(data):
    result = {}
    for attr in data.attributes:
        field, width, dtype = {"FLOAT_VECTOR": ("vector", 3, np.float32),
                              "FLOAT_COLOR": ("color", 4, np.float32),
                              "BYTE_COLOR": ("color", 4, np.float32),
                              "FLOAT2": ("vector", 2, np.float32),
                              "INT": ("value", 1, np.int32),
                              "BOOLEAN": ("value", 1, np.bool_)}.get(attr.data_type, ("value", 1, np.float32))
        array = np.empty(len(attr.data)*width, dtype=dtype)
        attr.data.foreach_get(field, array)
        result[attr.name] = {"type": attr.data_type, "domain": attr.domain,
                             "sha256": sha(array.tobytes())}
    return result


def tree_record(tree):
    nodes = []
    for node in tree.nodes:
        properties = {}
        for prop in node.bl_rna.properties:
            if prop.identifier in {"rna_type", "name", "label", "location", "dimensions", "select", "width", "height", "parent", "color", "use_custom_color", "show_options", "show_preview", "show_texture", "show_expanded", "hide", "warning_propagation"}:
                continue
            if prop.type in {"BOOLEAN", "INT", "FLOAT", "STRING", "ENUM"}:
                try:
                    properties[prop.identifier] = values(getattr(node, prop.identifier))
                except (AttributeError, TypeError):
                    pass
        nodes.append({"name": node.name, "type": node.bl_idname,
                      "group": node.node_tree.name if node.type == "GROUP" else None,
                      "properties": properties,
                      "inputs": [[s.identifier, values(s.default_value)] for s in node.inputs if hasattr(s, "default_value")]})
    return {"nodes": nodes, "links": [[l.from_node.name, l.from_socket.identifier, l.to_node.name, l.to_socket.identifier] for l in tree.links]}


def scene_record(bpy, helper):
    record = {"objects": {}, "trees": {}, "materials": {}, "scene": {}}
    for obj in bpy.data.objects:
        item = {"type": obj.type, "matrix_world": values(obj.matrix_world), "hide_render": obj.hide_render,
                "hide_viewport": obj.hide_viewport, "hidden": obj.hide_get(),
                "materials": [slot.material.name if slot.material else None for slot in obj.material_slots],
                "modifiers": []}
        for modifier in obj.modifiers:
            mod = {"name": modifier.name, "type": modifier.type, "render": modifier.show_render,
                   "viewport": modifier.show_viewport}
            if modifier.type == "NODES":
                mod["tree"] = modifier.node_group.name
                mod["inputs"] = {s.identifier: values(getattr(modifier.properties.inputs, s.identifier).value)
                                 for s in modifier.node_group.interface.items_tree if s.item_type == "SOCKET" and s.in_out == "INPUT" and s.socket_type != "NodeSocketGeometry"}
            item["modifiers"].append(mod)
        if obj.type == "CURVES":
            p, r = helper["curve_arrays"](obj.data)
            item.update(positions=sha(p.tobytes()), radii=sha(r.tobytes()), roots=sha(p[:, 0].tobytes()),
                        topology=[len(p), p.shape[1]], attributes=native_attributes(obj.data))
            if obj.name != UC:
                ep, er = helper["evaluated_coat"](bpy, obj)
                item.update(evaluated_positions=sha(ep.tobytes()), evaluated_radii=sha(er.tobytes()))
        elif obj.type == "MESH":
            verts = np.empty(len(obj.data.vertices)*3, dtype=np.float32)
            obj.data.vertices.foreach_get("co", verts)
            item["mesh"] = sha(verts.tobytes())
        elif obj.type in {"LIGHT", "CAMERA"}:
            item["data"] = {prop.identifier: values(getattr(obj.data, prop.identifier)) for prop in obj.data.bl_rna.properties
                            if prop.type in {"BOOLEAN", "INT", "FLOAT", "STRING", "ENUM"} and prop.identifier != "rna_type"}
        record["objects"][obj.name] = item
    for tree in bpy.data.node_groups:
        record["trees"][tree.name] = tree_record(tree)
    for mat in bpy.data.materials:
        record["materials"][mat.name] = tree_record(mat.node_tree) if mat.use_nodes else values(mat.diffuse_color)
    scene = bpy.context.scene
    for name in ("render", "cycles", "view_settings", "world"):
        data = getattr(scene, name)
        record["scene"][name] = {prop.identifier: values(getattr(data, prop.identifier)) for prop in data.bl_rna.properties
                                 if prop.type in {"BOOLEAN", "INT", "FLOAT", "STRING", "ENUM"} and prop.identifier not in {"rna_type", "filepath"}}
    record["scene"]["camera"] = scene.camera.name
    if scene.world.use_nodes:
        record["scene"]["world_tree"] = tree_record(scene.world.node_tree)
    return record


def unchanged_record(record):
    result = copy.deepcopy(record)
    uc = result["objects"][UC]
    uc.pop("positions")
    uc["attributes"].pop("position")
    return result


def main():
    import bpy
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--no-render", action="store_true")
    parser.add_argument("--render-saved", action="store_true")
    options = parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    if options.render_saved:
        if options.no_render:
            parser.error("--render-saved and --no-render are exclusive")
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
        started = time.perf_counter()
        bpy.ops.render.render(write_still=True)
        receipt = {"rendered": True, "kind": "swatch", "blend": STEM+".blend", "png": STEM+".png",
                   "seconds": time.perf_counter()-started, "resolution": bpy.context.scene.render.resolution_x,
                   "samples": bpy.context.scene.cycles.samples, "blend_sha256": file_sha(OUT/(STEM+".blend")),
                   "png_sha256": file_sha(OUT/(STEM+".png")), "wrapper_source_sha256": file_sha(Path(__file__))}
        write_json(OUT/(STEM+".render.json"), receipt)
        with (OUT/(STEM+".render.log")).open("x", encoding="utf-8") as log:
            log.write(json.dumps(receipt)+"\n")
        print("PLUSH_UC_SCALE_RENDER", json.dumps(receipt), flush=True)
        return
    if not options.no_render:
        parser.error("CPU preparation requires --no-render; use --render-saved separately")
    for suffix in (".blend", ".png", ".json", ".source.py", ".gn-report.json", ".precheck.log", ".prediction.json"):
        if (OUT/(STEM+suffix)).exists():
            raise FileExistsError(STEM+suffix)
    source = Path(__file__).read_bytes()
    helper_path = OUT/(CONTROL+".gn-source.py")
    if file_sha(helper_path) != HELPER_SHA:
        raise RuntimeError("Frozen GN3 helper changed")
    watched = [OUT/(CONTROL+suffix) for suffix in (".blend", ".json", ".gn-report.json", ".source.py", ".gn-source.py")]
    hashes_before = {str(path): file_sha(path) for path in watched}
    helper = runpy.run_path(str(helper_path), run_name="_frozen_gn3_read_helpers")
    with (OUT/(STEM+".source.py")).open("xb") as stream:
        stream.write(source)
    with (OUT/(STEM+".precheck.log")).open("x", encoding="utf-8") as log:
        def event(message):
            print(message, flush=True)
            log.write(message+"\n")
            log.flush()
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(CONTROL+".blend")))
        event("Loaded frozen GN3; no regeneration")
        before = scene_record(bpy, helper)
        height_before = helper["height_profile_diagnostic"](bpy)
        obj = bpy.data.objects[UC]
        old, radii = helper["curve_arrays"](obj.data)
        root64 = old[:, :1].astype(np.float64)
        expected = (root64+SCALE*(old.astype(np.float64)-root64)).astype(np.float32)
        expected[:, 0] = old[:, 0]
        if not np.isfinite(expected).all():
            raise RuntimeError("Nonfinite undercoat positions")
        obj.data.position_data.foreach_set("vector", expected.ravel())
        obj.data.update_tag()
        obj.update_tag()
        bpy.context.view_layer.update()
        after = scene_record(bpy, helper)
        if unchanged_record(before) != unchanged_record(after):
            raise RuntimeError("Scene change outside UC point coordinates")
        final, final_radii = helper["curve_arrays"](obj.data)
        if final.tobytes() != expected.tobytes() or final[:, 0].tobytes() != old[:, 0].tobytes() or final_radii.tobytes() != radii.tobytes():
            raise RuntimeError("Undercoat arithmetic/root/radius mismatch")
        bpy.context.scene.render.filepath = str(OUT/(STEM+".png"))
        bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(STEM+".blend")), compress=True)
        bpy.ops.wm.open_mainfile(filepath=str(OUT/(STEM+".blend")))
        saved = scene_record(bpy, helper)
        if saved != after:
            raise RuntimeError("Saved/reloaded scene did not preserve checked state")
        event("PLUSH_UC_SCALE_ASSET_READY "+str(OUT/(STEM+".blend"))+" wrapper_sha256="+sha(source))
        height_after = helper["height_profile_diagnostic"](bpy)
        lengths_before = helper["catmull_rom_lengths"](old)
        lengths_after = helper["catmull_rom_lengths"](final)
        hashes_after = {str(path): file_sha(path) for path in watched}
        if hashes_before != hashes_after:
            raise RuntimeError("Input files changed")
        control_report = json.loads((OUT/(CONTROL+".gn-report.json")).read_text(encoding="utf-8"))
        inherited = {key: control_report[key] for key in ("baseline_source", "baseline_source_sha256", "baseline_snapshot", "official_asset_library", "official_asset_sha256", "candidate_parameters", "coat", "guides", "graph", "guide_assignment")}
        report = {**inherited, "status": "engineering_precheck_passed", "rendered": False, "kind": "swatch", "candidate_preset": "gn4",
                  "resolution": bpy.context.scene.render.resolution_x, "samples": bpy.context.scene.cycles.samples,
                  "blend": STEM+".blend", "png": STEM+".png", "control_asset": CONTROL,
                  "source_blend_sha256": hashes_before[str(OUT/(CONTROL+".blend"))],
                  "wrapper_source_snapshot": STEM+".source.py", "wrapper_source_sha256": sha(source),
                  "control_wrapper_source_snapshot": CONTROL+".gn-source.py", "control_wrapper_source_sha256": HELPER_SHA,
                  "changes_vs_control": ["undercoat_positions"], "study_scope": "Only saved UC geometry uniformly shortened about fixed roots, including lateral spread. GN3 coat, live guides/nodes, radii/counts, all other scene settings unchanged. Engineering checks do not establish reference/visual match.",
                  "undercoat_change": {"mode": "root_fixed_uniform_scale", "scale": SCALE, "object": UC,
                                       "formula": "float32(root64+.35*(saved_float32_point64-root64)); root original bits restored",
                                       "positions_float32_sha256": sha(final.tobytes()), "radii_float32_sha256": sha(final_radii.tobytes()),
                                       "roots_float32_sha256": sha(final[:, 0].tobytes()), "curve_count": len(final), "points_per_curve": final.shape[1]},
                  "checks": {"all_other_scene_state_exact": True, "undercoat_roots_bits_exact": True, "undercoat_radii_bits_exact": True,
                             "saved_reload_state_exact": True, "finite": True, "input_hashes_before": hashes_before, "input_hashes_after": hashes_after},
                  "height_profile_before": height_before, "height_profile_after": height_after,
                  "undercoat_arc": {"scope": "Order32 uniform Catmull-Rom, duplicate endpoints model; not engine arc/physical solve",
                                    "before": helper["summarize"](lengths_before), "after": helper["summarize"](lengths_after),
                                    "ratio": helper["summarize"](lengths_after/lengths_before)},
                  "noncoat": {name: {"positions_float32_sha256": data["positions"], "radii_float32_sha256": data["radii"]}
                              for name, data in after["objects"].items() if data["type"] == "CURVES" and name != "Blue pile · coat"},
                  "scene_state_before_sha256": sha(json.dumps(before, sort_keys=True).encode()),
                  "scene_state_after_sha256": sha(json.dumps(after, sort_keys=True).encode()),
                  "render_receipt": STEM+".render.json"}
        write_json(OUT/(STEM+".gn-report.json"), report)
        write_json(OUT/(STEM+".prediction.json"), {"scope": height_before["scope"], "control_asset": CONTROL,
                   "input_hashes_before": hashes_before, "input_hashes_after": hashes_after, "scale": SCALE,
                   "before": height_before, "predicted_after": height_after, "limitations": "Geometric analytic envelope only, no opacity/pixel coverage or silhouette measurement; shrinking UC also shrinks lateral spread and total arc. Coat intersections unchanged; backing could become visible."})
        write_json(OUT/(STEM+".json"), {"kind": "swatch", "rendered": False, "blend": STEM+".blend", "png": STEM+".png",
                   "resolution": report["resolution"], "samples": report["samples"], "blender": bpy.app.version_string,
                   "control_asset": CONTROL, "source_blend_sha256": report["source_blend_sha256"],
                   "source_snapshot": STEM+".source.py", "source_sha256": sha(source),
                   "method_report": STEM+".gn-report.json", "render_receipt": STEM+".render.json",
                   "parameter_scope": "Saved GN3 groom inherited unchanged; only UC root-fixed geometry scale=.35. Final measured groom and provenance in method_report."})
        event("PLUSH_UC_SCALE_PRECHECK_PASS "+json.dumps({"report": STEM+".gn-report.json", "wrapper_sha256": sha(source), "rendered": False}))


if __name__ == "__main__":
    main()
