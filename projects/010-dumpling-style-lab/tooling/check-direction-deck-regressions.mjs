import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const prior=JSON.parse(fs.readFileSync(path.join(project,'notes/direction-vehicle-regressions-20261005.json'),'utf8'));
const scripts=[...prior.runs.map(x=>x.script),'check-direction-vehicle-rules.mjs','check-direction-vehicle-controller.mjs'];
const runs=[];
for(const name of scripts){
 const script=path.join(project,'tooling',name);
 const code=`import fs from 'node:fs';const write=fs.writeFileSync;fs.writeFileSync=function(file,...args){if(fs.existsSync(file))return;return write.call(this,file,...args)};await import(${JSON.stringify(pathToFileURL(script).href)});`;
 const r=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:project,encoding:'utf8',timeout:120000});
 const count=Number((r.stdout.match(/(\d+)\s+[^\n]*(?:checks|callbacks)[^\n]*passed/i)||[])[1]||0);
 runs.push({script:name,exit_code:r.status,stdout:r.stdout,stderr:r.stderr,count,passed:r.status===0&&count>0});
}
const report={date:'2026-10-05',passed:runs.every(x=>x.passed),directions:10,script_count:runs.length,total_checks:runs.reduce((s,x)=>s+x.count,0),method:'Actual rerun in independent Node processes; fs.writeFileSync suppressed for existing reports, so historical evidence is preserved. No stored report pass status is substituted for current execution.',runs};
fs.writeFileSync(path.join(project,'notes/direction-deck-regressions-20261005.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,scripts:runs.length,checks:report.total_checks,failures:runs.filter(x=>!x.passed)},null,2));
if(!report.passed)process.exitCode=1;
