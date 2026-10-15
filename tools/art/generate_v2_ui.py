"""Reproduce DeskRescue V2 runtime layers offline from retained masters/geometry.

No image API is called by this script. AI-generated masters and their exact prompts
are retained under tools/art/v2/sources. User-authorized quadrant extraction creates
separate character layers; no design poster is used as a screen or background.
Never writes Creator .meta/.scene/.prefab, existing Day5A artwork or old manifest.
"""

from __future__ import annotations

import hashlib
import io
import json
import math
import random
import sys
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image

sys.dont_write_bytecode = True
import generate_day5a as shared

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "assets/art/v2"
SOURCE = ROOT / "tools/art/v2/sources"
INK = "#315F60"
PAPER = "#FFF5DB"
TEAL = "#348779"
GOLD = "#FFB84D"
MANIFEST = []


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def relative(path):
    return path.relative_to(ROOT).as_posix()


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    shared.write_if_changed(path, data)


def png(image, key, source, features, method, extra=None):
    path = ART / (key + ".png")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    write(path, buffer.getvalue())
    item = {"key": "v2/" + key, "path": relative(path), "source": relative(source),
            "sourceSha256": digest(source), "width": image.width, "height": image.height,
            "mode": image.mode, "bytes": path.stat().st_size, "sha256": digest(path),
            "features": features, "method": method,
            "origin": "Original DeskRescue V2 project artwork; no downloaded third-party assets or brand logos"}
    if extra:
        item.update(extra)
    MANIFEST.append(item)


def save_geometry(canvas, key, features, extra=None):
    source = SOURCE / (key + ".svg")
    header = f'<svg xmlns="http://www.w3.org/2000/svg" width="{canvas.width}" height="{canvas.height}" viewBox="0 0 {canvas.width} {canvas.height}">'
    title = '<title>' + escape("DeskRescue V2 original " + key) + '</title>'
    write(source, (header + "\n" + title + "\n" + "\n".join(canvas.svg) + "\n</svg>\n").encode("utf-8"))
    image = canvas.image.resize((canvas.width, canvas.height), Image.Resampling.LANCZOS)
    png(image, key, source, features, "Original shared Canvas geometry -> SVG plus Pillow 3x antialiased PNG", extra)


def master(key, filename, size, features, box=None, padding=0):
    source = SOURCE / (filename + ".master.png")
    with Image.open(source) as original:
        image = original.convert("RGBA") if filename != "workshop-room" else original.convert("RGB")
        source_size = image.size
        if box is not None:
            image = image.crop(box)
        alpha_box = None
        if image.mode == "RGBA":
            # Bounding geometry only; alpha pixels are preserved, not recolored.
            alpha_box = image.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
            if not alpha_box:
                raise ValueError("Empty master layer: " + filename)
            image = image.crop(alpha_box)
            image.thumbnail((size[0] - padding * 2, size[1] - padding * 2), Image.Resampling.LANCZOS)
            output = Image.new("RGBA", size)
            output.alpha_composite(image, ((size[0] - image.width) // 2, size[1] - padding - image.height))
            image = output
        else:
            image = image.resize(size, Image.Resampling.LANCZOS)
        prompt = SOURCE / (filename + ".prompt.md")
        png(image, key, source, features,
            "Built-in image_gen.imagegen master; offline authorized layer extraction and resampling",
            {"prompt": relative(prompt), "promptSha256": digest(prompt), "sourceSize": list(source_size),
             "quadrantCrop": list(box) if box is not None else None,
             "alphaContentCrop": list(alpha_box) if alpha_box is not None else None,
             "transparentBackground": image.mode == "RGBA", "tool": "built-in image_gen.imagegen",
             "authorization": "User-authorized V2 original art and separate editable game layers; no poster screenshot substitution"})


def paper():
    c = shared.Canvas(192, 128)
    for expand, alpha in ((5, 5), (3, 10), (1, 18)):
        c.rect(6 - expand, 12 - expand, 180 + 2 * expand, 110 + 2 * expand,
               (89, 63, 37, alpha), 22 + expand)
    c.rect(5, 5, 182, 114, "#D7AC7C", 25, "#9E724D", 1.5)
    c.rect(8, 6, 176, 108, PAPER, 23)
    c.rect(12, 11, 168, 100, None, 20, "#EBCFA5", 1)
    c.line([(30, 12), (157, 12)], "#FFFFFF", 2)
    rng = random.Random(26101510)
    for _ in range(170):
        x, y = rng.uniform(20, 172), rng.uniform(18, 106)
        radius = rng.uniform(0.14, 0.6)
        c.ellipse(x, y, radius, radius, (160, 112, 67, rng.randint(10, 24)))
    for x, y, flip in ((17, 17, 1), (175, 17, -1), (17, 103, 1), (175, 103, -1)):
        c.arc(x + flip * 5, y + 4, 5, 5, 200 if flip > 0 else 0, 330 if flip > 0 else 130, "#DFC294", 0.8)
    save_geometry(c, "paper", ["Cream parchment surface", "Fine seeded paper flecks and delicate corner line", "Soft layered warm shadow"],
                  {"nineSlice": {"left": 32, "right": 32, "top": 28, "bottom": 28}})


def gold_button():
    c = shared.Canvas(256, 128)
    for expand, alpha in ((4, 7), (2, 12), (0, 25)):
        c.rect(8 - expand, 18 - expand, 240 + 2 * expand, 100 + 2 * expand,
               (132, 75, 24, alpha), 49 + expand)
    c.rect(8, 14, 240, 101, "#D48A36", 48, "#9C6631", 2)
    c.rect(8, 6, 240, 101, "#FFBD54", 48, "#F2A33E", 2)
    c.rect(14, 10, 228, 86, "#FFD66B", 41)
    c.rect(18, 11, 220, 68, "#FFE57D", 35)
    c.rect(20, 13, 216, 40, "#FFEAA3", 22)
    c.line([(45, 20), (211, 20)], "#FFF5C1", 4)
    c.arc(60, 55, 35, 35, 145, 219, (255, 255, 230, 182), 4)
    c.line([(52, 100), (205, 100)], "#F4A33F", 2)
    save_geometry(c, "gold-button", ["Gold raised capsule with creamy highlight", "Warm undercut and soft drop shadow", "No text or baked action icon"],
                  {"nineSlice": {"left": 64, "right": 64, "top": 48, "bottom": 48}})


def wood_workbench():
    c = shared.Canvas(720, 720)
    for inset, alpha in ((0, 8), (3, 13), (6, 20)):
        c.rect(10 + inset, 20 + inset, 700 - inset * 2, 683 - inset, (99, 61, 29, alpha), 45)
    c.rect(8, 13, 704, 680, "#A96740", 44, "#7C5136", 4)
    c.rect(11, 8, 698, 640, "#D8A070", 42, "#B77B50", 4)
    c.rect(21, 18, 678, 617, "#E1B182", 34, "#F4D6AC", 4)
    rng = random.Random(26101511)
    for y in range(55, 630, 24):
        phase = rng.uniform(0, math.pi * 2)
        points = [(x, y + math.sin(x / 65 + phase) * rng.uniform(1.2, 2.8)) for x in range(36, 686, 8)]
        c.line(points, (155, 94, 50, rng.randint(22, 40)), rng.uniform(0.7, 1.3))
        points = [(x, y + 7 + math.sin(x / 83 + phase) * 2) for x in range(40, 681, 8)]
        c.line(points, (255, 223, 177, 83), 0.8)
    for y in (216, 423):
        c.line([(35, y), (684, y)], (163, 104, 62, 56), 2)
        c.line([(35, y + 3), (684, y + 3)], (253, 221, 177, 100), 1)
    for x, y in ((110, 88), (593, 311), (154, 543)):
        c.arc(x, y, 29, 5, 15, 340, (163, 106, 64, 46), 1)
        c.arc(x, y, 16, 2, 0, 360, (160, 99, 54, 33), 1)
    c.rect(18, 639, 684, 27, "#BE8155", 11)
    c.line([(50, 646), (669, 646)], "#E8BB8B", 3)
    c.line([(50, 673), (669, 673)], "#9C603D", 3)
    for x in (30, 678):
        c.ellipse(x, 41, 10, 10, "#BD885B", "#F5D5A4", 1)
    save_geometry(c, "wood-workbench", ["Warm wood repair surface with three physical planks", "Seeded fine flowing grain and knots", "Thick bevel, front lip and warm shadow"])


def green_mat():
    c = shared.Canvas(640, 480)
    c.rect(9, 15, 622, 456, (31, 66, 51, 32), 39)
    c.rect(8, 8, 624, 456, "#245F57", 38, "#1D574E", 3)
    c.rect(13, 10, 614, 444, TEAL, 34)
    c.rect(23, 22, 594, 420, None, 27, "#6CA58B", 2)
    for x in range(42, 603, 18):
        c.line([(x, 30), (x + 8, 30)], (210, 228, 167, 83), 1.2)
        c.line([(x, 435), (x + 8, 435)], (210, 228, 167, 83), 1.2)
    for y in range(48, 425, 18):
        c.line([(30, y), (30, y + 8)], (210, 228, 167, 83), 1.2)
        c.line([(610, y), (610, y + 8)], (210, 228, 167, 83), 1.2)
    for y in range(51, 426, 20):
        c.line([(43, y), (596, y + 1)], (170, 202, 170, 12), 0.6)
    c.line([(50, 38), (590, 38)], (189, 223, 184, 48), 2)
    save_geometry(c, "green-mat", ["Deep green antistatic work mat", "Fine stitched perimeter and subtle material grain", "No visible logical cell grid, targets or progress"])


def cable_anchor():
    c = shared.Canvas(128, 128)
    c.ellipse(13, 87, 103, 20, (68, 60, 42, 37))
    c.rect(13, 43, 102, 56, "#D4B785", 23, "#86684E", 3)
    c.rect(16, 36, 96, 54, "#F2DFB4", 23, "#D1B488", 2)
    c.line([(35, 42), (94, 42)], "#FFF0CD", 3)
    c.ellipse(42, 37, 45, 45, "#6FA99C", "#315F60", 3)
    c.ellipse(49, 43, 31, 31, "#2D706B", "#A6D2B8", 2)
    c.ellipse(56, 50, 17, 17, "#214A4A")
    c.arc(65, 58, 12, 12, 210, 285, "#D5EAC5", 2)
    for x in (27, 94):
        c.ellipse(x - 4, 72, 8, 8, "#977B5A", "#EDD5A9", 1)
        c.line([(x - 2, 76), (x + 2, 76)], "#604F3F", 1)
    save_geometry(c, "cable-anchor", ["Rounded fixed cable grommet", "Soft green cylindrical socket", "Warm base with fastening screws"])


def irregular_dust():
    c = shared.Canvas(256, 256)
    rng = random.Random(26101512)
    # Uneven clump distribution and a fully transparent perimeter; overlap these
    # decorative children, never expose a rectangular tile as the interaction grid.
    for _ in range(20):
        x, y = rng.uniform(62, 194), rng.uniform(62, 194)
        radius = rng.uniform(15, 45)
        for band in range(7, 0, -1):
            rr = radius * (0.45 + band * 0.075)
            c.ellipse(x - rr, y - rr * 0.73, rr * 2, rr * 1.46,
                      (124, 94, 62, 4 + (7 - band) * 2))
    for _ in range(48):
        x, y = rng.uniform(40, 217), rng.uniform(42, 215)
        size = rng.uniform(1.5, 6)
        vertices = [(x + math.cos(a * math.pi / 3) * size * rng.uniform(0.7, 1.3),
                     y + math.sin(a * math.pi / 3) * size * rng.uniform(0.5, 1)) for a in range(6)]
        c.poly(vertices, (129, 98, 67, rng.randint(32, 108)))
    for _ in range(145):
        x, y = rng.uniform(30, 225), rng.uniform(29, 226)
        size = rng.uniform(0.3, 1.8)
        c.ellipse(x, y, size, size, (104, 88, 66, rng.randint(24, 94)))
    for pts in [[(75, 92), (84, 87), (90, 91)], [(153, 174), (164, 168), (174, 173)]]:
        c.line(pts, (150, 119, 75, 67), 1.2)
    save_geometry(c, "irregular-dust", ["Asymmetric soft brown powder clumps", "Seeded grit, flecks and wispy threads", "Transparent perimeter for overlapped child sprites; no baked grid"],
                  {"renderingNote": "Decorative child may overlap logical pooled cell; do not resize or move the real hit cell."})


def confetti():
    c = shared.Canvas(128, 128)
    c.poly([(45, 31), (76, 20), (84, 52), (57, 67)], "#F0B854", "#DA983B", 1.5)
    c.poly([(47, 32), (76, 22), (80, 35), (52, 49)], "#FFDE85")
    c.poly([(50, 49), (80, 35), (84, 52), (57, 67)], "#FFC962")
    c.line([(54, 34), (72, 28)], "#FFEFB4", 2)
    save_geometry(c, "confetti", ["One softly folded gold paper fleck", "Transparent sparse particle sprite", "Runtime tint may vary; no baked text or scene"])


def protected_snapshot():
    manifest_path = ROOT / "tools/art/asset-sources.json"
    records = json.loads(manifest_path.read_text(encoding="utf-8"))["runtimeAssets"]
    files = {manifest_path, ROOT / "tools/art/generate_day5a.py", ROOT / "tools/art/full_geometry.py"}
    for record in records:
        files.add(ROOT / record["path"])
        source = ROOT / record["source"]
        if source.is_file():
            files.add(source)
    return {file: digest(file) for file in files}


def main():
    before = protected_snapshot()
    ART.mkdir(parents=True, exist_ok=True)
    SOURCE.mkdir(parents=True, exist_ok=True)
    master("workshop-room", "workshop-room", (864, 1296),
           ["Layered warm timber and mint repair room", "Window, lamp, shelves and plants", "Quiet center; no text, UI, characters or large game devices"])
    with Image.open(SOURCE / "repair-boy-poses.master.png") as image:
        width, height = image.size
    half_width, half_height = width // 2, height // 2
    for name, box in [
        ("repair-welcome", (0, 0, half_width, half_height)),
        ("repair-pointing", (half_width, 0, width, half_height)),
        ("repair-thumbsup", (0, half_height, half_width, height)),
        ("repair-cheering", (half_width, half_height, width, height)),
    ]:
        master(name, "repair-boy-poses", (512, 640),
               ["Same cream wrench-cap repair boy identity", "Warm skin, dark hair, blue-green dungarees", name.removeprefix("repair-") + " pose, independent transparent layer"],
               box=box, padding=24)
    with Image.open(SOURCE / "repair-boy-poses.master.png") as image:
        welcome = image.crop((0, 0, half_width, half_height)).convert("RGBA")
        bounds = welcome.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if not bounds:
        raise ValueError("Welcome source has no visible avatar content.")
    avatar_box = (max(0, bounds[0] - 8), max(0, bounds[1] - 8),
                  min(half_width, bounds[2] + 8), bounds[1] + int((bounds[3] - bounds[1]) * 0.63))
    master("repair-avatar", "repair-boy-poses", (256, 256),
           ["Welcome character hat, face and shoulders at readable tutor scale", "Same cream wrench-cap and blue-green outfit identity", "Independent transparent portrait; original four poses retained"],
           box=avatar_box, padding=8)
    MANIFEST[-1]["cropRole"] = "Hat/head/shoulders avatar from the welcome quadrant of retained character master"
    master("trophy", "trophy", (384, 384), ["Warm golden cup and curled handles", "Crossed repair wrenches", "Neutral final award with no baked score or rating"], padding=12)
    master("cloth-glove", "cloth-glove", (320, 320), ["Soft blue microfiber cloth", "White work glove and seam detail", "Transparent non-interactive cleaning cue"], padding=14)
    paper()
    gold_button()
    wood_workbench()
    green_mat()
    cable_anchor()
    irregular_dust()
    confetti()
    changed = [relative(path) for path, sha in before.items() if digest(path) != sha]
    if changed:
        raise RuntimeError("Protected Day5A source bytes changed: " + ", ".join(changed))
    report = {"schemaVersion": 1, "phase": "v2", "generator": "tools/art/generate_v2_ui.py",
              "method": "Built-in image_gen original layered masters plus deterministic offline Canvas/Pillow/SVG UI geometry",
              "licensing": "Original project-bound generated art and geometry; no third-party downloaded imagery, fonts, logos or audio; repository license unchanged",
              "reproduction": "python tools/art/generate_v2_ui.py -- offline only; never calls image API or re-generates retained AI masters",
              "protectedDay5AFileCount": len(before), "protectedDay5AChanges": changed,
              "runtimeAssets": MANIFEST, "runtimeAssetCount": len(MANIFEST),
              "runtimeBytes": sum(item["bytes"] for item in MANIFEST)}
    write(ROOT / "tools/art/asset-sources-v2.json", (json.dumps(report, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    print(json.dumps({"assets": len(MANIFEST), "bytes": report["runtimeBytes"], "protectedFiles": len(before), "protectedChanges": changed}))


if __name__ == "__main__":
    main()
