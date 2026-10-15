"""Compose V21/V22 native Preview comparisons without modifying source pixels.

--plan is entirely read-only and may run before V22 captures exist. Supply a
reviewed V22 comparison-spec.json to compose; filenames alone never prove the
visible state. --inventory-only records original images and explicit capture
adjudications, including retained mistakes and pending/timeout frames.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import pathlib
import platform
import re

from PIL import Image, ImageChops, ImageDraw, ImageFont, __version__ as pillow_version

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = ROOT / "docs/validation/day5a-plus"
OLD = BASE / "v21/screenshots"
NEW = BASE / "v22/screenshots"
OUT = BASE / "v22/comparisons"
SIZE = (390, 844)
BASELINE_SHA = "44bc4f1a1d76c6a1978b6a9c4d421bf229b3aa36e7861087c7096c1a7c3002b0"

# Actual V21 originals independently inspected at native390x844. New filenames
# and progress values must come from the root's reviewed natural Preview files.
BASELINE_PAIRS = {
    "clean-horizontal57": ("clean-order4-horizontal57-v21-390x844.jpg", "Order 4 | horizontal wipe", "57% / 16 of 28"),
    "clean-diagonal57": ("clean-order4-about57pct-v21-390x844.jpg", "Order 4 | diagonal / arc wipe", "57% / 16 of 28"),
    "clean-local-repeat": ("clean-local-repeat-v21-390x844.jpg", "Order 4 | local repeated wipe", "57% / 16 of 28"),
    "clean96": ("clean-order4-about96pct-v21-390x844.jpg", "Order 4 | near-threshold clean", "96% / 27 of 28"),
    "order8-four-items": ("drag-order8-four-v21-390x844.jpg", "Order 8 | four devices", "0 / 4 placed"),
    "order9-three-cross": ("cable-order9-three-cross-v21-390x844.jpg", "Order 9 | three connected cross-lines", "3 / 4 connected"),
    "order9-four-cables-before": ("cable-order9-four-v21-390x844.jpg", "Order 9 | four available cables", "0 / 4 connected"),
    "order9-four-items": ("drag-order9-four-v21-390x844.jpg", "Order 9 | four components", "0 / 4 placed"),
    "order5-0of3": ("cable-order5-0of3-v21-390x844.jpg", "Order 5 | before connection", "0 / 3 connected"),
    "order5-1of3": ("cable-order5-1of3-v21-390x844.jpg", "Order 5 | one connected cable", "1 / 3 connected"),
}
REQUIRED = tuple(list(BASELINE_PAIRS)[:6])
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png"}


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def rel(path):
    return path.relative_to(ROOT).as_posix()


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def descriptor(path, expected_size=None):
    with Image.open(path) as image:
        size = image.size
    if expected_size is not None and size != expected_size:
        raise ValueError(f"Native viewport differs; resizing is forbidden: {rel(path)} = {size}")
    return {"path": rel(path), "bytes": path.stat().st_size, "sha256": sha(path), "dimensions": list(size)}


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def image_sources():
    return {rel(path): {"bytes": path.stat().st_size, "sha256": sha(path)}
            for folder in (OLD, NEW) if folder.is_dir()
            for path in sorted(folder.iterdir()) if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES}


def verified_baseline():
    path = BASE / "v22/baseline.json"
    if sha(path) != BASELINE_SHA:
        raise ValueError("V22 baseline snapshot SHA differs from the captured alpha3 baseline")
    return {item["path"]: item for item in read_json(path)["files"]}


def original(path, baseline):
    record = descriptor(path, SIZE)
    expected = baseline.get(rel(path))
    if not expected or any(record[key] != expected[key] for key in ("path", "bytes", "sha256")):
        raise ValueError(f"Original V21 screenshot changed since V22 baseline: {rel(path)}")
    return record


def output_json(path, result):
    text = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    data = text.encode("utf-8")
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_file() and path.read_bytes() != data:
        prior = path.with_name(f"{path.stem}-prior-{dt.datetime.now(dt.timezone.utc):%Y%m%dT%H%M%S%fZ}{path.suffix}")
        prior.write_bytes(path.read_bytes())
    path.write_bytes(data)


def font(size):
    for name in ("msyh.ttc", "segoeui.ttf", "arial.ttf"):
        path = pathlib.Path("C:/Windows/Fonts") / name
        if path.is_file():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default(size=size)


def external_text(draw, text, xy, size, max_width, color="#234B50"):
    selected = font(size)
    while draw.textlength(text, font=selected) > max_width and size > 11:
        size -= 1
        selected = font(size)
    draw.text(xy, text, fill=color, font=selected)


def safe_capture(name):
    if not isinstance(name, str) or pathlib.PurePath(name).name != name or "\\" in name or "/" in name:
        raise ValueError("after must be one actual V22 screenshot filename, never an arbitrary path")
    candidate = NEW / name
    if candidate.suffix.lower() not in IMAGE_SUFFIXES:
        raise ValueError("after must be a JPG/PNG screenshot")
    return candidate


def compose_pair(spec, baseline, plan):
    key = spec.get("key")
    if key not in BASELINE_PAIRS or not re.fullmatch(r"[a-z0-9-]+", key):
        raise ValueError(f"Unknown explicitly scoped pair key: {key}")
    before_name, title, before_state = BASELINE_PAIRS[key]
    before, after = OLD / before_name, safe_capture(spec.get("after"))
    if spec.get("reviewedOriginal") is not True or not isinstance(spec.get("afterState"), str) or not spec["afterState"].strip():
        raise ValueError(f"{key}: actual original-image review and visible afterState are required")
    record = {"key": key, "title": title, "before": original(before, baseline), "after": descriptor(after, SIZE),
              "beforeState": before_state, "afterState": spec["afterState"],
              "observationBasis": spec.get("observationBasis", "Root directly inspected the actual native Preview image"),
              "pathDifference": spec.get("pathDifference", "Different natural input tracks and timers; same order/view, not an identical-input controlled experiment"),
              "remainingDifference": spec.get("remainingDifference", "Visual acceptance belongs to user review, not the comparison generator"),
              "sourcePixelPolicy": "Complete390x844 decoded RGB copied at1:1, no crop/resize/retouch/normalization; all captions outside source rectangles"}
    if plan:
        return {**record, "status": "ready"}
    OUT.mkdir(parents=True, exist_ok=True)
    output = Image.new("RGB", (840, 1046), "#ECF5F1")
    draw = ImageDraw.Draw(output)
    external_text(draw, "DeskRescue V2.1 > V2.2 | " + title, (18, 14), 21, 804)
    external_text(draw, "Original native390 x844 Preview captures | no input or score normalization", (18, 49), 16, 804, "#526C70")
    external_text(draw, "V2.1 | " + before_state, (18, 85), 17, 390)
    external_text(draw, "V2.2 | " + spec["afterState"], (432, 85), 17, 390)
    embedded = []
    for path, x in ((before, 18), (after, 432)):
        with Image.open(path) as source:
            pixels = source.convert("RGB")
        box = (x, 120, x + 390, 964)
        draw.rectangle((x - 1, 119, x + 390, 964), outline="#A7BCB4")
        output.paste(pixels, (x, 120))
        if ImageChops.difference(output.crop(box), pixels).getbbox():
            raise RuntimeError("Source pixels changed during composition")
        embedded.append((box, pixels))
    external_text(draw, record["pathDifference"], (18, 982), 15, 804, "#526C70")
    external_text(draw, record["remainingDifference"], (18, 1008), 15, 804, "#526C70")
    target = OUT / f"{key}-v21-to-v22.png"
    if target.is_file():
        prior = target.with_name(f"{target.stem}-prior-{dt.datetime.now(dt.timezone.utc):%Y%m%dT%H%M%S%fZ}{target.suffix}")
        prior.write_bytes(target.read_bytes())
    output.save(target, format="PNG", optimize=True)
    with Image.open(target) as saved:
        reopened = saved.convert("RGB")
        for box, pixels in embedded:
            if ImageChops.difference(reopened.crop(box), pixels).getbbox():
                raise RuntimeError(f"Saved PNG changed embedded source pixels: {target.name}")
    return {**record, "status": "generated", "output": descriptor(target), "embeddedPixelsIdenticalAfterReopen": True,
            "sourceRectanglesXYWH": [[18, 120, 390, 844], [432, 120, 390, 844]]}


def capture_inventory():
    ledgers = [path for path in (BASE / "v22/preview-capture-ledger.json", BASE / "v22/capture-ledger.json") if path.is_file()]
    raw = {}
    for path in ledgers:
        content = read_json(path)
        if not isinstance(content, list):
            raise ValueError(f"Capture ledger must be an array: {rel(path)}")
        for entry in content:
            name = pathlib.PurePath(str(entry.get("path", "")).replace("\\", "/")).name
            raw.setdefault(name, []).append({"sourceLedger": rel(path), "time": entry.get("time"), "rawNote": entry.get("note")})
    adjudication_path = BASE / "v22/capture-adjudications.json"
    CAPTURE_ADJUDICATIONS = read_json(adjudication_path) if adjudication_path.is_file() else {}
    if not isinstance(CAPTURE_ADJUDICATIONS, dict):
        raise ValueError("Capture adjudications must map original screenshot filenames to reviewed notes")
    records = []
    for path in sorted(NEW.iterdir()) if NEW.is_dir() else []:
        if not path.is_file() or path.suffix.lower() not in IMAGE_SUFFIXES:
            continue
        record = {**descriptor(path), "evidenceRole": "unadjudicated-original-capture-not-proof-of-success",
                  "rawCaptureLedgerNotes": raw.get(path.name, [])}
        if path.name in CAPTURE_ADJUDICATIONS:
            record.update(CAPTURE_ADJUDICATIONS[path.name])
            record["annotationBasis"] = "Explicit direct-original-image adjudication; original filename/bytes and raw ledger notes retained"
        records.append(record)
    hashes = {}
    for record in records:
        hashes.setdefault(record["sha256"], []).append(record["path"])
    for record in records:
        record["byteIdenticalOtherFiles"] = [name for name in hashes[record["sha256"]] if name != record["path"]]
    return {"schemaVersion": 1, "recordedAtUtc": now(), "scope": rel(NEW), "fileCount": len(records),
            "actualViewportDimensions": [list(value) for value in sorted({tuple(item["dimensions"]) for item in records})],
            "coverageBoundary": "File existence and names do not prove visual state, completed input, all-orders coverage or user art approval",
            "failurePolicy": "Retain mistaken, stale, pending and timeout originals; append correction, never delete/rename/retouch a source image",
            "ledgers": [{"path": rel(path), "bytes": path.stat().st_size, "sha256": sha(path)} for path in ledgers],
            "adjudications": {"path": rel(adjudication_path), "bytes": adjudication_path.stat().st_size, "sha256": sha(adjudication_path)} if adjudication_path.is_file() else None,
            "files": records}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", action="store_true", help="Read/hash only; no files or directories created")
    parser.add_argument("--inventory-only", action="store_true", help="Write only current source inventory, no comparisons")
    parser.add_argument("--spec", type=pathlib.Path, default=BASE / "v22/comparison-spec.json", help="Reviewed actual capture names/states; no successful states inferred")
    args = parser.parse_args()
    snapshot, baseline = image_sources(), verified_baseline()
    inventory, pairs, pending = capture_inventory(), [], []
    if not args.inventory_only:
        if args.spec.is_file():
            payload = read_json(args.spec)
            specs = payload.get("pairs") if isinstance(payload, dict) else payload
            if not isinstance(specs, list):
                raise ValueError("Comparison spec must be an array or an object with pairs[]")
            keys = [spec.get("key") for spec in specs]
            if len(keys) != len(set(keys)):
                raise ValueError("Duplicate comparison pair key")
            pending = [key for key in REQUIRED if key not in keys]
            if pending and not args.plan:
                raise ValueError("Required reviewed captures absent from comparison spec: " + ", ".join(pending))
            pairs = [compose_pair(spec, baseline, args.plan) for spec in specs]
        else:
            pending = list(REQUIRED)
            if not args.plan:
                raise ValueError("No reviewed V22 comparison-spec.json yet; run --plan or --inventory-only until natural captures are ready")
    changed = [name for name, value in snapshot.items() if not (ROOT / name).is_file()
               or {"bytes": (ROOT / name).stat().st_size, "sha256": sha(ROOT / name)} != value]
    if changed:
        raise RuntimeError("Original screenshot bytes changed during composition: " + ", ".join(changed))
    protection = {"comparedBeforeAndAfter": len(snapshot), "changedSources": changed}
    inventory["sourceProtection"] = protection
    result = {"schemaVersion": 1, "recordedAtUtc": now(), "generator": "tools/compare_v22_previews.py", "pythonVersion": platform.python_version(),
              "pillowVersion": pillow_version, "mode": "read-only-plan" if args.plan else "inventory-only" if args.inventory_only else "native-comparisons",
              "pixelPolicy": "No resize/crop/repaint/tint; full390x844 decoded source RGB copied to PNG and verified after reopen. Labels and borders outside source pixels.",
              "userArtApproval": False, "sourceProtection": protection, "requiredPairKeys": list(REQUIRED), "pendingRequiredPairs": pending,
              "baselineOptions": {key: {"before": original(OLD / value[0], baseline), "title": value[1], "visibleBeforeState": value[2]} for key, value in BASELINE_PAIRS.items()},
              "comparisons": pairs, "inventoryFileCount": inventory["fileCount"]}
    if not args.plan:
        output_json(OUT / "screenshot-inventory.json", inventory)
        if not args.inventory_only:
            output_json(OUT / "comparison-manifest.json", result)
    print(json.dumps({"mode": result["mode"], "comparisons": len(pairs), "inventoryFiles": inventory["fileCount"],
                      "protectedSources": len(snapshot), "sourceChanges": changed, "pendingRequiredPairs": pending}, ensure_ascii=False))


if __name__ == "__main__":
    main()
