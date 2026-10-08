"""Read-only verification of saved native groom assets; never renders or saves.

Run with Blender, using --python-exit-code 1 so a failure returns nonzero:
  blender -b --python-exit-code 1 --python validate_groom_assets.py -- \
    --report groom-assets-validation-v1.json

Repeat --asset NAME to select experiments, including future experiments. The
matching swatch/character v3 baselines are always inspected. The report is created
exclusively in artifacts/cycles-study; existing files are never overwritten.
For preservation-enabled reports, every saved coat curve is integrated against
the saved v3 coat with 32-point Gauss-Legendre quadrature. Engineering validation
does not constitute visual acceptance or a physical/FTL simulation claim.
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
BASELINES = {"swatch": "swatch-reference-v3", "character": "character-reference-v3"}
DEFAULT_ASSETS = (
    "swatch-reference-ab-root-1", "swatch-reference-ab-curve-1",
    "swatch-reference-ab-early-1", "character-reference-guide-v4",
)
COAT = "Blue pile · coat"
GUIDES = "Blue pile · hidden coat guides"
MEMBERS = 32
ARC_LENGTH_RELATIVE_TOLERANCE = 1e-4
LAYER_COUNTS = {
    "swatch": {"Blue pile · undercoat": (90000, 12), COAT: (85000, 12),
               "Blue pile · flyaway": (2500, 12)},
    "character": {"Blue pile · undercoat": (340000, 12), COAT: (320000, 12),
                  "Blue pile · flyaway": (9000, 12),
                  "Black wool · short fibers": (90000, 5)},
}


def file_digest(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def array_digest(values, dtype=np.float32):
    return hashlib.sha256(np.ascontiguousarray(values, dtype=dtype).tobytes()).hexdigest()


def native_array(collection, property_name, dimensions=1, dtype=np.float32):
    result = np.empty(len(collection) * dimensions, dtype=dtype)
    collection.foreach_get(property_name, result)
    return result


def catmull_rom_lengths(points, quadrature_order=32, batch_size=4096):
    """Integrate noncyclic uniform Catmull-Rom from saved float32 controls.

    Duplicate first/last controls for the endpoint segments, use cardinal
    tension 1/2, and integrate each segment's analytic derivative. Arithmetic
    is promoted to float64 per batch; this is not a control-polyline length.
    """
    nodes, weights = np.polynomial.legendre.leggauss(quadrature_order)
    nodes, weights = (nodes + 1) * .5, weights * .5
    lengths = np.empty(len(points), dtype=np.float64)
    for start in range(0, len(points), batch_size):
        end = min(start + batch_size, len(points))
        controls = points[start:end].astype(np.float64)
        extended = np.concatenate((controls[:, :1], controls, controls[:, -1:]), axis=1)
        a, b, c, d = (extended[:, offset:offset + controls.shape[1] - 1]
                      for offset in range(4))
        derivative0 = .5 * (-a + c)
        derivative1 = 2 * a - 5 * b + 4 * c - d
        derivative2 = 1.5 * (-a + 3 * b - 3 * c + d)
        integrated = np.zeros(end - start, dtype=np.float64)
        for parameter, weight in zip(nodes, weights):
            derivative = derivative0 + parameter * derivative1 + parameter**2 * derivative2
            integrated += weight * np.linalg.norm(derivative, axis=-1).sum(axis=1)
        lengths[start:end] = integrated
    return lengths


def numeric_summary(values):
    values = np.asarray(values, dtype=np.float64)
    return {
        "minimum": float(values.min()), "maximum": float(values.max()),
        "mean": float(values.mean()), "median": float(np.median(values)),
        "p95": float(np.percentile(values, 95)), "p99": float(np.percentile(values, 99)),
    }


def inspect_arc_length_preservation(inspect, stem, recorded, state, controls, baseline):
    coat_record = recorded.get("coat", {})
    enabled_by = []
    if recorded.get("preserve_arc_length") is True:
        enabled_by.append("preserve_arc_length")
    if coat_record.get("arc_normalization", {}).get("applied") is True:
        enabled_by.append("coat.arc_normalization.applied")
    if coat_record.get("arc_length_normalization", {}).get("enabled") is True:
        enabled_by.append("coat.arc_length_normalization.enabled")
    if not enabled_by:
        return
    baseline_controls = baseline.get("_coat_positions")
    shape_valid = (controls is not None and baseline_controls is not None
                   and controls.shape == baseline_controls.shape and controls.ndim == 3
                   and controls.shape[1:] == (12, 3))
    measured = {
        "status": "checking", "enabled_by_report_fields": enabled_by,
        "method": "All saved float32 coat controls, promoted to float64 for 32-point Gauss-Legendre integration per noncyclic uniform Catmull-Rom segment, tension 1/2, duplicated endpoint controls",
        "quadrature_order": 32,
        "required_max_absolute_relative_drift": ARC_LENGTH_RELATIVE_TOLERANCE,
        "baseline_positions_float32_sha256": baseline["curves"].get(COAT, {}).get("positions_float32_sha256"),
        "candidate_positions_float32_sha256": state["curves"].get(COAT, {}).get("positions_float32_sha256"),
        "scope": "Independent engineering verification of saved native per-curve arc lengths against saved v3; does not constitute visual acceptance or a physical/FTL method.",
    }
    state["arc_length_verification"] = measured
    log_path = OUT / (stem + ".log")
    log_exists = inspect.check(stem + ": preservation experiment render log exists", log_path.is_file(),
                               {"path": log_path.name})
    measured["render_log"] = {
        "path": log_path.name,
        "sha256": inspect.track(log_path) if log_exists else None,
        "scope": "Input preservation by before/after SHA256; not an appearance check.",
    }
    if not inspect.check(stem + ": saved coats available for independent full arc-length integration",
                         shape_valid, {"baseline_shape": None if baseline_controls is None else list(baseline_controls.shape),
                                       "candidate_shape": None if controls is None else list(controls.shape)}):
        measured["status"] = "failed"
        return
    if "_arc_lengths" not in baseline:
        baseline["_arc_lengths"] = catmull_rom_lengths(baseline_controls)
    baseline_lengths = baseline["_arc_lengths"]
    candidate_lengths = catmull_rom_lengths(controls)
    measured["measured_curve_count"] = len(candidate_lengths)
    finite_positive = (np.isfinite(baseline_lengths).all() and (baseline_lengths > 0).all()
                       and np.isfinite(candidate_lengths).all() and (candidate_lengths > 0).all())
    if not inspect.check(stem + ": independently integrated native arc lengths finite and positive", finite_positive):
        measured["status"] = "failed"
        return
    drift = candidate_lengths - baseline_lengths
    relative = drift / baseline_lengths
    absolute_relative_max = float(np.max(np.abs(relative)))
    roots_identical = array_digest(controls[:, 0]) == array_digest(baseline_controls[:, 0])
    inspect.check(stem + ": length preservation retains actual saved root bits", roots_identical,
                  {"candidate_roots_float32_sha256": array_digest(controls[:, 0]),
                   "baseline_roots_float32_sha256": array_digest(baseline_controls[:, 0])})
    within_tolerance = absolute_relative_max <= ARC_LENGTH_RELATIVE_TOLERANCE
    inspect.check(stem + ": all actual saved coat arc lengths preserve v3 within 1e-4 relative drift",
                  within_tolerance,
                  {"measured_curve_count": len(candidate_lengths),
                   "actual_max_absolute_relative_drift": absolute_relative_max,
                   "required_max_absolute_relative_drift": ARC_LENGTH_RELATIVE_TOLERANCE,
                   "curves_exceeding_tolerance": int(np.count_nonzero(np.abs(relative) > ARC_LENGTH_RELATIVE_TOLERANCE))})
    measured.update({
        "status": "passed" if log_exists and roots_identical and within_tolerance else "failed",
        "baseline_arc_lengths_float64_sha256": array_digest(baseline_lengths, np.float64),
        "candidate_arc_lengths_float64_sha256": array_digest(candidate_lengths, np.float64),
        "baseline": numeric_summary(baseline_lengths), "candidate": numeric_summary(candidate_lengths),
        "candidate_minus_baseline": numeric_summary(drift),
        "candidate_minus_baseline_relative": numeric_summary(relative),
        "absolute_relative_drift_max": absolute_relative_max,
        "absolute_relative_drift_p95": float(np.percentile(np.abs(relative), 95)),
        "absolute_relative_drift_p99": float(np.percentile(np.abs(relative), 99)),
        "roots_float32_bitwise_identical": roots_identical,
        "curves_exceeding_tolerance": int(np.count_nonzero(np.abs(relative) > ARC_LENGTH_RELATIVE_TOLERANCE)),
    })


def value_json(value):
    if isinstance(value, (str, bool, int, float)) or value is None:
        return value
    if isinstance(value, set):
        return sorted(value)
    try:
        return [value_json(item) for item in value]
    except TypeError:
        return None


def scalar_properties(owner, excluded=()):
    """Record saved primitive RNA controls without following ID references."""
    excluded = set(excluded) | {
        "rna_type", "name", "name_full", "users", "use_fake_user", "tag",
        "is_updated", "is_updated_data", "is_evaluated", "is_editable",
        "is_library_indirect", "is_missing", "is_embedded_data",
        "session_uid", "library_weak_reference", "original", "preview",
    }
    result = {}
    for prop in owner.bl_rna.properties:
        if prop.identifier in excluded or prop.type not in {"BOOLEAN", "INT", "FLOAT", "STRING", "ENUM"}:
            continue
        result[prop.identifier] = value_json(getattr(owner, prop.identifier))
    return result


def node_tree_snapshot(tree):
    if tree is None:
        return None
    nodes = {}
    for node in tree.nodes:
        saved = {
            "type": node.bl_idname,
            "controls": scalar_properties(node, {
                "location", "width", "height", "dimensions", "select", "show_options",
                "show_preview", "show_texture", "label", "color", "use_custom_color",
            }),
            "inputs": [[socket.identifier, value_json(socket.default_value)]
                       for socket in node.inputs if hasattr(socket, "default_value")],
        }
        if node.type == "VALTORGB":
            saved["color_ramp"] = {
                "controls": scalar_properties(node.color_ramp),
                "elements": [[entry.position, list(entry.color)] for entry in node.color_ramp.elements],
            }
        nodes[node.name] = saved
    links = sorted([link.from_node.name, link.from_socket.identifier,
                    link.to_node.name, link.to_socket.identifier] for link in tree.links)
    return {"nodes": nodes, "links": links}


def object_controls(obj):
    return {
        "matrix_world": [list(row) for row in obj.matrix_world],
        "hide_render": bool(obj.hide_render), "hide_viewport": bool(obj.hide_viewport),
        "materials": [material.name if material else None for material in getattr(obj.data, "materials", [])],
        "modifiers": [[modifier.name, modifier.type, scalar_properties(modifier)] for modifier in obj.modifiers],
    }


def canonical_mesh_topology(mesh):
    """Ignore storage order, retaining connectivity, face winding and controls.

    Blender's primitive operators can produce a different edge/face array order
    in separate processes. Vertex indices remain tied to the independently
    checked vertex positions. Rotate face cycles without reversing them, then
    sort; do not discard duplicate faces or edges.
    """
    edges = native_array(mesh.edges, "vertices", 2, np.int32).reshape(-1, 2)
    edges = np.sort(edges, axis=1)
    if len(edges):
        edges = edges[np.lexsort((edges[:, 1], edges[:, 0]))]
    faces = []
    for polygon in mesh.polygons:
        vertices = tuple(polygon.vertices)
        rotations = [vertices[index:] + vertices[:index] for index in range(len(vertices))]
        oriented = min(rotations)
        faces.append((oriented, int(polygon.material_index), bool(polygon.use_smooth)))
    encoded_faces = json.dumps(sorted(faces), separators=(",", ":")).encode("ascii")
    return {
        "undirected_edges_int32_sha256": array_digest(edges, np.int32),
        "oriented_faces_with_material_and_smoothing_sha256": hashlib.sha256(encoded_faces).hexdigest(),
        "edge_count": len(edges), "face_count": len(faces),
    }


def mesh_comparison(meshes):
    return {name: {key: value for key, value in mesh.items() if key != "native_storage"}
            for name, mesh in meshes.items()}


def scene_fingerprint():
    """Inspect every saved camera, light, mesh and material, plus render controls."""
    scene = bpy.context.scene
    cameras, lights, meshes = {}, {}, {}
    for obj in scene.objects:
        if obj.type in {"CAMERA", "LIGHT"}:
            saved = {"object": object_controls(obj), "data": scalar_properties(obj.data)}
            if obj.type == "LIGHT":
                saved["nodes"] = node_tree_snapshot(obj.data.node_tree)
                lights[obj.name] = saved
            else:
                cameras[obj.name] = saved
        elif obj.type == "MESH":
            mesh = obj.data
            meshes[obj.name] = {
                "object": object_controls(obj),
                "vertices": array_digest(native_array(mesh.vertices, "co", 3)),
                "canonical_topology": canonical_mesh_topology(mesh),
                "native_storage": {
                    "edges": array_digest(native_array(mesh.edges, "vertices", 2, np.int32), np.int32),
                    "loop_vertex_indices": array_digest(native_array(mesh.loops, "vertex_index", dtype=np.int32), np.int32),
                    "polygon_loop_starts": array_digest(native_array(mesh.polygons, "loop_start", dtype=np.int32), np.int32),
                    "polygon_loop_totals": array_digest(native_array(mesh.polygons, "loop_total", dtype=np.int32), np.int32),
                    "polygon_materials": array_digest(native_array(mesh.polygons, "material_index", dtype=np.int32), np.int32),
                    "polygon_smooth": array_digest(native_array(mesh.polygons, "use_smooth", dtype=np.bool_), np.bool_),
                },
                "vertex_count": len(mesh.vertices), "polygon_count": len(mesh.polygons),
            }
    materials = {
        material.name: {"controls": scalar_properties(material), "nodes": node_tree_snapshot(material.node_tree)}
        for material in bpy.data.materials
    }
    world = None if scene.world is None else {
        "name": scene.world.name, "controls": scalar_properties(scene.world),
        "nodes": node_tree_snapshot(scene.world.node_tree),
    }
    return {
        "assigned_camera": None if scene.camera is None else scene.camera.name,
        "cameras": cameras, "lights": lights, "meshes": meshes, "materials": materials,
        "world": world,
        "render": {
            "render": scalar_properties(scene.render, {"filepath", "use_lock_interface"}),
            "image_settings": scalar_properties(scene.render.image_settings),
            "cycles": scalar_properties(scene.cycles),
            "curves": scalar_properties(scene.cycles_curves),
            "view_settings": scalar_properties(scene.view_settings),
            "display_settings": scalar_properties(scene.display_settings),
            "sequencer_colorspace": scalar_properties(scene.sequencer_colorspace_settings),
            "view_layers": {layer.name: {
                "controls": scalar_properties(layer), "cycles": scalar_properties(layer.cycles),
            } for layer in scene.view_layers},
            "use_nodes": bool(getattr(scene, "use_nodes", False)),
            "compositor_nodes": node_tree_snapshot(
                getattr(scene, "node_tree", None)
                or getattr(scene, "compositing_node_group", None)
                or getattr(scene, "compositor_node_group", None)),
        },
    }


class Inspection:
    def __init__(self, report):
        self.report = report
        self.files_before = {}

    def check(self, name, condition, details=None):
        passed = bool(condition)
        self.report["checks"].append({"check": name, "passed": passed, "details": details})
        if not passed:
            self.report["errors"].append(name)
        return passed

    def track(self, path):
        path = path.resolve()
        if path not in self.files_before:
            self.files_before[path] = file_digest(path)
        return self.files_before[path]

    def read_json(self, path):
        self.track(path)
        result = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(result, dict):
            raise TypeError("Expected a JSON object: " + str(path))
        return result

    def source(self, label, path, expected):
        actual = self.track(path)
        self.check(label + ": source exists and SHA256 matches", actual == expected,
                   {"path": str(path.relative_to(ROOT)), "actual_sha256": actual,
                    "expected_sha256": expected})
        return actual

    def unchanged_files(self):
        for path, before in self.files_before.items():
            after = file_digest(path) if path.is_file() else None
            self.check("read-only inspection preserves " + str(path.relative_to(ROOT)), before == after,
                       {"sha256_before": before, "sha256_after": after})


def project_path(value, base):
    path = Path(str(value).replace("\\", "/"))
    path = (base / path).resolve() if not path.is_absolute() else path.resolve()
    if not path.is_relative_to(ROOT):
        raise ValueError("Artifact path leaves the project: " + str(path))
    return path


def integer_attribute(inspect, stem, data, name, expected_count):
    attribute = data.attributes.get(name)
    valid = (attribute is not None and attribute.data_type == "INT"
             and attribute.domain == "CURVE" and len(attribute.data) == expected_count)
    inspect.check(stem + ": native " + name + " is INT on CURVE domain", valid, {
        "domain": None if attribute is None else attribute.domain,
        "data_type": None if attribute is None else attribute.data_type,
        "count": None if attribute is None else len(attribute.data),
    })
    return native_array(attribute.data, "value", dtype=np.int32) if valid else np.array([], dtype=np.int32)


def inspect_image(inspect, stem, metadata):
    path = project_path(metadata["png"], OUT)
    png_sha = inspect.track(path)
    image = bpy.data.images.load(str(path), check_existing=False)
    try:
        size = list(image.size)
        values = np.empty(len(image.pixels), dtype=np.float32)
        image.pixels.foreach_get(values)
        finite = bool(np.isfinite(values).all())
        inspect.check(stem + ": saved PNG decodes at recorded dimensions", (
            size == [metadata["resolution"], metadata["resolution"]]
            and len(values) == size[0] * size[1] * image.channels and finite
        ), {"decoded_size": size, "channels": image.channels, "finite_pixels": finite,
            "pixel_count": len(values), "sha256": png_sha})
        inspect.check(stem + ": metadata records completed rendering", metadata.get("rendered") is True)
        return {"path": path.name, "decoded_size": size, "sha256": png_sha}
    finally:
        bpy.data.images.remove(image)


def inspect_curves(inspect, stem, kind, experiment):
    expected = dict(LAYER_COUNTS[kind])
    if experiment:
        expected[GUIDES] = (math.ceil(expected[COAT][0] / MEMBERS), 12)
    objects = {obj.name: obj for obj in bpy.context.scene.objects if obj.type == "CURVES"}
    inspect.check(stem + ": exactly the expected native Curves objects", set(objects) == set(expected),
                  {"actual": sorted(objects), "expected": sorted(expected)})
    curves, roots, guide_data, coat_positions = {}, None, None, None
    for name, (count, points_per_curve) in expected.items():
        obj = objects.get(name)
        if not inspect.check(stem + ": native Curves exists " + name,
                             obj is not None and obj.data.bl_rna.identifier == "Curves"):
            continue
        data = obj.data
        positions = native_array(data.position_data, "vector", 3)
        offsets = native_array(data.curve_offset_data, "value", dtype=np.int32)
        radius = data.attributes.get("radius")
        radii = (native_array(radius.data, "value") if radius is not None else np.array([], dtype=np.float32))
        valid_counts = (len(data.curves) == count and len(data.position_data) == count * points_per_curve
                        and len(offsets) == count + 1 and offsets[0] == 0
                        and offsets[-1] == count * points_per_curve
                        and np.all(np.diff(offsets) == points_per_curve))
        inspect.check(stem + ": actual curve/point/offset counts " + name, valid_counts,
                      {"curves": len(data.curves), "points": len(data.position_data),
                       "expected_curves": count, "points_per_curve": points_per_curve})
        inspect.check(stem + ": finite actual positions " + name, np.isfinite(positions).all())
        inspect.check(stem + ": positive finite native POINT radii " + name,
                      radius is not None and radius.domain == "POINT" and radius.data_type == "FLOAT"
                      and len(radii) == count * points_per_curve
                      and np.isfinite(radii).all() and (radii > 0).all(), {
                          "minimum": None if not len(radii) else float(radii.min()),
                          "maximum": None if not len(radii) else float(radii.max()),
                      })
        curves[name] = {
            "curve_count": len(data.curves), "point_count": len(data.position_data),
            "positions_float32_sha256": array_digest(positions),
            "radii_float32_sha256": array_digest(radii),
            "offsets_int32_sha256": array_digest(offsets, np.int32),
            "object": object_controls(obj),
        }
        if name == COAT and valid_counts:
            coat_positions = positions.reshape(count, points_per_curve, 3)
            roots = coat_positions[:, 0].copy()
            if experiment:
                guide_data = {"coat_ids": integer_attribute(inspect, stem + " coat", data, "guide_id", count)}
        elif name == GUIDES:
            inspect.check(stem + ": saved guides hidden from rendering and viewport",
                          obj.hide_render and obj.hide_viewport,
                          {"hide_render": bool(obj.hide_render), "hide_viewport": bool(obj.hide_viewport)})
            if valid_counts:
                guide_data = guide_data or {}
                guide_data["roots"] = positions.reshape(count, points_per_curve, 3)[:, 0].copy()
                guide_data["ids"] = integer_attribute(inspect, stem + " guides", data, "guide_id", count)
                guide_data["members"] = integer_attribute(inspect, stem + " guides", data, "source_member_index", count)
    rendered_body = sum(len(obj.data.curves) for obj in objects.values()
                        if not obj.hide_render and obj.name.startswith("Blue pile"))
    rendered_hat = sum(len(obj.data.curves) for obj in objects.values()
                       if not obj.hide_render and obj.name.startswith("Black wool"))
    rendered_total = sum(len(obj.data.curves) for obj in objects.values() if not obj.hide_render)
    target_body, target_hat = (177500, 0) if kind == "swatch" else (669000, 90000)
    inspect.check(stem + ": exact rendered body/hat/total native hair counts",
                  (rendered_body, rendered_hat, rendered_total) == (target_body, target_hat, target_body + target_hat),
                  {"body": rendered_body, "hat": rendered_hat, "total": rendered_total,
                   "expected_body": target_body, "expected_hat": target_hat})
    return curves, roots, guide_data, coat_positions


def inspect_experiment(inspect, stem, metadata, state, roots, guide_data, coat_positions, baseline):
    report_path = OUT / (stem + ".ab-report.json")
    recorded = inspect.read_json(report_path)
    inspect.check(stem + ": A/B report completed", recorded.get("status") == "passed"
                  and recorded.get("rendered") is True and recorded.get("name") == stem)
    inspect.check(stem + ": report frozen baseline SHA256 is locked", recorded.get("baseline_sha256") == BASE_SHA256)
    baseline_source = project_path(recorded["baseline_source"], ROOT)
    inspect.source(stem + " frozen baseline", baseline_source, BASE_SHA256)
    field = next((key for key in ("wrapper_snapshot", "render_wrapper_snapshot", "renderwrapper_snapshot", "wrapper_source_snapshot")
                  if recorded.get(key)), None)
    wrapper_name = recorded[field] if field else stem + ".ab-source.py"
    wrapper_path = project_path(wrapper_name, OUT)
    wrapper_sha = inspect.source(stem + " frozen wrapper", wrapper_path, recorded["wrapper_sha256"])
    state["wrapper_snapshot"] = {
        "path": wrapper_path.name, "report_field": field,
        "inferred_from_asset_name": field is None,
        "actual_sha256": wrapper_sha, "recorded_sha256": recorded["wrapper_sha256"],
        "verified": wrapper_sha == recorded["wrapper_sha256"],
    }
    coat = state["curves"].get(COAT, {})
    coat_record = recorded["coat"]
    inspect.check(stem + ": actual saved coat positions match output SHA256",
                  coat.get("positions_float32_sha256") == coat_record.get("output_positions_float32_sha256"))
    inspect.check(stem + ": actual saved coat radii match recorded unchanged SHA256",
                  coat.get("radii_float32_sha256") == coat_record.get("unchanged_radii_float32_sha256"))
    inspect.check(stem + ": actual baseline coat equals report A SHA256",
                  baseline["curves"][COAT]["positions_float32_sha256"] == coat_record.get("a_positions_float32_sha256"))
    inspect.check(stem + ": report coat/guide counts match native arrays",
                  coat_record.get("curve_count") == coat.get("curve_count")
                  and coat_record.get("guide_count") == state["curves"].get(GUIDES, {}).get("curve_count")
                  and coat_record.get("members_per_group") == MEMBERS)
    root_error = None
    if roots is not None and roots.shape == baseline["_roots"].shape:
        root_error = float(np.max(np.abs(roots - baseline["_roots"])))
    inspect.check(stem + ": actual saved coat roots fixed exactly to v3", root_error == 0.0,
                  {"actual_native_root_max_absolute_error": root_error})
    state["actual_native_root_max_absolute_error"] = root_error
    inspect.check(stem + ": actual coat radii/count/offsets match v3", all(
        coat.get(key) == baseline["curves"][COAT].get(key)
        for key in ("radii_float32_sha256", "curve_count", "point_count", "offsets_int32_sha256", "object")))
    if recorded.get("mode") == "root":
        inspect.check(stem + ": root-target native coat byte-identical to v3", coat == baseline["curves"][COAT])
    for name, layer in baseline["curves"].items():
        if name == COAT:
            continue
        inspect.check(stem + ": actual unchanged native layer equals v3 " + name,
                      state["curves"].get(name) == layer)
        expected = recorded.get("unchanged_objects", {}).get(name, {})
        inspect.check(stem + ": actual unchanged layer matches report " + name, all(
            state["curves"].get(name, {}).get(key) == expected.get(key)
            for key in ("curve_count", "positions_float32_sha256", "radii_float32_sha256")))
    inspect_arc_length_preservation(inspect, stem, recorded, state, coat_positions, baseline)
    if guide_data is None or roots is None:
        inspect.check(stem + ": native guide mapping available", False)
        return
    count = len(roots)
    groups = math.ceil(count / MEMBERS)
    ids = guide_data.get("coat_ids", np.array([], dtype=np.int32))
    guide_ids = guide_data.get("ids", np.array([], dtype=np.int32))
    members = guide_data.get("members", np.array([], dtype=np.int32))
    inspect.check(stem + ": actual coat guide_id maps every grouped member",
                  np.array_equal(ids, np.arange(count, dtype=np.int32) // MEMBERS))
    inspect.check(stem + ": actual coat guide_id SHA256 matches report",
                  array_digest(ids, np.int32) == coat_record.get("guide_id_sha256"))
    inspect.check(stem + ": actual guide IDs index saved guide object sequentially",
                  np.array_equal(guide_ids, np.arange(groups, dtype=np.int32)))
    valid_members = (len(members) == groups and (members >= 0).all() and (members < count).all()
                     and np.array_equal(members // MEMBERS, np.arange(groups, dtype=np.int32)))
    inspect.check(stem + ": actual source_member_index belongs to its group", valid_members)
    inspect.check(stem + ": actual source_member_index SHA256 matches report",
                  array_digest(members, np.int32) == coat_record.get("representative_member_sha256"))
    guide_roots = guide_data.get("roots")
    if guide_roots is not None and len(guide_roots) == groups and valid_members:
        distances = np.full(groups * MEMBERS, np.inf, dtype=np.float64)
        distances[:count] = np.sum((roots.astype(np.float64) - guide_roots[ids].astype(np.float64)) ** 2, axis=1)
        nearest = np.arange(groups) * MEMBERS + np.argmin(distances.reshape(groups, MEMBERS), axis=1)
        inspect.check(stem + ": source members nearest saved guide roots within each group",
                      np.array_equal(members, nearest),
                      {"mismatched_groups": int(np.count_nonzero(members != nearest))})
    state["guide_mapping"] = {
        "coat_guide_id_int32_sha256": array_digest(ids, np.int32),
        "guide_id_int32_sha256": array_digest(guide_ids, np.int32),
        "source_member_index_int32_sha256": array_digest(members, np.int32),
        "guide_count": groups, "members_per_group": MEMBERS,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--asset", action="append", help="Experiment stem, repeatable; each kind's v3 baseline is added")
    parser.add_argument("--report", default="groom-assets-validation-v1.json", help="New report filename in artifacts/cycles-study")
    options = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    if not re.fullmatch(r"[A-Za-z0-9_-]+\.json", options.report):
        parser.error("--report must be a simple new JSON filename")
    names = list(dict.fromkeys(options.asset or DEFAULT_ASSETS))
    if any(not re.fullmatch(r"[A-Za-z0-9_-]+", name) for name in names):
        parser.error("--asset must be a simple artifact stem")
    output = OUT / options.report
    report = {
        "validated_at_utc": datetime.now(timezone.utc).isoformat(),
        "validator": str(Path(__file__).relative_to(ROOT)),
        "validator_blender": bpy.app.version_string,
        "status": "checking", "check_count": 0, "checks": [], "errors": [], "states": {},
        "scope": "Read-only saved native Curves arrays, exact baseline controls, source hashes and PNG decoding. Preservation-enabled experiments additionally receive full independent saved-coat arc-length integration against v3. Engineering verification does not constitute visual acceptance, fidelity scoring, or physical/FTL simulation. No rendering or saving.",
        "frozen_baseline_sha256": BASE_SHA256, "requested_assets": names,
    }
    inspect = Inspection(report)
    # Reserve before inspecting anything; FileExistsError protects historical reports.
    with output.open("x", encoding="utf-8") as stream:
        try:
            metadata = {}
            for stem in names:
                metadata[stem] = inspect.read_json(OUT / (stem + ".json"))
                kind = metadata[stem]["kind"]
                if kind not in BASELINES:
                    raise ValueError("Unsupported saved asset kind: " + str(kind))
                baseline = BASELINES[kind]
                if baseline not in metadata:
                    metadata[baseline] = inspect.read_json(OUT / (baseline + ".json"))
            ordered = [stem for stem in BASELINES.values() if stem in metadata]
            ordered += [stem for stem in names if stem not in ordered]
            for stem in ordered:
                try:
                    meta = metadata[stem]
                    kind = meta["kind"]
                    experiment = stem != BASELINES[kind]
                    blend_path = project_path(meta["blend"], OUT)
                    inspect.check(stem + ": matching named editable blend", blend_path.name == stem + ".blend")
                    before = inspect.track(blend_path)
                    source = project_path(meta["source_snapshot"], OUT)
                    inspect.source(stem + " base snapshot", source, BASE_SHA256)
                    inspect.check(stem + ": metadata source SHA256 is locked", meta.get("source_sha256") == BASE_SHA256)
                    image = inspect_image(inspect, stem, meta)
                    bpy.ops.wm.open_mainfile(filepath=str(blend_path))
                    scene = bpy.context.scene
                    inspect.check(stem + ": saved render resolution/samples match metadata",
                                  scene.render.resolution_x == scene.render.resolution_y == meta["resolution"]
                                  and scene.render.resolution_percentage == 100 and scene.cycles.samples == meta["samples"],
                                  {"resolution": [scene.render.resolution_x, scene.render.resolution_y],
                                   "percentage": scene.render.resolution_percentage, "samples": scene.cycles.samples})
                    inspect.check(stem + ": native saved renderer is Cycles with thick hair",
                                  scene.render.engine == "CYCLES" and scene.cycles_curves.shape == "THICK")
                    curves, roots, guide_data, coat_positions = inspect_curves(inspect, stem, kind, experiment)
                    state = {"kind": kind, "blend_sha256": before, "image": image,
                             "curves": curves, "scene": scene_fingerprint()}
                    report["states"][stem] = state
                    if not experiment:
                        state["_roots"] = roots
                        state["_coat_positions"] = coat_positions
                    else:
                        baseline = report["states"][BASELINES[kind]]
                        inspect.check(stem + ": same kind/resolution/samples as inspected v3 baseline",
                                      all(meta[key] == metadata[BASELINES[kind]][key]
                                          for key in ("kind", "resolution", "samples", "angle_degrees")))
                        for category in ("cameras", "assigned_camera", "lights", "materials", "world", "render"):
                            inspect.check(stem + ": actual saved " + category + " match v3",
                                          state["scene"][category] == baseline["scene"][category])
                        inspect.check(stem + ": actual saved mesh geometry/controls match v3 (canonical oriented topology)",
                                      mesh_comparison(state["scene"]["meshes"]) == mesh_comparison(baseline["scene"]["meshes"]),
                                      {"comparison": "Exact vertex-position bytes and object controls; exact canonical edges and oriented faces including material/smoothing/multiplicity. Raw storage-order hashes retained in states.",
                                       "different_native_storage_order": [
                                           name for name, mesh in state["scene"]["meshes"].items()
                                           if mesh.get("native_storage") != baseline["scene"]["meshes"].get(name, {}).get("native_storage")
                                       ]})
                        inspect_experiment(inspect, stem, meta, state, roots, guide_data, coat_positions, baseline)
                except Exception as error:
                    inspect.check(stem + ": inspection completes", False,
                                  {"exception": type(error).__name__, "message": str(error)})
        except Exception as error:
            inspect.check("requested asset inventory readable", False,
                          {"exception": type(error).__name__, "message": str(error)})
        finally:
            try:
                inspect.unchanged_files()
            except Exception as error:
                inspect.check("read-only file preservation check completes", False,
                              {"exception": type(error).__name__, "message": str(error)})
            for state in report["states"].values():
                state.pop("_roots", None)
                state.pop("_coat_positions", None)
                state.pop("_arc_lengths", None)
            report["check_count"] = len(report["checks"])
            report["status"] = "failed" if report["errors"] else "passed"
            json.dump(report, stream, ensure_ascii=False, indent=2, allow_nan=False)
            stream.write("\n")
    print("PLUSH_GROOM_ASSETS_VALIDATION", json.dumps({
        "status": report["status"], "check_count": report["check_count"],
        "asset_count": len(report["states"]), "errors": report["errors"], "report": str(output),
    }, ensure_ascii=False), flush=True)
    if report["errors"]:
        raise AssertionError("Saved groom validation failed: " + "; ".join(report["errors"]))


if __name__ == "__main__":
    main()
