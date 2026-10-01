"""Reproduce research observations against an unchanged, pinned upstream cache.

Only creates fixtures under this project's ignored .cache; no agent/API calls.
The observations include expected limitations, not assertions of product quality.
"""
import hashlib
import json
import os
import platform
import shutil
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHA = '77e7a3e21469dcbece2558086c8d91657abeaa40'
UP = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / '.cache' / ('learn-harness-engineering-' + SHA)
RUN = ROOT / '.cache' / ('verification-' + uuid.uuid4().hex[:8])
RUN.mkdir(parents=True)
SCRIPTS = UP / 'skills/harness-creator/scripts'
BASH = next((str(p) for p in [Path('D:/tool/Git/bin/bash.exe'), Path('C:/Program Files/Git/bin/bash.exe')] if p.exists()), shutil.which('bash'))
records = []
env = os.environ.copy()
env['PYTHONIOENCODING'] = 'utf-8'
env['TMPDIR'] = env['TEMP'] = env['TMP'] = str(RUN)

def record(name, ok, evidence):
    records.append({'name': name, 'confirmed': bool(ok), 'evidence': evidence})
    print(('OK ' if ok else 'UNCONFIRMED ') + name, flush=True)

def run(args, cwd=RUN):
    result = subprocess.run([str(x) for x in args], cwd=cwd, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=45)
    return {'exit_code': result.returncode, 'stdout': result.stdout.strip(), 'stderr': result.stderr.strip()}

def node(script, *args, cwd=RUN):
    return run(['node', SCRIPTS / script, *args], cwd)

def fixture(name, files=None):
    folder = RUN / name
    folder.mkdir()
    for path, value in (files or {}).items():
        target = folder / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(value) if isinstance(value, dict) else value, encoding='utf-8')
    return folder

def digest(folder):
    return {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in folder.iterdir() if p.is_file()}

def main():
    manifest = json.loads((ROOT / 'notes/upstream-inventory.json').read_text(encoding='utf-8'))
    mismatches = []
    for item in manifest['files']:
        p = UP / item['path']
        data = p.read_bytes() if p.exists() else b''
        blob = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
        if blob != item['git_blob_sha']:
            mismatches.append(item['path'])
    record('固定版本全部文件的 Git blob SHA 校验', not mismatches, {'files': len(manifest['files']), 'mismatches': mismatches})

    empty = fixture('empty')
    r = node('validate-harness.mjs', '--target', empty, '--json')
    data = json.loads(r['stdout'])
    record('空目录评分为 20/100，退出码 1', data['overall'] == 20 and r['exit_code'] == 1, r)

    target = fixture('node-project', {'package.json': {'name': 'research-fixture', 'scripts': {'check': 'node check.cjs', 'test': 'node test.cjs', 'build': 'node build.cjs'}}})
    r = node('create-harness.mjs', '--target', target)
    expected = ['AGENTS.md', 'feature_list.json', 'progress.md', 'session-handoff.md', 'init.sh']
    record('Node 项目生成五个工作文件', r['exit_code'] == 0 and all((target/p).is_file() for p in expected), r)
    text = (target/'init.sh').read_text(encoding='utf-8')
    record('从 package.json 选择安装、检查、测试和构建命令', all(s in text for s in ['npm install', 'npm run check', 'npm test', 'npm run build']), text)
    before = digest(target)
    r = node('create-harness.mjs', '--target', target)
    record('再次运行默认保留原文件', before == digest(target), r)

    r = node('validate-harness.mjs', '--target', target, '--json')
    data = json.loads(r['stdout'])
    record('没有业务代码和实际测试的模板项目仍为 100/100', r['exit_code'] == 0 and data['overall'] == 100 and not (target/'test.cjs').exists(), r)
    features = json.loads((target/'feature_list.json').read_text())
    features['features'][0]['status'] = 'invented-status'
    (target/'feature_list.json').write_text(json.dumps(features), encoding='utf-8')
    r = node('validate-harness.mjs', '--target', target, '--json')
    record('非法状态字符串不被 Node 评分器拒绝', json.loads(r['stdout'])['overall'] == 100, r)

    html_file = RUN/'assessment.html'
    r = node('render-assessment-html.mjs', '--target', target, '--output', html_file)
    record('可生成独立 HTML 结构评分报告', r['exit_code'] == 0 and '<!doctype html>' in html_file.read_text(encoding='utf-8'), r)
    r = node('validate-harness.mjs', '--target', target, '--json', '--html', RUN/'combined.html')
    record('同时传 --json 与 --html 时 stdout 包含提示行', r['exit_code'] == 0 and r['stdout'].startswith('HTML report written'), r)
    r = node('run-benchmark.mjs', '--target', target, '--output', RUN/'benchmark.json', '--html', RUN/'benchmark.html')
    report = json.loads((RUN/'benchmark.json').read_text(encoding='utf-8'))
    record('结构 benchmark 自检与 10 条 eval 结构检查可运行', r['exit_code'] == 0 and report['selfCheck']['pass'] and report['evals']['cases'] == 10, report)

    variants = [
        ('typescript-react', {'package.json': {'dependencies': {'react': 'x'}}}, 'npm install'),
        ('typescript', {'package.json': {'devDependencies': {'typescript': 'x'}}}, 'npm install'),
        ('python', {'pyproject.toml': ''}, 'python3 -m pytest || [ $? -eq 5 ]'),
        ('go', {'go.mod': 'module fixture'}, 'go test ./...'),
        ('rust', {'Cargo.toml': ''}, 'cargo test'),
        ('java-maven', {'pom.xml': ''}, 'mvn test'),
        ('java-gradle', {'build.gradle': ''}, './gradlew test'),
        ('dotnet', {'demo.csproj': ''}, 'dotnet test'),
        ('generic', {}, 'No package manifest detected'),
    ]
    for stack, files, command in variants:
        f = fixture(stack, files)
        r = node('create-harness.mjs', '--target', f)
        record('技术栈命令生成：' + stack, r['exit_code'] == 0 and 'Detected stack: '+stack in r['stdout'] and command in (f/'init.sh').read_text(), {'expected_command':command, **r})
    for manager, lock in [('pnpm','pnpm-lock.yaml'), ('yarn','yarn.lock'), ('bun','bun.lock')]:
        f = fixture(manager, {'package.json': {'scripts': {'test':'node test.cjs'}}, lock: ''})
        r = node('create-harness.mjs', '--target', f)
        record('锁文件识别：'+manager, r['exit_code'] == 0 and manager+' install' in (f/'init.sh').read_text(), r)

    f = fixture('claude-file')
    r = node('create-harness.mjs', '--target', f, '--agent-file', 'CLAUDE.md')
    record('可指定 CLAUDE.md 作为入口文件', r['exit_code'] == 0 and (f/'CLAUDE.md').exists() and not (f/'AGENTS.md').exists(), r)

    f = fixture('failure-gate', {'pass.cjs': "console.log('first-step-ok')", 'fail.cjs': 'process.exit(7)', 'later.cjs': "require('node:fs').writeFileSync('unexpected-marker','bad')"})
    r = node('create-harness.mjs', '--target', f, '--commands', 'node pass.cjs,node fail.cjs,node later.cjs')
    record('可使用自定义验证命令替换探测结果', r['exit_code'] == 0 and 'npm install' not in (f/'init.sh').read_text(), r)
    if BASH:
        r = run([BASH, str(f/'init.sh')], cwd=f)
        record('生成的 init.sh 遇到失败停止且不执行后续命令', r['exit_code'] == 7 and 'first-step-ok' in r['stdout'] and not (f/'unexpected-marker').exists(), r)
        r = run([BASH, UP/'tools/audit-harness.sh', target])
        record('Bash 审计采用不同清单，Node 满分项目仍可能失败', r['exit_code'] == 1 and 'CRITICAL' in r['stdout'] and 'Summary' in r['stdout'], r)
        solution = UP/'projects/project-06/solution'
        r = run([BASH, solution/'scripts/check-architecture.sh'], cwd=solution)
        record('P06 架构边界检查脚本可运行', r['exit_code'] == 0 and 'All architecture boundary checks passed' in r['stdout'], r)
        f = fixture('architecture-violation', {'src/renderer/bad.ts': "import fs from 'fs';", 'src/services/ok.ts': '', 'src/main/ok.ts': ''})
        r = run([BASH, solution/'scripts/check-architecture.sh'], cwd=f)
        record('架构检查能捕获示例 renderer 的 fs 导入', r['exit_code'] == 1 and 'VIOLATION' in r['stdout'], r)
        r = run([BASH, solution/'scripts/check-architecture.sh'], cwd=empty)
        record('缺少源码目录也可通过架构检查，不能代替覆盖验证', r['exit_code'] == 0 and 'All architecture boundary checks passed' in r['stdout'], r)
        # Explicit python3 adapter isolates Windows alias differences from script behavior.
        shim = fixture('python-adapter', {'python3': '#!/usr/bin/env bash\nexec "'+sys.executable.replace('\\','/')+'" "$@"\n'})
        env['PATH'] = str(shim) + os.pathsep + env['PATH']
        f = fixture('missing-content', {'documents-meta.json': '[{"id":"doc-1","status":"imported"}]'})
        (f/'content').mkdir()
        r = run([BASH, solution/'scripts/cleanup-scanner.sh', str(f).replace('\\','/')])
        record('清理扫描器缺失正文时报告 MISSING 却仍汇总 CLEAN', r['exit_code'] == 0 and 'MISSING: content/doc-1' in r['stdout'] and 'Result: CLEAN' in r['stdout'], r)
        f = fixture('orphan-content', {'documents-meta.json': '[]', 'content/orphan.txt': 'fixture'})
        r = run([BASH, solution/'scripts/cleanup-scanner.sh', str(f).replace('\\','/')])
        record('清理扫描器发现孤立文件仍以 0 退出，不能直接作为 CI 关卡', r['exit_code'] == 0 and 'ISSUES FOUND' in r['stdout'], r)
    else:
        record('Bash 运行条件', False, '未找到可用 Bash；未运行 Bash 检查')

    record('P07/P08 有课程任务文档但没有对应 projects 工程目录', all(list((UP/'docs/en/projects').glob(f'project-{n}-*/index.md')) and not (UP/f'projects/project-{n}').exists() for n in ['07','08']), {'actual_project_directories':sorted(p.name for p in (UP/'projects').iterdir() if p.is_dir())})
    graph = next((UP/'docs/en/lectures').glob('lecture-14-*/code/maker_checker_graph.py')).read_text(encoding='utf-8')
    record('图编排包含未实现模型调用与占位测试', 'raise NotImplementedError' in graph and 'return "def test" in code' in graph, '静态源码核对；未连接模型，未安装 LangGraph。')
    qa = (UP/'projects/project-06/solution/src/services/qa-service.ts').read_text(encoding='utf-8')
    record('P06 问答为预设模式和关键词检索', 'MOCK_PATTERNS' in qa and '.includes(word)' in qa and '0.85 : 0.3' in qa, '静态源码核对；未启动 Electron GUI。')

    final = {'research_date':'2026-09-30','generated_at':datetime.now(timezone.utc).isoformat(),'revision':SHA,'environment':{'platform':platform.platform(),'python':platform.python_version(),'node':run(['node','--version'])['stdout'],'bash':BASH},'scope':'固定源码哈希、脚手架、结构评分、报告、命令探测和部分 Bash 检查；不包含真实 Agent 效果、Electron GUI、课程网站/PDF 构建。','observations':records,'confirmed':sum(r['confirmed'] for r in records),'total':len(records)}
    # Keep evidence portable and avoid publishing workstation-specific scratch paths.
    output = json.dumps(final,ensure_ascii=False,indent=2)
    for path, replacement in [(str(RUN),'<FIXTURES>'),(str(UP),'<UPSTREAM>')]:
        output = output.replace(path.replace('\\','\\\\'),replacement).replace(path.replace('\\','/'),replacement)
    (ROOT/'notes/verification-results.json').write_text(output+'\n',encoding='utf-8')
    print(f"Confirmed {final['confirmed']}/{final['total']} observations")
    return 0 if final['confirmed'] == final['total'] else 1

if __name__ == '__main__':
    raise SystemExit(main())
