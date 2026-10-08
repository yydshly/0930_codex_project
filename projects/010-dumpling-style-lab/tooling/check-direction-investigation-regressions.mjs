import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prior = JSON.parse(fs.readFileSync(path.join(project, 'notes/direction-wildlife-regressions-20261005.json'), 'utf8'));
const scripts = [...prior.runs.map(run => run.script), 'check-direction-wildlife-rules.mjs', 'check-direction-wildlife-controller.mjs'];
if (scripts.length !== 24 || new Set(scripts).size !== scripts.length) throw new Error('Expected the actual twenty-two prior scripts plus the two wildlife scripts.');
const notes = path.join(project, 'notes');
const digest = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const oldReports = fs.readdirSync(notes).filter(name => name.startsWith('direction-') && name.endsWith('.json') && !name.startsWith('direction-investigation-')).map(name => ({ name, sha256: digest(path.join(notes, name)) }));
const runs = [];
for (const name of scripts) {
  const script = path.join(project, 'tooling', name);
  const code = `import fs from 'node:fs'; const write = fs.writeFileSync; fs.writeFileSync = function(file, ...args) { if (fs.existsSync(file)) return; return write.call(this, file, ...args); }; await import(${JSON.stringify(pathToFileURL(script).href)});`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd: project, encoding: 'utf8', timeout: 120000 });
  const count = Number((result.stdout?.match(/(\d+)\s+[^\n]*(?:checks|callbacks)[^\n]*passed/i) || [])[1] || 0);
  runs.push({ script: name, exit_code: result.status, stdout: result.stdout || '', stderr: result.stderr || '', count, passed: result.status === 0 && count > 0, ...(result.error ? { error: result.error.message } : {}) });
}
const historicalReportsUnchanged = oldReports.every(report => digest(path.join(notes, report.name)) === report.sha256);
const passed = runs.every(run => run.passed) && historicalReportsUnchanged;
const checks = runs.filter(run => run.passed).map(run => `Actual old direction rerun: ${run.script} (${run.count} checks)`);
if (historicalReportsUnchanged) checks.push(`All ${oldReports.length} historical direction report files retain exact bytes after rerun`);
const report = { date: '2026-10-05', passed, overallpassed: passed, count: checks.length, checks, directions: 12, script_count: runs.length, total_checks: runs.reduce((sum, run) => sum + run.count, 0), historical_reports_unchanged: historicalReportsUnchanged, historical_reports: oldReports, method: 'Actual rerun in independent Node processes; existing fs.writeFileSync report writes suppressed. All old direction JSON reports are SHA256-compared before and after execution. Historical reports remain untouched, and no stored pass state substitutes for current script execution.', runs };
fs.writeFileSync(path.join(project, 'notes/direction-investigation-regressions-20261005.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed, scripts: runs.length, checks: report.total_checks, historical_reports_unchanged: historicalReportsUnchanged, historical_reports: oldReports.length, failures: runs.filter(run => !run.passed) }, null, 2));
if (!passed) process.exitCode = 1;
