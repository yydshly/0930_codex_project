"""Independently verify saved live Geometry Nodes hair; no render or save.

Example (report is exclusively created, never overwritten):
  blender -b --python-exit-code 1 --python validate_hair_nodes_assets.py -- \
    --asset swatch-reference-gn-pile-live-1 --report hair-nodes-assets-validation-v1.json

The guide probe temporarily edits one nonroot control in memory and restores it
in finally. Every inspected input is hashed before and after. Engineering checks
do not constitute appearance acceptance or physical/paper-method reproduction.
"""

import argparse
import hashlib
import json
import math
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import bpy
import numpy as np


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "artifacts" / "cycles-study"
BASE_SHA256 = "69df6504ddc4412c1279f7f40f2baa8ae45fbedc6649e64cdc7cb1d175039dc3"
COAT = "Blue pile · coat"
GUIDE = "Pile guides · editable live input"
UNDERCOAT = "Blue pile · undercoat"
MODIFIER = "Live official hair GN · pile study"
TREE = "PLUSH Live Official Hair · pile study"
OFFICIAL = ("Curl Hair Curves", "Clump Hair Curves",
            "Restore Curve Segment Length", "Set Hair Curve Profile")
MEMBERS = 32


def file_hash(path):
    result = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(block)
    return result.hexdigest()


def array_hash(values, dtype=np.float32):
    return hashlib.sha256(np.ascontiguousarray(values, dtype=dtype).tobytes()).hexdigest()


def get_array(collection, prop, dimensions=1, dtype=np.float32):
    result = np.empty(len(collection) * dimensions, dtype=dtype)
    collection.foreach_get(prop, result)
    return result


def path_from(value, relative_to=OUT):
    result = Path(str(value).replace("\\", "/"))
    return (relative_to / result).resolve() if not result.is_absolute() else result.resolve()


def label_path(path):
    return str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path)


def json_value(value):
    if value is None or isinstance(value, (str, bool, int, float)):
        return value
    if isinstance(value, set):
        return sorted(value)
    if isinstance(value, bpy.types.ID):
        return {"type": value.bl_rna.identifier, "name": re.sub(r"\.\d{3}$", "", value.name)}
    try:
        return [json_value(item) for item in value]
    except TypeError:
        return None


def primitive_properties(owner, exclude=()):
    excluded = set(exclude) | {"rna_type", "name", "name_full", "users", "use_fake_user", "tag",
                               "is_updated", "is_updated_data", "is_evaluated", "is_editable",
                               "is_library_indirect", "is_missing", "is_embedded_data", "session_uid"}
    result = {}
    for prop in owner.bl_rna.properties:
        if prop.identifier not in excluded and prop.type in {"BOOLEAN", "INT", "FLOAT", "STRING", "ENUM"}:
            result[prop.identifier] = json_value(getattr(owner, prop.identifier))
    return result


def shader_controls(tree):
    if tree is None:
        return None
    return {
        "nodes": {node.name: {
            "type": node.bl_idname,
            "controls": primitive_properties(node, {"location", "width", "height", "dimensions", "select", "label", "hide"}),
            "inputs": [[socket.identifier, json_value(socket.default_value)] for socket in node.inputs if hasattr(socket, "default_value")],
            "outputs": [[socket.identifier, json_value(socket.default_value)] for socket in node.outputs if hasattr(socket, "default_value")],
        } for node in tree.nodes},
        "links": sorted([link.from_node.name, link.from_socket.identifier, link.to_node.name, link.to_socket.identifier] for link in tree.links),
    }


def noncoat_controls():
    scene = bpy.context.scene
    def object_data(obj):
        return {"matrix_world": [list(row) for row in obj.matrix_world], "data": primitive_properties(obj.data)}
    return {
        "assigned_camera": None if scene.camera is None else scene.camera.name,
        "cameras": {obj.name: object_data(obj) for obj in scene.objects if obj.type == "CAMERA"},
        "lights": {obj.name: object_data(obj) for obj in scene.objects if obj.type == "LIGHT"},
        "mesh_vertices_and_transforms": {obj.name: {
            "matrix_world": [list(row) for row in obj.matrix_world],
            "vertices_float32_sha256": array_hash(get_array(obj.data.vertices, "co", 3)),
            "polygon_count": len(obj.data.polygons),
            "materials": [material.name if material else None for material in obj.data.materials],
        } for obj in scene.objects if obj.type == "MESH"},
        "materials": {material.name: {"controls": primitive_properties(material), "nodes": shader_controls(material.node_tree)} for material in bpy.data.materials},
        "world": None if scene.world is None else {"controls": primitive_properties(scene.world), "nodes": shader_controls(scene.world.node_tree)},
        "render": {"render": primitive_properties(scene.render, {"filepath", "use_lock_interface"}),
                   "cycles": primitive_properties(scene.cycles), "image_settings": primitive_properties(scene.render.image_settings),
                   "view": primitive_properties(scene.view_settings), "curves": primitive_properties(scene.cycles_curves)},
    }


def group_semantics(tree, cache=None):
    """Fingerprint actual controls, links and nested groups, ignoring UI/ID names.

    Canonical library copies receive .001 suffixes; group ID names and transient
    users are omitted. Node names and socket identifiers still identify the exact
    internal connectivity. Nested group content is recursively fingerprinted.
    """
    cache = {} if cache is None else cache
    pointer = tree.as_pointer()
    if pointer in cache:
        return cache[pointer]
    interface = []
    for socket in tree.interface.items_tree:
        if socket.item_type == "SOCKET":
            interface.append({"name": socket.name, "identifier": socket.identifier,
                              "in_out": socket.in_out, "socket_type": socket.socket_type,
                              "controls": primitive_properties(socket)})
    nodes = {}
    for node in tree.nodes:
        item = {
            "type": node.bl_idname,
            "controls": primitive_properties(node, {
                "location", "width", "width_hidden", "height", "dimensions", "select",
                "show_options", "show_preview", "show_texture", "label", "color",
                "use_custom_color", "hide", "warning_propagation",
            }),
            "inputs": [[socket.identifier, json_value(socket.default_value)]
                       for socket in node.inputs if hasattr(socket, "default_value")],
            "outputs": [[socket.identifier, json_value(socket.default_value)]
                        for socket in node.outputs if hasattr(socket, "default_value")],
        }
        for name in ("capture_items", "repeat_items", "state_items", "enum_items", "index_switch_items"):
            if hasattr(node, name):
                item[name] = [primitive_properties(entry) for entry in getattr(node, name)]
        if hasattr(node, "paired_output") and node.paired_output is not None:
            item["paired_output"] = node.paired_output.name
        if hasattr(node, "color_ramp"):
            item["color_ramp"] = {"controls": primitive_properties(node.color_ramp),
                                  "elements": [[point.position, list(point.color)] for point in node.color_ramp.elements]}
        if hasattr(node, "mapping") and hasattr(node.mapping, "curves"):
            item["curve_mapping"] = {"controls": primitive_properties(node.mapping),
                                     "curves": [[primitive_properties(point) for point in curve.points]
                                                for curve in node.mapping.curves]}
        if node.type == "GROUP" and node.node_tree is not None:
            item["nested_group_sha256"] = group_semantics(node.node_tree, cache)["sha256"]
        nodes[node.name] = item
    links = sorted([link.from_node.name, link.from_socket.identifier,
                    link.to_node.name, link.to_socket.identifier,
                    getattr(link, "multi_input_sort_id", 0)] for link in tree.links)
    record = {"tree_type": tree.bl_idname, "interface": interface, "nodes": nodes, "links": links}
    result = {"sha256": hashlib.sha256(json.dumps(record, sort_keys=True, ensure_ascii=False,
                                                 separators=(",", ":"), allow_nan=False).encode("utf-8")).hexdigest(),
              "node_count": len(nodes), "link_count": len(links), "record": record}
    cache[pointer] = result
    return result


class Checks:
    def __init__(self, report):
        self.report, self.inputs = report, {}

    def check(self, label, condition, details=None):
        passed = bool(condition)
        self.report["checks"].append({"check": label, "passed": passed, "details": details})
        if not passed:
            self.report["errors"].append(label)
        return passed

    def track(self, path):
        path = path.resolve()
        if path not in self.inputs:
            self.inputs[path] = file_hash(path)
        return self.inputs[path]

    def read_json(self, path):
        self.track(path)
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise TypeError("Expected JSON object: " + str(path))
        return data

    def source(self, label, path, expected):
        actual = self.track(path)
        self.check(label, actual == expected,
                   {"path": label_path(path), "actual_sha256": actual, "expected_sha256": expected})
        return actual

    def preserve_inputs(self):
        for path, before in self.inputs.items():
            after = file_hash(path) if path.is_file() else None
            self.check("read-only input preserved: " + label_path(path), before == after,
                       {"sha256_before": before, "sha256_after": after})


def native_curves(obj, evaluated=False):
    if evaluated:
        bpy.context.view_layer.update()
        obj = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    data = obj.data
    if obj.type != "CURVES" or data.bl_rna.identifier != "Curves":
        raise TypeError("Expected actual native Curves component: " + obj.name)
    positions = get_array(data.position_data, "vector", 3).reshape(-1, 3)
    offsets = get_array(data.curve_offset_data, "value", dtype=np.int32)
    count = len(data.curves)
    radius = data.attributes.get("radius")
    radii = get_array(radius.data, "value") if radius is not None else np.array([], dtype=np.float32)
    valid_topology = (len(offsets) == count + 1 and count > 0 and offsets[0] == 0
                      and offsets[-1] == len(positions) and (np.diff(offsets) >= 2).all())
    roots = positions[offsets[:-1]].copy() if valid_topology else np.empty((0, 3), dtype=np.float32)
    return {"positions": positions, "offsets": offsets, "radii": radii, "roots": roots,
            "curve_count": count, "point_count": len(positions), "valid_topology": bool(valid_topology),
            "radius_domain": None if radius is None else radius.domain,
            "radius_type": None if radius is None else radius.data_type,
            "evaluated_object": bool(obj.is_evaluated),
            "materials": [material.name if material else None for material in data.materials]}


def curve_record(curves):
    return {"curve_count": curves["curve_count"], "point_count": curves["point_count"],
            "positions_float32_sha256": array_hash(curves["positions"]),
            "radii_float32_sha256": array_hash(curves["radii"]),
            "offsets_int32_sha256": array_hash(curves["offsets"], np.int32),
            "roots_float32_sha256": array_hash(curves["roots"]), "materials": curves["materials"]}


def verify_native(checks, label, curves, expected_count):
    checks.check(label + ": actual native count/topology", curves["valid_topology"]
                 and curves["curve_count"] == expected_count,
                 {"curves": curves["curve_count"], "points": curves["point_count"],
                  "expected_curves": expected_count})
    checks.check(label + ": finite actual native positions", np.isfinite(curves["positions"]).all())
    radius = curves["radii"]
    valid = (curves["radius_domain"] == "POINT" and curves["radius_type"] == "FLOAT"
             and len(radius) == curves["point_count"] and np.isfinite(radius).all()
             and (radius >= 0).all() and curves["valid_topology"]
             and (radius[curves["offsets"][:-1]] > 0).all())
    checks.check(label + ": finite nonnegative POINT radii with positive roots", valid,
                 {"minimum": None if not len(radius) else float(radius.min()),
                  "maximum": None if not len(radius) else float(radius.max()),
                  "zero_radius_points": int(np.count_nonzero(radius == 0))})


def curve_attribute(checks, label, obj, name, kind, expected):
    attribute = obj.data.attributes.get(name)
    valid = (attribute is not None and attribute.domain == "CURVE" and attribute.data_type == kind
             and len(attribute.data) == len(expected))
    if not checks.check(label + ": native attribute layout " + name, valid):
        return None
    values = get_array(attribute.data, "value", dtype=np.bool_ if kind == "BOOLEAN" else np.int32)
    checks.check(label + ": native attribute values " + name, np.array_equal(values, expected),
                 {"actual_sha256": array_hash(values, values.dtype), "count": len(values)})
    return values


def surface_nearest_ids(roots, guide_roots, batch_size=256):
    """Independent full-distance Euclidean assignment on saved float32 roots.

    Float64 arithmetic is used for every guide, without KDTree approximations.
    np.argmin picks the lowest guide ID when squared distances are exactly tied.
    """
    guides = np.asarray(guide_roots, dtype=np.float64)
    result = np.empty(len(roots), dtype=np.int32)
    for start in range(0, len(roots), batch_size):
        block = np.asarray(roots[start:start + batch_size], dtype=np.float64)
        squared = np.zeros((len(block), len(guides)), dtype=np.float64)
        for axis in range(3):
            difference = block[:, axis, None] - guides[None, :, axis]
            squared += difference*difference
        result[start:start + len(block)] = np.argmin(squared, axis=1)
    return result


def read_saved_mapping(checks, coat, guide, source, guide_source, recorded):
    count, guide_count = source["curve_count"], guide_source["curve_count"]
    assignment = recorded.get("guide_assignment", {})
    mode = assignment.get("mode", "frozen_groups")
    if mode == "surface_nearest":
        checks.check("surface-nearest metric uses identity object-coordinate transforms",
                     np.array_equal(np.asarray(coat.matrix_world), np.eye(4))
                     and np.array_equal(np.asarray(guide.matrix_world), np.eye(4)))
        expected = count + surface_nearest_ids(source["roots"], guide_source["roots"])
    elif mode in {"frozen_groups", "authored_wide_groups"}:
        expected = count + np.arange(count, dtype=np.int32)//MEMBERS
    else:
        raise ValueError("Unsupported saved guide-assignment mode: " + str(mode))
    actual = curve_attribute(checks, "coat", coat, "pile_guide_index", "INT", expected)
    if actual is None:
        raise RuntimeError("Saved persistent guide mapping is unavailable")
    valid = len(actual) == count and (actual >= count).all() and (actual < count+guide_count).all()
    checks.check("actual saved persistent indices address independent guides", valid,
                 {"curve_count": len(actual), "guide_count": guide_count, "mode": mode})
    if not valid:
        raise RuntimeError("Saved persistent guide indices leave the appended guide range")
    children = np.bincount(actual-count, minlength=guide_count)
    if mode == "surface_nearest":
        curve_attribute(checks, "coat", coat, "guide_curve_index", "INT", actual)
        checks.check("actual saved full mapping SHA equals assignment report",
                     array_hash(actual, np.int32) == assignment.get("mapping_int32_sha256"))
        checks.check("actual saved variable child counts equal assignment report",
                     np.array_equal(children, np.asarray(assignment["child_counts"], dtype=np.int64)))
        checks.check("actual saved empty guide IDs equal assignment report",
                     np.array_equal(np.flatnonzero(children == 0), assignment["empty_guide_indices"]))
    return actual, {
        "mode": mode, "persistent_attribute": "pile_guide_index", "guide_index_offset": count,
        "guide_count": guide_count, "mapping_int32_sha256": array_hash(actual, np.int32),
        "child_counts": children.tolist(), "empty_guide_indices": np.flatnonzero(children == 0).tolist(),
        "minimum_children": int(children.min()), "maximum_children": int(children.max()),
        "metric": "All-guide float64 Euclidean distance from saved float32 roots; lowest ID resolves exact ties"
                  if mode == "surface_nearest" else "Frozen authored groups of up to 32 members",
    }


def linked(tree, source_node, source_socket, target_node, target_socket):
    return any(link.from_node == source_node and link.from_socket == source_socket
               and link.to_node == target_node and link.to_socket == target_socket for link in tree.links)


def modifier_input(modifier, identifier):
    properties = getattr(modifier, "properties", None)
    inputs = getattr(properties, "inputs", None)
    if inputs is not None:
        entry = getattr(inputs, identifier, None)
        if entry is not None:
            return entry.value
    return modifier.get(identifier)


def live_input_record(coat):
    modifier = coat.modifiers[MODIFIER]
    return {socket.name: json_value(modifier_input(modifier, socket.identifier))
            for socket in modifier.node_group.interface.items_tree
            if socket.item_type == "SOCKET" and socket.in_out == "INPUT" and socket.socket_type != "NodeSocketGeometry"}


def frozen_native_attributes(obj, excluded=()):
    """Geometry-driving native fields, excluding the changed guide assignment."""
    result = {}
    layouts = {"FLOAT": ("value", 1, np.float32), "FLOAT_VECTOR": ("vector", 3, np.float32),
               "FLOAT2": ("vector", 2, np.float32), "FLOAT_COLOR": ("color", 4, np.float32),
               "BYTE_COLOR": ("color", 4, np.float32), "INT": ("value", 1, np.int32),
               "INT8": ("value", 1, np.int32), "BOOLEAN": ("value", 1, np.bool_)}
    for attribute in obj.data.attributes:
        if attribute.name in excluded:
            continue
        if attribute.data_type not in layouts:
            raise TypeError("Unsupported saved native attribute for causal comparison: " + attribute.name + "/" + attribute.data_type)
        prop, dimensions, dtype = layouts[attribute.data_type]
        values = get_array(attribute.data, prop, dimensions, dtype)
        result[attribute.name] = {"domain": attribute.domain, "type": attribute.data_type,
                                 "count": len(attribute.data), "sha256": array_hash(values, dtype)}
    return result


def read_assignment_control(checks, recorded):
    if recorded.get("undercoat_change"):
        return None
    assignment = recorded.get("guide_assignment", {})
    if assignment.get("mode") != "surface_nearest":
        return None
    stem = assignment.get("control_asset") or recorded.get("control_asset")
    if not stem or not re.fullmatch(r"[A-Za-z0-9_-]+", stem):
        raise ValueError("Surface-nearest experiment requires its frozen control_asset stem")
    control_report = checks.read_json(OUT / (stem + ".gn-report.json"))
    checks.source("causal control uses its own frozen wrapper snapshot",
                  path_from(control_report["wrapper_source_snapshot"]), control_report["wrapper_source_sha256"])
    path = path_from(control_report["blend"])
    checks.track(path)
    bpy.ops.wm.open_mainfile(filepath=str(path))
    coat, guide = bpy.context.scene.objects[COAT], bpy.context.scene.objects[GUIDE]
    return {"asset": stem, "source_coat": curve_record(native_curves(coat)),
            "guides": curve_record(native_curves(guide)), "noncoat_controls": noncoat_controls(),
            "source_coat_attributes": frozen_native_attributes(coat, {"pile_guide_index", "guide_curve_index"}),
            "guide_attributes": frozen_native_attributes(guide),
            "live_tree_semantics_sha256": group_semantics(coat.modifiers[MODIFIER].node_group)["sha256"],
            "modifier_inputs": live_input_record(coat)}


def root_scaled_positions(positions, offsets, factor):
    """Scale saved float32 control displacements in float64, locking root bits."""
    if not np.isfinite(factor) or factor <= 0:
        raise ValueError("Undercoat root scale must be finite and positive")
    roots = positions[offsets[:-1]].copy()
    repeated_roots = np.repeat(roots, np.diff(offsets), axis=0).astype(np.float64)
    result = (repeated_roots + float(factor)*(positions.astype(np.float64)-repeated_roots)).astype(np.float32)
    result[offsets[:-1]] = roots
    return result


def mesh_topology_snapshot():
    return {obj.name: {
        "edges_int32_sha256": array_hash(get_array(obj.data.edges, "vertices", 2, np.int32), np.int32),
        "loops_int32_sha256": array_hash(get_array(obj.data.loops, "vertex_index", dtype=np.int32), np.int32),
        "polygon_loop_start_int32_sha256": array_hash(get_array(obj.data.polygons, "loop_start", dtype=np.int32), np.int32),
        "polygon_loop_count_int32_sha256": array_hash(get_array(obj.data.polygons, "loop_total", dtype=np.int32), np.int32),
        "polygon_material_int32_sha256": array_hash(get_array(obj.data.polygons, "material_index", dtype=np.int32), np.int32),
        "polygon_smooth_sha256": array_hash(get_array(obj.data.polygons, "use_smooth", dtype=np.bool_), np.bool_),
    } for obj in bpy.context.scene.objects if obj.type == "MESH"}


def saved_curve_snapshot():
    return {obj.name: {
        "source": curve_record(native_curves(obj)),
        "evaluated": curve_record(native_curves(obj, evaluated=True)),
        "native_attributes": frozen_native_attributes(obj),
        "object_controls": {"matrix_world": [list(row) for row in obj.matrix_world],
                            "hide_render": obj.hide_render, "hide_viewport": obj.hide_viewport,
                            "hide_get": obj.hide_get()},
    } for obj in bpy.context.scene.objects if obj.type == "CURVES"}


def read_undercoat_control(checks, recorded):
    change = recorded.get("undercoat_change")
    if not change:
        return None
    stem = recorded.get("control_asset") or change.get("control_asset")
    if not stem or not re.fullmatch(r"[A-Za-z0-9_-]+", stem):
        raise ValueError("Undercoat intervention requires its saved control_asset stem")
    checks.check("undercoat intervention uses the authorized saved GN3 control asset",
                 stem == "swatch-reference-gn-nearest-render-3")
    control_report = checks.read_json(OUT / (stem + ".gn-report.json"))
    checks.source("undercoat causal control uses its own frozen wrapper snapshot",
                  path_from(control_report["wrapper_source_snapshot"]), control_report["wrapper_source_sha256"])
    checks.source("undercoat report references the exact frozen GN3 helper snapshot",
                  path_from(recorded["control_wrapper_source_snapshot"]), recorded["control_wrapper_source_sha256"])
    checks.check("undercoat inherited helper SHA agrees with its actual saved control report",
                 recorded["control_wrapper_source_sha256"] == control_report["wrapper_source_sha256"])
    path = path_from(control_report["blend"])
    control_sha256 = checks.track(path)
    checks.check("undercoat source blend SHA matches actual frozen GN3 file",
                 recorded.get("source_blend_sha256") == control_sha256,
                 {"actual_sha256": control_sha256, "recorded_sha256": recorded.get("source_blend_sha256")})
    bpy.ops.wm.open_mainfile(filepath=str(path))
    coat = bpy.context.scene.objects[COAT]
    undercoat = native_curves(bpy.context.scene.objects[UNDERCOAT])
    return {"asset": stem, "blend_sha256": control_sha256, "curves": saved_curve_snapshot(), "noncoat_controls": noncoat_controls(),
            "mesh_topology": mesh_topology_snapshot(),
            "live_tree_semantics_sha256": group_semantics(coat.modifiers[MODIFIER].node_group)["sha256"],
            "modifier_inputs": live_input_record(coat), "_undercoat": undercoat}


def verify_undercoat_change(checks, recorded, control):
    change = recorded["undercoat_change"]
    factor = change.get("scale")
    checks.check("undercoat intervention records only the required root scale", change.get("object") == UNDERCOAT
                 and factor == .35 and change.get("mode") == "root_fixed_uniform_scale",
                 {"object": change.get("object"), "scale": factor, "mode": change.get("mode")})
    if factor != .35 or change.get("object") != UNDERCOAT or change.get("mode") != "root_fixed_uniform_scale":
        raise ValueError("Only the authorized Undercoat root scale 0.35 is supported")
    original = control["_undercoat"]
    actual = native_curves(bpy.context.scene.objects[UNDERCOAT])
    evaluated = native_curves(bpy.context.scene.objects[UNDERCOAT], evaluated=True)
    verify_native(checks, "root-scaled actual saved undercoat", actual, original["curve_count"])
    verify_native(checks, "root-scaled actual evaluated undercoat", evaluated, original["curve_count"])
    expected = root_scaled_positions(original["positions"], original["offsets"], factor)
    checks.check("every saved undercoat control equals independent GN3 root-scale computation",
                 array_hash(actual["positions"]) == array_hash(expected),
                 {"expected_positions_float32_sha256": array_hash(expected),
                  "actual_positions_float32_sha256": array_hash(actual["positions"])})
    checks.check("root-scaled undercoat roots retain every actual saved GN3 float32 bit",
                 array_hash(actual["roots"]) == array_hash(original["roots"]))
    checks.check("root-scaled undercoat radius and offset arrays remain bitwise equal GN3",
                 array_hash(actual["radii"]) == array_hash(original["radii"])
                 and array_hash(actual["offsets"], np.int32) == array_hash(original["offsets"], np.int32))
    for name, values in (("positions", actual["positions"]), ("radii", actual["radii"]), ("roots", actual["roots"])):
        checks.check("actual root-scaled undercoat hash equals saved study report: " + name,
                     array_hash(values) == change.get(name + "_float32_sha256"))
    checks.check("root-scaled undercoat evaluated native data exactly equals saved source", curve_record(actual) == curve_record(evaluated))
    snapshots = saved_curve_snapshot()
    checks.check("undercoat intervention preserves the exact saved native curve object set",
                 set(snapshots) == set(control["curves"]))
    for name, previous in control["curves"].items():
        if name != UNDERCOAT:
            checks.check("undercoat-only intervention leaves all saved/evaluated curve data unchanged: " + name,
                         snapshots.get(name) == previous)
        else:
            expected_attributes = {key: value for key, value in previous["native_attributes"].items() if key != "position"}
            actual_attributes = {key: value for key, value in snapshots[name]["native_attributes"].items() if key != "position"}
            checks.check("undercoat intervention leaves every nonposition native attribute bitwise equal GN3", actual_attributes == expected_attributes)
            checks.check("undercoat intervention leaves object transforms/visibility/material assignment equal GN3",
                         snapshots[name]["object_controls"] == previous["object_controls"]
                         and snapshots[name]["source"]["materials"] == previous["source"]["materials"])
    coat = bpy.context.scene.objects[COAT]
    for label, actual_value, frozen in (
        ("lights, materials, camera, world, mesh vertices and rendering controls", noncoat_controls(), control["noncoat_controls"]),
        ("mesh topology and polygon material/smoothing", mesh_topology_snapshot(), control["mesh_topology"]),
        ("complete live node-tree semantics", group_semantics(coat.modifiers[MODIFIER].node_group)["sha256"], control["live_tree_semantics_sha256"]),
        ("editable modifier inputs", live_input_record(coat), control["modifier_inputs"]),
    ):
        checks.check("undercoat-only causal control unchanged from saved GN3: " + label, actual_value == frozen)
    original_lengths = lengths(original["positions"], original["offsets"])
    actual_lengths = lengths(actual["positions"], actual["offsets"])
    checks.check("actual root-scaled undercoat Catmull-Rom measurements remain finite and positive",
                 np.isfinite(actual_lengths).all() and (actual_lengths > 0).all()
                 and np.isfinite(original_lengths).all() and (original_lengths > 0).all())
    return {"scale": factor, "object": UNDERCOAT, "control_asset": control["asset"],
            "arithmetic": "saved float32 GN3 points/roots promoted to float64; root + 0.35*(point-root), cast float32, original root bits restored",
            "source": curve_record(actual), "evaluated": curve_record(evaluated),
            "independent_expected_positions_float32_sha256": array_hash(expected),
            "roots_bitwise_equal_control": array_hash(actual["roots"]) == array_hash(original["roots"]),
            "actual_catmull_rom_arc_ratio_to_control": summary(actual_lengths/original_lengths),
            "arc_ratio_max_absolute_relative_error_to_scale": float(np.max(np.abs(actual_lengths/original_lengths/factor-1))),
            "arc_quadrature_order": 32,
            "scope": "Actual saved pointwise single-variable verification; unchanged guide dependency is probed independently elsewhere."}


def group_library_dependencies(tree, result=None):
    result = {} if result is None else result
    if tree.name in result:
        return result
    weak = getattr(tree, "library_weak_reference", None)
    result[tree.name] = {
        "strong_library": None if tree.library is None else tree.library.filepath,
        "weak_library_provenance": None if weak is None else primitive_properties(weak),
        "classification": "local appended/authored ID" if tree.library is None else "externally linked ID",
    }
    for node in tree.nodes:
        if node.type == "GROUP" and node.node_tree is not None:
            group_library_dependencies(node.node_tree, result)
    return result


def geometry_path(tree, source, target):
    pending, seen = [source], set()
    while pending:
        node = pending.pop()
        if node == target:
            return True
        if node.as_pointer() in seen:
            continue
        seen.add(node.as_pointer())
        pending.extend(link.to_node for link in tree.links if link.from_node == node
                       and link.from_socket.type == link.to_socket.type == "GEOMETRY")
    return False


def verify_graph(checks, coat, guide, recorded, library):
    modifier = coat.modifiers.get(MODIFIER)
    if not checks.check("saved coat has enabled editable native GN modifier", modifier is not None
                        and modifier.type == "NODES" and modifier.node_group is not None
                        and modifier.show_viewport and modifier.show_render):
        raise RuntimeError("Required live modifier is unavailable")
    tree = modifier.node_group
    checks.check("saved modifier references actual authored GeometryNodeTree",
                 tree.bl_idname == "GeometryNodeTree" and tree.name == TREE and tree.is_modifier)
    groups = {}
    for name in OFFICIAL:
        node = tree.nodes.get(name)
        if not checks.check("actual official group instance exists: " + name,
                            node is not None and node.type == "GROUP" and node.node_tree is not None
                            and re.sub(r"\.\d{3}$", "", node.node_tree.name) == name):
            raise RuntimeError("Official group instance missing: " + name)
        groups[name] = node
    for previous, current in zip(OFFICIAL, OFFICIAL[1:]):
        checks.check("actual ordered geometry link: " + previous + " -> " + current,
                     linked(tree, groups[previous], groups[previous].outputs[0],
                            groups[current], groups[current].inputs[0]))
    clump, restore = groups["Clump Hair Curves"], groups["Restore Curve Segment Length"]
    checks.check("actual official Clump Preserve Length enabled", not clump.inputs["Preserve Length"].is_linked
                 and clump.inputs["Preserve Length"].default_value is True)
    checks.check("actual official Restore factor1/pin0 uses live reference positions",
                 restore.inputs["Factor"].default_value == 1 and not restore.inputs["Factor"].is_linked
                 and restore.inputs["Pin at Parameter"].default_value == 0
                 and restore.inputs["Reference Position"].is_linked)
    map_node = tree.nodes.get("Read pile_guide_index")
    mask_node = tree.nodes.get("Read is_guide")
    rest_node = tree.nodes.get("Read rest_position")
    checks.check("actual explicit guide mapping reads persistent nonconflicting pile_guide_index",
                 map_node is not None and map_node.bl_idname == "GeometryNodeInputNamedAttribute"
                 and map_node.data_type == "INT" and map_node.inputs["Name"].default_value == "pile_guide_index"
                 and all(linked(tree, map_node, map_node.outputs["Attribute"], groups[name], groups[name].inputs["Guide Index"])
                         and groups[name].inputs["Existing Guide Map"].default_value is True
                         for name in OFFICIAL[:2]))
    checks.check("actual independent guide mask drives official Curl and Clump",
                 mask_node is not None and mask_node.data_type == "BOOLEAN"
                 and mask_node.inputs["Name"].default_value == "is_guide"
                 and all(linked(tree, mask_node, mask_node.outputs["Attribute"], groups[name], groups[name].inputs["Guide Mask"])
                         for name in OFFICIAL[:2]))
    checks.check("actual Restore references saved rest_position attribute", rest_node is not None
                 and rest_node.inputs["Name"].default_value == "rest_position"
                 and linked(tree, rest_node, rest_node.outputs["Attribute"], restore, restore.inputs["Reference Position"]))
    info = tree.nodes.get("Live editable guide geometry")
    input_nodes = [node for node in tree.nodes if node.type == "GROUP_INPUT"]
    outputs = [node for node in tree.nodes if node.type == "GROUP_OUTPUT" and node.is_active_output]
    input_node = input_nodes[0] if len(input_nodes) == 1 else None
    guide_socket = next((socket for socket in tree.interface.items_tree if socket.item_type == "SOCKET"
                         and socket.in_out == "INPUT" and socket.name == "Guide Object"), None)
    object_live = (info is not None and info.bl_idname == "GeometryNodeObjectInfo"
                   and input_node is not None and guide_socket is not None
                   and modifier_input(modifier, guide_socket.identifier) == guide
                   and input_node.outputs["Guide Object"].identifier == guide_socket.identifier
                   and linked(tree, input_node, input_node.outputs["Guide Object"], info, info.inputs["Object"])
                   and info.transform_space == "RELATIVE" and not info.inputs["As Instance"].default_value)
    checks.check("actual Object Info depends on independent editable guide object", object_live)
    join = tree.nodes.get("Coat first, guide curves second")
    checks.check("actual coat and Object Info geometry join enters official Curl",
                 join is not None and input_node is not None and info is not None
                 and linked(tree, input_node, input_node.outputs["Geometry"], join, join.inputs["Geometry"])
                 and linked(tree, info, info.outputs["Geometry"], join, join.inputs["Geometry"])
                 and linked(tree, join, join.outputs["Geometry"], groups[OFFICIAL[0]], groups[OFFICIAL[0]].inputs[0]))
    delete = tree.nodes.get("Remove temporary guide component from render output")
    root_lock = tree.nodes.get("Exact frozen float32 root lock")
    checks.check("actual profile output reaches curve guide deletion, root lock and active output",
                 len(outputs) == 1 and delete is not None and delete.domain == "CURVE"
                 and root_lock is not None and root_lock.bl_idname == "GeometryNodeSetPosition"
                 and geometry_path(tree, groups[OFFICIAL[-1]], delete)
                 and geometry_path(tree, delete, root_lock) and geometry_path(tree, root_lock, outputs[0]))
    checks.check("actual guide deletion is selected by is_guide field", delete is not None and mask_node is not None
                 and linked(tree, mask_node, mask_node.outputs["Attribute"], delete, delete.inputs["Selection"]))
    checks.check("actual exact root lock uses saved rest-position field", root_lock is not None and rest_node is not None
                 and linked(tree, rest_node, rest_node.outputs["Attribute"], root_lock, root_lock.inputs["Position"]))
    checks.check("independent guide object is hidden from rendered scene", guide.hide_render)
    result = {"modifier": modifier.name, "tree": tree.name,
              "live_tree_semantics_sha256": group_semantics(tree)["sha256"],
              "official_groups": {}, "guide_object": guide.name,
              "saved_group_library_dependencies": group_library_dependencies(tree)}
    strong = [name for name, dependency in result["saved_group_library_dependencies"].items()
              if dependency["strong_library"] is not None]
    checks.check("saved live graph and nested groups have no strong external library dependency", not strong,
                 {"externally_linked_groups": strong,
                  "weak_provenance_scope": "A weak library reference records source provenance; it is not an ID.library runtime link."})
    actual_records = {name: group_semantics(node.node_tree) for name, node in groups.items()}
    # Read canonical groups from the unchanged official library into memory only.
    with bpy.data.libraries.load(str(library), link=False) as (available, canonical):
        if not all(name in available.node_groups for name in OFFICIAL):
            raise RuntimeError("Canonical official library groups unavailable")
        canonical.node_groups = list(OFFICIAL)
    for name, canonical_group in zip(OFFICIAL, canonical.node_groups):
        expected = group_semantics(canonical_group)
        actual = actual_records[name]
        checks.check("saved group semantic content equals canonical official library: " + name,
                     actual["sha256"] == expected["sha256"],
                     {"saved_sha256": actual["sha256"], "canonical_sha256": expected["sha256"],
                      "saved_node_count": actual["node_count"], "canonical_node_count": expected["node_count"]})
        result["official_groups"][name] = {"saved": actual, "canonical_sha256": expected["sha256"]}
    for name, setting in recorded["graph"]["modifier_inputs"].items():
        value = modifier_input(modifier, setting["identifier"])
        actual = value.name if isinstance(value, bpy.types.Object) else value
        checks.check("actual editable modifier input equals saved report: " + name, actual == setting["value"],
                     {"actual": json_value(actual), "recorded": setting["value"]})
    return result


def joined_domain_probe(checks, coat, guide, final_evaluation, baseline_roots, saved_mapping):
    tree = coat.modifiers[MODIFIER].node_group
    output = next(node for node in tree.nodes if node.type == "GROUP_OUTPUT" and node.is_active_output).inputs["Geometry"]
    original_links = [(link.from_socket, link.to_socket) for link in output.links]
    join = tree.nodes["Coat first, guide curves second"]
    count, guide_count = len(baseline_roots), len(guide.data.curves)
    joined, fields = None, {}
    try:
        tree.links.new(join.outputs["Geometry"], output)
        coat.update_tag(refresh={"DATA"})
        joined = native_curves(coat, evaluated=True)
        data = coat.evaluated_get(bpy.context.evaluated_depsgraph_get()).data
        for name, dtype in (("is_guide", np.bool_), ("pile_guide_index", np.int32)):
            attribute = data.attributes.get(name)
            if attribute is None:
                raise RuntimeError("Actual joined field missing: " + name)
            fields[name] = get_array(attribute.data, "value", dtype=dtype)
    finally:
        for link in list(output.links):
            tree.links.remove(link)
        for source, destination in original_links:
            tree.links.new(source, destination)
        coat.update_tag(refresh={"DATA"})
        restored = native_curves(coat, evaluated=True)
        checks.check("live graph output link and evaluated hair restore after joined-domain probe",
                     curve_record(restored) == curve_record(final_evaluation))
    expected_mask = np.concatenate((np.zeros(count, dtype=np.bool_), np.ones(guide_count, dtype=np.bool_)))
    expected_indices = np.concatenate((saved_mapping, count + np.arange(guide_count, dtype=np.int32)))
    checks.check("actual joined curve domain is coat first, independent guides second",
                 joined["curve_count"] == count + guide_count
                 and np.array_equal(fields["is_guide"], expected_mask)
                 and array_hash(joined["roots"][:count]) == array_hash(baseline_roots))
    checks.check("actual joined persistent indices exactly address appended guide curves",
                 np.array_equal(fields["pile_guide_index"], expected_indices))
    return {"actual_total_curves": joined["curve_count"], "coat_first_count": count,
            "first_guide_curve_index": count, "guide_count": guide_count,
            "persistent_field": "pile_guide_index", "official_mutable_field": "guide_curve_index",
            "actual_indices_int32_sha256": array_hash(fields["pile_guide_index"], np.int32),
            "restored_evaluation_bitwise_equal": curve_record(restored) == curve_record(final_evaluation)}


def guide_probe(checks, coat, guide, original, baseline_roots, saved_mapping):
    guide_before = native_curves(guide)
    positions = guide_before["positions"].copy()
    actual_local_ids = saved_mapping - original["curve_count"]
    child_counts = np.bincount(actual_local_ids, minlength=guide_before["curve_count"])
    nonempty = np.flatnonzero(child_counts > 0)
    if not len(nonempty):
        raise RuntimeError("No saved guide has child hairs for a dependency probe")
    midpoint = guide_before["curve_count"] // 2
    index = int(nonempty[np.argmin(np.abs(nonempty-midpoint))])
    start, end = guide_before["offsets"][index:index + 2]
    point = int(start + (end - start) // 2)
    perturbed = positions.copy()
    perturbed[point, 0] += np.float32(.002)
    changed, restored = None, None
    try:
        guide.data.position_data.foreach_set("vector", perturbed.ravel())
        guide.data.update_tag()
        guide.update_tag(refresh={"DATA"})
        changed = native_curves(coat, evaluated=True)
    finally:
        guide.data.position_data.foreach_set("vector", positions.ravel())
        guide.data.update_tag()
        guide.update_tag(refresh={"DATA"})
        restored = native_curves(coat, evaluated=True)
        guide_restored = native_curves(guide)
        checks.check("in-memory guide coordinates/radii/topology restored exactly",
                     curve_record(guide_restored) == curve_record(guide_before))
        checks.check("evaluated hair restores bitwise after independent guide probe",
                     curve_record(restored) == curve_record(original))
    checks.check("guide probe preserves actual evaluated hair count/offsets",
                 changed["curve_count"] == original["curve_count"]
                 and np.array_equal(changed["offsets"], original["offsets"]))
    verify_native(checks, "guide-perturbed evaluated coat", changed, original["curve_count"])
    checks.check("guide probe retains exact saved v3 root bits",
                 array_hash(changed["roots"]) == array_hash(baseline_roots))
    if changed["positions"].shape != original["positions"].shape:
        raise RuntimeError("Probe changed point topology")
    displacement = np.linalg.norm(changed["positions"].astype(np.float64)
                                  - original["positions"].astype(np.float64), axis=1)
    per_curve = np.maximum.reduceat(displacement, original["offsets"][:-1])
    changed_curves = np.flatnonzero(per_curve > 1e-8)
    maximum = float(displacement.max())
    checks.check("independent nonroot guide edit genuinely changes evaluated hair", maximum > 1e-7
                 and len(changed_curves) > 0,
                 {"guide_index": index, "guide_control_index": int(point - start),
                  "delta_x": .002, "maximum_coat_displacement": maximum,
                  "changed_curve_count": len(changed_curves)})
    expected_group = actual_local_ids == index
    checks.check("probe affects strands assigned to the edited guide", np.any(expected_group[changed_curves]))
    checks.check("probe affects only the actual saved guide-child set", expected_group[changed_curves].all(),
                 {"expected_child_count": int(np.count_nonzero(expected_group)),
                  "changed_curves_outside_saved_child_set": int(np.count_nonzero(~expected_group[changed_curves]))})
    nonmapped_points = np.repeat(~expected_group, np.diff(original["offsets"]))
    nonmapped_equal = (array_hash(changed["positions"][nonmapped_points]) == array_hash(original["positions"][nonmapped_points])
                       and array_hash(changed["radii"][nonmapped_points]) == array_hash(original["radii"][nonmapped_points]))
    checks.check("all nonmapped evaluated positions and radii remain bitwise equal under guide probe", nonmapped_equal,
                 {"unmapped_curve_count": int(np.count_nonzero(~expected_group)),
                  "unmapped_point_count": int(np.count_nonzero(nonmapped_points))})
    return {"guide_index": index, "guide_control_index": int(point - start), "delta_x": .002,
            "maximum_coat_displacement": maximum, "changed_curve_count": len(changed_curves),
            "changed_curve_indices": changed_curves.tolist(),
            "expected_child_curve_indices": np.flatnonzero(expected_group).tolist(),
            "expected_child_curve_count": int(np.count_nonzero(expected_group)),
            "child_set_source": "Actual native saved persistent pile_guide_index values; no fixed-size grouping assumption",
            "changed_curves_outside_explicit_group": int(np.count_nonzero(~expected_group[changed_curves])),
            "roots_float32_bitwise_equal_v3": array_hash(changed["roots"]) == array_hash(baseline_roots),
            "restored_evaluation_bitwise_equal": curve_record(restored) == curve_record(original),
            "nonmapped_evaluation_bitwise_equal": nonmapped_equal,
            "scope": "One independent saved guide/control, edited and restored in memory; no disk save or render."}


def lengths(positions, offsets, order=32):
    steps = np.diff(offsets)
    if not len(steps) or not np.all(steps == steps[0]):
        raise ValueError("Arc-length measurement currently requires uniform native topology")
    controls = positions.reshape(len(steps), int(steps[0]), 3)
    nodes, weights = np.polynomial.legendre.leggauss(order)
    nodes, weights = (nodes + 1) * .5, weights * .5
    result = np.empty(len(controls), dtype=np.float64)
    for start in range(0, len(controls), 2048):
        points = controls[start:start + 2048].astype(np.float64)
        expanded = np.concatenate((points[:, :1], points, points[:, -1:]), axis=1)
        a, b, c, d = (expanded[:, j:j + points.shape[1] - 1] for j in range(4))
        d0, d1, d2 = .5*(-a+c), 2*a-5*b+4*c-d, 1.5*(-a+3*b-3*c+d)
        measured = np.zeros(len(points))
        for parameter, weight in zip(nodes, weights):
            measured += weight * np.linalg.norm(d0 + parameter*d1 + parameter**2*d2, axis=-1).sum(axis=1)
        result[start:start + len(points)] = measured
    return result


def summary(values):
    return {"minimum": float(np.min(values)), "maximum": float(np.max(values)),
            "mean": float(np.mean(values)), "median": float(np.median(values)),
            "p95": float(np.percentile(values, 95)), "p99": float(np.percentile(values, 99))}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--asset", default="swatch-reference-gn-pile-live-1")
    parser.add_argument("--report", default="hair-nodes-assets-validation-v1.json")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    if not re.fullmatch(r"[A-Za-z0-9_-]+", args.asset) or not re.fullmatch(r"[A-Za-z0-9_-]+\.json", args.report):
        parser.error("Use simple artifact stems and a new JSON report filename")
    report = {"status": "checking", "checks": [], "errors": [], "check_count": 0,
              "validated_at_utc": datetime.now(timezone.utc).isoformat(),
              "validator": str(Path(__file__).relative_to(ROOT)), "blender": bpy.app.version_string,
              "asset": args.asset,
              "scope": "Independent saved native live GN graph, official library content, evaluated curves, reversible in-memory guide probe and input SHA preservation. Surface-nearest experiments also compare actual frozen control data. Engineering verification does not constitute visual acceptance, physical simulation or paper-method reproduction."}
    checks = Checks(report)
    output = OUT / args.report
    with output.open("x", encoding="utf-8") as stream:
        try:
            meta = checks.read_json(OUT / (args.asset + ".json"))
            recorded = checks.read_json(OUT / (args.asset + ".gn-report.json"))
            checks.check("saved GN study records completed engineering generation", recorded.get("status") == "engineering_precheck_passed")
            checks.check("saved report/metadata agree whether rendering was performed", recorded.get("rendered") is meta.get("rendered"))
            report["asset_rendered"] = recorded.get("rendered") is True
            report["engineering_generation_rendered"] = report["asset_rendered"]
            receipt_name = recorded.get("render_receipt") or meta.get("render_receipt")
            if receipt_name:
                checks.check("engineering metadata and report reference one separate render receipt",
                             recorded.get("render_receipt") == meta.get("render_receipt") == args.asset + ".render.json")
                receipt_path = path_from(receipt_name)
                if receipt_path.is_file():
                    receipt = checks.read_json(receipt_path)
                    checks.check("separate render receipt records completed render at the saved controls",
                                 receipt.get("rendered") is True and receipt.get("kind") == meta["kind"]
                                 and receipt.get("resolution") == meta["resolution"]
                                 and receipt.get("samples") == meta["samples"]
                                 and receipt.get("blend") == recorded["blend"] and receipt.get("png") == recorded["png"])
                    checks.source("render receipt matches actual unchanged saved blend",
                                  path_from(receipt["blend"]), receipt["blend_sha256"])
                    checks.source("render receipt matches actual saved PNG bytes",
                                  path_from(receipt["png"]), receipt["png_sha256"])
                    checks.check("render receipt wrapper SHA matches the frozen study snapshot",
                                 receipt.get("wrapper_source_sha256") == recorded["wrapper_source_sha256"])
                    report["asset_rendered"] = receipt.get("rendered") is True
                    report["render_receipt"] = receipt
                    render_log_path = OUT / (args.asset + ".render.log")
                    if render_log_path.is_file():
                        report["render_receipt_log_sha256"] = checks.track(render_log_path)
                elif path_from(recorded["png"]).is_file():
                    checks.check("PNG with declared separate render receipt has completed receipt", False)
            checks.source("frozen baseline source hash locked", path_from(recorded["baseline_source"], ROOT), BASE_SHA256)
            checks.source("saved base snapshot matches frozen v3", path_from(recorded["baseline_snapshot"]), BASE_SHA256)
            checks.source("saved GN wrapper snapshot matches recorded bytes", path_from(recorded["wrapper_source_snapshot"]), recorded["wrapper_source_sha256"])
            library = path_from(recorded["official_asset_library"], ROOT)
            checks.source("actual official asset library hash matches recorded source", library, recorded["official_asset_sha256"])
            report["official_asset_library"] = {"path": str(library), "sha256": checks.track(library)}
            checks.check("metadata and GN report agree on named native blend/PNG", meta["blend"] == recorded["blend"] == args.asset + ".blend"
                         and meta["png"] == recorded["png"] == args.asset + ".png")
            log_path = OUT / (args.asset + ".log")
            if log_path.is_file():
                report["render_log_sha256"] = checks.track(log_path)
            if report["asset_rendered"]:
                image_path = path_from(recorded["png"])
                checks.track(image_path)
                image = bpy.data.images.load(str(image_path), check_existing=False)
                try:
                    values = np.empty(len(image.pixels), dtype=np.float32)
                    image.pixels.foreach_get(values)
                    checks.check("saved rendered PNG decodes at recorded resolution", list(image.size) == [meta["resolution"]]*2
                                 and np.isfinite(values).all(), {"decoded_size": list(image.size), "pixels": len(values)})
                finally:
                    bpy.data.images.remove(image)
            else:
                report["render_scope"] = "Saved no-render engineering asset; no PNG or visual acceptance evidence."
            baseline_stem = meta["kind"] + "-reference-v3"
            baseline_meta = checks.read_json(OUT / (baseline_stem + ".json"))
            baseline_path = path_from(baseline_meta["blend"])
            checks.track(baseline_path)
            bpy.ops.wm.open_mainfile(filepath=str(baseline_path))
            baseline = {obj.name: native_curves(obj) for obj in bpy.context.scene.objects if obj.type == "CURVES"}
            baseline_controls = noncoat_controls()
            assignment_control = read_assignment_control(checks, recorded)
            undercoat_control = read_undercoat_control(checks, recorded)
            blend_path = path_from(recorded["blend"])
            checks.track(blend_path)
            bpy.ops.wm.open_mainfile(filepath=str(blend_path))
            scene = bpy.context.scene
            actual_controls = noncoat_controls()
            for name, previous in baseline_controls.items():
                checks.check("actual saved noncoat control matches v3: " + name, actual_controls[name] == previous)
            report["noncoat_controls"] = actual_controls
            coat, guide = scene.objects.get(COAT), scene.objects.get(GUIDE)
            if coat is None or guide is None:
                raise RuntimeError("Saved coat or independent guide object is missing")
            count = baseline[COAT]["curve_count"]
            source = native_curves(coat)
            guide_source = native_curves(guide)
            verify_native(checks, "saved source coat", source, count)
            expected_guides = (undercoat_control["curves"][GUIDE]["source"]["curve_count"] if undercoat_control else
                               assignment_control["guides"]["curve_count"] if assignment_control else math.ceil(count/MEMBERS))
            verify_native(checks, "saved independent guides", guide_source, expected_guides)
            checks.check("saved rest coat root bits equal actual saved v3", array_hash(source["roots"]) == array_hash(baseline[COAT]["roots"]))
            checks.check("saved rest coat input positions equal generation report", array_hash(source["positions"]) == recorded["coat"]["input_positions_float32_sha256"])
            checks.check("saved editable guide positions equal generation report", array_hash(guide_source["positions"]) == recorded["guides"]["positions_float32_sha256"])
            saved_mapping, report["guide_assignment"] = read_saved_mapping(checks, coat, guide, source, guide_source, recorded)
            curve_attribute(checks, "coat", coat, "is_guide", "BOOLEAN", np.zeros(count, dtype=np.bool_))
            guide_count = guide_source["curve_count"]
            curve_attribute(checks, "guides", guide, "pile_guide_index", "INT", count + np.arange(guide_count, dtype=np.int32))
            curve_attribute(checks, "guides", guide, "is_guide", "BOOLEAN", np.ones(guide_count, dtype=np.bool_))
            if assignment_control:
                for label, actual, frozen in (
                    ("source coat geometry", curve_record(source), assignment_control["source_coat"]),
                    ("source coat nonmapping native attributes", frozen_native_attributes(coat, {"pile_guide_index", "guide_curve_index"}), assignment_control["source_coat_attributes"]),
                    ("guide geometry", curve_record(guide_source), assignment_control["guides"]),
                    ("guide native attributes", frozen_native_attributes(guide), assignment_control["guide_attributes"]),
                    ("noncoat controls", actual_controls, assignment_control["noncoat_controls"]),
                    ("live node tree semantics", group_semantics(coat.modifiers[MODIFIER].node_group)["sha256"], assignment_control["live_tree_semantics_sha256"]),
                    ("editable modifier inputs", live_input_record(coat), assignment_control["modifier_inputs"]),
                ):
                    checks.check("surface-nearest causal control unchanged from saved GN2: " + label, actual == frozen)
                report["assignment_control"] = assignment_control
            if undercoat_control:
                report["undercoat_change"] = verify_undercoat_change(checks, recorded, undercoat_control)
                report["undercoat_control"] = {key: value for key, value in undercoat_control.items() if not key.startswith("_")}
            # Evaluate the saved graph before importing any canonical library ID.
            evaluated = native_curves(coat, evaluated=True)
            verify_native(checks, "actual evaluated coat", evaluated, count)
            checks.check("actual evaluated coat root bits equal actual saved v3", array_hash(evaluated["roots"]) == array_hash(baseline[COAT]["roots"]))
            checks.check("actual evaluated coat positions equal saved generation measurement", array_hash(evaluated["positions"]) == recorded["coat"]["evaluated_positions_float32_sha256"])
            checks.check("actual native GN evaluation changes rest coat geometry", array_hash(evaluated["positions"]) != array_hash(source["positions"]))
            report["graph"] = verify_graph(checks, coat, guide, recorded, library)
            report["joined_domain_probe"] = joined_domain_probe(checks, coat, guide, evaluated, baseline[COAT]["roots"], saved_mapping)
            report["source_coat"], report["evaluated_coat"], report["guides"] = curve_record(source), curve_record(evaluated), curve_record(guide_source)
            for name, previous in baseline.items():
                if name == COAT or (undercoat_control and name == UNDERCOAT):
                    continue
                actual = native_curves(scene.objects[name], evaluated=True)
                checks.check("actual unchanged noncoat layer equals saved v3: " + name, curve_record(actual) == curve_record(previous))
            rendered_counts = {obj.name: native_curves(obj, evaluated=True)["curve_count"]
                               for obj in scene.objects if obj.type == "CURVES" and not obj.hide_render}
            expected_total = sum(value["curve_count"] for value in baseline.values())
            checks.check("actual evaluated rendered strand count excludes helpers and equals v3", sum(rendered_counts.values()) == expected_total,
                         {"rendered_layers": rendered_counts, "actual_total": sum(rendered_counts.values()), "expected_total": expected_total})
            report["guide_probe"] = guide_probe(checks, coat, guide, evaluated, baseline[COAT]["roots"], saved_mapping)
            original_lengths = lengths(baseline[COAT]["positions"], baseline[COAT]["offsets"])
            source_lengths = lengths(source["positions"], source["offsets"])
            evaluated_lengths = lengths(evaluated["positions"], evaluated["offsets"])
            checks.check("independent Catmull-Rom arc measurements finite and positive", all(np.isfinite(value).all() and (value > 0).all()
                         for value in (original_lengths, source_lengths, evaluated_lengths)))
            rest_ratio = source_lengths/original_lengths
            rest_budget_max_error = float(np.max(np.abs(rest_ratio/.70-1)))
            rest_budget_outliers = int(np.count_nonzero(np.abs(rest_ratio-.70) > .007))
            if recorded.get("candidate_parameters", {}).get("normalize_member_normal") is True:
                checks.check("normal-corrected saved rest curves meet every 70-percent arc budget within 1e-4",
                             rest_budget_max_error <= 1e-4,
                             {"actual_max_absolute_relative_budget_error": rest_budget_max_error,
                              "curve_count": len(source_lengths), "required_tolerance": 1e-4})
            report["measured_arc_length"] = {
                "quadrature_order": 32, "saved_v3": summary(original_lengths),
                "saved_rest_input": summary(source_lengths), "evaluated": summary(evaluated_lengths),
                "relative_change_from_v3": summary((evaluated_lengths-original_lengths)/original_lengths),
                "absolute_relative_change_from_rest": summary(np.abs((evaluated_lengths-source_lengths)/source_lengths)),
                "scope": "Uniform Catmull-Rom integration with duplicated endpoints on actual float32 controls. Official Restore constrains control-segment lengths; no v3 arc-length preservation or physical simulation is asserted.",
                "rest_to_v3_length_ratio": summary(rest_ratio),
                "rest_nominal_0_70_max_absolute_relative_error": rest_budget_max_error,
                "rest_curves_more_than_1_percent_from_nominal_0_70_ratio": rest_budget_outliers,
                "nominal_budget_limit": (
                    "Measured saved rest curves include strands substantially below the nominal 0.70 budget; it does not hold for every strand in this asset."
                    if rest_budget_outliers else
                    "Every saved rest curve is measured against the nominal 0.70 budget; evaluated GN Catmull-Rom arc lengths are reported separately and are not assumed to preserve that budget."),
            }
        except Exception as error:
            checks.check("independent saved GN inspection completes", False,
                         {"exception": type(error).__name__, "message": str(error)})
        finally:
            try:
                checks.preserve_inputs()
            except Exception as error:
                checks.check("input preservation check completes", False,
                             {"exception": type(error).__name__, "message": str(error)})
            report["input_count"] = len(checks.inputs)
            report["check_count"] = len(report["checks"])
            report["status"] = "failed" if report["errors"] else "passed"
            json.dump(report, stream, ensure_ascii=False, indent=2, allow_nan=False)
            stream.write("\n")
    print("PLUSH_HAIR_NODES_VALIDATION", json.dumps({"status": report["status"], "checks": report["check_count"],
          "inputs": report["input_count"], "errors": report["errors"], "report": str(output)}, ensure_ascii=False), flush=True)
    if report["errors"]:
        raise AssertionError("Saved live GN hair validation failed: " + "; ".join(report["errors"]))


if __name__ == "__main__":
    main()
