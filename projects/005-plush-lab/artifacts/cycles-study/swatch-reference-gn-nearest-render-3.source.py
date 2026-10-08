"""Editable native hair Curves + Cycles material study, no splat approximation.

Run with Blender 5.2: blender -b --python plush_cycles.py -- --kind swatch
Outputs stay in artifacts/cycles-study; old creations are never read or changed.
"""
import argparse
import hashlib
import json
import math
import sys
import time
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
TAU = math.tau
PRESETS = {
    "velvet": {"label": "A · 细密直短绒", "length": .025, "curl": .0018, "turns": .7, "lean": .35, "clump": .15},
    "fleece": {"label": "B · 松散微卷绒", "length": .047, "curl": .0055, "turns": 1.15, "lean": .65, "clump": .38},
    "teddy": {"label": "C · 较长卷毛束", "length": .065, "curl": .010, "turns": 1.6, "lean": .75, "clump": .60},
    "reference": {"label": "D · 松散短卷绒候选", "length": .046, "curl": .009, "turns": 1., "lean": .50, "clump": .60},
}


def args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--kind", choices=["swatch", "character"], default="swatch")
    parser.add_argument("--variant", choices=list(PRESETS), default="fleece")
    parser.add_argument("--resolution", type=int, default=768)
    parser.add_argument("--samples", type=int, default=96)
    parser.add_argument("--density", type=float, default=1)
    parser.add_argument("--angle", type=float, default=0)
    parser.add_argument("--tag", default="v1")
    parser.add_argument("--no-render", action="store_true")
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])


def linear_hex(color):
    c = np.array([int(color[i:i+2], 16) / 255 for i in (1, 3, 5)])
    c = np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
    return tuple(c) + (1,)


def normalize(v):
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-10)


def body_surface(theta, angle, swatch=False):
    ring, c = np.sin(theta), np.cos(theta)
    if swatch:
        return np.stack((.64 * ring * np.cos(angle), -.43 * c, .54 * ring * np.sin(angle)), axis=-1)
    def lobe(a, width, height):
        delta = np.arctan2(np.sin(angle-a), np.cos(angle-a))
        return height * np.exp(-(delta / width)**2)
    ellipse = 1 / np.sqrt((np.cos(angle)/.925)**2 + (np.sin(angle)/1.115)**2)
    belly = 1 / ((np.cos(angle)/.740)**4 + (np.sin(angle)/1.115)**4)**.25
    weight = np.clip(-np.sin(angle)*3, 0, 1)
    outline = (ellipse*(1-weight) + belly*weight + lobe(-.20, .37, .31)
               + lobe(math.pi+.20, .37, .31) - lobe(-.58, .16, .055)
               - lobe(math.pi+.58, .16, .055) + lobe(.97, .235, .165)
               + lobe(math.pi-.97, .245, .12) - lobe(math.pi/2, .245, .275))
    radius = ring * (1 + (outline-1)*ring**2)
    return np.stack((1.10*radius*np.cos(angle), -.79*c, .98*radius*np.sin(angle)), axis=-1)


def surface_frame(theta, angle, swatch=False):
    p = body_surface(theta, angle, swatch)
    dt = body_surface(theta+.0001, angle, swatch) - body_surface(theta-.0001, angle, swatch)
    da = body_surface(theta, angle+.0001, swatch) - body_surface(theta, angle-.0001, swatch)
    n = normalize(np.cross(dt, da))
    n *= np.where(np.sum(n*p, axis=-1) < 0, -1, 1)[..., None]
    return p, n


def material(name, color, roughness=.6):
    m = bpy.data.materials.new(name)
    m.diffuse_color = linear_hex(color)
    m.use_nodes = True
    shader = m.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = linear_hex(color)
    shader.inputs["Roughness"].default_value = roughness
    return m


def hair_material(name, color, dark=False):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nodes, links = m.node_tree.nodes, m.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    output.location = (520, 0)
    shader = nodes.new("ShaderNodeBsdfHairPrincipled")
    shader.model = "CHIANG"
    shader.parametrization = "COLOR"
    shader.location = (220, 0)
    shader.inputs["Roughness"].default_value = .48 if not dark else .65
    shader.inputs["Radial Roughness"].default_value = .55
    shader.inputs["Coat"].default_value = 0
    shader.inputs["Random Roughness"].default_value = .13
    info = nodes.new("ShaderNodeHairInfo")
    info.location = (-450, 0)
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.location = (-220, 0)
    base = np.array(linear_hex(color)[:3])
    ramp.color_ramp.elements[0].color = tuple(base*.84) + (1,)
    ramp.color_ramp.elements[1].color = tuple(np.minimum(base*1.08, 1)) + (1,)
    links.new(info.outputs["Random"], ramp.inputs[0])
    links.new(ramp.outputs["Color"], shader.inputs["Color"])
    links.new(shader.outputs[0], output.inputs["Surface"])
    return m


def mesh_body(swatch, mat):
    rows, columns = 96, 192
    ts = np.linspace(.0001, math.pi-.0001, rows)
    aa = np.linspace(0, TAU, columns, endpoint=False)
    t, a = np.meshgrid(ts, aa, indexing="ij")
    verts = body_surface(t.ravel(), a.ravel(), swatch)
    faces = []
    for i in range(rows-1):
        for j in range(columns):
            j2 = (j+1) % columns
            faces.append((i*columns+j, (i+1)*columns+j, (i+1)*columns+j2, i*columns+j2))
    mesh = bpy.data.meshes.new("Stuffed form mesh")
    mesh.from_pydata(verts.tolist(), [], faces)
    mesh.update()
    ob = bpy.data.objects.new("Stuffed form · editable mesh", mesh)
    bpy.context.collection.objects.link(ob)
    mesh.materials.append(mat)
    for p in mesh.polygons:
        p.use_smooth = True
    return ob


def native_curves(name, points, radii, mat):
    n, k, _ = points.shape
    data = bpy.data.hair_curves.new(name + " data")
    data.add_curves([k]*n)
    data.position_data.foreach_set("vector", points.astype(np.float32).ravel())
    radius = data.attributes.get("radius") or data.attributes.new("radius", "FLOAT", "POINT")
    radius.data.foreach_set("value", radii.astype(np.float32).ravel())
    data.set_types(type="CATMULL_ROM")
    ob = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(ob)
    data.materials.append(mat)
    # Curves retain points/radii and can be groomed in Blender. Script seed and
    # controls reproduce this first material study; not an image reconstruction.
    ob["representation"] = "native HAIR Curves, Catmull-Rom"
    ob["curve_count"] = n
    return ob


def groom(swatch, preset, count, mat, layer, seed=31):
    rng = np.random.default_rng(seed)
    members = 32
    groups = math.ceil(count / members)
    theta_g = np.arccos(rng.uniform(-.998, .998, groups))
    angle_g = rng.uniform(0, TAU, groups)
    theta = np.repeat(theta_g, members)[:count]
    angle = np.repeat(angle_g, members)[:count]
    # A guide has nearby but different surface roots. Avoid repeated identical
    # curls, macroscopic cords and deliberately painted dark core blobs.
    scale = .54 if swatch else 1
    root_spread = (.018 if preset["clump"] > .8 else .023 if layer == "coat" else .037) / scale
    theta += rng.normal(0, root_spread, count)
    angle += rng.normal(0, root_spread, count) / np.maximum(np.sin(theta), .20)
    theta = np.clip(theta, .0002, math.pi-.0002)
    p, normal = surface_frame(theta, angle, swatch)
    gp, gn = surface_frame(theta_g, angle_g, swatch)
    guide_p, guide_n = np.repeat(gp, members, axis=0)[:count], np.repeat(gn, members, axis=0)[:count]
    down = np.broadcast_to(np.array([0., 0., -1.]), normal.shape).copy()
    down -= np.sum(down*normal, axis=-1)[:, None] * normal
    near_pole = np.linalg.norm(down, axis=-1) < .05
    down[near_pole] = np.cross(normal[near_pole], [0, 1, 0])
    down = normalize(down)
    side = normalize(np.cross(normal, down))
    guide_turn = np.repeat(rng.normal(0, .6, groups), members)[:count]
    guide_turn += rng.normal(0, .21, count)
    lean = down*np.cos(guide_turn)[:, None] + side*np.sin(guide_turn)[:, None]
    side = normalize(np.cross(normal, lean))
    L = preset["length"] * rng.uniform(.64, 1.32, count)
    curl = preset["curl"] * rng.uniform(.65, 1.35, count)
    if layer == "undercoat":
        L *= .42
        curl *= .4
    if layer == "flyaway":
        L *= 1.5
        curl *= .6
    if not swatch:
        # Actual compression of fibers at the eye sockets / under the beret.
        hem = .850 + .115*np.exp(-((p[:, 0]+.61)/.27)**2) + .180*np.exp(-((p[:, 0]-.63)/.27)**2)
        compression = np.where((p[:, 2] > hem-.06) & (np.abs(p[:, 0]+.17) < 1.02), .22, 1.)
        for eye_x in [-.43, .27]:
            socket = np.exp(-((p[:, 0]-eye_x)/.13)**2 - ((p[:, 2]-.21)/.16)**2)
            compression *= 1 - .88*socket*(p[:, 1] < -.45)
        L *= compression
        curl *= compression
    k = 12
    t = np.linspace(0, 1, k)[None, :, None]
    phase = np.repeat(rng.uniform(0, TAU, groups), members)[:count] + rng.normal(0, .7, count)
    wave = phase[:, None, None] + t*TAU*preset["turns"]
    # Rising fibers bend into the downward groom; small irregular helices ride
    # that centerline. Clump only partly converges roots, retaining air between
    # fibers. Fiber scattering, contact shadows and bounce come from Cycles.
    rise = L[:, None, None] * (t - .27*t*t)
    sweep = L[:, None, None] * preset["lean"] * t*t
    envelope = np.sin(t*math.pi/2)
    curl_side = curl[:, None, None]*(np.sin(wave)-np.sin(phase)[:, None, None])*envelope
    curl_lean = curl[:, None, None]*(np.cos(wave)-np.cos(phase)[:, None, None])*envelope*.55
    points = p[:, None, :] + normal[:, None, :]*rise + lean[:, None, :]*(sweep+curl_lean) + side[:, None, :]*curl_side
    attraction = guide_p - p
    attraction -= np.sum(attraction*normal, axis=-1)[:, None]*normal
    points += attraction[:, None, :]*preset["clump"]*t*t
    thickness = rng.uniform(.00024, .00040, count)
    if layer == "flyaway":
        thickness *= .65
    radii = thickness[:, None] * (1 - .92*np.linspace(0, 1, k)[None, :]**1.8)
    radii[:, -1] = .000018
    return native_curves("Blue pile · " + layer, points, radii, mat)


def sphere(name, location, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, location=location)
    ob = bpy.context.object
    ob.name = name
    ob.scale = scale
    ob.data.materials.append(mat)
    for face in ob.data.polygons:
        face.use_smooth = True
    return ob


def front_depth(x, z):
    angle = math.atan2(z/.98, x/1.10)
    r = math.hypot(x/1.10, z/.98)
    lo, hi = 0, math.pi/2
    for _ in range(35):
        mid = (lo+hi)/2
        p = body_surface(np.array([mid]), np.array([angle]))[0]
        if math.hypot(p[0]/1.10, p[2]/.98) < r:
            lo = mid
        else:
            hi = mid
    return float(body_surface(np.array([(lo+hi)/2]), np.array([angle]))[0, 1])


def beret_surface(theta, angle):
    ring, height = np.sin(theta), np.cos(theta)
    fold = angle*5 + .8*height + .40*np.sin(angle*3)
    pleat = .023*np.cos(fold) + .009*np.sin(angle*17-1.4*height)
    circumference = 1 - .025*np.cos(angle) + .026*np.sin(angle*3+.8)
    x = .990*ring*np.cos(angle)*circumference
    y = -.575*ring*np.sin(angle)*(circumference+.080*np.cos(fold)*ring)
    hem = .850 + .115*np.exp(-((x-.17+.61)/.27)**2) + .180*np.exp(-((x-.17-.63)/.27)**2)
    top = 1.49 - .065*x
    z = hem + (top-hem)*np.maximum(height, 0) + pleat*ring**1.7
    under = np.maximum(-height, 0)
    x *= 1-.20*under
    y *= 1-.38*under
    z -= .035*under + .075*ring**1.5*np.maximum(-np.cos(angle), 0)*np.maximum(-height, 0)
    return np.stack((x-.17, y+.005, z), axis=-1)


def character_details():
    eye = material("Glossy black safety eyes", "#080a0e", .18)
    bsdf = eye.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Coat Weight"].default_value = .2
    bsdf.inputs["Coat Roughness"].default_value = .10
    for x in [-.43, .27]:
        ob = sphere("Black safety eye", (x, front_depth(x, .21)-.026, .21), (.088, .065, .134), eye)
        ob.rotation_euler[1] = -.11 if x < 0 else .05
    hat = material("Beret charcoal wool base", "#030304", .95)
    bsdf = hat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Sheen Weight"].default_value = .025
    bsdf.inputs["Sheen Roughness"].default_value = .75
    bsdf.inputs["Sheen Tint"].default_value = (.03, .035, .045, 1)
    bsdf.inputs["Specular IOR Level"].default_value = .28
    rows, columns = 64, 128
    tt, aa = np.meshgrid(np.linspace(.0001, math.pi-.0001, rows), np.linspace(0, TAU, columns, endpoint=False), indexing="ij")
    verts = beret_surface(tt.ravel(), aa.ravel())
    faces = [(i*columns+j, i*columns+(j+1)%columns, (i+1)*columns+(j+1)%columns, (i+1)*columns+j) for i in range(rows-1) for j in range(columns)]
    mesh = bpy.data.meshes.new("Soft beret mesh")
    mesh.from_pydata(verts.tolist(), [], faces)
    mesh.update()
    ob = bpy.data.objects.new("Beret · shaped wool crown", mesh)
    bpy.context.collection.objects.link(ob)
    mesh.materials.append(hat)
    for face in mesh.polygons:
        face.use_smooth = True
    # Real short hat fibers, independently editable and shaded as fibers.
    rng = np.random.default_rng(771)
    n, k = 90000, 5
    theta = np.arccos(rng.uniform(-.93, .998, n))
    angle = rng.uniform(0, TAU, n)
    p = beret_surface(theta, angle)
    dt = beret_surface(theta+.0001, angle)-beret_surface(theta-.0001, angle)
    da = beret_surface(theta, angle+.0001)-beret_surface(theta, angle-.0001)
    norm = normalize(np.cross(dt, da))
    norm *= np.where(np.sum(norm*(p-[ -.17, 0, 1.1]), axis=-1) < 0, -1, 1)[:, None]
    tangent = normalize(da)
    t = np.linspace(0, 1, k)[None, :, None]
    length = rng.uniform(.006, .019, n)[:, None, None]
    points = p[:, None, :] + norm[:, None, :]*length*(t-.30*t*t) + tangent[:, None, :]*length*.30*t*t
    radius = rng.uniform(.00017, .00030, n)[:, None]*(1-.85*np.linspace(0, 1, k)[None, :])
    native_curves("Black wool · short fibers", points, radius, hair_material("Charcoal wool fiber BSDF", "#050607", True))
    sphere("Beret top nub", (-.32, .012, 1.50), (.035, .032, .045), hat)


def light(name, position, power, size, target=(0, 0, .25), color=(1, 1, 1)):
    data = bpy.data.lights.new(name, "AREA")
    data.energy, data.shape, data.size = power, "DISK", size
    data.color = color
    ob = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(ob)
    ob.location = position
    ob.rotation_euler = (Vector(target)-ob.location).to_track_quat("-Z", "Y").to_euler()
    return ob


def setup_scene(options):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = options.samples
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = "OPENIMAGEDENOISE"
    scene.cycles.adaptive_threshold = .012
    scene.cycles.max_bounces = 12
    scene.cycles.diffuse_bounces = 6
    scene.cycles.glossy_bounces = 8
    scene.cycles.transmission_bounces = 12
    scene.cycles.transparent_max_bounces = 8
    scene.cycles_curves.shape = "THICK"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "OPTIX"
    prefs.refresh_devices()
    for d in prefs.devices:
        d.use = d.type == "OPTIX"
    selected = [{"name": d.name, "type": d.type, "enabled": bool(d.use)} for d in prefs.devices]
    if not any(d["enabled"] for d in selected):
        raise RuntimeError("This study requires a verified OptiX device; none found")
    scene.cycles.device = "GPU"
    scene.render.resolution_x = options.resolution
    scene.render.resolution_y = options.resolution
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 0
    scene.world = bpy.data.worlds.new("Neutral dim studio")
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (.20, .20, .20, 1)
    bg.inputs["Strength"].default_value = .25
    return scene, selected


def main():
    options = args()
    begin = time.monotonic()
    swatch = options.kind == "swatch"
    preset = PRESETS[options.variant]
    outdir = ROOT / "artifacts" / "cycles-study"
    outdir.mkdir(exist_ok=True)
    name = f"{options.kind}-{options.variant}-{options.tag}"
    if (outdir / (name + ".blend")).exists() or (outdir / (name + ".png")).exists():
        raise FileExistsError("Study output already exists; choose a new --tag to retain history")
    source_text = Path(__file__).read_bytes()
    source_hash = hashlib.sha256(source_text).hexdigest()
    (outdir / (name + ".source.py")).write_bytes(source_text)
    scene, devices = setup_scene(options)
    base = material("Blue textile backing", "#6c88b7", .92)
    fiber_color = "#6b8bd4" if options.variant == "reference" else "#87a9e6"
    fibers = hair_material("Blue synthetic pile · Chiang 2016", fiber_color)
    mesh_body(swatch, base)
    counts = [int((90000 if swatch else 340000)*options.density), int((85000 if swatch else 320000)*options.density), int((2500 if swatch else 9000)*options.density)]
    for layer, count, seed in zip(["undercoat", "coat", "flyaway"], counts, [41, 51, 61]):
        groom(swatch, preset, count, fibers, layer, seed)
    if not swatch:
        character_details()
    ground = material("Matte neutral ground", "#363638", .92)
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.61 if swatch else -1.16))
    bpy.context.object.name = "Ground"
    bpy.context.object.data.materials.append(ground)
    light("Large soft key / eye window", (-3, -4, 4.5), 480, 3.3)
    light("Soft right fill", (3, -2, 2.5), 150, 3.2, color=(.90, .94, 1))
    light("Faint rear rim", (1, 3, 3.2), 200, 2.8)
    camera_data = bpy.data.cameras.new("Material comparison camera")
    camera = bpy.data.objects.new("Material comparison camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 1.56 if swatch else 3.05
    camera.location = (1.3 if swatch else 0, -4.5 if swatch else -6, .95 if swatch else .43)
    camera.rotation_euler = (Vector((0, 0, 0 if swatch else .14))-camera.location).to_track_quat("-Z", "Y").to_euler()
    if options.angle:
        a = math.radians(options.angle)
        camera.location = (6*math.sin(a), -6*math.cos(a), .72)
        camera.rotation_euler = (Vector((0, 0, .14))-camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = camera
    scene.render.filepath = str(outdir / (name + ".png"))
    scene["method"] = "Native Curves fibers + Cycles path tracing + Chiang Principled Hair"
    scene["reference_scope"] = "Artist reconstruction from one screenshot; back is designed, not recovered"
    scene["preset"] = json.dumps(preset)
    bpy.ops.wm.save_as_mainfile(filepath=str(outdir / (name + ".blend")), compress=True)
    if not options.no_render:
        bpy.ops.render.render(write_still=True)
    metadata = {
        "blender": bpy.app.version_string, "kind": options.kind, "variant": options.variant,
        "preset": preset, "body_hair_counts": dict(zip(["undercoat", "coat", "flyaway"], counts)),
        "hat_hairs": 0 if swatch else 90000, "body_points_per_hair": 12,
        "resolution": options.resolution, "samples": options.samples, "angle_degrees": options.angle,
        "material": "Cycles Principled Hair BSDF / CHIANG / COLOR", "devices": devices,
        "fiber_color_srgb": fiber_color, "root_radius_range": [.00024, .00040],
        "coordinate_units": "Blender scene units; character width about 2.6",
        "source_sha256": source_hash, "source_snapshot": name + ".source.py",
        "seconds": round(time.monotonic()-begin, 2), "blend": name + ".blend", "png": name + ".png",
        "rendered": not options.no_render, "source": str(Path(__file__).relative_to(ROOT)),
        "scope": "Offline native hair asset study; no 3DGS training or real-time web conversion",
    }
    (outdir / (name + ".json")).write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    print("PLUSH_STUDY_RESULT", json.dumps(metadata, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
