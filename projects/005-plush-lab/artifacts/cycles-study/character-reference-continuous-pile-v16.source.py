"""Complete plush character: continuous small-scale crimped pile.

Native editable Hair Curves, physically rendered by Cycles. The authoring
recipe uses clustered roots, variable 3D curls and secondary fibers; it is
not a reconstruction of the reference or a Houdini solver implementation.
Existing assets are read only. New outputs always have a distinct stem.
"""
import argparse
import hashlib
import json
import math
import runpy
import sys
import time
from pathlib import Path

import bpy
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'artifacts' / 'cycles-study'
STEM = 'character-reference-continuous-pile-v16'
BASE = 'character-reference-guide-v6.blend'
SOURCE = 'character-reference-v3.source.py'


def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def dump(path, value):
    with path.open('x', encoding='utf-8') as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)


def normalized(v):
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-10)


def frame(n, angle):
    u = np.cross(n, np.broadcast_to([0., 0., 1.], n.shape))
    pole = np.linalg.norm(u, axis=-1) < .05
    u[pole] = np.cross(n[pole], [0., 1., 0.])
    u = normalized(u)
    v = np.cross(n, u)
    return (u * np.cos(angle)[:, None] + v * np.sin(angle)[:, None],
            -u * np.sin(angle)[:, None] + v * np.cos(angle)[:, None])


def compression(p):
    x, y, z = p.T
    hem = .850 + .115*np.exp(-((x+.61)/.27)**2) + .180*np.exp(-((x-.63)/.27)**2)
    result = np.where((z > hem-.055) & (np.abs(x+.17) < 1.04), .22, 1.)
    for ex in [-.43, .27]:
        socket = np.exp(-((x-ex)/.100)**2 - ((z-.21)/.135)**2)
        result *= 1-.76*socket*(y < -.45)
    # Avoid fibers below the physical floor at the bottom of the character.
    result *= np.clip((z+1.175)/.06, .18, 1.)
    return result


def stats(array):
    return {key: float(value) for key, value in zip(
        ['min', 'p10', 'median', 'p90', 'max'],
        np.percentile(array, [0, 10, 50, 90, 100]))}


def attach_attributes(ob, ids, tones):
    for name, array in [('main_clump_id', ids), ('material_index', tones)]:
        a = ob.data.attributes.new(name, 'INT', 'CURVE')
        a.data.foreach_set('value', np.asarray(array, np.int32))


def create_fleece(h, materials):
    rng = np.random.default_rng(2026100316)
    groups, members, k = 26000, 32, 24
    # Do not omit a cap around the front-facing parameter pole: that omission
    # previously left a small smooth backing patch between the eyes.
    gt = np.arccos(rng.uniform(-.999999, .999999, groups))
    ga = rng.uniform(0, math.tau, groups)
    gp, gn = h['surface_frame'](gt, ga, False)
    flow = math.pi/2 + .30*np.sin(gp[:, 0]*8+gp[:, 2]*6) + rng.normal(0, .55, groups)
    gu, gv = frame(gn, flow)
    # Small low curls interleave into a continuous textile surface. Occasional
    # longer fibers break the smooth outline without making tall round islands.
    category = rng.choice(3, groups, p=[.22, .68, .10])
    height = np.choose(category, [rng.uniform(.018, .025, groups),
                                rng.uniform(.025, .034, groups),
                                rng.uniform(.035, .045, groups)])
    radius = rng.uniform(.004, .0085, groups)
    turns = rng.uniform(4.4, 8.0, groups)
    phase = rng.uniform(0, math.tau, groups)
    lean = rng.uniform(.009, .023, groups)
    tone = rng.integers(0, len(materials), groups, dtype=np.int32)
    spread = rng.uniform(.006, .011, groups)
    gc = compression(gp)
    t = np.linspace(0, 1, k)[None, :, None]
    envelope = np.sin(t*math.pi/2)
    q = phase[:, None, None] + turns[:, None, None]*t
    rise = height[:, None, None]*(.85*t+.10*np.sin(math.pi*t))
    # Tilt each crimp through the normal/tangent plane instead of winding all
    # children around a high domed guide parallel to the skin.
    curl_u = radius[:, None, None]*(np.sin(q)-np.sin(phase)[:, None, None])*envelope
    curl_v = .40*radius[:, None, None]*(np.cos(q)-np.cos(phase)[:, None, None])*envelope
    rise += .48*radius[:, None, None]*(np.cos(q)-np.cos(phase)[:, None, None])*envelope
    guide = gp[:, None] + gc[:, None, None]*(gn[:, None]*rise +
             gu[:, None]*(curl_u+lean[:, None, None]*t*t) + gv[:, None]*curl_v)
    guide[:, 0] = gp
    guide_radius = np.full((groups, k), .0003, np.float32)
    guide_ob = h['native_curves']('Fleece · editable main curl guides', guide, guide_radius, materials[0])
    guide_ob.hide_render = True
    guide_ob.hide_set(True)
    attach_attributes(guide_ob, np.arange(groups), tone)
    points = np.empty((groups*members, k, 3), np.float32)
    radii = np.empty((groups*members, k), np.float32)
    normals = np.empty((groups*members, 3), np.float32)
    for start in range(0, groups, 128):
        stop = min(start+128, groups)
        g = np.repeat(np.arange(start, stop), members)
        n = len(g)
        ct = gt[g]+rng.normal(0, spread[g], n)
        ca = ga[g]+rng.normal(0, spread[g], n)/np.maximum(np.sin(ct), .2)
        roots, ns = h['surface_frame'](np.clip(ct, .0002, math.pi-.0002), ca, False)
        cc = compression(roots)
        delta = guide[g]-gp[g, None]
        delta *= (cc/np.maximum(gc[g], 1e-6))[:, None, None]
        # Four loose subclusters preserve fine individual curves.
        secondary = np.tile(np.arange(members)//8, stop-start)
        subphase = secondary*2.399963 + phase[g]
        subwidth = rng.uniform(.0007, .0020, n)
        # Partially gather roots, release the outer end instead of a single tip.
        gather = .20*(1-np.exp(-5*t))*(1-.60*t**5)
        tangent = gp[g]-roots
        tangent -= ns*np.sum(tangent*ns, axis=-1)[:, None]
        child = roots[:, None] + delta*rng.uniform(.78, 1.20, n)[:, None, None]
        child += tangent[:, None]*gather
        micro = subphase[:, None, None]+t*rng.uniform(6., 10., n)[:, None, None]
        w = subwidth[:, None, None]*np.sin(math.pi*t/2)*cc[:, None, None]
        child += w*(gu[g, None]*np.sin(micro)+gv[g, None]*np.cos(micro))
        child += ns[:, None]*(w*.55*np.sin(micro*.76))
        child[:, 0] = roots
        lo, hi = start*members, stop*members
        points[lo:hi] = child
        thickness = rng.uniform(.00017, .00029, n)
        radii[lo:hi] = thickness[:, None]*(1-.89*np.linspace(0, 1, k)[None]**2)
        radii[lo:hi, -1] = .000018
        normals[lo:hi] = ns
    if not np.isfinite(points).all() or not np.isfinite(radii).all() or np.any(radii <= 0):
        raise RuntimeError('Native full fleece has invalid geometry')
    coat = h['native_curves']('Blue pile · continuous fine crimps', points, radii, materials[0])
    for mat in materials[1:]:
        coat.data.materials.append(mat)
    attach_attributes(coat, np.repeat(np.arange(groups), members), np.repeat(tone, members))
    peak = np.sum((points-points[:, 0, None])*normals[:, None], axis=2).max(axis=1)
    arc = np.linalg.norm(np.diff(points, axis=1), axis=2).sum(axis=1)
    result = {'main_clumps': groups, 'children_per_clump': members, 'strand_count': len(points),
              'controls_per_strand': k, 'main_curl_radius': stats(radius),
              'uncompressed_tuft_height': stats(height), 'evaluated_normal_height': stats(peak),
              'polyline_arc_length': stats(arc), 'finite_positive_radii': True,
              'positions_sha256': hashlib.sha256(points.tobytes()).hexdigest(),
              'radius_sha256': hashlib.sha256(radii.tobytes()).hexdigest()}
    return result


def loose_fibers(h, mat, count, length, seed, name):
    rng = np.random.default_rng(seed)
    k = 20 if length > .03 else 10
    theta = np.arccos(rng.uniform(-.999999, .999999, count))
    angle = rng.uniform(0, math.tau, count)
    p, n = h['surface_frame'](theta, angle, False)
    u, v = frame(n, rng.uniform(0, math.tau, count))
    t = np.linspace(0, 1, k)[None, :, None]
    L = rng.uniform(.55, 1.45, count)[:, None, None]*length*compression(p)[:, None, None]
    wave = rng.uniform(0, math.tau, count)[:, None, None]+t*5.3
    delta = n[:, None]*L*(t-.30*t*t)
    delta += u[:, None]*L*(.24*t*t+.10*np.sin(wave)*np.sin(math.pi*t))
    delta += v[:, None]*L*.14*np.sin(wave*1.13)*np.sin(math.pi*t)
    r = rng.uniform(.00016, .00028, count)[:, None]*(1-.94*np.linspace(0, 1, k)[None]**1.6)
    h['native_curves'](name, p[:, None]+delta, r, mat)


def render(stage):
    report = json.loads((OUT/(STEM+'.groom.json')).read_text(encoding='utf-8'))
    if sha(OUT/(STEM+'.blend')) != report['blend_sha256'] or sha(Path(__file__)) != report['source_sha256']:
        raise RuntimeError('Saved render inputs changed')
    suffix = '.preview' if stage == 'preview' else ''
    png = OUT/(STEM+suffix+'.png')
    if png.exists():
        raise FileExistsError(png)
    bpy.ops.wm.open_mainfile(filepath=str(OUT/(STEM+'.blend')))
    scene = bpy.context.scene
    scene.render.resolution_x = scene.render.resolution_y = 768 if stage == 'preview' else 1536
    scene.cycles.samples = 96 if stage == 'preview' else 256
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'OPTIX'
    prefs.refresh_devices()
    devices = []
    for d in prefs.devices:
        d.use = d.type == 'OPTIX'
        devices.append({'name': d.name, 'type': d.type, 'enabled': bool(d.use)})
    if not any(d['enabled'] for d in devices):
        raise RuntimeError('No OptiX device available')
    scene.cycles.device = 'GPU'
    scene.render.filepath = str(png)
    begin = time.perf_counter()
    bpy.ops.render.render(write_still=True)
    receipt = {'rendered': True, 'kind': 'complete character', 'stage': stage,
               'resolution': scene.render.resolution_x, 'samples': scene.cycles.samples,
               'seconds': time.perf_counter()-begin, 'devices': devices,
               'png': png.name, 'png_sha256': sha(png),
               'blend': STEM+'.blend', 'blend_sha256': report['blend_sha256'],
               'source_sha256': sha(Path(__file__))}
    dump(OUT/(STEM+suffix+'.render.json'), receipt)
    print('VOLUMETRIC_FLEECE_RENDER', json.dumps(receipt), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prepare', action='store_true')
    parser.add_argument('--render', choices=['preview', 'final'])
    opt = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    if opt.render:
        render(opt.render)
        return
    if not opt.prepare:
        parser.error('--prepare or --render required')
    for ext in ['.blend', '.source.py', '.groom.json', '.png']:
        if (OUT/(STEM+ext)).exists():
            raise FileExistsError(STEM+ext)
    begin = time.perf_counter()
    deps = {name: sha(OUT/name) for name in [BASE, SOURCE]}
    h = runpy.run_path(str(OUT/SOURCE), run_name='_frozen_character_helpers')
    bpy.ops.wm.open_mainfile(filepath=str(OUT/BASE))
    for name in ['Blue pile · coat', 'Blue pile · undercoat', 'Blue pile · flyaway']:
        ob = bpy.data.objects.get(name)
        if ob:
            bpy.data.objects.remove(ob, do_unlink=True)
    # Slightly differing shared tuft tones reveal clusters through actual fibers.
    colors = ['#657ac4', '#677cc6', '#697ec8', '#6b80ca', '#667bc5', '#687dc7', '#6a7fc9', '#687cc6']
    mats = [h['hair_material']('Lavender blue fleece · tuft tone '+str(i), c) for i, c in enumerate(colors)]
    for mat in mats:
        shader = next(node for node in mat.node_tree.nodes if node.type == 'BSDF_HAIR_PRINCIPLED')
        shader.inputs['Roughness'].default_value = .53
        shader.inputs['Radial Roughness'].default_value = .58
        ramp = next(node for node in mat.node_tree.nodes if node.type == 'VALTORGB')
        base = np.array(h['linear_hex'](colors[mats.index(mat)])[:3])
        ramp.color_ramp.elements[0].color = tuple(base*.94)+(1,)
        ramp.color_ramp.elements[1].color = tuple(base*1.04)+(1,)
    geometry = create_fleece(h, mats)
    loose_fibers(h, mats[2], 240000, .024, 616, 'Blue pile · continuous hidden foundation')
    loose_fibers(h, mats[3], 18000, .038, 716, 'Blue pile · fine short halo')
    # Eye shape is part of the reference, not an opaque painted-on replacement.
    for ob in bpy.data.objects:
        if ob.name.startswith('Black safety eye'):
            ob.scale.x *= 1.08
            ob.scale.z *= 1.09
    scene = bpy.context.scene
    scene.cycles_curves.shape = 'THICK'
    scene.cycles.use_denoising = True
    scene.cycles.samples = 256
    scene.render.resolution_x = scene.render.resolution_y = 1536
    scene.render.filepath = str(OUT/(STEM+'.png'))
    h['light']('Large gentle front fill · fine pile', (0., -4.2, .3), 70., 5., target=(0., 0., .1))
    key = bpy.data.objects.get('Large soft key / eye window')
    if key:
        key.data.energy = 380.
    scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value = .40
    scene.view_settings.look = 'AgX - Medium Low Contrast'
    # Keep existing studio key, beret geometry, camera and the whole stuffed form.
    scene['groom_recipe'] = '26000 small crimp guides; 32 lightly grouped fibers each; continuous foundation and short fine halo'
    scene['scope'] = 'Native editable Hair Curves + Cycles. Authored groom; no reference reconstruction/3DGS/Houdini contact solver.'
    (OUT/(STEM+'.source.py')).write_bytes(Path(__file__).read_bytes())
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(STEM+'.blend')), compress=True)
    if {name: sha(OUT/name) for name in deps} != deps:
        raise RuntimeError('Historical input changed')
    report = {'kind': 'complete character', 'rendered': False, 'blend': STEM+'.blend',
              'blend_sha256': sha(OUT/(STEM+'.blend')), 'source': STEM+'.source.py',
              'source_sha256': sha(Path(__file__)), 'historical_inputs': deps,
              'old_files_unchanged': True, 'geometry': geometry,
              'foundation_strands': 240000, 'loose_halo_strands': 18000,
              'method': 'Continuous fine crimped pile: smaller curls, low gathering, softly varying downward flow, normal/tangent crimp planes and complete polar-cap root coverage; native Catmull-Rom fibers with Chiang scattering in Cycles.',
              'scope': 'Art-directed full groom. Geometry checks do not claim visual acceptance or exact reference reproduction.',
              'preparation_seconds': time.perf_counter()-begin}
    dump(OUT/(STEM+'.groom.json'), report)
    print('VOLUMETRIC_FLEECE_READY', json.dumps(report), flush=True)


if __name__ == '__main__':
    main()
