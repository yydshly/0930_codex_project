"""Read-only validation of the six v3 Cycles study outputs.

Run: blender -b --python-exit-code 1 --python validate_cycles_study.py
No render, save, scene mutation, GPU work, or journal/storage writes are needed.
Only artifacts/cycles-study/validation.json is written.
"""

import hashlib
import json
import re
import struct
from datetime import datetime, timezone
from pathlib import Path

import bpy
import numpy as np


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "artifacts" / "cycles-study"
MAIN = "character-reference-v3"
NAMES = [
    "swatch-velvet-v3", "swatch-fleece-v3", "swatch-teddy-v3",
    "swatch-reference-v3", MAIN, "character-reference-v3-angle25",
]
JOURNAL_BASELINE = "175aea2000ffb8298c20a76b5889f285d39770235c59a670abacb41c548a017f"


def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    report = {
        "validated_at_utc": datetime.now(timezone.utc).isoformat(),
        "validator": str(Path(__file__).relative_to(ROOT)),
        "validator_blender": bpy.app.version_string,
        "status": "checking", "checks": [], "errors": [],
        "journal_baseline": {
            "count": 68, "sha256": JOURNAL_BASELINE,
            "scope": "Supplied prior baseline; validator does not read or change journal",
        },
        "scope": "Native geometry/material/render-settings inspection plus saved image/source/log checks. No fidelity score or real-time/3DGS claim.",
    }

    def check(label, condition, details=None):
        report["checks"].append({"check": label, "passed": bool(condition), "details": details})
        if not condition:
            report["errors"].append(label)

    blend_path = OUT / (MAIN + ".blend")
    original_blend_hash = digest(blend_path)
    bpy.ops.wm.open_mainfile(filepath=str(blend_path))
    scene = bpy.context.scene
    check("main engine is Cycles", scene.render.engine == "CYCLES", scene.render.engine)
    check("main scene selects GPU", scene.cycles.device == "GPU", scene.cycles.device)
    check("native hair uses thick curves", scene.cycles_curves.shape == "THICK", scene.cycles_curves.shape)
    check("main render is 1536 square at 100 percent", (
        scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage
    ) == (1536, 1536, 100), {
        "width": scene.render.resolution_x, "height": scene.render.resolution_y,
        "percentage": scene.render.resolution_percentage,
    })
    check("main render sets 384 samples", scene.cycles.samples == 384, scene.cycles.samples)
    check("main has assigned orthographic camera", scene.camera is not None and scene.camera.data.type == "ORTHO",
          None if scene.camera is None else {"name": scene.camera.name, "type": scene.camera.data.type})
    lights = [o for o in scene.objects if o.type == "LIGHT"]
    check("main has three area lights", len(lights) == 3 and all(o.data.type == "AREA" for o in lights), [
        {"name": o.name, "type": o.data.type, "watts": o.data.energy, "size": o.data.size}
        for o in lights
    ])

    expected = {
        "Blue pile · undercoat": (340000, 12),
        "Blue pile · coat": (320000, 12),
        "Blue pile · flyaway": (9000, 12),
        "Black wool · short fibers": (90000, 5),
    }
    curves = [o for o in scene.objects if o.type == "CURVES"]
    check("main contains exactly four native Curves objects", len(curves) == 4, [o.name for o in curves])
    inspected = []
    for name, (count, points_per_curve) in expected.items():
        ob = scene.objects.get(name)
        if ob is None or ob.type != "CURVES":
            check(name + " exists as native Curves", False, None if ob is None else ob.type)
            continue
        data = ob.data
        offsets = np.empty(len(data.curve_offset_data), dtype=np.int32)
        data.curve_offset_data.foreach_get("value", offsets)
        lengths = np.diff(offsets)
        positions = np.empty(len(data.position_data) * 3, dtype=np.float32)
        data.position_data.foreach_get("vector", positions)
        radius_attr = data.attributes.get("radius")
        radii = np.empty(len(radius_attr.data), dtype=np.float32) if radius_attr is not None else np.array([], dtype=np.float32)
        if radius_attr is not None:
            radius_attr.data.foreach_get("value", radii)
        native_type = data.bl_rna.identifier
        check(name + " is native hair Curves data", native_type == "Curves", native_type)
        check(name + " curve and point counts", len(data.curves) == count and len(data.position_data) == count * points_per_curve
              and len(offsets) == count + 1 and bool(np.all(lengths == points_per_curve)), {
                  "curves": len(data.curves), "points": len(data.position_data),
                  "points_per_curve_min": int(lengths.min()), "points_per_curve_max": int(lengths.max()),
              })
        check(name + " positions finite", bool(np.all(np.isfinite(positions))))
        check(name + " native point radii finite and positive", radius_attr is not None
              and radius_attr.domain == "POINT" and len(radii) == count * points_per_curve
              and bool(np.all(np.isfinite(radii))) and bool(np.all(radii > 0)), {
                  "domain": None if radius_attr is None else radius_attr.domain,
                  "minimum": None if len(radii) == 0 else float(radii.min()),
                  "maximum": None if len(radii) == 0 else float(radii.max()),
              })
        shaders = [n for mat in data.materials if mat.node_tree is not None for n in mat.node_tree.nodes
                   if n.bl_idname == "ShaderNodeBsdfHairPrincipled"]
        connected = all(any(link.from_node == shader and link.to_node.bl_idname == "ShaderNodeOutputMaterial"
                            and link.to_socket.name == "Surface" for link in shader.id_data.links) for shader in shaders)
        check(name + " has connected Chiang COLOR hair BSDF", bool(shaders) and connected
              and all(n.model == "CHIANG" and n.parametrization == "COLOR" for n in shaders), [
                  {"model": n.model, "parametrization": n.parametrization} for n in shaders
              ])
        inspected.append({"object": name, "object_type": ob.type, "data_type": native_type,
                          "curve_count": len(data.curves), "point_count": len(data.position_data),
                          "modifiers": [m.type for m in ob.modifiers], "surface_attachment": data.surface is not None})
    report["native_geometry"] = inspected
    body_count = sum(item["curve_count"] for item in inspected if item["object"].startswith("Blue pile"))
    check("body totals 669000 native hair curves", body_count == 669000, body_count)

    main_meta = json.loads((OUT / (MAIN + ".json")).read_text(encoding="utf-8"))
    expected_source_hash = main_meta["source_sha256"]
    report["images_and_sources"] = []
    for name in NAMES:
        metadata_path = OUT / (name + ".json")
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        png_path = OUT / metadata["png"]
        png_bytes = png_path.read_bytes()
        valid_header = png_bytes[:8] == b"\x89PNG\r\n\x1a\n" and png_bytes[12:16] == b"IHDR"
        width, height = struct.unpack(">II", png_bytes[16:24])
        source_path = OUT / metadata["source_snapshot"]
        actual_source_hash = digest(source_path)
        check(name + " source snapshot SHA matches metadata and shared v3 source",
              actual_source_hash == metadata["source_sha256"] == expected_source_hash,
              {"sha256": actual_source_hash, "snapshot": source_path.name})
        check(name + " saved PNG header/dimensions match metadata", valid_header
              and width == height == metadata["resolution"], {"width": width, "height": height})
        check(name + " metadata records completed rendering", metadata["rendered"] is True)
        image = bpy.data.images.load(str(png_path), check_existing=False)
        decoded_size = list(image.size)
        pixels = np.empty(len(image.pixels), dtype=np.float32)
        image.pixels.foreach_get(pixels)
        rgb = pixels.reshape(-1, 4)[:, :3]
        finite = bool(np.all(np.isfinite(rgb)))
        deviation = float(np.std(rgb))
        check(name + " PNG decodes to nonuniform finite pixels", decoded_size == [width, height]
              and finite and deviation > .01, {"decoded_size": decoded_size, "rgb_standard_deviation": deviation})
        bpy.data.images.remove(image)
        enabled = [d for d in metadata["devices"] if d["enabled"]]
        check(name + " metadata enables only OptiX device", bool(enabled) and all(d["type"] == "OPTIX" for d in enabled), enabled)
        check(name + " matching editable blend exists", (OUT / metadata["blend"]).is_file())
        report["images_and_sources"].append({
            "name": name, "png": png_path.name, "width": width, "height": height,
            "bytes": len(png_bytes), "png_sha256": hashlib.sha256(png_bytes).hexdigest(),
            "source_sha256": actual_source_hash, "samples": metadata["samples"],
            "angle_degrees": metadata["angle_degrees"], "pipeline_seconds": metadata["seconds"],
        })

    log = (OUT / (MAIN + ".log")).read_text(encoding="utf-8", errors="replace")
    patterns = {
        "hair_kernel": r"Use Hair\s*:?[ \t]*True",
        "optix_bvh": r"Using fast to trace OptiX BVH",
        "optix_device": r"Path tracing on:.*RTX 4070.*OptiX",
        "384_rendered_samples": r"Rendered 384 samples in [0-9.]+ seconds",
        "1536_rendered_resolution": r"Resolution: 1536x1536",
        "render_time": r"Total render time:\s*[0-9.]+",
    }
    evidence = {}
    for label, pattern in patterns.items():
        match = re.search(pattern, log)
        evidence[label] = None if match is None else match.group(0)
        check("main debug log: " + label, match is not None, evidence[label])
    report["render_log_evidence"] = evidence
    check("main blend SHA unchanged after read-only inspection", digest(blend_path) == original_blend_hash,
          {"sha256_before": original_blend_hash, "sha256_after": digest(blend_path)})
    report["status"] = "passed" if not report["errors"] else "failed"
    (OUT / "validation.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print("PLUSH_VALIDATION", json.dumps({"status": report["status"], "check_count": len(report["checks"]),
          "errors": report["errors"], "body_native_curves": body_count, "images": len(report["images_and_sources"]),
          "report": str(OUT / "validation.json")}, ensure_ascii=False), flush=True)
    if report["errors"]:
        raise AssertionError("Validation checks failed: " + "; ".join(report["errors"]))


if __name__ == "__main__":
    main()
