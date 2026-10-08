/*! Anatomy adapted from Koi Pond Garden, Copyright (c) 2026 Sourany Phomhome. MIT.
 * Pinned source: 18213ec590e987f605cce6564471e6c0f9451d37.
 * License: web/upstream/KOI-LICENSE.txt. */
import { SDFK, surfaceNets, clamp, lerp, smoothstep } from "./sdf.js";
export function frogGeometry(leap){
  const S = SDFK, P3 = [0, 0, 0];
  const mkFrog = (leap) => (p) => {
    const x = p[0], y = p[1], z = Math.abs(p[2]); P3[0] = x; P3[1] = y; P3[2] = z;
    const c = Math.cos(-0.3), s = Math.sin(-0.3), tx = x + 0.006, ty = y - 0.022;
    let d = S.ellipsoid([tx * c - ty * s, tx * s + ty * c, z], [0, 0, 0], [0.034, 0.0165, 0.021]);          // torso, raised at the front
    d = S.smin(d, S.ellipsoid(P3, [-0.025, 0.016, 0], [0.022, 0.015, 0.022]), 0.01);                       // rump on the haunches
    d = S.smin(d, S.ellipsoid(P3, [0.027, 0.033, 0], [0.023, 0.0115, 0.0205]), 0.01);                     // flat head
    d = S.smin(d, S.ellipsoid(P3, [0.047, 0.03, 0], [0.013, 0.0082, 0.0125]), 0.007);                     // rounded, pointed snout
    d = S.smin(d, S.ellipsoid(P3, [0.029, 0.024, 0], [0.02, 0.0085, 0.018]), 0.008);                      // lower jaw & throat
    d = S.smin(d, S.sphere(P3, [0.029, 0.0365, 0.0098], 0.0058), 0.005);                                   // eye mounds (the eyeballs bulge above them)
    d = S.smin(d, S.cone(P3, [0.02, 0.0375, 0.0118], [-0.004, 0.0335, 0.0138], 0.0015, 0.0013), 0.002);    // dorsolateral folds, following the back
    d = S.smin(d, S.cone(P3, [-0.004, 0.0335, 0.0138], [-0.026, 0.0275, 0.0152], 0.0013, 0.001), 0.002);
    // front legs: upper arm, forearm, four slender fingers with slightly swollen tips
    d = S.smin(d, S.cone(P3, [0.018, 0.022, 0.016], [0.024, 0.01, 0.022], 0.0046, 0.0036), 0.005);
    d = S.smin(d, S.cone(P3, [0.024, 0.01, 0.022], [0.033, 0.0022, 0.02], 0.0036, 0.003), 0.002);
    for (const [a, L] of [[-0.55, 0.008], [-0.15, 0.011], [0.25, 0.01], [0.65, 0.0075]]) {
      const ex = 0.033 + Math.cos(a) * L, ez = 0.02 + Math.sin(a) * L;
      d = S.smin(d, S.cone(P3, [0.033, 0.0022, 0.02], [ex, 0.0015, ez], 0.0013, 0.0011), 0.0012);
      d = S.smin(d, S.sphere(P3, [ex, 0.0016, ez], 0.0015), 0.0006);
    }
    if (leap) {
      // mid-leap: hind legs kicked straight back, toes fanned and webbing spread
      d = S.smin(d, S.cone(P3, [-0.026, 0.016, 0.017], [-0.056, 0.011, 0.029], 0.0085, 0.0062), 0.006);
      d = S.smin(d, S.cone(P3, [-0.056, 0.011, 0.029], [-0.089, 0.006, 0.034], 0.0062, 0.0038), 0.003);
      d = S.smin(d, S.cone(P3, [-0.089, 0.006, 0.034], [-0.108, 0.0035, 0.036], 0.0038, 0.0028), 0.002);
      for (const [a, L] of [[-0.62, 0.01], [-0.3, 0.015], [0.02, 0.021], [0.33, 0.026], [0.62, 0.017]]) {
        const ex = -0.108 - Math.cos(a * 0.8) * L, ez = 0.036 + Math.sin(a * 0.8) * L;
        d = S.smin(d, S.cone(P3, [-0.108, 0.0035, 0.036], [ex, 0.003, ez], 0.0012, 0.001), 0.0012);
        d = S.smin(d, S.sphere(P3, [ex, 0.003, ez], 0.0014), 0.0006);
      }
      d = S.smin(d, S.ellipsoid(P3, [-0.122, 0.0032, 0.037], [0.011, 0.0006, 0.009]), 0.0015);
    } else {
    // hind legs folded along the body: thigh, shank, long foot, five webbed toes
    d = S.smin(d, S.cone(P3, [-0.028, 0.016, 0.017], [0.004, 0.017, 0.032], 0.0085, 0.0062), 0.006);
    d = S.smin(d, S.cone(P3, [0.004, 0.017, 0.032], [-0.034, 0.0085, 0.031], 0.006, 0.0038), 0.003);
    d = S.smin(d, S.cone(P3, [-0.034, 0.0085, 0.031], [-0.012, 0.0026, 0.043], 0.0038, 0.0028), 0.002);
    for (const [a, L] of [[-0.62, 0.01], [-0.3, 0.015], [0.02, 0.021], [0.33, 0.026], [0.62, 0.017]]) {
      const ex = -0.012 + Math.cos(a) * L, ez = 0.043 + Math.sin(a) * L;
      d = S.smin(d, S.cone(P3, [-0.012, 0.0026, 0.043], [ex, 0.0015, ez], 0.0012, 0.001), 0.0012);
      d = S.smin(d, S.sphere(P3, [ex, 0.0015, ez], 0.0014), 0.0006);
    }
    d = S.smin(d, S.ellipsoid(P3, [0.0, 0.0017, 0.052], [0.011, 0.0006, 0.009]), 0.0015);                 // toe webbing
    }
    // mouth line, nostrils and a slightly recessed tympanum
    d = S.smax(d, -S.cone(P3, [0.0585, 0.0276, 0.0], [0.012, 0.0302, 0.0205], 0.0006, 0.0008), 0.0007);
    d = S.smax(d, -S.sphere(P3, [0.0535, 0.0352, 0.0042], 0.0011), 0.0006);
    d = S.smax(d, -S.sphere([x, y, z], [0.0165, 0.0365, 0.0236], 0.0042), 0.0012);
    return d;
  };

return surfaceNets(mkFrog(leap), leap?[-.14,-.002,-.056]:[-.06,-.002,-.075],leap?[.07,.056,.056]:[.07,.056,.075],.0014);
}
export function turtleShellSDF() {
  const S = SDFK, P3 = [0, 0, 0];
  return (p) => {
    const x = p[0], y = p[1], z = p[2], az = Math.abs(z);
    P3[0] = x; P3[1] = y; P3[2] = az;
    // carapace dome: oval, a touch wider behind the middle; serrated rear marginals
    const ang = Math.atan2(az, x), rear = smoothstep(0.45, 1.0, -x / 0.112) * smoothstep(0.03, 0.02, y);
    const notch = 1 - 0.045 * rear * Math.pow(0.5 + 0.5 * Math.cos(ang * 24), 6);
    const zw = 1 + 0.05 * (-x / 0.112);
    let d = S.ellipsoid([x / notch, y, az / (zw * notch)], [0.004, 0.02, 0], [0.112, 0.058, 0.082]) * Math.min(notch, zw);
    d -= 0.0016 * Math.exp(-(az * az) / 0.0002) * clamp((y - 0.05) / 0.02, 0, 1);                       // low vertebral keel
    d = S.smax(d, 0.012 - y, 0.0025);                                                                   // flat underside of the margins
    // openings under the front and rear margins for head, limbs and tail
    d = S.smax(d, -S.ellipsoid(P3, [0.118, 0.012, 0], [0.034, 0.012, 0.046]), 0.004);
    d = S.smax(d, -S.ellipsoid(P3, [0.074, 0.012, 0.062], [0.026, 0.0095, 0.03]), 0.004);
    d = S.smax(d, -S.ellipsoid(P3, [-0.112, 0.012, 0], [0.028, 0.011, 0.05]), 0.004);
    d = S.smax(d, -S.ellipsoid(P3, [-0.074, 0.012, 0.058], [0.026, 0.0095, 0.03]), 0.004);
    // plastron: a flat plate with a truncated front lobe and a rear notch; bridges join it to the carapace
    let pl = S.smax(S.ellipsoid(P3, [0.0, 0.007, 0], [0.101, 0.02, 0.066]), Math.abs(y - 0.0072) - 0.0052, 0.003);
    pl = S.smax(pl, -S.sphere(P3, [-0.105, 0.006, 0], 0.013), 0.003);
    pl = S.smax(pl, x - 0.094, 0.006);
    pl = S.smin(pl, S.roundBox(P3, [0.0, 0.012, 0.064], [0.042, 0.006, 0.014], 0.004), 0.004);
    return S.smin(d, pl, 0.003);
  };
}
export function turtleHeadSDF() {
  const S = SDFK, P3 = [0, 0, 0];
  return (p) => {
    const x = p[0], y = p[1], z = p[2]; P3[0] = x; P3[1] = y; P3[2] = Math.abs(z);
    let d = S.cone(P3, [-0.035, -0.001, 0], [0.046, 0.004, 0], 0.0172, 0.0146);                      // neck (runs back into the shell)
    d = S.smin(d, S.ellipsoid(P3, [0.062, 0.0085, 0], [0.025, 0.015, 0.0166]), 0.009);             // cranium
    d = S.smin(d, S.ellipsoid(P3, [0.083, 0.0068, 0], [0.0145, 0.0098, 0.0102]), 0.007);             // snout
    d = S.smin(d, S.ellipsoid(P3, [0.069, -0.0005, 0], [0.023, 0.0085, 0.0128]), 0.006);             // lower jaw
    d = S.smax(d, -S.sphere(P3, [0.0765, 0.0132, 0.0112], 0.0047), 0.0014);                          // eye sockets
    d = S.smin(d, S.ellipsoid(P3, [0.0755, 0.0172, 0.0098], [0.007, 0.0026, 0.0038]), 0.002);        // brow over the eye
    d = S.smax(d, -S.cone(P3, [0.0985, 0.0036, 0], [0.058, 0.0052, 0.0138], 0.0005, 0.0009), 0.0007); // mouth line
    d = S.smax(d, -S.sphere(P3, [0.0968, 0.0092, 0.0023], 0.00085), 0.0005);                         // nostrils
    return d;
  };
}
export function turtleLegSDF(hind) {
  const S = SDFK, P3 = [0, 0, 0];
  const R = hind ? { r0: 0.0145, r1: 0.0122, r2: 0.0098, e1: 0.02, e2: 0.037, hc: 0.05, hr: [0.0145, 0.0042, 0.0148], n: 4, spread: 0.3, tip: 0.0195, claw: 0.0055 }
                 : { r0: 0.013, r1: 0.011, r2: 0.0092, e1: 0.019, e2: 0.035, hc: 0.046, hr: [0.0118, 0.0046, 0.0112], n: 5, spread: 0.25, tip: 0.0162, claw: 0.0095 };
  return (p) => {
    const x = p[0], y = p[1], z = p[2]; P3[0] = x; P3[1] = y; P3[2] = z;
    let d = S.cone(P3, [-0.016, 0, 0], [R.e1, -0.002, 0], R.r0, R.r1);
    const fp = [x, (y + 0.003) / 0.72 - 0.003, z];                                                    // flattened forearm / shank
    d = S.smin(d, S.cone(fp, [R.e1, -0.002, 0], [R.e2, -0.004, 0], R.r1, R.r2), 0.006);
    d = S.smin(d, S.ellipsoid(P3, [R.hc, -0.0045, 0], R.hr), 0.006);                                  // webbed paddle
    for (let i = 0; i < R.n; i++) {
      const a = (i - (R.n - 1) / 2) * R.spread, cx = R.hc + Math.cos(a) * R.tip, cz = Math.sin(a) * R.tip;
      d = S.smin(d, S.cone(P3, [R.hc + Math.cos(a) * 0.006, -0.0045, Math.sin(a) * 0.006], [cx, -0.0048, cz], 0.0026, 0.0019), 0.002);
      const ex = cx + Math.cos(a) * R.claw, ez = cz + Math.sin(a) * R.claw;                          // curved claws
      d = S.smin(d, S.cone(P3, [cx, -0.0048, cz], [lerp(cx, ex, 0.6), -0.0052, lerp(cz, ez, 0.6)], 0.0016, 0.001), 0.0008);
      d = S.smin(d, S.cone(P3, [lerp(cx, ex, 0.6), -0.0052, lerp(cz, ez, 0.6)], [ex, -0.0078, ez], 0.001, 0.00028), 0.0005);
    }
    return d;
  };
}
export function turtleTailSDF() {
  const S = SDFK;
  return (p) => S.cone(p, [-0.012, 0, 0], [0.042, -0.004, 0], 0.0092, 0.0012);
}
