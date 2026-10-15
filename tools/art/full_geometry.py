"""Original Day 5A full-phase shapes. No images, fonts, logos or network sources."""

import math

INK = "#263D50"
TEAL = "#2EAAA8"
CREAM = "#F8F3E9"
GOLD = "#FFBE58"
SHADOW = (82, 103, 121, 34)


def curve(start, first, second, end, steps=20):
    return [tuple((1 - t) ** 3 * start[j] + 3 * (1 - t) ** 2 * t * first[j]
                  + 3 * (1 - t) * t * t * second[j] + t ** 3 * end[j] for j in (0, 1))
            for t in [i / steps for i in range(steps + 1)]]


class View:
    """Affine drawing view over shared Canvas primitives; works for SVG and PNG."""
    def __init__(self, canvas, x, y, width, height, source_width=384, source_height=256):
        self.canvas, self.x, self.y = canvas, x, y
        self.sx, self.sy = width / source_width, height / source_height
        self.width, self.height = source_width, source_height
        self.s = min(self.sx, self.sy)

    def rect(self, x, y, w, h, fill, radius=0, stroke=None, sw=0):
        self.canvas.rect(self.x + x * self.sx, self.y + y * self.sy, w * self.sx, h * self.sy,
                         fill, radius * self.s, stroke, sw * self.s)

    def ellipse(self, x, y, w, h, fill, stroke=None, sw=0):
        self.canvas.ellipse(self.x + x * self.sx, self.y + y * self.sy, w * self.sx, h * self.sy,
                            fill, stroke, sw * self.s)

    def poly(self, points, fill, stroke=None, sw=0, closed=True):
        self.canvas.poly([(self.x + x * self.sx, self.y + y * self.sy) for x, y in points],
                         fill, stroke, sw * self.s, closed)

    def line(self, points, stroke, sw):
        self.poly(points, None, stroke, sw, False)

    def arc(self, cx, cy, rx, ry, start, end, stroke, sw):
        self.canvas.arc(self.x + cx * self.sx, self.y + cy * self.sy, rx * self.sx, ry * self.sy,
                        start, end, stroke, sw * self.s)


def power(c):
    c.ellipse(77, 211, 220, 25, SHADOW)
    c.arc(240, 135, 94, 85, -42, 167, INK, 15)
    c.arc(240, 135, 94, 85, -42, 167, "#89B2B3", 7)
    c.line([(148, 153), (116, 125), (103, 100)], INK, 17)
    c.rect(51, 64, 94, 90, TEAL, 20, INK, 6)
    c.line([(67, 76), (122, 76)], "#8BD8CB", 7)
    for x in (69, 111):
        c.rect(x, 26, 12, 43, "#DDC894", 4, INK, 3)
        c.ellipse(x + 3, 35, 6, 6, "#8E9C94")
    c.rect(72, 151, 55, 33, INK, 9)
    for y in (157, 166, 175):
        c.line([(80, y), (119, y)], "#718E93", 3)


def network(c):
    c.ellipse(67, 211, 248, 22, SHADOW)
    c.arc(244, 158, 80, 63, -95, 193, TEAL, 18)
    c.arc(244, 158, 80, 63, -95, 193, "#81CFC3", 5)
    c.line([(165, 144), (128, 144)], TEAL, 18)
    c.rect(89, 103, 89, 59, INK, 10)
    c.poly([(47, 63), (152, 63), (152, 128), (58, 128), (47, 115)], "#C8E4DB", INK, 5)
    c.rect(56, 69, 86, 33, "#E8F3E8", 4)
    for i in range(8):
        c.rect(62 + i * 10, 72, 6, 42, "#D2AC62", 1)
    c.poly([(75, 60), (118, 60), (124, 43), (88, 43)], "#E7EDE1", INK, 3)
    for x in (100, 114, 128, 142, 156):
        c.line([(x, 112), (x, 152)], "#66828A", 3)


def usb(c):
    c.ellipse(64, 210, 247, 24, SHADOW)
    c.arc(247, 158, 74, 66, -93, 198, INK, 16)
    c.arc(247, 158, 74, 66, -93, 198, "#7FA9AC", 6)
    c.line([(173, 138), (141, 117)], INK, 16)
    c.rect(83, 79, 107, 70, TEAL, 14, INK, 5)
    c.rect(37, 85, 68, 57, "#D7E2DC", 5, INK, 4)
    c.rect(43, 91, 52, 15, "#FFFFFF", 3)
    for x in (49, 73):
        c.rect(x, 116, 11, 13, "#526B78", 2)
    c.line([(126, 97), (147, 97), (157, 109)], "#9DDED2", 5)
    for x in (155, 165, 175):
        c.line([(x, 117), (x, 140)], "#238887", 3)


def router(c):
    c.ellipse(38, 216, 310, 25, SHADOW)
    for points in [[(65, 145), (45, 29)], [(309, 145), (330, 29)]]:
        c.line(points, INK, 17)
        c.line(points, "#91C3BB", 9)
    c.poly([(39, 128), (301, 128), (350, 164), (70, 164)], "#D9E9DD", INK, 5)
    c.rect(39, 148, 312, 64, INK, 15)
    c.rect(41, 146, 309, 49, TEAL, 13)
    for x in (78, 100, 122, 144):
        c.ellipse(x, 167, 10, 10, "#B5EDD3" if x != 144 else GOLD)
    for x in range(235, 314, 13):
        c.line([(x, 163), (x, 181)], "#D5ECE5", 3)
    c.line([(82, 140), (270, 140)], "#FFFFFF", 4)


def controller(c):
    c.ellipse(36, 212, 312, 25, SHADOW)
    outline = [(91, 72), (128, 67), (151, 82), (233, 82), (257, 67), (296, 72),
               (319, 100), (350, 179), (342, 209), (319, 221), (295, 216),
               (259, 170), (125, 170), (88, 216), (64, 221), (42, 208), (35, 178), (68, 98)]
    c.poly(outline, TEAL, INK, 6)
    c.line([(87, 84), (115, 79), (133, 90)], "#9ADACE", 6)
    c.rect(82, 97, 19, 57, INK, 4)
    c.rect(63, 116, 57, 19, INK, 4)
    for x, y, shade in ((277, 94, GOLD), (298, 116, "#E57A78"), (255, 116, "#82D2D4"), (277, 137, "#B5D86D")):
        c.ellipse(x - 9, y - 9, 18, 18, shade, INK, 2)
    for x in (138, 220):
        c.ellipse(x - 21, 130, 42, 42, INK)
        c.ellipse(x - 13, 138, 26, 26, "#7ABBB4", "#D0E6DC", 2)
    c.rect(177, 110, 31, 9, CREAM, 4)


def speaker(c):
    c.ellipse(114, 225, 162, 21, SHADOW)
    c.rect(110, 22, 159, 208, INK, 24)
    c.rect(109, 20, 148, 199, "#D7B78B", 22, INK, 5)
    c.rect(122, 33, 122, 175, "#344F5C", 14)
    for x, y, size in ((154, 48, 58), (134, 112, 98)):
        c.ellipse(x, y, size, size, "#9FBAB5", INK, 5)
        c.ellipse(x + size * 0.17, y + size * 0.17, size * 0.66, size * 0.66, "#4B7580", INK, 3)
        c.ellipse(x + size * 0.36, y + size * 0.36, size * 0.28, size * 0.28, TEAL)
    c.line([(116, 46), (116, 195)], "#FFE1AE", 4)


def battery(c):
    c.ellipse(55, 173, 281, 25, SHADOW)
    c.rect(301, 103, 35, 47, "#D1D9CB", 8, INK, 4)
    c.rect(47, 71, 263, 106, GOLD, 25, INK, 6)
    c.rect(49, 73, 76, 102, TEAL, 22)
    c.line([(72, 83), (287, 83)], "#FFE1A1", 7)
    c.line([(70, 125), (96, 125)], CREAM, 5)
    c.line([(280, 115), (280, 139)], INK, 5)
    c.line([(268, 127), (292, 127)], INK, 5)
    c.line([(148, 153), (243, 153)], "#DF9F40", 3)


def wheel(c):
    c.ellipse(96, 209, 204, 24, SHADOW)
    c.line([(56, 129), (332, 129)], "#BBCDC7", 16)
    c.rect(111, 52, 162, 153, INK, 44)
    c.ellipse(99, 49, 62, 160, "#416473", INK, 5)
    c.ellipse(226, 49, 62, 160, TEAL, INK, 5)
    for x in range(145, 228, 14):
        c.line([(x, 64), (x, 193)], "#7EACA9", 6)
    c.ellipse(242, 95, 31, 66, "#C3E6DA", INK, 4)
    c.ellipse(249, 112, 17, 31, "#708D90")


def microphone(c):
    c.ellipse(111, 221, 170, 22, SHADOW)
    c.rect(139, 23, 109, 131, INK, 44)
    c.rect(145, 29, 97, 116, TEAL, 38)
    for y in range(46, 115, 13):
        c.line([(157, y), (230, y)], "#214C5C", 5)
    c.arc(193, 107, 76, 69, 0, 180, INK, 10)
    c.line([(117, 91), (117, 110)], INK, 10)
    c.line([(269, 91), (269, 110)], INK, 10)
    c.line([(193, 175), (193, 220)], INK, 11)
    c.rect(129, 213, 129, 20, "#D8B37A", 10, INK, 3)
    c.rect(171, 122, 45, 11, "#8DD8CA", 5)


def camera(c):
    c.ellipse(93, 213, 204, 23, SHADOW)
    c.rect(164, 146, 61, 40, "#879E9F", 9, INK, 4)
    c.poly([(131, 175), (256, 175), (271, 211), (116, 211)], "#D0DDD3", INK, 5)
    c.rect(56, 62, 270, 98, INK, 33)
    c.rect(62, 59, 258, 86, TEAL, 29)
    c.line([(90, 70), (277, 70)], "#91D7CB", 5)
    c.ellipse(149, 64, 94, 84, "#C2DED8", INK, 4)
    c.ellipse(163, 78, 66, 57, "#315365", INK, 4)
    c.ellipse(183, 88, 33, 33, "#5D8C99")
    c.ellipse(189, 90, 13, 13, "#B5D8D9")
    c.ellipse(86, 98, 12, 12, "#B3EDD2")
    for x in (278, 286, 294):
        c.line([(x, 101), (x, 116)], "#0E797B", 3)


def light(c):
    c.ellipse(105, 223, 184, 21, SHADOW)
    c.line([(192, 151), (192, 212)], INK, 9)
    c.line([(192, 199), (128, 229)], INK, 7)
    c.line([(192, 199), (256, 229)], INK, 7)
    c.line([(192, 199), (192, 239)], INK, 7)
    c.ellipse(104, 13, 175, 175, INK)
    c.ellipse(112, 21, 159, 159, GOLD)
    c.ellipse(137, 46, 109, 109, CREAM, "#E8A750", 4)
    for angle in range(0, 360, 30):
        x, y = 192 + 68 * math.cos(math.radians(angle)), 101 + 68 * math.sin(math.radians(angle))
        c.ellipse(x - 4, y - 4, 8, 8, "#FFF0BF")
    c.rect(168, 105, 48, 34, TEAL, 5, INK, 3)


def soundcard(c):
    c.ellipse(40, 199, 309, 25, SHADOW)
    c.rect(36, 68, 312, 133, INK, 19)
    c.rect(36, 58, 312, 117, TEAL, 17, INK, 5)
    c.line([(61, 69), (319, 69)], "#96DBCD", 5)
    c.ellipse(192, 85, 74, 74, INK, "#9DD6CD", 3)
    c.ellipse(204, 97, 49, 49, "#6F999C")
    c.line([(229, 107), (229, 124)], GOLD, 5)
    for x in (76, 128, 298):
        c.ellipse(x - 15, 97, 30, 30, "#D8E5D8", INK, 3)
        c.ellipse(x - 7, 105, 14, 14, "#344D60")
    for x in (67, 119, 289):
        c.rect(x, 140, 18, 5, "#C0E5D9", 2)
    for x in (73, 106, 139):
        c.ellipse(x, 180, 12, 12, "#E3C181", "#526879", 2)


def fan_blades(c, cx, cy, radius):
    c.ellipse(cx - radius, cy - radius, radius * 2, radius * 2, "#3E6471", INK, 4)
    for n in range(7):
        angle = math.radians(n * 360 / 7)
        raw = curve((8, -5), (21, -24), (30, -51), (55, -38))
        raw += curve((55, -38), (69, -26), (77, -4), (67, 13))
        raw += curve((67, 13), (53, 27), (22, 24), (12, 16))
        raw += curve((12, 16), (9, 10), (7, 1), (8, -5))
        raw = [(x * radius / 83, y * radius / 83) for x, y in raw]
        pts = [(cx + x * math.cos(angle) - y * math.sin(angle),
                cy + x * math.sin(angle) + y * math.cos(angle)) for x, y in raw]
        c.poly(pts, "#8BCFC3", "#29505F", 2)
    c.ellipse(cx - 19, cy - 19, 38, 38, TEAL, INK, 4)
    c.ellipse(cx - 7, cy - 9, 13, 13, "#BFE8D9")


def fan(c):
    c.ellipse(86, 225, 212, 18, SHADOW)
    c.rect(88, 17, 211, 213, "#D1E5D8", 20, INK, 6)
    fan_blades(c, 194, 123, 83)
    for x, y in ((100, 29), (279, 29), (100, 210), (279, 210)):
        c.ellipse(x, y, 10, 10, "#597F87", INK, 2)


def memory(c):
    c.ellipse(23, 183, 338, 23, SHADOW)
    c.rect(23, 70, 338, 107, "#52A283", 7, INK, 5)
    c.rect(30, 156, 323, 26, "#C79F54", 0, INK, 2)
    for x in range(38, 346, 12):
        c.rect(x, 157, 7, 24, "#FFE1A0")
    c.rect(173, 164, 14, 20, CREAM)
    for x in (42, 104, 211, 273):
        c.rect(x, 86, 47, 58, INK, 5)
        c.line([(x + 8, 96), (x + 35, 96)], "#708E94", 3)
        for y in (91, 108, 125, 140):
            c.rect(x - 4, y, 4, 5, "#C9DCD1")
            c.rect(x + 47, y, 4, 5, "#C9DCD1")
    c.line([(142, 84), (194, 84), (194, 147)], "#AAE1BE", 3)
    c.rect(157, 117, 31, 21, "#D5E8D5", 3)


def drive(c):
    c.ellipse(68, 217, 260, 22, SHADOW)
    c.rect(67, 39, 251, 185, INK, 18)
    c.rect(65, 31, 251, 181, "#D5DED7", 17, INK, 5)
    c.rect(81, 47, 219, 147, "#6C9498", 12)
    c.rect(104, 64, 173, 90, CREAM, 8)
    c.line([(121, 86), (246, 86)], "#A6C8C3", 6)
    c.line([(121, 103), (202, 103)], "#C6DED4", 6)
    c.ellipse(123, 126, 16, 16, TEAL)
    for x in (108, 140, 173, 206, 239, 272):
        c.rect(x, 181, 19, 19, "#D3A654", 2)
    for x, y in ((73, 39), (301, 39), (73, 195), (301, 195)):
        c.ellipse(x, y, 8, 8, INK)


def gpu(c):
    c.ellipse(22, 206, 346, 25, SHADOW)
    c.rect(37, 71, 318, 131, "#477C70", 9, INK, 4)
    c.rect(37, 68, 318, 115, "#B2D8CA", 13, INK, 5)
    fan_blades(c, 124, 125, 49)
    fan_blades(c, 268, 125, 49)
    c.rect(15, 51, 20, 162, "#C5D5CD", 5, INK, 3)
    c.rect(11, 47, 45, 12, "#C5D5CD", 4, INK, 3)
    for y in (86, 118, 150):
        c.rect(18, y, 12, 21, "#4D7280", 3)
    for x in range(78, 230, 13):
        c.rect(x, 193, 8, 21, "#D7AF65", 1)
    c.line([(195, 85), (195, 165)], TEAL, 5)
    c.rect(285, 61, 43, 10, INK, 3)


DEVICE_DRAWINGS = {
    "power": (power, ["Two-pin electrical plug", "Looped flexible cable", "Ribbed strain relief"]),
    "network": (network, ["Clear RJ45 rectangular plug", "Eight gold contacts", "Raised latch and cable"]),
    "usb": (usb, ["USB-A metal tongue", "Two locking holes", "Moulded shell and looped cable"]),
    "router": (router, ["Twin raised antennas", "Low router enclosure", "Status lights and vent slots"]),
    "controller": (controller, ["Two hand grips", "Twin analog sticks", "Cross pad and four face buttons"]),
    "speaker": (speaker, ["Tall wooden enclosure", "Two concentric speaker drivers", "Inset dark front grille"]),
    "battery": (battery, ["Rounded cylindrical cell", "Raised positive terminal", "Positive polarity symbol"]),
    "wheel": (wheel, ["Ribbed rubber cylinder", "Metal axle", "Circular side hub"]),
    "microphone": (microphone, ["Capsule microphone grille", "U-shaped suspension", "Desktop stand"]),
    "camera": (camera, ["Wide webcam body", "Large lens with highlight", "Monitor mounting clip"]),
    "light": (light, ["Circular light ring", "Visible LED segments", "Tripod support"]),
    "soundcard": (soundcard, ["Audio interface box", "Large gain knob", "Three circular input sockets"]),
    "fan": (fan, ["Square frame and four screw holes", "Seven curved blades", "Central bearing"]),
    "memory": (memory, ["Long green memory PCB", "Four rectangular chips", "Gold fingers and keyed notch"]),
    "drive": (drive, ["Flat SSD enclosure", "Inset label area", "Gold connector and mounting screws"]),
    "gpu": (gpu, ["Long graphics board", "Twin cooling fans", "Side bracket and gold edge connector"]),
}


def extra_port(c, kind, is_head):
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
    shell, aperture, contacts = ("#D8E4DE", "#557481", GOLD) if is_head else (INK, "#173341", "#AACDC0")
    if kind == "audio":
        if is_head:
            c.rect(66, 42, 71, 49, TEAL, 11, INK, 4)
            c.rect(135, 52, 78, 27, "#D9BB75", 5, INK, 3)
            for x in (158, 179):
                c.line([(x, 53), (x, 78)], INK, 5)
            c.poly([(208, 52), (225, 62), (225, 69), (208, 79)], "#DDC891", INK, 3)
        else:
            c.ellipse(75, 20, 105, 105, "#99B4AB", INK, 5)
            c.ellipse(94, 39, 67, 67, "#DAC697", INK, 4)
            c.ellipse(109, 53, 37, 37, aperture)
    elif kind == "usb":
        c.rect(67, 33, 128, 67, shell, 7, INK, 4)
        c.rect(79, 44, 104, 43, aperture, 4)
        if is_head:
            for x in (91, 146):
                c.rect(x, 48, 20, 14, "#B2C8C2", 3)
        else:
            c.rect(87, 67, 88, 12, "#CEDDD2", 2)
        for x in (99, 118, 137, 156):
            c.rect(x, 72, 9, 10, contacts, 1)
    elif kind in ("motherboard", "cpu", "fan"):
        columns, rows = {"motherboard": (12, 2), "cpu": (4, 2), "fan": (4, 1)}[kind]
        width = 154 if kind == "motherboard" else 106
        height = 69 if rows == 2 else 46
        left, top = 130 - width / 2, 68 - height / 2
        c.rect(left, top, width, height, shell, 7, INK, 4)
        cell = (width - 16) / columns
        for row in range(rows):
            for col in range(columns):
                x = left + 8 + cell * col
                y = top + 9 + row * 25
                c.rect(x, y, cell - 3, 18, aperture, 2)
                if is_head:
                    c.rect(x + (cell - 6) / 2, y + 4, 3, 10, contacts, 1)
        c.rect(109, top - 12, 43, 13, "#9CBAB0" if is_head else INK, 3, INK, 2)
        if kind == "fan":
            c.line([(72, 92), (193, 92)], "#8FADA9", 3)
    elif kind == "sata":
        c.rect(65, 35, 139, 63, shell, 7, INK, 4)
        # L-shaped key is distinguishable from USB and the two-row power plugs.
        c.poly([(77, 46), (188, 46), (188, 79), (170, 79), (170, 64), (77, 64)], aperture, INK, 2)
        for x in range(85, 155, 10):
            c.rect(x, 50, 4, 10, contacts, 1)
        c.line([(76, 87), (191, 87)], "#91B6AD", 3)
    else:
        raise ValueError("Unknown connector geometry: " + kind)


def mouse_clean(c):
    # Broad top view fills the original 300x260 cleaning area; no dirt baked in.
    c.ellipse(97, 526, 479, 33, SHADOW)
    points = curve((332, 22), (192, 22), (78, 109), (78, 260))
    points += curve((78, 260), (75, 427), (142, 549), (331, 549))
    points += curve((331, 549), (526, 549), (590, 429), (587, 263))
    points += curve((587, 263), (587, 108), (477, 22), (332, 22))
    c.poly(points, TEAL, INK, 10)
    c.line([(133, 155), (113, 235), (118, 338)], "#8CDACA", 17)
    c.line([(331, 34), (331, 245)], INK, 7)
    c.line([(94, 242), (570, 242)], "#258987", 7)
    c.rect(300, 112, 62, 133, INK, 27)
    c.rect(313, 124, 36, 83, CREAM, 16)
    for y in (141, 163, 185):
        c.line([(320, y), (342, y)], "#9CB8B2", 3)
    c.ellipse(309, 437, 44, 15, "#A0DED0")


def case_clean(c):
    c.rect(18, 25, 948, 704, SHADOW, 48)
    c.rect(18, 13, 948, 704, "#90B9B0", 48, INK, 11)
    c.rect(42, 37, 900, 656, "#DBE6D9", 31, INK, 6)
    c.rect(65, 61, 537, 608, "#688C91", 27, INK, 6)
    # The large fan remains readable underneath the transparent dust layer.
    view = View(c, 79, 81, 504, 504, 256, 256)
    fan_blades(view, 128, 128, 113)
    c.rect(623, 74, 287, 477, "#83B499", 16, INK, 5)
    c.rect(650, 104, 142, 138, INK, 14)
    c.rect(668, 122, 107, 103, "#91B6AC", 10)
    for x in (817, 847, 877):
        c.rect(x, 105, 15, 269, "#D7DBA7", 4, INK, 2)
    for y in (298, 362, 426):
        c.rect(650, y, 144, 39, "#477673", 7, INK, 3)
    c.rect(637, 578, 267, 87, "#496D77", 11, INK, 5)
    for x in range(657, 885, 22):
        c.line([(x, 594), (x, 648)], "#AACDC3", 5)
    for x, y in ((50, 45), (918, 45), (50, 683), (918, 683)):
        c.ellipse(x - 6, y - 6, 12, 12, INK)
    c.line([(87, 633), (570, 633)], "#B0CCC1", 9)


def home_hero(c, keyboard, mouse, headset):
    c.rect(29, 65, 984, 538, SHADOW, 56)
    c.rect(25, 45, 984, 536, "#E9CDA7", 52, "#D9B78D", 6)
    c.line([(71, 72), (949, 72)], "#FAE5C8", 8)
    for y, start, end in ((133, 58, 321), (239, 693, 971), (517, 62, 356), (550, 616, 957)):
        c.line([(start, y), (end, y)], "#DFC096", 3)
    c.rect(80, 161, 844, 334, "#B4D9CC", 31, "#88BFB2", 5)
    c.rect(95, 176, 814, 304, CREAM, 25)
    keyboard(View(c, 113, 195, 621, 320))
    mouse(View(c, 611, 253, 302, 268))
    headset(View(c, 651, 49, 302, 201))
    # Two hand tools sit clearly outside the interactive-looking device area.
    c.line([(203, 104), (422, 104)], INK, 16)
    c.line([(330, 104), (427, 104)], "#C7D8CF", 10)
    c.rect(155, 78, 163, 51, TEAL, 20, INK, 4)
    for x in (178, 204, 230, 256):
        c.line([(x, 86), (x, 122)], "#91D4C5", 4)
    c.poly([(425, 97), (446, 98), (446, 110), (425, 111)], "#9CB4B0", INK, 3)
    c.line([(448, 515), (594, 515)], "#788F94", 14)
    c.rect(511, 490, 108, 48, GOLD, 20, INK, 4)
    c.poly([(441, 507), (422, 492), (408, 500), (417, 521), (434, 528)], "#C7D8CF", INK, 4)
    for x, y in ((134, 535), (182, 531), (895, 525)):
        c.ellipse(x, y, 18, 18, "#9BB2A9", INK, 2)
        c.line([(x + 4, y + 9), (x + 14, y + 9)], INK, 2)
    # Tiny calm repair sparkles add reward character without particle density.
    for x, y, size in ((567, 126, 12), (941, 313, 12), (73, 398, 9)):
        c.line([(x - size, y), (x + size, y)], "#F4B95B", 4)
        c.line([(x, y - size), (x, y + size)], "#F4B95B", 4)


def generate_full(Canvas, mouse, keyboard, headset):
    for key, (draw, features) in DEVICE_DRAWINGS.items():
        c = Canvas(384, 256)
        draw(c)
        c.save("devices/" + key, features)
    for key in ("audio", "usb", "motherboard", "cpu", "sata", "fan"):
        for role in ("head", "port"):
            c = Canvas(256, 128)
            extra_port(c, key, role == "head")
            c.save(f"ports/{key}-{role}", [key + " shaped connector", role + " shell", "Distinct socket or pin layout"])
    c = Canvas(664, 584)
    mouse_clean(c)
    c.save("workbench/mouse-clean", ["Wide clean mouse shell", "Button split and scroll wheel", "No dirt baked into base"])
    c = Canvas(984, 744)
    case_clean(c)
    c.save("workbench/case-clean", ["Open chassis repair panel", "Large visible fan blades", "Motherboard and vent grille, no baked dirt"])
    c = Canvas(1040, 640)
    home_hero(c, keyboard, mouse, headset)
    c.save("workbench/home-hero", ["Warm wood repair table and inset work mat", "Keyboard, mouse and headset silhouettes", "Screwdriver and spanner, no text or brand logos"])
