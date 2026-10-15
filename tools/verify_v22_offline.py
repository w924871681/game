"""Run the current real mock suite in a fresh external copy without Creator caches.

No generated project folder is copied, deleted, or substituted.  The original
strict options and limited test-only declaration are exercised unchanged.
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

sys.dont_write_bytecode = True
FORBIDDEN = {".git", "temp", "library", "node_modules", "profiles", "build", "local", "tmp", "native"}
EVIDENCE = "docs/validation/day5a-plus/v22/"


def fingerprint(name: str, data: bytes) -> dict:
    return {"path": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=pathlib.Path, default=pathlib.Path(__file__).resolve().parents[1])
    parser.add_argument("--label", default="final-offline")
    parser.add_argument("--typescript", type=pathlib.Path, default=None)
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z0-9_-]+", args.label):
        raise ValueError("Label must contain lowercase ASCII letters, digits, underscores or hyphens")
    root = args.project.resolve()
    directory = root / EVIDENCE
    directory.mkdir(parents=True, exist_ok=True)
    node, npm = shutil.which("node"), shutil.which("npm.cmd") or shutil.which("npm")
    if not node or not npm:
        raise ValueError("Existing Node and npm executables are required; this tool installs nothing")
    compiler = args.typescript
    if compiler is None:
        previous = json.loads((root / "docs/validation/day5a-plus/v21/final-offline.json").read_text(encoding="utf-8-sig"))
        compiler = pathlib.Path(previous["typescriptPath"])
    compiler = compiler.resolve(strict=True)
    compiler_version = subprocess.check_output([node, "-e", "process.stdout.write(require(process.argv[1]).version)", str(compiler)], cwd=root).decode()
    temp_names = ("temp/tsconfig.cocos.json", "temp/declarations/cc.d.ts")
    temp_before = {name: fingerprint(name, (root / name).read_bytes()) if (root / name).is_file() else None for name in temp_names}
    started = dt.datetime.now(dt.timezone.utc)
    isolated = root.parent / "game-deliverables" / f"V22_offline_{args.label}_{started:%Y%m%dT%H%M%S%fZ}" / "project"
    if isolated.is_relative_to(root):
        raise ValueError("Isolated copy must remain outside the source project")
    isolated.mkdir(parents=True, exist_ok=False)
    names = subprocess.check_output(["git", "--no-optional-locks", "-c", "core.quotepath=false", "ls-files", "-co", "--exclude-standard", "-z"], cwd=root).decode("utf-8").split("\0")
    copied, excluded = [], []
    for name in sorted(set(filter(None, names))):
        parts = pathlib.PurePosixPath(name).parts
        source = (root / name).resolve(strict=True)
        source.relative_to(root)
        if parts[0] in FORBIDDEN or "__pycache__" in parts:
            excluded.append(name)
            continue
        if not source.is_file():
            continue
        target = (isolated / name).resolve()
        target.relative_to(isolated)
        data = source.read_bytes()
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        copied.append(fingerprint(name, data))
    copies_before = all(fingerprint(e["path"], (isolated / e["path"]).read_bytes()) == e for e in copied)
    absent_before = {name: not (isolated / name).exists() for name in sorted(FORBIDDEN)}
    if not copies_before or not all(absent_before.values()):
        raise ValueError("Fresh source copy does not match or contains a forbidden generated directory")
    env = os.environ.copy()
    env["TYPESCRIPT_PATH"] = str(compiler)
    execution = subprocess.run([npm, "test"], cwd=isolated, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    ended = dt.datetime.now(dt.timezone.utc)
    output = execution.stdout.decode("utf-8", errors="replace")
    groups = [int(value) for value in re.findall(r"(\d+) mock behavior groups passed", output)]
    diagnostics = re.findall(r"error TS(\d+):", output)
    limited = "PASS strict TypeScript semantic checking (LIMITED TEST-ONLY tools/test/cc.d.ts contract)" in output
    absent_after = {name: not (isolated / name).exists() for name in sorted(FORBIDDEN)}
    copies_after = all(fingerprint(e["path"], (isolated / e["path"]).read_bytes()) == e for e in copied)
    temp_after = {name: fingerprint(name, (root / name).read_bytes()) if (root / name).is_file() else None for name in temp_names}
    ok = execution.returncode == 0 and len(groups) == 1 and groups[0] >= 207 and limited and not diagnostics and copies_after and all(absent_after.values()) and temp_before == temp_after
    result = {
        "schemaVersion": 1, "timestamp": ended.isoformat(), "ok": ok, "mode": "current", "projectRoot": root.as_posix(),
        "startedAtUtc": started.isoformat(), "endedAtUtc": ended.isoformat(), "command": ["npm", "test"], "cwd": isolated.as_posix(),
        "isolatedProject": isolated.as_posix(), "exitCode": execution.returncode,
        "nodePath": node, "nodeVersion": subprocess.check_output([node, "--version"]).decode().strip(), "npmPath": npm,
        "typescriptPath": compiler.as_posix(), "typescriptVersion": compiler_version, "typescriptEnvironmentOverride": "Child process only; existing real compiler path, no installs or generated configuration",
        "typescriptOutput": re.findall(r"TypeScript [^\r\n]+", output), "diagnosticCodes": diagnostics,
        "passedBehaviorGroups": groups, "original207PreservationEvidence": EVIDENCE + "preservation.json", "limitedMockContract": limited,
        "excludedSourcePaths": excluded, "forbiddenFoldersAbsentBefore": absent_before, "forbiddenFoldersAbsentAfter": absent_after,
        "copyFileCount": len(copied), "copiedFilesMatchSourceBeforeExecution": copies_before, "copiedFilesUnchangedAfterExecution": copies_after,
        "isolatedCopiedFiles": copied, "originalProjectTempBefore": temp_before, "originalProjectTempAfter": temp_after,
        "originalProjectTempUnchanged": temp_before == temp_after,
        "contract": fingerprint("tools/test/cc.d.ts", (root / "tools/test/cc.d.ts").read_bytes()),
        "limitations": ["Actual project components compiled and exercised with the existing limited mock. This does not run Creator, render Preview, use physical touch, or certify a platform.", "Group count alone does not prove history preservation; the independent byte audit binds all original 207 test bodies and strict harness."],
    }
    log = directory / f"{args.label}.log"
    report = directory / f"{args.label}.json"
    for previous in (log, report):
        if previous.exists():
            previous.with_name(f"{previous.stem}-prior-{started:%Y%m%dT%H%M%S%fZ}{previous.suffix}").write_bytes(previous.read_bytes())
    metadata = {key: result[key] for key in ("mode", "command", "cwd", "startedAtUtc", "endedAtUtc", "exitCode", "typescriptPath", "typescriptVersion")}
    log.write_bytes(json.dumps(metadata, ensure_ascii=False).encode("utf-8") + b"\n" + execution.stdout + b"\n")
    result["log"] = fingerprint(log.relative_to(root).as_posix(), log.read_bytes())
    report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: result[key] for key in ("ok", "isolatedProject", "exitCode", "typescriptVersion", "diagnosticCodes", "passedBehaviorGroups", "copyFileCount", "originalProjectTempUnchanged")}, ensure_ascii=False, indent=2))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
