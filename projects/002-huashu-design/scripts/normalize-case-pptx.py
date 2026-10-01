"""Remove only proven dangling content-type declarations; leave slide XML intact."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.etree import ElementTree as ET
import json, shutil
ET.register_namespace('', 'http://schemas.openxmlformats.org/package/2006/content-types')
root=Path(__file__).resolve().parents[1]
out=root/'web/cases/research-desk/downloads/research-desk.pptx'
raw=root/'build/case/raw-upstream-export.pptx'
shutil.copy2(out,raw)
with ZipFile(raw) as source:
    names=set(source.namelist())
    original=source.read('[Content_Types].xml')
    tree=ET.fromstring(original)
    missing=[e for e in tree if e.tag.endswith('Override') and e.get('PartName','').lstrip('/') not in names]
    expected={f'/ppt/slideMasters/slideMaster{i}.xml' for i in range(2,7)}
    assert {e.get('PartName') for e in missing}<=expected, 'Unexpected missing part: do not silently normalize'
    removed=[]
    for e in missing:
        removed.append(e.get('PartName'));tree.remove(e)
    # The exported deck uses slideMaster1. No slide or relationship refers to removed declarations.
    for part in names:
        if part.endswith('.rels'):
            rels=ET.fromstring(source.read(part))
            assert not any(any(Path(m).name == Path(r.get('Target','')).name for m in removed) for r in rels)
    with ZipFile(out,'w',ZIP_DEFLATED) as dest:
        for info in source.infolist():
            dest.writestr(info,ET.tostring(tree,encoding='utf-8',xml_declaration=True) if info.filename=='[Content_Types].xml' else source.read(info.filename))
report={'reason':'Export package declared absent slide masters. Cause was not isolated to upstream versus bundled pptxgenjs.','removed_content_type_overrides':removed,'slide_and_notes_xml_changed':False}
(root/'build/case/package-normalization.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
