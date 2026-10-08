import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const notes=path.join(project,'notes');
const prior=JSON.parse(fs.readFileSync(path.join(notes,'direction-investigation-regressions-20261005.json'),'utf8'));
const scripts=[...prior.runs.map(r=>r.script),'check-direction-investigation-rules.mjs','check-direction-investigation-controller.mjs'];
if(scripts.length!==26||new Set(scripts).size!==26)throw new Error('Expected 26 prior real rule/controller scripts.');
const digest=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const oldReports=fs.readdirSync(notes).filter(n=>n.startsWith('direction-')&&n.endsWith('.json')&&!n.startsWith('direction-landscape-')).map(name=>({name,sha256:digest(path.join(notes,name))}));
const runs=[];
for(const script of scripts){
  const code=`import fs from 'node:fs'; const write=fs.writeFileSync; fs.writeFileSync=function(file,...args){if(fs.existsSync(file))return;return write.call(this,file,...args);};await import(${JSON.stringify(pathToFileURL(path.join(project,'tooling',script)).href)});`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:project,encoding:'utf8',timeout:120000});
  const count=Number((result.stdout?.match(/(\d+)\s+[^\n]*(?:checks|callbacks)[^\n]*passed/i)||[])[1]||0);
  runs.push({script,exit_code:result.status,stdout:result.stdout||'',stderr:result.stderr||'',count,passed:result.status===0&&count>0,...(result.error?{error:result.error.message}:{})});
}
const historical_reports_unchanged=oldReports.every(r=>digest(path.join(notes,r.name))===r.sha256);
const passed=runs.every(r=>r.passed)&&historical_reports_unchanged;
const report={date:'2026-10-06',passed,directions:13,script_count:runs.length,total_checks:runs.reduce((n,r)=>n+r.count,0),historical_reports_unchanged,historical_reports:oldReports,method:'Actual independent Node reruns with only existing report writes suppressed; old report SHA256 compared before and after. No historical pass substitutes for current execution.',runs};
fs.writeFileSync(path.join(notes,'direction-landscape-regressions-20261006.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed,scripts:runs.length,checks:report.total_checks,historical_reports_unchanged,reports:oldReports.length,failures:runs.filter(r=>!r.passed)},null,2));
if(!passed)process.exitCode=1;
