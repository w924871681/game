"""Original DeskRescue art/audio. Offline, deterministic; requires existing Pillow.

The same vector primitives produce editable SVG exports and antialiased PNGs.
This is a native Pillow drawing fallback, not a claim that Pillow imports SVG.
Never creates or edits Creator .meta, .scene or .prefab files.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import math
import random
import struct
import wave
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "assets/art"
SOURCE = ROOT / "tools/art/sources"
INK = "#263D50"
TEAL = "#2EAAA8"
PALE = "#D4ECE8"
CREAM = "#F8F3E9"
GOLD = "#FFBE58"
MUTED = "#667D8C"
SCALE = 3
MANIFEST = []


def write_if_changed(path, data):
    """Keep existing asset bytes/mtime when deterministic regeneration is identical."""
    if not path.exists() or path.read_bytes() != data:
        path.write_bytes(data)


def color(value):
    if value is None:
        return None
    if isinstance(value, tuple):
        return value
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def svg_color(value, role):
    if value is None:
        return f'{role}="none"'
    rgba = color(value)
    return f'{role}="#{rgba[0]:02x}{rgba[1]:02x}{rgba[2]:02x}" {role}-opacity="{rgba[3] / 255:.4f}"'


class Canvas:
    def __init__(self, width, height):
        self.width, self.height = width, height
        self.image = Image.new("RGBA", (width * SCALE, height * SCALE))
        self.svg = []

    def draw(self, operation):
        layer = Image.new("RGBA", self.image.size)
        operation(ImageDraw.Draw(layer))
        self.image.alpha_composite(layer)

    def rect(self, x, y, w, h, fill, radius=0, stroke=None, sw=0):
        xy = tuple(v * SCALE for v in (x, y, x + w, y + h))
        self.draw(lambda d: d.rounded_rectangle(xy, radius=radius * SCALE,
                  fill=color(fill), outline=color(stroke), width=max(1, round(sw * SCALE))))
        self.svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" '
                        f'{svg_color(fill, "fill")} {svg_color(stroke, "stroke")} stroke-width="{sw}"/>')

    def ellipse(self, x, y, w, h, fill, stroke=None, sw=0):
        xy = tuple(v * SCALE for v in (x, y, x + w, y + h))
        self.draw(lambda d: d.ellipse(xy, fill=color(fill), outline=color(stroke), width=max(1, round(sw * SCALE))))
        self.svg.append(f'<ellipse cx="{x + w / 2}" cy="{y + h / 2}" rx="{w / 2}" ry="{h / 2}" '
                        f'{svg_color(fill, "fill")} {svg_color(stroke, "stroke")} stroke-width="{sw}"/>')

    def poly(self, points, fill, stroke=None, sw=0, closed=True):
        pts = [(round(x * SCALE), round(y * SCALE)) for x, y in points]
        def render(draw):
            if fill is not None:
                draw.polygon(pts, fill=color(fill))
            if stroke:
                draw.line(pts + [pts[0]] if closed else pts, fill=color(stroke), width=max(1, round(sw * SCALE)), joint="curve")
                for x, y in (pts if not closed else []):
                    r = sw * SCALE / 2
                    draw.ellipse((x - r, y - r, x + r, y + r), fill=color(stroke))
        self.draw(render)
        tag = "polygon" if closed else "polyline"
        coords = " ".join(f"{x:.2f},{y:.2f}" for x, y in points)
        self.svg.append(f'<{tag} points="{coords}" {svg_color(fill, "fill")} {svg_color(stroke, "stroke")} '
                        f'stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round"/>')

    def line(self, points, stroke, sw):
        self.poly(points, None, stroke, sw, False)

    def arc(self, cx, cy, rx, ry, start, end, stroke, sw):
        pts = [(cx + rx * math.cos(math.radians(start + (end - start) * i / 64)),
                cy + ry * math.sin(math.radians(start + (end - start) * i / 64))) for i in range(65)]
        self.line(pts, stroke, sw)

    def save(self, relative, features):
        png = ART / (relative + ".png")
        svg = SOURCE / (relative + ".svg")
        png.parent.mkdir(parents=True, exist_ok=True)
        svg.parent.mkdir(parents=True, exist_ok=True)
        buffer = io.BytesIO()
        self.image.resize((self.width, self.height), Image.Resampling.LANCZOS).save(buffer, format="PNG", optimize=True)
        write_if_changed(png, buffer.getvalue())
        header = f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.width}" height="{self.height}" viewBox="0 0 {self.width} {self.height}">'
        title = '<title>' + escape("DeskRescue original " + relative) + '</title>'
        write_if_changed(svg, (header + "\n" + title + "\n" + "\n".join(self.svg) + "\n</svg>\n").encode("utf-8"))
        MANIFEST.append({"key": relative, "path": png.relative_to(ROOT).as_posix(),
                         "source": svg.relative_to(ROOT).as_posix(), "width": self.width, "height": self.height,
                         "bytes": png.stat().st_size, "sha256": hashlib.sha256(png.read_bytes()).hexdigest(),
                         "features": features, "origin": "Original procedural geometry; no downloaded material"})


def bezier(start, c1, c2, end, steps=24):
    return [tuple((1 - t) ** 3 * start[j] + 3 * (1 - t) ** 2 * t * c1[j]
                  + 3 * (1 - t) * t * t * c2[j] + t ** 3 * end[j] for j in (0, 1))
            for t in [i / steps for i in range(steps + 1)]]


def mouse(c):
    c.ellipse(111, 219, 166, 25, (82, 103, 121, 34))
    outline = bezier((192, 17), (122, 17), (100, 78), (106, 145))
    outline += bezier((106, 145), (112, 214), (147, 239), (192, 239))
    outline += bezier((192, 239), (244, 239), (277, 207), (279, 142))
    outline += bezier((279, 142), (282, 75), (258, 17), (192, 17))
    c.poly(outline, TEAL, INK, 7)
    c.arc(193, 126, 77, 99, 207, 329, "#7DD5C9", 10)
    c.line([(192, 22), (192, 107)], INK, 5)
    c.line([(113, 107), (272, 107)], "#238988", 4)
    c.rect(176, 57, 32, 58, INK, 14)
    c.rect(184, 63, 16, 37, CREAM, 8)
    c.line([(187, 73), (197, 73)], "#90AAA9", 2)
    c.line([(187, 83), (197, 83)], "#90AAA9", 2)
    c.ellipse(180, 189, 24, 9, "#91DAD0")


def keyboard(c, clean=False):
    w, h = c.width, c.height
    sx, sy = w / 384, h / (195 if clean else 256)
    offset_y = 30 if clean else 0
    def r(x, y, width, height, fill, rad=0, stroke=None, sw=0):
        c.rect(x * sx, (y - offset_y) * sy, width * sx, height * sy, fill, rad * min(sx, sy), stroke, sw * min(sx, sy))
    r(20, 61, 344, 165, (82, 103, 121, 34), 22)
    r(16, 43, 352, 169, INK, 22)
    r(20, 42, 344, 155, TEAL, 18)
    r(28, 51, 328, 139, "#BCE4DB", 12)
    rows = ((69, 11), (99, 11), (129, 10))
    for row, (y, count) in enumerate(rows):
        for col in range(count):
            x = 38 + col * 28 + (5 if row == 2 else 0)
            key_color = "#FFE2A6" if (row == 0 and col == 0) else CREAM
            r(x, y + 4, 23, 24, "#7FB7B1", 5)
            r(x, y, 23, 23, key_color, 5)
            r(x + 5, y + 5, 10, 2, "#FFFFFF", 1)
    for x, wid, col in [(38, 40, CREAM), (84, 40, CREAM), (130, 130, "#FFFFFF"), (266, 36, CREAM), (308, 38, GOLD)]:
        r(x, 161, wid, 20, "#7FB7B1", 5)
        r(x, 157, wid, 20, col, 5)
    for x in (310, 326, 342):
        c.ellipse(x * sx, (56 - offset_y) * sy, 5 * sx, 5 * sy, "#49B989")


def headset(c):
    c.ellipse(73, 218, 240, 23, (82, 103, 121, 30))
    c.arc(192, 129, 111, 105, 180, 360, INK, 30)
    c.arc(192, 129, 109, 103, 192, 348, "#F0C580", 19)
    c.arc(192, 129, 92, 85, 205, 335, "#FFDFAB", 8)
    c.line([(81, 120), (81, 183)], INK, 16)
    c.line([(303, 120), (303, 183)], INK, 16)
    for x in (67, 263):
        c.rect(x, 116, 54, 104, INK, 23)
        c.rect(x + 3, 120, 43, 90, TEAL, 19)
        c.rect(x + 12, 128, 17, 74, "#72CABD", 8)
    c.arc(268, 191, 26, 30, 0, 90, INK, 9)
    c.line([(268, 221), (223, 221)], INK, 9)
    c.rect(207, 210, 38, 18, "#E7B360", 9, INK, 3)


def port(c, kind, is_head):
    # Neutral shells preserve legibility while runtime line/halo shows CableStyle.
    if is_head:
        c.line([(8, 66), (67, 66)], "#68838C", 16)
        c.line([(8, 61), (60, 61)], "#A9C0C3", 4)
        c.rect(48, 43, 32, 46, "#526B78", 7)
        for x in (56, 64, 72):
            c.line([(x, 47), (x, 85)], "#94AFB5", 2)
    else:
        c.rect(29, 11, 197, 108, "#C3D8D6", 19, INK, 4)
        for x in (40, 212):
            c.ellipse(x, 58, 7, 7, "#6D8990")
    if kind == "power":
        outline = [(86, 24), (167, 24), (193, 47), (193, 106), (67, 106), (67, 47)]
        c.poly(outline, "#E6ECE7" if is_head else INK, INK if is_head else "#708D93", 5)
        if not is_head:
            c.poly([(92, 35), (160, 35), (180, 53), (180, 96), (80, 96), (80, 53)], "#405765")
        for x, y in [(104, 69), (143, 69), (124, 43)]:
            c.rect(x, y, 13, 23, "#C8B78B" if is_head else "#182F40", 3)
    elif kind == "display":
        c.poly([(65, 32), (195, 32), (195, 76), (174, 99), (86, 99), (65, 76)],
               "#D2E0E1" if is_head else INK, INK, 5)
        c.poly([(78, 45), (182, 45), (182, 72), (167, 85), (93, 85), (78, 72)],
               "#557481" if is_head else "#0F2C40", None)
        for i in range(10):
            c.rect(87 + i * 9, 53, 4, 14, GOLD if is_head else "#A8C8C1", 1)
    elif kind == "network":
        c.rect(72, 24, 118, 84, "#C4DED8" if is_head else INK, 10, INK, 4)
        c.rect(84, 34, 94, 53, "#E2F1E9" if is_head else "#405C64", 4)
        c.rect(108, 81, 47, 19, "#8CB3AD" if is_head else "#405C64", 3)
        for i in range(8):
            c.rect(91 + i * 10, 37, 5, 24, "#D8AE58" if is_head else "#AEC2B6", 1)
        if is_head:
            c.poly([(108, 21), (155, 21), (150, 6), (113, 6)], "#DEEDE2", INK, 3)


def dust(c):
    rng = random.Random(51014)
    # Feathered overlapping translucent motes; no solid rectangular tile.
    for _ in range(13):
        x, y = rng.uniform(25, 170), rng.uniform(25, 170)
        radius = rng.uniform(16, 35)
        for band in range(5, 0, -1):
            rr = radius * (0.56 + band * 0.13)
            c.ellipse(x - rr, y - rr, rr * 2, rr * 2, (132, 117, 90, 10 + (5 - band) * 3))
    for _ in range(125):
        x, y = rng.uniform(11, 181), rng.uniform(11, 181)
        edge = min(x, y, 192 - x, 192 - y) / 40
        radius = rng.uniform(0.7, 3.2)
        c.ellipse(x - radius, y - radius, radius * 2, radius * 2,
                  (111, 101, 82, int(rng.uniform(45, 125) * min(1, edge))))
    for pts in [[(40, 70), (52, 66), (58, 72)], [(128, 131), (136, 125), (145, 132)]]:
        c.line(pts, (152, 127, 87, 92), 2)


def ui(kind):
    c = Canvas(192, 128) if kind in ("card", "button") else Canvas(128, 128)
    if kind in ("card", "button"):
        c.rect(8, 14, 176, 107, (82, 103, 121, 30), 24)
        c.rect(8, 5, 176, 107, "#FFFFFF" if kind == "card" else TEAL, 24)
        c.line([(34, 13), (155, 13)], "#FFFFFF" if kind == "card" else "#77D0C5", 3)
    elif kind == "check":
        c.ellipse(12, 12, 104, 104, "#49B989")
        c.line([(35, 65), (56, 85), (93, 44)], "#FFFFFF", 10)
    elif kind in ("star", "star-empty"):
        pts = [(64 + (52 if i % 2 == 0 else 25) * math.cos(math.radians(-90 + 36 * i)),
                65 + (52 if i % 2 == 0 else 25) * math.sin(math.radians(-90 + 36 * i))) for i in range(10)]
        if kind == "star":
            c.poly([(x, y + 5) for x, y in pts], "#DDA247")
            c.poly(pts, GOLD, "#E5A340", 3)
            c.line([(64, 27), (57, 45), (37, 49)], "#FFE8A9", 5)
        else:
            c.poly(pts, None, "#ADCBC7", 6)
    else:
        c.rect(20, 45, 27, 39, TEAL, 6)
        c.poly([(42, 47), (71, 27), (71, 102), (42, 82)], TEAL)
        if kind == "sound-on":
            c.arc(70, 64, 21, 28, -55, 55, INK, 6)
            c.arc(70, 64, 37, 44, -55, 55, INK, 6)
        else:
            c.line([(87, 48), (110, 81)], "#E57A78", 7)
            c.line([(110, 48), (87, 81)], "#E57A78", 7)
    c.save("ui/" + kind, ["Original rounded UI primitive", "No text baked into image"])


SOUNDS = {
    "ui_click": (0.09, [(0.0, 0.075, 740, 0.36)]),
    "snap_success": (0.20, [(0.0, 0.13, 659.25, 0.30), (0.06, 0.13, 987.77, 0.30)]),
    "mistake": (0.17, [(0.0, 0.10, 220, 0.27), (0.065, 0.10, 174.61, 0.25)]),
    "clean_progress": (0.10, [(0.0, 0.09, 1046.5, 0.14)]),
    "stage_complete": (0.31, [(0.0, 0.15, 523.25, 0.27), (0.09, 0.15, 659.25, 0.26), (0.18, 0.12, 783.99, 0.24)]),
    "order_complete": (0.47, [(0.0, 0.20, 523.25, 0.26), (0.10, 0.20, 659.25, 0.25), (0.22, 0.24, 1046.5, 0.26)]),
    "run_complete": (0.60, [(0.0, 0.20, 523.25, 0.23), (0.11, 0.20, 659.25, 0.22), (0.22, 0.24, 783.99, 0.23), (0.34, 0.25, 1046.5, 0.24)]),
}


def audio():
    directory = ROOT / "assets/audio/sfx"
    directory.mkdir(parents=True, exist_ok=True)
    rate = 22050
    for key, (duration, notes) in SOUNDS.items():
        samples = []
        for i in range(round(duration * rate)):
            time = i / rate
            value = 0.0
            for start, length, frequency, gain in notes:
                t = time - start
                if 0 <= t < length:
                    attack = min(1.0, t / 0.007)
                    release = min(1.0, (length - t) / 0.025)
                    env = attack * release * math.exp(-3.3 * t / length)
                    value += gain * env * (math.sin(2 * math.pi * frequency * t)
                             + 0.18 * math.sin(4 * math.pi * frequency * t))
            samples.append(round(max(-0.7, min(0.7, value)) * 32767))
        path = directory / (key + ".wav")
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as file:
            file.setnchannels(1)
            file.setsampwidth(2)
            file.setframerate(rate)
            file.writeframes(struct.pack("<" + "h" * len(samples), *samples))
        write_if_changed(path, buffer.getvalue())
        MANIFEST.append({"key": key, "path": path.relative_to(ROOT).as_posix(), "source": "tools/art/generate_day5a.py:SOUNDS",
                         "durationSeconds": len(samples) / rate, "sampleRate": rate, "channels": 1,
                         "peakAmplitude": round(max(abs(v) for v in samples) / 32767, 5),
                         "bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                         "origin": "Original sine/harmonic synthesis; no samples or external recordings"})


def generate_slice():
    for key, draw, features in [
        ("mouse", mouse, ["Egg-shaped shell", "Split buttons", "Notched scroll wheel"]),
        ("keyboard", keyboard, ["Wide rounded shell", "Three rows of keycaps", "Space bar and indicator lights"]),
        ("headset", headset, ["Padded arched headband", "Two earcups", "Microphone boom"]),
    ]:
        c = Canvas(384, 256)
        draw(c)
        c.save("devices/" + key, features)
    for key in ("power", "display", "network"):
        for role in ("head", "port"):
            c = Canvas(256, 128)
            port(c, key, role == "head")
            c.save(f"ports/{key}-{role}", [key + " connector shape", role + " shell", "Pins or socket aperture"])
    c = Canvas(1040, 520)
    keyboard(c, True)
    c.save("workbench/keyboard-clean", ["Clean keyboard base", "Individual keycaps", "No dirt baked into image"])
    c = Canvas(192, 192)
    dust(c)
    c.save("dirt/dust", ["Irregular transparent powder", "Feathered clumps", "Seeded speckles"])
    for key in ("card", "button", "check", "star", "star-empty", "sound-on", "sound-off"):
        ui(key)
    audio()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--phase", choices=["slice", "full"], default="slice")
    args = parser.parse_args()
    generate_slice()
    if args.phase == "full":
        from full_geometry import generate_full
        generate_full(Canvas, mouse, keyboard, headset)
    report = {"schemaVersion": 1, "phase": args.phase, "generator": "tools/art/generate_day5a.py",
              "method": "Shared original vector primitives -> SVG source and native Pillow 3x antialiased PNG; wave PCM synthesis",
              "licensing": "Original project material created for DeskRescue; no third-party art/audio or brand logos",
              "runtimeAssets": MANIFEST, "runtimeAssetCount": len(MANIFEST),
              "runtimeBytes": sum(item["bytes"] for item in MANIFEST)}
    write_if_changed(ROOT / "tools/art/asset-sources.json", (json.dumps(report, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    print(json.dumps({"phase": args.phase, "assets": len(MANIFEST), "bytes": report["runtimeBytes"]}))


if __name__ == "__main__":
    main()
