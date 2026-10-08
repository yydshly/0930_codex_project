import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prior = JSON.parse(fs.readFileSync(path.join(project, 'notes/direction-deck-regressions-20261005.json'), 'utf8'));
const scripts = [...prior.runs.map(run => run.script), 'check-direction-deck-rules.mjs', 'check-direction-deck-controller.mjs'];
if (scripts.length !== 22 || new Set(scripts).size !== scripts.length) throw new Error('Expected the actual twenty prior scripts plus the two deck scripts.');
const runs = [];
for (const name of scripts) {
  const script = path.join(project, 'tooling', name);
  const code = `import fs from 'node:fs'; const write = fs.writeFileSync; fs.writeFileSync = function(file, ...args) { if (fs.existsSync(file)) return; return write.call(this, file, ...args); }; await import(${JSON.stringify(pathToFileURL(script).href)});`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd: project, encoding: 'utf8', timeout: 120000 });
  const count = Number((result.stdout?.match(/(\d+)\s+[^\n]*(?:checks|callbacks)[^\n]*passed/i) || [])[1] || 0);
  runs.push({ script: name, exit_code: result.status, stdout: result.stdout || '', stderr: result.stderr || '', count, passed: result.status === 0 && count > 0, ...(result.error ? { error: result.error.message } : {}) });
}
const passed = runs.every(run => run.passed);
const checks = runs.filter(run => run.passed).map(run => `Actual old direction rerun: ${run.script} (${run.count} checks)`);
const report = { date: '2026-10-05', passed, overallpassed: passed, count: checks.length, checks, directions: 11, script_count: runs.length, total_checks: runs.reduce((sum, run) => sum + run.count, 0), method: 'Actual rerun in independent Node processes; existing fs.writeFileSync report writes suppressed. Historical reports remain untouched, and no stored pass state substitutes for current script execution.', runs };
fs.writeFileSync(path.join(project, 'notes/direction-wildlife-regressions-20261005.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed, scripts: runs.length, checks: report.total_checks, failures: runs.filter(run => !run.passed) }, null, 2));
if (!passed) process.exitCode = 1;
