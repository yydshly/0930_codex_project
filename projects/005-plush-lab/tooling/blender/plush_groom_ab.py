"""Controlled coat-only root-target versus curve-target clumping experiment.

Blender examples (all other arguments are forwarded to the frozen v3 script):
  blender -b --python-exit-code 1 --python plush_groom_ab.py -- --mode root --kind character --variant reference --resolution 768 --samples 96
  blender -b --python-exit-code 1 --python plush_groom_ab.py -- --mode curve --kind character --variant reference --resolution 768 --samples 96

The default new tags are ab-root-1 and ab-curve-1. Curve mode additionally
supports --profile early: beta = .90 * smoothstep(clamp(t / .60, 0, 1)).
The soft-tip profile gathers the middle, then weakens guide attraction at the tip.
Its deformation starts from X, not from the already clumped A. The default
late profile retains the original A/B calculation path. Add --no-render to generate
only editable scenes and diagnostics. Existing output files are never replaced.
Only the coat clump target changes. Generated length samples stay fixed; actual
Catmull-Rom arc lengths may change and are measured. Curve mode can optionally
use --preserve-arc-length for root-fixed geometric length normalization. This
is uniform curve scaling, not FTL, a physical solve, or a complete Houdini groom.
Each run exclusively saves both the baseline .source.py and wrapper .ab-source.py.
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
BASELINE_META = OUT / "character-reference-v3.json"
BASELINE_SHA256 = "69df6504ddc4412c1279f7f40f2baa8ae45fbedc6649e64cdc7cb1d175039dc3"
MEMBERS = 32
COAT_SEED = 51


def digest_bytes(data):
    return hashlib.sha256(data).hexdigest()


def array_digest(values, dtype):
    """Hash the representation actually written by native_curves."""
    return digest_bytes(np.ascontiguousarray(values, dtype=dtype).tobytes())


def summary(values):
    values = np.asarray(values, dtype=np.float64)
    return {
        "minimum": float(values.min()), "maximum": float(values.max()),
        "mean": float(values.mean()), "median": float(np.median(values)),
        "p95": float(np.percentile(values, 95)),
        "p99": float(np.percentile(values, 99)),
    }


def load_baseline():
    source = BASELINE.read_bytes()
    metadata = json.loads(BASELINE_META.read_text(encoding="utf-8"))
    actual_hash = digest_bytes(source)
    if actual_hash != BASELINE_SHA256 or metadata["source_sha256"] != BASELINE_SHA256:
        raise RuntimeError("Frozen v3 source or metadata SHA256 changed; refusing a drifting baseline")
    spec = importlib.util.spec_from_file_location("_plush_cycles_ab_frozen_v3", BASELINE)
    if spec is None or spec.loader is None:
        raise RuntimeError("Unable to import the frozen v3 source snapshot")
    module = importlib.util.module_from_spec(spec)
    # SourceFileLoader must not create a cache alongside the historical asset.
    previous_bytecode = sys.dont_write_bytecode
    sys.dont_write_bytecode = True
    try:
        spec.loader.exec_module(module)
    finally:
        sys.dont_write_bytecode = previous_bytecode
    return module


def replay_coat_roots(base, count, swatch, preset):
    """Replay only the frozen groom's initial draws with an independent RNG."""
    rng = np.random.default_rng(COAT_SEED)
    groups = math.ceil(count / MEMBERS)
    theta_g = np.arccos(rng.uniform(-.998, .998, groups))
    angle_g = rng.uniform(0, math.tau, groups)
    theta = np.repeat(theta_g, MEMBERS)[:count]
    angle = np.repeat(angle_g, MEMBERS)[:count]
    scale = .54 if swatch else 1
    root_spread = (.018 if preset["clump"] > .8 else .023) / scale
    theta += rng.normal(0, root_spread, count)
    angle += rng.normal(0, root_spread, count) / np.maximum(np.sin(theta), .20)
    theta = np.clip(theta, .0002, math.pi - .0002)
    roots, normals = base.surface_frame(theta, angle, swatch)
    group_roots, _ = base.surface_frame(theta_g, angle_g, swatch)
    return roots, normals, group_roots


def catmull_rom_lengths(points, quadrature_order=32, batch_size=4096):
    """Numerically integrate the saved noncyclic native Catmull-Rom spline.

    Uses Blender's uniform cardinal basis (tension 1/2) and duplicated endpoint
    controls, as in blender/blenkernel/intern/curve_catmull_rom.cc. Integration
    is performed on float32 saved controls, promoted per batch for arithmetic.
    This measures geometric arc length rather than the generated parameter L.
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


def normalize_arc_lengths(reference, points, reference_lengths=None, point_lengths=None,
                          relative_tolerance=1e-4):
    """Root-fixed uniform scaling, measured on the final float32 spline controls.

    Catmull-Rom interpolation is linear in its controls, so scaling every control
    about a fixed root scales spline arc length by the same factor before float32
    rounding. One extra scale correction is allowed if saved-point rounding
    exceeds the requested relative tolerance. No segment/FTL or physical solve.
    """
    reference = np.asarray(reference, dtype=np.float32)
    points = np.asarray(points, dtype=np.float32)
    if reference.shape != points.shape or points.ndim != 3 or points.shape[-1] != 3:
        raise ValueError("Arc normalization requires matching (curves, points, 3) controls")
    if not np.all(np.isfinite(reference)) or not np.all(np.isfinite(points)):
        raise ValueError("Arc normalization requires finite controls")
    if not np.array_equal(reference[:, 0].view(np.uint32), points[:, 0].view(np.uint32)):
        raise ValueError("Arc normalization requires the original float32 roots")
    target_lengths = (catmull_rom_lengths(reference) if reference_lengths is None
                      else np.asarray(reference_lengths, dtype=np.float64))
    initial_lengths = (catmull_rom_lengths(points) if point_lengths is None
                       else np.asarray(point_lengths, dtype=np.float64))
    if (not np.all(np.isfinite(target_lengths)) or not np.all(np.isfinite(initial_lengths))
            or np.any(target_lengths <= 0) or np.any(initial_lengths <= 0)):
        raise ValueError("Arc normalization requires finite, positive spline lengths")
    fixed_roots = reference[:, :1].astype(np.float64)

    def scale_about_roots(controls, scales):
        result = (fixed_roots + scales[:, None, None]
                  * (controls.astype(np.float64) - fixed_roots)).astype(np.float32)
        # Explicit assignment also preserves signed-zero/root bits exactly.
        result[:, 0] = reference[:, 0]
        return result

    scales = target_lengths / initial_lengths
    normalized = scale_about_roots(points, scales)
    normalized_lengths = catmull_rom_lengths(normalized)
    first_relative_error = (normalized_lengths - target_lengths) / target_lengths
    first_maximum_error = float(np.max(np.abs(first_relative_error)))
    corrections = np.ones(len(points), dtype=np.float64)
    correction_iterations = 0
    if first_maximum_error > relative_tolerance:
        corrections = target_lengths / normalized_lengths
        normalized = scale_about_roots(normalized, corrections)
        normalized_lengths = catmull_rom_lengths(normalized)
        correction_iterations = 1
    final_relative_error = (normalized_lengths - target_lengths) / target_lengths
    maximum_error = float(np.max(np.abs(final_relative_error)))
    finite = bool(np.all(np.isfinite(normalized)) and np.all(np.isfinite(normalized_lengths)))
    roots_identical = bool(np.array_equal(normalized[:, 0].view(np.uint32),
                                         reference[:, 0].view(np.uint32)))
    root_error = float(np.max(np.abs(normalized[:, 0] - reference[:, 0])))
    if not finite or not roots_identical or maximum_error > relative_tolerance:
        raise AssertionError("Geometric length normalization failed its saved-float32 constraints")
    return normalized, normalized_lengths, {
        "applied": True,
        "method": "Root-fixed whole-curve uniform scale; geometric length normalization, not FTL, a physical solve, or a complete Houdini groom",
        "formula": "Y_i = p_i + (L_A_i / L_B_i) * (B_i - p_i)",
        "length_basis": "Saved float32 Catmull-Rom controls; 32-point Gauss-Legendre per segment",
        "initial_scale": summary(scales),
        "cumulative_scale": summary(scales * corrections),
        "correction_scale": summary(corrections),
        "correction_iterations": correction_iterations,
        "first_pass_absolute_relative_drift_max": first_maximum_error,
        "final_absolute_relative_drift_max": maximum_error,
        "final_absolute_length_drift_max": float(np.max(np.abs(normalized_lengths - target_lengths))),
        "relative_tolerance": relative_tolerance,
        "final_roots_float32_bitwise_identical": roots_identical,
        "final_root_error_max": root_error,
        "final_controls_and_lengths_finite": finite,
    }


def curve_int_attribute(data, name, values):
    attribute = data.attributes.new(name, "INT", "CURVE")
    attribute.data.foreach_set("value", np.asarray(values, dtype=np.int32))


def install_interceptor(base, options, mode, profile, report, preserve_arc_length=False):
    original = base.native_curves
    preset = base.PRESETS[options.variant]
    swatch = options.kind == "swatch"

    def intercept(name, points, radii, mat):
        if name != "Blue pile · coat":
            report["unchanged_objects"][name] = {
                "curve_count": int(len(points)),
                "positions_float32_sha256": array_digest(points, np.float32),
                "radii_float32_sha256": array_digest(radii, np.float32),
            }
            return original(name, points, radii, mat)
        if "coat" in report:
            raise RuntimeError("Expected exactly one coat object")
        a_points = np.asarray(points, dtype=np.float64)
        count, point_count, _ = a_points.shape
        roots = a_points[:, 0].copy()
        replayed_roots, normals, group_roots = replay_coat_roots(base, count, swatch, preset)
        root_replay_error = float(np.linalg.norm(roots - replayed_roots, axis=-1).max())
        if root_replay_error > 1e-12:
            raise AssertionError("Replayed coat roots do not match the frozen v3 draws")
        guide_ids = np.arange(count, dtype=np.int32) // MEMBERS
        guide_roots = group_roots[guide_ids]
        attraction = guide_roots - roots
        attraction -= np.sum(attraction * normals, axis=-1)[:, None] * normals
        t = np.linspace(0, 1, point_count)[None, :, None]
        alpha = preset["clump"] * t * t
        if profile == "early":
            profile_parameter = np.clip(t / .60, 0, 1)
            beta = .90 * profile_parameter**2 * (3 - 2 * profile_parameter)
            profile_function = "beta(t) = .90 * smoothstep(clamp(t / .60, 0, 1))"
            midpoint_parameter = min(.5 / .60, 1.)
            midpoint_tightness = .90 * midpoint_parameter**2 * (3 - 2 * midpoint_parameter)
            tip_tightness = .90
        elif profile == "soft-tip":
            gather_parameter = np.clip(t / .52, 0, 1)
            release_parameter = np.clip((t - .55) / .45, 0, 1)
            beta = .88 * gather_parameter**2 * (3 - 2 * gather_parameter) * (
                1 - .30 * release_parameter**2 * (3 - 2 * release_parameter))
            profile_function = (
                "beta(t) = .88 * smoothstep(clamp(t / .52, 0, 1)) * "
                "(1 - .30 * smoothstep(clamp((t - .55) / .45, 0, 1)))")
            midpoint_parameter = .5 / .52
            midpoint_tightness = .88 * midpoint_parameter**2 * (3 - 2 * midpoint_parameter)
            tip_tightness = .88 * (1 - .30)
        else:
            beta = alpha
            profile_function = "alpha(t) = preset.clump * t^2; unchanged from v3"
            midpoint_tightness = preset["clump"] * .25
            tip_tightness = preset["clump"]
        # A is the exact incoming frozen native_curves input. Undo only its
        # root attraction to recover X, retaining every original random sample.
        x_points = a_points - alpha * attraction[:, None, :]
        distance_squared = np.sum((roots - guide_roots)**2, axis=-1)
        padded_distances = np.full(len(group_roots) * MEMBERS, np.inf)
        padded_distances[:count] = distance_squared
        representative = (np.arange(len(group_roots)) * MEMBERS
                          + np.argmin(padded_distances.reshape(-1, MEMBERS), axis=1))
        guide_displacement = x_points[representative] - roots[representative, None, :]
        guide_points = group_roots[:, None, :] + guide_displacement
        b_points = a_points.copy()
        residual_checks = []
        for start in range(0, count, 4096):
            end = min(start + 4096, count)
            member_displacement = x_points[start:end] - roots[start:end, None, :]
            target_displacement = guide_displacement[guide_ids[start:end]]
            if profile in ("early", "soft-tip"):
                # Undo A's old root clump first. Adding beta to A would retain
                # its old alpha*D and accidentally double the root attraction.
                b_points[start:end] = x_points[start:end] + beta * (
                    attraction[start:end, None, :] + target_displacement - member_displacement)
            else:
                # Keep this original late-path arithmetic unchanged so the
                # saved A/B coat controls remain byte-identical to round one.
                b_points[start:end] += alpha * (target_displacement - member_displacement)
            # After subtracting the current profile's root attraction, the
            # guide-shape residual must become (1-beta) of the X residual.
            actual_residual = (b_points[start:end] - roots[start:end, None, :]
                               - beta * attraction[start:end, None, :] - target_displacement)
            expected_residual = (1 - beta) * (member_displacement - target_displacement)
            residual_checks.append(float(np.max(np.abs(actual_residual - expected_residual))))
        root_error = float(np.linalg.norm(b_points[:, 0] - a_points[:, 0], axis=-1).max())
        reconstruction_error = float(np.max(np.abs(
            a_points - (x_points + alpha * attraction[:, None, :]))))
        formula_error = max(residual_checks)
        if root_error != 0 or reconstruction_error > 1e-12 or formula_error > 1e-12:
            raise AssertionError("Coat root or target-replacement numerical check failed")
        if not np.all(np.isfinite(b_points)):
            raise AssertionError("Curve-target coat contains nonfinite controls")
        saved_a, saved_b = a_points.astype(np.float32), b_points.astype(np.float32)
        length_a = catmull_rom_lengths(saved_a)
        length_b = catmull_rom_lengths(saved_b)
        # Check quadrature convergence on a deterministic subset without
        # changing native control points or the render's curve resolution.
        subset = np.linspace(0, count - 1, min(count, 2048), dtype=np.int64)
        length_a16 = catmull_rom_lengths(saved_a[subset], quadrature_order=16)
        length_b16 = catmull_rom_lengths(saved_b[subset], quadrature_order=16)
        drift = length_b - length_a
        relative_drift = drift / np.maximum(length_a, 1e-15)
        post_saved_b, post_length_b = saved_b, length_b
        normalization = {"applied": False, "scope": "Actual geometric arc length may change"}
        if preserve_arc_length:
            post_saved_b, post_length_b, normalization = normalize_arc_lengths(
                saved_a, saved_b, reference_lengths=length_a, point_lengths=length_b)
        post_drift = post_length_b - length_a
        post_relative_drift = post_drift / np.maximum(length_a, 1e-15)
        output_points = a_points if mode == "root" else b_points
        if preserve_arc_length:
            output_points = post_saved_b
        coat = original(name, output_points, radii, mat)
        curve_int_attribute(coat.data, "guide_id", guide_ids)
        guides = original("Blue pile · hidden coat guides", guide_points, radii[representative], mat)
        guides.hide_render = True
        guides.hide_viewport = True
        curve_int_attribute(guides.data, "guide_id", np.arange(len(group_roots), dtype=np.int32))
        curve_int_attribute(guides.data, "source_member_index", representative)
        guides["purpose"] = "Independent pre-clump coat guide shapes; hidden from both A/B renders"
        guides["selection"] = "Closest existing member root to each frozen group root"
        coat["guide_object"] = guides.name
        coat["groom_ab_mode"] = mode
        coat["groom_ab_profile"] = profile_function
        base.bpy.context.scene["groom_ab_mode"] = mode
        base.bpy.context.scene["groom_ab_baseline_sha256"] = BASELINE_SHA256
        base.bpy.context.scene["groom_ab_length_scope"] = (
            "Root-fixed geometric arc length normalization; saved float32 relative error <= 1e-4"
            if preserve_arc_length else "Generated L samples fixed; actual arc length not preserved")
        stored_positions = np.empty(count * point_count * 3, dtype=np.float32)
        coat.data.position_data.foreach_get("vector", stored_positions)
        stored_positions = stored_positions.reshape(count, point_count, 3)
        stored_root_error = float(np.max(np.abs(stored_positions[:, 0] - saved_a[:, 0])))
        if stored_root_error != 0:
            raise AssertionError("Native saved coat roots changed")
        if preserve_arc_length and not np.array_equal(stored_positions.view(np.uint32),
                                                       post_saved_b.view(np.uint32)):
            raise AssertionError("Native saved coat differs from the length-normalized float32 controls")
        report["coat"] = {
            "curve_count": int(count), "points_per_curve": int(point_count),
            "guide_count": int(len(group_roots)), "members_per_group": MEMBERS,
            "seed": COAT_SEED, "clump_factor": preset["clump"],
            "alpha_profile": "preset.clump * t^2",
            "profile": profile, "profile_function": profile_function,
            "midpoint_tightness_t_0_5": midpoint_tightness,
            "tip_tightness_t_1": tip_tightness,
            "residual_formula": "pre_normalization B - p_i - beta*D_i - U_guide = (1-beta)*(U_i-U_guide)",
            "residual_scope": "Only the pre-normalization B satisfies this identity; root-fixed length scaling is a subsequent geometric constraint",
            "guide_object": guides.name, "guides_hide_render": bool(guides.hide_render),
            "guides_hide_viewport": bool(guides.hide_viewport),
            "guide_mapping_attribute": "guide_id (INT, CURVE domain; indexes hidden guide object)",
            "guide_id_sha256": array_digest(guide_ids, np.int32),
            "representative_member_sha256": array_digest(representative, np.int32),
            "root_replay_error_max": root_replay_error,
            "b_vs_a_root_error_max": root_error,
            "native_vs_a_root_error_max": stored_root_error,
            "a_reconstruction_error_max": reconstruction_error,
            "target_replacement_residual_error_max": formula_error,
            "a_positions_float32_sha256": array_digest(saved_a, np.float32),
            "b_positions_float32_sha256": array_digest(saved_b, np.float32),
            "pre_normalization_positions_float32_sha256": array_digest(saved_b, np.float32),
            "post_normalization_positions_float32_sha256": array_digest(post_saved_b, np.float32),
            "output_positions_float32_sha256": array_digest(stored_positions, np.float32),
            "unchanged_radii_float32_sha256": array_digest(radii, np.float32),
            "arc_normalization": normalization,
            "arc_length": {
                "method": "Gauss-Legendre integration of noncyclic uniform Catmull-Rom spline with duplicated end controls, using saved float32 positions",
                "quadrature_order": 32,
                "native_basis_source": "https://raw.githubusercontent.com/blender/blender/main/source/blender/blenkernel/intern/curve_catmull_rom.cc",
                "a": summary(length_a), "b": summary(length_b),
                "b_minus_a": summary(drift),
                "b_minus_a_relative": summary(relative_drift),
                "absolute_relative_drift_p95": float(np.percentile(np.abs(relative_drift), 95)),
                "pre_normalization": {
                    "b": summary(length_b), "b_minus_a": summary(drift),
                    "b_minus_a_relative": summary(relative_drift),
                    "absolute_relative_drift_max": float(np.max(np.abs(relative_drift))),
                },
                "post_normalization": {
                    "b": summary(post_length_b), "b_minus_a": summary(post_drift),
                    "b_minus_a_relative": summary(post_relative_drift),
                    "absolute_relative_drift_p95": float(np.percentile(np.abs(post_relative_drift), 95)),
                    "absolute_relative_drift_max": float(np.max(np.abs(post_relative_drift))),
                    "scope": "Candidate B after optional normalization; curve mode renders this candidate, root mode renders A",
                },
                "quadrature_check_subset_count": int(len(subset)),
                "a_order16_vs32_absolute_max": float(np.max(np.abs(length_a16 - length_a[subset]))),
                "b_order16_vs32_absolute_max": float(np.max(np.abs(length_b16 - length_b[subset]))),
                "scope": ("Generated L samples unchanged. Root-fixed whole-curve geometric scaling preserves A's measured arc lengths within 1e-4 relative error; pre-normalization and post-normalization results are separate."
                          if preserve_arc_length else
                          "Generated L samples unchanged. Actual geometric arc length may change; no length restoration is applied."),
            },
        }
        return coat

    base.native_curves = intercept


def parse_experiment_args(cli):
    """Parse wrapper-only switches without importing or running Blender."""
    parser = argparse.ArgumentParser(add_help=False, allow_abbrev=False)
    parser.add_argument("--mode", choices=["root", "curve"], default="root")
    parser.add_argument("--profile", choices=["late", "early", "soft-tip"], default="late")
    parser.add_argument("--preserve-arc-length", action="store_true")
    experiment, forwarded = parser.parse_known_args(cli)
    if experiment.profile != "late" and experiment.mode != "curve":
        parser.error(f"--profile {experiment.profile} is only available with --mode curve")
    if experiment.preserve_arc_length and experiment.mode != "curve":
        parser.error("--preserve-arc-length is only available with --mode curve")
    return experiment, forwarded


def main():
    cli = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    experiment, forwarded = parse_experiment_args(cli)
    if not any(argument == "--tag" or argument.startswith("--tag=") for argument in forwarded):
        forwarded += ["--tag", f"ab-{experiment.mode}-1"]
    base = load_baseline()
    previous_argv = sys.argv
    sys.argv = [str(Path(__file__)), "--", *forwarded]
    try:
        options = base.args()
        if options.density <= 0 or not math.isfinite(options.density):
            raise ValueError("A/B density must be finite and positive")
        if int((85000 if options.kind == "swatch" else 320000) * options.density) < 1:
            raise ValueError("A/B density must produce at least one coat curve")
        name = f"{options.kind}-{options.variant}-{options.tag}"
        report_path = OUT / (name + ".ab-report.json")
        wrapper_snapshot_path = OUT / (name + ".ab-source.py")
        output_paths = [OUT / (name + suffix) for suffix in (
            ".blend", ".png", ".json", ".source.py", ".ab-source.py", ".ab-report.json",
        )]
        existing = [str(path) for path in output_paths if path.exists()]
        if existing:
            raise FileExistsError("A/B output already exists; choose a new --tag: " + ", ".join(existing))
        current_source = ROOT / "tooling" / "blender" / "plush_cycles.py"
        current_hash = digest_bytes(current_source.read_bytes()) if current_source.is_file() else None
        wrapper_source_bytes = Path(__file__).read_bytes()
        report = {
            "status": "running", "mode": experiment.mode,
            "profile": experiment.profile, "name": name,
            "preserve_arc_length": experiment.preserve_arc_length,
            "report": report_path.name,
            "baseline_source": str(BASELINE.relative_to(ROOT)),
            "baseline_sha256": BASELINE_SHA256,
            "current_plush_cycles_sha256": current_hash,
            "current_source_matches_frozen_v3": current_hash == BASELINE_SHA256,
            "wrapper_source": str(Path(__file__).relative_to(ROOT)),
            "wrapper_source_snapshot": wrapper_snapshot_path.name,
            "wrapper_sha256": digest_bytes(wrapper_source_bytes),
            "forwarded_arguments": forwarded,
            "formula": {
                "A": "X_i(t) + alpha(t) * D_i",
                "B": ("X_i(t) + beta(t) * (D_i + U_guide(t) - (X_i(t) - p_i))"
                      if experiment.profile in ("early", "soft-tip") else
                      "A_i(t) + alpha(t) * (U_guide(t) - (X_i(t) - p_i))"),
                "D_i": "Tangential projection of group_root - member_root, exactly as v3",
                "guide": "group_root + (X_representative(t) - representative_root)",
                "representative": "Deterministically nearest existing member root to group root",
                "post_B": ("Y_i = p_i + (L_A_i / L_B_i) * (B_i - p_i); optional one float32 length correction"
                           if experiment.preserve_arc_length else "B_i unchanged; no length normalization"),
            },
            "controls": "Frozen v3 source, random samples, roots, group membership, generated L/curl/phase/lean, radii, curve count, non-coat layers, materials, density, camera, lights and Cycles settings are unchanged between modes with the same forwarded arguments.",
            "length_scope": ("Root-fixed whole-curve geometric length normalization; final saved-float32 measured relative error <= 1e-4. This is not FTL, a physical solve, or a complete Houdini groom."
                             if experiment.preserve_arc_length else
                             "Only generated length samples are fixed; actual Catmull-Rom arc lengths may change."),
            "unchanged_objects": {},
        }
        install_interceptor(base, options, experiment.mode, experiment.profile, report,
                            preserve_arc_length=experiment.preserve_arc_length)
        OUT.mkdir(exist_ok=True)
        # Freeze the wrapper before base.main creates the independently pinned
        # baseline snapshot. Exclusive creation protects all prior experiments.
        with wrapper_snapshot_path.open("xb") as wrapper_snapshot:
            wrapper_snapshot.write(wrapper_source_bytes)
        # Reserve the report exclusively before base.main writes any artifact.
        # It remains as a failure record if scene generation or rendering fails.
        with report_path.open("x", encoding="utf-8") as report_file:
            try:
                base.main()
                if "coat" not in report:
                    raise AssertionError("Frozen baseline did not create the intercepted coat")
                report["status"] = "passed"
                report["rendered"] = not options.no_render
            except Exception as error:
                report["status"] = "failed"
                report["error"] = f"{type(error).__name__}: {error}"
                raise
            finally:
                json.dump(report, report_file, ensure_ascii=False, indent=2)
                report_file.write("\n")
        print("PLUSH_GROOM_AB_RESULT", json.dumps({
            "status": report["status"], "mode": experiment.mode,
            "profile": experiment.profile,
            "preserve_arc_length": experiment.preserve_arc_length,
            "name": name, "report": str(report_path),
            "coat_curves": report["coat"]["curve_count"],
            "guide_curves": report["coat"]["guide_count"],
            "actual_length_change_absolute_relative_p95": report["coat"]["arc_length"]["post_normalization"]["absolute_relative_drift_p95"],
            "actual_length_change_absolute_relative_max": report["coat"]["arc_length"]["post_normalization"]["absolute_relative_drift_max"],
        }, ensure_ascii=False), flush=True)
    finally:
        sys.argv = previous_argv


if __name__ == "__main__":
    main()
