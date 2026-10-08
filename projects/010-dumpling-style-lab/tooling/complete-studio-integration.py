from pathlib import Path
p=Path(__file__).with_name('integrate-studio.py')
s=p.read_text(encoding='utf-8')
header=s[:s.index('forms=[];directions=[]')]
tail=s[s.index('edit(\'showcase.js\',\'"assembly",'): ]
exec(header+"\nids=','.join(json.dumps(v[1]) for v in entries)\n"+tail)
