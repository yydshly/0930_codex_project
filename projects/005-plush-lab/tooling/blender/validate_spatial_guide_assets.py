"""Read-only independent saved GN7 spatial-guide experiments.

Recompute the authorized native guide formula from actual saved GN5 controls.
Historical validators/reports stay immutable. No rendering or blend saving.
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
HELPER_PATH = Path(__file__).with_name("validate_bundle_volume_assets.py")
HELPER_SHA256 = "8c27ca19b48bf5d74be01300f3a11453d90b1245a24fa841d42b2b8eb38bf4ee"
CONTROL = "swatch-reference-gn-restore-off-live-5"
CASES = {"swatch-reference-gn-crown-008-live-7": .08,
         "swatch-reference-gn-crown-016-live-7": .16}
AXES = np.array([.64, .43, .54], dtype=np.float64)
CONTROL_BLEND_SHA256 = "782f8f4e718b944223527b7bf47126fab74bc9f578a45c2634223526afc410ed"
WRAPPER_SHA256 = "ce8d69473c06f0365b75fe3c4e3de3b87988720aeacd30757e2a183b10d22a60"

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("plush_gn6_validation_helpers", HELPER_PATH)
q = importlib.util.module_from_spec(spec)
spec.loader.exec_module(q)
r, h = q.r, q.h


def authorized_guide_positions(control, amplitude):
    """Independent authorized formula; no generator imports or recorded lengths."""
    steps = np.diff(control["offsets"])
    if not np.all(steps == 12):
        raise ValueError("Authorized GN7 formula requires the frozen 12-control guide topology")
    original = control["positions"].reshape(-1, 12, 3)
    points = original.astype(np.float64)
    roots = points[:, 0]
    normal = roots/(AXES*AXES)
    normal /= np.linalg.norm(normal, axis=1)[:, None]
    first = points[:, 5]-roots
    first -= np.sum(first*normal, axis=1)[:, None]*normal
    tangent_length = np.linalg.norm(first, axis=1)
    if np.any(tangent_length <= 1e-12):
        raise ValueError("Degenerate frozen guide control5 tangent for authorized frame")
    first /= tangent_length[:, None]
    second = np.cross(normal, first)
    actual_lengths = h.lengths(control["positions"], control["offsets"], 32)
    prototype = np.arange(len(points)) % 3
    theta = np.array([.80, .92, .86])[prototype, None]
    frequency = np.array([1.10, 1.35, 1.60])[prototype, None]
    parameter = np.linspace(0., 1., 12)[None, :]
    scale = actual_lengths[:, None]
    x = .10*scale*(1-np.cos(1.55*np.pi*parameter))
    y = float(amplitude)*scale*np.sin(frequency*np.pi*parameter)*np.sin(np.pi*parameter)
    z = scale*(.58*np.sin(theta*np.pi*parameter)+.12*parameter)
    result = (roots[:, None]+first[:, None]*x[..., None]
              +second[:, None]*y[..., None]+normal[:, None]*z[..., None]).astype(np.float32)
    result[:, 0] = original[:, 0]
    return result.reshape(-1, 3), actual_lengths


def guide_nonplanarity(curves):
    """Best-fit-plane residual on actual saved native guide controls."""
    steps = np.diff(curves["offsets"])
    if not len(steps) or not np.all(steps == steps[0]):
        raise ValueError("Guide PCA requires uniform saved topology")
    points = curves["positions"].reshape(-1, int(steps[0]), 3).astype(np.float64)
    centered = points-points.mean(axis=1, keepdims=True)
    covariance = np.einsum("gpi,gpj->gij", centered, centered)/points.shape[1]
    eigenvalues, eigenvectors = np.linalg.eigh(covariance)
    eigenvalues = np.maximum(eigenvalues, 0)
    plane_normal = eigenvectors[:, :, 0]
    distances = np.abs(np.einsum("gpi,gi->gp", centered, plane_normal))
    rms = np.sqrt(np.mean(distances*distances, axis=1))
    maximum = distances.max(axis=1)
    ratio = np.divide(eigenvalues[:, 0], eigenvalues[:, -1], out=np.zeros(len(points)), where=eigenvalues[:, -1] > 0)
    private = {"best_fit_plane_rms": rms, "best_fit_plane_max_residual": maximum,
               "minor_to_major_variance_ratio": ratio}
    return {"guide_count": len(points), "metrics": {name: h.summary(values) for name, values in private.items()},
            "scope": "Population covariance and best-fit-plane residual of all saved native control points. Baseline guides may already be nonplanar. These metrics do not establish physical volume, contact, or visual acceptance.",
            "units": "Residuals are scene coordinates, ratios dimensionless; no millimeter calibration."}, private


def guide_pair_delta(previous, actual):
    return {name: h.summary(actual[name]-previous[name]) for name in previous}


def sampled_surface_geometry(curves, camera_forward):
    """Independent Catmull sampling against the analytic ellipsoid proxy.

    Implicit/gradient is a signed-height approximation, not nearest surface
    distance. It does not test collision response, rendered visibility or UC
    occlusion. Eight interior samples per segment plus all native controls.
    """
    steps = np.diff(curves["offsets"])
    if not len(steps) or not np.all(steps == steps[0]):
        raise ValueError("Surface proxy requires uniform saved curve topology")
    points = curves["positions"].reshape(-1, int(steps[0]), 3)
    nodes, weights = np.polynomial.legendre.leggauss(8)
    nodes, weights = .5*(nodes+1), .5*weights
    count = len(points)
    peaks, minima, arcs, deep = [np.empty(count, dtype=np.float64) for _ in range(4)]

    def signed_height(values):
        implicit = np.sum((values/AXES)**2, axis=-1)-1
        gradient = 2*np.linalg.norm(values/(AXES*AXES), axis=-1)
        return implicit/np.maximum(gradient, 1e-12)

    for start in range(0, count, 1024):
        controls = points[start:start+1024].astype(np.float64)
        extended = np.concatenate((controls[:, :1], controls, controls[:, -1:]), axis=1)
        a, b, c, d = (extended[:, j:j+controls.shape[1]-1] for j in range(4))
        d0, d1, d2 = .5*(-a+c), 2*a-5*b+4*c-d, 1.5*(-a+3*b-3*c+d)
        native_height = signed_height(controls)
        peak, minimum = native_height.max(axis=1), native_height.min(axis=1)
        arc, below = np.zeros(len(controls)), np.zeros(len(controls))
        for parameter, weight in zip(nodes, weights):
            position = b+parameter*d0+.5*parameter**2*d1+parameter**3/3*d2
            height = signed_height(position)
            ds = weight*np.linalg.norm(d0+parameter*d1+parameter**2*d2, axis=-1)
            peak, minimum = np.maximum(peak, height.max(axis=1)), np.minimum(minimum, height.min(axis=1))
            arc += ds.sum(axis=1)
            below += (ds*(height < -.001)).sum(axis=1)
        stop = start+len(controls)
        peaks[start:stop], minima[start:stop], arcs[start:stop] = peak, minimum, arc
        deep[start:stop] = below/arc
    normals = points[:, 0].astype(np.float64)/(AXES*AXES)
    normals /= np.linalg.norm(normals, axis=1)[:, None]
    front = normals@np.asarray(camera_forward, dtype=np.float64) > .2
    public = {"curve_count": count, "ellipsoid_half_axes": AXES.tolist(), "quadrature_order": 8,
              "front_normal_dot_camera_threshold": .2, "front_curve_count": int(front.sum()),
              "crown_height_all": h.summary(peaks),
              "crown_height_front": h.summary(peaks[front]) if front.any() else None,
              "minimum_height": h.summary(minima), "sampled_arc_length_order8": h.summary(arcs),
              "curves_below_minus_0_001_fraction": float(np.mean(minima < -.001)),
              "arc_fraction_below_minus_0_001_mean": float(np.mean(deep)),
              "scope": "Signed analytic ellipsoid implicit/gradient height approximation on actual saved float32 Catmull controls; order8 sampling plus controls. Threshold height<-0.001 in scene coordinates. No millimeter calibration, physical contact solve, opaque coverage or visual acceptance."}
    private = {"crown_height": peaks, "minimum_height": minima, "deep_arc_fraction": deep}
    return public, private


def compare_fixed_control(checks, previous, actual):
    checks.check("exact native curve object set unchanged", set(previous["curves"]) == set(actual["curves"]))
    all_fixed = True
    for name, old in previous["curves"].items():
        new = actual["curves"].get(name)
        if new is None:
            raise RuntimeError("Fixed saved curve object missing: " + name)
        if name == h.GUIDE:
            all_fixed &= new["object_controls"] == old["object_controls"]
            for kind in ("source", "evaluated"):
                before, after = copy.deepcopy(old[kind]), copy.deepcopy(new[kind])
                before.pop("positions_float32_sha256")
                after.pop("positions_float32_sha256")
                all_fixed &= before == after
            for kind in ("source_attributes", "evaluated_attributes"):
                before = {key: value for key, value in old[kind].items() if key != "position"}
                after = {key: value for key, value in new[kind].items() if key != "position"}
                all_fixed &= before == after
        elif name == h.COAT:
            all_fixed &= all(new[key] == old[key] for key in ("source", "source_attributes", "object_controls"))
            before, after = copy.deepcopy(old["evaluated"]), copy.deepcopy(new["evaluated"])
            for allowed in ("positions_float32_sha256", "radii_float32_sha256"):
                before.pop(allowed)
                after.pop(allowed)
            all_fixed &= before == after
            before = {key: value for key, value in old["evaluated_attributes"].items() if key not in {"position", "radius"}}
            after = {key: value for key, value in new["evaluated_attributes"].items() if key not in {"position", "radius"}}
            all_fixed &= before == after
            checks.check("actual evaluated coat responds to changed guide shape", new["evaluated"]["positions_float32_sha256"] != old["evaluated"]["positions_float32_sha256"])
        else:
            all_fixed &= new == old
    checks.check("all native source/root/radius/mapping/rest attributes fixed except guide position; derived coat limited to position/radius", all_fixed)
    checks.check("all typed modifier inputs and complete GN tree remain fixed",
                 actual["modifier_inputs"] == previous["modifier_inputs"] and actual["tree"]["record"] == previous["tree"]["record"])
    checks.check("camera/light/material/world/backing/render controls and topology remain fixed",
                 actual["noncoat_controls"] == previous["noncoat_controls"] and actual["mesh_topology"] == previous["mesh_topology"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assets", nargs="+", default=list(CASES))
    parser.add_argument("--report", default="hair-nodes-render-validation-v7.json")
    args = parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    if len(set(args.assets)) != len(args.assets) or any(stem not in CASES for stem in args.assets):
        parser.error("Select the authorized successful GN7 case stems without duplicates")
    if not re.fullmatch(r"[A-Za-z0-9_-]+\.json", args.report):
        parser.error("Use a new simple JSON report filename")
    report = {"status": "checking", "checks": [], "errors": [], "check_count": 0,
              "validated_at_utc": datetime.now(timezone.utc).isoformat(), "blender": bpy.app.version_string,
              "validator": str(Path(__file__).relative_to(ROOT)), "control_asset": CONTROL, "cases": {},
              "scope": "Independent actual saved authorized guide formula/nonplanarity and fixed native/root/radius/GN/scene comparison, derived coat response, guide dependency, receipt/SHA and paired centerline proxies. No claim of original-rest length preservation, physical contact solve or visual acceptance."}
    shared = h.Checks(report)
    output = OUT / args.report
    with output.open("x", encoding="utf-8") as stream:
        try:
            for label, path, expected in (("GN6", HELPER_PATH, HELPER_SHA256),
                                          ("GN5", q.HELPER_PATH, q.HELPER_SHA256),
                                          ("GN4", r.HELPER_PATH, r.HELPER_SHA256)):
                shared.source(label + " validator helper retains frozen verified bytes", path, expected)
            control_report = shared.read_json(OUT / (CONTROL + ".gn-report.json"))
            shared.source("actual GN5 generator control retains its frozen source", h.path_from(control_report["wrapper_source_snapshot"]), control_report["wrapper_source_sha256"])
            control_path = h.path_from(control_report["blend"])
            control_sha = shared.track(control_path)
            shared.check("actual saved GN5 control matches the previously frozen engineering asset", control_sha == CONTROL_BLEND_SHA256)
            bpy.ops.wm.open_mainfile(filepath=str(control_path))
            previous = r.snapshot()
            old_coat = h.native_curves(bpy.context.scene.objects[h.COAT], evaluated=True)
            old_source = h.native_curves(bpy.context.scene.objects[h.COAT])
            old_guides = h.native_curves(bpy.context.scene.objects[h.GUIDE])
            camera_forward = list(bpy.context.scene.camera.matrix_world.col[2].xyz)
            old_surface, old_surface_private = sampled_surface_geometry(old_coat, camera_forward)
            old_arcs = h.lengths(old_coat["positions"], old_coat["offsets"], 32)
            rest_arcs = h.lengths(old_source["positions"], old_source["offsets"], 32)
            coat_object = bpy.context.scene.objects[h.COAT]
            local_ids = h.get_array(coat_object.data.attributes["pile_guide_index"].data, "value", dtype=np.int32)-old_coat["curve_count"]
            tip_socket = next(item for item in coat_object.modifiers[h.MODIFIER].node_group.interface.items_tree
                              if item.item_type == "SOCKET" and item.in_out == "INPUT" and item.name == "Tip Spread")
            identifier = tip_socket.identifier
            old_proxy, old_proxy_private = q.cross_section_proxy(old_coat, old_guides, local_ids)
            old_plane, old_plane_private = guide_nonplanarity(old_guides)
            report["control_snapshot"], report["control_child_proxy"], report["control_guide_nonplanarity"] = previous, old_proxy, old_plane
            report["control_coat_surface_proxy"] = old_surface
            case_private = {}
            for stem in args.assets:
                checks = q.CaseChecks(shared, stem)
                candidate = report["cases"][stem] = {}
                meta = checks.read_json(OUT / (stem + ".json"))
                recorded = checks.read_json(OUT / (stem + ".gn-report.json"))
                checks.check("engineering generation completed against actual saved GN5 source", recorded.get("status") == "engineering_precheck_passed"
                             and recorded.get("control_asset") == CONTROL and recorded.get("source_blend_sha256") == control_sha)
                checks.source("own GN7 wrapper matches its frozen snapshot", h.path_from(recorded["wrapper_source_snapshot"]), recorded["wrapper_source_sha256"])
                checks.check("own wrapper descriptor retains the independently supplied frozen GN7 bytes", recorded["wrapper_source_sha256"] == WRAPPER_SHA256)
                checks.source("inherited helper matches actual frozen GN5 wrapper", h.path_from(recorded["control_wrapper_source_snapshot"]), control_report["wrapper_source_sha256"])
                checks.check("inherited helper SHA descriptor agrees with actual saved GN5 source", recorded["control_wrapper_source_sha256"] == control_report["wrapper_source_sha256"])
                for role in ("record_helper", "geometry_helper"):
                    checks.source("frozen " + role + " source matches actual recorded bytes", h.path_from(recorded[role+"_source_snapshot"]), recorded[role+"_source_sha256"])
                checks.source("frozen original baseline snapshot matches recorded bytes", h.path_from(recorded["baseline_snapshot"]), recorded["baseline_source_sha256"])
                library = h.path_from(recorded["official_asset_library"], ROOT)
                checks.source("official asset library matches actual recorded bytes", library, recorded["official_asset_sha256"])
                r.render_evidence(checks, recorded, meta, stem, candidate)
                saved_sha = checks.track(h.path_from(recorded["blend"]))
                checks.check("actual saved-blend bytes match CPU final file gate", saved_sha == recorded.get("saved_blend_sha256"))
                bpy.ops.wm.open_mainfile(filepath=str(h.path_from(recorded["blend"])))
                actual = r.snapshot()
                compare_fixed_control(checks, previous, actual)
                coat, guide = bpy.context.scene.objects[h.COAT], bpy.context.scene.objects[h.GUIDE]
                source, guides, evaluated = h.native_curves(coat), h.native_curves(guide), h.native_curves(coat, evaluated=True)
                expected_positions, old_lengths = authorized_guide_positions(old_guides, CASES[stem])
                checks.check("every actual guide control equals independently reconstructed authorized GN7 formula",
                             h.array_hash(guides["positions"]) == h.array_hash(expected_positions),
                             {"expected_positions_float32_sha256": h.array_hash(expected_positions),
                              "actual_positions_float32_sha256": h.array_hash(guides["positions"]), "amplitude": CASES[stem]})
                change = recorded["guide_change"]
                checks.check("saved guide intervention descriptor agrees with actual native arrays and authorized scope",
                             change.get("mode") == "authored_spatial_return_crowns" and change.get("amplitude") == CASES[stem]
                             and change.get("object") == h.GUIDE and change.get("allowed_native_attributes") == ["position"]
                             and change.get("theta") == [.80, .92, .86] and change.get("frequency") == [1.10, 1.35, 1.60]
                             and change.get("before_positions_float32_sha256") == h.array_hash(old_guides["positions"])
                             and change.get("after_positions_float32_sha256") == h.array_hash(guides["positions"])
                             and change.get("radii_float32_sha256") == h.array_hash(guides["radii"]))
                checks.check("actual guide shape genuinely changes while every saved guide-root bit stays fixed",
                             h.array_hash(guides["positions"]) != h.array_hash(old_guides["positions"])
                             and h.array_hash(guides["roots"]) == h.array_hash(old_guides["roots"]))
                h.verify_native(checks, "actual saved spatial guides", guides, old_guides["curve_count"])
                h.verify_native(checks, "actual evaluated coat", evaluated, old_coat["curve_count"])
                checks.check("every source/evaluated coat-root bit equals actual saved GN5",
                             h.array_hash(source["roots"]) == h.array_hash(evaluated["roots"]) == h.array_hash(old_coat["roots"]))
                checks.check("derived coat position/radius hashes match newly measured case report",
                             h.array_hash(evaluated["positions"]) == recorded["coat"]["evaluated_positions_float32_sha256"]
                             and h.array_hash(evaluated["radii"]) == recorded["coat"]["evaluated_radii_float32_sha256"])
                mapping, candidate["guide_assignment"] = h.read_saved_mapping(checks, coat, guide, source, guides, recorded)
                candidate["derived_radius_response"] = q.radius_response(checks, old_coat, evaluated)
                candidate["graph"] = q.official_graph_proof(checks, coat, guide, library, identifier)
                candidate["guide_probe"] = h.guide_probe(checks, coat, guide, evaluated, old_coat["roots"], mapping)
                plane, plane_private = guide_nonplanarity(guides)
                candidate["guide_nonplanarity"], candidate["paired_guide_nonplanarity_delta"] = plane, guide_pair_delta(old_plane_private, plane_private)
                actual_lengths = h.lengths(guides["positions"], guides["offsets"], 32)
                checks.check("actual saved guide formula and arc measurements finite/positive",
                             np.isfinite(expected_positions).all() and np.isfinite(actual_lengths).all() and (actual_lengths > 0).all())
                candidate["guide_arc_length"] = {"quadrature_order": 32, "control": h.summary(old_lengths),
                                                   "candidate": h.summary(actual_lengths), "ratio_to_control": h.summary(actual_lengths/old_lengths),
                                                   "scope": "Actual guide arcs only; no normalization or old-rest/coat arc preservation is required or claimed."}
                actual_coat_arcs = h.lengths(evaluated["positions"], evaluated["offsets"], 32)
                surface, surface_private = sampled_surface_geometry(evaluated, camera_forward)
                guide_surface, _ = sampled_surface_geometry(guides, camera_forward)
                checks.check("independently measured actual coat arcs and analytic surface proxies are finite with positive arcs",
                             np.isfinite(actual_coat_arcs).all() and (actual_coat_arcs > 0).all()
                             and all(np.isfinite(values).all() for values in surface_private.values()))
                candidate["coat_arc_length"] = {"quadrature_order": 32, "candidate": h.summary(actual_coat_arcs),
                                                 "control_GN5": h.summary(old_arcs), "historical_native_rest": h.summary(rest_arcs),
                                                 "relative_change_from_control_GN5": h.summary(actual_coat_arcs/old_arcs-1),
                                                 "absolute_relative_drift_from_historical_rest": h.summary(np.abs(actual_coat_arcs/rest_arcs-1)),
                                                 "scope": "Actual saved float32 uniform Catmull-Rom with duplicated endpoints. Clump internal Preserve Length uses its pre-clump geometry; external Restore is zero. No historical native-rest preservation is required or claimed."}
                candidate["coat_surface_proxy"], candidate["guide_surface_proxy"] = surface, guide_surface
                candidate["paired_coat_surface_proxy_delta"] = guide_pair_delta(old_surface_private, surface_private)
                own_proxy, own_private = q.cross_section_proxy(evaluated, guides, mapping-evaluated["curve_count"])
                frozen_proxy, frozen_private = q.cross_section_proxy(evaluated, old_guides, mapping-evaluated["curve_count"])
                checks.check("own/frozen-frame child proxies have finite eligible slices",
                             all(value["eligible_guide_count"] > 0 for data in (own_proxy, frozen_proxy) for value in data["slices"].values())
                             and all(np.isfinite(values).all() for private in (own_private, frozen_private) for metrics in private.values()
                                     for name, values in metrics.items() if name != "eligible"))
                candidate["child_proxy_own_guide_frame"], candidate["child_proxy_frozen_GN5_guide_frame"] = own_proxy, frozen_proxy
                candidate["paired_child_proxy_own_frame_delta"] = q.paired_proxy(old_proxy_private, own_private)
                candidate["paired_child_proxy_frozen_frame_delta"] = q.paired_proxy(old_proxy_private, frozen_private)
                case_private[stem] = {"plane": plane_private, "own": own_private, "frozen": frozen_private, "surface": surface_private}
                candidate["guide_change"] = {"amplitude": CASES[stem], "allowed_native_attribute": "guide position only",
                                              "historical_rest_position": "Bitwise unchanged from saved GN5; external Restore Factor remains zero",
                                              "frame": "n=unit(root/axes^2), e1=unit(project(control5-root,n)), e2=cross(n,e1)",
                                              "prototype": "guide_id modulo3", "length_source": "Independent actual saved GN5 guide Catmull32 arc",
                                              "scope": "Both GN7 cases replace guide shape family; their mutual difference is out-of-plane amplitude only. No contact or original-rest length constraint."}
                candidate["candidate_snapshot"], candidate["guides"], candidate["evaluated_coat"] = actual, h.curve_record(guides), h.curve_record(evaluated)
                counts = {obj.name: h.native_curves(obj, evaluated=True)["curve_count"] for obj in bpy.context.scene.objects if obj.type == "CURVES" and not obj.hide_render}
                checks.check("actual rendered native hair count remains177500 with guides hidden", sum(counts.values()) == 177500, counts)
                bpy.ops.wm.open_mainfile(filepath=str(h.path_from(recorded["blend"])))
                checks.check("a second independent saved-blend reload reproduces all measured native/evaluated/GN/scene records", r.snapshot() == actual)
            if len(args.assets) == 2:
                ordered = sorted(args.assets, key=lambda stem: CASES[stem])
                before, after = (case_private[stem] for stem in ordered)
                report["two_case_comparison"] = {"before_case": ordered[0], "after_case": ordered[1],
                                                 "guide_nonplanarity_delta": guide_pair_delta(before["plane"], after["plane"]),
                                                 "coat_surface_proxy_delta": guide_pair_delta(before["surface"], after["surface"]),
                                                 "own_frame_child_proxy_delta": q.paired_proxy(before["own"], after["own"]),
                                                 "frozen_frame_child_proxy_delta": q.paired_proxy(before["frozen"], after["frozen"])}
        except Exception as error:
            shared.check("independent saved GN7 inspection completes", False, {"exception": type(error).__name__, "message": str(error)})
        finally:
            try:
                shared.preserve_inputs()
            except Exception as error:
                shared.check("read-only input preservation completes", False, {"exception": type(error).__name__, "message": str(error)})
            report["input_count"], report["check_count"] = len(shared.inputs), len(report["checks"])
            report["status"] = "failed" if report["errors"] else "passed"
            json.dump(report, stream, ensure_ascii=False, indent=2, allow_nan=False)
            stream.write("\n")
    print("PLUSH_SPATIAL_GUIDE_VALIDATION", json.dumps({"status": report["status"], "checks": report["check_count"],
          "inputs": report["input_count"], "errors": report["errors"], "report": str(output)}, ensure_ascii=False), flush=True)
    if report["errors"]:
        raise AssertionError("Saved GN7 spatial-guide verification failed: " + "; ".join(report["errors"]))


if __name__ == "__main__":
    main()
