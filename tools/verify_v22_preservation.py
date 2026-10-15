"""Audit V22 changes against the real, uncommitted 972-file alpha3 baseline.

Only writes a new V22 JSON report.  Existing files, original evidence, asset
metadata, Git index/HEAD, Creator caches and source are never changed here.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import pathlib
import re
import subprocess
import sys
import zipfile

sys.dont_write_bytecode = True
from verify_v21_preservation import CORE, Graph, INPUT_PATHS

EVIDENCE = "docs/validation/day5a-plus/v22/"
BASELINE_SHA = "44bc4f1a1d76c6a1978b6a9c4d421bf229b3aa36e7861087c7096c1a7c3002b0"
ALLOWED_MODIFICATIONS = {
    **{name: "Actual Creator save of optional child-visual readability flag; UUID, input ancestry and P2 presentation frozen" for name in CORE.values()},
    "assets/scripts/visuals/V21CleanDustView.ts": "Bounded existing 192-Sprite deterministic sweep feathering only; controller and private visual bridge frozen",
    "assets/scripts/visuals/ElementVisual.ts": "Optional child-art caption legibility and display-only stable-ID short names; input root/IDs frozen",
    "extensions/deskrescue-editor/main.js": "Append V22 actual Editor delegation; old dedicated V2/V21 source frozen",
    "extensions/deskrescue-editor/scene.js": "Append V22 actual Editor delegation; old dedicated V2/V21 source frozen",
    "extensions/deskrescue-editor/package.json": "Append V22 Editor commands and version-only alpha4",
    "tools/verify-day1.cjs": "Append separate V22 suites; exact inverse comparison retains original 207 group bodies and compiler",
    "package.json": "Only alpha3 to alpha4 version field; original engine, configuration and commands unchanged",
    "README.md": "Current V22 scope/evidence plus retained V21 history",
    "docs/GPT_HANDOFF.md": "Current V22 handoff plus retained previous history",
}
OLD_TESTS = ("tools/verify-day4.cjs", "tools/verify-day5a.cjs", "tools/verify-day5a-v2.cjs", "tools/verify-day5a-v21-clean.cjs", "tools/verify-v21-visuals.cjs")


def descriptor(name: str, data: bytes) -> dict:
    return {"path": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def parse(data: bytes):
    return json.loads(data.decode("utf-8-sig"))


def addition_category(name: str) -> str | None:
    if name.startswith(EVIDENCE):
        return "New V22 operational evidence only; every pre-V22 artifact remains byte-frozen"
    if re.fullmatch(r"extensions/deskrescue-editor/v22-(?:main|scene|audit|probe)\.js", name):
        return "Independent V22 actual Creator entry, visual-only save, pure historical audit/probe reuse"
    if name in {"tools/verify-v22-clean.cjs", "tools/verify-v22-readability.cjs", "tools/verify_v22_offline.py", "tools/verify_v22_preservation.py", "tools/package_v22_delivery.py", "tools/run_v22_checks.py", "tools/compare_v22_previews.py"}:
        return "Separate V22 behavioral/verification/comparison/delivery tooling"
    if name in {"docs/DAY5A_PLUS_V22_CLOSEOUT.md", "docs/DAY5A_PLUS_V22_CREATOR_VALIDATION.md", "docs/DESKRESCUE_V22_TASK.md"}:
        return "New V22 scoped closeout, validation or exact authorized task archive"
    return None


def normalize_reference(graph: Graph, value, seen=None):
    if isinstance(value, dict):
        if set(value) == {"__id__"}:
            target = graph.ref(value)
            if target is None:
                return {"missingReference": value}
            if target.get("__type__") in {"cc.Node", "cc.Scene"}:
                return {"nodePath": graph.node_path(target)}
            if "node" in target:
                return {"componentPath": graph.node_path(target), "componentType": target.get("__type__")}
            identities = set() if seen is None else set(seen)
            if id(target) in identities:
                return {"cycleType": target.get("__type__")}
            identities.add(id(target))
            return normalize_reference(graph, target, identities)
        return {key: normalize_reference(graph, item, seen) for key, item in value.items() if key not in {"_id", "__prefab", "_prefab", "__editorExtras__"}}
    if isinstance(value, list):
        return [normalize_reference(graph, item, seen) for item in value]
    return value


def compress_uuid(uuid: str, head_length: int = 5) -> str:
    digits = uuid.replace("-", "")
    if not re.fullmatch(r"[a-fA-F0-9]{32}", digits):
        return uuid
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
    result = digits[:head_length]
    for index in range(head_length, len(digits), 3):
        number = int(digits[index:index + 3], 16)
        result += alphabet[number >> 6] + alphabet[number & 63]
    return result


def protected_scene(graph: Graph, visual_types: set[str]) -> dict:
    # Same normalization as the actual V22 Creator audit. Every legacy node,
    # child order and component stays frozen; only the new false default field
    # on actual inactive LegacyDay3 ElementVisual components is normalized.
    snapshot = {}
    for node in graph.nodes:
        path = graph.node_path(node)
        components = []
        for ref in node.get("_components", []):
            component = graph.ref(ref)
            if "/LegacyDay3/" in path and component and component.get("__type__") in visual_types and component.get("smallScreenLegibility") is False:
                component = {key: value for key, value in component.items() if key != "smallScreenLegibility"}
            components.append(normalize_reference(graph, component))
        snapshot[path] = {"node": normalize_reference(graph, {k: v for k, v in node.items() if k not in {"_components", "_children"}}),
                          "childOrder": [graph.node_path(graph.ref(ref)) for ref in node.get("_children", [])],
                          "components": components}
    return snapshot


def element_semantics(graph: Graph, visual_types: set[str]) -> dict:
    """Normalize only the four explicitly permitted child-caption changes."""
    visuals = [item for item in graph.data if isinstance(item, dict) and item.get("__type__") in visual_types]
    captions = {id(graph.ref(item.get("caption"))) for item in visuals}
    snapshot = {}
    for node in graph.nodes:
        path = graph.node_path(node)
        components = []
        for ref in node.get("_components", []):
            original = graph.ref(ref)
            component = original
            if component and component.get("__type__") in visual_types:
                component = {key: value for key, value in component.items() if key != "smallScreenLegibility"}
            if original and original.get("__type__") == "cc.Label" and id(original) in captions:
                component = {key: value for key, value in component.items() if key not in {"_enableOutline", "_outlineColor", "_outlineWidth"}}
            components.append(normalize_reference(graph, component))
        snapshot[path] = {"node": normalize_reference(graph, {k: v for k, v in node.items() if k not in {"_components", "_children"}}),
                          "childOrder": [graph.node_path(graph.ref(ref)) for ref in node.get("_children", [])], "components": components}
    return snapshot


def exact_runner(old: str, new: str) -> tuple[bool, dict]:
    imports = [
        "        const day5aV22Clean = require('./verify-v22-clean.cjs').runV22CleanTests(runtime);\n",
        "        const day5aV22Readability = require('./verify-v22-readability.cjs').runV22ReadabilityTests(runtime);\n",
    ]
    stripped = new
    occurrences = {line.strip(): stripped.count(line) for line in imports}
    for line in imports:
        stripped = stripped.replace(line, "", 1)
    addition = " + day5aV22Clean + day5aV22Readability"
    group_count = stripped.count(addition)
    stripped = stripped.replace(addition, "", 1)
    # Root appends standalone V22 assertions only; no historical assertion or
    # test body is removed by these exact whole-line, distinctive matches.
    assertions = [line for line in stripped.splitlines(keepends=True) if re.fullmatch(r"        assert\.(?:equal|ok)\([^\n]*, '(?:All 207 historical behavior groups remain intact|V2\.2 [^'\n]+)'\);\n", line)]
    for line in assertions:
        stripped = stripped.replace(line, "", 1)
    ok = stripped == old and all(count == 1 for count in occurrences.values()) and group_count == 1 and len(assertions) >= 3
    return ok, {"newSuiteImportOccurrences": occurrences, "groupSummationAdditionOccurrences": group_count, "newStandaloneAssertions": [line.strip() for line in assertions], "inverseRestoresExactOriginal": stripped == old}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=pathlib.Path, default=pathlib.Path(__file__).resolve().parents[1])
    parser.add_argument("--output", default=EVIDENCE + "preservation.json")
    parser.add_argument("--phase", choices=("sample", "final"), default="final")
    args = parser.parse_args()
    root = args.project.resolve()
    output = (root / args.output).resolve()
    output_name = output.relative_to(root).as_posix()
    if not output_name.startswith(EVIDENCE) or output.suffix != ".json":
        raise ValueError("Only a new JSON under V22 evidence may be written")
    baseline_name = EVIDENCE + "baseline.json"
    baseline_bytes = (root / baseline_name).read_bytes()
    baseline = parse(baseline_bytes)
    original = {item["path"]: item for item in baseline["files"]}
    if output_name in original:
        raise ValueError("Refusing to overwrite captured user evidence")
    checks = []

    def check(name, passed, actual=None, expected=None):
        checks.append({"name": name, "passed": bool(passed), "actual": actual, "expected": expected})

    def git(*parts):
        return subprocess.check_output(["git", "--no-optional-locks", "-c", "core.quotepath=false", *parts], cwd=root).decode("utf-8").strip("\r\n")

    head, branch = git("rev-parse", "HEAD"), git("branch", "--show-current")
    staged = sorted(filter(None, git("diff", "--cached", "--name-only", "-z").split("\0")))
    names = sorted(set(filter(None, git("ls-files", "-co", "--exclude-standard", "-z").split("\0"))) - {output_name})
    current = {name: descriptor(name, (root / name).read_bytes()) for name in names if (root / name).is_file()}
    check("Baseline:actual972FileSnapshotPinned", descriptor(baseline_name, baseline_bytes)["sha256"] == BASELINE_SHA and len(original) == len(baseline["files"]) == 972, {"sha256": descriptor(baseline_name, baseline_bytes)["sha256"], "files": len(original)}, {"sha256": BASELINE_SHA, "files": 972})
    check("Git:HEADUnchanged", head == baseline["git"]["head"], head, baseline["git"]["head"])
    check("Git:branchUnchanged", branch == baseline["git"]["branch"], branch, baseline["git"]["branch"])
    check("Git:noNewStaging", staged == baseline["git"]["stagedPaths"], staged, baseline["git"]["stagedPaths"])
    backup = baseline["externalBackup"]
    backup_path = pathlib.Path(backup["path"])
    actual_zip = descriptor(backup_path.as_posix(), backup_path.read_bytes())
    check("Baseline:externalZIPBytesAndSHA", (actual_zip["bytes"], actual_zip["sha256"]) == (backup["bytes"], backup["sha256"]), actual_zip, backup)
    captured = {}
    with zipfile.ZipFile(backup_path) as archive:
        check("Baseline:ZIPNamesUnique", len(archive.namelist()) == len(set(archive.namelist())), len(archive.namelist()), len(set(archive.namelist())))
        check("Baseline:ZIPContainsExact972PayloadFiles", set(archive.namelist()) == set(original), len(archive.namelist()), 972)
        check("Baseline:ZIPCRC", archive.testzip() is None, None, None)
        for name, item in original.items():
            captured[name] = archive.read(name)
            actual = descriptor(name, captured[name])
            check("BaselineZIP:" + name, actual == item, actual, item)
    unchanged, modified, deleted, added = [], [], [], []
    for name, item in original.items():
        actual = current.get(name)
        if actual is None:
            deleted.append(name)
        elif actual == item:
            unchanged.append(actual)
        else:
            allowed = name in ALLOWED_MODIFICATIONS
            modified.append({"path": name, "before": item, "after": actual, "allowed": allowed, "reason": ALLOWED_MODIFICATIONS.get(name)})
            check("ModificationAllowed:" + name, allowed, ALLOWED_MODIFICATIONS.get(name), "Explicitly scoped visual source/Editor/append-only runner/version/current-doc change only")
    check("Preservation:noCapturedFileDeletedOrNewlyIgnored", not deleted, deleted, [])
    for name, item in current.items():
        if name not in original:
            category = addition_category(name)
            added.append({**item, "allowed": bool(category), "category": category})
            check("AdditionAllowed:" + name, bool(category), category, "Separate V22 source/test/Editor/docs/evidence only")
    frozen = []
    for name, item in original.items():
        if name not in ALLOWED_MODIFICATIONS:
            same = current.get(name) == item
            frozen.append({"path": name, "unchanged": same, "before": item, "after": current.get(name)})
            check("Frozen:" + name, same, current.get(name), item)
    core, inputs, bindings, graphs = [], [], [], {}
    for key, name in CORE.items():
        before, after = Graph(parse(captured[name])), Graph(parse((root / name).read_bytes()))
        graphs[key] = before, after
        meta_name = name + ".meta"
        old_meta, new_meta = parse(captured[meta_name]), parse((root / meta_name).read_bytes())
        meta_same = captured[meta_name] == (root / meta_name).read_bytes()
        check("CoreUUID:" + key, old_meta["uuid"] == new_meta["uuid"], new_meta["uuid"], old_meta["uuid"])
        check("CoreMetaBytes:" + key, meta_same, current.get(meta_name), original[meta_name])
        core.append({"path": name, "before": original[name], "after": current.get(name), "uuid": new_meta["uuid"], "originalUuid": old_meta["uuid"], "metaUnchanged": meta_same})
        paths = set(INPUT_PATHS[key])
        for node_path in list(paths):
            node = before.ref(before.at(node_path).get("_parent"))
            while node and node.get("__type__") != "cc.Scene":
                paths.add(before.node_path(node))
                node = before.ref(node.get("_parent"))
        for path in sorted(paths):
            original_geometry, actual_geometry = before.local(path), after.local(path)
            same = original_geometry == actual_geometry and original_geometry["validNativeIdentity"] and actual_geometry["validNativeIdentity"]
            inputs.append({"resource": name, "nodePath": path, "unchanged": same, "before": original_geometry, "after": actual_geometry})
            check(f"InputAndAncestor:{key}:{path}", same, actual_geometry, original_geometry)
    for key, fields in (("Cable", ("head", "anchor", "line")), ("CleanSwipeStage", ("inputSurface", "dirtLayer", "dustView"))):
        before, after = graphs[key]
        original_component = next(item for item in before.data if isinstance(item, dict) and all(field in item for field in fields))
        actual_component = next(item for item in after.data if isinstance(item, dict) and item.get("__type__") == original_component["__type__"] and all(field in item for field in fields))
        for field in fields:
            a = normalize_reference(before, original_component[field])
            b = normalize_reference(after, actual_component[field])
            bindings.append({"resource": CORE[key], "field": field, "before": a, "after": b, "unchanged": a == b})
            check(f"InputBinding:{key}.{field}", a == b and bool(a), b, a)
    visual_meta = parse((root / "assets/scripts/visuals/ElementVisual.ts.meta").read_bytes())
    visual_uuid = visual_meta["uuid"]
    visual_types = {visual_uuid, compress_uuid(visual_uuid), compress_uuid(visual_uuid, 2)}
    original_p2, actual_p2 = (protected_scene(graph, visual_types) for graph in graphs["Game"])
    p2_differences = [name for name in sorted(set(original_p2) | set(actual_p2)) if original_p2.get(name) != actual_p2.get(name)]
    check("P2:HomeHUDResultsCanvasCamerasAndDecorationUnchanged", not p2_differences, p2_differences, "Every original scene node/component/child order, including LegacyDay3; only serializer identities and actual LegacyDay3 ElementVisual false default field are normalized")
    component_semantics = []
    for key, (before, after) in graphs.items():
        if key == "Game":
            continue
        element = key in {"DragItem", "DragTarget", "Cable", "Port"}
        original_semantics = element_semantics(before, visual_types) if element else protected_scene(before, visual_types)
        actual_semantics = element_semantics(after, visual_types) if element else protected_scene(after, visual_types)
        differences = [path for path in sorted(set(original_semantics) | set(actual_semantics)) if original_semantics.get(path) != actual_semantics.get(path)]
        check(f"CoreComponentSemantics:{key}", not differences, differences,
              "All original nodes/components/child order and business fields unchanged; only opt-in child legibility flag and four bound Label cream outline fields may change" if element else "All original node/component semantics and child order unchanged")
        component_semantics.append({"resource": CORE[key], "nodes": len(original_semantics), "unchangedOutsideExplicitCaptionFields": not differences, "differences": differences})
        if element:
            visuals = [item for item in after.data if isinstance(item, dict) and item.get("__type__") in visual_types]
            visual = visuals[0] if len(visuals) == 1 else None
            caption = after.ref(visual.get("caption")) if visual else None
            color = caption.get("_outlineColor", {}) if caption else {}
            valid = bool(visual and visual.get("smallScreenLegibility") is True and visual.get("refinedLayout") is True
                         and visual.get("_enabled") is not False and caption and caption.get("__type__") == "cc.Label"
                         and caption.get("_enabled") is not False and caption.get("_enableOutline") is True
                         and caption.get("_outlineWidth") == 2 and [color.get(channel) for channel in ("r", "g", "b", "a")] == [255, 245, 219, 255])
            check(f"CoreCaptionOptIn:{key}", valid, {"visualCount": len(visuals), "smallScreenLegibility": visual.get("smallScreenLegibility") if visual else None,
                  "captionPath": after.node_path(caption), "enableOutline": caption.get("_enableOutline") if caption else None,
                  "outlineWidth": caption.get("_outlineWidth") if caption else None, "outlineColor": color},
                  "Exactly one enabled opt-in ElementVisual and its original bound child Label with #FFF5DBFF outline width2; no other component property changes")
    runner_name = "tools/verify-day1.cjs"
    old_runner = captured[runner_name].decode("utf-8-sig").replace("\r\n", "\n")
    new_runner = (root / runner_name).read_text(encoding="utf-8-sig").replace("\r\n", "\n")
    runner_ok, runner_detail = exact_runner(old_runner, new_runner)
    check("Legacy207:RunnerInverseRestoresExactOriginal", runner_ok, runner_detail, "Only two separate V22 suites, sum and new standalone assertions")
    for name in OLD_TESTS:
        check("Legacy207:ByteIdentical:" + name, current.get(name) == original[name], current.get(name), original[name])
    old_package, package = parse(captured["package.json"]), parse((root / "package.json").read_bytes())
    expected_package = {**old_package, "version": "0.0.5-alpha.4"}
    check("Package:OnlyAlpha4VersionChange", package == expected_package or (args.phase == "sample" and package == old_package), package, expected_package)
    historical = [name for name in original if name.startswith("docs/validation/") or (name.startswith("docs/") and name != "docs/GPT_HANDOFF.md")]
    check("History:EveryPreviousDocumentEvidenceAndUserArchiveFrozen", all(current.get(name) == original[name] for name in historical), {"files": len(historical), "changed": [name for name in historical if current.get(name) != original[name]]}, "All pre-V22 report, screenshot, comparison and both newly supplied V21 ZIP bytes preserved")
    audit_path = root / (EVIDENCE + "creator-audit.json")
    linked = {}
    if audit_path.is_file():
        audit = parse(audit_path.read_bytes())
        mismatches = [entry["path"] for entry in audit.get("files", []) if current.get(entry["path"]) != entry]
        linked["creatorSavedAudit"] = {**descriptor(audit_path.relative_to(root).as_posix(), audit_path.read_bytes()), "timestamp": audit.get("timestamp"), "ok": audit.get("ok"), "checks": audit.get("totalChecks"), "snapshotFiles": len(audit.get("files", [])), "currentSnapshotMismatches": mismatches}
        check("CreatorAudit:CurrentSavedSourceBinding", audit.get("ok") is True and not mismatches, linked["creatorSavedAudit"], "Real current Creator audit source bindings remain exact")
        if args.phase == "final":
            check("CreatorAudit:ActualFinalFullRun", audit.get("phase") == "full" and audit.get("totalChecks", 0) >= 1319, audit.get("phase"), "full and all historical resource checks re-executed")
    elif args.phase == "final":
        check("CreatorAudit:FinalReportPresent", False, None, "Actual current V22 Creator audit")
    failures = [item["name"] for item in checks if not item["passed"]]
    result = {
        "schemaVersion": 1, "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(), "ok": not failures, "phase": args.phase,
        "mode": "Actual SHA/byte audit against uncommitted pre-V22 alpha3 ZIP; no Git mutation, SDK modification, test/Creator execution or network",
        "projectRoot": root.as_posix(), "baseline": {**descriptor(baseline_name, baseline_bytes), "capturedAtUtc": baseline["capturedAtUtc"], "files": len(original)},
        "externalZip": actual_zip, "selfExcludedOutput": {"path": output_name, "reason": "Outer delivery manifest hashes this completed report"},
        "git": {"baselineHead": baseline["git"]["head"], "head": head, "baselineBranch": baseline["git"]["branch"], "branch": branch, "stagedPaths": staged},
        "counts": {"baselineFiles": len(original), "currentVisibleFilesExcludingOutput": len(current), "unchangedBaselineFiles": len(unchanged), "modifiedBaselineFiles": len(modified), "addedFilesExcludingOutput": len(added), "deletedBaselineFiles": len(deleted), "primaryProtectedFiles": len(frozen), "legacyEvidenceFiles": len(historical), "coreAssets": len(core), "protectedInputAndAncestorNodes": len(inputs), "checks": len(checks), "passed": len(checks) - len(failures), "failed": len(failures)},
        "allowedModificationReasons": ALLOWED_MODIFICATIONS, "unchangedBaselineFiles": unchanged, "modifiedFiles": modified, "addedFiles": added, "deletedFiles": deleted,
        "primaryProtectedFiles": frozen, "coreResources": core, "protectedInputAndAncestorNodes": inputs, "protectedInputBindings": bindings,
        "p2SceneSemantics": {"nodes": len(original_p2), "differences": p2_differences, "unchanged": not p2_differences,
                             "normalization": "All scene nodes/components/child order included, even LegacyDay3. Only serializer identities and new false-default field on actual LegacyDay3 ElementVisual are normalized."},
        "coreComponentSemantics": component_semantics,
        "legacy207Tests": {"originalGroups": 207, "originalTestSuitesByteIdentical": all(current.get(name) == original[name] for name in OLD_TESTS), "runnerOnlyAppendsV22": runner_ok, "runnerInverse": runner_detail},
        "linkedEvidence": linked, "checks": checks, "errors": failures,
        "limitations": ["This is source/native-resource preservation, not a rendered Preview, physical input or platform result.", "Original207 preservation is separate from current execution; new dedicated checks.json records actual execution.", "Visual acceptance of any remaining horizontal swipe band belongs to the user reviewing original-size screenshots."],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists():
        output.with_name(f"{output.stem}-prior-{dt.datetime.now(dt.timezone.utc):%Y%m%dT%H%M%S%fZ}.json").write_bytes(output.read_bytes())
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"report": output_name, "ok": result["ok"], "counts": result["counts"], "errors": failures}, ensure_ascii=False, indent=2))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
