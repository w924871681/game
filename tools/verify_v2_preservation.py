"""Verify V2 preservation against the captured, uncommitted pre-V2 ZIP.

This is a read-only project/Git audit. Its sole write is the requested JSON
report. It never invokes Creator, tests, a build, Git mutations or a network.
The current output is excluded from its own snapshot to avoid a self hash;
the final delivery's outer checksum manifest must hash this report instead.
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


CORE = {
    "Game": "assets/scenes/Game.scene",
    **{n: f"assets/prefabs/stages/{n}.prefab" for n in
       ("DragMatchStage", "CableConnectStage", "CleanSwipeStage")},
    **{n: f"assets/prefabs/elements/{n}.prefab" for n in
       ("DragItem", "DragTarget", "Cable", "Port", "DirtCell")},
}
INPUT_PATHS = {
    "Game": ["Canvas/PlayArea", "Canvas/PlayArea/StageHost"],
    "DragMatchStage": ["DragMatchStage"], "CableConnectStage": ["CableConnectStage"],
    "CleanSwipeStage": ["CleanSwipeStage", "CleanSwipeStage/InputSurface", "CleanSwipeStage/InputSurface/DirtLayer"],
    "DragItem": ["DragItem"], "DragTarget": ["DragTarget"], "Port": ["Port"], "DirtCell": ["DirtCell"],
    "Cable": ["Cable", "Cable/Head", "Cable/Anchor", "Cable/Line"],
}
ALLOWED_MODIFICATIONS = {
    **{p: "Creator-saved V2 display children/components; core UUID, metadata and input ancestry are independently protected" for p in CORE.values()},
    "assets/scripts/core/LevelManager.ts": "Optional V2 presenters and final-only Home transition; original scoring/controller sources stay frozen",
    "assets/scripts/ui/HomeController.ts": "Final-only return-home Button and session-safe Home re-entry",
    "assets/scripts/visuals/ElementVisual.ts": "Display-child styling and success decoration; original input roots stay fixed",
    "assets/scripts/visuals/VisualAssetRegistry.ts": "Only the official CCString Inspector array declaration correction",
    "extensions/deskrescue-editor/main.js": "Actual Creator V2 commands/menu entry points",
    "extensions/deskrescue-editor/package.json": "Actual Creator V2 command/menu declarations",
    "extensions/deskrescue-editor/scene.js": "Delegation to the new V2 native scene assembly/inspection/probe",
    "package.json": "Version only: 0.0.5-alpha.2; engine/project/dependency configuration stays fixed",
    "tools/test/cc.d.ts": "Only the official CCString declaration for the existing limited mock harness",
    "tools/verify-day1.cjs": "Only append the separate V2 runner and require the original 146 groups; original test bodies stay byte-identical",
    "README.md": "Current V2 entry points, evidence and delivery instructions",
    "docs/GPT_HANDOFF.md": "Current V2 state, evidence boundaries and handoff",
}
NEW_UI = {f"assets/scripts/{folder}/{name}.ts" for folder, names in {
    "ui": ("ButtonPressFeedback", "PaperOrderHUD", "V2ResultView", "WorkshopDecoration"),
    "visuals": ("V2CableLine", "V2DirtAppearance", "V2ViewportTheme"),
}.items() for name in names}
REFERENCE_ROOT = "docs/design/v2-reference/"
REFERENCE_ARCHIVE = {
    REFERENCE_ROOT + name for name in (
        "DeskRescue_V2_Codex_Implementation_Prompt.md",
        "DeskRescue_V2_Complete_UI_Design_Spec.md", "README_START_HERE.md", "reference_manifest.json",
        "references/01_home_direction.png", "references/02_drag_confirmed.png",
        "references/03_cable_candidate.png", "references/04_clean_confirmed.png",
        "references/05_order_result_candidate.png", "references/06_final_confirmed.png",
    )
}
REFERENCE_MANIFEST_ORIGINAL = {
    "bytes": 1347, "sha256": "811a2d89a8796816f0ebc86b529f16e33e4bba66775bc1521ddbeb0c2102d697",
}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def descriptor(name: str, data: bytes) -> dict:
    return {"path": name, "bytes": len(data), "sha256": sha(data)}


def parse_json(data: bytes):
    return json.loads(data.decode("utf-8-sig"))


def primary_protected(name: str) -> bool:
    return bool(re.match(r"docs/validation/(?:day3|day4|day5a)/", name)
                or re.match(r"(?:assets/art/.+\.png|assets/audio/.+\.wav|tools/art/sources/.+\.svg)$", name)
                or name.startswith("assets/scripts/data/")
                or name in {"assets/scripts/core/RunController.ts", "assets/scripts/gameplay/DraggableItem.ts",
                            "assets/scripts/gameplay/CableConnector.ts", "assets/scripts/visuals/VisualCatalog.ts"})


def added_category(name: str) -> str | None:
    if name in REFERENCE_ARCHIVE:
        return "Exact original user reference archive; design provenance only, never runtime artwork or a play screenshot"
    if name == "assets/art/v2.meta" or name.startswith("assets/art/v2/"):
        return "new V2 direct-Inspector artwork and Creator metadata"
    if name.removesuffix(".meta") in NEW_UI:
        return "new V2 view/render-only component and Creator metadata"
    if re.fullmatch(r"extensions/deskrescue-editor/v2-(?:audit|probe|scene|main)\.js", name):
        return "new V2 actual Creator tooling"
    if name.startswith("docs/validation/day5a-plus/"):
        return "new V2 evidence; captured older evidence remains protected"
    if re.fullmatch(r"docs/(?:DAY5A_PLUS_V2[^/]*|DESKRESCUE_V2[^/]*)\.md", name):
        return "new V2 design/setup/validation/delivery documentation"
    if name in {"tools/verify-day5a-v2.cjs", "tools/verify_v2_preservation.py", "tools/compare_v2_previews.py", "tools/package_v2_delivery.py"}:
        return "separate V2 tests, preservation/comparison/delivery tooling"
    if name in {"tools/art/asset-sources-v2.json", "tools/art/generate_v2_ui.py"} or name.startswith("tools/art/v2/"):
        return "new V2 original artwork provenance/source/generation"
    return None


class Graph:
    def __init__(self, data):
        if not isinstance(data, list):
            raise ValueError("Native Scene/Prefab is not an array")
        self.data = data
        self.nodes = [n for n in data if isinstance(n, dict) and n.get("__type__") == "cc.Node"]

    def ref(self, value):
        if isinstance(value, dict) and isinstance(value.get("__id__"), int):
            index = value["__id__"]
            if 0 <= index < len(self.data):
                return self.data[index]
        return None

    def node_path(self, node):
        if not isinstance(node, dict):
            return ""
        if node.get("__type__") not in ("cc.Node", "cc.Scene"):
            node = self.ref(node.get("node"))
        names, seen = [], set()
        while node and node.get("__type__") != "cc.Scene":
            if id(node) in seen:
                raise ValueError("Cyclic native node ancestry")
            seen.add(id(node))
            names.insert(0, node.get("_name", ""))
            node = self.ref(node.get("_parent"))
        return "/".join(names)

    def at(self, name):
        matches = [n for n in self.nodes if self.node_path(n) == name]
        if len(matches) != 1:
            raise ValueError(f"Expected one input node at {name}, found {len(matches)}")
        return matches[0]

    def component(self, node, type_name):
        return next((c for ref in node.get("_components", []) if (c := self.ref(ref)) and c.get("__type__") == type_name), None)

    def local(self, name):
        node = self.at(name)
        ui = self.component(node, "cc.UITransform")
        prefab = self.ref(node.get("_prefab"))
        return {"parent": self.node_path(self.ref(node.get("_parent"))),
                "position": node.get("_lpos"), "rotation": node.get("_lrot"), "scale": node.get("_lscale"),
                "layer": node.get("_layer"), "size": ui.get("_contentSize") if ui else None,
                "anchor": ui.get("_anchorPoint") if ui else None,
                "validNativeIdentity": bool(node.get("_id") or (prefab and prefab.get("fileId")))}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=pathlib.Path, default=pathlib.Path(__file__).resolve().parents[1])
    parser.add_argument("--baseline", default="docs/validation/day5a-plus/v2-baseline.json")
    parser.add_argument("--output", default="docs/validation/day5a-plus/v2-preservation-report.json")
    args = parser.parse_args()
    root = args.project.resolve()
    output = (root / args.output).resolve()
    output_name = output.relative_to(root).as_posix()
    if not output_name.startswith("docs/validation/day5a-plus/") or output.suffix != ".json":
        raise ValueError("Only a JSON report under docs/validation/day5a-plus may be written")
    baseline_path = root / args.baseline
    baseline_data = baseline_path.read_bytes()
    baseline = parse_json(baseline_data)
    old = {e["path"]: e for e in baseline["files"]}
    if output_name in old:
        raise ValueError("Refusing to overwrite a captured baseline file")
    checks = []

    def check(name, passed, actual=None, expected=None):
        checks.append({"name": name, "passed": bool(passed), "actual": actual, "expected": expected})

    commands = []

    def git(*parts):
        command = ["git", "--no-optional-locks", "-c", "core.quotepath=false", *parts]
        commands.append(command)
        return subprocess.check_output(command, cwd=root).decode("utf-8").strip("\r\n")

    head = git("rev-parse", "HEAD")
    branch = git("branch", "--show-current")
    visible = sorted(set(p for p in git("ls-files", "-co", "--exclude-standard", "-z").split("\0") if p and p != output_name))
    staged = sorted(p for p in git("diff", "--cached", "--name-only", "-z").split("\0") if p)
    baseline_staged = sorted(e["path"] for e in baseline["git"]["statusEntries"] if e["status"][0] not in (" ", "?"))
    check("Git:HEADUnchanged", head == baseline["git"]["head"], head, baseline["git"]["head"])
    check("Git:branchUnchanged", branch == baseline["git"]["branch"], branch, baseline["git"]["branch"])
    check("Git:noNewStaging", staged == baseline_staged, staged, baseline_staged)
    check("Baseline:476UniqueCapturedFiles", len(old) == len(baseline["files"]) == 476, len(old), 476)
    archive_data = pathlib.Path(baseline["backup"]["path"]).read_bytes()
    archive_fingerprint = descriptor(baseline["backup"]["path"], archive_data)
    check("Baseline:externalZIPBytesAndSHA", archive_fingerprint["bytes"] == baseline["backup"]["bytes"] and archive_fingerprint["sha256"] == baseline["backup"]["sha256"], archive_fingerprint, baseline["backup"])
    captured = {}
    with zipfile.ZipFile(pathlib.Path(baseline["backup"]["path"])) as archive:
        names = archive.namelist()
        check("Baseline:ZIPNamesUnique", len(names) == len(set(names)), len(names), len(set(names)))
        check("Baseline:ZIPContainsAllCapturedFiles", set(old).issubset(names), len(set(old).intersection(names)), len(old))
        bad_crc = archive.testzip()
        check("Baseline:ZIPCRC", bad_crc is None, bad_crc, None)
        for name, expected in old.items():
            data = archive.read(name)
            actual = descriptor(name, data)
            check(f"BaselineZIP:{name}", actual["bytes"] == expected["bytes"] and actual["sha256"] == expected["sha256"], actual, expected)
            captured[name] = data

    current = {name: descriptor(name, (root / name).read_bytes()) for name in visible if (root / name).is_file()}
    deleted, modified, unchanged, added = [], [], [], []
    for name, previous in old.items():
        actual = current.get(name)
        if not (root / name).is_file():
            deleted.append(name)
        elif actual is None:
            check(f"Inventory:baselineStillVisible:{name}", False, "Existing file became ignored/unlisted", "Same visible scope as original snapshot")
        elif actual["bytes"] == previous["bytes"] and actual["sha256"] == previous["sha256"]:
            unchanged.append(actual)
        else:
            allowed = name in ALLOWED_MODIFICATIONS and not primary_protected(name)
            modified.append({"path": name, "before": previous, "after": actual, "allowed": allowed, "reason": ALLOWED_MODIFICATIONS.get(name)})
            check(f"ModificationAllowed:{name}", allowed, ALLOWED_MODIFICATIONS.get(name), "Explicit V2 path/reason; all other captured files are frozen")
    check("Preservation:noCapturedFileDeleted", not deleted, deleted, [])
    for name, actual in current.items():
        if name not in old:
            category = added_category(name)
            added.append({**actual, "allowed": bool(category), "category": category})
            check(f"AdditionAllowed:{name}", bool(category), category, "New V2 UI/art/tooling/evidence only; no new order/data/core logic")
    protected = []
    for name, previous in old.items():
        if primary_protected(name):
            actual = current.get(name)
            same = actual is not None and actual["sha256"] == previous["sha256"] and actual["bytes"] == previous["bytes"]
            protected.append({"path": name, "unchanged": same, "before": previous, "after": actual})
            check(f"Protected:{name}", same, actual, previous)
    check("Preservation:295PrimaryProtectedFiles", len(protected) == 295, len(protected), 295)
    core_resources, inputs, bindings, graphs = [], [], [], {}
    for key, name in CORE.items():
        before = Graph(parse_json(captured[name])); after = Graph(parse_json((root / name).read_bytes()))
        graphs[key] = (before, after)
        before_meta = parse_json(captured[name + ".meta"])
        after_meta = parse_json((root / (name + ".meta")).read_bytes())
        same_meta = (root / (name + ".meta")).read_bytes() == captured[name + ".meta"]
        check(f"CoreUUID:{key}", before_meta["uuid"] == after_meta["uuid"], after_meta["uuid"], before_meta["uuid"])
        check(f"CoreMetaBytes:{key}", same_meta, current.get(name + ".meta"), old[name + ".meta"])
        core_resources.append({"path": name, "before": old[name], "after": current.get(name), "uuid": after_meta["uuid"], "originalUuid": before_meta["uuid"], "metaUnchanged": same_meta})
        paths = set(INPUT_PATHS[key])
        for node_path in list(paths):
            node = before.ref(before.at(node_path).get("_parent"))
            while node and node.get("__type__") != "cc.Scene":
                paths.add(before.node_path(node)); node = before.ref(node.get("_parent"))
        for node_path in sorted(paths):
            original, actual = before.local(node_path), after.local(node_path)
            same = original == actual and original["validNativeIdentity"] and actual["validNativeIdentity"]
            inputs.append({"resource": name, "nodePath": node_path, "unchanged": same, "before": original, "after": actual})
            check(f"InputAndAncestor:{key}:{node_path}", same, actual, original)
    for key, fields in (("Cable", ("head", "anchor", "line")), ("CleanSwipeStage", ("inputSurface", "dirtLayer"))):
        before, after = graphs[key]
        original = next(v for v in before.data if isinstance(v, dict) and all(f in v for f in fields))
        actual = next(v for v in after.data if isinstance(v, dict) and v.get("__type__") == original["__type__"] and all(f in v for f in fields))
        for field in fields:
            a, b = before.node_path(before.ref(original[field])), after.node_path(after.ref(actual[field]))
            check(f"CoreInputBinding:{key}.{field}", bool(a) and a == b, b, a)
            bindings.append({"resource": CORE[key], "field": field, "before": a, "after": b, "unchanged": a == b})

    def text(name, original=False):
        data = captured[name] if original else (root / name).read_bytes()
        return data.decode("utf-8-sig").replace("\r\n", "\n")

    runner_name = "tools/verify-day1.cjs"
    old_runner, runner = text(runner_name, True), text(runner_name)
    expected_runner = old_runner.replace(
        "        const groups = day1 + day2 + day3 + day4 + day5a;",
        "        const day5aV2 = require('./verify-day5a-v2.cjs').runDay5AV2Tests(runtime);\n        const groups = day1 + day2 + day3 + day4 + day5a + day5aV2;")
    expected_runner = expected_runner.replace(
        "        console.log(`\\nDay 1: ${day1}; Day 2: ${day2}; Day 3: ${day3}; Day 4: ${day4}; Day 5A: ${day5a}.`);",
        "        assert.equal(day1 + day2 + day3 + day4 + day5a, 146, 'All 146 historical behavior groups remain intact');\n        assert.ok(day5aV2 >= 15, 'At least 15 V2 component and Home return groups must execute');\n        console.log(`\\nDay 1: ${day1}; Day 2: ${day2}; Day 3: ${day3}; Day 4: ${day4}; Day 5A: ${day5a}; Day 5A V2: ${day5aV2}.`);")
    marker = b"    const runtime = compileAndLoad(ts, files, config);"
    prefix_identical = captured[runner_name].split(marker)[0] == (root / runner_name).read_bytes().split(marker)[0]
    check("Legacy146:originalDay1ToDay3TestsAndHarnessByteIdentical", prefix_identical and marker in captured[runner_name], prefix_identical, True)
    check("Legacy146:runnerOnlyAddsSeparateV2SuiteAnd146Assertion", runner == expected_runner, runner == expected_runner, True)
    for name in ("tools/verify-day4.cjs", "tools/verify-day5a.cjs"):
        check(f"Legacy146:byteIdentical:{name}", (root / name).read_bytes() == captured[name], current.get(name), old[name])
    declaration = "tools/test/cc.d.ts"
    expected_declaration = text(declaration, True).replace("declare module 'cc' {\n", "declare module 'cc' {\n    export const CCString: unknown;\n")
    check("MockDeclaration:onlyOfficialCCStringAdded", text(declaration) == expected_declaration, text(declaration) == expected_declaration, True)
    registry_file = "assets/scripts/visuals/VisualAssetRegistry.ts"
    expected_registry = text(registry_file, True).replace("_decorator, Component", "_decorator, CCString, Component").replace("@property([String])", "@property([CCString])")
    check("RegistrySource:onlyCCStringInspectorFix", text(registry_file) == expected_registry, text(registry_file) == expected_registry, True)
    old_package, package = parse_json(captured["package.json"]), parse_json((root / "package.json").read_bytes())
    expected_package = {**old_package, "version": "0.0.5-alpha.2"}
    check("Package:onlyAlpha2VersionChange", package == expected_package, package, expected_package)
    before, after = graphs["Game"]
    original_registry = next(v for v in before.data if isinstance(v, dict) and len(v.get("keys", [])) == 49 and "frames" in v)
    actual_registry = next(v for v in after.data if isinstance(v, dict) and v.get("__type__") == original_registry["__type__"])
    registry_same = all(original_registry[k] == actual_registry[k] for k in ("keys", "frames"))
    check("Registry:all49OriginalKeysAndFrameUUIDsUnchanged", registry_same, {"keys": len(actual_registry["keys"]), "unchanged": registry_same}, {"keys": 49, "unchanged": True})
    explicit_frozen = []
    for name in ("assets/scripts/core/RunController.ts", "assets/scripts/gameplay/DraggableItem.ts", "assets/scripts/gameplay/CableConnector.ts", "assets/scripts/data/OrderCatalog.ts"):
        same = (root / name).read_bytes() == captured[name]
        explicit_frozen.append({"path": name, "unchanged": same, "before": old[name], "after": current.get(name)})
        check(f"CoreLogicFrozen:{name}", same, current.get(name), old[name])
    old_reports = [name for name in old if re.match(r"docs/validation/(?:day3|day4|day5a)/", name)]
    old_docs = [name for name in old if re.match(r"docs/DAY(?:3|4|5A)[^/]*\.md$", name)]
    legacy_evidence = [{"path": name, "unchanged": current.get(name) == old[name], "before": old[name], "after": current.get(name)} for name in sorted(set(old_reports + old_docs))]
    check("LegacyEvidence:allCapturedDay3Day4Day5AReportsAndDocsUnchanged", all(e["unchanged"] for e in legacy_evidence), {"files": len(legacy_evidence), "changed": [e["path"] for e in legacy_evidence if not e["unchanged"]]}, "Every old artifact's bytes and SHA match the pre-V2 snapshot")
    audit_path = root / "docs/validation/day5a-plus/v2-scene-audit.json"
    evidence = {}
    if audit_path.is_file():
        audit = parse_json(audit_path.read_bytes())
        mismatches = [e["path"] for e in audit.get("files", []) if current.get(e["path"]) != e]
        evidence["creatorSavedAudit"] = {**descriptor(audit_path.relative_to(root).as_posix(), audit_path.read_bytes()), "timestamp": audit.get("timestamp"), "ok": audit.get("ok"), "checks": audit.get("total"), "snapshotFiles": len(audit.get("files", [])), "currentSnapshotMismatches": mismatches}
        check("CreatorAudit:currentSavedFileSnapshotStillMatches", audit.get("ok") is True and not mismatches, evidence["creatorSavedAudit"], "New actual Creator full audit still binds current bytes")
    reference_evidence = {}
    try:
        provenance_name = "docs/validation/day5a-plus/v2-reference-provenance.json"
        provenance_bytes = (root / provenance_name).read_bytes()
        provenance = parse_json(provenance_bytes)
        recorded = provenance.get("files", [])
        recorded_names = [entry.get("path") for entry in recorded]
        actual_names = {p.relative_to(root).as_posix() for p in (root / REFERENCE_ROOT).rglob("*") if p.is_file()}
        check("ReferenceArchive:exactTenAllowedPaths", actual_names == REFERENCE_ARCHIVE, sorted(actual_names), sorted(REFERENCE_ARCHIVE))
        check("ReferenceArchive:provenanceHasExactTenUniquePaths", len(recorded_names) == 10 and set(recorded_names) == REFERENCE_ARCHIVE,
              recorded_names, sorted(REFERENCE_ARCHIVE))
        reference_files = []
        for entry in recorded:
            name = entry.get("path")
            actual = current.get(name)
            valid = name in REFERENCE_ARCHIVE and actual is not None and actual["bytes"] == entry.get("bytes") and actual["sha256"] == entry.get("sha256")
            check(f"ReferenceProvenance:{name}", valid, actual, entry)
            reference_files.append({"path": name, "matchesProvenance": valid, "actual": actual, "recorded": entry})
        manifest_name = REFERENCE_ROOT + "reference_manifest.json"
        manifest_bytes = (root / manifest_name).read_bytes()
        manifest = parse_json(manifest_bytes)
        expected_relative = {name.removeprefix(REFERENCE_ROOT) for name in REFERENCE_ARCHIVE if name != manifest_name}
        check("ReferenceManifest:exactNinePayloadPaths", set(manifest) == expected_relative, sorted(manifest), sorted(expected_relative))
        check("ReferenceManifest:matchesCapturedPreV2ReferenceHashes", manifest == baseline["references"]["files"], manifest, baseline["references"]["files"])
        check("ReferenceManifest:originalBytesAndSHA", len(manifest_bytes) == REFERENCE_MANIFEST_ORIGINAL["bytes"] and sha(manifest_bytes) == REFERENCE_MANIFEST_ORIGINAL["sha256"],
              descriptor(manifest_name, manifest_bytes), REFERENCE_MANIFEST_ORIGINAL)
        for relative, entry in manifest.items():
            actual = current.get(REFERENCE_ROOT + relative)
            check(f"ReferenceManifestPayload:{relative}", actual is not None and actual["bytes"] == entry.get("bytes") and actual["sha256"] == entry.get("sha256"), actual, entry)
        spec_name = REFERENCE_ROOT + "DeskRescue_V2_Complete_UI_Design_Spec.md"
        spec_bytes = (root / spec_name).read_bytes()
        displayed_name = "docs/DESKRESCUE_V2_UI_DESIGN.md"
        displayed_bytes = (root / displayed_name).read_bytes()
        separator = re.search(rb"\r?\n---\r?\n\r?\n", displayed_bytes)
        payload = displayed_bytes[separator.end():] if separator else b""
        payload_same = separator is not None and payload == spec_bytes
        check("ReferenceSpec:designDocumentPayloadOriginalBytes", payload_same,
              {"document": displayed_name, "metadataHeaderBytes": separator.end() if separator else None, "payloadBytes": len(payload), "payloadSHA256": sha(payload)},
              descriptor(spec_name, spec_bytes))
        reference_evidence = {"scope": "Only the ten explicit original reference archive paths are permitted; no wildcard docs/design allowance",
                              "provenance": descriptor(provenance_name, provenance_bytes), "files": reference_files,
                              "referenceManifest": descriptor(manifest_name, manifest_bytes), "payloadManifestEntries": len(manifest),
                              "manifestPinnedToPreV2Baseline": manifest == baseline["references"]["files"],
                              "designDocument": {"path": displayed_name, "metadataHeaderBytes": separator.end() if separator else None,
                                                 "source": descriptor(spec_name, spec_bytes), "payloadMatchesOriginalBytes": payload_same}}
    except (OSError, ValueError, KeyError, TypeError) as error:
        check("ReferenceArchive:verificationCompleted", False, str(error), "All ten original archive files, provenance, nine manifest payloads and exact spec payload must be readable")
    failures = [e["name"] for e in checks if not e["passed"]]
    report = {
        "schemaVersion": 1, "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(), "ok": not failures,
        "mode": "Actual local byte/SHA audit against captured pre-V2 uncommitted ZIP; no Git mutations, test execution, Creator execution or network",
        "projectRoot": root.as_posix(), "baseline": {**descriptor(baseline_path.relative_to(root).as_posix(), baseline_data), "capturedAtUtc": baseline["capturedAtUtc"], "files": len(old)},
        "externalZip": archive_fingerprint,
        "inventoryScope": "Git-visible tracked and nonignored untracked files, the same 476-file baseline scope; ignored Creator/cache/build files are outside this snapshot",
        "selfExcludedOutput": {"path": output_name, "reason": "The current report cannot contain its own SHA. Hash it in the outer delivery manifest after this command completes."},
        "git": {"baselineHead": baseline["git"]["head"], "head": head, "baselineBranch": baseline["git"]["branch"], "branch": branch, "stagedPaths": staged, "readOnlyCommands": commands},
        "counts": {"baselineFiles": len(old), "currentVisibleFilesExcludingOutput": len(current), "unchangedBaselineFiles": len(unchanged), "modifiedBaselineFiles": len(modified), "addedFilesExcludingOutput": len(added), "deletedBaselineFiles": len(deleted), "primaryProtectedFiles": len(protected), "legacyEvidenceFiles": len(legacy_evidence), "coreAssets": len(core_resources), "protectedInputAndAncestorNodes": len(inputs), "checks": len(checks), "passed": len(checks) - len(failures), "failed": len(failures)},
        "allowedModificationReasons": ALLOWED_MODIFICATIONS, "deletedFiles": deleted,
        "modifiedFiles": modified, "addedFiles": added, "unchangedBaselineFiles": unchanged,
        "primaryProtectedFiles": protected, "legacyEvidenceFiles": legacy_evidence, "explicitFrozenCoreLogic": explicit_frozen,
        "coreResources": core_resources, "protectedInputAndAncestorNodes": inputs, "protectedInputBindings": bindings,
        "legacy146Tests": {"originalGroups": 146, "originalDay1ToDay3DefinitionAndHarnessPrefixByteIdentical": prefix_identical, "entireRunnerMatchesOnlyExplicitV2Additions": runner == expected_runner, "day4AndDay5ASuitesByteIdentical": all((root / n).read_bytes() == captured[n] for n in ("tools/verify-day4.cjs", "tools/verify-day5a.cjs")), "separateNewSuite": "tools/verify-day5a-v2.cjs", "limitation": "Source preservation audit only; current mock execution and real Cocos types remain separate evidence."},
        "linkedEvidence": evidence, "referenceArchiveVerification": reference_evidence, "checks": checks, "errors": failures,
        "limitations": ["No claim about Preview pixels, native input, audio playback or platform builds comes from this preservation report.", "Git HEAD/branch/index are observed without mutation; no claim is made about remote repository state.", "Expected V2 UI/native resource changes are permitted only on the explicit path list and remain subject to actual Creator/Preview checks."],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"report": output_name, "ok": report["ok"], "counts": report["counts"], "errors": failures}, ensure_ascii=False, indent=2))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
