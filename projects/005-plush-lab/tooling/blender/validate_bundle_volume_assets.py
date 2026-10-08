"""Read-only saved GN6 Tip Spread comparison and cross-section proxies.

Inspect both saved cases against GN5, with a new exclusive report. No rendering,
blend save, or modification of the frozen GN4/GN5 validators is performed.
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
HELPER_PATH = Path(__file__).with_name("validate_restore_factor_assets.py")
HELPER_SHA256 = "cfae4cab5884faf24b86d47e1a71bd6bad2730ba0115d458c80dc4a95b9b87cf"
CONTROL = "swatch-reference-gn-restore-off-live-5"
CASES = {"swatch-reference-gn-tip-spread-006-live2-6": .006,
         "swatch-reference-gn-tip-spread-009-live2-6": .009}
SOCKET = "Tip Spread"
SLICES = (3, 6, 9)
MIN_CHILDREN = 6

# Import immutable validators as helper modules without writing bytecode files.
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("plush_gn5_validation_helpers", HELPER_PATH)
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)
h = r.h


class CaseChecks:
    def __init__(self, shared, stem):
        self.shared, self.stem = shared, stem

    def check(self, label, condition, details=None):
        return self.shared.check(self.stem + ": " + label, condition, details)

    def track(self, path):
        return self.shared.track(path)

    def read_json(self, path):
        return self.shared.read_json(path)

    def source(self, label, path, expected):
        actual = self.track(path)
        self.check(label, actual == expected,
                   {"path": h.label_path(path), "actual_sha256": actual, "expected_sha256": expected})
        return actual


def covariance_by_group(points, ids, group_count):
    """Float64 centered covariance, accumulated by persistent saved group IDs."""
    points = np.asarray(points, dtype=np.float64)
    counts = np.bincount(ids, minlength=group_count)
    sums = np.stack([np.bincount(ids, weights=points[:, axis], minlength=group_count) for axis in range(3)], axis=1)
    means = np.divide(sums, counts[:, None], out=np.zeros_like(sums), where=counts[:, None] > 0)
    covariance = np.empty((group_count, 3, 3), dtype=np.float64)
    denominator = np.maximum(counts-1, 1)
    for first in range(3):
        for second in range(first, 3):
            raw = np.bincount(ids, weights=points[:, first]*points[:, second], minlength=group_count)
            value = (raw-counts*means[:, first]*means[:, second])/denominator
            covariance[:, first, second] = covariance[:, second, first] = value
    return counts, covariance


def metric_summary(values, eligible):
    selected = values[eligible]
    return h.summary(selected) if len(selected) else None


def cross_section_proxy(coat, guides, local_ids):
    steps, guide_steps = np.diff(coat["offsets"]), np.diff(guides["offsets"])
    if not np.all(steps == 12) or not np.all(guide_steps == 12):
        raise ValueError("GN6 cross-section proxy requires the fixed saved 12-control topology")
    points = coat["positions"].reshape(-1, 12, 3).astype(np.float64)
    guide_points = guides["positions"].reshape(-1, 12, 3).astype(np.float64)
    gcount = len(guide_points)
    counts = np.bincount(local_ids, minlength=gcount)
    public = {"minimum_children": MIN_CHILDREN, "guide_count": gcount,
              "eligible_child_count_guides": int(np.count_nonzero(counts >= MIN_CHILDREN)),
              "excluded_small_groups": int(np.count_nonzero(counts < MIN_CHILDREN)),
              "eligible_child_count_hairs": int(counts[counts >= MIN_CHILDREN].sum()),
              "total_hairs": len(points), "slices": {},
              "scope": "Centerline covariance at matching saved control indices, projected onto raw guide central-difference tangent planes. These are geometric proxies, not physical bundle volume, optical coverage or visual acceptance. Whole-group 3D PCA also contains centerline bending and longitudinal extent.",
              "units": "Standard deviations use saved identity object/scene coordinates; ratios are dimensionless. No millimeter calibration.",
              "guide_frame_source": "Actual saved native guide controls; no inferred frame from rendered pixels",
              "quadrature": "None; actual saved controls only"}
    private = {}
    for index in SLICES:
        tangent = guide_points[:, index+1]-guide_points[:, index-1]
        norms = np.linalg.norm(tangent, axis=1)
        tangent = np.divide(tangent, norms[:, None], out=np.zeros_like(tangent), where=norms[:, None] > 1e-12)
        residuals = points[:, index]-guide_points[local_ids, index]
        _, covariance = covariance_by_group(residuals, local_ids, gcount)
        projection = np.eye(3)[None, :, :]-tangent[:, :, None]*tangent[:, None, :]
        transverse = projection @ covariance @ projection
        transverse = (transverse+np.swapaxes(transverse, 1, 2))*.5
        eigenvalues = np.maximum(np.linalg.eigvalsh(transverse), 0)
        minor, major = np.sqrt(eigenvalues[:, -2]), np.sqrt(eigenvalues[:, -1])
        eligible = (counts >= MIN_CHILDREN) & (norms > 1e-12) & (major > 1e-12)
        ratio = np.divide(minor, major, out=np.zeros_like(minor), where=major > 0)
        key = "control_" + str(index)
        private[key] = {"eligible": eligible, "minor_std": minor, "major_std": major, "minor_to_major_std_ratio": ratio}
        public["slices"][key] = {
            "eligible_guide_count": int(np.count_nonzero(eligible)),
            "eligible_hair_count": int(counts[eligible].sum()),
            "invalid_tangent_or_zero_spread_guides": int(np.count_nonzero((counts >= MIN_CHILDREN) & ~eligible)),
            "minor_std": metric_summary(minor, eligible), "major_std": metric_summary(major, eligible),
            "minor_to_major_std_ratio": metric_summary(ratio, eligible),
        }
    pooled = points[:, 1:]-guide_points[local_ids, :1]
    pooled_ids = np.repeat(local_ids, 11)
    _, covariance = covariance_by_group(pooled.reshape(-1, 3), pooled_ids, gcount)
    eigenvalues = np.maximum(np.linalg.eigvalsh(covariance), 0)
    eligible = (counts >= MIN_CHILDREN) & (eigenvalues[:, -1] > 1e-24)
    ratio = np.divide(eigenvalues[:, 0], eigenvalues[:, -1], out=np.zeros(gcount), where=eigenvalues[:, -1] > 0)
    public["whole_group_3d_pca"] = {"eligible_guide_count": int(np.count_nonzero(eligible)),
                                     "minor_to_major_variance_ratio": metric_summary(ratio, eligible),
                                     "minor_std": metric_summary(np.sqrt(eigenvalues[:, 0]), eligible),
                                     "major_std": metric_summary(np.sqrt(eigenvalues[:, -1]), eligible)}
    private["whole_group_3d_pca"] = {"eligible": eligible, "minor_to_major_variance_ratio": ratio}
    return public, private


def paired_proxy(control, candidate):
    result = {}
    for key, before in control.items():
        after = candidate[key]
        eligible = before["eligible"] & after["eligible"]
        result[key] = {"paired_guide_count": int(np.count_nonzero(eligible)), "deltas": {}}
        for metric in before:
            if metric == "eligible":
                continue
            delta = after[metric]-before[metric]
            result[key]["deltas"][metric] = metric_summary(delta, eligible)
    return result


def compare_saved_control(checks, previous, actual, expected_after):
    checks.check("exact saved native curve object set unchanged", set(previous["curves"]) == set(actual["curves"]))
    all_fixed = True
    for name, old in previous["curves"].items():
        new = actual["curves"].get(name)
        if new is None:
            raise RuntimeError("Fixed saved curve object missing: " + name)
        if name != h.COAT:
            all_fixed &= new == old
            continue
        all_fixed &= all(new[key] == old[key] for key in ("source", "source_attributes", "object_controls"))
        old_evaluated, new_evaluated = copy.deepcopy(old["evaluated"]), copy.deepcopy(new["evaluated"])
        old_position = old_evaluated.pop("positions_float32_sha256")
        new_position = new_evaluated.pop("positions_float32_sha256")
        old_evaluated.pop("radii_float32_sha256")
        new_evaluated.pop("radii_float32_sha256")
        all_fixed &= old_evaluated == new_evaluated
        old_attributes = {key: value for key, value in old["evaluated_attributes"].items() if key not in {"position", "radius"}}
        new_attributes = {key: value for key, value in new["evaluated_attributes"].items() if key not in {"position", "radius"}}
        all_fixed &= new_attributes == old_attributes
        checks.check("actual evaluated coat responds to Tip Spread", old_position != new_position)
    checks.check("all source curves/guides/rest/mapping/radii and other evaluated layers fixed; coat changes limited to derived position/radius", all_fixed)
    checks.check("all camera/light/material/world/backing/render controls and mesh topology fixed",
                 actual["noncoat_controls"] == previous["noncoat_controls"] and actual["mesh_topology"] == previous["mesh_topology"])
    checks.check("complete node-tree semantics and every linked/default field remain fixed", actual["tree"]["record"] == previous["tree"]["record"])
    expected_inputs = copy.deepcopy(previous["modifier_inputs"])
    expected_inputs[SOCKET] = float(np.float32(expected_after))
    checks.check("only actual typed modifier Tip Spread value changes", actual["modifier_inputs"] == expected_inputs,
                 {"before": previous["modifier_inputs"][SOCKET], "after": actual["modifier_inputs"][SOCKET]})


def official_graph_proof(checks, coat, guide, library, identifier):
    modifier = coat.modifiers[h.MODIFIER]
    tree = modifier.node_group
    clump, restore = tree.nodes["Clump Hair Curves"], tree.nodes["Restore Curve Segment Length"]
    input_node = next(node for node in tree.nodes if node.type == "GROUP_INPUT")
    socket = next(item for item in tree.interface.items_tree if item.item_type == "SOCKET" and item.in_out == "INPUT" and item.name == SOCKET)
    checks.check("actual linked Tip Spread control, Clump internal Preserve Length and external Restore zero remain live",
                 socket.identifier == identifier and input_node.outputs[SOCKET].identifier == identifier
                 and h.linked(tree, input_node, input_node.outputs[SOCKET], clump, clump.inputs[SOCKET])
                 and not clump.inputs["Preserve Length"].is_linked and clump.inputs["Preserve Length"].default_value is True
                 and not restore.inputs["Factor"].is_linked and restore.inputs["Factor"].default_value == 0)
    guide_socket = next(item for item in tree.interface.items_tree if item.item_type == "SOCKET" and item.in_out == "INPUT" and item.name == "Guide Object")
    checks.check("actual modifier still references the independent saved editable guide object", h.modifier_input(modifier, guide_socket.identifier) == guide and guide.hide_render)
    dependencies = h.group_library_dependencies(tree)
    checks.check("saved GN graph has no strong external library dependency", all(value["strong_library"] is None for value in dependencies.values()))
    actual = {name: h.group_semantics(tree.nodes[name].node_tree) for name in h.OFFICIAL}
    with bpy.data.libraries.load(str(library), link=False) as (available, canonical):
        if not all(name in available.node_groups for name in h.OFFICIAL):
            raise RuntimeError("Canonical official hair groups unavailable")
        canonical.node_groups = list(h.OFFICIAL)
    pairs = {name: {"saved_sha256": actual[name]["sha256"], "canonical_sha256": h.group_semantics(group)["sha256"]}
             for name, group in zip(h.OFFICIAL, canonical.node_groups)}
    checks.check("all four actual official group contents equal canonical source", all(value["saved_sha256"] == value["canonical_sha256"] for value in pairs.values()), pairs)
    return {"official_groups": pairs, "saved_group_library_dependencies": dependencies}


def radius_response(checks, previous, actual):
    roots_before = previous["radii"][previous["offsets"][:-1]]
    roots_after = actual["radii"][actual["offsets"][:-1]]
    checks.check("derived radii remain positive/finite with every evaluated root-radius bit fixed",
                 np.isfinite(actual["radii"]).all() and (actual["radii"] > 0).all()
                 and h.array_hash(roots_before) == h.array_hash(roots_after))
    changed = previous["radii"].view(np.uint32) != actual["radii"].view(np.uint32)
    absolute = np.abs(actual["radii"].astype(np.float64)-previous["radii"].astype(np.float64))
    return {"changed_point_count": int(np.count_nonzero(changed)), "changed_point_fraction": float(np.mean(changed)),
            "absolute_delta": h.summary(absolute), "scope": "Derived response of unchanged Profile to changed evaluated geometry/parameterization; native radii and evaluated root radii fixed."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assets", nargs="+", default=list(CASES))
    parser.add_argument("--report", default="hair-nodes-render-validation-v6.json")
    args = parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    if len(set(args.assets)) != len(args.assets) or any(stem not in CASES for stem in args.assets):
        parser.error("Select one or both authorized GN6 Tip Spread case stems without duplicates")
    if not re.fullmatch(r"[A-Za-z0-9_-]+\.json", args.report):
        parser.error("Use a new simple JSON report filename")
    report = {"status": "checking", "checks": [], "errors": [], "check_count": 0,
              "validated_at_utc": datetime.now(timezone.utc).isoformat(), "blender": bpy.app.version_string,
              "validator": str(Path(__file__).relative_to(ROOT)), "control_asset": CONTROL, "cases": {},
              "scope": "Actual saved single modifier-input comparisons, immutable source/native control, finite derived geometry/radii, reversible guide probe, receipt/SHA and paired centerline cross-section proxies. These checks do not establish visual acceptance, physical volume or spline-length preservation."}
    shared = h.Checks(report)
    output = OUT / args.report
    with output.open("x", encoding="utf-8") as stream:
        try:
            shared.source("GN5 validator helpers retain their frozen verified bytes", HELPER_PATH, HELPER_SHA256)
            shared.source("GN4 validator helpers retain their frozen verified bytes", r.HELPER_PATH, r.HELPER_SHA256)
            control_report = shared.read_json(OUT / (CONTROL + ".gn-report.json"))
            shared.source("GN5 control retains its actual frozen generator snapshot", h.path_from(control_report["wrapper_source_snapshot"]), control_report["wrapper_source_sha256"])
            control_path = h.path_from(control_report["blend"])
            control_sha = shared.track(control_path)
            bpy.ops.wm.open_mainfile(filepath=str(control_path))
            previous = r.snapshot()
            control_coat = h.native_curves(bpy.context.scene.objects[h.COAT], evaluated=True)
            control_guides = h.native_curves(bpy.context.scene.objects[h.GUIDE])
            coat_object = bpy.context.scene.objects[h.COAT]
            interface_socket = next(item for item in coat_object.modifiers[h.MODIFIER].node_group.interface.items_tree
                                    if item.item_type == "SOCKET" and item.in_out == "INPUT" and item.name == SOCKET)
            identifier = interface_socket.identifier
            shared.check("actual saved GN5 Tip Spread starts at its exact float32 0.003 control",
                         previous["modifier_inputs"][SOCKET] == float(np.float32(.003)))
            local_ids = h.get_array(coat_object.data.attributes["pile_guide_index"].data, "value", dtype=np.int32)-control_coat["curve_count"]
            baseline_proxy, baseline_private = cross_section_proxy(control_coat, control_guides, local_ids)
            report["control_snapshot"], report["control_cross_section_proxy"] = previous, baseline_proxy
            case_private = {}
            for stem in args.assets:
                checks = CaseChecks(shared, stem)
                candidate = report["cases"][stem] = {}
                meta = checks.read_json(OUT / (stem + ".json"))
                recorded = checks.read_json(OUT / (stem + ".gn-report.json"))
                checks.check("CPU engineering generation completed for the authorized GN5 control", recorded.get("status") == "engineering_precheck_passed"
                             and recorded.get("control_asset") == CONTROL and recorded.get("source_blend_sha256") == control_sha)
                checks.source("GN6 generator wrapper matches its own frozen snapshot", h.path_from(recorded["wrapper_source_snapshot"]), recorded["wrapper_source_sha256"])
                checks.source("GN6 inherited helper matches actual GN5 source", h.path_from(recorded["control_wrapper_source_snapshot"]), control_report["wrapper_source_sha256"])
                checks.check("inherited helper descriptor agrees with actual GN5 frozen source",
                             recorded.get("control_wrapper_source_sha256") == control_report["wrapper_source_sha256"])
                library = h.path_from(recorded["official_asset_library"], ROOT)
                checks.source("official asset library remains its actual recorded source bytes", library, recorded["official_asset_sha256"])
                r.render_evidence(checks, recorded, meta, stem, candidate)
                saved_blend_sha = checks.track(h.path_from(recorded["blend"]))
                checks.check("actual blend bytes match the final CPU saved-blend gate", saved_blend_sha == recorded.get("saved_blend_sha256"))
                bpy.ops.wm.open_mainfile(filepath=str(h.path_from(recorded["blend"])))
                actual = r.snapshot()
                compare_saved_control(checks, previous, actual, CASES[stem])
                change = recorded["tip_spread_change"]
                expected_after = float(np.float32(CASES[stem]))
                checks.check("actual modifier-input intervention agrees with its saved descriptor",
                             change.get("modifier") == h.MODIFIER and change.get("node_group") == h.TREE
                             and change.get("input") == SOCKET and change.get("socket_identifier") == identifier
                             and float(np.float32(change.get("before"))) == float(np.float32(.003))
                             and float(np.float32(change.get("after"))) == expected_after,
                             {"identifier": identifier, "expected_after_float32": expected_after})
                coat, guide = bpy.context.scene.objects[h.COAT], bpy.context.scene.objects[h.GUIDE]
                source, guides, evaluated = h.native_curves(coat), h.native_curves(guide), h.native_curves(coat, evaluated=True)
                h.verify_native(checks, "actual evaluated coat", evaluated, control_coat["curve_count"])
                checks.check("actual native and derived position/radius hashes agree with this case's own measurements",
                             h.array_hash(source["positions"]) == recorded["coat"]["input_positions_float32_sha256"]
                             and h.array_hash(evaluated["positions"]) == recorded["coat"]["evaluated_positions_float32_sha256"]
                             and h.array_hash(evaluated["radii"]) == recorded["coat"]["evaluated_radii_float32_sha256"])
                checks.check("all source/evaluated coat root bits retain actual GN5 root positions",
                             h.array_hash(source["roots"]) == h.array_hash(evaluated["roots"]) == h.array_hash(control_coat["roots"]))
                mapping, candidate["guide_assignment"] = h.read_saved_mapping(checks, coat, guide, source, guides, recorded)
                candidate["evaluated_radius_response"] = radius_response(checks, control_coat, evaluated)
                candidate["graph"] = official_graph_proof(checks, coat, guide, library, identifier)
                candidate["guide_probe"] = h.guide_probe(checks, coat, guide, evaluated, control_coat["roots"], mapping)
                proxy, private = cross_section_proxy(evaluated, guides, mapping-evaluated["curve_count"])
                checks.check("paired cross-section proxy retains populated finite eligible guide slices",
                             all(value["eligible_guide_count"] > 0 and all(np.isfinite(private[key][name]).all() for name in private[key] if name != "eligible")
                                 for key, value in proxy["slices"].items()))
                candidate["cross_section_proxy"], candidate["paired_proxy_delta_from_GN5"] = proxy, paired_proxy(baseline_private, private)
                case_private[stem] = private
                candidate["source_coat"], candidate["evaluated_coat"], candidate["guides"] = h.curve_record(source), h.curve_record(evaluated), h.curve_record(guides)
                candidate["tip_spread_change"] = change
                candidate["candidate_snapshot"] = actual
                rendered = {obj.name: h.native_curves(obj, evaluated=True)["curve_count"] for obj in bpy.context.scene.objects if obj.type == "CURVES" and not obj.hide_render}
                checks.check("actual rendered hair count remains 177500 with helper guide hidden", sum(rendered.values()) == 177500,
                             {"rendered_layers": rendered, "actual_total": sum(rendered.values())})
            if len(args.assets) == 2:
                ordered = sorted(args.assets, key=lambda stem: CASES[stem])
                report["two_case_comparison"] = {"before_case": ordered[0], "after_case": ordered[1],
                                                 "paired_proxy_deltas": paired_proxy(case_private[ordered[0]], case_private[ordered[1]])}
        except Exception as error:
            shared.check("independent saved GN6 inspection completes", False, {"exception": type(error).__name__, "message": str(error)})
        finally:
            try:
                shared.preserve_inputs()
            except Exception as error:
                shared.check("read-only preservation completes", False, {"exception": type(error).__name__, "message": str(error)})
            report["input_count"], report["check_count"] = len(shared.inputs), len(report["checks"])
            report["status"] = "failed" if report["errors"] else "passed"
            json.dump(report, stream, ensure_ascii=False, indent=2, allow_nan=False)
            stream.write("\n")
    print("PLUSH_BUNDLE_VOLUME_VALIDATION", json.dumps({"status": report["status"], "checks": report["check_count"],
          "inputs": report["input_count"], "errors": report["errors"], "report": str(output)}, ensure_ascii=False), flush=True)
    if report["errors"]:
        raise AssertionError("Saved GN6 bundle-volume validation failed: " + "; ".join(report["errors"]))


if __name__ == "__main__":
    main()
