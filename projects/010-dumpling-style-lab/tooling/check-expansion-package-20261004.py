"""Verify the three premium additions without opening a browser or game saves.

Run once for preflight, then --final after the three genuine screenshot covers
are in place. All counts come from evaluated catalog exports, not comments.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parents[1]
WEB = PROJECT / "web"
NODE = Path("C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe")
REPORT = PROJECT / "notes/expansion-package-check-20261004.json"
BASELINE = PROJECT / "notes/expansion-quality-preservation-before-20261004.json"
IDS = {"roll": ("rolling-ball", "createRoll"), "chain": ("marble-chain", "createChain"), "watch": ("surveillance", "createWatch")}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def execute(command: list[str], cwd: Path = ROOT) -> dict:
    result = subprocess.run(command, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return {"command": command, "exit_code": result.returncode, "stdout": result.stdout.strip(), "stderr": result.stderr.strip()}


def check_catalogs() -> dict:
    program = r"""
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const web=process.argv[1];
const context=vm.createContext({URLSearchParams,location:{search:''}});
const output={};
for(const [file,properties] of [['game-forms-catalog.js',['gameForms','gameFormMap']],['showcase-catalog.js',['newDirections','legacyDirections','directions','directionMap']]]){
 const mod=new vm.SourceTextModule(fs.readFileSync(path.join(web,file),'utf8'),{context,identifier:file});
 await mod.link(()=>{throw new Error('Unexpected catalog dependency')});
 await mod.evaluate();
 for(const name of properties)output[name]=JSON.parse(JSON.stringify(mod.namespace[name]));
}
process.stdout.write(JSON.stringify(output));
"""
    run = execute([str(NODE), "--experimental-vm-modules", "--input-type=module", "-e", program, str(WEB)])
    if run["exit_code"]:
        return {"passed": False, "execution": run}
    exports = json.loads(run["stdout"])
    forms, directions = exports["gameForms"], exports["directions"]
    errors = []
    for entries, label in [(forms, "forms"), (directions, "directions")]:
        if len({d["id"] for d in entries}) != len(entries):
            errors.append(f"Duplicate {label} IDs")
    if len(forms) != 43 or len(directions) != 52 or len(exports["newDirections"]) != 43 or len(exports["legacyDirections"]) != 9:
        errors.append("Catalog counts differ from 43 forms / 52 entries / 9 legacy")
    additions = {}
    for form in forms:
        if form.get("play") not in exports["directionMap"]:
            errors.append(f"Form {form['id']} has no playable direction")
    for game, (form_id, _) in IDS.items():
        form = exports["gameFormMap"].get(form_id)
        direction = exports["directionMap"].get(game)
        if not form or form.get("play") != game or not direction:
            errors.append(f"Missing or mismatched {game} catalog entry")
        if form and direction:
            additions[game] = {"form": form, "direction": direction}
            if direction.get("cover") != f"assets/game-forms/{game}/preview.webp":
                errors.append(f"{game} does not reference its dedicated preview cover path")
    return {"passed": not errors, "errors": errors, "forms": len(forms), "directions": len(directions), "new_directions": len(exports["newDirections"]), "legacy_directions": len(exports["legacyDirections"]), "additions": additions}


def preservation() -> dict:
    before = json.loads(BASELINE.read_text(encoding="utf-8"))
    changed, missing = [], []
    for relative, old_hash in before["files"].items():
        path = WEB / relative
        if not path.is_file():
            missing.append(relative)
        elif sha(path) != old_hash:
            changed.append(relative)
    return {"passed": not changed and not missing and len(before["files"]) == before.get("count") == 2233, "recorded_count": len(before["files"]), "declared_count": before.get("count"), "changed": changed, "missing": missing, "intentional_shared": before.get("intentional_shared", [])}


def factories_and_resources(final: bool) -> dict:
    shared = (WEB / "showcase.js").read_text(encoding="utf-8")
    errors, pending, imports, resources = [], [], [], {}
    if not re.search(r"premiumIds\s*=\s*new Set\(\[\s*'roll'\s*,\s*'chain'\s*,\s*'watch'\s*\]\)", shared):
        errors.append("Shared premium IDs are missing")
    if "import('./showcase-'+id+'.js" not in shared:
        errors.append("Shared dynamic import does not resolve to new modules")
    for game, (_, export) in IDS.items():
        module = WEB / f"showcase-{game}.js"
        source = module.read_text(encoding="utf-8") if module.is_file() else ""
        if not re.search(r"export\s+(?:async\s+)?function\s+" + export + r"\s*\(", source):
            errors.append(f"{module.name} is missing {export}")
        if not re.search(game + r"\s*:\s*['\"]" + export + r"['\"]", shared):
            errors.append(f"Shared export mapping for {game} is missing")
        for target in re.findall(r"\bfrom\s+['\"]([^'\"]+)['\"]", source):
            target_path = module.parent / target.split("?")[0]
            imports.append({"module": module.name, "import": target, "exists": target_path.is_file()})
            if not target_path.is_file():
                errors.append(f"Missing dependency: {target}")
        directory = WEB / "assets/game-forms" / game
        items = sorted(directory.rglob("*")) if directory.is_dir() else []
        resources[game] = [{"path": p.relative_to(WEB).as_posix(), "bytes": p.stat().st_size, "sha256": sha(p)} for p in items if p.is_file()]
        for basename in ["ATTRIBUTION.md", "preview.webp"]:
            if not (directory / basename).is_file():
                (errors if final else pending).append(f"Missing {game}/{basename}")
        for literal in re.findall(r"['\"](assets/[^'\"]+\.(?:webp|png|jpg|glb|ogg|wav))['\"]", source):
            if not (WEB / literal).is_file():
                errors.append(f"Missing runtime resource: {literal}")
        # Expand the actual literal image arrays and their local constant spreads.
        constants = {}
        for name, body in re.findall(r"\b([A-Z][A-Z_]+)\s*=\s*\[([^\]]*)\]", source):
            constants[name] = re.findall(r"['\"]([^'\"]+)['\"]", body)
        for body, base in re.findall(r"images\(\s*\[([^\]]*)\]\s*,\s*['\"]([^'\"]+)['\"]", source):
            names = re.findall(r"['\"]([^'\"]+)['\"]", body)
            for symbol in re.findall(r"\.\.\.([A-Z][A-Z_]+)", body):
                if symbol not in constants:
                    errors.append(f"Cannot resolve runtime image spread {symbol}")
                names.extend(constants.get(symbol, []))
            for name in names:
                path = WEB / (base + name + ".webp")
                if not path.is_file():
                    errors.append(f"Missing runtime image: {base}{name}.webp")
        for base, body in re.findall(r"modelsAt\(\s*['\"]([^'\"]+)['\"]\s*,\s*\[([^\]]*)\]", source):
            for name in re.findall(r"['\"]([^'\"]+)['\"]", body):
                if not (WEB / (base + name + ".glb")).is_file():
                    errors.append(f"Missing runtime model: {base}{name}.glb")
            if not (WEB / base / "License.txt").is_file():
                errors.append(f"Missing model license for {base}")
    return {"passed": not errors, "errors": errors, "pending": pending, "imports": imports, "runtime_resources": resources, "resource_count": sum(len(r) for r in resources.values()), "module_count": len(IDS)}


def provenance() -> dict:
    errors, verified = [], []
    roll = PROJECT / "notes/roll-assets-20261004.json"
    chain = PROJECT / "assets/game-forms/chain-generation-20261004.json"
    watch = PROJECT / "assets/game-forms/watch-generation-20261004.json"
    for path in [roll, chain, watch]:
        if not path.is_file():
            errors.append(f"Missing provenance: {path.relative_to(PROJECT)}")
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        if path == roll:
            archive = PROJECT / data["archive"]
            expected = data.get("original_sha256")
            if not archive.is_file() or not expected or sha(archive) != expected:
                errors.append("Roll original PNG does not match recorded generation SHA256")
            else:
                verified.append({"path": archive.relative_to(PROJECT).as_posix(), "sha256": sha(archive), "matched_recorded_original": True})
            if not data.get("prompt"):
                errors.append("Roll generation prompt is missing")
        elif path == chain:
            for key in ["scene", "sprites", "spriteEdgeEdit"]:
                item = data.get(key, {})
                archive = PROJECT / item.get("workspaceSource", "missing")
                original = Path(item.get("source", "missing"))
                if not archive.is_file() or not original.is_file() or sha(archive) != sha(original):
                    errors.append(f"Chain {key} preserved PNG differs from ImageGen original")
                else:
                    verified.append({"path": archive.relative_to(PROJECT).as_posix(), "sha256": sha(archive), "matched_imagegen_original": True})
                if not item.get("prompt"):
                    errors.append(f"Chain {key} generation prompt is missing")
        else:
            for item in data.get("assets", []):
                archive = PROJECT / "assets/game-forms/watch-sources" / (item["id"] + ".png")
                original = Path(item.get("source", "missing"))
                if not archive.is_file() or not original.is_file() or sha(archive) != sha(original):
                    errors.append(f"Watch {item['id']} preserved PNG differs from ImageGen original")
                else:
                    verified.append({"path": archive.relative_to(PROJECT).as_posix(), "sha256": sha(archive), "matched_imagegen_original": True})
                if not item.get("prompt"):
                    errors.append(f"Watch {item['id']} generation prompt is missing")
            if len(data.get("assets", [])) != 6:
                errors.append("Watch provenance does not contain all four scenes and both characters")
    vendor_licenses = []
    for folder in [WEB / "vendor/showcase", WEB / "vendor/physics"]:
        matches = [p for p in folder.iterdir() if p.is_file() and "LICENSE" in p.name.upper()]
        vendor_licenses.extend(p.relative_to(WEB).as_posix() for p in matches)
        if not matches:
            errors.append(f"Missing vendor license: {folder.relative_to(WEB)}")
    return {"passed": not errors, "errors": errors, "original_sources_verified": verified, "original_source_count": len(verified), "vendor_licenses": vendor_licenses}


def packaged_bytes() -> dict:
    destination = ROOT / "_site/projects/010-dumpling-style-lab"
    candidates = [WEB / f"showcase-{game}.js" for game in IDS]
    for game in IDS:
        candidates.extend(p for p in (WEB / "assets/game-forms" / game).rglob("*") if p.is_file())
    baseline = json.loads(BASELINE.read_text(encoding="utf-8"))
    candidates.extend(WEB / p for p in baseline.get("intentional_shared", []) if (WEB / p).is_file())
    mismatches, inventory = [], []
    for source in sorted(set(candidates)):
        relative = source.relative_to(WEB)
        copied = destination / relative
        match = copied.is_file() and sha(source) == sha(copied)
        inventory.append({"path": relative.as_posix(), "bytes": source.stat().st_size, "sha256": sha(source), "copied_exactly": match})
        if not match:
            mismatches.append(relative.as_posix())
    return {"passed": not mismatches, "destination": str(destination), "file_count": len(inventory), "mismatches": mismatches, "inventory": inventory}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--final", action="store_true", help="Require covers and rebuild / compare deployable output")
    args = parser.parse_args()
    report = {"generated_at": datetime.now(timezone.utc).isoformat(), "phase": "final" if args.final else "preflight", "browser_access": False, "normal_save_access": False}
    report["preservation"] = preservation()
    report["catalogs"] = check_catalogs()
    report["factory_resources"] = factories_and_resources(args.final)
    report["provenance"] = provenance()
    if args.final:
        report["site_tests"] = execute([sys.executable, "-m", "unittest", "discover", "-s", "tests", "-p", "test_site.py"])
        # Run unchanged production regression logic while suppressing only its
        # report write: this checker owns its own JSON, not the legacy QA note.
        wrapper = r"""
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const originalWrite=fs.writeFileSync;
const protectedNote=path.resolve(process.argv[2]);
fs.writeFileSync=function(destination,...args){
 if(typeof destination==='string' && path.resolve(destination)===protectedNote)return;
 return originalWrite.call(this,destination,...args);
};
await import(pathToFileURL(process.argv[1]).href);
"""
        report["world_regression"] = execute([str(NODE), "--experimental-vm-modules", "--input-type=module", "-e", wrapper, str(PROJECT / "tooling/check-world-rules.mjs"), str(PROJECT / "notes/worlds-rules-check.json")])
        if report["world_regression"]["exit_code"] == 0:
            report["world_regression"]["check_count"] = len(json.loads(report["world_regression"]["stdout"])["checks"])
        site_count = re.search(r"Ran (\d+) tests?", report["site_tests"]["stderr"])
        report["site_tests"]["test_count"] = int(site_count.group(1)) if site_count else None
        report["build"] = execute([sys.executable, str(ROOT / "scripts/build_site.py")])
        report["packaged_bytes"] = packaged_bytes()
        match = re.search(r"Built (\d+) static demo", report["build"]["stdout"])
        report["build_demo_count"] = int(match.group(1)) if match else None
    required = [report[k]["passed"] for k in ["preservation", "catalogs", "factory_resources", "provenance"]]
    if args.final:
        required += [report[k]["exit_code"] == 0 for k in ["site_tests", "world_regression", "build"]]
        required += [report["packaged_bytes"]["passed"], report["build_demo_count"] == 19, report["site_tests"].get("test_count") == 6, report["world_regression"].get("check_count") == 56]
    report["passed"] = all(required)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary = {"phase": report["phase"], "passed": report["passed"], "preserved": report["preservation"]["recorded_count"], "forms": report["catalogs"].get("forms"), "directions": report["catalogs"].get("directions"), "runtime_resource_count": report["factory_resources"]["resource_count"], "original_source_count": report["provenance"]["original_source_count"], "pending": report["factory_resources"]["pending"], "errors": {k: report[k].get("errors", []) for k in ["catalogs", "factory_resources", "provenance"]}, "report": str(REPORT)}
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
