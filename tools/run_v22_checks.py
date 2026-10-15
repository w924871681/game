"""Execute final V22 local checks without changing source, SDK or Git state.

The SDK declaration self-check is recorded separately, including its real
nonzero exit and diagnostic locations; it is never represented as a clean SDK.
Run only after runtime, test and verification tool sources are frozen.
"""
from __future__ import annotations

import concurrent.futures
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
ROOT = pathlib.Path(__file__).resolve().parents[1]
DIRECTORY = ROOT / "docs/validation/day5a-plus/v22"


def fingerprint(name: str, data: bytes) -> dict:
    return {"path": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def visible() -> list[str]:
    return sorted(set(filter(None, subprocess.check_output(["git", "--no-optional-locks", "-c", "core.quotepath=false", "ls-files", "-co", "--exclude-standard", "-z"], cwd=ROOT).decode("utf-8").split("\0"))))


def source_snapshot(names: list[str]) -> list[dict]:
    return [fingerprint(name, (ROOT / name).read_bytes()) for name in names
            if name.startswith(("assets/scripts/", "extensions/", "tools/", "settings/"))
            and pathlib.PurePosixPath(name).suffix in {".ts", ".js", ".cjs", ".mjs", ".py", ".json"}
            or name in {"package.json", "tsconfig.json"}]


def command(label: str, arguments: list[str]) -> dict:
    started = dt.datetime.now(dt.timezone.utc)
    process = subprocess.run(arguments, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    ended = dt.datetime.now(dt.timezone.utc)
    output = process.stdout.decode("utf-8", errors="replace")
    metadata = {"label": label, "command": arguments, "cwd": ROOT.as_posix(), "startedAtUtc": started.isoformat(), "endedAtUtc": ended.isoformat(), "exitCode": process.returncode}
    path = DIRECTORY / f"{label}.log"
    if path.exists():
        preserved = path.with_name(f"{path.stem}-prior-{started:%Y%m%dT%H%M%S%fZ}{path.suffix}")
        preserved.write_bytes(path.read_bytes())
    path.write_bytes(json.dumps(metadata, ensure_ascii=False).encode("utf-8") + b"\n" + process.stdout + b"\n")
    diagnostics = re.findall(r"(?:^|\n|Error: )([^\r\n]+?\.d\.ts)\((\d+),(\d+)\): error TS(\d+):", output)
    return {**metadata, "log": fingerprint(path.relative_to(ROOT).as_posix(), path.read_bytes()),
            "behaviorGroups": [int(value) for value in re.findall(r"(\d+) mock behavior groups passed", output)],
            "diagnosticErrorLineCount": len(re.findall(r"error TS\d+:", output)),
            "typescriptOutput": re.findall(r"TypeScript [^\r\n]+", output),
            "sdkDiagnosticsExcludedFromProject": [int(value) for value in re.findall(r"SDK DECLARATION LIMITATION: (\d+)", output)],
            "diagnostics": [{"file": f, "line": int(line), "column": int(column), "code": int(code)} for f, line, column, code in diagnostics]}


def main() -> int:
    DIRECTORY.mkdir(parents=True, exist_ok=True)
    node, npm = shutil.which("node"), shutil.which("npm.cmd") or shutil.which("npm")
    if not node or not npm:
        raise ValueError("Existing Node/npm are required; nothing is installed")
    names = visible()
    before = source_snapshot(names)
    work = [("final-tests", [npm, "test"]), ("final-cocos-types", [npm, "run", "check:cocos"]),
            ("final-sdk-self", [npm, "run", "check:cocos", "--", "--check-sdk-declarations"])]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(lambda item: command(*item), work))
    javascript = [name for name in names if pathlib.PurePosixPath(name).suffix in {".js", ".cjs", ".mjs"}]
    js_results = [command("syntax-" + re.sub(r"[^a-zA-Z0-9_-]", "_", name), [node, "--check", name]) for name in javascript]
    python = [name for name in names if name.endswith(".py")]
    py_results = []
    for name in python:
        try:
            compile((ROOT / name).read_bytes(), name, "exec")
            py_results.append({"path": name, "ok": True})
        except (SyntaxError, ValueError) as error:
            py_results.append({"path": name, "ok": False, "error": str(error)})
    isolated = command("final-offline-execution", [sys.executable, "tools/verify_v22_offline.py", "--label", "final-offline"])
    offline_path = DIRECTORY / "final-offline.json"
    offline = json.loads(offline_path.read_text(encoding="utf-8-sig")) if offline_path.exists() else {}
    after = source_snapshot(visible())
    tests, types, sdk = results
    sdk_actual = sdk["diagnosticErrorLineCount"]
    sdk_only = bool(sdk["diagnostics"]) and len(sdk["diagnostics"]) == sdk_actual and all("C:/ProgramData/cocos/editors/Creator/3.8.8/" in item["file"].replace("\\", "/") for item in sdk["diagnostics"])
    sdk_sources = {}
    for item in sdk["diagnostics"]:
        sdk_sources[item["file"]] = sdk_sources.get(item["file"], 0) + 1
    tests_groups = tests["behaviorGroups"]
    checks = [
        {"name": "Actual npm behavior regression includes original207 and separate V22 suites", "ok": tests["exitCode"] == 0 and len(tests_groups) == 1 and tests_groups[0] > 207},
        {"name": "Actual Creator SDK project strict types", "ok": types["exitCode"] == 0 and types["diagnosticErrorLineCount"] == 0},
        {"name": "Installed SDK diagnostics separately observed without source/config modification", "ok": sdk["exitCode"] != 0 and sdk_only and types["sdkDiagnosticsExcludedFromProject"] == [sdk_actual]},
        {"name": "Every Git-visible JS/CJS/MJS source parsed", "ok": all(item["exitCode"] == 0 for item in js_results)},
        {"name": "Every Git-visible Python source compiled without imports or pycache", "ok": all(item["ok"] for item in py_results)},
        {"name": "Fresh no-temp isolated current-source regression", "ok": isolated["exitCode"] == 0 and offline.get("ok") is True and offline.get("passedBehaviorGroups") == tests_groups},
        {"name": "Runtime/tool/configuration sources unchanged during commands", "ok": before == after},
        {"name": "Version-only final alpha4", "ok": json.loads((ROOT / "package.json").read_text(encoding="utf-8-sig")).get("version") == "0.0.5-alpha.4"},
    ]
    result = {
        "schemaVersion": 1, "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(), "ok": all(item["ok"] for item in checks),
        "scope": "Actual local commands and fresh source copy. Mock groups, project types, installed SDK self-check and real Creator/Preview are distinct evidence layers.",
        "checks": checks, "commands": results + [isolated], "javascriptSyntax": {"files": len(js_results), "passed": sum(item["exitCode"] == 0 for item in js_results), "commands": js_results},
        "pythonSyntax": {"files": len(py_results), "passed": sum(item["ok"] for item in py_results), "results": py_results},
        "sdkSelfValidation": {"status": "FAILED_INSTALLED_SDK_DECLARATIONS" if sdk["exitCode"] else "PASSED", "exitCode": sdk["exitCode"], "actualDiagnostics": sdk_actual,
                              "previousV21Diagnostics": 102, "differenceFromV21": sdk_actual - 102, "diagnosticsOnlyInInstalledSdk": sdk_only, "sources": sdk_sources,
                              "note": "The SDK self-check remains a real nonzero failure when diagnostics exist. Its separate successful recording is not a claim that SDK declarations pass."},
        "isolatedOffline": {**fingerprint(offline_path.relative_to(ROOT).as_posix(), offline_path.read_bytes()), "ok": offline.get("ok"), "behaviorGroups": offline.get("passedBehaviorGroups")},
        "environment": {"nodePath": node, "nodeVersion": subprocess.check_output([node, "--version"]).decode().strip(), "npmPath": npm, "npmVersion": subprocess.check_output([npm, "--version"]).decode().strip(), "pythonPath": sys.executable, "pythonVersion": sys.version, "typescriptVersion": offline.get("typescriptVersion")},
        "sourceSnapshotBefore": before, "sourceSnapshotAfter": after, "sourceFilesUnchanged": before == after, "gitMutations": False,
    }
    output = DIRECTORY / "checks.json"
    if output.exists():
        output.with_name(f"checks-prior-{dt.datetime.now(dt.timezone.utc):%Y%m%dT%H%M%S%fZ}.json").write_bytes(output.read_bytes())
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": result["ok"], "checks": checks, "behaviorGroups": tests_groups, "sdkSelfValidation": result["sdkSelfValidation"], "javascriptFiles": len(js_results), "pythonFiles": len(py_results)}, ensure_ascii=False, indent=2))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
