"""Check the complete research publication and unchanged original map."""
import hashlib
import json
import sys
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT/'projects/013-insightface-retrieval'
sys.path.insert(0,str(ROOT/'scripts'))
from insightface_publish import publish_insightface, PAGES
from build_site import build
import projects as catalog

class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]; self.ids=[]
    def handle_starttag(self,tag,attrs):
        values=dict(attrs)
        if 'id' in values: self.ids.append(values['id'])
        for name in ('href','src'):
            if name in values: self.links.append(values[name])

class InsightFacePublicationTests(unittest.TestCase):
    def test_original_guide_files_are_not_redrawn(self):
        expected={'png':'791356db37e49495938f32bc80efe785b13016f24050a59191aeb110e6bd02d6',
                  'svg':'29501b30789718dc17944fcf754f139f9ad64d0f7b8c371e9b8d6c5072ac4ec4'}
        for ext,digest in expected.items():
            self.assertEqual(hashlib.sha256((PROJECT/'assets'/f'understanding-map.{ext}').read_bytes()).hexdigest(),digest)

    def test_all_five_pages_link_to_shipped_resources_and_existing_sections(self):
        with tempfile.TemporaryDirectory() as directory:
            site=Path(directory); publish_insightface(PROJECT,site)
            for name in PAGES:
                if not name.endswith('.html'): continue
                page=site/name; parser=Links(); parser.feed(page.read_text(encoding='utf-8'))
                self.assertEqual(len(parser.ids),len(set(parser.ids)),f'Duplicate IDs in {name}')
                for link in parser.links:
                    parsed=urlsplit(link)
                    if parsed.scheme or link=='../../': continue
                    target=site/(unquote(parsed.path) or name)
                    self.assertTrue(target.is_file(),f'{name}: {link}')
                    if parsed.fragment:
                        target_parser=Links(); target_parser.feed(target.read_text(encoding='utf-8'))
                        self.assertIn(unquote(parsed.fragment),target_parser.ids,f'{name}: {link}')

    def test_public_manifest_describes_all_files_and_keeps_teaching_distinct(self):
        with tempfile.TemporaryDirectory() as directory:
            site=Path(directory); manifest=publish_insightface(PROJECT,site)
            self.assertEqual(len(manifest['files']),9)
            self.assertFalse(manifest['real_recognition_test'])
            self.assertTrue(manifest['original_guide_unchanged'])
            for item in manifest['files']:
                data=(site/item['path']).read_bytes()
                self.assertEqual(len(data),item['bytes'])
                self.assertEqual(hashlib.sha256(data).hexdigest(),item['sha256'])

    def test_shared_catalog_entry_and_guide_caption_describe_our_research(self):
        record=next(item for item in json.loads((ROOT/'projects.json').read_text(encoding='utf-8')) if item['id']==13)
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory); project=root/'projects/013-insightface-retrieval'
            project.mkdir(parents=True)
            import shutil
            shutil.copytree(PROJECT/'web',project/'web')
            shutil.copytree(PROJECT/'assets',project/'assets')
            (project/'README.md').write_text('Research',encoding='utf-8')
            (root/'projects.json').write_text(json.dumps([record],ensure_ascii=False),encoding='utf-8')
            (root/'README.md').write_text((ROOT/'README.md').read_text(encoding='utf-8'),encoding='utf-8')
            build(root)
            index=(root/'_site/index.html').read_text(encoding='utf-8')
            for name in ['map.html','mechanisms.html','sources.html','understanding.html']:
                self.assertIn('projects/013-insightface-retrieval/'+name,index)
            self.assertIn('非原站截图',index)
            self.assertNotIn('原网页效果截图',index)
            self.assertIn('后台关联未确认',index)
            readme=catalog.render_readme(root,[record])
            self.assertIn('能力参考',readme)
            self.assertIn('原创理解汇总',readme)

    def test_public_page_keeps_every_research_heading_and_every_source_group(self):
        import re
        article=(PROJECT/'web/understanding.html').read_text(encoding='utf-8')
        for heading in re.findall(r'^## (.+)$',(PROJECT/'README.md').read_text(encoding='utf-8'),re.M):
            self.assertIn(heading,article)
        source=(PROJECT/'web/sources.html').read_text(encoding='utf-8')
        for index in range(1,15): self.assertIn(f'<td>S{index}</td>',source)
        self.assertIn('余弦分数不是同一人的概率',article)
        self.assertIn('未运行上游识别',source)

if __name__=='__main__': unittest.main()
