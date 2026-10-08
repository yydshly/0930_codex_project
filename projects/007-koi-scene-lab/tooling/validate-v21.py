"""Save a full TAP run against this exact local build. Native UI QA is separate."""
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import re
import subprocess
import time

project = Path(__file__).resolve().parents[1]
start = time.perf_counter()
run = subprocess.run(['D:/software/nodejs/node.exe', '--test', '../tests/*.test.mjs'],
                     cwd=project / 'tooling', capture_output=True)
tap = run.stdout
(project / 'notes/numerical-v21.tap').write_bytes(tap)
(project / 'notes/numerical-v21.stderr.log').write_bytes(run.stderr)
text = tap.decode('utf-8', errors='replace')
def count(name):
    match = re.search(r'^# ' + name + r' (\d+)\s*$', text, re.M)
    return int(match.group(1)) if match else None
def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
paths = sorted(list((project / 'src').glob('*.js')) + list((project / 'tests').glob('*.mjs'))
               + [project / 'web/index.html', project / 'web/style.css'])
record = {
    'date': datetime.now(timezone.utc).isoformat(), 'version': 21,
    'bundleSha256': sha(project / 'web/app.js'),
    'tests': count('tests'), 'passed': count('pass'), 'failed': count('fail'),
    'exitCode': run.returncode, 'durationMs': round((time.perf_counter() - start) * 1000, 3),
    'command': 'D:/software/nodejs/node.exe --test ../tests/*.test.mjs',
    'workingDirectory': 'projects/007-koi-scene-lab/tooling',
    'tapRecord': 'notes/numerical-v21.tap', 'tapBytes': len(tap),
    'tapSha256': hashlib.sha256(tap).hexdigest(),
    'method': 'Node tests including real Three and OrbitControls event fixtures; not native browser or GPU-memory measurement.',
    'sourceHashes': {p.relative_to(project).as_posix(): sha(p) for p in paths},
}
(project / 'notes/numerical-v21-result.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({key: record[key] for key in ['bundleSha256', 'tests', 'passed', 'failed', 'exitCode', 'durationMs']}, ensure_ascii=False))
raise SystemExit(run.returncode if run.returncode else (0 if count('tests') and count('tests') == count('pass') and count('fail') == 0 else 1))

