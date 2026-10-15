"""Compose V2/V2.1 real Preview evidence without changing native comparison pixels.

Default mode preserves the Phase 1 outputs. --final creates separate final-*
comparisons and an explicitly thumbnailed six-screen overview. --inventory-only
refreshes the multi-viewport inventory after all captures are ready. Original JPEG
files remain authoritative. Native pairs preserve decoded RGB exactly; captions,
borders and padding are outside every source rectangle.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import platform

from PIL import Image, ImageChops, ImageDraw, ImageFont, __version__ as pillow_version

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "docs/validation/day5a-plus"
OLD = BASE / "screenshots"
NEW = BASE / "v21/screenshots"
OUT = BASE / "v21/comparisons"
SIZE = (390, 844)
PAIRS = (
    {
        "key": "clean57",
        "title": "CLEAN | Order 4 | 57% / 16 of 28 required cells",
        "before": "clean-v2-order4-partial-390x844.jpg",
        "after": "phase1-clean-order4-about57pct-390x844.jpg",
        "labels": ("V2 | 57% | row-oriented path", "V2.1 | 57% | diagonal + arc path"),
        "notes": ("Same viewport/order/logical progress; wiping paths and natural timers differ.",
                  "This pair shows appearance; it is not identical-input or speed benchmarking."),
        "mismatch": "Different accepted wiping paths; both images visibly render 57%.",
    },
    {
        "key": "cable1",
        "title": "CABLE | Order 5 | 1 / 3 connected",
        "before": "cable-v2-order5-1of3-390x844.jpg",
        "after": "phase1-cable-order5-1of3-390x844.jpg",
        "labels": ("V2 | power connected | 1 / 3", "V2.1 | display connected | 1 / 3"),
        "notes": ("Different connected cable: red power before, blue display after.",
                  "Compare plug/socket readability and line treatment, not identical curve geometry."),
        "mismatch": "The successfully connected cable differs; timers and mistake totals also differ.",
    },
)
FINAL_PAIRS = (
    {
        "key": "home", "title": "HOME | V2 to V2.1 | Actual idle screens",
        "before": "home-v2-390x844.jpg", "after": "home-v21-390x844.jpg",
        "labels": ("V2 | original home", "V2.1 | refined logo / character / props"),
        "notes": ("Same full viewport and idle screen; artwork, sizes and captures can differ.",
                  "Screenshots remain original; no game pixels repainted or normalized."),
        "mismatch": "Different natural captures; layout and artwork are compared without pixel normalization.",
    },
    {**PAIRS[0], "after": "clean-order4-about57pct-v21-390x844.jpg"},
    {**PAIRS[1], "after": "cable-order5-1of3-v21-390x844.jpg"},
    {
        "key": "result", "title": "RESULT | Order 1 | Actual frozen values, no score normalization",
        "before": "result-v2-390x844.jpg", "after": "result-order1-v21-390x844.jpg",
        "labels": ("V2 | 79.9s / 1 error / 110 / 1 star", "V2.1 | 499.2s / 2 errors / 100 / 1 star"),
        "notes": ("Different natural times/scores; V2.1 includes browser/tool timeout observation.",
                  "Both screenshots show actual one-star results. This is not a speed benchmark."),
        "mismatch": "V2 is79.9s/1mistake/110points/1star; V2.1 is499.2s/2mistakes/100points/1star, including browser/tool timeout dwell.",
    },
    {
        "key": "clean57-horizontal", "title": "CLEAN | Order 4 | 57% | Horizontal-row supplement",
        "before": "clean-v2-order4-partial-390x844.jpg", "after": "clean-order4-horizontal57-v21-390x844.jpg",
        "labels": ("V2 | 57% | row-oriented path", "V2.1 | 57% | two horizontal rows"),
        "notes": ("Both use horizontal row wiping; exact tracks, timing and dust layout differ.",
                  "Long straight wiping still forms a band; scattered dust has no cell outlines."),
        "mismatch": "More comparable horizontal wiping style, not identical recorded input. A long straight wipe still produces a band-shaped boundary; V2.1 uses soft scattered dust rather than visible logic cells.",
    },
)
FINAL_CONTACT = (
    ("01 HOME", "home-v21-390x844.jpg"),
    ("02 DRAG / ORDER 1", "drag-order1-v21-390x844.jpg"),
    ("03 CABLE / 1 OF 3", "cable-order5-1of3-v21-390x844.jpg"),
    ("04 CLEAN / 57%", "clean-order4-about57pct-v21-390x844.jpg"),
    ("05 RESULT / 1 STAR", "result-order1-v21-390x844.jpg"),
    ("06 FINAL / SECOND RUN", "final-v21-390x844.jpg"),
)

# Explicit adjudication from direct source-image review. Preserve originals and
# raw capture-ledger notes, including mistaken labels; filenames are not proof.
CAPTURE_ADJUDICATIONS = {
    "phase2-drag-wrong-return-390x844.jpg": {
        "evidenceRole": "misnamed-stale-home",
        "visibleState": "Home screen; byte-identical to historical V2 home, not a wrong-return capture",
        "correction": "Exclude from successful drag/return evidence; retain as capture diagnostic.",
        "reliableReplacement": "drag-order1-wrong-return-v21-390x844.jpg",
    },
    "phase2-result-order1-390x844.jpg": {
        "evidenceRole": "misnamed-stale-home",
        "visibleState": "Home screen; byte-identical to historical V2 home, not a settled order result",
        "correction": "The final actual result is499.2s/2mistakes/100points/1star, not this home image.",
        "reliableReplacement": "result-order1-v21-390x844.jpg",
    },
    "timeout-order1-not-result-390x844.jpg": {
        "evidenceRole": "diagnostic-timeout-incomplete-gameplay",
        "visibleState": "Order1 gameplay2/3,290.7seconds,1mistake; no result panel",
        "correction": "Retain browser/tool timeout observation; it is not completion evidence.",
        "reliableReplacement": "result-order1-v21-390x844.jpg",
    },
    "replay-direct-v21-1280x720.jpg": {
        "evidenceRole": "misnamed-stale-final",
        "visibleState": "First wide final summary; byte-identical to final-v21-1280x720.jpg",
        "correction": "Replay was operated and fresh0.1/0.3s order1 was observed in tool output, but that state was not saved in this file. Do not claim a saved fresh-Replay screenshot.",
        "reliableReplacement": "wide-run2-order1-result-stable.jpg",
        "replacementBoundary": "Replacement proves a settled first order in the replay run, not a0.1s start image.",
    },
    "wide-run2-order1-result.jpg": {
        "evidenceRole": "misnamed-in-progress",
        "visibleState": "Replay-run order1 gameplay1/3,4.9seconds,0mistakes; not settlement",
        "correction": "Use the separately retained stable result for950points/5.6seconds/0mistakes/3stars.",
        "reliableReplacement": "wide-run2-order1-result-stable.jpg",
    },
    "start-after-home-v21-1280x720.jpg": {
        "evidenceRole": "valid-reset-evidence-with-observation-dwell",
        "visibleState": "Order1/9,step1/1,0/3,0mistakes,soundOFF; elapsed144.4seconds",
        "correction": "Shows reset progress after Home→Start, not an immediate0.1s fresh-start screenshot; natural clock includes observation dwell.",
    },
    "cable-order7-three-cross-transition-v21-390x844.jpg": {
        "evidenceRole": "pending-snap-transition-not-settlement", "visibleState": "2/3; third head near target but not yet counted",
        "correction": "Three visible curves do not mean three recorded successes; no unobstructed3/3 is claimed.",
    },
    "cable-order9-four-transition-v21-390x844.jpg": {
        "evidenceRole": "pending-snap-transition-not-settlement", "visibleState": "3/4; fourth snap pending",
        "correction": "Four visible curves do not mean four recorded successes; no unobstructed4/4 is claimed.",
    },
    "cable-order7-two-cross-v21-390x844.jpg": {
        "evidenceRole": "in-progress-not-settlement", "visibleState": "2/3; two recorded connections",
    },
    "cable-order9-three-cross-v21-390x844.jpg": {
        "evidenceRole": "in-progress-not-settlement", "visibleState": "3/4; three recorded connections",
    },
    "cable-order8-two-v21-390x844.jpg": {
        "evidenceRole": "initial-gameplay-not-settlement", "visibleState": "0/2; filename refers to two available cables, not two connected cables",
    },
    "phase1-cable-last-snap-3.jpg": {
        "evidenceRole": "settled-result-modal-obscures-gameplay", "visibleState": "HUD3/3 with immediate result modal",
        "correction": "Real completion, but not an unobstructed three-success gameplay image.",
    },
}
for _index in range(3):
    CAPTURE_ADJUDICATIONS[f"phase1-cable-last-snap-{_index}.jpg"] = {
        "evidenceRole": "pending-snap-transition-not-settlement", "visibleState": "2/3; final yellow snap pending",
        "correction": "Head alignment/three visible lines do not mean3/3; no settlement or unobstructed3/3 claim.",
    }
for _size in ("390x844", "1280x720"):
    CAPTURE_ADJUDICATIONS[f"cable-order9-four-v21-{_size}.jpg"] = {
        "evidenceRole": "initial-gameplay-not-settlement", "visibleState": "0/4; filename describes four available cables, not4/4 completion",
    }


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rel(path):
    return path.relative_to(ROOT).as_posix()


def source(path, expected_size=SIZE):
    with Image.open(path) as image:
        size = image.size
    if expected_size is not None and size != expected_size:
        raise ValueError(f"Native viewport mismatch; no resize is allowed: {rel(path)} {size}")
    return {"path": rel(path), "dimensions": list(size), "bytes": path.stat().st_size, "sha256": sha(path)}


def rgb(path):
    with Image.open(path) as image:
        return image.convert("RGB")


def font(size):
    for path in (Path("C:/Windows/Fonts/segoeui.ttf"), Path("C:/Windows/Fonts/arial.ttf")):
        if path.is_file():
            return ImageFont.truetype(str(path), size)
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def protect_sources():
    return {rel(path): {"bytes": path.stat().st_size, "sha256": sha(path)}
            for folder in (OLD, NEW) for path in sorted(folder.iterdir())
            if path.is_file() and path.suffix.lower() in (".jpg", ".jpeg", ".png")}


def paste_exact(output, original, x, y):
    w, h = original.size
    ImageDraw.Draw(output).rectangle((x - 1, y - 1, x + w, y + h), outline="#A7BCB4")
    output.paste(original, (x, y))
    box = (x, y, x + w, y + h)
    if ImageChops.difference(output.crop(box), original).getbbox():
        raise RuntimeError("Source pixels changed during composition")
    return box


def save_exact(output, filename, embedded):
    path = OUT / filename
    output.save(path, format="PNG", optimize=True)
    with Image.open(path) as saved:
        decoded = saved.convert("RGB")
        for box, original in embedded:
            if ImageChops.difference(decoded.crop(box), original).getbbox():
                raise RuntimeError(f"Reopened PNG differs from source pixels: {filename}")
    return {"path": rel(path), "dimensions": list(output.size), "bytes": path.stat().st_size,
            "sha256": sha(path), "embeddedSourcePixelsIdenticalAfterReopen": True}


def pair(spec, plan, prefix="phase1"):
    before, after = OLD / spec["before"], NEW / spec["after"]
    record = {"key": spec["key"], "before": source(before), "after": source(after),
              "observedStateDifference": spec["mismatch"], "labels": list(spec["labels"])}
    if plan:
        return {**record, "status": "ready"}
    output = Image.new("RGB", (840, 1020), "#ECF5F1")
    draw = ImageDraw.Draw(output)
    draw.text((18, 15), spec["title"], fill="#234B50", font=font(21))
    draw.text((18, 51), "Real Preview captures | full 390 x 844 viewports", fill="#526C70", font=font(16))
    draw.text((18, 89), spec["labels"][0], fill="#526C70", font=font(16))
    draw.text((432, 89), spec["labels"][1], fill="#234B50", font=font(16))
    images = (rgb(before), rgb(after))
    boxes = [paste_exact(output, image, x, 120) for x, image in zip((18, 432), images)]
    for index, note in enumerate(spec["notes"]):
        draw.text((18, 977 + index * 19), note, fill="#526C70", font=font(15))
    record["output"] = save_exact(output, f"{prefix}-{spec['key']}-v2-to-v21.png", list(zip(boxes, images)))
    record.update({"status": "generated", "sourceRectanglesXYWH": [[x0, y0, x1-x0, y1-y0] for x0, y0, x1, y1 in boxes]})
    return record


def snap_sequence(plan):
    paths = [NEW / f"phase1-cable-last-snap-{index}.jpg" for index in range(4)]
    record = {"key": "last-snap-sequence", "sources": [source(path) for path in paths],
              "visibleStates": ["2/3; final head pending", "2/3; final head pending", "2/3; final head pending",
                                "3/3; settlement modal obscures cables"],
              "unobstructedThreeSuccessStateCaptured": False}
    if plan:
        return {**record, "status": "ready"}
    output = Image.new("RGB", (840, 1874), "#ECF5F1")
    draw = ImageDraw.Draw(output)
    draw.text((18, 14), "CABLE | Last snap: raw capture sequence", fill="#234B50", font=font(22))
    embedded, rectangles = [], []
    for index, path in enumerate(paths):
        x = 18 + index % 2 * 414
        label_y = 56 + index // 2 * 895
        draw.text((x, label_y), f"RAW {index} | {record['visibleStates'][index]}", fill="#526C70", font=font(15))
        original = rgb(path)
        box = paste_exact(output, original, x, label_y + 30)
        embedded.append((box, original)); rectangles.append([x, label_y + 30, *SIZE])
    draw.text((18, 1840), "No artificial settlement delay added. No unobstructed 3/3 frame is claimed.", fill="#526C70", font=font(15))
    record["output"] = save_exact(output, "phase1-cable-last-snap-sequence.png", embedded)
    record.update({"status": "generated", "sourceRectanglesXYWH": rectangles})
    return record


def final_contact(plan):
    records = [source(NEW / name) for _, name in FINAL_CONTACT]
    result = {"sources": records, "policy": "Six complete390x844 viewports uniformly thumbnailed; no crop or retouch. Read original files or native comparisons for pixels/text.",
              "sourceRectanglesRetainFullViewport": True, "thumbnailResampling": "Pillow LANCZOS"}
    if plan:
        return {**result, "status": "ready"}
    output = Image.new("RGB", (1672, 699), "#ECF5F1")
    draw = ImageDraw.Draw(output)
    draw.text((16, 12), "DeskRescue V2.1 | Six real 390 x 844 Preview screens | THUMBNAIL OVERVIEW", fill="#234B50", font=font(22))
    embedded = []
    for index, ((label, name), record) in enumerate(zip(FINAL_CONTACT, records)):
        thumbnail = rgb(NEW / name)
        thumbnail.thumbnail((260, 563), Image.Resampling.LANCZOS)
        x = 16 + index * 276
        draw.text((x, 51), label, fill="#234B50", font=font(15))
        box = paste_exact(output, thumbnail, x, 80)
        embedded.append((box, thumbnail))
        record.update({"thumbnailDimensions": list(thumbnail.size), "thumbnailRectangleXYWH": [x, 80, *thumbnail.size]})
    draw.text((16, 656), "Uniform thumbnails, full viewport included. Actual results/timers are preserved; scores are not normalized. Original files remain authoritative.", fill="#526C70", font=font(16))
    draw.text((16, 678), "The six-screen sheet documents appearance, not final user art approval or platform/performance validation.", fill="#526C70", font=font(14))
    result["output"] = save_exact(output, "final-six-screen-contact.png", embedded)
    result["output"]["embeddedThumbnailPixelsIdenticalAfterReopen"] = result["output"].pop("embeddedSourcePixelsIdenticalAfterReopen")
    result.update({"status": "generated", "gamePixelsResampledOnlyForThisOverview": True})
    return result


def screenshot_inventory(plan):
    ledger = json.loads((BASE / "v21/preview-capture-ledger.json").read_text(encoding="utf-8"))
    ledger_by_name = {}
    for capture in ledger:
        ledger_by_name.setdefault(Path(capture["path"]).name, []).append({"time": capture.get("time"), "rawNote": capture.get("note")})
    records = []
    for path in sorted(NEW.iterdir()):
        if not path.is_file() or path.suffix.lower() not in (".jpg", ".jpeg", ".png"):
            continue
        record = source(path, expected_size=None)
        record["evidenceRole"] = ("diagnostic-not-success" if path.name.startswith("timeout-") else
                                  "historical-iteration" if path.name.startswith(("phase1-", "phase2-")) else "preview-capture")
        if path.name in CAPTURE_ADJUDICATIONS:
            record.update(CAPTURE_ADJUDICATIONS[path.name])
            record["annotationBasis"] = "Direct original-image inspection plus explicitly reported root operations; raw ledger retained without rewriting"
        record["rawCaptureLedgerNotes"] = ledger_by_name.get(path.name, [])
        records.append(record)
    by_hash = {}
    for record in records:
        by_hash.setdefault(record["sha256"], []).append(record["path"])
    for record in records:
        record["byteIdenticalOtherFiles"] = [path for path in by_hash[record["sha256"]] if path != record["path"]]
    result = {"schemaVersion": 1, "recordedAtUtc": now(), "generator": "tools/compare_v21_previews.py --inventory-only",
              "scope": rel(NEW), "projectVersion": json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"],
              "fileCount": len(records), "actualViewportDimensions": [list(size) for size in sorted({tuple(r["dimensions"]) for r in records})],
              "coverageBoundary": "Inventory records actual files and hashes; file existence or filename does not imply successful input, all-orders completion or visual acceptance. Raw ledger notes can be wrong; visibleState/correction fields adjudicate the known mistakes without altering historical notes.",
              "correctionPolicy": "Preserve every misnamed, timeout and pending original; annotate instead of deleting/renaming/retouching. Byte equality alone does not imply a failed capture: static Home screens may legitimately repeat.",
              "knownAnnotatedFiles": sum(Path(record["path"]).name in CAPTURE_ADJUDICATIONS for record in records),
              "rawLedger": source_record_without_dimensions(BASE / "v21/preview-capture-ledger.json"),
              "files": records}
    return result


def source_record_without_dimensions(path):
    return {"path": rel(path), "bytes": path.stat().st_size, "sha256": sha(path)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", action="store_true", help="Read sources and hashes only; create no files")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--final", action="store_true", help="Write separate final native pairs and a labeled thumbnail contact sheet")
    mode.add_argument("--inventory-only", action="store_true", help="Refresh multi-viewport screenshot hashes after all sizes are ready; do not rewrite comparisons")
    args = parser.parse_args()
    baseline = protect_sources()
    if not args.plan:
        OUT.mkdir(parents=True, exist_ok=True)
    inventory = screenshot_inventory(args.plan) if args.inventory_only else None
    comparisons = [] if args.inventory_only else [pair(spec, args.plan, "final" if args.final else "phase1") for spec in (FINAL_PAIRS if args.final else PAIRS)]
    sequence = snap_sequence(args.plan) if not args.final and not args.inventory_only else None
    contact = final_contact(args.plan) if args.final else None
    changed = [path for path, record in baseline.items()
               if not (ROOT / path).is_file() or {"bytes": (ROOT / path).stat().st_size, "sha256": sha(ROOT / path)} != record]
    if changed:
        raise RuntimeError("Original screenshots changed: " + ", ".join(changed))
    if inventory is not None:
        inventory["sourceProtection"] = {"comparedBeforeAndAfter": len(baseline), "sourceChanges": changed}
        if not args.plan:
            (OUT / "final-screenshot-inventory.json").write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    result = {"schemaVersion": 1, "recordedAtUtc": now(), "generator": "tools/compare_v21_previews.py",
              "pythonVersion": platform.python_version(), "pillowVersion": pillow_version,
              "mode": "plan" if args.plan else "inventory-only" if args.inventory_only else "final-native-comparisons-and-thumbnail-overview" if args.final else "lossless-native-viewport-composition",
              "pixelPolicy": "No resize/crop/repaint/tint; external captions/borders only. Decoded JPEG RGB is copied to lossless PNG and compared after reopening.",
              "acceptance": "Evidence composition is not user art approval, rendering automation or platform testing.",
              "protectedSourceCount": len(baseline), "protectedSourceChanges": changed,
              "comparisons": comparisons, "lastSnapSequence": sequence, "sixScreenContact": contact}
    if args.final:
        result["pixelPolicy"] += " Only the explicitly labeled six-screen overview is uniformly thumbnailed. The five native pairs, including the horizontal supplement, retain every original RGB pixel."
        result["inventoryStatus"] = "Multi-viewport inventory intentionally deferred; run --inventory-only after all sizes are ready."
    if not args.plan and not args.inventory_only:
        (OUT / ("final-comparison-manifest.json" if args.final else "phase1-comparison-manifest.json")).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"mode": result["mode"], "pairs": len(comparisons), "rawFrames": 4 if sequence else 0,
                      "protectedSources": len(baseline), "sourceChanges": changed,
                      "nativePairPixelsPreserved": bool(comparisons) and not args.plan,
                      "contactIsThumbnail": bool(contact), "inventoryFiles": inventory["fileCount"] if inventory else None}, ensure_ascii=False))


if __name__ == "__main__":
    main()
