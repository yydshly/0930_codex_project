"""One independent, live Geometry Nodes short-pile study using official assets.

Run in Blender 5.2.2, for example:
  blender -b --python-exit-code 1 --python plush_hair_nodes_study.py -- --no-render

This is a method candidate, not a single-variable A/B: authored open guides,
official Curl/Clump/Restore nodes, shorter geometry and a fuller radius profile
change together. Frozen v3 roots, strand counts, RNG samples, materials,
undercoat/flyaways, camera and lights remain. Guides are an Object Info input to
the live modifier, not a hidden baked record. No physical/Houdini/paper algorithm
reproduction is claimed. Existing outputs are never replaced.
"""

import argparse
import hashlib
import importlib.util
import json
import math
import sys
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "artifacts" / "cycles-study"
BASELINE = OUT / "character-reference-v3.source.py"
BASELINE_SHA256 = "69df6504ddc4412c1279f7f40f2baa8ae45fbedc6649e64cdc7cb1d175039dc3"
ASSET = Path("D:/codex/home/cache/plush-lab-tools/blender/blender-5.2.2-windows-x64/5.2/datafiles/assets/nodes/procedural_hair_node_assets.blend")
OFFICIAL_GROUPS = ("Curl Hair Curves", "Clump Hair Curves",
                   "Restore Curve Segment Length", "Set Hair Curve Profile")
GUIDE_NAME = "Pile guides · editable live input"
MODIFIER_NAME = "Live official hair GN · pile study"
TREE_NAME = "PLUSH Live Official Hair · pile study"
MEMBERS = 32


def digest_bytes(data):
    return hashlib.sha256(data).hexdigest()


def array_digest(array):
    return digest_bytes(np.ascontiguousarray(array).tobytes())


def summarize(values):
    values = np.asarray(values, dtype=np.float64)
    return {"minimum": float(values.min()), "maximum": float(values.max()),
            "mean": float(values.mean()), "median": float(np.median(values)),
            "p95": float(np.percentile(values, 95))}


def cli():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tag", default="gn-pile-1")
    parser.add_argument("--resolution", type=int, default=768)
    parser.add_argument("--samples", type=int, default=96)
    parser.add_argument("--no-render", action="store_true")
    options = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    if not options.tag or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for c in options.tag):
        parser.error("--tag must be a nonempty file-safe name")
    if options.resolution <= 0 or options.samples <= 0:
        parser.error("resolution and samples must be positive")
    return options


def load_baseline():
    source = BASELINE.read_bytes()
    if digest_bytes(source) != BASELINE_SHA256:
        raise RuntimeError("Frozen v3 source SHA256 changed")
    spec = importlib.util.spec_from_file_location("_plush_hair_nodes_frozen_v3", BASELINE)
    module = importlib.util.module_from_spec(spec)
    previous = sys.dont_write_bytecode
    sys.dont_write_bytecode = True
    try:
        spec.loader.exec_module(module)
    finally:
        sys.dont_write_bytecode = previous
    return module


def catmull_rom_lengths(points, order=32, batch=2048):
    """Order-32 uniform Catmull-Rom integral on saved float32 controls.

    Duplicate endpoint controls; this is a geometric numerical measurement,
    separate from the official Restore node's control-segment length constraint.
    """
    nodes, weights = np.polynomial.legendre.leggauss(order)
    nodes, weights = (nodes + 1) * .5, weights * .5
    result = np.empty(len(points), dtype=np.float64)
    for start in range(0, len(points), batch):
        controls = np.asarray(points[start:start + batch], dtype=np.float64)
        extended = np.concatenate((controls[:, :1], controls, controls[:, -1:]), axis=1)
        a, b, c, d = (extended[:, j:j + controls.shape[1] - 1] for j in range(4))
        d0, d1, d2 = .5 * (-a + c), 2*a - 5*b + 4*c - d, 1.5*(-a + 3*b - 3*c + d)
        lengths = np.zeros(len(controls))
        for t, w in zip(nodes, weights):
            lengths += w * np.linalg.norm(d0 + t*d1 + t*t*d2, axis=-1).sum(axis=1)
        result[start:start + len(controls)] = lengths
    return result


def replay_frames(base, count):
    """Replay frozen coat draws only: no extra random points or random samples."""
    rng = np.random.default_rng(51)
    groups = math.ceil(count / MEMBERS)
    tg = np.arccos(rng.uniform(-.998, .998, groups))
    ag = rng.uniform(0, math.tau, groups)
    t, a = np.repeat(tg, MEMBERS)[:count], np.repeat(ag, MEMBERS)[:count]
    t += rng.normal(0, .023/.54, count)
    a += rng.normal(0, .023/.54, count) / np.maximum(np.sin(t), .20)
    t = np.clip(t, .0002, math.pi-.0002)
    roots, normal = base.surface_frame(t, a, True)
    gp, gn = base.surface_frame(tg, ag, True)
    turn = rng.normal(0, .6, groups)
    down = np.broadcast_to(np.array([0., 0., -1.]), gn.shape).copy()
    down -= np.sum(down*gn, axis=-1)[:, None]*gn
    poles = np.linalg.norm(down, axis=-1) < .05
    down[poles] = np.cross(gn[poles], [0, 1, 0])
    down = base.normalize(down)
    side = base.normalize(np.cross(gn, down))
    lean = down*np.cos(turn)[:, None] + side*np.sin(turn)[:, None]
    side = base.normalize(np.cross(gn, lean))
    return roots, normal, gp, gn, lean, side


def make_guides(base, original):
    count, k, _ = original.shape
    roots, normals, gp, gn, lean, side = replay_frames(base, count)
    if not np.array_equal(roots.astype(np.float32).view(np.uint32), original[:, 0].view(np.uint32)):
        raise RuntimeError("Frozen coat root replay failed")
    baseline_lengths = catmull_rom_lengths(original)
    budget = .70 * baseline_lengths
    group_ids = np.arange(count, dtype=np.int32) // MEMBERS
    group_budget = np.bincount(group_ids, weights=budget) / np.bincount(group_ids)
    t = np.linspace(0, 1, k)[None, :]
    prototypes = np.arange(len(gp)) % 3
    # Three open, bent crowns. None is the original independent one-turn helix.
    x = np.where(prototypes[:, None] == 0, .007*(1-np.cos(1.05*math.pi*t)),
                 np.where(prototypes[:, None] == 1, .006*np.sin(1.2*math.pi*t), .004*np.sin(2*math.pi*t)))
    y = np.where(prototypes[:, None] == 0, .012*t,
                 np.where(prototypes[:, None] == 1, .017*t, .014*t+.003*np.sin(math.pi*t)))
    z = np.where(prototypes[:, None] == 0, .019*np.sin(.70*math.pi*t),
                 np.where(prototypes[:, None] == 1, .021*np.sin(.72*math.pi*t), .020*np.sin(.62*math.pi*t)))
    guides = gp[:, None] + side[:, None]*x[..., None] + lean[:, None]*y[..., None] + gn[:, None]*z[..., None]
    guide_lengths = catmull_rom_lengths(guides.astype(np.float32))
    guides = (gp[:, None] + (guides-gp[:, None])*(group_budget/guide_lengths)[:, None, None]).astype(np.float32)
    guides[:, 0] = gp.astype(np.float32)
    rest = (roots[:, None] + normals[:, None]*budget[:, None, None]*t[..., None]).astype(np.float32)
    rest[:, 0] = original[:, 0]
    return rest, guides, group_ids, baseline_lengths, budget, prototypes


def attribute(data, name, data_type, domain, values):
    a = data.attributes.new(name, data_type, domain)
    a.data.foreach_set("vector" if data_type == "FLOAT_VECTOR" else "value", np.asarray(values).ravel())


def structural_record(group):
    record = {"name": group.name, "interface": [], "nodes": [], "links": []}
    for s in group.interface.items_tree:
        if s.item_type == "SOCKET":
            record["interface"].append([s.name, s.identifier, s.in_out, s.socket_type])
    for n in group.nodes:
        record["nodes"].append([n.name, n.bl_idname, n.node_tree.name if n.type == "GROUP" else None])
    record["links"] = [[l.from_node.name, l.from_socket.identifier, l.to_node.name, l.to_socket.identifier] for l in group.links]
    record["structure_sha256"] = digest_bytes(json.dumps(record, ensure_ascii=False, sort_keys=True).encode())
    return record


def live_graph(bpy, coat, guide, group_ids, radii, rest, guide_points):
    count = len(group_ids)
    with bpy.data.libraries.load(str(ASSET), link=False) as (available, loaded):
        if any(name not in available.node_groups for name in OFFICIAL_GROUPS):
            raise RuntimeError("Required official hair assets are unavailable")
        loaded.node_groups = list(OFFICIAL_GROUPS)
    official = {g.name: g for g in loaded.node_groups}
    attribute(coat.data, "guide_curve_index", "INT", "CURVE", count + group_ids)
    attribute(coat.data, "is_guide", "BOOLEAN", "CURVE", np.zeros(count, dtype=bool))
    attribute(coat.data, "rest_position", "FLOAT_VECTOR", "POINT", rest)
    attribute(coat.data, "root_radius", "FLOAT", "CURVE", radii[:, 0])
    attribute(guide.data, "guide_curve_index", "INT", "CURVE", count + np.arange(len(guide_points), dtype=np.int32))
    attribute(guide.data, "is_guide", "BOOLEAN", "CURVE", np.ones(len(guide_points), dtype=bool))
    attribute(guide.data, "rest_position", "FLOAT_VECTOR", "POINT", guide_points)
    attribute(guide.data, "root_radius", "FLOAT", "CURVE", np.full(len(guide_points), .00032))

    tree = bpy.data.node_groups.new(TREE_NAME, "GeometryNodeTree")
    tree.is_modifier = True
    tree.interface.new_socket(name="Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    tree.interface.new_socket(name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    controls = {}
    settings = [("Guide Object", "NodeSocketObject", guide),
                ("Curl Factor", "NodeSocketFloat", .55), ("Curl Radius", "NodeSocketFloat", .002),
                ("Curl Frequency", "NodeSocketFloat", 1.2), ("Clump Factor", "NodeSocketFloat", .72),
                ("Clump Shape", "NodeSocketFloat", .35), ("Tip Spread", "NodeSocketFloat", .003),
                ("Profile Minimum", "NodeSocketFloat", .55), ("Profile Maximum", "NodeSocketFloat", 1.)]
    for name, typ, value in settings:
        socket = tree.interface.new_socket(name=name, in_out="INPUT", socket_type=typ)
        socket.default_value = value
        controls[name] = socket.identifier
    nodes, links = tree.nodes, tree.links
    inp, out = nodes.new("NodeGroupInput"), nodes.new("NodeGroupOutput")
    inp.location, out.location = (-900, 100), (1200, 100)
    info = nodes.new("GeometryNodeObjectInfo")
    info.name = "Live editable guide geometry"
    info.transform_space = "RELATIVE"
    info.inputs["As Instance"].default_value = False
    links.new(inp.outputs["Guide Object"], info.inputs["Object"])
    join = nodes.new("GeometryNodeJoinGeometry")
    join.name = "Coat first, guide curves second"
    links.new(info.outputs["Geometry"], join.inputs["Geometry"])
    # 5.2 multi-input links evaluate in reverse insertion order. Insert the
    # guide link first so coat indices remain 0..count-1 in joined Curves.
    links.new(inp.outputs["Geometry"], join.inputs["Geometry"])

    def named(name, typ):
        node = nodes.new("GeometryNodeInputNamedAttribute")
        node.data_type = typ
        node.inputs["Name"].default_value = name
        node.name = "Read " + name
        return node.outputs["Attribute"]

    guide_index = named("guide_curve_index", "INT")
    is_guide = named("is_guide", "BOOLEAN")
    rest_position = named("rest_position", "FLOAT_VECTOR")
    root_radius = named("root_radius", "FLOAT")
    current = join.outputs["Geometry"]
    instances = {}
    for number, name in enumerate(OFFICIAL_GROUPS):
        node = nodes.new("GeometryNodeGroup")
        node.node_tree = official[name]
        node.name = name
        node.label = "Official Blender 5.2.2 asset"
        node.location = (-350+number*280, 100)
        links.new(current, node.inputs[0])
        current = node.outputs[0]
        instances[name] = node
    curl = instances["Curl Hair Curves"]
    for exposed, target in [("Curl Factor", "Factor"), ("Curl Radius", "Radius"), ("Curl Frequency", "Frequency")]:
        links.new(inp.outputs[exposed], curl.inputs[target])
    for name, value in {"Subdivision": 0, "Curl Start": .15, "Factor Start": .7,
                        "Factor End": .7, "Random Offset": 0., "Seed": 0, "Existing Guide Map": True}.items():
        curl.inputs[name].default_value = value
    links.new(guide_index, curl.inputs["Guide Index"])
    links.new(is_guide, curl.inputs["Guide Mask"])
    clump = instances["Clump Hair Curves"]
    for exposed, target in [("Clump Factor", "Factor"), ("Clump Shape", "Shape"), ("Tip Spread", "Tip Spread")]:
        links.new(inp.outputs[exposed], clump.inputs[target])
    for name, value in {"Clump Offset": 0., "Distance Falloff": 0., "Distance Threshold": 0.,
                        "Seed": 0, "Preserve Length": True, "Existing Guide Map": True}.items():
        clump.inputs[name].default_value = value
    links.new(guide_index, clump.inputs["Guide Index"])
    links.new(is_guide, clump.inputs["Guide Mask"])
    restore = instances["Restore Curve Segment Length"]
    restore.inputs["Factor"].default_value = 1.
    restore.inputs["Selection"].default_value = True
    restore.inputs["Pin at Parameter"].default_value = 0.
    links.new(rest_position, restore.inputs["Reference Position"])
    profile = instances["Set Hair Curve Profile"]
    profile.inputs["Replace Radius"].default_value = True
    profile.inputs["Shape"].default_value = .35
    links.new(root_radius, profile.inputs["Radius"])
    links.new(inp.outputs["Profile Minimum"], profile.inputs["Factor Min"])
    links.new(inp.outputs["Profile Maximum"], profile.inputs["Factor Max"])
    delete = nodes.new("GeometryNodeDeleteGeometry")
    delete.name = "Remove temporary guide component from render output"
    delete.domain = "CURVE"
    links.new(current, delete.inputs["Geometry"])
    links.new(is_guide, delete.inputs["Selection"])
    spline = nodes.new("GeometryNodeCurveSplineType")
    spline.spline_type = "CATMULL_ROM"
    links.new(delete.outputs["Geometry"], spline.inputs["Curve"])
    parameter = nodes.new("GeometryNodeSplineParameter")
    compare = nodes.new("FunctionNodeCompare")
    compare.data_type, compare.operation = "FLOAT", "LESS_THAN"
    compare.inputs["B"].default_value = 1e-7
    links.new(parameter.outputs["Factor"], compare.inputs["A"])
    lock = nodes.new("GeometryNodeSetPosition")
    lock.name = "Exact frozen float32 root lock"
    links.new(spline.outputs["Curve"], lock.inputs["Geometry"])
    links.new(compare.outputs["Result"], lock.inputs["Selection"])
    links.new(rest_position, lock.inputs["Position"])
    links.new(lock.outputs["Geometry"], out.inputs["Geometry"])
    modifier = coat.modifiers.new(MODIFIER_NAME, "NODES")
    modifier.node_group = tree
    for name, _, value in settings:
        getattr(modifier.properties.inputs, controls[name]).value = value
    guide.hide_render = True
    # Keep Object Info evaluation available; hide only the guide's display.
    guide.hide_set(True)
    guide["role"] = "Live editable Object Info guide input; changes propagate to coat modifier"
    coat["live_groom"] = True
    return tree, modifier, official, controls


def evaluated_coat(bpy, coat):
    bpy.context.view_layer.update()
    data = coat.evaluated_get(bpy.context.evaluated_depsgraph_get()).data
    if data.bl_rna.identifier != "Curves":
        raise RuntimeError("GN output is not native Curves")
    count, points = len(data.curves), len(data.points)
    offsets = np.empty(count+1, dtype=np.int32)
    data.curve_offset_data.foreach_get("value", offsets)
    k = np.diff(offsets)
    if len(k) == 0 or not np.all(k == k[0]):
        raise RuntimeError("Expected nonempty uniform editable curve topology")
    positions = np.empty(points*3, dtype=np.float32)
    data.position_data.foreach_get("vector", positions)
    radius = np.empty(points, dtype=np.float32)
    data.attributes["radius"].data.foreach_get("value", radius)
    return positions.reshape(count, int(k[0]), 3), radius.reshape(count, int(k[0]))


def verify_live(bpy, coat, guide, original, rest):
    evaluated, radius = evaluated_coat(bpy, coat)
    if evaluated.shape != rest.shape:
        raise RuntimeError(f"Official graph changed count/topology: {evaluated.shape} vs {rest.shape}")
    finite = bool(np.all(np.isfinite(evaluated)) and np.all(np.isfinite(radius)))
    root_bits = bool(np.array_equal(evaluated[:, 0].view(np.uint32), original[:, 0].view(np.uint32)))
    if not finite or not root_bits or np.any(radius <= 0):
        raise RuntimeError("Evaluated finite/radius/exact-root check failed")
    deformation = np.linalg.norm(evaluated-rest, axis=-1)
    if float(deformation.max()) < 1e-6:
        raise RuntimeError("Official GN chain did not change evaluation")
    original_guides = np.empty(len(guide.data.points)*3, dtype=np.float32)
    guide.data.position_data.foreach_get("vector", original_guides)
    perturbed = original_guides.copy()
    perturbed.reshape(-1, rest.shape[1], 3)[0, 5, 0] += .002
    try:
        guide.data.position_data.foreach_set("vector", perturbed)
        guide.data.update_tag()
        guide.update_tag(refresh={"DATA"})
        changed, _ = evaluated_coat(bpy, coat)
    finally:
        guide.data.position_data.foreach_set("vector", original_guides)
        guide.data.update_tag()
        guide.update_tag(refresh={"DATA"})
    restored, _ = evaluated_coat(bpy, coat)
    displacement = np.linalg.norm(changed-evaluated, axis=-1)
    live_change = float(displacement.max())
    restored_equal = bool(np.array_equal(restored.view(np.uint32), evaluated.view(np.uint32)))
    changed_root_bits = bool(np.array_equal(changed[:, 0].view(np.uint32), original[:, 0].view(np.uint32)))
    if live_change < 1e-7 or not restored_equal or not changed_root_bits:
        raise RuntimeError(f"Live guide dependency probe failed: {live_change}, restore={restored_equal}, roots={changed_root_bits}")
    baseline_lengths = catmull_rom_lengths(original)
    evaluated_lengths = catmull_rom_lengths(evaluated)
    input_lengths = catmull_rom_lengths(rest)
    return {"native_component": "Curves", "curve_count": len(evaluated), "points_per_curve": evaluated.shape[1],
            "finite": finite, "root_bits_equal_frozen_v3": root_bits, "root_error_max": float(np.abs(evaluated[:, 0]-original[:, 0]).max()),
            "input_positions_float32_sha256": array_digest(rest), "evaluated_positions_float32_sha256": array_digest(evaluated),
            "deformation_from_input": summarize(deformation), "radius_root": summarize(radius[:, 0]),
            "radius_tip": summarize(radius[:, -1]), "tip_to_root_radius_ratio": summarize(radius[:, -1]/radius[:, 0]),
            "arc_length": {"basis": "Uniform Catmull-Rom, duplicate endpoint controls, float32 controls promoted to float64",
                           "quadrature_order": 32, "frozen_v3": summarize(baseline_lengths), "input_rest": summarize(input_lengths),
                           "evaluated": summarize(evaluated_lengths), "relative_change_from_v3": summarize((evaluated_lengths-baseline_lengths)/baseline_lengths),
                           "absolute_relative_change_from_rest": summarize(np.abs((evaluated_lengths-input_lengths)/input_lengths)),
                           "constraint_scope": "Official Restore constrains control-segment lengths; Catmull-Rom arc drift is measured, not normalized"},
            "live_guide_probe": {"guide_index": 0, "control_index": 5, "delta_x": .002,
                                 "maximum_coat_displacement": live_change, "changed_curve_count": int(np.count_nonzero(displacement.max(axis=1)>1e-8)),
                                 "roots_still_exact": changed_root_bits, "restored_evaluation_bitwise_equal": restored_equal}}


def main():
    options = cli()
    stem = "swatch-reference-" + options.tag
    suffixes = (".blend", ".png", ".json", ".source.py", ".gn-source.py", ".gn-report.json")
    for suffix in suffixes:
        if (OUT / (stem+suffix)).exists():
            raise FileExistsError(f"Output exists: {stem+suffix}; use a new tag")
    source = Path(__file__).read_bytes()
    library_hash = digest_bytes(ASSET.read_bytes())
    base = load_baseline()
    import bpy
    state = {"noncoat": {}}
    original_native = base.native_curves

    def intercept(name, points, radii, mat):
        original = np.asarray(points, dtype=np.float32)
        if name != "Blue pile · coat":
            state["noncoat"][name] = {"positions_float32_sha256": array_digest(original), "radii_float32_sha256": array_digest(np.asarray(radii, dtype=np.float32))}
            return original_native(name, points, radii, mat)
        rest, guide_points, ids, lengths, budget, prototypes = make_guides(base, original)
        coat = original_native(name, rest, radii, mat)
        guide = original_native(GUIDE_NAME, guide_points, np.full(guide_points.shape[:2], .00032), mat)
        tree, modifier, official, controls = live_graph(bpy, coat, guide, ids, radii, rest, guide_points)
        evaluated = verify_live(bpy, coat, guide, original, rest)
        state["coat"] = evaluated
        state["guides"] = {"object": guide.name, "curve_count": len(guide_points), "points_per_curve": guide_points.shape[1],
                           "authored_archetypes": 3, "prototype_assignment": "group_index modulo 3",
                           "prototype_ids_sha256": array_digest(prototypes.astype(np.int32)),
                           "positions_float32_sha256": array_digest(guide_points), "guide_curve_index_offset": len(original),
                           "geometry_budget": ".70 times frozen v3 measured Catmull-Rom arc length; per-group guide uses member mean",
                           "input_budget": summarize(budget), "guide_arc_length": summarize(catmull_rom_lengths(guide_points)),
                           "attachment_scope": "Fixed frozen roots in object coordinates; no surface UV attachment or deformation binding claimed"}
        state["graph"] = {"modifier": modifier.name, "node_group": tree.name, "guide_object": guide.name,
                          "nodes": [n.name for n in tree.nodes], "official_groups": {name: structural_record(g) for name, g in official.items()},
                          "modifier_inputs": {name: {"identifier": identifier, "value": guide.name if name == "Guide Object" else float(getattr(modifier.properties.inputs, identifier).value)} for name, identifier in controls.items()},
                          "official_inputs": {name: {s.name: ("linked" if s.is_linked else list(s.default_value) if hasattr(s.default_value, "__len__") and not isinstance(s.default_value, str) else s.default_value)
                                                      for s in n.inputs if hasattr(s, "default_value") and s.type != "GEOMETRY"} for name, n in [(name, tree.nodes[name]) for name in OFFICIAL_GROUPS]},
                          "guide_index_scope": "Explicit combined geometry curve indices; coat first and appended Object Info guides second; final guide curves deleted"}
        coat["study_report"] = stem + ".gn-report.json"
        return coat

    base.native_curves = intercept
    base.args = lambda: argparse.Namespace(kind="swatch", variant="reference", resolution=options.resolution,
                                           samples=options.samples, density=1., angle=0., tag=options.tag, no_render=options.no_render)
    with (OUT / (stem+".gn-source.py")).open("xb") as snapshot:
        snapshot.write(source)
    base.main()
    if digest_bytes(ASSET.read_bytes()) != library_hash:
        raise RuntimeError("Official library bytes changed during generation")
    report = {"status": "engineering_precheck_passed", "rendered": not options.no_render,
              "study_scope": "One multi-change method candidate: open authored guides + official live nodes + shorter lengths + fuller tip profile; not controlled A/B or paper/Houdini reproduction",
              "baseline_source": str(BASELINE), "baseline_source_sha256": BASELINE_SHA256,
              "baseline_snapshot": stem+".source.py", "wrapper_source_snapshot": stem+".gn-source.py",
              "wrapper_source_sha256": digest_bytes(source), "official_asset_library": str(ASSET), "official_asset_sha256": library_hash,
              "blender": bpy.app.version_string, "blend": stem+".blend", "png": stem+".png",
              "fixed": ["frozen v3 coat roots and group assignment", "strand counts", "base RNG samples", "undercoat/flyaway geometry", "material and color", "camera and lights", "Cycles settings"],
              **state}
    with (OUT / (stem+".gn-report.json")).open("x", encoding="utf-8") as output:
        json.dump(report, output, ensure_ascii=False, indent=2)
    print("PLUSH_HAIR_NODES_RESULT", json.dumps({"report": stem+".gn-report.json", "blend": stem+".blend", "rendered": report["rendered"],
                                                "count": state["coat"]["curve_count"], "live_guide_probe": state["coat"]["live_guide_probe"],
                                                "radius_tip": state["coat"]["radius_tip"], "arc_length": state["coat"]["arc_length"]}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
