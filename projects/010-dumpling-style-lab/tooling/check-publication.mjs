// Syntax and existing non-browser gameplay regressions for the complete release.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const project = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const syntax = walk(path.join(project, 'web')).filter(file => file.endsWith('.js'));
const regressions = fs.readdirSync(path.join(project, 'tooling')).filter(name =>
  /^check-.+(rules|lifecycle|catalogs|slots|templates|controller|regressions)\.mjs$/.test(name)
  || name === 'check-public-service-gates.mjs');
let failures = 0;
for (const file of syntax) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) { failures++; console.error(file, result.stderr); }
}
console.log(`Syntax checked ${syntax.length} runtime JavaScript files`);
for (const name of regressions) {
  const flags = name === 'check-world-rules.mjs' ? ['--experimental-vm-modules'] : [];
  const result = spawnSync(process.execPath, [...flags, path.join(project, 'tooling', name)],
    { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0) {
    failures++;
    console.error('FAILED', name, (result.stderr || result.stdout || String(result.error)).slice(-6000));
  } else console.log('PASS', name);
}
console.log(JSON.stringify({ syntax_files: syntax.length, regression_suites: regressions.length, failures }));
process.exitCode = failures ? 1 : 0;
