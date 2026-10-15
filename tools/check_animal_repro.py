"""Regenerate editable animals in a temporary directory; validate typed glTF data.
Float32 geometry may differ by a few ULP between NumPy/platform versions.
"""
import base64
import json
import struct
import tempfile
from pathlib import Path
import numpy as np
import build_art
from animal_shapes import build_animals

source = build_art.OUT

def read_gltf(path):
    info = json.loads(path.read_text())
    data = base64.b64decode(info['buffers'][0].pop('uri').split(',')[1])
    return info, data

def close_metadata(a, b):
    if isinstance(a, (int, float)):
        assert np.isfinite(a) and np.isfinite(b) and abs(a-b) <= 1e-6
    elif isinstance(a, dict):
        assert a.keys() == b.keys()
        for key in a: close_metadata(a[key], b[key])
    elif isinstance(a, list):
        assert len(a) == len(b)
        for x, y in zip(a, b): close_metadata(x, y)
    else:
        assert a == b

with tempfile.TemporaryDirectory() as folder:
    build_art.OUT = Path(folder)
    for model in build_animals(build_art.Model):
        model.export()
        a, old = read_gltf(source / (model.name+'.gltf'))
        b, new = read_gltf(build_art.OUT / (model.name+'.gltf'))
        close_metadata(a, b)
        assert len(old) == len(new)
        for accessor in a['accessors']:
            view = a['bufferViews'][accessor['bufferView']]
            start = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
            dtype = '<f4' if accessor['componentType'] == 5126 else '<u2'
            count = accessor['count'] * {'SCALAR':1, 'VEC3':3, 'VEC4':4}[accessor['type']]
            x = np.frombuffer(old, dtype=dtype, count=count, offset=start)
            y = np.frombuffer(new, dtype=dtype, count=count, offset=start)
            assert np.isfinite(x).all() and np.isfinite(y).all()
            np.testing.assert_allclose(x, y, rtol=0, atol=1e-6)
        # Both shipped formats must contain exactly the same editable geometry.
        glb = (source / (model.name+'.glb')).read_bytes()
        magic, version, size = struct.unpack_from('<III', glb)
        assert (magic, version, size) == (0x46546c67, 2, len(glb))
        length, kind = struct.unpack_from('<II', glb, 12)
        assert kind == 0x4e4f534a
        close_metadata(json.loads(glb[20:20+length]), a)
        offset = 20+length
        length, kind = struct.unpack_from('<II', glb, offset)
        assert kind == 0x004e4942 and glb[offset+8:offset+8+length] == old
        print('PASS '+model.name+' editable source / GLB / GLTF reproducibility')
