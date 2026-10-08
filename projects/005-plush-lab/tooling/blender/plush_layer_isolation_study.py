"""GN8 render visibility diagnostics from the frozen saved GN7 .08 scene.

Only hide_render of the three body hair layers changes. Native/evaluated
geometry, guide mapping, official GN, materials, scene and camera stay fixed.
Single layers retain backing/floor/lights; they are source diagnostics, not
equal-density quality comparisons. Existing assets are never overwritten.
"""

import argparse
import copy
import hashlib
import json
import runpy
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "artifacts" / "cycles-study"
CONTROL = "swatch-reference-gn-crown-008-live-7"
RECORD = "swatch-reference-gn-undercoat-short-live-4.source.py"
GEOMETRY = "swatch-reference-gn-nearest-render-3.gn-source.py"
LAYERS = {name: "Blue pile · " + name for name in ("coat", "undercoat", "flyaway")}
CASES = {"coat-only": ["coat"], "undercoat-only": ["undercoat"],
         "flyaway-only": ["flyaway"], "no-flyaway": ["coat", "undercoat"]}
DEPENDENCIES = {
    CONTROL + ".blend": "8ac53a154987ab41d22fb0058444b902bcdf299f555f4706e360b94609c93354",
    CONTROL + ".source.py": "ce8d69473c06f0365b75fe3c4e3de3b87988720aeacd30757e2a183b10d22a60",
    RECORD: "5b1d9049cec289828a6e354ce334d37873fa8343c4f5a0aa848315732125609c",
    GEOMETRY: "be7730c0ddba22109ebc31dd44e8660672df7fd2cb8d361093688ce9fcc2c927",
}


def file_sha(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def write_json(path, value):
    with path.open("x", encoding="utf-8") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)


def fixed_state(record):
    result = copy.deepcopy(record)
    for name in LAYERS.values():
        result["objects"][name].pop("hide_render")
    return result


def main():
    import bpy
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--case", choices=tuple(CASES))
    parser.add_argument("--tag", required=True)
    parser.add_argument("--no-render", action="store_true")
    parser.add_argument("--render-saved", action="store_true")
    opt = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    if not opt.tag or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for c in opt.tag):
        parser.error("Nonempty file-safe tag required")
    stem = "swatch-reference-" + opt.tag
    if opt.render_saved:
        if opt.no_render:
            parser.error("Preparation and saved render are exclusive")
        for suffix in (".png", ".render.json", ".render.log"):
            if (OUT / (stem + suffix)).exists():
                raise FileExistsError(stem + suffix)
        report = json.loads((OUT / (stem + ".gn-report.json")).read_text(encoding="utf-8"))
        if file_sha(Path(__file__)) != report["wrapper_source_sha256"] or file_sha(OUT / (stem + ".blend")) != report["saved_blend_sha256"]:
            raise RuntimeError("Frozen source or saved scene changed")
        if opt.case is not None and opt.case != report["layer_change"]["case"]:
            parser.error("Case differs from saved scene")
        bpy.ops.wm.open_mainfile(filepath=str(OUT / (stem + ".blend")))
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "OPTIX"
        prefs.get_devices()
        for device in prefs.devices:
            device.use = device.type == "OPTIX"
        bpy.context.scene.render.filepath = str(OUT / (stem + ".png"))
        started = time.perf_counter()
        bpy.ops.render.render(write_still=True)
        receipt = {"rendered": True, "kind": "swatch", "blend": stem + ".blend", "png": stem + ".png",
                   "seconds": time.perf_counter() - started,
                   "resolution": bpy.context.scene.render.resolution_x, "samples": bpy.context.scene.cycles.samples,
                   "blend_sha256": file_sha(OUT / (stem + ".blend")), "png_sha256": file_sha(OUT / (stem + ".png")),
                   "wrapper_source_sha256": file_sha(Path(__file__)), "case": report["layer_change"]["case"],
                   "visible_layers": report["layer_change"]["visible_layers"],
                   "devices": [{"name": d.name, "type": d.type, "use": d.use} for d in prefs.devices],
                   "blender": bpy.app.version_string}
        write_json(OUT / (stem + ".render.json"), receipt)
        with (OUT / (stem + ".render.log")).open("x", encoding="utf-8") as log:
            log.write(json.dumps(receipt) + "\n")
        print("PLUSH_LAYER_RENDER", json.dumps(receipt), flush=True)
        return
    if not opt.no_render or opt.case is None:
        parser.error("Preparation requires --no-render --case")
    for suffix in (".blend", ".png", ".source.py", ".json", ".gn-report.json", ".precheck.log"):
        if (OUT / (stem + suffix)).exists():
            raise FileExistsError(stem + suffix)
    hashes_before = {name: file_sha(OUT / name) for name in DEPENDENCIES}
    if hashes_before != DEPENDENCIES:
        raise RuntimeError("Frozen dependency hashes differ")
    rec = runpy.run_path(str(OUT / RECORD), run_name="_layer_scene_record")
    helper = runpy.run_path(str(OUT / GEOMETRY), run_name="_layer_geometry")
    source = Path(__file__).read_bytes()
    with (OUT / (stem + ".source.py")).open("xb") as stream:
        stream.write(source)
    with (OUT / (stem + ".precheck.log")).open("x", encoding="utf-8") as log:
        def event(message):
            print(message, flush=True)
            log.write(message + "\n")
            log.flush()
        bpy.ops.wm.open_mainfile(filepath=str(OUT / (CONTROL + ".blend")))
        before = rec["scene_record"](bpy, helper)
        visible = CASES[opt.case]
        for layer, name in LAYERS.items():
            bpy.data.objects[name].hide_render = layer not in visible
        bpy.context.view_layer.update()
        after = rec["scene_record"](bpy, helper)
        if fixed_state(before) != fixed_state(after):
            raise RuntimeError("Unexpected change beyond hair layer render visibility")
        bpy.context.scene.render.filepath = str(OUT / (stem + ".png"))
        bpy.ops.wm.save_as_mainfile(filepath=str(OUT / (stem + ".blend")), compress=True)
        bpy.ops.wm.open_mainfile(filepath=str(OUT / (stem + ".blend")))
        if rec["scene_record"](bpy, helper) != after:
            raise RuntimeError("Saved/reloaded scene differs")
        hashes_after = {name: file_sha(OUT / name) for name in DEPENDENCIES}
        if hashes_after != hashes_before:
            raise RuntimeError("Frozen inputs changed")
        wrapper_sha = hashlib.sha256(source).hexdigest()
        report = {"status": "engineering_precheck_passed", "rendered": False, "kind": "swatch",
                  "candidate_preset": "gn8-layer-diagnostic", "control_asset": CONTROL,
                  "blend": stem + ".blend", "png": stem + ".png",
                  "resolution": bpy.context.scene.render.resolution_x, "samples": bpy.context.scene.cycles.samples,
                  "source_blend_sha256": DEPENDENCIES[CONTROL + ".blend"],
                  "saved_blend_sha256": file_sha(OUT / (stem + ".blend")),
                  "wrapper_source_snapshot": stem + ".source.py", "wrapper_source_sha256": wrapper_sha,
                  "record_helper_source_snapshot": RECORD, "geometry_helper_source_snapshot": GEOMETRY,
                  "changes_vs_control": ["hair_layer_hide_render"],
                  "study_scope": "Render layer source diagnostic only; different visible curve counts. All geometry/attributes/GN/material/camera/light fixed. Backing and floor retained. Not a pixel visibility decomposition or equal-density quality comparison.",
                  "layer_change": {"case": opt.case, "visible_layers": visible,
                                   "hide_render": {layer: bpy.data.objects[name].hide_render for layer, name in LAYERS.items()},
                                   "native_layer_counts": {layer: after["objects"][name]["topology"][0] for layer, name in LAYERS.items()}},
                  "checks": {"only_render_visibility_changed": True, "saved_reload_state_exact": True,
                             "input_hashes_before": hashes_before, "input_hashes_after": hashes_after},
                  "frozen_scene_state": after, "render_receipt": stem + ".render.json"}
        write_json(OUT / (stem + ".gn-report.json"), report)
        write_json(OUT / (stem + ".json"), {k: report[k] for k in ("kind", "rendered", "blend", "png", "resolution", "samples", "control_asset", "wrapper_source_snapshot", "wrapper_source_sha256", "study_scope", "layer_change", "render_receipt")})
        event("PLUSH_LAYER_PRECHECK_PASS " + json.dumps({"case": opt.case, "blend": stem + ".blend", "source_sha256": wrapper_sha, "rendered": False}))


if __name__ == "__main__":
    main()
