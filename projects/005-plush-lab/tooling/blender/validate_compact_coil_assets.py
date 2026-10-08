"""Independent read-only saved GN10 compact-coil comparisons.

Native authoring is reconstructed from immutable GN8 controls. All saved input
files remain unchanged; only reversible in-memory dependency probes are used.
No render, no asset save, and no assertion of visual or physical acceptance.
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
HELPER_PATH = Path(__file__).with_name("validate_layer_isolation_assets.py")
HELPER_SHA256 = "426416d965c7a129cc28c062a96ae4562fc5f19041a518715157025b796e869b"
CONTROL = "swatch-reference-gn-no-flyaway-8"
CONTROL_BLEND_SHA256 = "3f6723cdb5e7358991357c8898bc13b09a851b3055d7a545e72f6206ebdc22a3"
CASES = {"swatch-reference-gn-compact-coil-clumped-live3-10": .88,
         "swatch-reference-gn-compact-coil-unclumped-live3-10": 0.}
WRAPPER_SHA256 = "b72713f128b68ad2b344216f22c34e3046a61e8f1933ed1909fb49d4cd74f5c8"
CLUMP_NODE = "Clump Hair Curves"
AXES = np.array([.64, .43, .54], dtype=np.float64)

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("plush_gn10_frozen_inspection_helpers", HELPER_PATH)
w = importlib.util.module_from_spec(spec)
spec.loader.exec_module(w)
v, q, r, h = w.v, w.q, w.r, w.h


def independent_sampled_crown(controls):
    """Authorized proxy sampling, independently written; no author import."""
    def height(values):
        implicit = np.sum((values / AXES) ** 2, axis=-1) - 1
        gradient = 2 * np.linalg.norm(values / (AXES * AXES), axis=-1)
        return implicit / np.maximum(gradient, 1e-12)
    points = np.asarray(controls, dtype=np.float64)
    padded = np.concatenate((points[:, :1], points, points[:, -1:]), axis=1)
    segment_count = points.shape[1] - 1
    a, b, c, d = (padded[:, j:j + segment_count] for j in range(4))
    d0 = .5 * (-a + c)
    d1 = 2 * a - 5 * b + 4 * c - d
    d2 = 1.5 * (-a + 3 * b - 3 * c + d)
    peak = height(points).max(axis=1)
    gauss, _ = np.polynomial.legendre.leggauss(8)
    for t in (gauss + 1) * .5:
        sampled = b + t * d0 + .5 * t * t * d1 + (t ** 3 / 3) * d2
        peak = np.maximum(peak, height(sampled).max(axis=1))
    return peak


def independent_guide_source(control):
    """Reconstruct root-local return coils and normal-only crown normalization."""
    if len(control["offsets"]) != 2658 or not np.all(np.diff(control["offsets"]) == 12):
        raise ValueError("Authorized frozen source requires 2657 guides with 12 controls each")
    old = control["positions"].reshape(2657, 12, 3)
    roots = old[:, 0].astype(np.float64)
    normals = roots / (AXES * AXES)
    normals /= np.linalg.norm(normals, axis=1, keepdims=True)
    tangents = old[:, 5].astype(np.float64) - roots
    tangents -= normals * np.sum(tangents * normals, axis=1, keepdims=True)
    norms = np.linalg.norm(tangents, axis=1, keepdims=True)
    if np.any(norms < 1e-8):
        raise ValueError("Degenerate frozen root-local tangent frame")
    tangents /= norms
    second = np.cross(normals, tangents)
    target = independent_sampled_crown(old)
    if np.any(target <= 1e-6):
        raise ValueError("Nonpositive frozen sampled guide crown")
    prototype = np.arange(2657) % 3
    parameter = np.linspace(0., 1., 12)[None, :]
    def smooth(values):
        t = np.clip(values, 0., 1.)
        return t * t * (3. - 2. * t)
    returning = smooth((parameter - .16) / .84)
    angle = np.array([5.05, 5.30, 5.55])[prototype, None] * returning
    width = np.array([.46, .52, .43])[prototype, None]
    depth = np.array([.22, .27, .31])[prototype, None]
    stem = np.array([.18, .22, .20])[prototype, None]
    H = target[:, None]
    x = width * H * np.sin(angle)
    y = depth * H * (1. - np.cos(angle)) * np.sin(np.pi * returning)
    z = H * (stem * smooth(parameter / .20) + (1. - stem) * .5 * (1. - np.cos(angle)))
    lateral = roots[:, None] + tangents[:, None] * x[..., None] + second[:, None] * y[..., None]
    def positions(normal_scale):
        result = (lateral + normals[:, None] * (z * normal_scale[:, None])[..., None]).astype(np.float32)
        result[:, 0] = old[:, 0]
        return result
    lower, upper = np.full(2657, .15), np.full(2657, 2.)
    if np.any(independent_sampled_crown(positions(lower)) >= target) or np.any(independent_sampled_crown(positions(upper)) <= target):
        raise ValueError("Crown targets outside authorized normal-scale bracket")
    for _ in range(20):
        middle = .5 * (lower + upper)
        too_short = independent_sampled_crown(positions(middle)) < target
        lower = np.where(too_short, middle, lower)
        upper = np.where(~too_short, middle, upper)
    scale = .5 * (lower + upper)
    result = positions(scale)
    crown = independent_sampled_crown(result)
    error = crown - target
    return result.reshape(-1, 3), {"normal_scale": h.summary(scale), "sampled_crown_error": h.summary(error),
                                 "sampled_crown_absolute_error_max": float(np.max(np.abs(error))),
                                 "control_sampled_crown": h.summary(target), "candidate_sampled_crown": h.summary(crown),
                                 "scope": "Explicit deterministic project authoring reconstructed from actual frozen GN8 float32 guide controls; no generator execution. Prototype gid modulo3; root-local 3D return path. Normal-only .15..2 scale, 20 bisections, f32 candidates each iteration. Same order8 signed ellipsoid proxy target; not measured solid volume or physical arc/contact."}


def compare_control(checks, previous, actual, visibility, actual_visibility, factor, identifier):
    checks.check("actual curve object set, visibility and all modifier lists remain fixed",
                 set(actual["curves"]) == set(previous["curves"]) and actual_visibility == visibility)
    checks.check("camera/lights/material/world/backing/render controls and mesh topology remain fixed",
                 all(actual[name] == previous[name] for name in ("noncoat_controls", "mesh_topology")))
    expected_inputs = copy.deepcopy(previous["modifier_inputs"])
    if expected_inputs["Clump Factor"] != float(np.float32(.88)):
        raise ValueError("Frozen actual typed Clump Factor differs from .88")
    expected_inputs["Clump Factor"] = float(np.float32(factor))
    checks.check("actual complete coat graph and dormant defaults remain fixed; only effective typed final Clump Factor changes",
                 actual["tree"]["record"] == previous["tree"]["record"] and actual["modifier_inputs"] == expected_inputs,
                 {"actual_factor": factor, "socket_identifier": identifier,
                  "control_tree_sha256": previous["tree"]["sha256"], "candidate_tree_sha256": actual["tree"]["sha256"]})
    for name, old in previous["curves"].items():
        new = actual["curves"][name]
        if name not in {h.COAT, h.GUIDE}:
            checks.check("actual other-layer native/evaluated buffers, every attribute and object controls remain exact: " + name, new == old)
            continue
        checks.check("actual object controls remain exact: " + name, new["object_controls"] == old["object_controls"])
        for kind in ("source", "evaluated"):
            before, after = copy.deepcopy(old[kind]), copy.deepcopy(new[kind])
            excluded = {"positions_float32_sha256"} if name == h.GUIDE else set()
            if name == h.COAT and kind == "evaluated":
                excluded = {"positions_float32_sha256", "radii_float32_sha256"}
            for field in excluded:
                before.pop(field); after.pop(field)
            checks.check("exact topology/roots/radii/material records outside authorized positions/derived radii: " + name + " " + kind, before == after)
        for kind in ("source_attributes", "evaluated_attributes"):
            excluded = {"position"} if name == h.GUIDE else set()
            if name == h.COAT and kind == "evaluated_attributes":
                excluded = {"position", "radius"}
            before = {key: value for key, value in old[kind].items() if key not in excluded}
            after = {key: value for key, value in new[kind].items() if key not in excluded}
            checks.check("every exact saved attribute outside authorized positions/derived radii: " + name + " " + kind, before == after)


def render_evidence(checks, recorded, meta, stem, candidate):
    receipt = checks.read_json(OUT / (stem + ".render.json"))
    checks.check("real separate completed rendering agrees with CPU precheck and metadata",
                 recorded.get("rendered") is False and meta.get("rendered") is False and receipt.get("rendered") is True
                 and receipt.get("blend") == recorded["blend"] == meta["blend"] == stem + ".blend"
                 and receipt.get("png") == recorded["png"] == meta["png"] == stem + ".png"
                 and receipt.get("kind") == recorded.get("kind") == meta.get("kind") == "swatch"
                 and receipt.get("resolution") == recorded.get("resolution") == meta.get("resolution") == 768
                 and receipt.get("samples") == recorded.get("samples") == meta.get("samples") == 96)
    checks.source("actual rendered blend bytes match receipt", OUT / (stem + ".blend"), receipt["blend_sha256"])
    checks.source("actual PNG bytes match receipt", OUT / (stem + ".png"), receipt["png_sha256"])
    checks.check("render receipt references exactly the frozen authoring source snapshot",
                 receipt["wrapper_source_sha256"] == recorded["wrapper_source_sha256"] == meta["source_sha256"])
    image = bpy.data.images.load(str(OUT / (stem + ".png")), check_existing=False)
    try:
        pixels = np.empty(len(image.pixels), dtype=np.float32)
        image.pixels.foreach_get(pixels)
        checks.check("actual rendered PNG decodes at 768 square with finite nonconstant pixels",
                     list(image.size) == [768, 768] and np.isfinite(pixels).all() and np.ptp(pixels) > 0)
    finally:
        bpy.data.images.remove(image)
    for suffix in (".precheck.log", ".render.log"):
        checks.track(OUT / (stem + suffix))
    candidate.update(render_receipt=receipt, asset_rendered=True, engineering_generation_rendered=False)


def measure_geometry(checks, control, actual, camera_forward, label):
    before_arcs = h.lengths(control["positions"], control["offsets"], 32)
    after_arcs = h.lengths(actual["positions"], actual["offsets"], 32)
    before_surface, before_private = v.sampled_surface_geometry(control, camera_forward)
    after_surface, after_private = v.sampled_surface_geometry(actual, camera_forward)
    checks.check("actual saved " + label + " order32 Catmull arcs are finite and positive",
                 np.isfinite(after_arcs).all() and (after_arcs > 0).all())
    displacements = np.linalg.norm(actual["positions"].astype(np.float64) - control["positions"].astype(np.float64), axis=1)
    per_curve = np.maximum.reduceat(displacements, control["offsets"][:-1])
    return {"curve_count": actual["curve_count"], "control_arc": h.summary(before_arcs), "candidate_arc": h.summary(after_arcs),
            "paired_arc_ratio": h.summary(after_arcs / before_arcs),
            "control_surface_proxy": before_surface, "candidate_surface_proxy": after_surface,
            "maximum_control_displacement_per_curve": h.summary(per_curve), "changed_curve_count": int(np.count_nonzero(per_curve > 1e-8)),
            "end_to_root_distance_control": h.summary(np.linalg.norm(control["positions"][control["offsets"][1:] - 1].astype(np.float64) - control["roots"], axis=1)),
            "end_to_root_distance_candidate": h.summary(np.linalg.norm(actual["positions"][actual["offsets"][1:] - 1].astype(np.float64) - actual["roots"], axis=1)),
            "basis": "Actual float32 controls promoted to float64; uniform Catmull-Rom with duplicated endpoints, Gauss integration order32 for arcs. Crown uses signed analytic ellipsoid implicit/gradient height, eight Gauss samples per segment plus controls. Scene coordinates have no millimeter calibration; neither proxy is engine arc, exact nearest-surface distance, physical volume/contact or rendered visual quality."}


def independent_live_probe(checks, coat, guide, original, persistent_ids):
    """Independent nonroot control6 edit; explicit roots/root-radii/field checks."""
    guide_before = h.native_curves(guide)
    native_attributes = {obj.name: h.frozen_native_attributes(obj) for obj in (coat, guide)}
    before_positions = guide_before["positions"].copy()
    local_ids = persistent_ids - original["curve_count"]
    counts = np.bincount(local_ids, minlength=guide_before["curve_count"])
    eligible = np.flatnonzero(counts > 0)
    gid = int(eligible[np.argmin(np.abs(eligible - guide_before["curve_count"] // 2))])
    start, end = guide_before["offsets"][gid:gid + 2]
    index = int(start + (end - start) // 2)
    perturbed = before_positions.copy()
    perturbed[index, 0] += np.float32(.002)
    changed = None
    try:
        guide.data.position_data.foreach_set("vector", perturbed.ravel())
        guide.data.update_tag(); guide.update_tag(refresh={"DATA"})
        changed = h.native_curves(coat, evaluated=True)
    finally:
        guide.data.position_data.foreach_set("vector", before_positions.ravel())
        guide.data.update_tag(); guide.update_tag(refresh={"DATA"})
        restored = h.native_curves(coat, evaluated=True)
        guide_restored = h.native_curves(guide)
        checks.check("independent in-memory guide and evaluated child buffers restore bitwise",
                     h.curve_record(guide_restored) == h.curve_record(guide_before)
                     and h.curve_record(restored) == h.curve_record(original))
        checks.check("independent probe restores every actual native guide/coat attribute, including rest and IDs",
                     native_attributes == {obj.name: h.frozen_native_attributes(obj) for obj in (coat, guide)})
    checks.check("independent probe retains exact evaluated roots, root radii, count and offsets",
                 changed["curve_count"] == original["curve_count"] and np.array_equal(changed["offsets"], original["offsets"])
                 and h.array_hash(changed["roots"]) == h.array_hash(original["roots"])
                 and h.array_hash(changed["radii"][changed["offsets"][:-1]]) == h.array_hash(original["radii"][original["offsets"][:-1]]))
    h.verify_native(checks, "independently guide-perturbed evaluated coat", changed, original["curve_count"])
    movement = np.linalg.norm(changed["positions"].astype(np.float64) - original["positions"].astype(np.float64), axis=1)
    per_curve = np.maximum.reduceat(movement, original["offsets"][:-1])
    changed_ids = np.flatnonzero(per_curve > 1e-8)
    mapped = local_ids == gid
    outside_points = np.repeat(~mapped, np.diff(original["offsets"]))
    outside_exact = (h.array_hash(changed["positions"][outside_points]) == h.array_hash(original["positions"][outside_points])
                     and h.array_hash(changed["radii"][outside_points]) == h.array_hash(original["radii"][outside_points]))
    checks.check("independent control6 edit genuinely propagates only to mapped actual children",
                 movement.max() > 1e-7 and len(changed_ids) > 0 and mapped[changed_ids].all(),
                 {"guide_gid": gid, "changed_mapped_children": len(changed_ids), "mapped_children": int(mapped.sum()),
                  "changed_outside_group": int(np.count_nonzero(~mapped[changed_ids]))})
    checks.check("independent probe keeps every outside child position and radius bitwise exact", outside_exact)
    return {"guide_index": gid, "guide_control_index": int(index-start), "delta_x": .002,
            "changed_curve_count": len(changed_ids), "expected_child_curve_count": int(mapped.sum()),
            "changed_curve_indices": changed_ids.tolist(), "expected_child_curve_indices": np.flatnonzero(mapped).tolist(),
            "maximum_coat_displacement": float(movement.max()), "changed_curves_outside_explicit_group": int(np.count_nonzero(~mapped[changed_ids])),
            "roots_float32_bitwise_equal": h.array_hash(changed["roots"]) == h.array_hash(original["roots"]),
            "root_radii_float32_bitwise_equal": h.array_hash(changed["radii"][changed["offsets"][:-1]]) == h.array_hash(original["radii"][original["offsets"][:-1]]),
            "restored_evaluation_bitwise_equal": h.curve_record(restored) == h.curve_record(original),
            "nonmapped_evaluation_bitwise_equal": outside_exact,
            "basis": "Actual saved pile_guide_index IDs; midpoint mapped guide, nonroot control6.x +f32(.002), independent evaluation and exact restore. No disk save/render."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assets", nargs="+", default=list(CASES))
    parser.add_argument("--report", default="hair-compact-coil-validation-v10.json")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    if len(set(args.assets)) != len(args.assets) or any(stem not in CASES for stem in args.assets):
        parser.error("Select authorized GN10 asset stems without duplicates")
    if not re.fullmatch(r"[A-Za-z0-9_-]+\.json", args.report):
        parser.error("Use a new simple JSON report filename")
    report = {"status": "checking", "checks": [], "errors": [], "check_count": 0, "cases": {}, "control_asset": CONTROL,
              "validated_at_utc": datetime.now(timezone.utc).isoformat(), "blender": bpy.app.version_string,
              "validator": str(Path(__file__).relative_to(ROOT)),
              "scope": "Independent saved native compact-guide authoring, exact fixed child/radii/rest/maps/other-layer/scene/official graph controls, reversible in-memory dependency probe, two saved reloads and completed render receipts. No render or asset save. Engineering checks and centerline geometry proxies do not establish visual acceptance, physical softness, bundle contact or a reproduced paper/product method."}
    shared = h.Checks(report)
    output = OUT / args.report
    with output.open("x", encoding="utf-8") as stream:
        try:
            shared.track(Path(__file__))
            shared.source("current frozen GN10 authoring source retains independently pinned bytes", Path(__file__).with_name("plush_compact_coil_study.py"), WRAPPER_SHA256)
            shared.source("previous GN9 independent validator remains immutable", Path(__file__).with_name("validate_hierarchical_groom_assets.py"), "2377eaa70f718b2eece72666ac71bd5996c43f77eeca2a416b741ebf24638519")
            shared.track(OUT / "hair-hierarchy-validation-v9-r2.json")
            for label, path, expected in (("GN8", HELPER_PATH, HELPER_SHA256), ("GN7", w.HELPER_PATH, w.HELPER_SHA256),
                                          ("GN6", v.HELPER_PATH, v.HELPER_SHA256), ("GN5", q.HELPER_PATH, q.HELPER_SHA256), ("GN4", r.HELPER_PATH, r.HELPER_SHA256)):
                shared.source(label + " immutable independent helper retains exact bytes", path, expected)
            shared.source("actual saved GN8 no-flyaway control retains frozen bytes", OUT / (CONTROL + ".blend"), CONTROL_BLEND_SHA256)
            shared.source("actual saved GN8 control descriptor retains frozen bytes", OUT / (CONTROL + ".gn-report.json"), "a9ed003ce2aba80eb4d9c9331363baa6f9c1412aaa95e0cfa28c6d9ec0adcd4f")
            control_report = shared.read_json(OUT / (CONTROL + ".gn-report.json"))
            shared.source("GN8 control authoring snapshot retains frozen bytes", h.path_from(control_report["wrapper_source_snapshot"]), control_report["wrapper_source_sha256"])
            official_source = shared.read_json(OUT / "swatch-reference-gn-crown-008-live-7.gn-report.json")
            library = h.path_from(official_source["official_asset_library"], ROOT)
            shared.source("canonical official Hair Curves library retains frozen bytes", library, official_source["official_asset_sha256"])
            bpy.ops.wm.open_mainfile(filepath=str(OUT / (CONTROL + ".blend")))
            previous, visibility = r.snapshot(), w.visibility_controls()
            control_guides = h.native_curves(bpy.context.scene.objects[h.GUIDE])
            control_coat = h.native_curves(bpy.context.scene.objects[h.COAT], evaluated=True)
            camera_forward = list(bpy.context.scene.camera.matrix_world.col[2].xyz)
            clump_identifier = next(item.identifier for item in bpy.context.scene.objects[h.COAT].modifiers[h.MODIFIER].node_group.interface.items_tree
                                    if item.item_type == "SOCKET" and item.in_out == "INPUT" and item.name == "Clump Factor")
            expected_positions, authoring_metrics = independent_guide_source(control_guides)
            report.update(control_snapshot=previous, control_visibility=visibility, independently_reconstructed_authoring=authoring_metrics)
            case_records = {}
            for stem in args.assets:
                checks = q.CaseChecks(shared, stem)
                candidate = report["cases"][stem] = {}
                recorded, meta = checks.read_json(OUT / (stem + ".gn-report.json")), checks.read_json(OUT / (stem + ".json"))
                checks.check("completed CPU precheck references authorized actual GN8 control", recorded.get("status") == "engineering_precheck_passed"
                             and recorded.get("control_asset") == CONTROL and recorded.get("source_blend_sha256") == CONTROL_BLEND_SHA256)
                checks.source("actual frozen new authoring snapshot matches its descriptor", h.path_from(recorded["wrapper_source_snapshot"]), recorded["wrapper_source_sha256"])
                checks.check("new frozen source snapshot matches independently pinned corrected authoring bytes", recorded["wrapper_source_sha256"] == WRAPPER_SHA256)
                for role, expected in (("record_helper", "5b1d9049cec289828a6e354ce334d37873fa8343c4f5a0aa848315732125609c"),
                                       ("geometry_helper", "be7730c0ddba22109ebc31dd44e8660672df7fd2cb8d361093688ce9fcc2c927")):
                    checks.source("actual frozen production dependency retains immutable bytes: " + role, h.path_from(recorded[role + "_source_snapshot"]), expected)
                    checks.check("production dependency descriptor matches exact immutable source: " + role, recorded[role + "_source_sha256"] == expected)
                render_evidence(checks, recorded, meta, stem, candidate)
                asset = OUT / (stem + ".blend")
                checks.source("actual saved candidate matches CPU gate bytes", asset, recorded["saved_blend_sha256"])
                bpy.ops.wm.open_mainfile(filepath=str(asset))
                actual, actual_visibility = r.snapshot(), w.visibility_controls()
                compare_control(checks, previous, actual, visibility, actual_visibility, CASES[stem], clump_identifier)
                coat, guide = bpy.context.scene.objects[h.COAT], bpy.context.scene.objects[h.GUIDE]
                source, guides = h.native_curves(coat), h.native_curves(guide)
                evaluated, evaluated_guides = h.native_curves(coat, evaluated=True), h.native_curves(guide, evaluated=True)
                checks.check("every actual native compact-guide coordinate matches independent authoring reconstruction",
                             h.array_hash(guides["positions"]) == h.array_hash(expected_positions),
                             {"actual_sha256": h.array_hash(guides["positions"]), "independent_expected_sha256": h.array_hash(expected_positions),
                              "maximum_absolute_difference": float(np.max(np.abs(guides["positions"].astype(np.float64) - expected_positions)))})
                checks.check("native and evaluated guides have exact original roots and radii, with no new guide modifiers",
                             h.array_hash(guides["roots"]) == h.array_hash(control_guides["roots"])
                             and h.array_hash(guides["radii"]) == h.array_hash(control_guides["radii"])
                             and h.curve_record(guides) == h.curve_record(evaluated_guides) and len(guide.modifiers) == 0)
                for label, curves, count in (("source guides", guides, 2657), ("evaluated guides", evaluated_guides, 2657),
                                             ("source coat", source, 85000), ("evaluated coat", evaluated, 85000)):
                    h.verify_native(checks, label, curves, count)
                clump = coat.modifiers[h.MODIFIER].node_group.nodes[CLUMP_NODE]
                modifier = coat.modifiers[h.MODIFIER]
                tree = modifier.node_group
                input_node = next(node for node in tree.nodes if node.type == "GROUP_INPUT")
                checks.check("actual final Clump Factor is linked to the effective typed case input, not a dormant node default",
                             h.linked(tree, input_node, input_node.outputs["Clump Factor"], clump, clump.inputs["Factor"])
                             and h.modifier_input(modifier, clump_identifier) == float(np.float32(CASES[stem])))
                checks.check("actual case descriptor matches effective Factor and exact independently authored guide/coat buffers",
                             recorded["coil"]["final_clump_factor"] == CASES[stem]
                             and recorded["coil"]["factor_modifier_identifier"] == clump_identifier
                             and recorded["guides"]["positions_float32_sha256"] == h.array_hash(guides["positions"])
                             and recorded["coat"]["positions_float32_sha256"] == h.array_hash(evaluated["positions"])
                             and recorded["coat"]["radii_float32_sha256"] == h.array_hash(evaluated["radii"]))
                identifier = next(item.identifier for item in coat.modifiers[h.MODIFIER].node_group.interface.items_tree
                                  if item.item_type == "SOCKET" and item.in_out == "INPUT" and item.name == "Tip Spread")
                candidate["official_graph_proof"] = q.official_graph_proof(checks, coat, guide, library, identifier)
                persistent_ids = h.get_array(coat.data.attributes["pile_guide_index"].data, "value", dtype=np.int32)
                child_ids = persistent_ids - 85000
                checks.check("actual persistent child IDs address all unchanged 2657 guides", ((child_ids >= 0) & (child_ids < 2657)).all())
                candidate["independent_live_guide_probe"] = independent_live_probe(checks, coat, guide, evaluated, persistent_ids)
                checks.check("independent guide perturbation restores complete actual saved scene and all attributes", r.snapshot() == actual and w.visibility_controls() == actual_visibility)
                candidate["derived_radius_response"] = q.radius_response(checks, control_coat, evaluated)
                candidate["guide_geometry"] = measure_geometry(checks, control_guides, guides, camera_forward, "guide")
                actual_crown_error = independent_sampled_crown(guides["positions"].reshape(-1, 12, 3)) - independent_sampled_crown(control_guides["positions"].reshape(-1, 12, 3))
                checks.check("every actual authored guide retains its own original sampled crown within 2e-7 scene units",
                             np.max(np.abs(actual_crown_error)) <= 2e-7,
                             {"maximum_absolute_error": float(np.max(np.abs(actual_crown_error))), "paired_error": h.summary(actual_crown_error)})
                candidate["coat_geometry"] = measure_geometry(checks, control_coat, evaluated, camera_forward, "coat")
                candidate["guide_nonplanarity"] = v.guide_nonplanarity(guides)[0]
                rendered = {obj.name: h.native_curves(obj, evaluated=True)["curve_count"] for obj in bpy.context.scene.objects if obj.type == "CURVES" and not obj.hide_render}
                checks.check("actual visible hair counts retain 85000 coat plus 90000 undercoat; flyaway and guides hidden",
                             rendered == {h.COAT: 85000, h.UNDERCOAT: 90000}, rendered)
                candidate.update(candidate_snapshot=actual, rendered_hair_counts=rendered)
                case_records[stem] = actual
                bpy.ops.wm.open_mainfile(filepath=str(asset))
                checks.check("second independent saved reload reproduces all actual native/evaluated attributes, graph, scene and visibility",
                             r.snapshot() == actual and w.visibility_controls() == actual_visibility)
            if len(args.assets) == 2:
                clumped, unclumped = list(CASES)
                a, b = case_records[clumped], case_records[unclumped]
                shared.check("two saved candidate native guide positions and all attributes are bitwise identical",
                             a["curves"][h.GUIDE] == b["curves"][h.GUIDE])
                expected_inputs = copy.deepcopy(a["modifier_inputs"])
                expected_inputs["Clump Factor"] = 0.
                shared.check("two saved candidate complete graph remains exact; only effective typed final Clump Factor differs .88 to zero",
                             a["tree"]["record"] == b["tree"]["record"] and expected_inputs == b["modifier_inputs"])
                shared.check("two actual evaluated coats genuinely differ under effective final Clump isolation",
                             a["curves"][h.COAT]["evaluated"]["positions_float32_sha256"] != b["curves"][h.COAT]["evaluated"]["positions_float32_sha256"])
        except Exception as error:
            shared.check("independent saved GN10 inspection completes", False, {"exception": type(error).__name__, "message": str(error)})
        finally:
            try:
                shared.preserve_inputs()
            except Exception as error:
                shared.check("read-only input preservation completes", False, {"exception": type(error).__name__, "message": str(error)})
            report["input_count"], report["check_count"] = len(shared.inputs), len(report["checks"])
            report["status"] = "failed" if report["errors"] else "passed"
            json.dump(report, stream, ensure_ascii=False, indent=2, allow_nan=False)
            stream.write("\n")
    print("PLUSH_COMPACT_COIL_VALIDATION", json.dumps({"status": report["status"], "checks": report["check_count"], "inputs": report["input_count"], "errors": report["errors"], "report": str(output)}, ensure_ascii=False), flush=True)
    if report["errors"]:
        raise AssertionError("Saved GN10 verification failed: " + "; ".join(report["errors"]))


if __name__ == "__main__":
    main()
