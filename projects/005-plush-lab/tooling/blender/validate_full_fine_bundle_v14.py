"""Read-only, bounded independent verification of the GN14 full mascot.

Run after production has completed. This is geometry/provenance verification,
not a softness score or a claim that the reference appearance is reproduced.
"""
import argparse
import hashlib
import json
import math
import runpy
import sys
from datetime import datetime, timezone
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector, kdtree

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "artifacts" / "cycles-study"
OLD = {
    "character-reference-guide-v6.blend": "9d3adeb4bc4e4a85b3ee8b7de282770de09810dc4f52ba0397412b7cbbe1a60f",
    "character-reference-guide-v6.png": "72b81df3009d7396df05d142192641abf458a5527a258703c60838954e3ba228",
}


def sha(path):
    with path.open("rb") as handle:
        return hashlib.file_digest(handle, "sha256").hexdigest()


def values(data, name):
    attribute = data.attributes[name]
    dtype = {"FLOAT_VECTOR": np.float32, "FLOAT": np.float32,
             "INT": np.int32, "BOOLEAN": bool}[attribute.data_type]
    width = 3 if attribute.data_type == "FLOAT_VECTOR" else 1
    result = np.empty(len(attribute.data) * width, dtype=dtype)
    attribute.data.foreach_get("vector" if width == 3 else "value", result)
    return result.reshape(-1, 3) if width == 3 else result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stem", required=True)
    parser.add_argument("--coat", default="Blue pile · coat")
    parser.add_argument("--guide", default="Pile guides · editable live input")
    parser.add_argument("--report-stem", default="character-fine-bundle-validation-v14")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    # Stems cannot escape the output directory or name any historical asset.
    for stem in (args.stem, args.report_stem):
        if Path(stem).name != stem or any(c in stem for c in "/\\:"):
            raise ValueError("A plain, project-local artifact stem is required")
    report_path = OUT / (args.report_stem + ".json")
    if report_path.exists():
        raise FileExistsError(report_path)
    checks = []

    def check(label, passed, details=None):
        checks.append({"check": label, "passed": bool(passed), "details": details})

    check("old v6 editable scene and image retain exact frozen bytes",
          all(sha(OUT / name) == digest for name, digest in OLD.items()), OLD)
    blend = OUT / (args.stem + ".blend")
    png = OUT / (args.stem + ".png")
    source = OUT / (args.stem + ".source.py")
    check("new scene, actual image and source snapshot exist as separate assets",
          all(p.exists() and p.stat().st_size > 0 for p in (blend, png, source)))
    bpy.ops.wm.open_mainfile(filepath=str(blend))
    coat = bpy.data.objects.get(args.coat)
    guide = bpy.data.objects.get(args.guide)
    check("actual saved disk reload contains native coat and guide curve objects",
          coat is not None and guide is not None and coat.type == "CURVES" and guide.type == "CURVES")
    if coat is None or guide is None:
        raise RuntimeError("Actual expected native objects are missing")
    cp = values(coat.data, "position")
    gp = values(guide.data, "position")
    coat_count, guide_count = len(coat.data.curves), len(guide.data.curves)
    coat_boundaries = np.empty(coat_count + 1, dtype=np.int32)
    guide_boundaries = np.empty(guide_count + 1, dtype=np.int32)
    coat.data.curve_offset_data.foreach_get("value", coat_boundaries)
    guide.data.curve_offset_data.foreach_get("value", guide_boundaries)
    coat_offsets, guide_offsets = coat_boundaries[:-1], guide_boundaries[:-1]
    roots, guide_roots = cp[coat_offsets], gp[guide_offsets]
    check("native saved positions and radii are finite and radii nonnegative",
          np.isfinite(cp).all() and np.isfinite(gp).all()
          and all(np.isfinite(values(obj.data, "radius")).all()
                  and (values(obj.data, "radius") >= 0).all() for obj in (coat, guide)),
          {"coat_curves": coat_count, "guide_curves": guide_count,
           "coat_points": len(cp), "guide_points": len(gp)})
    check("actual full coat and guide counts and twelve-control topology",
          coat_count == 320000 and guide_count == 40000
          and np.all(np.diff(coat_boundaries) == 12)
          and np.all(np.diff(guide_boundaries) == 12))
    frozen = OUT / "character-reference-v3.source.py"
    check("independent frozen full-star surface source retains historical SHA",
          sha(frozen) == "69df6504ddc4412c1279f7f40f2baa8ae45fbedc6649e64cdc7cb1d175039dc3")
    base = runpy.run_path(str(frozen), run_name="_independent_frozen_full_star")
    rng = np.random.default_rng(51)
    groups = math.ceil(coat_count / 32)
    theta = np.repeat(np.arccos(rng.uniform(-.998, .998, groups)), 32)[:coat_count]
    angle = np.repeat(rng.uniform(0, math.tau, groups), 32)[:coat_count]
    theta += rng.normal(0, .023, coat_count)
    angle += rng.normal(0, .023, coat_count) / np.maximum(np.sin(theta), .20)
    expected_roots, expected_normals = base["surface_frame"](np.clip(theta, .0002, math.pi-.0002), angle, False)
    expected_normals /= np.linalg.norm(expected_normals, axis=1, keepdims=True)
    actual_normals = values(coat.data, "full_star_normal")
    check("actual root coordinates and saved normals come from the true full-star frame",
          np.array_equal(roots, expected_roots.astype(np.float32))
          and np.isfinite(actual_normals).all()
          and np.allclose(actual_normals, expected_normals, atol=2e-7, rtol=0)
          and np.array_equal(values(guide.data, "full_star_normal"), actual_normals[::8])
          and np.array_equal(guide_roots, roots[::8]),
          {"normal_attribute": "full_star_normal", "guide_selection": "Every eighth actual full coat root",
           "maximum_normal_error": float(np.max(np.abs(actual_normals - expected_normals)))})
    xyz = roots.astype(np.float64)
    hem = .850 + .115*np.exp(-((xyz[:, 0]+.61)/.27)**2) + .180*np.exp(-((xyz[:, 0]-.63)/.27)**2)
    expected_compression = np.where((xyz[:, 2] > hem-.06) & (np.abs(xyz[:, 0]+.17) < 1.02), .22, 1.)
    for eye_x in (-.43, .27):
        socket = np.exp(-((xyz[:, 0]-eye_x)/.13)**2 - ((xyz[:, 2]-.21)/.16)**2)
        expected_compression *= 1 - .88*socket*(xyz[:, 1] < -.45)
    actual_compression = values(coat.data, "full_feature_compression")
    check("native full-star face and beret compression field matches the inherited feature formula",
          np.array_equal(actual_compression, expected_compression.astype(np.float32))
          and np.array_equal(values(guide.data, "full_feature_compression"), actual_compression[::8])
          and np.isfinite(actual_compression).all()
          and np.all((actual_compression > 0) & (actual_compression <= 1)),
          {"compression_attribute": "full_feature_compression",
           "compressed_roots": int((actual_compression < .99).sum()),
           "minimum": float(actual_compression.min())})
    mappings = []
    for name in ("pile_guide_index", "guide_curve_index"):
        attr = coat.data.attributes.get(name)
        valid = attr is not None and attr.data_type == "INT" and attr.domain == "CURVE"
        check(name + " has native INT/CURVE dtype and domain", valid)
        if valid:
            mappings.append(values(coat.data, name))
    if len(mappings) != 2:
        raise RuntimeError("Native guide mapping contract is incomplete")
    ids = mappings[0] - coat_count
    range_ok = len(ids) == coat_count and (ids >= 0).all() and (ids < guide_count).all()
    check("both persistent mappings agree and address the joined guide range",
          range_ok and np.array_equal(mappings[0], mappings[1]),
          {"join_offset": coat_count, "minimum": int(ids.min()), "maximum": int(ids.max())})
    if not range_ok:
        raise RuntimeError("Native guide mapping is outside the actual guide range")
    counts = np.bincount(ids, minlength=guide_count)
    check("every actual guide group has children",
          (counts > 0).all(), {"empty": int((counts == 0).sum()),
          "minimum": int(counts.min()), "maximum": int(counts.max()),
          "mean": float(counts.mean()), "median": float(np.median(counts))})
    # Independent full-coat nearest search over actual reloaded f32 coordinates.
    tree = kdtree.KDTree(guide_count)
    for index, root in enumerate(guide_roots):
        tree.insert(Vector(root), index)
    tree.balance()
    mismatch = 0
    max_error = 0.0
    for root, supplied_id in zip(roots, ids):
        _, nearest_id, _ = tree.find(Vector(root))
        # Accept equal-distance f32 ties, not an arbitrary tree tie ordering.
        supplied_distance = float(np.linalg.norm(root.astype(np.float64) - guide_roots[supplied_id]))
        nearest_distance = float(np.linalg.norm(root.astype(np.float64) - guide_roots[nearest_id]))
        error = supplied_distance - nearest_distance
        max_error = max(max_error, error)
        mismatch += error > 2e-7
    check("all saved coat mappings are nearest actual guide roots",
          mismatch == 0, {"checked_roots": coat_count, "mismatches": int(mismatch),
                         "maximum_extra_distance": max_error, "tie_tolerance": 2e-7})
    modifiers = [m for m in coat.modifiers if m.type == "NODES" and m.node_group is not None]
    check("visible coat is driven by an enabled geometry-nodes modifier",
          bool(modifiers) and any(m.show_render for m in modifiers) and not coat.hide_render,
          {"modifiers": [m.node_group.name for m in modifiers]})
    bpy.context.view_layer.update()
    evaluated = coat.evaluated_get(bpy.context.evaluated_depsgraph_get()).data
    ep, er = values(evaluated, "position"), values(evaluated, "radius")
    check("actual enabled GN evaluates finite positive-radius full coat with fixed roots",
          len(evaluated.curves) == coat_count and ep.shape == cp.shape
          and np.isfinite(ep).all() and np.isfinite(er).all() and (er > 0).all()
          and np.array_equal(ep[coat_offsets], roots))
    receipt = json.loads((OUT / (args.stem + ".render.json")).read_text(encoding="utf-8"))
    check("completed Cycles render receipt pins the actual new PNG, scene and source bytes",
          receipt.get("rendered") is True and receipt.get("stage") == "final"
          and receipt.get("resolution") == 1536 and receipt.get("seconds", 0) > 0
          and receipt.get("blend_sha256") == sha(blend)
          and receipt.get("png_sha256") == sha(png)
          and receipt.get("wrapper_source_sha256") == sha(source),
          {"receipt": args.stem + ".render.json", "render_seconds": receipt.get("seconds"),
           "device": receipt.get("device"), "samples": receipt.get("samples")})
    image = bpy.data.images.load(str(png), check_existing=False)
    pixels = np.empty(len(image.pixels), dtype=np.float32)
    image.pixels.foreach_get(pixels)
    check("actual final PNG decodes at 1536 square with finite nonconstant RGB pixels",
          list(image.size) == [1536, 1536] and np.isfinite(pixels).all()
          and np.ptp(pixels.reshape(-1, 4)[:, :3]) > .1,
          {"width": image.size[0], "height": image.size[1],
           "rgb_span": float(np.ptp(pixels.reshape(-1, 4)[:, :3]))})
    bpy.data.images.remove(image)
    check("old v6 remains unchanged after independent reload",
          all(sha(OUT / name) == digest for name, digest in OLD.items()))
    report = {"status": "passed" if all(c["passed"] for c in checks) else "failed",
              "checks": checks, "check_count": len(checks),
              "validated_at_utc": datetime.now(timezone.utc).isoformat(),
              "scope": "Read-only actual saved-scene and PNG verification. Nearest maps checked for the full native coat; no physical softness, contact or reference-match score.",
              "files": {p.name: {"bytes": p.stat().st_size, "sha256": sha(p)}
                        for p in (blend, png, source, Path(__file__))}}
    with report_path.open("x", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
    print(json.dumps({"status": report["status"], "checks": len(checks),
                      "report": str(report_path)}, ensure_ascii=False), flush=True)
    if report["status"] != "passed":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
