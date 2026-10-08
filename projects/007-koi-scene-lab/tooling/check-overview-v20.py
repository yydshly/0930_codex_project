"""Check overview sources/links against the existing runtime acceptance records."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import re
import struct

root = Path(__file__).resolve().parents[1]
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
record_path = root / 'notes/overview-render-v20.json'
record = json.loads(record_path.read_text(encoding='utf-8'))
automatic = json.loads((root / 'notes/numerical-v20-result.json').read_text(encoding='utf-8'))
summary = json.loads((root / 'notes/v20-validation-summary.json').read_text(encoding='utf-8'))
assert automatic['passed'] == 278 and automatic['failed'] == 0
assert summary['native']['passed'] == 6 and summary['visual']['reviewed'] == 3
assert sha(root / 'web/app.js') == automatic['bundleSha256'] == summary['bundleSha256']
assert all(sha(root / p) == digest for p, digest in automatic['sourceHashes'].items())
assert all(sha(root / p) == digest for p, digest in record['hashes'].items())
document = root / 'notes/project-overview-v20.md'
text = document.read_text(encoding='utf-8')
links = [p for p in re.findall(r'\]\(([^)]+)\)', text) if not p.startswith(('http:', 'https:', '#'))]
assert all((document.parent / p).exists() for p in links)
code_refs = re.findall(r'`(?:src/)?([a-z0-9-]+\.js)`', text)
assert all((root / 'src' / p).exists() for p in code_refs)
assert record['layout']['matrixRows'] == 9 and not record['layout']['horizontalOverflow']
png = root / 'assets/project-overview-v20.png'
width, height = struct.unpack('>II', png.read_bytes()[16:24])
assert record['pngDimensions'] == dict(width=width, height=height)
record['visualReview'] = {
    'status': 'completed',
    'scope': 'Full final infographic plus enlarged matrix, sidebar and final boundaries inspected. Chinese text legible, no clipping or overlap, all three runtime pictures visible. Independent read-only content review verified capability/status and tightened two upstream/support terms.',
}
record['sourceAndLinkCheck'] = {
    'date': datetime.now(timezone.utc).isoformat(),
    'runtimeUnchangedFromV20': True,
    'documentLinks': len(links),
    'sourceFileReferences': len(code_refs),
    'allMatched': True,
}
record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'output': 'assets/project-overview-v20.png', 'width': width, 'height': height,
                  'bytes': png.stat().st_size, 'runtimeUnchanged': True, 'linksValid': len(links),
                  'sourceReferencesValid': len(code_refs), 'visualReview': 'completed'}, ensure_ascii=False))
