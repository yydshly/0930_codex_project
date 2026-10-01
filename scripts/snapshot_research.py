"""Archive tracked and non-ignored research files, including local uncommitted work."""
from datetime import datetime, timezone, timedelta
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]

def git(*args):
    return subprocess.check_output(['git', '-c', f'safe.directory={ROOT.as_posix()}', *args], cwd=ROOT, stderr=subprocess.DEVNULL)

def snapshot():
    stamp = datetime.now(timezone(timedelta(hours=8))).strftime('%Y%m%d-%H%M%S-%f')
    target = ROOT / 'build' / 'research-archives' / f'research-{stamp}.zip'
    target.parent.mkdir(parents=True, exist_ok=True)
    names = sorted(set(git('ls-files', '-z', '--cached', '--others', '--exclude-standard').decode('utf-8').split('\0')) - {''})
    entries = []
    with zipfile.ZipFile(target, 'x', compression=zipfile.ZIP_DEFLATED) as archive:
        for name in names:
            path = ROOT / name
            if not path.is_file():
                continue
            if not path.resolve().is_relative_to(ROOT) or path.is_symlink():
                raise ValueError(f'Unsafe archive path: {name}')
            data = path.read_bytes()
            archive.writestr(name, data)
            entries.append({'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
        manifest = {'created_at': datetime.now(timezone(timedelta(hours=8))).isoformat(), 'git_head': git('rev-parse', 'HEAD').decode().strip(), 'files': entries}
        archive.writestr('__research_manifest__.json', json.dumps(manifest, ensure_ascii=False, indent=2))
    with zipfile.ZipFile(target) as archive:
        if archive.testzip() is not None:
            raise ValueError('Archive CRC check failed')
        for entry in entries:
            if hashlib.sha256(archive.read(entry['path'])).hexdigest() != entry['sha256']:
                raise ValueError(f"Archive hash mismatch: {entry['path']}")
    print(json.dumps({'archive': str(target), 'files': len(entries), 'bytes': target.stat().st_size, 'verified': True}, ensure_ascii=False))
    return target

if __name__ == '__main__':
    snapshot()
