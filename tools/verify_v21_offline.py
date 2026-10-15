"""Run the actual npm mock suite in a fresh source copy without Creator caches.

Use --mode baseline-before to reproduce the captured Color declaration defect,
--mode baseline-after to apply only the current four-field contract correction
to a fresh baseline copy, or --mode current (default) for final source regression.
No original temp, SDK, configuration or business source is modified or removed.
All isolated directories are unique and retained outside the project.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import zipfile


FORBIDDEN = {".git", "temp", "library", "node_modules", "profiles", "build", "local", "tmp", "native"}
CONTRACT = "tools/test/cc.d.ts"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def fingerprint(name, data):
    return {"path": name, "bytes": len(data), "sha256": sha(data)}


def exact_color_fix(original):
    ending = b"\r\n" if b"\r\n" in original else b"\n"
    anchor = b"    export class Color {" + ending
    if original.count(anchor) != 1:
        raise ValueError("Captured Color declaration must have one exact class header")
    fields = ending.join(b"        " + channel + b": number;" for channel in (b"r", b"g", b"b", b"a")) + ending
    return original.replace(anchor, anchor + fields, 1)


def runtime_color(node, compiler, root):
    # Execute the exact existing class statement, never a replacement mock class.
    code = r"""
const fs = require('fs'), vm = require('vm'), crypto = require('crypto');
const ts = require(process.argv[1]), name = process.argv[2];
const source = fs.readFileSync(name, 'utf8'), unit = ts.createSourceFile(name, source, ts.ScriptTarget.ES2020, true, ts.ScriptKind.JS);
let statements = [];
function visit(n) { if (ts.isClassDeclaration(n) && n.name?.text === 'Color') statements.push(n.getText(unit)); ts.forEachChild(n, visit); }
visit(unit);
if (statements.length !== 1) throw new Error('Expected exactly one existing Color class in the actual mock harness');
const ExistingColor = vm.runInNewContext(statements[0] + '; Color;');
const explicit = new ExistingColor(11,22,33,44), defaults = new ExistingColor();
const channels = ['r','g','b','a'];
const valid = channels.every((k,i) => Object.hasOwn(explicit,k) && typeof explicit[k] === 'number' && explicit[k] === [11,22,33,44][i]);
if (!valid) throw new Error('Existing mock runtime Color does not supply numeric channels');
process.stdout.write(JSON.stringify({ok: valid, mode: 'Exact existing mock Color class statement executed; no replacement class added', explicit, defaults, sourceClassSha256: crypto.createHash('sha256').update(statements[0]).digest('hex')}));
"""
    run = subprocess.run([node, "-e", code, compiler, str(root / "tools/verify-day1.cjs")], cwd=root, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if run.returncode:
        raise RuntimeError(run.stderr.decode("utf-8", errors="replace"))
    return json.loads(run.stdout)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=("baseline-before", "baseline-after", "current"), default="current")
    parser.add_argument("--label", default=None)
    parser.add_argument("--project", type=pathlib.Path, default=pathlib.Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    label = args.label or f"phase0-offline-{args.mode}"
    if not re.fullmatch(r"[a-z0-9_-]+", label):
        raise ValueError("Log label must contain lowercase ASCII letters, digits, underscore or hyphen")
    root = args.project.resolve()
    directory = root / "docs/validation/day5a-plus/v21"
    baseline_path = directory / "baseline.json"
    baseline = json.loads(baseline_path.read_text(encoding="utf-8-sig"))
    node = shutil.which("node")
    npm = shutil.which("npm.cmd") or shutil.which("npm")
    compiler = baseline["environment"]["typescriptPath"]
    compiler_version = subprocess.check_output([node, "-e", "process.stdout.write(require(process.argv[1]).version)", compiler], cwd=root).decode("utf-8")
    source_temp = {str(p.relative_to(root)).replace("\\", "/"): fingerprint(str(p.relative_to(root)).replace("\\", "/"), p.read_bytes())
                   for p in (root / "temp/tsconfig.cocos.json", root / "temp/declarations/cc.d.ts") if p.is_file()}
    started = dt.datetime.now(dt.timezone.utc)
    stamp = started.strftime("%Y%m%dT%H%M%S%fZ")
    isolated = root.parent / "game-deliverables" / f"V21_offline_{label}_{stamp}" / "project"
    isolated.mkdir(parents=True, exist_ok=False)
    original_contract = None
    excluded = []
    if args.mode.startswith("baseline-"):
        archive_path = pathlib.Path(baseline["backup"]["path"])
        archive_bytes = archive_path.read_bytes()
        if len(archive_bytes) != baseline["backup"]["bytes"] or sha(archive_bytes) != baseline["backup"]["sha256"]:
            raise ValueError("Captured pre-edit baseline ZIP SHA/bytes changed")
        with zipfile.ZipFile(archive_path) as archive:
            payload = {entry["path"]: archive.read(entry["path"]) for entry in baseline["files"]}
        for entry in baseline["files"]:
            data = payload[entry["path"]]
            if len(data) != entry["bytes"] or sha(data) != entry["sha256"]:
                raise ValueError(f"Captured source entry does not match baseline: {entry['path']}")
        original_contract = payload[CONTRACT]
        if args.mode == "baseline-after":
            actual = (root / CONTRACT).read_bytes()
            if actual != exact_color_fix(original_contract):
                raise ValueError("Current contract differs from captured file by more than the four numeric channel declarations")
            payload[CONTRACT] = actual
    else:
        names = subprocess.check_output(["git", "--no-optional-locks", "-c", "core.quotepath=false", "ls-files", "-co", "--exclude-standard", "-z"], cwd=root).decode("utf-8").split("\0")
        payload = {name: (root / name).read_bytes() for name in sorted(set(names)) if name and (root / name).is_file()}
    for name, data in payload.items():
        parts = pathlib.PurePosixPath(name).parts
        if not parts or parts[0] in FORBIDDEN:
            excluded.append(name)
            continue
        target = (isolated / name).resolve()
        target.relative_to(isolated)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    copied = [fingerprint(name, data) for name, data in payload.items() if name not in excluded]
    copies_match = all((isolated / e["path"]).read_bytes() == payload[e["path"]] for e in copied)
    absent_before = {name: not (isolated / name).exists() for name in sorted(FORBIDDEN)}
    if not copies_match or not all(absent_before.values()):
        raise ValueError("Fresh isolated copy differs from source or contains a forbidden generated directory")
    color = runtime_color(node, compiler, root)
    env = os.environ.copy()
    env["TYPESCRIPT_PATH"] = compiler
    command = [npm, "test"]
    execution = subprocess.run(command, cwd=isolated, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    ended = dt.datetime.now(dt.timezone.utc)
    text = execution.stdout.decode("utf-8", errors="replace")
    error_codes = re.findall(r"error TS(\d+):", text)
    channels = re.findall(r"error TS2339: Property '([rgba])' does not exist on type 'Color'", text)
    groups = [int(n) for n in re.findall(r"(\d+) mock behavior groups passed", text)]
    limited = "PASS strict TypeScript semantic checking (LIMITED TEST-ONLY tools/test/cc.d.ts contract)" in text
    actual_ts = re.findall(r"TypeScript [^\r\n]+", text)
    absent_after = {name: not (isolated / name).exists() for name in sorted(FORBIDDEN)}
    copied_after = all((isolated / e["path"]).read_bytes() == payload[e["path"]] for e in copied)
    source_temp_after = {name: fingerprint(name, (root / name).read_bytes()) for name in source_temp}
    if args.mode == "baseline-before":
        expected = execution.returncode != 0 and sorted(channels) == ["a", "b", "g", "r"] and error_codes == ["2339"] * 4 and not groups
        expected_result = "Actual nonzero npm exit and exactly the four original Color channel TS2339 diagnostics; no behavior PASS claimed"
    else:
        expected = execution.returncode == 0 and len(groups) == 1 and groups[0] >= 174 and limited and not error_codes
        if args.mode == "baseline-after":
            expected = expected and groups == [174]
        expected_result = "Actual zero npm exit, limited mock semantic compilation, all original 174 behavior groups retained"
    result = {
        "schemaVersion": 1, "timestamp": ended.isoformat(), "ok": expected and copied_after and all(absent_after.values()) and source_temp == source_temp_after,
        "mode": args.mode, "expectedResult": expected_result, "projectRoot": root.as_posix(), "isolatedProject": isolated.as_posix(),
        "startedAtUtc": started.isoformat(), "endedAtUtc": ended.isoformat(), "command": ["npm", "test"], "cwd": isolated.as_posix(), "exitCode": execution.returncode,
        "nodePath": node, "nodeVersion": subprocess.check_output([node, "--version"]).decode().strip(), "npmPath": npm,
        "typescriptPath": compiler, "typescriptVersion": compiler_version, "typescriptEnvironmentOverride": "Child process only, existing compiler path; no package install or generated config",
        "typescriptOutput": actual_ts, "diagnosticCodes": error_codes, "missingColorChannels": channels, "passedBehaviorGroups": groups,
        "mockRuntimeColor": color, "limitedMockContract": limited, "excludedSourcePaths": excluded, "forbiddenFoldersAbsentBefore": absent_before, "forbiddenFoldersAbsentAfter": absent_after,
        "copyFileCount": len(copied), "copiedFilesMatchSourceBeforeExecution": copies_match, "copiedFilesUnchangedAfterExecution": copied_after,
        "isolatedCopiedFiles": copied, "originalProjectTempBefore": source_temp, "originalProjectTempAfter": source_temp_after, "originalProjectTempUnchanged": source_temp == source_temp_after,
        "contract": fingerprint(CONTRACT, payload[CONTRACT]), "onlyBaselineChange": CONTRACT if args.mode == "baseline-after" else None,
        "limitations": ["Runs the actual project components with the existing limited in-memory mock. No Creator, Preview, rendering, natural audio or platform build is claimed.", "The isolated source copy excludes all original generated folders; its strict compiler options and test code are unchanged."],
    }
    metadata = {key: result[key] for key in ("mode", "command", "cwd", "startedAtUtc", "endedAtUtc", "exitCode", "typescriptPath", "typescriptVersion")}
    log = directory / f"{label}.log"
    log.write_bytes((json.dumps(metadata, ensure_ascii=False) + "\n").encode("utf-8") + execution.stdout + b"\n")
    result["log"] = fingerprint(log.relative_to(root).as_posix(), log.read_bytes())
    report = directory / f"{label}.json"
    report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: result[key] for key in ("ok", "mode", "isolatedProject", "exitCode", "typescriptVersion", "diagnosticCodes", "missingColorChannels", "passedBehaviorGroups", "copyFileCount", "originalProjectTempUnchanged")}, ensure_ascii=False, indent=2))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
