"""Inspect packaged reference navigation without claiming browser acceptance."""
import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
from urllib.request import urlopen

project = Path(__file__).resolve().parents[1]
root = project.parents[1]
web = project / 'web'
report = {'date': '2026-10-04', 'checks': [], 'browser_acceptance': 'pending',
          'browser_failure': 'cua node_repl kernel exited during Windows sandbox setup',
          'scope': 'reference descriptions, official external entrances, and existing local comparisons'}

def check(name, valid, **detail):
    report['checks'].append({'name': name, 'passed': bool(valid), **detail})
    if not valid:
        raise AssertionError((name, detail))

class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.ids, self.links, self.assets, self.duplicates = set(), [], [], []
        self.article_classes = []
        self.feed(source)

    def handle_starttag(self, tag, pairs):
        attrs = dict(pairs)
        if 'id' in attrs:
            if attrs['id'] in self.ids:
                self.duplicates.append(attrs['id'])
            self.ids.add(attrs['id'])
        if tag == 'a':
            self.links.append(attrs)
        if tag == 'link' and attrs.get('rel') == 'stylesheet':
            self.assets.append(attrs['href'])
        if tag == 'article':
            self.article_classes.append(attrs.get('class', ''))

pages = {name: Page((web / name).read_text(encoding='utf-8'))
         for name in ['references.html', 'forms.html', 'index.html', 'showcase.html']}
reference = pages['references.html']
check('reference sections and priority anchors',
      {'source', 'priorities', 'candidates', 'standards', 'hypersomnia', 'isocity', 'supertuxkart'} <= reference.ids)
check('unique reference anchors', not reference.duplicates)
check('three priority cards', sum('priority-card' in c.split() for c in reference.article_classes) == 3)
check('reference directory and both official web entrances',
      {'https://github.com/bobeff/open-source-games', 'https://play.hypersomnia.io/', 'https://iso-city.com/'} <=
      {a.get('href') for a in reference.links})

local_urls = set()
external_count = 0
for name, page in pages.items():
    for link in page.links:
        href = link.get('href', '')
        if not href:
            continue
        parts = urlsplit(href)
        if parts.scheme or parts.netloc:
            if name == 'references.html':
                external_count += 1
                check('external reference uses HTTPS and safe new window',
                      parts.scheme == 'https' and link.get('target') == '_blank' and
                      {'noopener', 'noreferrer'} <= set(link.get('rel', '').split()), href=href)
            continue
        # Only the new reference page and new summary links are in this inspection scope.
        if name != 'references.html' and parts.path != 'references.html':
            continue
        destination = (web / (unquote(parts.path) or name)).resolve()
        if destination.is_dir():
            destination /= 'index.html'
        check('local reference destination exists', destination.is_file(), origin=name, href=href)
        if parts.fragment:
            target_page = Page(destination.read_text(encoding='utf-8'))
            check('local reference fragment exists', parts.fragment in target_page.ids, origin=name, href=href)
        local_urls.add(href if parts.path else name + href)
    if name != 'references.html':
        check('summary links to reference page', any(urlsplit(a.get('href', '')).path == 'references.html' for a in page.links), page=name)

for stylesheet in reference.assets:
    check('reference stylesheet exists', (web / urlsplit(stylesheet).path).is_file())
baseline = json.loads((project / 'notes/open-source-reference-preservation-before-20261004.json').read_text(encoding='utf-8-sig'))
changed, missing, documentation_changes = [], [], []
for name, expected in baseline['protected'].items():
    path = web / name
    if not path.is_file():
        missing.append(name)
    elif hashlib.sha256(path.read_bytes()).hexdigest().upper() != expected:
        if name == 'README.md':
            documentation_changes.append(name)
        else:
            changed.append(name)
check('existing gameplay code and resources preserved', not changed and not missing,
      protected=len(baseline['protected']) - 1, changed=changed, missing=missing,
      authorized_documentation_changes=documentation_changes)

record = next(item for item in json.loads((root / 'projects.json').read_text(encoding='utf-8')) if item['id'] == 10)
check('original study source retained', record['repo'] == '' and record['reference'] == 'https://dumpling-dell.pages.dev/')
check('global summary records current coverage and reference value',
      all(term in record['summary'] for term in ['107', '116', 'bobeff/open-source-games', '效果标准', '待验证']))
public = root / '_site/projects/010-dumpling-style-lab'
for name in ['references.html', 'references.css', 'forms.html', 'forms.css', 'index.html', 'showcase.html']:
    check('built public file matches source', hashlib.sha256((web / name).read_bytes()).digest() ==
          hashlib.sha256((public / name).read_bytes()).digest(), path=name)
    with urlopen('http://127.0.0.1:8962/' + name, timeout=15) as response:
        check('running server serves current file', response.status == 200 and response.read() == (web / name).read_bytes(), path=name)
global_index = (root / '_site/index.html').read_text(encoding='utf-8')
check('global web summary connects directory and local guide',
      'https://github.com/bobeff/open-source-games' in global_index and
      './projects/010-dumpling-style-lab/references.html' in global_index and
      '分类目录、真实游戏体验与源码筛选' in global_index)
report.update({'passed': True, 'external_reference_links': external_count,
               'local_reference_routes': sorted(local_urls), 'protected_files': len(baseline['protected']) - 1,
               'authorized_documentation_changes': documentation_changes})
destination = project / 'notes/open-source-reference-check-20261004.json'
destination.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'passed': True, 'checks': len(report['checks']), 'protected': report['protected_files'],
                  'browser_acceptance': report['browser_acceptance']}, ensure_ascii=False))
