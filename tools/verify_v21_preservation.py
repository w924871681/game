"""Verify V21 preservation against the captured, uncommitted pre-V21 ZIP.

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
    **{p: "Actual Creator V21 decorative refinement; input ancestry/UUID/meta remain protected" for p in CORE.values()},
    "assets/scripts/visuals/ElementVisual.ts": "Opt-in child artwork/font refinement, no input-root geometry changes",
    "assets/scripts/visuals/V2CableLine.ts": "Opt-in render-only bounded cable material/layer/lamp, original CableConnector frozen",
    "assets/scripts/ui/ResultStars.ts": "Optional decorative earned-star staggering, original rating/score logic frozen",
    "assets/scripts/ui/V2ResultView.ts": "Result presentation only; original RunController and final flows remain protected",
    "assets/scripts/ui/WorkshopDecoration.ts": "Owned finite decorative animation only",
    "assets/scripts/stages/CleanSwipeStageController.ts": "Exactly the optional read-only V21 dust configure/sweep bridge; all original logic bytes protected by inverse comparison",
    "extensions/deskrescue-editor/main.js": "Append actual V21 Editor entry points; old dedicated tools remain frozen",
    "extensions/deskrescue-editor/package.json": "Append actual V21 Editor menus and commands",
    "extensions/deskrescue-editor/scene.js": "Append delegation to V21 Editor scene tooling",
    "package.json": "Version only: alpha.2 in sample, alpha.3 required for final; engine/config/dependencies frozen",
    "tools/test/cc.d.ts": "Exactly the four numeric Color channel fields; original constructor and all other contract bytes preserved",
    "tools/verify-day1.cjs": "Append separate V21 clean/visual dispatchers and retain the old 174 tests/strict mock harness",
    "README.md": "Current V21 scope, evidence and delivery instructions",
    "docs/GPT_HANDOFF.md": "Current V21 state and honest validation boundaries",
}
REFERENCE_ROOT = "docs/design/v2-reference/"
REFERENCE_ARCHIVE = {REFERENCE_ROOT + name for name in (
    "DeskRescue_V2_Codex_Implementation_Prompt.md", "DeskRescue_V2_Complete_UI_Design_Spec.md",
    "README_START_HERE.md", "reference_manifest.json", "references/01_home_direction.png",
    "references/02_drag_confirmed.png", "references/03_cable_candidate.png", "references/04_clean_confirmed.png",
    "references/05_order_result_candidate.png", "references/06_final_confirmed.png",
)}
REFERENCE_MANIFEST_ORIGINAL = {"bytes": 1347, "sha256": "811a2d89a8796816f0ebc86b529f16e33e4bba66775bc1521ddbeb0c2102d697"}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def descriptor(name: str, data: bytes) -> dict:
    return {"path": name, "bytes": len(data), "sha256": sha(data)}


def parse_json(data: bytes):
    return json.loads(data.decode("utf-8-sig"))


def primary_protected(name: str) -> bool:
    return bool((name.startswith("docs/validation/") and not name.startswith("docs/validation/day5a-plus/v21/"))
                or re.search(r"\.(?:png|svg|wav)$", name, re.I)
                or name.startswith("assets/scripts/data/")
                or name in {"assets/scripts/core/RunController.ts", "assets/scripts/gameplay/DraggableItem.ts",
                            "assets/scripts/gameplay/CableConnector.ts", "assets/scripts/visuals/VisualCatalog.ts",
                            "assets/scripts/visuals/VisualAssetRegistry.ts", "tools/verify-day4.cjs",
                            "tools/verify-day5a.cjs", "tools/verify-day5a-v2.cjs"}
                or re.match(r"extensions/deskrescue-editor/(?:day5a|v2)-", name))


def added_category(name: str) -> str | None:
    if name == "assets/art/v21.meta" or name.startswith("assets/art/v21/"):
        return "New V21 artwork and actual Creator metadata; every old PNG/SVG stays frozen"
    if name.removesuffix(".meta") == "assets/scripts/visuals/V21CleanDustView.ts":
        return "Bounded path-only particle view, independently pooled from logical cells"
    if re.fullmatch(r"extensions/deskrescue-editor/v21-(?:audit|probe|scene|main)\.js", name):
        return "Independent V21 actual Creator tooling"
    if name.startswith("docs/validation/day5a-plus/v21/"):
        return "New V21 evidence only; every older validation artifact is frozen"
    if re.fullmatch(r"docs/(?:DAY5A_PLUS_V21[^/]*|DESKRESCUE_V21[^/]*)\.md", name):
        return "New V21 refinement/design/validation documentation"
    if name in {"tools/verify-day5a-v21-clean.cjs", "tools/verify-v21-visuals.cjs", "tools/verify_v21_offline.py",
                "tools/verify_v21_preservation.py", "tools/package_v21_delivery.py", "tools/compare_v21_previews.py"}:
        return "Separate V21 verification/delivery/comparison tooling"
    if name.startswith("tools/art/v21/"):
        return "New original V21 artwork source/generation/provenance"
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
    parser.add_argument("--baseline", default="docs/validation/day5a-plus/v21/baseline.json")
    parser.add_argument("--output", default="docs/validation/day5a-plus/v21/preservation.json")
    parser.add_argument("--phase", choices=("sample", "final"), default="final")
    args = parser.parse_args()
    root = args.project.resolve()
    output = (root / args.output).resolve()
    output_name = output.relative_to(root).as_posix()
    if not output_name.startswith("docs/validation/day5a-plus/v21/") or output.suffix != ".json":
        raise ValueError("Only a new JSON report under docs/validation/day5a-plus/v21 may be written")
    baseline_path = root / args.baseline
    baseline_data = baseline_path.read_bytes()
    baseline = parse_json(baseline_data)
    old = {e["path"]: e for e in baseline["files"]}
    if output_name in old:
        raise ValueError("Refusing to overwrite a captured baseline file")
    checks = []

    def check(name, passed, actual=None, expected=None):
        checks.append({"name": name, "passed": bool(passed), "actual": actual, "expected": expected})

    check("Baseline:Phase0RecordedSHA256", sha(baseline_data) == "9b05be70ef51312b0f74ad9604f8b3ad023a7f104130b9a024b4ce41939ed09e", sha(baseline_data), "9b05be70ef51312b0f74ad9604f8b3ad023a7f104130b9a024b4ce41939ed09e")
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
    check("Baseline:654UniqueCapturedFiles", len(old) == len(baseline["files"]) == 654, len(old), 654)
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
    check("Preservation:allPrimaryProtectedFilesUnchanged", len(protected) > 295 and all(e["unchanged"] for e in protected), {"files": len(protected), "changed": [e["path"] for e in protected if not e["unchanged"]]}, "Every captured older validation artifact, PNG/SVG/WAV, data/core/test source in the protected categories is unchanged")
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
        "        const groups = day1 + day2 + day3 + day4 + day5a + day5aV2;",
        "        const day5aV21Clean = require('./verify-day5a-v21-clean.cjs').runDay5AV21CleanTests(runtime);\n        const day5aV21Visuals = require('./verify-v21-visuals.cjs').runV21VisualTests(runtime);\n        const groups = day1 + day2 + day3 + day4 + day5a + day5aV2 + day5aV21Clean + day5aV21Visuals;")
    old_assert = "        assert.ok(day5aV2 >= 15, 'At least 15 V2 component and Home return groups must execute');"
    expected_runner = expected_runner.replace(old_assert,
        old_assert + "\n        assert.equal(day1 + day2 + day3 + day4 + day5a + day5aV2, 174, 'All 174 historical behavior groups remain intact');\n        assert.ok(day5aV21Clean >= 17, 'V2.1 path-only decoration and unchanged cleaning semantics must execute');\n        assert.ok(day5aV21Visuals >= 16, 'V2.1 child layouts, cable rendering/state, result stars and lifecycle must execute');")
    marker = b"    const runtime = compileAndLoad(ts, files, config);"
    prefix_identical = captured[runner_name].split(marker)[0] == (root / runner_name).read_bytes().split(marker)[0]
    check("Legacy174:originalMockCompilerAndDay1ToDay3TestBodiesByteIdentical", prefix_identical and marker in captured[runner_name], prefix_identical, True)
    check("Legacy174:runnerOnlyAddsSeparateV21SuitesAnd174Assertion", runner == expected_runner, runner == expected_runner, True)
    legacy_suites = ("tools/verify-day4.cjs", "tools/verify-day5a.cjs", "tools/verify-day5a-v2.cjs")
    for name in legacy_suites:
        check(f"Legacy174:byteIdentical:{name}", (root / name).read_bytes() == captured[name], current.get(name), old[name])
    declaration = "tools/test/cc.d.ts"
    expected_declaration = text(declaration, True).replace("    export class Color {\n", "    export class Color {\n        r: number;\n        g: number;\n        b: number;\n        a: number;\n")
    check("MockDeclaration:onlyFourNumericColorChannelsAdded", text(declaration) == expected_declaration, text(declaration) == expected_declaration, True)
    registry_file = "assets/scripts/visuals/VisualAssetRegistry.ts"
    check("RegistrySource:originalBytesUnchanged", (root / registry_file).read_bytes() == captured[registry_file], current.get(registry_file), old[registry_file])
    bridge_file = "assets/scripts/stages/CleanSwipeStageController.ts"
    expected_bridge = text(bridge_file, True)
    bridge_edits = [
        ("import { CleanDeviceVisual } from '../visuals/CleanDeviceVisual';", "import { CleanDeviceVisual } from '../visuals/CleanDeviceVisual';\nimport { V21CleanDustView } from '../visuals/V21CleanDustView';"),
        ("    public deviceVisual: CleanDeviceVisual | null = null;", "    public deviceVisual: CleanDeviceVisual | null = null;\n\n    @property(V21CleanDustView)\n    public dustView: V21CleanDustView | null = null;"),
        ("        this.bindListeners();\n        this.callbacks?.onProgress(this.progress);", "        this.dustView?.configure(definition);\n        this.bindListeners();\n        this.callbacks?.onProgress(this.progress);"),
        ("        if (changed) {\n            this.callbacks.onProgress(this.progress);", "        this.dustView?.sweep(this.previousPointer.x, this.previousPointer.y,\n            this.pointer.x, this.pointer.y, this.definition.brushRadius);\n        if (changed) {\n            this.callbacks.onProgress(this.progress);")]
    bridge_anchors_unique = all(expected_bridge.count(a) == 1 for a, _ in bridge_edits)
    for a, b in bridge_edits:
        expected_bridge = expected_bridge.replace(a, b, 1)
    bridge_exact = bridge_anchors_unique and text(bridge_file) == expected_bridge
    check("CleanController:onlyExplicitReadOnlyConfigureSweepBridge", bridge_exact, bridge_exact, "Only the import, optional Inspector field, configure notification and accepted local sweep notification are added; all old counter/ownership/callback/pool/fade/generation code is identical")
    old_package, package = parse_json(captured["package.json"]), parse_json((root / "package.json").read_bytes())
    expected_package = {**old_package, "version": "0.0.5-alpha.3"}
    version_only = package == expected_package or (args.phase == "sample" and package == old_package)
    check("Package:onlyAlpha3VersionChangeOrActualAlpha2Sample", version_only, package, expected_package if args.phase == "final" else "Unchanged alpha.2 or version-only alpha.3 during sample")
    before, after = graphs["Game"]
    original_registry = next(v for v in before.data if isinstance(v, dict) and len(v.get("keys", [])) == 49 and "frames" in v)
    actual_registry = next(v for v in after.data if isinstance(v, dict) and v.get("__type__") == original_registry["__type__"])
    registry_same = original_registry["keys"] == actual_registry["keys"] and len(actual_registry["frames"]) == 49
    check("Registry:all49OriginalStableKeysAndOrderUnchanged", registry_same, {"keys": len(actual_registry["keys"]), "frames": len(actual_registry["frames"]), "keyOrderUnchanged": registry_same}, "49 original stable keys in the exact original order; new skins must come from the V21 manifest")
    art_manifest_name = "tools/art/v21/asset-sources.json"
    art_manifest = parse_json((root / art_manifest_name).read_bytes())
    art_assets = art_manifest.get("runtimeAssets", [])
    binding_assets = {e["bindingKey"]: e for e in art_assets if e.get("bindingKey")}
    check("V21Art:uniqueDeclaredBindingKeys", len(binding_assets) == len([e for e in art_assets if e.get("bindingKey")]), list(binding_assets), "At most one manifest skin for each stable gameplay key")
    for entry in art_assets:
        name, source_name = entry["path"], entry["source"]
        asset, source_asset = current.get(name), current.get(source_name)
        check(f"V21ArtRuntime:{entry['key']}", asset is not None and asset["sha256"] == entry["sha256"] and asset["bytes"] == entry["bytes"], asset, entry)
        check(f"V21ArtSource:{entry['key']}", source_asset is not None and source_asset["sha256"] == entry["sourceSha256"], source_asset, {"path": source_name, "sha256": entry["sourceSha256"]})
    registry_skin_changes = []
    for index, key in enumerate(original_registry["keys"]):
        old_uuid = original_registry["frames"][index].get("__uuid__")
        new_uuid = actual_registry["frames"][index].get("__uuid__")
        if old_uuid == new_uuid:
            continue
        declared = binding_assets.get(key)
        meta = parse_json((root / (declared["path"] + ".meta")).read_bytes()) if declared else {}
        frame = next((v for v in meta.get("subMetas", {}).values() if v.get("importer") == "sprite-frame" and v.get("uuid") == new_uuid), None)
        valid = bool(declared and meta.get("imported") is True and frame and frame.get("imported") is True)
        check(f"Registry:changedSkinHasActualDeclaredImportedFrame:{key}", valid, {"oldUuid": old_uuid, "newUuid": new_uuid, "manifestPath": declared.get("path") if declared else None, "frame": frame}, "Actual imported SpriteFrame of the exact newly declared V21 skin; original PNG bytes remain protected")
        registry_skin_changes.append({"key": key, "oldUuid": old_uuid, "currentUuid": new_uuid, "manifestPath": declared.get("path") if declared else None, "valid": valid})
    explicit_frozen = []
    for name in ("assets/scripts/core/RunController.ts", "assets/scripts/gameplay/DraggableItem.ts", "assets/scripts/gameplay/CableConnector.ts", "assets/scripts/data/OrderCatalog.ts", "assets/scripts/data/StageDefinition.ts"):
        same = (root / name).read_bytes() == captured[name]
        explicit_frozen.append({"path": name, "unchanged": same, "before": old[name], "after": current.get(name)})
        check(f"CoreLogicFrozen:{name}", same, current.get(name), old[name])
    old_reports = [name for name in old if name.startswith("docs/validation/") and not name.startswith("docs/validation/day5a-plus/v21/")]
    old_docs = [name for name in old if re.match(r"docs/DAY(?:3|4|5A)[^/]*\.md$", name)]
    legacy_evidence = [{"path": name, "unchanged": current.get(name) == old[name], "before": old[name], "after": current.get(name)} for name in sorted(set(old_reports + old_docs))]
    check("LegacyEvidence:allPreV21ValidationAndLegacyDocsUnchanged", all(e["unchanged"] for e in legacy_evidence), {"files": len(legacy_evidence), "changed": [e["path"] for e in legacy_evidence if not e["unchanged"]]}, "Every old artifact's bytes and SHA match the pre-V2 snapshot")
    audit_path = root / "docs/validation/day5a-plus/v21/audit-current.json"
    evidence = {}
    if audit_path.is_file():
        audit = parse_json(audit_path.read_bytes())
        mismatches = [e["path"] for e in audit.get("files", []) if current.get(e["path"]) != e]
        evidence["creatorSavedAudit"] = {**descriptor(audit_path.relative_to(root).as_posix(), audit_path.read_bytes()), "timestamp": audit.get("timestamp"), "ok": audit.get("ok"), "checks": audit.get("total"), "snapshotFiles": len(audit.get("files", [])), "currentSnapshotMismatches": mismatches}
        check("CreatorAudit:currentSavedFileSnapshotStillMatches", audit.get("ok") is True and not mismatches, evidence["creatorSavedAudit"], "New actual Creator full audit still binds current bytes")
        if args.phase == "final":
            check("CreatorAudit:finalFullPhase", audit.get("phase") == "full", audit.get("phase"), "Actual final full Editor pass, not only a representative sample/refine")
    elif args.phase == "final":
        check("CreatorAudit:finalCurrentReportPresent", False, None, "New actual V21 final saved-resource audit")
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
        check("ReferenceManifest:matchesCapturedPreV2ReferenceHashes", manifest == parse_json(captured[REFERENCE_ROOT + "reference_manifest.json"]), manifest, parse_json(captured[REFERENCE_ROOT + "reference_manifest.json"]))
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
                              "manifestPinnedToPreV2Baseline": manifest == parse_json(captured[REFERENCE_ROOT + "reference_manifest.json"]),
                              "designDocument": {"path": displayed_name, "metadataHeaderBytes": separator.end() if separator else None,
                                                 "source": descriptor(spec_name, spec_bytes), "payloadMatchesOriginalBytes": payload_same}}
    except (OSError, ValueError, KeyError, TypeError) as error:
        check("ReferenceArchive:verificationCompleted", False, str(error), "All ten original archive files, provenance, nine manifest payloads and exact spec payload must be readable")
    failures = [e["name"] for e in checks if not e["passed"]]
    report = {
        "schemaVersion": 1, "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(), "ok": not failures,
        "mode": "Actual local byte/SHA audit against captured pre-V21 uncommitted ZIP; no Git mutations, test execution, Creator execution or network",
        "projectRoot": root.as_posix(), "phase": args.phase, "baseline": {**descriptor(baseline_path.relative_to(root).as_posix(), baseline_data), "capturedAtUtc": baseline["capturedAtUtc"], "files": len(old)},
        "externalZip": archive_fingerprint,
        "inventoryScope": "Git-visible tracked and nonignored untracked files, the same 654-file pre-edit baseline scope; ignored Creator/cache/build files are outside this snapshot",
        "selfExcludedOutput": {"path": output_name, "reason": "The current report cannot contain its own SHA. Hash it in the outer delivery manifest after this command completes."},
        "git": {"baselineHead": baseline["git"]["head"], "head": head, "baselineBranch": baseline["git"]["branch"], "branch": branch, "stagedPaths": staged, "readOnlyCommands": commands},
        "counts": {"baselineFiles": len(old), "currentVisibleFilesExcludingOutput": len(current), "unchangedBaselineFiles": len(unchanged), "modifiedBaselineFiles": len(modified), "addedFilesExcludingOutput": len(added), "deletedBaselineFiles": len(deleted), "primaryProtectedFiles": len(protected), "legacyEvidenceFiles": len(legacy_evidence), "coreAssets": len(core_resources), "protectedInputAndAncestorNodes": len(inputs), "checks": len(checks), "passed": len(checks) - len(failures), "failed": len(failures)},
        "allowedModificationReasons": ALLOWED_MODIFICATIONS, "deletedFiles": deleted,
        "modifiedFiles": modified, "addedFiles": added, "unchangedBaselineFiles": unchanged,
        "primaryProtectedFiles": protected, "legacyEvidenceFiles": legacy_evidence, "explicitFrozenCoreLogic": explicit_frozen,
        "coreResources": core_resources, "protectedInputAndAncestorNodes": inputs, "protectedInputBindings": bindings,
        "legacy174Tests": {"originalGroups": 174, "originalDefinitionAndMockHarnessPrefixByteIdentical": prefix_identical, "entireRunnerMatchesOnlyExplicitV21Dispatchers": runner == expected_runner, "oldDay4Day5AV2SuitesByteIdentical": all((root / n).read_bytes() == captured[n] for n in legacy_suites), "separateNewSuites": ["tools/verify-day5a-v21-clean.cjs", "tools/verify-v21-visuals.cjs"], "limitation": "Source preservation only; current execution and actual Cocos SDK types are separate evidence."},
        "readOnlyCleanBridgeExact": bridge_exact, "v21ArtManifest": current.get(art_manifest_name), "registrySkinChanges": registry_skin_changes,
        "linkedEvidence": evidence, "referenceArchiveVerification": reference_evidence, "checks": checks, "errors": failures,
        "limitations": ["No claim about Preview pixels, native input, audio playback or platform builds comes from this preservation report.", "Git HEAD/branch/index are observed without mutation; no claim is made about remote repository state.", "Expected V21 UI/native resource changes are permitted only on the explicit path list and remain subject to actual Creator/Preview checks."],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"report": output_name, "ok": report["ok"], "counts": report["counts"], "errors": failures}, ensure_ascii=False, indent=2))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
