"""Pair real Day5A/V2 Preview screenshots without resizing or editing game pixels.

Only new files under docs/validation/day5a-plus/comparisons are written. Missing
or differently sized captures remain explicitly pending; no acceptance is inferred.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import io
import json
import os
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageStat

ROOT = Path(__file__).resolve().parents[1]
OLD = ROOT / "docs/validation/day5a/screenshots"
NEW = ROOT / "docs/validation/day5a-plus/screenshots"
OUT = ROOT / "docs/validation/day5a-plus/comparisons"
PAIRS = (
    ("home", "HOME", "home-390x844.jpg", "home-v2-390x844.jpg", (390, 844)),
    ("drag", "DRAG", "drag-390x844.jpg", "drag-v2-order1-390x844.jpg", (390, 844)),
    ("cable", "CABLE: INITIAL", "cable-before-390x844.jpg", "cable-v2-order5-0of3-390x844.jpg", (390, 844)),
    ("clean", "CLEAN: DIRTY", "clean-dirty-390x844.jpg", "clean-v2-order4-dirty-390x844.jpg", (390, 844)),
    ("result", "ORDER RESULT", "result-390x844.jpg", "result-v2-390x844.jpg", (390, 844)),
    ("final", "FINAL SUMMARY", "full-summary.jpg", "final-v2-1280x720.jpg", (1280, 720)),
)
PARTIAL_CLEAN = ("clean-partial", "CLEAN: PARTIAL", "clean-half-390x844.jpg",
                 "clean-v2-order4-partial-390x844.jpg", (390, 844))
CONTACT = (
    ("01 HOME", "home-v2-390x844.jpg"),
    ("02 DRAG", "drag-v2-order1-390x844.jpg"),
    ("03 CABLE", "cable-v2-order5-0of3-390x844.jpg"),
    ("04 CLEAN", "clean-v2-order4-dirty-390x844.jpg"),
    ("05 RESULT", "result-v2-390x844.jpg"),
    ("06 FINAL", "final-v2-390x844.jpg"),
)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rel(path):
    return path.relative_to(ROOT).as_posix()


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def write(path, data):
    if not path.exists() or path.read_bytes() != data:
        path.write_bytes(data)


def json_write(path, value):
    write(path, (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))


def old_snapshot():
    return {rel(path): {"sha256": sha(path), "bytes": path.stat().st_size}
            for path in sorted(OLD.rglob("*")) if path.suffix.lower() in (".jpg", ".jpeg", ".png")}


def protect_old_evidence():
    current = old_snapshot()
    baseline_path = OUT / "day5a-source-snapshot.json"
    if baseline_path.exists():
        previous = json.loads(baseline_path.read_text(encoding="utf-8"))["files"]
        changes = [path for path, record in previous.items() if current.get(path) != record]
        if changes:
            raise RuntimeError("Historical Day5A screenshot bytes changed or disappeared: " + ", ".join(changes))
    else:
        json_write(baseline_path, {"schemaVersion": 1, "recordedAtUtc": now(),
                                  "scope": rel(OLD), "method": "Read-only SHA-256 and byte count",
                                  "fileCount": len(current), "files": current})
    return current


def font(size):
    # English labels need no downloaded fonts or system-specific font paths.
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def source_record(path):
    record = {"path": rel(path), "exists": path.is_file()}
    if record["exists"]:
        with Image.open(path) as image:
            record["dimensions"] = list(image.size)
        record.update({"sha256": sha(path), "bytes": path.stat().st_size})
    return record


def comparison(pair, plan_only):
    key, title, old_name, new_name, expected_size = pair
    before, after = OLD / old_name, NEW / new_name
    record = {"key": key, "title": title, "expectedDimensions": list(expected_size),
              "before": source_record(before), "after": source_record(after),
              "pixelPolicy": "Full screenshots at native dimensions; only outside labels, padding and borders added"}
    if not before.is_file():
        record["status"] = "missing-historical-source"
        return record
    if not after.is_file():
        record["status"] = "pending-new-screenshot"
        return record
    if tuple(record["before"]["dimensions"]) != expected_size or tuple(record["after"]["dimensions"]) != expected_size:
        record["status"] = "dimension-mismatch-no-resize"
        return record
    if plan_only:
        record["status"] = "ready-to-render"
        return record
    with Image.open(before) as image:
        left = image.convert("RGB")
    with Image.open(after) as image:
        right = image.convert("RGB")
    width, height = expected_size
    padding, gap, header, footer = 18, 24, 86, 36
    output = Image.new("RGB", (width * 2 + padding * 2 + gap, height + header + footer), "#EAF7F3")
    draw = ImageDraw.Draw(output)
    draw.text((padding, 12), title + "  |  Day5A -> V2", fill="#214650", font=font(21))
    draw.text((padding, 51), "BEFORE  Day5A  " + f"{width} x {height}", fill="#56737B", font=font(16))
    draw.text((padding + width + gap, 51), "AFTER  V2  " + f"{width} x {height}", fill="#214650", font=font(16))
    positions = ((padding, header), (padding + width + gap, header))
    for image, (x, y) in zip((left, right), positions):
        draw.rectangle((x - 1, y - 1, x + width, y + height), outline="#9EB8AC", width=1)
        output.paste(image, (x, y))
        # Guard against accidental image scaling/cropping/tint in this utility.
        if ImageChops.difference(output.crop((x, y, x + width, y + height)), image).getbbox():
            raise RuntimeError("Screenshot pixels changed during composition: " + key)
    draw.text((padding, height + header + 10), "Real Preview captures. Dynamic scores/times may differ. No gameplay pixels edited.",
              fill="#56737B", font=font(12))
    path = OUT / (key + "-day5a-to-v2.png")
    buffer = io.BytesIO()
    output.save(buffer, format="PNG", optimize=True)
    write(path, buffer.getvalue())
    record.update({"status": "generated", "output": rel(path), "outputDimensions": list(output.size),
                   "outputSha256": sha(path), "outputBytes": path.stat().st_size,
                   "sourcePixelsPreserved": True})
    return record


def six_screen_contact(plan_only):
    sources = [source_record(NEW / filename) for _, filename in CONTACT]
    record = {"sources": sources, "expectedSourceDimensions": [390, 844],
              "pixelPolicy": "Six real full phone viewports, uniformly thumbnailed; no crop, retouch or interface reconstruction"}
    if any(not source["exists"] for source in sources):
        record["status"] = "pending-new-screenshot"
        return record
    if any(source["dimensions"] != [390, 844] for source in sources):
        record["status"] = "source-dimension-mismatch-no-crop"
        return record
    if plan_only:
        record["status"] = "ready-to-render"
        return record
    padding, header, footer, thumbnail_width, thumbnail_height = 16, 64, 36, 260, 563
    image = Image.new("RGB", (len(CONTACT) * thumbnail_width + (len(CONTACT) + 1) * padding,
                              header + thumbnail_height + footer), "#EAF7F3")
    draw = ImageDraw.Draw(image)
    draw.text((padding, 10), "DeskRescue V2 | Six real Preview screens", fill="#214650", font=font(21))
    for position, ((label, filename), source) in enumerate(zip(CONTACT, sources)):
        with Image.open(NEW / filename) as original:
            thumbnail = original.convert("RGB")
        thumbnail.thumbnail((thumbnail_width, thumbnail_height), Image.Resampling.LANCZOS)
        x = padding + position * (thumbnail_width + padding)
        draw.text((x, 43), label, fill="#214650", font=font(14))
        draw.rectangle((x - 1, header - 1, x + thumbnail_width, header + thumbnail_height), outline="#9EB8AC")
        image.paste(thumbnail, (x + (thumbnail_width - thumbnail.width) // 2, header))
        source.update({"thumbnailDimensions": list(thumbnail.size), "fullViewportIncluded": True,
                       "resampling": "Pillow LANCZOS", "contactPosition": [x, header]})
    draw.text((padding, header + thumbnail_height + 10), "All six sources are actual 390 x 844 captures, including the phone final summary. Full viewport retained.",
              fill="#56737B", font=font(13))
    path = OUT / "six-screen-contact.png"
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    write(path, buffer.getvalue())
    record.update({"status": "generated", "output": rel(path), "outputDimensions": list(image.size),
                   "outputSha256": sha(path), "outputBytes": path.stat().st_size})
    return record


def frame_pixel_checks(records):
    target, tolerance = (195, 236, 224), 4
    report = {"method": "Measure decoded original screenshot pixels; verify embedded source corners in lossless comparison PNGs",
              "sourceEncodingNote": "Current captures are JPEG. PNG outputs preserve decoded JPEG RGB pixels without another lossy encode.",
              "expectedMintRGB": list(target), "perChannelTolerance": tolerance, "edgeStripPixels": 8,
              "nearBlackDefinition": "All RGB channels <= 16", "measurementOnly": True, "screenshots": []}
    for path in sorted(NEW.glob("*")):
        if path.suffix.lower() not in (".jpg", ".jpeg", ".png"):
            continue
        with Image.open(path) as original:
            image = original.convert("RGB")
        width, height = image.size
        corners = {name: list(image.getpixel(point)) for name, point in
                   (("topLeft", (0, 0)), ("topRight", (width - 1, 0)),
                    ("bottomLeft", (0, height - 1)), ("bottomRight", (width - 1, height - 1)))}
        edges = {"top": (0, 0, width, 8), "bottom": (0, height - 8, width, height),
                 "left": (0, 0, 8, height), "right": (width - 8, 0, width, height)}
        expected_edges = ("left", "right") if width / height > 720 / 1280 else ("top", "bottom")
        measurements = {}
        for name in expected_edges:
            strip = image.crop(edges[name])
            pixels = list(strip.get_flattened_data()) if hasattr(strip, "get_flattened_data") else list(strip.getdata())
            mint = sum(all(abs(value - reference) <= tolerance for value, reference in zip(pixel, target)) for pixel in pixels)
            black = sum(max(pixel) <= 16 for pixel in pixels)
            measurements[name] = {"meanRGB": [round(value, 3) for value in ImageStat.Stat(strip).mean],
                                  "mintFraction": mint / len(pixels), "nearBlackFraction": black / len(pixels)}
        report["screenshots"].append({"path": rel(path), "sha256": sha(path), "dimensions": [width, height],
                                       "cornerRGB": corners, "measuredLetterboxEdges": list(expected_edges), "edgeMeasurements": measurements})
    report["embeddedComparisonPngChecks"] = []
    for record in records:
        if record["status"] != "generated":
            continue
        width, height = record["expectedDimensions"]
        x, y = width + 42, 86
        with Image.open(ROOT / record["output"]) as output:
            embedded = output.convert("RGB").crop((x, y, x + width, y + height))
        with Image.open(ROOT / record["after"]["path"]) as original:
            source = original.convert("RGB")
        points = ((0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1))
        identical = ImageChops.difference(embedded, source).getbbox() is None
        report["embeddedComparisonPngChecks"].append({"key": record["key"], "png": record["output"],
                                                       "sourceImageRectangle": [x, y, width, height],
                                                       "embeddedGameCornerRGB": [list(embedded.getpixel(point)) for point in points],
                                                       "allSourcePixelsIdentical": identical})
        if not identical:
            raise RuntimeError("Lossless comparison source region changed: " + record["key"])
    report["actualViewportDimensions"] = sorted({tuple(item["dimensions"]) for item in report["screenshots"]})
    report["actualViewportDimensions"] = [list(value) for value in report["actualViewportDimensions"]]
    return report


def index(records, contact):
    lines = ["# Day5A / V2 real Preview comparisons", "",
             "Native screenshot dimensions are preserved. Labels and borders are outside the game image.",
             "These pairs document appearance only; generation does not mean visual or gameplay acceptance.",
             "The historical final summary exists at 1280×720, so that pair uses matching landscape captures.", "",
             "| Screen | Native dimensions | Before | After | Comparison status / file |",
             "| --- | --- | --- | --- | --- |"]
    def link(record, label):
        path = ROOT / record["path"]
        return f'[{label}]({Path(os.path.relpath(path, OUT)).as_posix()})' if record["exists"] else "pending"
    for record in records:
        size = "×".join(str(value) for value in record["expectedDimensions"])
        status = record["status"]
        if record.get("output"):
            status = f'[{status}]({Path(record["output"]).name})'
        lines.append(f'| {record["title"]} | {size} | {link(record["before"], "Day5A")} | {link(record["after"], "V2")} | {status} |')
    if contact.get("output"):
        lines.extend(["", "[Six-screen V2 contact sheet](six-screen-contact.png)", "",
                      "The contact sheet includes all six complete 390×844 viewports. Letterbox colors and embedded PNG pixel checks are recorded in comparison-manifest.json."])
    write(OUT / "README.md", ("\n".join(lines) + "\n").encode("utf-8"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan-only", action="store_true", help="Record actual availability and hashes without rendering comparisons")
    parser.add_argument("--require-complete", action="store_true", help="Exit nonzero until every requested comparison is generated")
    parser.add_argument("--include-partial-clean", action="store_true", help="Add the separate actual partial-cleaning capture pair")
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    before = protect_old_evidence()
    pairs = list(PAIRS) + ([PARTIAL_CLEAN] if args.include_partial_clean else [])
    records = [comparison(pair, args.plan_only) for pair in pairs]
    contact = six_screen_contact(args.plan_only)
    pixel_checks = frame_pixel_checks(records)
    after = old_snapshot()
    changes = [path for path, record in before.items() if after.get(path) != record]
    if changes:
        raise RuntimeError("Historical evidence changed while composing: " + ", ".join(changes))
    generated = sum(record["status"] == "generated" for record in records)
    manifest = {"schemaVersion": 1, "recordedAtUtc": now(), "generator": "tools/compare_v2_previews.py",
                "mode": "plan-only" if args.plan_only else "native-pixel-comparison",
                "evaluation": "No visual/gameplay acceptance inferred; source captures remain authoritative",
                "historicalSourceCount": len(before), "historicalChanges": changes,
                "requestedPairCount": len(records), "generatedPairCount": generated,
                "pendingPairCount": len(records) - generated, "pairs": records,
                "sixScreenContact": contact, "framePixelChecks": pixel_checks}
    json_write(OUT / "comparison-manifest.json", manifest)
    index(records, contact)
    print(json.dumps({"requested": len(records), "generated": generated, "historicalSources": len(before),
                      "historicalChanges": changes, "statuses": {r["key"]: r["status"] for r in records}}))
    if args.require_complete and generated != len(records):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
