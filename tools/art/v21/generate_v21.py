"""Original V2.1 connector art and tightly cropped legacy device derivatives.

This offline generator only writes assets/art/v21 and tools/art/v21. Existing
Day5A/V2 PNG, SVG, AI masters and manifests remain untouched. No Creator files.
The full rollout was authorized after the real Creator risk sample passed.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import sys
from xml.sax.saxutils import escape

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT / "tools/art"))
from generate_day5a import Canvas, write_if_changed

ART = ROOT / "assets/art/v21"
SOURCE = ROOT / "tools/art/v21/sources"
INK = "#253F47"
SHELL = "#496F70"
SHELL_LIGHT = "#7BA29C"
METAL = "#D4DFD4"
CREAM = "#FFF2CF"
PIN = "#E3BD6B"
HOLE = "#10292F"
RECORDS = []
SAMPLE_KINDS = ("power", "display", "network")
FULL_KINDS = SAMPLE_KINDS + ("audio", "usb", "motherboard", "cpu", "sata", "fan")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rel(path):
    return path.relative_to(ROOT).as_posix()


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    write_if_changed(path, data)


def tail(c):
    c.line([(9, 86), (71, 86)], "#263F46", 19)
    c.line([(10, 81), (65, 81)], "#8BAEAA", 5)
    c.rect(41, 66, 36, 42, "#324F57", 9, INK, 2)
    for x in (49, 58, 67):
        c.line([(x, 72), (x, 102)], "#7A9996", 3)


def grip(c, network=False):
    c.ellipse(49, 126, 191, 19, (62, 52, 37, 32))
    tail(c)
    c.poly([(72, 47), (153, 40), (176, 59), (172, 126), (73, 134), (57, 118)], SHELL, INK, 4)
    c.poly([(72, 47), (153, 40), (176, 59), (91, 67), (59, 62)], "#8AAFA5", INK, 2)
    c.poly([(60, 64), (89, 70), (88, 126), (73, 132), (59, 117)], "#385C62")
    c.line([(98, 72), (148, 67)], "#A8C8B8", 3)
    for x in (103, 117, 131):
        c.line([(x, 84), (x - 1, 119)], "#2E5158", 4)
        c.line([(x + 3, 84), (x + 2, 118)], "#6F9692", 1.5)
    if network:
        c.poly([(91, 47), (149, 41), (180, 47), (174, 59), (98, 64)], "#C8DECF", INK, 2)


def head(c, kind):
    grip(c, kind == "network")
    if kind == "power":
        # Keyed three-contact plug, with its insertion face to the right.
        face = [(161, 38), (215, 42), (242, 66), (241, 119), (164, 131), (146, 112), (147, 63)]
        c.poly(face, "#A9BDB7", INK, 4)
        c.poly([(162, 43), (213, 47), (235, 68), (235, 115), (166, 125), (153, 108), (153, 66)], METAL, "#F8F5D9", 2)
        c.line([(163, 46), (210, 50), (228, 65)], "#FFF9E0", 4)
        for x, y, length in ((194, 61, 22), (171, 91, 24), (215, 91, 24)):
            c.poly([(x, y), (x + 12, y - 1), (x + 15, y + length - 3), (x + 2, y + length)], "#AF8643", INK, 1.5)
            c.poly([(x + 2, y + 2), (x + 9, y + 1), (x + 11, y + length - 5), (x + 4, y + length - 3)], PIN)
            c.line([(x + 3, y + 3), (x + 8, y + 2)], "#FFE2A1", 2)
    elif kind == "display":
        # Metallic HDMI-like keyed tongue; bevels and front aperture stay visible.
        c.poly([(150, 48), (231, 54), (244, 68), (243, 101), (222, 124), (151, 126), (140, 108), (140, 65)], "#A8BDB8", INK, 4)
        c.poly([(153, 54), (228, 60), (238, 71), (237, 99), (218, 117), (156, 119), (148, 105), (148, 68)], "#E5E9D6", "#FFF5D7", 2)
        c.poly([(162, 68), (223, 72), (227, 80), (226, 97), (213, 109), (164, 110), (158, 100), (158, 78)], "#243E47", INK, 2)
        c.poly([(169, 78), (219, 81), (219, 95), (210, 101), (168, 102)], "#47646A")
        for index in range(9):
            x = 168 + index * 6
            c.line([(x, 81), (x + 1, 96)], PIN, 2.8)
        c.line([(157, 58), (226, 64)], "#FFFFFF", 3)
    elif kind == "network":
        # Broad clear RJ45 plug, eight contacts and a raised latch, facing right.
        c.poly([(149, 39), (232, 46), (244, 62), (243, 118), (155, 131), (142, 116), (142, 56)], "#B8D6C7", INK, 4)
        c.poly([(152, 44), (228, 51), (236, 64), (236, 114), (158, 125), (149, 112), (149, 59)], "#E1EEE0", "#F8FAE6", 2)
        c.poly([(160, 64), (228, 68), (229, 104), (161, 113)], "#8CB4AD", "#4B7575", 2)
        for index in range(8):
            x = 166 + index * 8
            c.poly([(x, 68), (x + 4, 68.5), (x + 5, 100), (x + 1, 101)], PIN, "#BA9147", 0.8)
        c.poly([(169, 42), (218, 46), (227, 23), (181, 20)], "#C5DED0", INK, 3)
        c.poly([(177, 38), (211, 41), (216, 27), (186, 25)], "#F4F5DE")
        c.line([(154, 48), (226, 55)], "#FFFFFF", 3)
    elif kind == "audio":
        c.rect(143, 65, 89, 43, "#C89948", 7, INK, 3)
        c.rect(147, 69, 84, 30, "#F1D08A", 5)
        c.line([(154, 74), (223, 74)], "#FFF0BF", 3)
        for x in (181, 207):
            c.rect(x, 66, 6, 40, "#2D3C3B", 2)
        c.poly([(230, 66), (247, 80), (247, 92), (230, 107)], "#E3BA68", INK, 3)
        c.line([(236, 75), (243, 82)], "#FFE8A4", 2)
    elif kind == "usb":
        c.poly([(148, 47), (232, 52), (244, 64), (242, 117), (150, 130), (139, 114), (140, 61)], "#AFBEB6", INK, 4)
        c.poly([(152, 53), (227, 58), (237, 68), (235, 112), (154, 123), (146, 111), (147, 64)], "#E9EAD7", "#FFF9DF", 2)
        for x in (165, 206):
            c.poly([(x, 65), (x + 16, 66), (x + 16, 82), (x, 82)], "#40585B", INK, 1.5)
            c.line([(x + 2, 68), (x + 13, 69)], "#92AAA1", 2)
        c.poly([(158, 94), (230, 91), (229, 111), (158, 118)], "#4A6666", INK, 1.5)
        for x in (167, 184, 201, 218):
            c.poly([(x, 97), (x + 6, 97), (x + 6, 109), (x, 110)], PIN)
        c.line([(154, 57), (224, 63)], "#FFFFFF", 3)
    elif kind in ("motherboard", "cpu", "fan"):
        columns, rows = {"motherboard": (12, 2), "cpu": (4, 2), "fan": (4, 1)}[kind]
        top, bottom = (51, 123) if rows == 2 else (70, 120)
        c.poly([(131, top - 5), (230, top), (244, top + 13), (242, bottom), (132, bottom + 12), (120, bottom - 2), (122, top + 9)],
               "#B8CABC", INK, 4)
        c.poly([(134, top + 1), (226, top + 6), (237, top + 16), (236, bottom - 3), (135, bottom + 5), (127, bottom - 5), (128, top + 13)],
               "#E5E9D1", "#FFF7D9", 2)
        c.rect(154, top - 21, 50, 19, "#A5BEB0", 4, INK, 2)
        c.line([(161, top - 17), (198, top - 17)], "#E8EDCE", 3)
        cell_width = 94 / columns
        for row in range(rows):
            for col in range(columns):
                x = 136 + col * cell_width
                y = top + 18 + row * 27
                c.rect(x, y, cell_width - 2, 21, HOLE, 1.8, "#78938A", 1)
                pin_width = min(6, cell_width - 4)
                c.rect(x + (cell_width - 2 - pin_width) / 2, y + 4, pin_width, 13, PIN, 1)
        c.line([(135, top + 5), (225, top + 10)], "#FFFFFF", 2)
    elif kind == "sata":
        c.poly([(145, 56), (234, 62), (245, 74), (242, 117), (145, 130), (132, 114), (133, 71)], "#A5B9AE", INK, 4)
        c.poly([(149, 62), (230, 68), (238, 78), (235, 113), (149, 123), (139, 110), (140, 74)], "#E5E7D0", "#FFF8DC", 2)
        c.poly([(150, 77), (227, 80), (227, 110), (211, 112), (211, 96), (150, 96)], HOLE, INK, 1.5)
        for x in range(156, 212, 8):
            c.line([(x, 82), (x, 92)], PIN, 3)
        c.line([(153, 66), (227, 72)], "#FFFFFF", 3)
    else:
        raise ValueError("Unknown connector kind: " + kind)


def port(c, kind):
    # The visible socket face is at left, its thickness recedes towards the right.
    c.ellipse(22, 128, 222, 18, (64, 51, 36, 30))
    c.poly([(29, 33), (215, 29), (241, 46), (239, 126), (220, 140), (30, 140), (17, 122), (17, 51)], "#6F8A80", INK, 4)
    c.poly([(31, 29), (214, 26), (233, 42), (43, 47), (19, 48)], "#E7E9D0", INK, 2)
    c.rect(17, 40, 213, 94, "#DCE5CB", 19, INK, 3)
    c.rect(23, 45, 201, 82, "#EFEFD5", 15, "#FCF7DA", 2)
    c.line([(40, 48), (207, 48)], "#FFFBE1", 3)
    for x in (30, 211):
        c.ellipse(x - 4, 80, 8, 8, "#6A8378", "#C4D7B9", 1)
        c.line([(x - 2, 84), (x + 2, 84)], "#415C59", 1)
    if kind == "power":
        c.poly([(68, 48), (176, 48), (202, 71), (202, 116), (45, 116), (45, 72)], "#688E83", INK, 3)
        c.poly([(72, 55), (172, 55), (193, 75), (193, 108), (54, 108), (54, 76)], HOLE, "#A9C5AF", 2)
        for x, y in ((119, 65), (88, 86), (153, 86)):
            c.rect(x - 6, y, 13, 19, "#020F15", 2, "#405F5C", 1)
    elif kind == "display":
        c.poly([(45, 54), (202, 54), (202, 87), (179, 115), (69, 115), (45, 87)], "#75978D", INK, 3)
        c.poly([(53, 61), (194, 61), (194, 84), (175, 107), (72, 107), (53, 84)], HOLE, "#B0C8B2", 2)
        c.poly([(68, 75), (180, 75), (180, 85), (168, 98), (80, 98), (68, 85)], "#304F54")
        for index in range(12):
            x = 75 + index * 8
            c.line([(x, 77), (x, 89)], "#C4D4A8", 2)
    elif kind == "network":
        c.rect(45, 51, 157, 66, "#668F83", 7, INK, 3)
        c.rect(53, 57, 141, 52, HOLE, 4, "#ADCCB3", 2)
        c.rect(95, 96, 57, 21, HOLE, 3)
        c.line([(96, 115), (151, 115)], "#759C8B", 2)
        for index in range(8):
            x = 67 + index * 15
            c.rect(x, 61, 6, 27, "#D8C18A", 1)
            c.line([(x + 1, 62), (x + 1, 83)], "#FFE2A1", 1)
    elif kind == "audio":
        c.ellipse(79, 45, 88, 80, "#7F9A84", INK, 3)
        c.ellipse(87, 51, 72, 67, "#E4C887", "#F6E7AF", 2)
        c.ellipse(99, 62, 49, 47, HOLE, "#937A4E", 2)
        c.ellipse(108, 70, 30, 30, "#020F15", "#355852", 2)
        c.arc(124, 85, 29, 28, 196, 285, "#FFF1C6", 3)
    elif kind == "usb":
        c.rect(45, 54, 157, 62, "#7A9A8B", 7, INK, 3)
        c.rect(53, 61, 141, 48, HOLE, 4, "#BBD0B5", 2)
        c.rect(64, 85, 117, 17, "#C8D6BE", 3, "#36544E", 1)
        for x in (78, 105, 132, 159):
            c.rect(x, 87, 9, 11, "#A38D59", 1)
            c.line([(x + 2, 88), (x + 6, 88)], "#E7D8A3", 1.5)
    elif kind in ("motherboard", "cpu", "fan"):
        columns, rows = {"motherboard": (12, 2), "cpu": (4, 2), "fan": (4, 1)}[kind]
        top, aperture_height = (56, 60) if rows == 2 else (67, 41)
        c.rect(45, top - 4, 157, aperture_height + 8, "#779887", 6, INK, 3)
        c.rect(51, top + 1, 145, aperture_height - 2, HOLE, 4, "#B2C8AD", 2)
        c.rect(103, top - 15, 43, 11, "#5E7D6D", 3, INK, 1.5)
        cell_width = 133 / columns
        for row in range(rows):
            for col in range(columns):
                x = 57 + col * cell_width
                y = top + 8 + row * 25
                c.rect(x, y, cell_width - 3, 18, "#020E12", 1.5, "#607F72", 1)
                c.line([(x + 2, y + 2), (x + cell_width - 5, y + 2)], "#8FA991", 1)
    elif kind == "sata":
        c.rect(45, 60, 157, 54, "#739584", 6, INK, 3)
        c.poly([(53, 67), (193, 67), (193, 106), (169, 106), (169, 89), (53, 89)], HOLE, "#AFC5A9", 2)
        for x in range(63, 161, 14):
            c.rect(x, 71, 5, 12, "#D5C58A", 1)
    else:
        raise ValueError("Unknown socket kind: " + kind)


def save(c, key, features, phase):
    png_path, svg_path = ART / (key + ".png"), SOURCE / (key + ".svg")
    header = f'<svg xmlns="http://www.w3.org/2000/svg" width="{c.width}" height="{c.height}" viewBox="0 0 {c.width} {c.height}">'
    title = '<title>' + escape("DeskRescue V2.1 original " + key) + '</title>'
    write(svg_path, (header + "\n" + title + "\n" + "\n".join(c.svg) + "\n</svg>\n").encode("utf-8"))
    image = c.image.resize((c.width, c.height), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    write(png_path, buffer.getvalue())
    RECORDS.append({"key": "v21/" + key, "bindingKey": key, "phase": phase, "path": rel(png_path), "source": rel(svg_path),
                    "sourceSha256": sha(svg_path), "width": c.width, "height": c.height, "mode": image.mode,
                    "bytes": png_path.stat().st_size, "sha256": sha(png_path), "features": features,
                    "direction": "head inserts to the right" if key.endswith("-head") else "socket face to the left, thickness recedes right",
                    "origin": "Original project SVG geometry; no image API, downloaded art, text, logos or emojis"})


def tight_devices():
    old_manifest = json.loads((ROOT / "tools/art/asset-sources.json").read_text(encoding="utf-8"))
    devices = [record for record in old_manifest["runtimeAssets"] if record["key"].startswith("devices/")]
    if len(devices) != 19:
        raise ValueError("Expected the actual nineteen existing Day5A devices.")
    for original in devices:
        key = original["key"]
        original_png, original_svg = ROOT / original["path"], ROOT / original["source"]
        with Image.open(original_png) as image:
            source_image = image.convert("RGBA")
        bounds = source_image.getchannel("A").point(lambda value: 255 if value > 24 else 0).getbbox()
        if not bounds:
            raise ValueError("Existing device has no visible content: " + key)
        padding = 6
        crop = (max(0, bounds[0] - padding), max(0, bounds[1] - padding),
                min(source_image.width, bounds[2] + padding), min(source_image.height, bounds[3] + padding))
        result = source_image.crop(crop)
        width, height = result.size
        svg_text = original_svg.read_text(encoding="utf-8")
        header = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
                  f'viewBox="{crop[0]} {crop[1]} {width} {height}">')
        note = f'\n<!-- V2.1 tight viewBox crop of original {rel(original_svg)}; original drawing coordinates retained. -->'
        svg_text, replacements = re.subn(r'<svg\b[^>]*>', lambda _: header + note, svg_text, count=1)
        if replacements != 1:
            raise ValueError("Original device SVG root missing: " + key)
        png_path, svg_path = ART / (key + ".png"), SOURCE / (key + ".svg")
        write(svg_path, svg_text.encode("utf-8"))
        buffer = io.BytesIO()
        result.save(buffer, format="PNG", optimize=True)
        write(png_path, buffer.getvalue())
        RECORDS.append({"key": "v21/" + key, "bindingKey": key, "phase": "full",
                        "path": rel(png_path), "source": rel(svg_path), "sourceSha256": sha(svg_path),
                        "width": width, "height": height, "mode": "RGBA", "bytes": png_path.stat().st_size, "sha256": sha(png_path),
                        "features": original["features"] + ["Tighter transparent margin; original device pixels and shape preserved"],
                        "origin": "Derived from existing original project device PNG/SVG; no new external image material",
                        "method": "Lossless integer crop of original RGBA PNG; matching SVG viewBox crop without changing geometry",
                        "originalPng": rel(original_png), "originalPngSha256": sha(original_png),
                        "originalSvg": rel(original_svg), "originalSvgSha256": sha(original_svg),
                        "originalSize": list(source_image.size), "alphaContentBounds": list(bounds),
                        "alphaThreshold": 24, "transparentPaddingPixels": padding, "cropBox": list(crop),
                        "croppedPixelsPreserved": True})


def protected_snapshot():
    files = set()
    for name in ("asset-sources.json", "asset-sources-v2.json"):
        manifest = ROOT / "tools/art" / name
        files.add(manifest)
        report = json.loads(manifest.read_text(encoding="utf-8"))
        for record in report["runtimeAssets"]:
            for field in ("path", "source", "prompt"):
                if field in record:
                    path = ROOT / record[field]
                    if path.is_file():
                        files.add(path)
    for name in ("generate_day5a.py", "full_geometry.py", "generate_v2_ui.py", "v2/SOURCES.md"):
        files.add(ROOT / "tools/art" / name)
    previous_manifest = ROOT / "tools/art/v21/asset-sources.json"
    if previous_manifest.is_file():
        previous = json.loads(previous_manifest.read_text(encoding="utf-8"))
        for record in previous["runtimeAssets"]:
            if record.get("phase") == "sample":
                files.update(ROOT / record[field] for field in ("path", "source"))
        if previous.get("artContact"):
            files.add(ROOT / previous["artContact"]["path"])
    return {path: sha(path) for path in files}


def contact():
    image = Image.new("RGB", (960, 500), "#EAF7F3")
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default(size=17)
    draw.text((20, 12), "V2.1 ORIGINAL ART SAMPLES | not a Creator Preview", fill=INK, font=font)
    for index, kind in enumerate(("power", "display", "network")):
        x = index * 320
        draw.rounded_rectangle((x + 10, 48, x + 310, 480), radius=22, fill="#FFF5DB")
        draw.text((x + 24, 61), kind.upper() + " / HEAD ->", fill=INK, font=font)
        draw.text((x + 24, 263), "<- SOCKET / PORT", fill=INK, font=font)
        for role, y in (("head", 91), ("port", 294)):
            with Image.open(ART / f"ports/{kind}-{role}.png") as art:
                image.paste(art, (x + 32, y), art)
    path = ROOT / "tools/art/v21/previews/sample-contact.png"
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    write(path, buffer.getvalue())
    return {"path": rel(path), "sha256": sha(path), "bytes": path.stat().st_size,
            "kind": "Art-making contact sheet, not runtime evidence"}


def full_contacts():
    paths = []
    font = ImageFont.load_default(size=16)
    image = Image.new("RGB", (960, 1194), "#EAF7F3")
    draw = ImageDraw.Draw(image)
    draw.text((18, 12), "V2.1 FULL CONNECTOR ART | head above / socket below | not Preview", fill=INK, font=font)
    for index, kind in enumerate(FULL_KINDS):
        x, y = (index % 3) * 320, 44 + (index // 3) * 380
        draw.rounded_rectangle((x + 10, y + 4, x + 310, y + 370), radius=22, fill="#FFF5DB")
        draw.text((x + 24, y + 12), kind.upper(), fill=INK, font=font)
        for role, offset in (("head", 39), ("port", 204)):
            with Image.open(ART / f"ports/{kind}-{role}.png") as art:
                image.paste(art, (x + 32, y + offset), art)
    path = ROOT / "tools/art/v21/previews/full-ports-contact.png"
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    write(path, buffer.getvalue())
    paths.append(path)

    devices = [record for record in RECORDS if record["bindingKey"].startswith("devices/")]
    image = Image.new("RGB", (1000, 840), "#EAF7F3")
    draw = ImageDraw.Draw(image)
    draw.text((18, 12), "V2.1 TIGHT DEVICE DERIVATIVES | original pixels retained | not Preview", fill=INK, font=font)
    for index, record in enumerate(devices):
        x, y = (index % 5) * 200, 44 + (index // 5) * 198
        draw.rounded_rectangle((x + 7, y + 4, x + 192, y + 192), radius=19, fill="#FFF5DB")
        with Image.open(ROOT / record["path"]) as original:
            art = original.convert("RGBA")
        art.thumbnail((166, 140), Image.Resampling.LANCZOS)
        image.paste(art, (x + (200 - art.width) // 2, y + 12 + (140 - art.height) // 2), art)
        draw.text((x + 14, y + 161), record["bindingKey"].split("/")[-1], fill=INK, font=font)
    path = ROOT / "tools/art/v21/previews/full-devices-contact.png"
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    write(path, buffer.getvalue())
    paths.append(path)
    return [{"path": rel(path), "sha256": sha(path), "bytes": path.stat().st_size,
             "kind": "Art-making contact sheet, not runtime evidence"} for path in paths]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--phase", choices=("sample", "full"), default="sample")
    args = parser.parse_args()
    protected = protected_snapshot()
    for kind in FULL_KINDS if args.phase == "full" else SAMPLE_KINDS:
        for role, draw in (("head", head), ("port", port)):
            canvas = Canvas(256, 160)
            draw(canvas, kind)
            phase = "sample" if kind in SAMPLE_KINDS else "full"
            save(canvas, f"ports/{kind}-{role}", [kind + " keyed connector geometry", "Upper-left highlight and dark bevel", "Large readable pins or recessed slot"], phase)
    preview = contact()
    expanded_contacts = []
    if args.phase == "full":
        tight_devices()
        expanded_contacts = full_contacts()
    changed = [rel(path) for path, digest in protected.items() if sha(path) != digest]
    if changed:
        raise RuntimeError("Protected old asset bytes changed: " + ", ".join(changed))
    report = {"schemaVersion": 1, "phase": args.phase, "generator": "tools/art/v21/generate_v21.py",
              "method": "Original shared connector Canvas geometry -> SVG/Pillow PNG; original device PNG integer crops plus matching SVG viewBox crops",
              "licensing": "Original DeskRescue project geometry, no third-party downloaded assets or new repository license",
              "runtimeBindingPolicy": "Keep existing ports/... and devices/... keys in VisualAssetRegistry; bind these new SpriteFrames to them",
              "protectedFileCount": len(protected), "protectedChanges": changed,
              "runtimeAssets": RECORDS, "runtimeAssetCount": len(RECORDS), "runtimeBytes": sum(record["bytes"] for record in RECORDS),
              "artContact": preview, "fullArtContacts": expanded_contacts,
              "runtimeAcceptance": "Requires real Creator import, saved binding and Preview; no acceptance inferred from art generation"}
    write(ROOT / "tools/art/v21/asset-sources.json", (json.dumps(report, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    print(json.dumps({"phase": args.phase, "assets": len(RECORDS), "bytes": report["runtimeBytes"],
                      "protectedFiles": len(protected), "protectedChanges": changed}))


if __name__ == "__main__":
    main()
