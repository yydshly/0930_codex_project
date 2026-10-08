"""Generate an embedded procedural GLB pond demo, explicitly not a scan."""
import json
import math
import struct
from pathlib import Path

project = Path(__file__).resolve().parents[1]
assets = project / 'web/assets'
assets.mkdir(parents=True, exist_ok=True)
chunks, views, accessors, meshes, nodes, materials = [], [], [], [], [], []
offset = 0


def material(name, rgb, roughness=.85, metalness=0):
    color = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb]
    materials.append({'name': name, 'pbrMetallicRoughness': {'baseColorFactor': color + [1],
                     'roughnessFactor': roughness, 'metallicFactor': metalness}})
    return len(materials) - 1


def accessor(values, component, kind, target):
    global offset
    pack, width = ('f', 4) if component == 5126 else ('H', 2)
    data = struct.pack('<' + pack * len(values), *values)
    view = len(views)
    views.append({'buffer': 0, 'byteOffset': offset, 'byteLength': len(data), 'target': target})
    data += bytes((-len(data)) % 4)
    chunks.append(data)
    offset += len(data)
    size = 3 if kind == 'VEC3' else 1
    entry = {'bufferView': view, 'componentType': component, 'count': len(values) // size, 'type': kind}
    if kind == 'VEC3':
        entry['min'] = [min(values[i::3]) for i in range(3)]
        entry['max'] = [max(values[i::3]) for i in range(3)]
    accessors.append(entry)
    return len(accessors) - 1


def primitive(name, positions, normals, indices, mat):
    p = accessor(positions, 5126, 'VEC3', 34962)
    n = accessor(normals, 5126, 'VEC3', 34962)
    i = accessor(indices, 5123, 'SCALAR', 34963)
    meshes.append({'name': name, 'primitives': [{'attributes': {'POSITION': p, 'NORMAL': n}, 'indices': i, 'material': mat}]})
    nodes.append({'name': name, 'mesh': len(meshes) - 1})


def box(name, center, size, mat):
    w, h, d = [v / 2 for v in size]
    faces = [((w, 0, 0), (0, 0, -d), (0, h, 0), (1, 0, 0)),
             ((-w, 0, 0), (0, 0, d), (0, h, 0), (-1, 0, 0)),
             ((0, h, 0), (w, 0, 0), (0, 0, -d), (0, 1, 0)),
             ((0, -h, 0), (w, 0, 0), (0, 0, d), (0, -1, 0)),
             ((0, 0, d), (w, 0, 0), (0, h, 0), (0, 0, 1)),
             ((0, 0, -d), (-w, 0, 0), (0, h, 0), (0, 0, -1))]
    positions, normals, indices = [], [], []
    for origin, u, v, normal in faces:
        base = len(positions) // 3
        for a, b in [(-1, -1), (1, -1), (1, 1), (-1, 1)]:
            positions.extend(center[k] + origin[k] + a * u[k] + b * v[k] for k in range(3))
            normals.extend(normal)
        indices.extend([base, base + 1, base + 2, base, base + 2, base + 3])
    primitive(name, positions, normals, indices, mat)


def cylinder(name, x, z, radius, bottom, top, mat, segments=32):
    positions, normals, indices = [], [], []
    for j in range(segments + 1):
        angle = j / segments * math.tau
        nx, nz = math.cos(angle), math.sin(angle)
        for y in [bottom, top]:
            positions.extend([x + nx * radius, y, z + nz * radius])
            normals.extend([nx, 0, nz])
    for j in range(segments):
        a = j * 2
        indices.extend([a, a + 1, a + 3, a, a + 3, a + 2])
    for y, normal in [(bottom, -1), (top, 1)]:
        start = len(positions) // 3
        positions.extend([x, y, z]); normals.extend([0, normal, 0])
        for j in range(segments):
            angle = j / segments * math.tau
            positions.extend([x + math.cos(angle) * radius, y, z + math.sin(angle) * radius])
            normals.extend([0, normal, 0])
        for j in range(segments):
            a, b = start + 1 + j, start + 1 + (j + 1) % segments
            indices.extend([start, b, a] if normal > 0 else [start, a, b])
    primitive(name, positions, normals, indices, mat)


stone = material('procedural pale stone', [.66, .68, .63])
floor = material('procedural submerged floor', [.32, .40, .35])
wood = material('procedural wood colour', [.52, .35, .23], .68)
wall = material('procedural off-white wall', [.84, .83, .77])
rock = material('procedural cylinder obstacle', [.37, .42, .38])
metal = material('procedural bench support', [.19, .24, .21], .54, .15)

# Symmetric 8 x 6 base fixes source centre X/Z=0 and minimum Y=0 for the importer.
box('symmetric foundation; not scanned', (0, .02, 0), (8, .04, 6), floor)
for name, center, size in [
    ('north raised bank', (0, .37, -2.35), (8, .66, 1.3)),
    ('south raised bank', (0, .37, 2.35), (8, .66, 1.3)),
    ('west raised bank', (-3.4, .37, 0), (1.2, .66, 3.4)),
    ('east raised bank', (3.4, .37, 0), (1.2, .66, 3.4)),
]:
    box(name, center, size, stone)
box('pond floor top=.04', (0, .0225, 0), (5.6, .035, 3.4), floor)
box('north low wall', (0, 1.25, -2.7), (7.4, 1.1, .18), wall)
for j in range(9):
    box('east deck board ' + str(j), (3.4, .735, -1.45 + j * .36), (1.04, .07, .33), wood)
box('bench seat', (-.2, 1.03, 2.30), (2.2, .09, .5), wood)
box('bench back', (-.2, 1.35, 2.53), (2.2, .5, .07), wood)
for x in [-1.02, .62]:
    box('bench leg ' + str(x), (x, .84, 2.3), (.08, .28, .36), metal)
cylinder('obstacle 1 radius=.32', .7, .15, .32, .04, 1.04, rock)
cylinder('obstacle 2 radius=.25', -1.8, -.65, .25, .04, .98, rock)

document = {'asset': {'version': '2.0', 'generator': 'Koi Scene Lab procedural binding demonstration'},
            'scene': 0, 'scenes': [{'name': 'Procedural pond; not a scan', 'nodes': list(range(len(nodes)))}],
            'nodes': nodes, 'meshes': meshes, 'materials': materials, 'accessors': accessors,
            'bufferViews': views, 'buffers': [{'byteLength': offset}],
            'extras': {'source': 'procedural demonstration; not scan', 'axis': 'Y up', 'units': 'design metres',
                       'bounds': {'min': [-4, 0, -3], 'max': [4, 1.8, 3]}}}
json_bytes = json.dumps(document, separators=(',', ':')).encode('utf-8')
json_bytes += b' ' * (-len(json_bytes) % 4)
binary = b''.join(chunks)
length = 12 + 8 + len(json_bytes) + 8 + len(binary)
glb = struct.pack('<III', 0x46546C67, 2, length)
glb += struct.pack('<II', len(json_bytes), 0x4E4F534A) + json_bytes
glb += struct.pack('<II', len(binary), 0x004E4942) + binary
(assets / 'binding-example.glb').write_bytes(glb)
habitat = {'polygon': [{'x': -2.8, 'z': -1.7}, {'x': 2.8, 'z': -1.7}, {'x': 2.8, 'z': 1.7}, {'x': -2.8, 'z': 1.7}],
           'waterLevel': .65, 'depth': .60, 'feedPoint': {'x': -1.2, 'y': .65, 'z': 1},
           'obstacles': [{'x': .7, 'z': .15, 'radius': .32}, {'x': -1.8, 'z': -.65, 'radius': .25}]}
(assets / 'binding-example.json').write_text(json.dumps({'habitat': habitat, 'source': 'procedural demonstration; not scan'},
                                                     ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'glbBytes': len(glb), 'meshes': len(meshes), 'materials': len(materials), 'bounds': document['extras']['bounds'],
                  'source': document['extras']['source']}))
