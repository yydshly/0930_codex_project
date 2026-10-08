"""Read-only verification of the deployed Ridge publication against its Git source."""
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[3]
PROJECT = ROOT / 'projects/019-ridge-explorer'
BASE = 'https://yydshly.github.io/0930_codex_project/'
SCENE = BASE + 'projects/019-ridge-explorer/'
COMMIT = '2df8e32629d7c7a6b0a183c48496ca36c5e569f3'
RUN = 'https://github.com/yydshly/0930_codex_project/actions/runs/37819977961'
sys.path.insert(0, str(ROOT / 'scripts'))
from ridge_publish import _resources, _client_bundles, _validate_baseline, _verify_references, RUNTIME_ASSETS, BASELINE, BASELINE_MANIFEST


def digest(data):
    return hashlib.sha256(data).hexdigest()


def fetch(url):
    with urlopen(url, timeout=40) as response:
        if response.status != 200:
            raise ValueError(f'HTTP {response.status}: {url}')
        return response.read()


def git_bytes(path):
    return subprocess.check_output(['git', 'show', f'{COMMIT}:{path}'], cwd=ROOT)


class HTMLTokens(HTMLParser):
    """Keep every tag, attribute and nonempty text, ignoring formatting whitespace."""
    def __init__(self, data):
        super().__init__()
        self.tokens = []
        self.feed(data.decode('utf-8'))

    def handle_starttag(self, tag, attrs):
        self.tokens.append(('start', tag, sorted(attrs)))

    def handle_endtag(self, tag):
        self.tokens.append(('end', tag))

    def handle_data(self, data):
        if data.strip():
            self.tokens.append(('text', ' '.join(data.split())))


def comparison(public, source, path):
    if public == source:
        return 'exact_bytes'
    if Path(path).suffix in {'.html', '.css', '.js', '.txt', '.json'}:
        if public.replace(b'\r\n', b'\n') == source.replace(b'\r\n', b'\n'):
            return 'git_lf_normalization'
        if path == 'index.html' and HTMLTokens(public).tokens == HTMLTokens(source).tokens:
            return 'vite_rebuilt_index_same_tags_attributes_and_text'
    raise ValueError(f'Public source bytes differ: {path}')


def source_path(path):
    prefix = 'projects/019-ridge-explorer/'
    if path in {'understanding.html', 'understanding.css'}:
        return prefix + 'publication/' + path
    if path.startswith('research-assets/') or path == 'assets/explorer-v2-camp-polished.png':
        return prefix + 'assets/' + Path(path).name
    if path.startswith('downloads/'):
        return 'projects/018-ridge-atmosphere-lab/releases/' + Path(path).name
    return prefix + 'web/' + path


def main():
    report = {'date': '2026-10-09', 'content_commit': COMMIT, 'actions_run': RUN,
              'url': SCENE + 'understanding.html', 'success': False, 'resources': [], 'errors': []}
    destination = PROJECT / 'notes/deployment-checks.json'
    try:
        manifest_bytes = fetch(SCENE + 'publication-manifest.json')
        manifest = json.loads(manifest_bytes)
        records = manifest['files']
        expected = _resources(PROJECT)
        names = [record['path'] for record in records]
        if len(names) != 33 or len(set(names)) != 33 or set(names) != set(expected):
            raise ValueError('Public manifest does not contain the exact 33 reviewed resources')
        if manifest['publication_date'] != '2026-10-09' or manifest['experiment_snapshot_date'] != '2026-10-03':
            raise ValueError('Publication and experiment dates changed')
        with ThreadPoolExecutor(max_workers=6) as pool:
            public = dict(zip(names, pool.map(lambda name: fetch(SCENE + name), names)))
        for item in records:
            path, data = item['path'], public[item['path']]
            if len(data) != item['bytes'] or digest(data) != item['sha256']:
                raise ValueError(f'Public manifest size or SHA-256 mismatch: {path}')
            source = git_bytes(source_path(path))
            method = comparison(data, source, path)
            report['resources'].append({'path': path, 'http': 200, 'bytes': len(data),
                                        'sha256': digest(data), 'git_source': source_path(path),
                                        'source_comparison': method})
        _validate_baseline(public['downloads/' + BASELINE], public['downloads/' + BASELINE_MANIFEST])
        hero = public['research-assets/explorer-v2-camp-polished.png']
        if hero != public['assets/explorer-v2-camp-polished.png'] or digest(hero) != manifest['hero']['sha256']:
            raise ValueError('Public camp hero and catalog cover differ')
        report.update({'public_manifest_http': 200, 'public_manifest_sha256': digest(manifest_bytes),
                       'resources_checked': 33, 'hero_sha256': digest(hero),
                       'baseline_sha256': digest(public['downloads/' + BASELINE]),
                       'baseline_members_checked': 105, 'baseline_crc_valid': True,
                       'relative_link_closure': _verify_references(public)})
        catalog = json.loads(git_bytes('projects.json'))
        previous = json.loads(subprocess.check_output(['git', 'show', f'{COMMIT}^:projects.json'], cwd=ROOT))
        if len(previous) != 16 or len(catalog) != 18 or catalog[:16] != previous:
            raise ValueError('Original remote projects were not preserved')
        urls = [BASE + 'projects/' + str(p['id']).zfill(3) + '-' + p['slug'] + '/' for p in catalog]
        with ThreadPoolExecutor(max_workers=6) as pool:
            pages = list(pool.map(fetch, urls))
        report['catalog_entries'] = [{'url': url, 'http': 200, 'bytes': len(page)} for url, page in zip(urls, pages)]
        report['previous_remote_entries_preserved'] = 16
        index = fetch(BASE)
        text = index.decode('utf-8')
        tokens = HTMLTokens(index).tokens
        rendered = re.sub(r'\s+', '', ' '.join(t[1] for t in tokens if t[0] == 'text')).replace('；', '')
        if sum(t[:2] == ('start', 'tr') for t in tokens) != 19:
            raise ValueError('Public catalog must have 18 entries and one header row')
        for item in catalog:
            if re.sub(r'\s+', '', item['name']) not in rendered:
                raise ValueError('Public catalog project name changed: ' + item['name'])
            if re.sub(r'\s+', '', item['summary']).replace('；', '') not in rendered:
                raise ValueError('Public catalog project summary changed: ' + item['name'])
        for required in ['完整理解与相关入口', '真实效果图', '保存能力与基线下载', '原帖、技术与许可',
                         './projects/019-ridge-explorer/assets/explorer-v2-camp-polished.png']:
            if required not in text:
                raise ValueError('Missing prominent catalog entry: ' + required)
        report['catalog_homepage'] = {'http': 200, 'bytes': len(index), 'sha256': digest(index),
                                      'names_and_complete_summaries_match_git_catalog': True,
                                      'clear_ridge_entries_and_actual_hero': True}
        baseline_prefix = 'projects/018-ridge-atmosphere-lab/'
        baseline_paths = sorted(['index.html', *_client_bundles(git_bytes(baseline_prefix + 'web/index.html')),
                                 *(p for p in RUNTIME_ASSETS if not p.startswith('assets/exploration/')),
                                 'assets/polish-final.png'])
        with ThreadPoolExecutor(max_workers=6) as pool:
            baseline_data = list(pool.map(lambda path: fetch(BASE + 'projects/018-ridge-atmosphere-lab/' + path), baseline_paths))
        report['baseline_runtime'] = []
        for path, data in zip(baseline_paths, baseline_data):
            source = (baseline_prefix + 'assets/polish-final.png' if path == 'assets/polish-final.png'
                      else baseline_prefix + 'web/' + path)
            method = comparison(data, git_bytes(source), path)
            report['baseline_runtime'].append({'path': path, 'http': 200, 'bytes': len(data),
                                               'sha256': digest(data), 'source_comparison': method})
        report['success'] = True
    except Exception as error:
        report['errors'].append(str(error))
    destination.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'success': report['success'], 'resources_checked': len(report['resources']),
                      'catalog_entries_checked': len(report.get('catalog_entries', [])),
                      'baseline_runtime_checked': len(report.get('baseline_runtime', [])),
                      'errors': report['errors']}, ensure_ascii=False, indent=2))
    return 0 if report['success'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
