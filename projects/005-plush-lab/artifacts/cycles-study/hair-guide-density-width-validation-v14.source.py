"""Independent saved GN14 density/width inspection; CPU read only.

Inspect actual saved native roots, nearest mapping, paired guide scope and
evaluated spatial bundle diameters. No render, blend save or visual acceptance.
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
HELPER = Path(__file__).with_name("validate_guide_azimuth_assets.py")
HELPER_SHA = "161fc89578434cec56929af6742009ac3de776d5333566154a3ffc0066aab84a"
HISTORY = "hair-guide-azimuth-validation-v13.json"
HISTORY_SHA = "40d1857c15ee0ab369925957256d64e0368b13b34c777fda48d2b538b3f62f62"
CONTROL = "swatch-reference-gn-clump-profile-live7-11"
CONTROL_SHA = "487e857487a6489bfb09371575d29ee6f793af460976ba1af593569f1382c26d"
GUIDE_COUNT = 10628
COAT_COUNT = 85000
AXES = np.array([.64, .43, .54], dtype=np.float64)
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("gn14_frozen_inspection_helpers", HELPER)
j = importlib.util.module_from_spec(spec)
spec.loader.exec_module(j)
h, r, w, c, g = j.h, j.r, j.w, j.c, j.g


def same(a, b):
    return a.dtype == b.dtype and a.shape == b.shape and a.tobytes() == b.tobytes()


def values(obj, name, domain, kind):
    attr = obj.data.attributes.get(name)
    if attr is None or attr.domain != domain or attr.data_type != kind:
        raise ValueError("Actual attribute layout mismatch: " + obj.name + " / " + name)
    if kind == "FLOAT_VECTOR":
        return h.get_array(attr.data, "vector", 3).reshape(-1, 3)
    return h.get_array(attr.data, "value", dtype={"INT": np.int32, "BOOLEAN": np.bool_, "FLOAT": np.float32}[kind])


def roots_from_farthest_append(coat_roots, old_roots):
    """Full f64 nearest initialization then deterministic coat-root FPS."""
    initial = h.surface_nearest_ids(coat_roots, old_roots)
    points = coat_roots.astype(np.float64)
    delta = points - old_roots[initial].astype(np.float64)
    minimum = np.sum(delta * delta, axis=1)
    appended = np.empty(GUIDE_COUNT - len(old_roots), dtype=np.int32)
    for step in range(len(appended)):
        index = int(np.argmax(minimum))
        appended[step] = index
        offset = points - points[index]
        minimum = np.minimum(minimum, np.einsum("ij,ij->i", offset, offset))
    return np.concatenate((old_roots, coat_roots[appended])), appended


def transport_guides(points, old_roots, new_roots, parent):
    old_n = old_roots.astype(np.float64) / AXES ** 2
    new_n = new_roots.astype(np.float64) / AXES ** 2
    old_n /= np.linalg.norm(old_n, axis=1, keepdims=True)
    new_n /= np.linalg.norm(new_n, axis=1, keepdims=True)
    a, b = old_n[parent], new_n
    cosine = np.sum(a * b, axis=1)
    if (cosine < -.99).any():
        raise ValueError("Actual nearest transport parent normals are antipodal")
    axis = np.cross(a, b)[:, None]
    relative = points[parent].astype(np.float64) - old_roots[parent, None].astype(np.float64)
    rotated = relative + np.cross(axis, relative) + np.cross(axis, np.cross(axis, relative)) / (1. + cosine[:, None, None])
    result = (new_roots[:, None].astype(np.float64) + rotated).astype(np.float32)
    result[:, 0] = new_roots
    result[:len(old_roots)] = points
    return result, cosine


def half_width(points):
    roots = points[:, 0].astype(np.float64)
    normals = roots / AXES ** 2
    normals /= np.linalg.norm(normals, axis=1, keepdims=True)
    relative = points.astype(np.float64) - roots[:, None]
    axial = normals[:, None] * np.sum(relative * normals[:, None], axis=2, keepdims=True)
    expected = (roots[:, None] + axial + .5 * (relative - axial)).astype(np.float32)
    expected[:, 0] = points[:, 0]
    return expected


def root_bundles(child_roots, guide_roots, ids):
    """Independent actual root footprint diameters, distinct from upper pile."""
    counts = np.bincount(ids, minlength=len(guide_roots))
    order = np.argsort(ids, kind="stable")
    offsets = np.concatenate(([0], np.cumsum(counts)))
    normals = guide_roots.astype(np.float64) / AXES ** 2
    normals /= np.linalg.norm(normals, axis=1, keepdims=True)
    diameter, radius = np.zeros(len(counts)), np.zeros(len(counts))
    for gid in np.flatnonzero(counts):
        points = child_roots[order[offsets[gid]:offsets[gid + 1]]].astype(np.float64) - guide_roots[gid]
        points -= normals[gid] * np.sum(points * normals[gid], axis=1, keepdims=True)
        radius[gid] = np.linalg.norm(points, axis=1).max()
        delta = points[:, None] - points[None]
        diameter[gid] = np.sqrt(np.max(np.sum(delta * delta, axis=2)))
    selected = counts > 0
    return {"guide_count": len(guide_roots), "child_count": len(ids), "empty_groups": int((~selected).sum()),
            "children_per_guide_all": h.summary(counts), "child_counts_int64_sha256": h.array_hash(counts, np.int64),
            "root_tangent_pair_diameter_nonempty": h.summary(diameter[selected]),
            "max_root_tangent_radius_nonempty": h.summary(radius[selected]),
            "child_root_to_guide_root_distance": h.summary(np.linalg.norm(child_roots.astype(np.float64) - guide_roots[ids], axis=1)),
            "basis": "All actual native child-root groups, projected onto analytic ellipsoid root normal plane of their actual guide. Exact maximum pair distance and maximum root-relative radius over nonempty groups, including zero diameter for singleton. Root footprint only, not upper pile width, geodesic distance, calibrated millimeters, physical contact/softness or visual acceptance."}


def fixed_scene(checks, baseline, actual, base_visibility, visibility):
    checks.check("camera/material/light/world/render/backing/mesh/typed GN11 graph/profile/visibility all fixed",
                 base_visibility == visibility and all(baseline[k] == actual[k] for k in ("noncoat_controls", "mesh_topology", "modifier_inputs", "tree")))
    checks.check("native curve object set and object transforms/visibility remain fixed",
                 set(baseline["curves"]) == set(actual["curves"])
                 and all(v["object_controls"] == actual["curves"][name]["object_controls"] for name, v in baseline["curves"].items()))
    checks.check("all undercoat and hidden flyaway native/evaluated data and attributes remain exact",
                 all(actual["curves"][name] == before for name, before in baseline["curves"].items() if name not in {h.COAT, h.GUIDE}))
    before, after = baseline["curves"][h.COAT], actual["curves"][h.COAT]
    excluded = {"pile_guide_index", "guide_curve_index"}
    checks.check("native coat85000 coordinates/root/radii/rest/IDs/topology fixed except two authorized mapping fields",
                 before["source"] == after["source"]
                 and {k: v for k, v in before["source_attributes"].items() if k not in excluded}
                 == {k: v for k, v in after["source_attributes"].items() if k not in excluded})
    b, a = copy.deepcopy(before["evaluated"]), copy.deepcopy(after["evaluated"])
    for target in (a, b):
        target.pop("positions_float32_sha256"); target.pop("radii_float32_sha256")
    checks.check("actual final child count/topology/root/materials remain exact despite remapping", a == b)


def spatial_bundles(curves, local_ids, count):
    """Actual 3D maximum pair distance per saved-ID group/control slice."""
    points = curves["positions"].reshape(-1, 12, 3).astype(np.float64)
    counts = np.bincount(local_ids, minlength=count)
    order = np.argsort(local_ids, kind="stable")
    offsets = np.concatenate(([0], np.cumsum(counts)))
    eligible = np.flatnonzero(counts >= 2)
    result = {"guide_count": count, "child_count": len(points), "nonempty_groups": int(np.count_nonzero(counts)),
              "groups_with_at_least_two_children": len(eligible), "empty_groups": int(np.count_nonzero(counts == 0)),
              "children_per_guide_all": h.summary(counts), "child_counts_int64_sha256": h.array_hash(counts, np.int64),
              "slices": {}, "basis": "At actual saved child control indices6/9/11, maximum 3D Euclidean pairwise centerline distance within every persistent nearest-guide-ID group having >=2 children. Includes bending/longitudinal separation; not matched arc length, surface diameter, fiber thickness, volume/contact or softness. Identity object/scene coordinates; no millimeter calibration."}
    for cp in (6, 9, 11):
        diameter = np.empty(len(eligible), dtype=np.float64)
        for number, gid in enumerate(eligible):
            group = points[order[offsets[gid]:offsets[gid + 1]], cp]
            difference = group[:, None] - group[None, :]
            diameter[number] = np.sqrt(np.max(np.sum(difference * difference, axis=2)))
        result["slices"]["control_" + str(cp)] = {"eligible_guide_count": len(eligible), "diameter": h.summary(diameter),
            "diameter_float64_sha256": h.array_hash(diameter, np.float64)}
    return result


def pair_scope(checks, wide_snapshot, half_snapshot):
    before, after = copy.deepcopy(wide_snapshot), copy.deepcopy(half_snapshot)
    for snapshot in (before, after):
        for name in (h.COAT, h.GUIDE):
            curve = snapshot["curves"][name]
            stages = ("source", "evaluated") if name == h.GUIDE else ("evaluated",)
            for stage in stages:
                curve[stage].pop("positions_float32_sha256")
                excluded = {"position"}
                if name == h.COAT:
                    curve[stage].pop("radii_float32_sha256"); excluded.add("radius")
                curve[stage + "_attributes"] = {k: v for k, v in curve[stage + "_attributes"].items() if k not in excluded}
    checks.check("A/B pair differs only guide native/evaluated position and downstream coat position/derived nonroot radius", before == after)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--wide", required=True)
    parser.add_argument("--half", required=True)
    parser.add_argument("--source-sha", required=True)
    parser.add_argument("--report", default="hair-guide-density-width-validation-v14.json")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    if any(not re.fullmatch(r"swatch-reference-gn-bundle-scale-[A-Za-z0-9_-]+-14", name) for name in (args.wide, args.half)):
        parser.error("Use actual producer-confirmed saved GN14 stems")
    if not re.fullmatch(r"[a-f0-9]{64}", args.source_sha) or not re.fullmatch(r"[A-Za-z0-9_-]+\.json", args.report):
        parser.error("Use frozen source SHA and exclusive simple JSON report name")
    report = {"status": "checking", "checks": [], "errors": [], "cases": {}, "control_asset": CONTROL,
              "validator": str(Path(__file__).relative_to(ROOT)), "validated_at_utc": datetime.now(timezone.utc).isoformat(),
              "blender": bpy.app.version_string, "scope": "Independent actual saved GN14 roots/nearest map/native contracts/paired width change, measured per-bundle child counts and 3D control-slice diameter, saved reload, actual PNG/receipt/source SHA, read-only preservation. CPU only; no render or save; no visual/physical softness acceptance."}
    checks = h.Checks(report)
    with (OUT / args.report).open("x", encoding="utf-8") as stream:
        try:
            checks.track(Path(__file__))
            checks.source("immutable independent GN13 helper retains exact bytes", HELPER, HELPER_SHA)
            checks.source("immutable GN13 independent report retains exact bytes", OUT / HISTORY, HISTORY_SHA)
            previous = checks.read_json(OUT / HISTORY)
            changed_history = []
            for entry in previous["checks"]:
                if entry["check"].startswith("read-only input preserved: "):
                    path = h.path_from(entry["check"].removeprefix("read-only input preserved: "), ROOT)
                    if checks.track(path) != entry["details"]["sha256_before"]:
                        changed_history.append(h.label_path(path))
            checks.check("all 75 pinned previous inputs retain exact historical SHA", not changed_history, {"mismatches": changed_history})
            checks.source("frozen actual GN11 baseline bytes", OUT / (CONTROL + ".blend"), CONTROL_SHA)
            checks.source("actual final GN14 source retains independently supplied frozen bytes", Path(__file__).with_name("plush_bundle_scale_study.py"), args.source_sha)
            bpy.ops.wm.open_mainfile(filepath=str(OUT / (CONTROL + ".blend")))
            baseline, base_visibility = r.snapshot(), w.visibility_controls()
            base_coat, base_guide = bpy.context.scene.objects[h.COAT], bpy.context.scene.objects[h.GUIDE]
            source = h.native_curves(base_coat)
            old_guides = h.native_curves(base_guide)
            old_coat = h.native_curves(base_coat, evaluated=True)
            old_rest = values(base_guide, "rest_position", "POINT", "FLOAT_VECTOR").reshape(-1, 12, 3)
            old_radius = values(base_guide, "root_radius", "CURVE", "FLOAT")
            old_ids = values(base_coat, "pile_guide_index", "CURVE", "INT") - COAT_COUNT
            checks.check("control actually has2657 guides85000coat90000undercoat and12-control coat/guides",
                         old_guides["curve_count"] == 2657 and source["curve_count"] == COAT_COUNT
                         and h.native_curves(bpy.context.scene.objects[h.UNDERCOAT])["curve_count"] == 90000
                         and np.all(np.diff(old_guides["offsets"]) == 12) and np.all(np.diff(source["offsets"]) == 12))
            roots, appended = roots_from_farthest_append(source["roots"], old_guides["roots"])
            parent = h.surface_nearest_ids(roots, old_guides["roots"])
            positions, cosine = transport_guides(old_guides["positions"].reshape(-1, 12, 3), old_guides["roots"], roots, parent)
            rest, _ = transport_guides(old_rest, old_guides["roots"], roots, parent)
            expected_radii = old_guides["radii"].reshape(-1, 12)[parent].copy()
            expected_radii[:2657] = old_guides["radii"].reshape(-1, 12)
            expected_root_radius = old_radius[parent].copy(); expected_root_radius[:2657] = old_radius
            local_ids = h.surface_nearest_ids(source["roots"], roots)
            expected_map = COAT_COUNT + local_ids
            report["construction"] = {"guide_count": GUIDE_COUNT, "old_guide_count": 2657, "appended_guide_count": len(appended),
                "appended_coat_root_indices_int32_sha256": h.array_hash(appended, np.int32),
                "parent_guide_ids_int32_sha256": h.array_hash(parent, np.int32), "minimum_parent_normal_cosine": float(cosine.min()),
                "actual_nearest_mapping_int32_sha256": h.array_hash(expected_map, np.int32),
                "basis": "Independent f64 full-all-guide Euclidean argmin lowest-ID tie, followed by7971 argmax(min squared distance) lowest-coat-index tie. FPS updates f64 three-coordinate einsum as declared frozen arithmetic. Native roots preserve2657 original prefix and append original saved coat root bits. Independent shortest normal-alignment guide/rest transport f64→f32/root restore; old prefix exact. No producer function execution or pass-flag reliance."}
            report["gn11_root_bundles"] = root_bundles(source["roots"], old_guides["roots"], old_ids)
            report["gn14_shared_root_bundles"] = root_bundles(source["roots"], roots, local_ids)
            case_snapshots, case_guides, case_evaluated = {}, {}, {}
            for stem, factor in ((args.wide, 1.), (args.half, .5)):
                cc = c.q.CaseChecks(checks, stem)
                result = report["cases"][stem] = {"lateral_scale": factor}
                recorded, meta = cc.read_json(OUT / (stem + ".gn-report.json")), cc.read_json(OUT / (stem + ".json"))
                cc.source("authoring source snapshot equals independently frozen current source", h.path_from(recorded["wrapper_source_snapshot"]), args.source_sha)
                cc.check("actual provenance references GN11 base and correct saved control; pass flags not used",
                         recorded["gn11_base"] == CONTROL and recorded["control_asset"] == (CONTROL if factor == 1. else args.wide)
                         and recorded["wrapper_source_sha256"] == args.source_sha and recorded["lateral_scale"] == factor)
                c.render_evidence(cc, recorded, meta, stem, result)
                cc.source("saved actual blend hash matches authoring descriptor", OUT / (stem + ".blend"), recorded["saved_blend_sha256"])
                bpy.ops.wm.open_mainfile(filepath=str(OUT / (stem + ".blend")))
                actual, visibility = r.snapshot(), w.visibility_controls()
                coat, guide = bpy.context.scene.objects[h.COAT], bpy.context.scene.objects[h.GUIDE]
                native, guides, evaluated = h.native_curves(coat), h.native_curves(guide), h.native_curves(coat, evaluated=True)
                fixed_scene(cc, baseline, actual, base_visibility, visibility)
                expected_positions = positions if factor == 1. else half_width(positions)
                cc.check("all10628 native guide roots/12controls exactly equal independent FPS+transport+declared lateral width formula",
                         guides["curve_count"] == GUIDE_COUNT and np.all(np.diff(guides["offsets"]) == 12)
                         and same(guides["positions"], expected_positions.reshape(-1, 3)) and same(guides["roots"], roots)
                         and len(guide.modifiers) == 0 and guide.get("curve_count") == GUIDE_COUNT)
                cc.check("actual native guide radii/rest/root_radius follow transported parent contract and fixed original2657 prefix",
                         same(guides["radii"], expected_radii.reshape(-1))
                         and same(values(guide, "rest_position", "POINT", "FLOAT_VECTOR"), rest.reshape(-1, 3))
                         and same(values(guide, "root_radius", "CURVE", "FLOAT"), expected_root_radius))
                guide_map = COAT_COUNT + np.arange(GUIDE_COUNT, dtype=np.int32)
                cc.check("actual INT/CURVE guide IDs, BOOLEAN guide mask and both coat mapping fields address appended live range85000..95627",
                         all(same(values(coat, name, "CURVE", "INT"), expected_map) and same(values(guide, name, "CURVE", "INT"), guide_map)
                             for name in ("pile_guide_index", "guide_curve_index"))
                         and values(guide, "is_guide", "CURVE", "BOOLEAN").all()
                         and not values(coat, "is_guide", "CURVE", "BOOLEAN").any())
                root_radii = evaluated["radii"][evaluated["offsets"][:-1]]
                old_root_radii = old_coat["radii"][old_coat["offsets"][:-1]]
                cc.check("actual final85000coat roots/root radii remain strictly bitwise GN11; finite positions/radii and12controls",
                         evaluated["curve_count"] == COAT_COUNT and np.all(np.diff(evaluated["offsets"]) == 12)
                         and same(evaluated["roots"], old_coat["roots"]) and same(root_radii, old_root_radii)
                         and np.isfinite(evaluated["positions"]).all() and np.isfinite(evaluated["radii"]).all() and (evaluated["radii"] >= 0).all())
                cc.check("evaluated guide exactly matches native authored controls/radii", h.curve_record(guides) == h.curve_record(h.native_curves(guide, evaluated=True)))
                result["spatial_child_bundles"] = spatial_bundles(evaluated, local_ids, GUIDE_COUNT)
                result["guide_arc"] = h.summary(h.lengths(guides["positions"], guides["offsets"], 32))
                result["child_arc"] = h.summary(h.lengths(evaluated["positions"], evaluated["offsets"], 32))
                result["guide_sampled_crown"] = h.summary(c.independent_sampled_crown(guides["positions"].reshape(-1, 12, 3)))
                result["child_sampled_crown"] = h.summary(c.independent_sampled_crown(evaluated["positions"].reshape(-1, 12, 3)))
                result["metric_basis"] = "Guide/child arcs: duplicated-endpoint Catmull GL32; crowns: signed ellipsoid implicit/gradient with8 Gauss samples/segment+controls. Not engine arc, nearest physical distance, calibrated units or visual quality; neither set as invariant."
                case_snapshots[stem], case_guides[stem], case_evaluated[stem] = actual, guides, evaluated
                bpy.ops.wm.open_mainfile(filepath=str(OUT / (stem + ".blend")))
                cc.check("actual saved disk reload reproduces graph/scene/native/evaluated arrays and visibility", r.snapshot() == actual and w.visibility_controls() == visibility)
                print("GN14_CASE_VALIDATED", stem, "roots/map/contracts/reload checked", flush=True)
            pair_scope(checks, case_snapshots[args.wide], case_snapshots[args.half])
            a, b = case_evaluated[args.wide], case_evaluated[args.half]
            delta = np.linalg.norm(b["positions"].astype(np.float64) - a["positions"].astype(np.float64), axis=1).reshape(COAT_COUNT, 12)
            report["paired_response"] = {"changed_child_curve_count_bitwise": int(np.count_nonzero(np.any(a["positions"].reshape(-1, 12, 3) != b["positions"].reshape(-1, 12, 3), axis=(1, 2)))),
                "maximum_control_displacement_per_child": h.summary(delta.max(axis=1)),
                "changed_derived_radius_point_count": int(np.count_nonzero(a["radii"] != b["radii"])),
                "maximum_derived_radius_delta_scene_units": float(np.max(np.abs(b["radii"].astype(np.float64) - a["radii"].astype(np.float64))))}
            checks.check("half-width authored guide change actually reaches finalcoat geometry", report["paired_response"]["changed_child_curve_count_bitwise"] > 0)
        except Exception as error:
            checks.check("independent GN14 saved inspection completes", False, {"exception": type(error).__name__, "message": str(error)})
        finally:
            checks.preserve_inputs()
            report["input_count"], report["check_count"] = len(checks.inputs), len(report["checks"])
            report["status"] = "failed" if report["errors"] else "passed"
            json.dump(report, stream, ensure_ascii=False, indent=2, allow_nan=False); stream.write("\n")
    print("PLUSH_GUIDE_DENSITY_WIDTH_VALIDATION", json.dumps({k: report[k] for k in ("status", "check_count", "input_count", "errors")}), flush=True)
    if report["errors"]:
        raise AssertionError("GN14 independent saved validation failed")


if __name__ == "__main__":
    main()
