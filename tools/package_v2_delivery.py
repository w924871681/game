"""Package the current complete DeskRescue project, without Git mutations.

--plan only reads Git-visible project files. The real operation creates a new
external ZIP, verifies its CRC and all file hashes, extracts to a fresh temporary
directory, and independently checks the extracted bytes against its manifest.
"""

from __future__ import annotations

import sys

sys.dont_write_bytecode = True

import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import subprocess
import tempfile
import zipfile


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIRECTORY = Path("D:/game-deliverables")
ARCHIVE_NAME = "DeskRescue_V2_0.0.5-alpha.2_20261015.zip"
MANIFEST_NAME = "DELIVERY_MANIFEST.json"
TARGET_VERSION = "0.0.5-alpha.2"
PRIVATE_KEY_HEADER = re.compile(rb"(?:^|\n)-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----\r?(?:\n|$)")
ROOT_EXCLUDED = {
    ".git", "library", "temp", "tmp", "local", "profiles", "node_modules",
    "build", "native", "dist", "coverage", ".cache", "deliverables",
    "game-deliverables", ".pytest_cache", ".mypy_cache", ".ruff_cache",
}
ANY_EXCLUDED = {".git", "node_modules", "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache"}
SECRET_SUFFIXES = {".pem", ".key", ".p12", ".pfx", ".jks", ".keystore", ".kdbx"}
ARCHIVE_SUFFIXES = {".zip", ".7z", ".rar", ".tar", ".gz", ".bz2", ".xz"}
REQUIRED = {
    ".gitignore", "README.md", "package.json", "tsconfig.json", "docs/GPT_HANDOFF.md",
    "settings/v2/packages/project.json", "extensions/deskrescue-editor/package.json",
    "tools/verify-day1.cjs", "tools/verify-day4.cjs", "tools/verify-day5a.cjs",
    "tools/verify-day5a-v2.cjs", "tools/test/cc.d.ts", "tools/art/asset-sources-v2.json",
    "tools/art/generate_v2_ui.py", "assets/scenes/Game.scene", "assets/scenes/Game.scene.meta",
    "docs/DESKRESCUE_V2_UI_DESIGN.md", "docs/DAY5A_PLUS_V2_SCENE_MAPPING.md",
    "docs/DAY5A_PLUS_V2_ASSET_MANIFEST.md", "docs/DAY5A_PLUS_V2_CHANGELOG.md",
    "docs/DAY5A_PLUS_V2_CREATOR_VALIDATION.md",
}
for _kind, _names in {
    "stages": ["DragMatchStage", "CableConnectStage", "CleanSwipeStage"],
    "elements": ["DragItem", "DragTarget", "Cable", "Port", "DirtCell"],
}.items():
    for _name in _names:
        _asset = f"assets/prefabs/{_kind}/{_name}.prefab"
        REQUIRED.update((_asset, _asset + ".meta"))


def git(*arguments: str) -> bytes:
    result = subprocess.run(
        ["git", *arguments], cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        check=True, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
    return result.stdout


def safe_relative(value: str) -> str:
    path = PurePosixPath(value)
    if not value or path.is_absolute() or "\\" in value or ":" in value or any(part in {".", ".."} for part in path.parts):
        raise ValueError(f"Unsafe project/archive relative path: {value!r}")
    if path.as_posix() != value:
        raise ValueError(f"Noncanonical relative path: {value!r}")
    return value


def exclusion(relative: str) -> str | None:
    parts = PurePosixPath(relative).parts
    lower = [part.lower() for part in parts]
    name = lower[-1]
    suffix = PurePosixPath(name).suffix
    if lower[0] in ROOT_EXCLUDED or any(part in ANY_EXCLUDED for part in lower):
        return "generated-directory-or-cache"
    if name.startswith(".env") or name in {".npmrc", ".pypirc", "id_rsa", "id_dsa", "id_ecdsa", "id_ed25519", "known_hosts"}:
        return "local-environment-or-credential-file"
    if suffix in SECRET_SUFFIXES or name in {"credentials.json", "secrets.json", "service-account.json"}:
        return "key-or-credential-file"
    if suffix in ARCHIVE_SUFFIXES:
        return "archive-or-delivery-package"
    if name in {".ds_store", "thumbs.db", "desktop.ini"} or suffix in {".pyc", ".pyo", ".tsbuildinfo", ".tmp", ".temp", ".swp", ".part"} or name.endswith("~"):
        return "generated-file-or-cache"
    if relative.lower() == ".creator/asset-template/typescript/custom script template help documentation.url":
        return "creator-generated-documentation-shortcut"
    return None


def project_path(relative: str) -> Path:
    relative = safe_relative(relative)
    path = ROOT.joinpath(*PurePosixPath(relative).parts)
    resolved = path.resolve(strict=True)
    if not resolved.is_relative_to(ROOT):
        raise ValueError(f"Path escapes the project root: {relative}")
    # Never follow a checkout symlink/junction to accidentally collect local data.
    for candidate in [path, *path.parents]:
        if candidate == ROOT:
            break
        if candidate.is_symlink() or candidate.is_junction():
            raise ValueError(f"Symlink/junction is not a portable project file: {relative}")
    return path


def digest_stream(stream) -> tuple[str, int]:
    digest = hashlib.sha256()
    size = 0
    while chunk := stream.read(1024 * 1024):
        digest.update(chunk)
        size += len(chunk)
    return digest.hexdigest(), size


def digest_file(path: Path) -> tuple[str, int]:
    with path.open("rb") as stream:
        return digest_stream(stream)


def contains_private_key(path: Path) -> bool:
    overlap = b""
    with path.open("rb") as stream:
        while chunk := stream.read(1024 * 1024):
            content = overlap + chunk
            if PRIVATE_KEY_HEADER.search(content):
                return True
            overlap = content[-128:]
    return False


def inventory() -> dict:
    top = Path(git("rev-parse", "--show-toplevel").decode("utf-8").strip()).resolve()
    if top != ROOT:
        raise ValueError("The script directory is not the current Git project root.")
    names = sorted(set(item.decode("utf-8") for item in git("ls-files", "--cached", "--others", "--exclude-standard", "-z").split(b"\0") if item))
    files, excluded, issues = [], [], []
    folded = set()
    for raw in names:
        relative = safe_relative(raw)
        reason = exclusion(relative)
        if reason:
            excluded.append({"path": relative, "reason": reason})
            continue
        if relative.casefold() == MANIFEST_NAME.casefold() or relative.casefold() in folded:
            issues.append(f"Reserved or case-colliding archive path: {relative}")
            continue
        folded.add(relative.casefold())
        try:
            path = project_path(relative)
            before = path.stat()
            if not stat.S_ISREG(before.st_mode):
                raise ValueError("Not a regular file")
            if contains_private_key(path):
                excluded.append({"path": relative, "reason": "embedded-private-key"})
                issues.append(f"Private key material requires review before delivery: {relative}")
                continue
            digest, size = digest_file(path)
            after = path.stat()
            if (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns) or size != after.st_size:
                raise ValueError("File changed while calculating its hash")
            files.append({"path": relative, "bytes": size, "sha256": digest})
        except (OSError, ValueError) as error:
            issues.append(f"Cannot safely snapshot {relative}: {error}")
    by_path = {item["path"]: item for item in files}
    issues.extend(f"Required project file is unavailable/excluded: {name}" for name in sorted(REQUIRED - by_path.keys()))
    directories = set()
    for item in files:
        relative = item["path"]
        directories.update(parent.as_posix() for parent in PurePosixPath(relative).parents if parent.as_posix() != ".")
        if not relative.startswith("assets/"):
            continue
        path = ROOT / relative
        if relative.endswith(".meta"):
            source_name = relative[:-5]
            source = ROOT / source_name
            if source.is_dir():
                directories.add(source_name)  # Preserve even empty imported asset folders.
            elif not source.is_file():
                issues.append(f"Orphan Creator metadata: {relative}")
        elif not path.name.startswith(".") and relative + ".meta" not in by_path:
            issues.append(f"Creator asset metadata missing from package: {relative}.meta")
    for directory in sorted(directories):
        if directory.startswith("assets/") and not any(part.startswith(".") for part in PurePosixPath(directory).parts):
            if directory + ".meta" not in by_path:
                issues.append(f"Creator folder metadata missing from package: {directory}.meta")
    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8-sig"))
    if package.get("version") != TARGET_VERSION:
        issues.append(f"Final delivery requires package.json version {TARGET_VERSION}; current {package.get('version')}")
    if package.get("creator", {}).get("version") != "3.8.8":
        issues.append("Final delivery requires Creator 3.8.8 in package.json.")
    provenance = ROOT / "tools/art/asset-sources-v2.json"
    if provenance.is_file():
        art = json.loads(provenance.read_text(encoding="utf-8-sig"))
        for asset in art.get("runtimeAssets", []):
            for key, hash_key in [("path", "sha256"), ("source", "sourceSha256"), ("prompt", "promptSha256")]:
                if key not in asset:
                    continue
                name = safe_relative(asset[key])
                actual = by_path.get(name)
                if not actual:
                    issues.append(f"V2 source/runtime file not included: {name}")
                elif asset.get(hash_key) and actual["sha256"] != asset[hash_key]:
                    issues.append(f"V2 source/runtime hash differs from its source manifest: {name}")
    return {
        "files": files, "directories": sorted(directories), "excluded": excluded,
        "issues": sorted(set(issues)), "projectVersion": package.get("version"),
        "creatorVersion": package.get("creator", {}).get("version"),
        "git": {"head": git("rev-parse", "HEAD").decode("utf-8").strip(),
                "branch": git("branch", "--show-current").decode("utf-8").strip()},
    }


def summary(data: dict) -> dict:
    return {
        "mode": "read-only-plan", "projectRoot": ROOT.as_posix(),
        "outputDirectory": OUTPUT_DIRECTORY.as_posix(), "archiveBaseName": ARCHIVE_NAME,
        "projectVersion": data["projectVersion"], "creatorVersion": data["creatorVersion"],
        "projectFileCount": len(data["files"]), "projectBytes": sum(item["bytes"] for item in data["files"]),
        "directoryCount": len(data["directories"]), "excludedFileCount": len(data["excluded"]),
        "exclusionCounts": dict(Counter(item["reason"] for item in data["excluded"])),
        "excludedFiles": data["excluded"], "readyForPackaging": not data["issues"],
        "exclusionNote": "Counts cover additional explicit exclusions; Git-ignored untracked files are absent from the input list already.",
        "readinessIssues": data["issues"], "git": data["git"],
        "scope": "Current Git-visible worktree bytes, including uncommitted Day5A/V2 work; no network or Git mutation",
    }


def verify_zip(path: Path, manifest: dict) -> None:
    expected = {item["path"]: item for item in manifest["files"]}
    directory_names = {name + "/" for name in manifest["directories"]}
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)) or set(names) != set(expected) | directory_names | {MANIFEST_NAME}:
            raise ValueError("ZIP entries do not exactly match the project snapshot and manifest.")
        bad = archive.testzip()
        if bad is not None:
            raise ValueError(f"ZIP CRC validation failed: {bad}")
        for name, record in expected.items():
            with archive.open(name) as stream:
                digest, size = digest_stream(stream)
            if (digest, size) != (record["sha256"], record["bytes"]):
                raise ValueError(f"ZIP bytes differ from the source snapshot: {name}")
        if json.loads(archive.read(MANIFEST_NAME)) != manifest:
            raise ValueError("ZIP delivery manifest differs from the generated manifest.")


def verify_extraction(archive_path: Path, output: Path) -> None:
    # The directory is newly allocated outside the source project, never an
    # existing checkout/cache. TemporaryDirectory removes only this owned tree.
    with tempfile.TemporaryDirectory(prefix="deskrescue-v2-verify-", dir=output) as directory:
        extracted = Path(directory).resolve()
        if extracted.parent != output or not extracted.name.startswith("deskrescue-v2-verify-"):
            raise ValueError("Unexpected temporary verification directory.")
        with zipfile.ZipFile(archive_path) as archive:
            for entry in archive.infolist():
                name = entry.filename.rstrip("/")
                safe_relative(name)
                if not (extracted / name).resolve().is_relative_to(extracted):
                    raise ValueError("ZIP entry escapes its fresh extraction directory.")
            archive.extractall(extracted)
        # Read the manifest back from the independently extracted copy.
        manifest = json.loads((extracted / MANIFEST_NAME).read_text(encoding="utf-8"))
        expected = {item["path"]: item for item in manifest["files"]}
        actual = {file.relative_to(extracted).as_posix() for file in extracted.rglob("*") if file.is_file()}
        if actual != set(expected) | {MANIFEST_NAME}:
            raise ValueError("Extracted file inventory differs from DELIVERY_MANIFEST.json.")
        for name, record in expected.items():
            digest, size = digest_file(extracted / safe_relative(name))
            if (digest, size) != (record["sha256"], record["bytes"]):
                raise ValueError(f"Freshly extracted file hash/size mismatch: {name}")
        for name in manifest["directories"]:
            if not (extracted / safe_relative(name)).is_dir():
                raise ValueError(f"Imported folder missing after extraction: {name}")


def verify_current_snapshot(data: dict) -> None:
    current_names = {
        safe_relative(item.decode("utf-8"))
        for item in git("ls-files", "--cached", "--others", "--exclude-standard", "-z").split(b"\0")
        if item and not exclusion(item.decode("utf-8"))
    }
    expected = {item["path"]: item for item in data["files"]}
    if current_names != set(expected):
        raise ValueError("Project file selection changed during packaging; no delivery will be published.")
    for name, record in expected.items():
        digest, size = digest_file(project_path(name))
        if (digest, size) != (record["sha256"], record["bytes"]):
            raise ValueError(f"Project changed during packaging; no delivery will be published: {name}")


def publish_without_overwrite(temporary: Path, output: Path) -> Path:
    stem, suffix = Path(ARCHIVE_NAME).stem, Path(ARCHIVE_NAME).suffix
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    for attempt in range(100):
        name = ARCHIVE_NAME if attempt == 0 else f"{stem}_{stamp}_{attempt}{suffix}"
        destination = output / name
        try:
            with destination.open("xb") as writer, temporary.open("rb") as reader:
                shutil.copyfileobj(reader, writer, length=1024 * 1024)
                writer.flush()
                os.fsync(writer.fileno())
        except FileExistsError:
            continue
        except BaseException:
            # This path was exclusively created by this invocation, not an older package.
            if destination.parent == output and destination.exists():
                destination.unlink()
            raise
        if digest_file(destination) != digest_file(temporary):
            destination.unlink()
            raise ValueError("Published ZIP bytes differ from the verified temporary archive.")
        return destination
    raise FileExistsError("Could not allocate a new delivery filename without overwriting a previous package.")


def package(data: dict) -> dict:
    if data["issues"]:
        raise ValueError("Package is not ready: " + "; ".join(data["issues"]))
    output = OUTPUT_DIRECTORY.resolve()
    if output.is_relative_to(ROOT):
        raise ValueError("Delivery output must stay outside the project.")
    output.mkdir(parents=True, exist_ok=True)
    manifest = {
        "schemaVersion": 1, "createdAtUtc": datetime.now(timezone.utc).isoformat(),
        "project": "DeskRescue", "version": data["projectVersion"], "creatorVersion": data["creatorVersion"],
        "git": data["git"], "selection": "git ls-files --cached --others --exclude-standard -z, then explicit cache/secret/archive exclusions",
        "projectFileCount": len(data["files"]), "projectBytes": sum(item["bytes"] for item in data["files"]),
        "manifestSelfHash": "Excluded to avoid a recursive self-hash; every original project file is listed below",
        "excludedFileCount": len(data["excluded"]), "exclusionCounts": dict(Counter(item["reason"] for item in data["excluded"])),
        "directories": data["directories"], "files": data["files"],
        "importNote": "Extract this ZIP into a new folder and open that root in Creator 3.8.8. Asset metadata/source/settings are included; library/temp are intentionally regenerated by Creator.",
    }
    descriptor, name = tempfile.mkstemp(prefix="DeskRescue_V2_build_", suffix=".tmp", dir=output)
    os.close(descriptor)
    temporary = Path(name).resolve()
    try:
        with zipfile.ZipFile(temporary, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9, strict_timestamps=False) as archive:
            for directory in data["directories"]:
                archive.writestr(directory + "/", b"")
            for item in data["files"]:
                archive.write(project_path(item["path"]), item["path"])
            archive.writestr(MANIFEST_NAME, json.dumps(manifest, ensure_ascii=False, indent=2).encode("utf-8") + b"\n")
        verify_zip(temporary, manifest)
        verify_extraction(temporary, output)
        verify_current_snapshot(data)
        destination = publish_without_overwrite(temporary, output)
        digest, size = digest_file(destination)
        return {
            "mode": "packaged-and-verified", "archive": destination.as_posix(), "zipBytes": size, "zipSha256": digest,
            "projectFiles": len(data["files"]), "projectBytes": manifest["projectBytes"],
            "crcTestPassed": True, "everyZipEntryHashAndSizeMatched": True,
            "freshTemporaryExtractionHashAndSizeMatched": True, "temporaryExtractionRemoved": True,
            "priorPackagesOverwritten": False, "gitMutations": False,
        }
    finally:
        if temporary.parent == output and temporary.name.startswith("DeskRescue_V2_build_"):
            temporary.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", action="store_true", help="Read-only file/size/hash/exclusion plan; never creates a ZIP or directory")
    arguments = parser.parse_args()
    try:
        data = inventory()
        result = summary(data) if arguments.plan else package(data)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except (OSError, ValueError, subprocess.CalledProcessError, zipfile.BadZipFile) as error:
        print(json.dumps({"ok": False, "error": str(error), "gitMutations": False}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
