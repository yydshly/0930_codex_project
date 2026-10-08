"""Live Geometry Nodes pile candidates and a controlled guide-mapping study.

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
GN2_CONTROL = "swatch-reference-gn-pile-open-render-2"
PRESETS = {
    "gn1": {"guide_shape": "shallow open crowns", "normalize_member_normal": False,
            "curl_factor": .55, "curl_radius": .002, "curl_frequency": 1.2,
            "clump_factor": .72, "clump_shape": .35, "tip_spread": .003},
    "gn2": {"guide_shape": "open C/C/S", "normalize_member_normal": True,
            "curl_factor": .70, "curl_radius": .006, "curl_frequency": .85,
            "clump_factor": .88, "clump_shape": .20, "tip_spread": .003},
    "gn3": {"guide_shape": "open C/C/S", "normalize_member_normal": True,
            "curl_factor": .70, "curl_radius": .006, "curl_frequency": .85,
            "clump_factor": .88, "clump_shape": .20, "tip_spread": .003},
}


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
    parser.add_argument("--preset", choices=list(PRESETS), default="gn1")
    parser.add_argument("--tag")
    parser.add_argument("--resolution", type=int, default=768)
    parser.add_argument("--samples", type=int, default=96)
    parser.add_argument("--no-render", action="store_true")
    options = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    options.tag = options.tag or {"gn1": "gn-pile-1", "gn2": "gn-pile-open-2", "gn3": "gn-nearest-3"}[options.preset]
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


def geometry_metrics(points):
    """Control-polygon turning is a shape proxy, not spline curvature integral."""
    segments = np.diff(points.astype(np.float64), axis=1)
    lengths = np.linalg.norm(segments, axis=-1)
    unit = segments / np.maximum(lengths[..., None], 1e-15)
    turning = np.degrees(np.arccos(np.clip(np.sum(unit[:, :-1]*unit[:, 1:], axis=-1), -1, 1))).sum(axis=1)
    arcs = catmull_rom_lengths(points)
    return {"control_polygon_total_turn_degrees": summarize(turning),
            "chord_to_arc_ratio": summarize(np.linalg.norm(points[:, -1]-points[:, 0], axis=-1)/arcs),
            "arc_length": summarize(arcs), "scope": "Geometric shape measurements on float32 evaluated controls; not a physical solve"}


def nearest_guide_ids(roots, guide_roots):
    """Saved float32 object-space surface roots; Euclidean, not geodesic/UV.

    KDTree uses no N-by-G matrix. Two nearest candidates are compared again
    in float64. Near-ties expand a tiny search range, with lowest guide id as
    the tie breaker, to avoid depending on KDTree traversal order.
    """
    from mathutils.kdtree import KDTree
    points = np.asarray(roots, dtype=np.float32).astype(np.float64)
    guides = np.asarray(guide_roots, dtype=np.float32).astype(np.float64)
    tree = KDTree(len(guides))
    for index, point in enumerate(guides):
        tree.insert(point, index)
    tree.balance()
    result = np.empty(len(points), dtype=np.int32)
    for index, point in enumerate(points):
        candidates = tree.find_n(point, min(2, len(guides)))
        indices = [item[1] for item in candidates]
        distances = [float(np.sum((point-guides[i])**2)) for i in indices]
        if len(indices) > 1 and abs(distances[0]-distances[1]) < 1e-12:
            radius = max(item[2] for item in candidates) + 2e-7
            indices = [item[1] for item in tree.find_range(point, radius)]
        result[index] = min(indices, key=lambda i: (float(np.sum((point-guides[i])**2)), i))
    return result


def assignment_record(roots, guides, authored_ids, actual_ids, budget, preset):
    n, g = len(roots), len(guides)
    root64, guide64 = roots.astype(np.float64), guides[:, 0].astype(np.float64)
    old = np.linalg.norm(root64-guide64[authored_ids], axis=-1)
    new = np.linalg.norm(root64-guide64[actual_ids], axis=-1)
    counts = np.bincount(actual_ids, minlength=g)
    child_budget = np.divide(np.bincount(actual_ids, weights=budget, minlength=g), counts,
                             out=np.zeros(g, dtype=np.float64), where=counts>0)
    return {"mode": "surface_nearest" if preset == "gn3" else "authored_wide_groups",
            "metric": "3D Euclidean distance between saved float32 coat surface roots and guide surface roots, arithmetic checked in float64",
            "coordinate_definition": "Both native objects have identity transforms; object coordinates equal scene coordinates. Not geodesic distance or UV distance.",
            "tie_breaker": "Lowest guide id among equal float64 squared distances",
            "persistent_attribute": "pile_guide_index", "guide_index_offset": n, "guide_count": g,
            "mapping_int32_sha256": array_digest((n+actual_ids).astype(np.int32)),
            "local_guide_ids_int32_sha256": array_digest(actual_ids.astype(np.int32)),
            "changed_assignment_count": int(np.count_nonzero(actual_ids != authored_ids)),
            "original_root_distance": {**summarize(old), "rms": float(np.sqrt(np.mean(old*old)))},
            "new_root_distance": {**summarize(new), "rms": float(np.sqrt(np.mean(new*new)))},
            "child_counts": counts.tolist(), "child_count_summary": summarize(counts),
            "zero_child_count": int(np.count_nonzero(counts == 0)), "empty_guide_indices": np.flatnonzero(counts == 0).tolist(),
            "new_member_mean_budget_nonempty": summarize(child_budget[counts>0]),
            "guide_budget_scope": "Guide positions and length budgets remain authored from the original 32-member groups, even for empty guides. New membership mean lengths are diagnostic only and never reshape guides.",
            "control_asset": GN2_CONTROL if preset == "gn3" else None}


def make_guides(base, original, preset="gn1"):
    count, k, _ = original.shape
    roots, normals, gp, gn, lean, side = replay_frames(base, count)
    if not np.array_equal(roots.astype(np.float32).view(np.uint32), original[:, 0].view(np.uint32)):
        raise RuntimeError("Frozen coat root replay failed")
    baseline_lengths = catmull_rom_lengths(original)
    budget = .70 * baseline_lengths
    normal_lengths = np.linalg.norm(normals, axis=-1)
    if PRESETS[preset]["normalize_member_normal"]:
        if np.any(normal_lengths <= 0) or not np.all(np.isfinite(normal_lengths)):
            raise RuntimeError("Cannot normalize invalid frozen frame normals")
        normals = normals / normal_lengths[:, None]
    group_ids = np.arange(count, dtype=np.int32) // MEMBERS
    group_budget = np.bincount(group_ids, weights=budget) / np.bincount(group_ids)
    t = np.linspace(0, 1, k)[None, :]
    prototypes = np.arange(len(gp)) % 3
    # Three open, bent crowns. None is the original independent one-turn helix.
    if preset == "gn1":
        x = np.where(prototypes[:, None] == 0, .007*(1-np.cos(1.05*math.pi*t)),
                     np.where(prototypes[:, None] == 1, .006*np.sin(1.2*math.pi*t), .004*np.sin(2*math.pi*t)))
        y = np.where(prototypes[:, None] == 0, .012*t,
                     np.where(prototypes[:, None] == 1, .017*t, .014*t+.003*np.sin(math.pi*t)))
        z = np.where(prototypes[:, None] == 0, .019*np.sin(.70*math.pi*t),
                     np.where(prototypes[:, None] == 1, .021*np.sin(.72*math.pi*t), .020*np.sin(.62*math.pi*t)))
        formulas = ["x=.007*(1-cos(1.05*pi*t));y=.012*t;z=.019*sin(.70*pi*t)",
                    "x=.006*sin(1.2*pi*t);y=.017*t;z=.021*sin(.72*pi*t)",
                    "x=.004*sin(2*pi*t);y=.014*t+.003*sin(pi*t);z=.020*sin(.62*pi*t)"]
    else:
        # Two open C bends and one lateral S. The rising term keeps the C
        # return above the root plane instead of forming a closed flat ring.
        x = np.where(prototypes[:, None] == 0, .011*(1-np.cos(1.25*math.pi*t)),
                     np.where(prototypes[:, None] == 1, -.004*np.sin(math.pi*t), .008*np.sin(2*math.pi*t)))
        y = np.where(prototypes[:, None] == 0, .005*t+.003*np.sin(math.pi*t),
                     np.where(prototypes[:, None] == 1, .011*(1-np.cos(1.10*math.pi*t)), .007*t))
        z = np.where(prototypes[:, None] == 0, .011*np.sin(1.25*math.pi*t)+.014*t,
                     np.where(prototypes[:, None] == 1, .014*np.sin(1.10*math.pi*t)+.014*t, .024*t+.003*np.sin(math.pi*t)))
        formulas = ["x=.011*(1-cos(1.25*pi*t));y=.005*t+.003*sin(pi*t);z=.011*sin(1.25*pi*t)+.014*t",
                    "x=-.004*sin(pi*t);y=.011*(1-cos(1.10*pi*t));z=.014*sin(1.10*pi*t)+.014*t",
                    "x=.008*sin(2*pi*t);y=.007*t;z=.024*t+.003*sin(pi*t)"]
    guides = gp[:, None] + side[:, None]*x[..., None] + lean[:, None]*y[..., None] + gn[:, None]*z[..., None]
    guide_lengths = catmull_rom_lengths(guides.astype(np.float32))
    guides = (gp[:, None] + (guides-gp[:, None])*(group_budget/guide_lengths)[:, None, None]).astype(np.float32)
    guides[:, 0] = gp.astype(np.float32)
    rest = (roots[:, None] + normals[:, None]*budget[:, None, None]*t[..., None]).astype(np.float32)
    rest[:, 0] = original[:, 0]
    measured_rest = catmull_rom_lengths(rest)
    normal_report = {"unitized": PRESETS[preset]["normalize_member_normal"],
                     "frozen_normal_norm": summarize(normal_lengths),
                     "norm_below_0_999_count": int(np.count_nonzero(normal_lengths < .999)),
                     "budget_formula": ".70 * measured frozen v3 Catmull-Rom arc length",
                     "measured_rest_relative_error_to_budget": summarize(np.abs(measured_rest/budget-1)),
                     "prototype_formula_local_axes": {"x": "side", "y": "lean", "z": "surface normal"},
                     "prototype_formulas_before_arc_scaling": formulas}
    if PRESETS[preset]["normalize_member_normal"] and np.max(np.abs(measured_rest/budget-1)) > 1e-4:
        raise RuntimeError("GN2 normalized rest geometry failed .70 length-budget tolerance")
    actual_ids = nearest_guide_ids(original[:, 0], guides[:, 0]) if preset == "gn3" else group_ids
    mapping = assignment_record(original[:, 0], guides, group_ids, actual_ids, budget, preset)
    return rest, guides, actual_ids, baseline_lengths, budget, prototypes, normal_report, mapping


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


def live_graph(bpy, coat, guide, group_ids, radii, rest, guide_points, preset="gn1"):
    count = len(group_ids)
    with bpy.data.libraries.load(str(ASSET), link=False) as (available, loaded):
        if any(name not in available.node_groups for name in OFFICIAL_GROUPS):
            raise RuntimeError("Required official hair assets are unavailable")
        loaded.node_groups = list(OFFICIAL_GROUPS)
    official = {g.name: g for g in loaded.node_groups}
    attribute(coat.data, "guide_curve_index", "INT", "CURVE", count + group_ids)
    # Official assets rewrite guide_curve_index. A distinct persistent field
    # avoids lazy field evaluation reading that rewritten map downstream.
    attribute(coat.data, "pile_guide_index", "INT", "CURVE", count + group_ids)
    attribute(coat.data, "is_guide", "BOOLEAN", "CURVE", np.zeros(count, dtype=bool))
    attribute(coat.data, "rest_position", "FLOAT_VECTOR", "POINT", rest)
    attribute(coat.data, "root_radius", "FLOAT", "CURVE", radii[:, 0])
    attribute(guide.data, "guide_curve_index", "INT", "CURVE", count + np.arange(len(guide_points), dtype=np.int32))
    attribute(guide.data, "pile_guide_index", "INT", "CURVE", count + np.arange(len(guide_points), dtype=np.int32))
    attribute(guide.data, "is_guide", "BOOLEAN", "CURVE", np.ones(len(guide_points), dtype=bool))
    attribute(guide.data, "rest_position", "FLOAT_VECTOR", "POINT", guide_points)
    attribute(guide.data, "root_radius", "FLOAT", "CURVE", np.full(len(guide_points), .00032))

    tree = bpy.data.node_groups.new(TREE_NAME, "GeometryNodeTree")
    tree.is_modifier = True
    tree.interface.new_socket(name="Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    tree.interface.new_socket(name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    controls = {}
    parameters = PRESETS[preset]
    settings = [("Guide Object", "NodeSocketObject", guide),
                ("Curl Factor", "NodeSocketFloat", parameters["curl_factor"]), ("Curl Radius", "NodeSocketFloat", parameters["curl_radius"]),
                ("Curl Frequency", "NodeSocketFloat", parameters["curl_frequency"]), ("Clump Factor", "NodeSocketFloat", parameters["clump_factor"]),
                ("Clump Shape", "NodeSocketFloat", parameters["clump_shape"]), ("Tip Spread", "NodeSocketFloat", parameters["tip_spread"]),
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

    guide_index = named("pile_guide_index", "INT")
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


def curve_arrays(data):
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


def evaluated_coat(bpy, coat):
    bpy.context.view_layer.update()
    return curve_arrays(coat.evaluated_get(bpy.context.evaluated_depsgraph_get()).data)


def gn2_native_reference(bpy):
    """Read native controls/radii from the saved GN2 control without saving it.

    This executes before base.setup_scene's factory reset, so appended data and
    dependent materials never leak into the new output scene.
    """
    path = OUT / (GN2_CONTROL + ".blend")
    before = digest_bytes(path.read_bytes())
    names = ["Blue pile · coat data", GUIDE_NAME+" data", "Blue pile · undercoat data", "Blue pile · flyaway data"]
    with bpy.data.libraries.load(str(path), link=False) as (available, loaded):
        if any(name not in available.hair_curves for name in names):
            raise RuntimeError("Saved GN2 native reference data are unavailable")
        loaded.hair_curves = list(names)
    result = {}
    for name, data in zip(names, loaded.hair_curves):
        positions, radii = curve_arrays(data)
        result[name] = {"positions_float32_sha256": array_digest(positions), "radii_float32_sha256": array_digest(radii)}
    if digest_bytes(path.read_bytes()) != before:
        raise RuntimeError("Saved GN2 control bytes changed during the read")
    return {"control_asset": GN2_CONTROL, "source_blend_sha256": before, "native_arrays": result}


def verify_join(bpy, coat, guide, original):
    """Measure actual joined domain/order, rather than assuming link ordering."""
    tree = coat.modifiers[MODIFIER_NAME].node_group
    output = tree.nodes.get("Group Output").inputs["Geometry"]
    final_socket = output.links[0].from_socket
    try:
        tree.links.new(tree.nodes["Coat first, guide curves second"].outputs["Geometry"], output)
        coat.update_tag(refresh={"DATA"})
        joined, _ = evaluated_coat(bpy, coat)
        data = coat.evaluated_get(bpy.context.evaluated_depsgraph_get()).data
        is_guide = np.empty(len(joined), dtype=bool)
        indices = np.empty(len(joined), dtype=np.int32)
        data.attributes["is_guide"].data.foreach_get("value", is_guide)
        data.attributes["pile_guide_index"].data.foreach_get("value", indices)
        count, guides = len(original), len(guide.data.curves)
        if (len(joined) != count+guides or np.any(is_guide[:count]) or not np.all(is_guide[count:])
                or not np.array_equal(joined[:count, 0].view(np.uint32), original[:, 0].view(np.uint32))
                or np.any(indices < count) or np.any(indices >= count+guides)):
            raise RuntimeError("Actual joined guide order/index range assertion failed")
        return {"measured": True, "total_curves": len(joined), "coat_first_count": count,
                "first_guide_curve_index": int(np.flatnonzero(is_guide)[0]), "guide_count": guides,
                "explicit_index_minimum": int(indices.min()), "explicit_index_maximum": int(indices.max()),
                "coat_root_bits_equal": True, "persistent_field": "pile_guide_index",
                "official_mutable_field": "guide_curve_index"}
    finally:
        tree.links.new(final_socket, output)
        coat.update_tag(refresh={"DATA"})
        bpy.context.view_layer.update()


def verify_live(bpy, coat, guide, original, rest, actual_ids):
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
    counts = np.bincount(actual_ids, minlength=len(guide.data.curves))
    probe_guide = int(np.flatnonzero(counts>0)[0])
    child_mask = actual_ids == probe_guide
    perturbed.reshape(-1, rest.shape[1], 3)[probe_guide, 5, 0] += .002
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
    nonmapped_equal = bool(np.array_equal(changed[~child_mask].view(np.uint32), evaluated[~child_mask].view(np.uint32)))
    if live_change < 1e-7 or not restored_equal or not changed_root_bits or not nonmapped_equal:
        raise RuntimeError(f"Live guide dependency probe failed: {live_change}, restore={restored_equal}, roots={changed_root_bits}")
    baseline_lengths = catmull_rom_lengths(original)
    evaluated_lengths = catmull_rom_lengths(evaluated)
    input_lengths = catmull_rom_lengths(rest)
    return {"native_component": "Curves", "curve_count": len(evaluated), "points_per_curve": evaluated.shape[1],
            "finite": finite, "root_bits_equal_frozen_v3": root_bits, "root_error_max": float(np.abs(evaluated[:, 0]-original[:, 0]).max()),
            "input_positions_float32_sha256": array_digest(rest), "evaluated_positions_float32_sha256": array_digest(evaluated),
            "deformation_from_input": summarize(deformation), "radius_root": summarize(radius[:, 0]),
            "evaluated_shape": geometry_metrics(evaluated),
            "radius_tip": summarize(radius[:, -1]), "tip_to_root_radius_ratio": summarize(radius[:, -1]/radius[:, 0]),
            "arc_length": {"basis": "Uniform Catmull-Rom, duplicate endpoint controls, float32 controls promoted to float64",
                           "quadrature_order": 32, "frozen_v3": summarize(baseline_lengths), "input_rest": summarize(input_lengths),
                           "evaluated": summarize(evaluated_lengths), "relative_change_from_v3": summarize((evaluated_lengths-baseline_lengths)/baseline_lengths),
                           "absolute_relative_change_from_rest": summarize(np.abs((evaluated_lengths-input_lengths)/input_lengths)),
                           "constraint_scope": "Official Restore constrains control-segment lengths; Catmull-Rom arc drift is measured, not normalized"},
            "live_guide_probe": {"guide_index": probe_guide, "control_index": 5, "delta_x": .002,
                                 "expected_child_curve_indices": np.flatnonzero(child_mask).tolist(),
                                 "expected_child_curve_count": int(counts[probe_guide]), "nonmapped_evaluation_bitwise_equal": nonmapped_equal,
                                 "maximum_coat_displacement": live_change, "changed_curve_count": int(np.count_nonzero(displacement.max(axis=1)>1e-8)),
                                 "roots_still_exact": changed_root_bits, "restored_evaluation_bitwise_equal": restored_equal}}


def measure_evaluated_guides(bpy, coat, guide, guide_points):
    """Read actual live target shape after Curl/Clump/Restore, before deletion."""
    tree = coat.modifiers[MODIFIER_NAME].node_group
    output = tree.nodes.get("Group Output").inputs["Geometry"]
    final_socket = output.links[0].from_socket
    try:
        tree.links.new(tree.nodes["Restore Curve Segment Length"].outputs[0], output)
        coat.update_tag(refresh={"DATA"})
        positions, _ = evaluated_coat(bpy, coat)
        targets = positions[-len(guide_points):].copy()
        if not np.all(np.isfinite(targets)):
            raise RuntimeError("Nonfinite live evaluated guide targets")
        return {"stage": "After official Curl + Clump + Restore, before guide deletion",
                "positions_float32_sha256": array_digest(targets), "shape": geometry_metrics(targets),
                "root_error_max": float(np.abs(targets[:, 0]-guide_points[:, 0]).max()),
                "first_three_target_controls": targets[:3].tolist()}
    finally:
        tree.links.new(final_socket, output)
        coat.update_tag(refresh={"DATA"})
        bpy.context.view_layer.update()


def ellipsoid_height(points):
    axes = np.array([.64, .43, .54], dtype=np.float64)
    values = np.asarray(points, dtype=np.float64)
    implicit = np.sum((values/axes)**2, axis=-1)-1
    gradient = 2*np.linalg.norm(values/(axes*axes), axis=-1)
    return implicit/np.maximum(gradient, 1e-12)


def sampled_height(points, thresholds=None):
    """Same eight-point per-segment measurement as the saved read-only study."""
    nodes, weights = np.polynomial.legendre.leggauss(8)
    nodes, weights = (nodes+1)*.5, weights*.5
    n, k, _ = points.shape
    peaks, minima, arcs, below, deep = [np.empty(n, dtype=np.float64) for _ in range(5)]
    exposed = np.empty(n, dtype=np.float64) if thresholds is not None else None
    for first in range(0, n, 1024):
        last = min(first+1024, n)
        v = points[first:last].astype(np.float64)
        extended = np.concatenate((v[:, :1], v, v[:, -1:]), axis=1)
        a, b, c, d = [extended[:, j:j+k-1] for j in range(4)]
        d0, d1, d2 = .5*(-a+c), 2*a-5*b+4*c-d, 1.5*(-a+3*b-3*c+d)
        hmax, hmin = ellipsoid_height(v).max(axis=1), ellipsoid_height(v).min(axis=1)
        length, negative, penetrated, above = [np.zeros(last-first) for _ in range(4)]
        for t, w in zip(nodes, weights):
            position = b+t*d0+.5*t*t*d1+(t**3/3)*d2
            height = ellipsoid_height(position)
            ds = w*np.linalg.norm(d0+t*d1+t*t*d2, axis=-1)
            hmax, hmin = np.maximum(hmax, height.max(axis=1)), np.minimum(hmin, height.min(axis=1))
            length += ds.sum(axis=1)
            negative += (ds*(height < -5e-6)).sum(axis=1)
            penetrated += (ds*(height < -.001)).sum(axis=1)
            if thresholds is not None:
                above += (ds*(height > thresholds[first:last, None])).sum(axis=1)
        peaks[first:last], minima[first:last], arcs[first:last] = hmax, hmin, length
        below[first:last], deep[first:last] = negative/length, penetrated/length
        if thresholds is not None:
            exposed[first:last] = above/length
    return peaks, minima, arcs, below, deep, exposed


def height_profile_diagnostic(bpy):
    """Geometric layer ordering, not an opacity or image-occlusion estimate."""
    coat, _ = evaluated_coat(bpy, bpy.data.objects["Blue pile · coat"])
    undercoat, _ = curve_arrays(bpy.data.objects["Blue pile · undercoat"].data)
    uc_peak, _, _, _, _, _ = sampled_height(undercoat)
    global95 = float(np.percentile(uc_peak, 95))
    axes = np.array([.64, .43, .54], dtype=np.float64)

    def root_cells(roots):
        scaled = roots/axes
        scaled /= np.linalg.norm(scaled, axis=-1, keepdims=True)
        theta = np.arccos(np.clip(-scaled[:, 1], -1, 1))
        angle = np.mod(np.arctan2(scaled[:, 2], scaled[:, 0]), 2*math.pi)
        return np.minimum((theta/math.pi*32).astype(int), 31)*64+np.minimum((angle/(2*math.pi)*64).astype(int), 63)

    cells = root_cells(undercoat[:, 0])
    counts = np.bincount(cells, minlength=2048)
    envelope = np.full(2048, global95)
    for cell in np.flatnonzero(counts >= 5):
        envelope[cell] = np.percentile(uc_peak[cells == cell], 95)
    threshold = envelope[root_cells(coat[:, 0])]
    peak, minimum, arc, below, deep, exposure = sampled_height(coat, threshold)
    normals = coat[:, 0].astype(np.float64)/(axes*axes)
    normals /= np.linalg.norm(normals, axis=-1, keepdims=True)
    view = np.asarray(bpy.context.scene.camera.matrix_world.col[2].xyz)
    front = np.sum(normals*view, axis=-1) > .2
    return {"scope": "Signed analytic ellipsoid implicit/gradient height approximation; eight Gauss-Legendre samples per Catmull-Rom segment. Local UC P95 is a geometric envelope, not opaque coverage or pixel occlusion. Arc fractions are averaged per curve.",
            "ellipsoid_half_axes": axes.tolist(), "front_normal_dot_camera_threshold": .2,
            "undercoat_positions_float32_sha256": array_digest(undercoat),
            "undercoat_crown_height": summarize(uc_peak), "undercoat_global_crown_p95": global95,
            "coat_crown_height_all": summarize(peak), "coat_crown_height_front": summarize(peak[front]),
            "coat_minimum_height": summarize(minimum), "inside_surface_arc_fraction_mean": float(below.mean()),
            "arc_fraction_below_minus_0_001_mean": float(deep.mean()),
            "curves_below_minus_0_001_fraction": float(np.mean(minimum < -.001)),
            "front_mean_arc_fraction_above_undercoat_local_p95": float(exposure[front].mean()),
            "front_crowns_below_undercoat_local_p95_fraction": float(np.mean(peak[front] <= threshold[front])),
            "evaluated_positions_float32_sha256": array_digest(coat), "arc_length_order8": summarize(arc)}


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
    gn2_reference = gn2_native_reference(bpy) if options.preset == "gn3" else None
    if gn2_reference is not None:
        state["gn2_native_control_reference"] = gn2_reference
    original_native = base.native_curves

    def intercept(name, points, radii, mat):
        original = np.asarray(points, dtype=np.float32)
        if name != "Blue pile · coat":
            state["noncoat"][name] = {"positions_float32_sha256": array_digest(original), "radii_float32_sha256": array_digest(np.asarray(radii, dtype=np.float32))}
            if gn2_reference is not None and state["noncoat"][name] != gn2_reference["native_arrays"][name+" data"]:
                raise RuntimeError("Noncoat positions or radii changed versus saved GN2")
            return original_native(name, points, radii, mat)
        rest, guide_points, ids, lengths, budget, prototypes, frame_report, mapping = make_guides(base, original, options.preset)
        coat = original_native(name, rest, radii, mat)
        guide = original_native(GUIDE_NAME, guide_points, np.full(guide_points.shape[:2], .00032), mat)
        if gn2_reference is not None:
            comparison = {}
            for control_name, obj in [(name+" data", coat), (GUIDE_NAME+" data", guide)]:
                p, r = curve_arrays(obj.data)
                actual = {"positions_float32_sha256": array_digest(p), "radii_float32_sha256": array_digest(r)}
                if actual != gn2_reference["native_arrays"][control_name]:
                    raise RuntimeError("GN3 changed native rest/guide positions or radii versus saved GN2")
                comparison[control_name] = {"bitwise_equal_saved_gn2": True, **actual}
            state["gn2_fixed_native_check"] = comparison
        state["guide_assignment"] = mapping
        tree, modifier, official, controls = live_graph(bpy, coat, guide, ids, radii, rest, guide_points, options.preset)
        joined_order = verify_join(bpy, coat, guide, original)
        evaluated = verify_live(bpy, coat, guide, original, rest, ids)
        state["coat"] = evaluated
        state["guides"] = {"object": guide.name, "curve_count": len(guide_points), "points_per_curve": guide_points.shape[1],
                           "authored_archetypes": 3, "prototype_assignment": "group_index modulo 3",
                           "prototype_ids_sha256": array_digest(prototypes.astype(np.int32)),
                           "positions_float32_sha256": array_digest(guide_points), "guide_curve_index_offset": len(original),
                           "geometry_budget": ".70 times frozen v3 measured Catmull-Rom arc length; per-guide budget uses original authored 32-member mean, not nearest membership mean",
                           "input_budget": summarize(budget), "guide_arc_length": summarize(catmull_rom_lengths(guide_points)),
                           "input_shape": geometry_metrics(guide_points), "normal_and_budget_check": frame_report,
                           "evaluated_target_shape": measure_evaluated_guides(bpy, coat, guide, guide_points),
                           "attachment_scope": "Fixed frozen roots in object coordinates; no surface UV attachment or deformation binding claimed"}
        state["graph"] = {"modifier": modifier.name, "node_group": tree.name, "guide_object": guide.name,
                          "nodes": [n.name for n in tree.nodes], "official_groups": {name: structural_record(g) for name, g in official.items()},
                          "modifier_inputs": {name: {"identifier": identifier, "value": guide.name if name == "Guide Object" else float(getattr(modifier.properties.inputs, identifier).value)} for name, identifier in controls.items()},
                          "joined_order_check": joined_order,
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
    if options.preset == "gn3":
        state["height_profile_diagnostic"] = height_profile_diagnostic(bpy)
    if digest_bytes(ASSET.read_bytes()) != library_hash:
        raise RuntimeError("Official library bytes changed during generation")
    clump_shape = PRESETS[options.preset]["clump_shape"]
    report = {"status": "engineering_precheck_passed", "rendered": not options.no_render,
              "candidate_preset": options.preset, "candidate_parameters": PRESETS[options.preset],
              "clump_profile": {"source": "Bundled Clump .shape_range with Base=2; for these positive Shape<=.5 values",
                                "formula": "t ** (-log2(1-Shape)); then multiplied by Clump Factor",
                                "unscaled_at_0_25": .25**(-math.log2(1-clump_shape)),
                                "unscaled_at_0_5": .5**(-math.log2(1-clump_shape)), "unscaled_at_1": 1.},
              "study_scope": ("One-change comparison versus saved GN2: guide_assignment only. Rest/guide native positions and radii, all node parameters, roots, other layers, material and rendering conditions are fixed. No height correction or paper/Houdini reproduction."
                              if options.preset == "gn3" else "One multi-change method candidate: open authored guides + official live nodes + shorter lengths + fuller tip profile; not controlled A/B or paper/Houdini reproduction"),
              "control_asset": GN2_CONTROL if options.preset == "gn3" else None,
              "changes_vs_control": ["guide_assignment"] if options.preset == "gn3" else None,
              "baseline_source": str(BASELINE), "baseline_source_sha256": BASELINE_SHA256,
              "baseline_snapshot": stem+".source.py", "wrapper_source_snapshot": stem+".gn-source.py",
              "wrapper_source_sha256": digest_bytes(source), "official_asset_library": str(ASSET), "official_asset_sha256": library_hash,
              "blender": bpy.app.version_string, "blend": stem+".blend", "png": stem+".png",
              "fixed": ["frozen v3 coat roots", "authored guide positions/radii and rest positions/radii", "strand counts", "base RNG samples", "undercoat/flyaway geometry", "material and color", "camera and lights", "Cycles settings"],
              **state}
    with (OUT / (stem+".gn-report.json")).open("x", encoding="utf-8") as output:
        json.dump(report, output, ensure_ascii=False, indent=2)
    metadata_path = OUT / (stem+".json")
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    metadata["method_report"] = stem+".gn-report.json"
    metadata["parameter_scope"] = "preset records frozen base D generation inputs; final GN groom uses candidate_parameters and actual evaluations in method_report"
    metadata["gn_candidate_preset"] = options.preset
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    print("PLUSH_HAIR_NODES_RESULT", json.dumps({"report": stem+".gn-report.json", "blend": stem+".blend", "rendered": report["rendered"],
                                                "count": state["coat"]["curve_count"], "live_guide_probe": state["coat"]["live_guide_probe"],
                                                "radius_tip": state["coat"]["radius_tip"], "arc_length": state["coat"]["arc_length"]}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
