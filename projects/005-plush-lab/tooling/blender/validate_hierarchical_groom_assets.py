"""Independent read-only saved GN9 hierarchical guide validation.

Authoritative mapping and native source positions are reconstructed from the
actual saved GN8 control. No generator execution, render or blend saving.
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
CASES = {"swatch-reference-gn-hierarchy-soft-live-9": .40,
         "swatch-reference-gn-hierarchy-firm-live-9": .65}
PARENT_MODIFIER = "Live parent clump · hierarchy guides"
PARENT_TREE = "PLUSH Parent Clump · hierarchy guides"
PARENT_CLUMP = "ParentClump · official Clump Hair Curves"
PARENT_ID = "hierarchy_parent_index"
PARENT_MASK = "hierarchy_is_parent"
PARENT_COUNT = 900
WRAPPER_SHA256 = "9b2c4fe56ad084de6e4deb138fdfff7b6755e59a6ce0647d5c5f7c69f1e107f7"

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("plush_frozen_gn8_validation_helpers", HELPER_PATH)
w = importlib.util.module_from_spec(spec)
spec.loader.exec_module(w)
v, q, r, h = w.v, w.q, w.r, w.h


def independent_parent_mapping(roots, count=PARENT_COUNT):
    """Specified Euclidean FPS from zero, lowest-index exact ties, sorted IDs."""
    points = np.asarray(roots, dtype=np.float64)
    if not 0 < count <= len(points):
        raise ValueError("Invalid parent-anchor count")
    selected = np.empty(count, dtype=np.int32)
    distance = np.full(len(points), np.inf)
    index = 0
    for step in range(count):
        selected[step] = index
        delta = points-points[index]
        distance = np.minimum(distance, np.sum(delta*delta, axis=1))
        distance[selected[:step+1]] = -1.
        index = int(np.argmax(distance))
    anchors = np.sort(selected)
    if len(np.unique(anchors)) != count:
        raise ValueError("FPS selected duplicate surface roots")
    nearest = np.empty(len(points), dtype=np.int32)
    for start in range(0, len(points), 1024):
        delta = points[start:start+1024, None]-points[anchors][None]
        nearest[start:start+len(delta)] = anchors[np.argmin(np.sum(delta*delta, axis=2), axis=1)]
    mask = np.zeros(len(points), dtype=np.bool_)
    mask[anchors] = True
    nearest[anchors] = anchors
    return anchors, nearest, mask


def independent_guide_source(control, parent_mask):
    """Nonparents root+.72 displacement in float64, float32, exact root bits."""
    steps = np.diff(control["offsets"])
    if not np.all(steps == 12) or len(steps) != len(parent_mask):
        raise ValueError("Authorized guide source requires frozen 12-point topology")
    original = control["positions"].reshape(-1, 12, 3)
    roots = original[:, :1].astype(np.float64)
    result = (roots+.72*(original.astype(np.float64)-roots)).astype(np.float32)
    result[parent_mask] = original[parent_mask]
    result[:, 0] = original[:, 0]
    return result.reshape(-1, 3)


def beta_values(parameter, strength):
    def smoothstep(values):
        t = np.clip(values, 0., 1.)
        return t*t*(3.-2.*t)
    t = np.asarray(parameter, dtype=np.float64)
    return float(strength)*smoothstep(t/.40)*(1.-.25*smoothstep((t-.65)/.35))


def curve_cohort(curves, selection):
    steps = np.diff(curves["offsets"])
    if not np.all(steps == 12):
        raise ValueError("Guide cohort requires frozen uniform topology")
    positions = curves["positions"].reshape(-1, 12, 3)[selection].copy()
    radii = curves["radii"].reshape(-1, 12)[selection].copy()
    result = dict(curves)
    result.update(positions=positions.reshape(-1, 3), radii=radii.reshape(-1), roots=positions[:, 0],
                  offsets=np.arange(len(positions)+1, dtype=np.int32)*12,
                  curve_count=len(positions), point_count=len(positions)*12)
    return result


def parent_graph_proof(checks, guide, strength, canonical_clump_sha):
    modifier = guide.modifiers[PARENT_MODIFIER]
    tree = modifier.node_group
    nodes = tree.nodes
    inp, out = nodes["Original fine guide input"], nodes["Live hierarchical fine guides"]
    clump = nodes[PARENT_CLUMP]
    definitions = {"Tip quarter": ("MULTIPLY", .25), "Tip relaxation .25": ("SUBTRACT", 1.),
                   "Parent length profile": ("MULTIPLY", None), "Parent strength": ("MULTIPLY", strength),
                   "Root selection": ("LESS_THAN", None)}
    math_ok = all(nodes[name].bl_idname == "ShaderNodeMath" and nodes[name].operation == operation
                  and not nodes[name].use_clamp and (constant is None or nodes[name].inputs[0].default_value == float(np.float32(constant)))
                  for name, (operation, constant) in definitions.items())
    map_ok = True
    for name, low, high in (("Parent early rise 0 to .40", 0., .40), ("Parent relaxed tip .65 to 1", .65, 1.)):
        node = nodes[name]
        map_ok &= (node.bl_idname == "ShaderNodeMapRange" and node.interpolation_type == "SMOOTHSTEP" and node.clamp
                   and all(node.inputs[key].default_value == float(np.float32(value)) for key, value in
                           (("From Min", low), ("From Max", high), ("To Min", 0.), ("To Max", 1.))))
    checks.check("actual parent beta math is the authorized smoothstep rise and relaxed-tip strength field", math_ok and map_ok)
    checks.check("actual parent index/mask/fine-index named inputs use exact types and attributes",
                 all(nodes[name].bl_idname == "GeometryNodeInputNamedAttribute" and nodes[name].data_type == kind
                     and nodes[name].inputs["Name"].default_value == name for name, kind in
                     ((PARENT_ID, "INT"), (PARENT_MASK, "BOOLEAN"), ("pile_guide_index", "INT"))))
    defaults = {"Shape": 0., "Tip Spread": 0., "Clump Offset": 0., "Distance Falloff": 0.,
                "Distance Threshold": 0., "Seed": 0, "Preserve Length": True, "Existing Guide Map": True}
    checks.check("actual parent Clump is canonical official content with authorized fixed inputs",
                 clump.bl_idname == "GeometryNodeGroup" and h.group_semantics(clump.node_tree)["sha256"] == canonical_clump_sha
                 and all(not clump.inputs[name].is_linked and clump.inputs[name].default_value == value for name, value in defaults.items()))
    switch, sample, lock, pin, restore = (nodes[name] for name in ("Anchor factor zero", "Sample original anchor and root points",
                                                                 "Anchor or root lock", "Pin native anchor shape and all roots", "Restore global fine guide index"))
    checks.check("actual anchor/root point locks and global fine-index restore have authorized semantics",
                 switch.bl_idname == "GeometryNodeSwitch" and switch.input_type == "FLOAT" and switch.inputs["True"].default_value == 0
                 and not switch.inputs["True"].is_linked and sample.bl_idname == "GeometryNodeSampleIndex"
                 and sample.data_type == "FLOAT_VECTOR" and sample.domain == "POINT" and not sample.clamp
                 and lock.bl_idname == "FunctionNodeBooleanMath" and lock.operation == "OR"
                 and nodes["Root selection"].inputs[1].default_value == float(np.float32(1e-7))
                 and pin.bl_idname == "GeometryNodeSetPosition" and not pin.inputs["Offset"].is_linked and list(pin.inputs["Offset"].default_value) == [0., 0., 0.]
                 and restore.bl_idname == "GeometryNodeStoreNamedAttribute" and restore.data_type == "INT" and restore.domain == "CURVE"
                 and restore.inputs["Name"].default_value == "guide_curve_index" and restore.inputs["Selection"].default_value is True
                 and not restore.inputs["Selection"].is_linked)
    # Explicit socket connections, including input index where Math labels repeat.
    edges = [(inp.name, "Geometry", clump.name, "Geometry"), (PARENT_ID, "Attribute", clump.name, "Guide Index"),
             (PARENT_MASK, "Attribute", clump.name, "Guide Mask"), ("Anchor factor zero", "Output", clump.name, "Factor"),
             ("Fine guide length parameter", "Factor", "Parent early rise 0 to .40", "Value"),
             ("Fine guide length parameter", "Factor", "Parent relaxed tip .65 to 1", "Value"),
             ("Parent relaxed tip .65 to 1", "Result", "Tip quarter", 1), ("Tip quarter", 0, "Tip relaxation .25", 1),
             ("Parent early rise 0 to .40", "Result", "Parent length profile", 0), ("Tip relaxation .25", 0, "Parent length profile", 1),
             ("Parent length profile", 0, "Parent strength", 1), ("Parent strength", 0, "Anchor factor zero", "False"),
             (PARENT_MASK, "Attribute", "Anchor factor zero", "Switch"),
             (inp.name, "Geometry", sample.name, "Geometry"), ("Original input point field", "Position", sample.name, "Value"),
             ("Stable point index", "Index", sample.name, "Index"), ("Fine guide length parameter", "Factor", "Root selection", 0),
             (PARENT_MASK, "Attribute", lock.name, 0), ("Root selection", 0, lock.name, 1),
             (clump.name, "Geometry", pin.name, "Geometry"), (lock.name, 0, pin.name, "Selection"), (sample.name, "Value", pin.name, "Position"),
             (pin.name, "Geometry", restore.name, "Geometry"), ("pile_guide_index", "Attribute", restore.name, "Value"),
             (restore.name, "Geometry", out.name, "Geometry")]
    link_ok = all(h.linked(tree, nodes[a], nodes[a].outputs[b], nodes[c], nodes[c].inputs[d]) for a, b, c, d in edges)
    checks.check("complete actual parent graph has only the authorized live geometry/field/point-lock connections", link_ok and len(tree.links) == len(edges))
    expected_types = {inp.name: "NodeGroupInput", out.name: "NodeGroupOutput", PARENT_ID: "GeometryNodeInputNamedAttribute",
                      PARENT_MASK: "GeometryNodeInputNamedAttribute", "pile_guide_index": "GeometryNodeInputNamedAttribute",
                      "Fine guide length parameter": "GeometryNodeSplineParameter", "Parent early rise 0 to .40": "ShaderNodeMapRange",
                      "Parent relaxed tip .65 to 1": "ShaderNodeMapRange", "Anchor factor zero": "GeometryNodeSwitch",
                      clump.name: "GeometryNodeGroup", "Original input point field": "GeometryNodeInputPosition", "Stable point index": "GeometryNodeInputIndex",
                      sample.name: "GeometryNodeSampleIndex", lock.name: "FunctionNodeBooleanMath", pin.name: "GeometryNodeSetPosition",
                      restore.name: "GeometryNodeStoreNamedAttribute", **{name: "ShaderNodeMath" for name in definitions}}
    checks.check("editable parent modifier and complete new node set are exact", tree.name == PARENT_TREE and modifier.show_render and modifier.show_viewport
                 and {node.name: node.bl_idname for node in nodes} == expected_types)
    dependencies = h.group_library_dependencies(tree)
    checks.check("saved parent preprocessing has no strong external library dependency", all(value["strong_library"] is None for value in dependencies.values()))
    return {"tree": h.group_semantics(tree), "library_dependencies": dependencies, "actual_strength": nodes["Parent strength"].inputs[0].default_value,
            "scope": "Actual editable official Clump guide preprocessing with persistent parent IDs and live locks, not a physical bundling/contact solve."}


def compare_control(checks, previous, actual, old_visibility, actual_visibility):
    checks.check("actual coat GN graph, typed inputs and complete camera/light/material/world/render/mesh controls fixed",
                 all(actual[key] == previous[key] for key in ("tree", "modifier_inputs", "noncoat_controls", "mesh_topology")))
    checks.check("exact curve object set retained", set(actual["curves"]) == set(previous["curves"]))
    fixed = True
    for name, old in previous["curves"].items():
        new = actual["curves"][name]
        if name not in {h.GUIDE, h.COAT}:
            fixed &= new == old
            continue
        fixed &= new["object_controls"] == old["object_controls"]
        for kind in ("source", "evaluated"):
            before, after = copy.deepcopy(old[kind]), copy.deepcopy(new[kind])
            allowed = {"positions_float32_sha256"} if name == h.GUIDE else set()
            if name == h.COAT and kind == "evaluated":
                allowed = {"positions_float32_sha256", "radii_float32_sha256"}
            for key in allowed:
                before.pop(key); after.pop(key)
            fixed &= before == after
        for kind in ("source_attributes", "evaluated_attributes"):
            excluded = {"position", PARENT_ID, PARENT_MASK} if name == h.GUIDE else set()
            if name == h.GUIDE and kind == "evaluated_attributes":
                excluded.add("resolution")
            if name == h.COAT and kind == "evaluated_attributes":
                excluded = {"position", "radius", PARENT_ID, PARENT_MASK}
            fixed &= {k: value for k, value in old[kind].items() if k not in excluded} == {k: value for k, value in new[kind].items() if k not in excluded}
    checks.check("native coat/maps/rest/radii and other layers fixed; guide limited to positions/two parent attributes and coat evaluation to position/radius", fixed)
    # Named guide attributes propagate through Join Geometry as defaults on
    # child curves. Canonical Clump materializes implicit guide resolution.
    # Validate exact values, not a broad exclusion of evaluated metadata.
    expected_metadata = {
        h.COAT: {PARENT_ID: {"domain": "CURVE", "type": "INT", "count": 85000, "sha256": h.array_hash(np.zeros(85000, dtype=np.int32), np.int32)},
                 PARENT_MASK: {"domain": "CURVE", "type": "BOOLEAN", "count": 85000, "sha256": h.array_hash(np.zeros(85000, dtype=np.bool_), np.bool_)}},
        h.GUIDE: {"resolution": {"domain": "CURVE", "type": "INT", "count": 2657, "sha256": h.array_hash(np.full(2657, 12, dtype=np.int32), np.int32)}},
    }
    checks.check("only exact derived Join default parent metadata0/false and official Clump resolution12 are added to evaluation",
                 all(key not in previous["curves"][obj]["evaluated_attributes"] and actual["curves"][obj]["evaluated_attributes"].get(key) == expected
                     for obj, fields in expected_metadata.items() for key, expected in fields.items()), expected_metadata)
    expected = copy.deepcopy(old_visibility)
    expected[h.GUIDE]["modifiers"].append([PARENT_MODIFIER, "NODES", True, True])
    checks.check("all scene visibility and existing modifiers fixed except one new live guide preprocessing modifier", actual_visibility == expected)


def parent_probe(checks, coat, guide, original_coat, source_guides, evaluated_guides, parent_ids, anchors, child_ids):
    counts = np.bincount(parent_ids, minlength=len(parent_ids))
    eligible = anchors[counts[anchors] >= 2]
    # Different anchor/control from the production probe; membership read from saved IDs.
    index = int(eligible[np.argmin(np.abs(eligible-len(parent_ids)*.67))])
    fine = parent_ids == index
    children = fine[child_ids]
    positions = source_guides["positions"].copy()
    point = int(source_guides["offsets"][index]+6)
    perturbed = positions.copy(); perturbed[point, 0] += np.float32(.002)
    def update():
        guide.data.update_tag(); guide.update_tag(refresh={"DATA"}); coat.update_tag(refresh={"DATA"}); bpy.context.view_layer.update()
    try:
        guide.data.position_data.foreach_set("vector", perturbed.ravel()); update()
        changed_guides, changed_coat = h.native_curves(guide, evaluated=True), h.native_curves(coat, evaluated=True)
    finally:
        guide.data.position_data.foreach_set("vector", positions.ravel()); update()
        restored_source, restored_guides, restored_coat = h.native_curves(guide), h.native_curves(guide, evaluated=True), h.native_curves(coat, evaluated=True)
        checks.check("parent live probe restores native/evaluated guide and coat records bitwise",
                     h.curve_record(restored_source) == h.curve_record(source_guides) and h.curve_record(restored_guides) == h.curve_record(evaluated_guides)
                     and h.curve_record(restored_coat) == h.curve_record(original_coat))
    movements = {}
    for label, before, after, membership in (("guide", evaluated_guides, changed_guides, fine), ("coat", original_coat, changed_coat, children)):
        displacement = np.linalg.norm(after["positions"].astype(np.float64)-before["positions"].astype(np.float64), axis=1)
        per_curve = np.maximum.reduceat(displacement, before["offsets"][:-1])
        changed = per_curve > 1e-8
        outside = np.repeat(~membership, np.diff(before["offsets"]))
        checks.check("actual parent probe changes only saved parent-family " + label + " positions/radii and preserves all root/radius-root bits",
                     changed.any() and not changed[~membership].any()
                     and h.array_hash(after["positions"][outside]) == h.array_hash(before["positions"][outside])
                     and h.array_hash(after["radii"][outside]) == h.array_hash(before["radii"][outside])
                     and h.array_hash(after["roots"]) == h.array_hash(before["roots"])
                     and h.array_hash(after["radii"][after["offsets"][:-1]]) == h.array_hash(before["radii"][before["offsets"][:-1]]))
        movements[label] = {"actual_family_count": int(membership.sum()), "changed_curve_count": int(changed.sum()),
                            "maximum_displacement": float(displacement.max()), "changed_curve_indices": np.flatnonzero(changed).tolist(),
                            "outside_family_bitwise_equal": True, "roots_and_root_radii_bitwise_equal": True}
    checks.check("actual parent source edit propagates beyond the edited anchor into evaluated fine guides",
                 len([gid for gid in movements["guide"]["changed_curve_indices"] if gid != index]) > 0)
    return {"parent_gid": index, "control_index": 6, "delta_x": .002, "fine_gids": np.flatnonzero(fine).tolist(),
            "movements": movements, "restored_native_and_evaluation_bitwise_equal": True,
            "scope": "Independent saved parent control perturbation in memory, family derived from actual persistent IDs. No save or render."}


def render_evidence(checks, recorded, meta, stem, candidate):
    receipt_path = OUT / (stem+".render.json")
    receipt = checks.read_json(receipt_path)
    checks.check("real separate render receipt describes actual saved case controls",
                 recorded.get("rendered") is False and meta.get("rendered") is False and receipt.get("rendered") is True
                 and receipt.get("blend") == recorded["blend"] == meta["blend"] == stem+".blend"
                 and receipt.get("png") == recorded["png"] == meta["png"] == stem+".png"
                 and receipt.get("kind") == recorded.get("kind") == meta.get("kind") == "swatch"
                 and receipt.get("resolution") == recorded.get("resolution") == meta.get("resolution") == 768
                 and receipt.get("samples") == recorded.get("samples") == meta.get("samples") == 96)
    checks.source("actual rendered blend matches receipt and saved gate", h.path_from(receipt["blend"]), receipt["blend_sha256"])
    checks.source("actual PNG bytes match receipt", h.path_from(receipt["png"]), receipt["png_sha256"])
    checks.check("real receipt and metadata refer to frozen actual wrapper", receipt["wrapper_source_sha256"] == recorded["wrapper_source_sha256"] == meta["source_sha256"] == WRAPPER_SHA256)
    image = bpy.data.images.load(str(h.path_from(receipt["png"])), check_existing=False)
    try:
        pixels = np.empty(len(image.pixels), dtype=np.float32); image.pixels.foreach_get(pixels)
        checks.check("actual PNG decodes at768 square with finite pixels", list(image.size) == [768, 768] and np.isfinite(pixels).all())
    finally:
        bpy.data.images.remove(image)
    for suffix in (".precheck.log", ".render.log"):
        checks.track(OUT / (stem+suffix))
    candidate.update(render_receipt=receipt, asset_rendered=True, engineering_generation_rendered=False,
                     receipt_path_inference="Report omits render_receipt field; actual exclusive stem.render.json independently read and its recorded saved blend/PNG/source hashes verified.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assets", nargs="+", default=list(CASES))
    parser.add_argument("--report", default="hair-hierarchy-validation-v9-r2.json")
    args = parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    if len(set(args.assets)) != len(args.assets) or any(stem not in CASES for stem in args.assets): parser.error("Select authorized GN9 asset stems without duplicates")
    if not re.fullmatch(r"[A-Za-z0-9_-]+\.json", args.report): parser.error("Use a new simple JSON report filename")
    report = {"status": "checking", "checks": [], "errors": [], "check_count": 0, "cases": {}, "control_asset": CONTROL,
              "validated_at_utc": datetime.now(timezone.utc).isoformat(), "blender": bpy.app.version_string,
              "validator": str(Path(__file__).relative_to(ROOT)),
              "scope": "Independent actual saved composite parent/fine-guide candidate validation, live graph/IDs/propagation, fixed native child data/scene and real receipt/SHA. Exact derived metadata checks: child evaluated Join parent attributes0/false and guide evaluated Clump resolution12; native source data stay fixed. Internal Clump segment-length behavior is not historical-rest or Catmull-arc preservation, contact simulation, solid volume or visual acceptance."}
    shared = h.Checks(report)
    output = OUT / args.report
    with output.open("x", encoding="utf-8") as stream:
        try:
            for label, path, expected in (("GN8", HELPER_PATH, HELPER_SHA256), ("GN7", w.HELPER_PATH, w.HELPER_SHA256),
                                          ("GN6", v.HELPER_PATH, v.HELPER_SHA256), ("GN5", q.HELPER_PATH, q.HELPER_SHA256), ("GN4", r.HELPER_PATH, r.HELPER_SHA256)):
                shared.source(label+" validator helper retains immutable bytes", path, expected)
            control_report = shared.read_json(OUT / (CONTROL+".gn-report.json"))
            shared.source("actual saved GN8 no-flyaway control matches frozen bytes", OUT / (CONTROL+".blend"), CONTROL_BLEND_SHA256)
            shared.source("GN8 control wrapper retains frozen source", h.path_from(control_report["wrapper_source_snapshot"]), control_report["wrapper_source_sha256"])
            official_source = shared.read_json(OUT / "swatch-reference-gn-crown-008-live-7.gn-report.json")
            library = h.path_from(official_source["official_asset_library"], ROOT)
            shared.source("canonical official source retains recorded bytes", library, official_source["official_asset_sha256"])
            bpy.ops.wm.open_mainfile(filepath=str(OUT / (CONTROL+".blend")))
            previous, previous_visibility = r.snapshot(), w.visibility_controls()
            old_guides = h.native_curves(bpy.context.scene.objects[h.GUIDE])
            old_coat = h.native_curves(bpy.context.scene.objects[h.COAT], evaluated=True)
            anchors, expected_parent_ids, expected_mask = independent_parent_mapping(old_guides["roots"])
            expected_source = independent_guide_source(old_guides, expected_mask)
            old_fine = curve_cohort(old_guides, ~expected_mask)
            camera_forward = list(bpy.context.scene.camera.matrix_world.col[2].xyz)
            old_fine_surface, _ = v.sampled_surface_geometry(old_fine, camera_forward)
            old_fine_arcs = h.lengths(old_fine["positions"], old_fine["offsets"], 32)
            report.update(control_snapshot=previous, control_visibility=previous_visibility, independently_recomputed_anchor_ids=anchors.tolist())
            case_records = {}
            for stem in args.assets:
                checks = q.CaseChecks(shared, stem); candidate = report["cases"][stem] = {}
                recorded, meta = checks.read_json(OUT / (stem+".gn-report.json")), checks.read_json(OUT / (stem+".json"))
                descriptor = recorded["hierarchy"]
                checks.check("actual generation descriptor references authorized saved control and case", recorded["control_asset"] == CONTROL and recorded["source_blend_sha256"] == CONTROL_BLEND_SHA256
                             and recorded["status"] == "engineering_precheck_passed" and descriptor["strength"] == CASES[stem] and descriptor["fine_scale"] == .72)
                checks.source("new wrapper actual snapshot matches frozen GN9 bytes", h.path_from(recorded["wrapper_source_snapshot"]), WRAPPER_SHA256)
                checks.check("wrapper SHA descriptor retains frozen bytes", recorded["wrapper_source_sha256"] == WRAPPER_SHA256)
                for role in ("control_wrapper", "record_helper", "geometry_helper"):
                    checks.source("actual frozen generation dependency: "+role, h.path_from(recorded[role+"_source_snapshot"]), recorded[role+"_source_sha256"])
                render_evidence(checks, recorded, meta, stem, candidate)
                asset_path = h.path_from(recorded["blend"]); checks.source("actual saved blend retains CPU gate bytes", asset_path, recorded["saved_blend_sha256"])
                bpy.ops.wm.open_mainfile(filepath=str(asset_path))
                actual, actual_visibility = r.snapshot(), w.visibility_controls()
                compare_control(checks, previous, actual, previous_visibility, actual_visibility)
                coat, guide = bpy.context.scene.objects[h.COAT], bpy.context.scene.objects[h.GUIDE]
                source, guides, evaluated, eval_guides = h.native_curves(coat), h.native_curves(guide), h.native_curves(coat, evaluated=True), h.native_curves(guide, evaluated=True)
                ids_attr, mask_attr = guide.data.attributes[PARENT_ID], guide.data.attributes[PARENT_MASK]
                parent_ids = h.get_array(ids_attr.data, "value", dtype=np.int32); parent_mask = h.get_array(mask_attr.data, "value", dtype=np.bool_)
                checks.check("saved native hierarchy attrs have exact CURVE INT/BOOLEAN layout and independently reconstructed900-anchor FPS/nearest map",
                             ids_attr.domain == mask_attr.domain == "CURVE" and ids_attr.data_type == "INT" and mask_attr.data_type == "BOOLEAN"
                             and np.array_equal(parent_ids, expected_parent_ids) and np.array_equal(parent_mask, expected_mask)
                             and np.array_equal(parent_ids[anchors], anchors) and len(anchors) == PARENT_COUNT)
                checks.check("reported hierarchy IDs/map/mask agree with actual independent native arrays", descriptor["anchor_ids"] == anchors.tolist()
                             and descriptor["parent_mapping_int32_sha256"] == h.array_hash(parent_ids, np.int32) and descriptor["parent_mask_sha256"] == h.array_hash(parent_mask, np.bool_))
                checks.check("every native guide point is the authorized exact f32 source scale with all anchor/root bits retained", h.array_hash(guides["positions"]) == h.array_hash(expected_source)
                             and h.array_hash(guides["roots"]) == h.array_hash(old_guides["roots"]))
                positions = eval_guides["positions"].reshape(-1, 12, 3)
                old_positions = old_guides["positions"].reshape(-1, 12, 3)
                checks.check("actual evaluated guide anchors/all roots/all radii retain exact saved control bits", h.array_hash(positions[parent_mask]) == h.array_hash(old_positions[parent_mask])
                             and h.array_hash(eval_guides["roots"]) == h.array_hash(old_guides["roots"]) and h.array_hash(eval_guides["radii"]) == h.array_hash(old_guides["radii"]))
                checks.check("actual source/evaluated guide and evaluated child hashes match this case's own measured records",
                             h.array_hash(guides["positions"]) == descriptor["source_guide_positions_sha256"]
                             and h.array_hash(eval_guides["positions"]) == descriptor["evaluated_guide_positions_sha256"]
                             and h.array_hash(evaluated["positions"]) == recorded["coat"]["evaluated"]["positions_float32_sha256"]
                             and h.array_hash(evaluated["radii"]) == recorded["coat"]["evaluated"]["radii_float32_sha256"])
                for label, curves, count in (("source guides", guides, 2657), ("evaluated guides", eval_guides, 2657), ("evaluated child coat", evaluated, 85000)):
                    h.verify_native(checks, label, curves, count)
                checks.check("actual new guide and child evaluations genuinely change", h.array_hash(eval_guides["positions"]) != h.array_hash(guides["positions"])
                             and h.array_hash(evaluated["positions"]) != h.array_hash(old_coat["positions"]))
                candidate["derived_child_radius_response"] = q.radius_response(checks, old_coat, evaluated)
                child_ids = h.get_array(coat.data.attributes["pile_guide_index"].data, "value", dtype=np.int32)-85000
                guide_eval_obj = guide.evaluated_get(bpy.context.evaluated_depsgraph_get())
                restored_ids = h.get_array(guide_eval_obj.data.attributes["guide_curve_index"].data, "value", dtype=np.int32)
                persistent = h.get_array(guide.data.attributes["pile_guide_index"].data, "value", dtype=np.int32)
                checks.check("actual evaluated guide_curve_index restores unchanged global fine IDs and all child IDs address those2657 guides", np.array_equal(restored_ids, persistent)
                             and np.array_equal(persistent, 85000+np.arange(2657, dtype=np.int32)) and ((child_ids >= 0)&(child_ids < 2657)).all())
                identifier = next(item.identifier for item in coat.modifiers[h.MODIFIER].node_group.interface.items_tree if item.item_type == "SOCKET" and item.in_out == "INPUT" and item.name == "Tip Spread")
                candidate["child_graph_proof"] = q.official_graph_proof(checks, coat, guide, library, identifier)
                clump_sha = candidate["child_graph_proof"]["official_groups"]["Clump Hair Curves"]["canonical_sha256"]
                candidate["parent_graph_proof"] = parent_graph_proof(checks, guide, CASES[stem], clump_sha)
                candidate["independent_live_parent_probe"] = parent_probe(checks, coat, guide, evaluated, guides, eval_guides, parent_ids, anchors, child_ids)
                fine = curve_cohort(eval_guides, ~parent_mask)
                fine_surface, _ = v.sampled_surface_geometry(fine, camera_forward)
                fine_arcs = h.lengths(fine["positions"], fine["offsets"], 32)
                checks.check("actual evaluated nonparent fine-guide cohort has finite positive arcs and lower median arc/crown than GN8 control", np.isfinite(fine_arcs).all() and (fine_arcs > 0).all()
                             and np.median(fine_arcs) < np.median(old_fine_arcs) and fine_surface["crown_height_all"]["median"] < old_fine_surface["crown_height_all"]["median"])
                candidate["nonparent_fine_geometry"] = {"count": len(fine_arcs), "control_surface_proxy": old_fine_surface, "candidate_surface_proxy": fine_surface,
                                                         "quadrature_order": 32, "control_arc": h.summary(old_fine_arcs), "candidate_arc": h.summary(fine_arcs), "ratio_to_control": h.summary(fine_arcs/old_fine_arcs),
                                                         "scope": "Actual saved evaluated nonparent guide cohort. Native .72 scale does not imply exact evaluated Catmull arc ratio; no historical rest length/contact/visual acceptance requirement."}
                rendered = {obj.name: h.native_curves(obj, evaluated=True)["curve_count"] for obj in bpy.context.scene.objects if obj.type == "CURVES" and not obj.hide_render}
                checks.check("actual rendered layer counts remain85000coat+90000undercoat with guides and flyaway hidden", rendered == {h.COAT: 85000, h.UNDERCOAT: 90000}, rendered)
                candidate.update(candidate_snapshot=actual, guide_source=h.curve_record(guides), guide_evaluated=h.curve_record(eval_guides), parent_mapping_int32_sha256=h.array_hash(parent_ids, np.int32), rendered_hair_counts=rendered)
                parent_record = candidate["parent_graph_proof"]["tree"]["record"]
                case_records[stem] = {"source": actual["curves"][h.GUIDE]["source"], "source_attributes": actual["curves"][h.GUIDE]["source_attributes"], "parent_tree": parent_record}
                bpy.ops.wm.open_mainfile(filepath=str(asset_path))
                checks.check("second independent saved reload reproduces all native/evaluated/GN/scene/parent records", r.snapshot() == actual and w.visibility_controls() == actual_visibility
                             and h.group_semantics(bpy.context.scene.objects[h.GUIDE].modifiers[PARENT_MODIFIER].node_group)["record"] == parent_record)
            if len(args.assets) == 2:
                soft, firm = sorted(args.assets, key=lambda stem: CASES[stem])
                a, b = case_records[soft], case_records[firm]
                expected = copy.deepcopy(a["parent_tree"])
                expected["nodes"]["Parent strength"]["inputs"][0][1] = float(np.float32(.65))
                shared.check("soft and firm native guide source/maps exactly identical; complete parent graph differs only by strength .40 to .65",
                             a["source"] == b["source"] and a["source_attributes"] == b["source_attributes"] and expected == b["parent_tree"])
        except Exception as error:
            shared.check("independent saved GN9 inspection completes", False, {"exception": type(error).__name__, "message": str(error)})
        finally:
            try:
                shared.preserve_inputs()
            except Exception as error:
                shared.check("read-only input preservation completes", False, {"exception": type(error).__name__, "message": str(error)})
            report["input_count"], report["check_count"] = len(shared.inputs), len(report["checks"])
            report["status"] = "failed" if report["errors"] else "passed"
            json.dump(report, stream, ensure_ascii=False, indent=2, allow_nan=False); stream.write("\n")
    print("PLUSH_HIERARCHY_VALIDATION", json.dumps({"status": report["status"], "checks": report["check_count"], "inputs": report["input_count"], "errors": report["errors"], "report": str(output)}, ensure_ascii=False), flush=True)
    if report["errors"]: raise AssertionError("Saved GN9 verification failed: "+"; ".join(report["errors"]))


if __name__ == "__main__":
    main()
