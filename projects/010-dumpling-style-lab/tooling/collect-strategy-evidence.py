from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[1]
checks=[];results={};errors=[];missing=[];reports=[]
for game in ('command','bastion','tactics'):
    path=ROOT/'notes'/('strategy-'+game+'-check-20261003.json');report=json.loads(path.read_text(encoding='utf-8'));assert report['passed'];checks.extend(report['checks']);results[game]=report['result'];errors.extend(report['errors']);missing.extend(report['missing']);reports.append(path.relative_to(ROOT).as_posix())
for game in ('bastion','tactics'):
    path=ROOT/'notes'/('strategy-forms-'+game+'-check-20261003.json');report=json.loads(path.read_text(encoding='utf-8'));assert report['passed'];checks.extend(report['checks']);errors.extend(report['errors']);missing.extend(report['missing']);reports.append(path.relative_to(ROOT).as_posix())
assert not errors and not missing
report={'passed':True,'method':'Combined independently completed fresh browser runs; actual UI controls, no state injection. Each source report retained.','sourceReports':reports,'checks':list(dict.fromkeys(checks)),'results':results,'errors':errors,'missing':missing}
(ROOT/'notes/strategy-forms-check-20261003.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('Verified',len(results),'games with',len(report['checks']),'distinct checks')
