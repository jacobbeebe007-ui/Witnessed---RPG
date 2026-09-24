"""UI textures: 9-slice panels, item / element icons, cursors."""
from __future__ import annotations

import math

from PIL import Image, ImageDraw

from raster import Canvas, Ramp, hex_to_rgb


def panel(size=24, fill=(24, 18, 40), border=(200, 170, 90), inner=(90, 70, 120)) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, size - 1, size - 1], fill=fill + (235,))
    d.rectangle([1, 1, size - 2, size - 2], outline=border)
    d.rectangle([3, 3, size - 4, size - 4], outline=inner)
    # corner rivets
    for x, y in ((2, 2), (size - 3, 2), (2, size - 3), (size - 3, size - 3)):
        d.point((x, y), fill=(255, 230, 160))
    return img


def button(size=24, fill=(60, 40, 90), border=(200, 170, 90)) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=4, fill=fill + (255,), outline=border)
    d.line([3, 2, size - 4, 2], fill=tuple(min(255, c + 40) for c in fill))
    return img


def bar_bg(w=64, h=8) -> Image.Image:
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w - 1, h - 1], fill=(20, 14, 30, 255), outline=(120, 100, 140))
    return img


def cursor() -> Image.Image:
    c = Canvas(16, 16)
    Y = Ramp.from_color("#ffd86a")
    c.poly_s([(2, 8), (12, 2), (10, 8), (12, 14)], Y)
    return c.render()


def target_arrow() -> Image.Image:
    c = Canvas(16, 16)
    Y = Ramp.from_color("#ff5c5c")
    c.poly_s([(8, 14), (1, 3), (8, 7), (15, 3)], Y)
    return c.render()


ICONS = ["sword", "dagger", "bow", "staff", "axe", "mace", "armor_light", "armor_medium", "armor_heavy", "robe",
         "potion", "hi_potion", "ether", "elixir", "antidote", "phoenix", "gold", "star", "skull", "key", "gem", "map",
         "fire", "ice", "earth", "wind", "light", "dark", "physical", "heal", "shield", "ap", "hp", "mp", "break", "arrow_up"]


def icon(name: str) -> Image.Image:
    c = Canvas(16, 16)
    if name == "sword":
        c.poly_s([(3, 13), (11, 3), (13, 5), (5, 14)], Ramp.from_color("#dfe6f4"))
        c.line((3, 9), (7, 13), 1.6, (180, 140, 60))
    elif name == "dagger":
        c.poly_s([(5, 12), (11, 4), (12, 7), (7, 13)], Ramp.from_color("#c8ccd8"))
        c.line((5, 10), (8, 13), 1.4, (90, 60, 40))
    elif name == "bow":
        for k in range(8):
            a = -1.1 + k * 0.32
            c.circle(8 + math.cos(a) * 5, 8 + math.sin(a) * 5, 1.1, (140, 90, 40))
        c.line((3, 3), (3, 13), 0.7, (240, 230, 200))
    elif name == "staff":
        c.line((4, 14), (11, 3), 1.6, (140, 90, 40))
        c.circle(11.5, 3, 2.2, (120, 80, 255))
    elif name == "axe":
        c.line((4, 14), (11, 4), 1.6, (110, 70, 40))
        c.poly_s([(9, 2), (14, 3), (14, 8), (10, 8)], Ramp.from_color("#c8ccd8"))
    elif name == "mace":
        c.line((4, 14), (9, 7), 1.6, (90, 70, 50))
        c.ellipse_s(10.5, 5, 3.2, 3.2, Ramp.from_color("#b8bcc8"))
    elif name.startswith("armor"):
        col = {"armor_light": "#8a5a34", "armor_medium": "#8a90a0", "armor_heavy": "#b8bcc8"}[name]
        c.poly_s([(3, 3), (6, 2), (8, 4), (10, 2), (13, 3), (14, 8), (12, 8), (12, 14), (4, 14), (4, 8), (2, 8)], Ramp.from_color(col))
    elif name == "robe":
        c.poly_s([(4, 2), (12, 2), (14, 14), (2, 14)], Ramp.from_color("#6a4ab8"))
        c.rect(7, 4, 9, 14, (255, 207, 92))
    elif name in ("potion", "hi_potion", "ether", "elixir", "antidote", "phoenix"):
        col = {"potion": "#e8405a", "hi_potion": "#ff7a3a", "ether": "#4a7aff", "elixir": "#ffd86a", "antidote": "#5ad07a", "phoenix": "#ffb03a"}[name]
        c.rect_s(6, 1, 10, 4, Ramp.from_color("#c8a060"))
        c.poly_s([(6, 4), (10, 4), (13, 9), (13, 14), (3, 14), (3, 9)], Ramp.from_color("#d8e8ff"))
        c.poly_s([(4, 9), (12, 9), (12, 13), (4, 13)], Ramp.from_color(col), hi_w=0.6)
    elif name == "gold":
        c.ellipse_s(8, 8, 6, 6, Ramp.from_color("#ffd040"))
        c.rect(7, 5, 9, 11, (200, 140, 40))
    elif name == "star":
        pts = []
        for k in range(10):
            a = -math.pi / 2 + k * math.pi / 5
            r = 7 if k % 2 == 0 else 3
            pts.append((8 + math.cos(a) * r, 8.5 + math.sin(a) * r))
        c.poly_s(pts, Ramp.from_color("#ffe27a"))
    elif name == "skull":
        c.ellipse_s(8, 7, 5.5, 5, Ramp.from_color("#e8e0d0"))
        c.rect(5, 11, 11, 14, (232, 224, 208))
        c.rect(5, 6, 7, 8, (30, 20, 30))
        c.rect(9, 6, 11, 8, (30, 20, 30))
    elif name == "key":
        c.ellipse_s(5, 5, 3.5, 3.5, Ramp.from_color("#ffd040"))
        c.line((7, 7), (14, 14), 1.6, (220, 170, 60))
        c.line((12, 12), (14, 10), 1.4, (220, 170, 60))
    elif name == "gem":
        c.poly_s([(8, 1), (14, 6), (8, 15), (2, 6)], Ramp.from_color("#5ad0ff"))
    elif name == "map":
        c.poly_s([(2, 3), (14, 2), (14, 13), (2, 14)], Ramp.from_color("#e0c890"))
        c.line((4, 10), (11, 5), 0.8, (180, 60, 60))
    elif name == "fire":
        c.poly_s([(8, 1), (12, 7), (13, 11), (8, 15), (3, 11), (5, 6)], Ramp.from_color("#ff7a2a"))
        c.poly_s([(8, 8), (10, 11), (8, 14), (6, 11)], Ramp.from_color("#ffd86a"), hi=False)
    elif name == "ice":
        c.poly_s([(8, 1), (11, 6), (15, 8), (11, 10), (8, 15), (5, 10), (1, 8), (5, 6)], Ramp.from_color("#9ae8ff"))
    elif name == "earth":
        c.poly_s([(2, 14), (5, 5), (8, 9), (11, 3), (14, 14)], Ramp.from_color("#9a7a52"))
    elif name == "wind":
        for k in range(3):
            c.line((2, 4 + k * 4), (12 - k * 2, 4 + k * 4), 1.4, (168, 240, 200))
            c.circle(12 - k * 2, 3 + k * 4, 1.2, (168, 240, 200))
    elif name == "light":
        c.circle(8, 8, 4, (255, 240, 180))
        for k in range(8):
            a = k * math.pi / 4
            c.line((8 + math.cos(a) * 5, 8 + math.sin(a) * 5), (8 + math.cos(a) * 7.5, 8 + math.sin(a) * 7.5), 1.0, (255, 226, 122))
    elif name == "dark":
        c.circle(8, 8, 6, (90, 42, 138))
        c.circle(10, 6, 4, (24, 16, 40))
    elif name == "physical":
        c.poly_s([(2, 12), (11, 3), (13, 5), (4, 14)], Ramp.from_color("#dfe6f4"))
        c.poly_s([(9, 12), (5, 8), (3, 10)], Ramp.from_color("#ffd86a"), hi=False)
    elif name == "heal":
        c.rect(6, 2, 10, 14, (120, 240, 160))
        c.rect(2, 6, 14, 10, (120, 240, 160))
    elif name == "shield":
        c.poly_s([(8, 1), (14, 3), (13, 9), (8, 15), (3, 9), (2, 3)], Ramp.from_color("#7ac8ff"))
    elif name == "ap":
        c.poly_s([(8, 1), (10, 7), (15, 8), (10, 9), (8, 15), (6, 9), (1, 8), (6, 7)], Ramp.from_color("#ffd86a"))
    elif name == "hp":
        c.poly_s([(8, 14), (2, 7), (2, 4), (5, 2), (8, 5), (11, 2), (14, 4), (14, 7)], Ramp.from_color("#e8405a"))
    elif name == "mp":
        c.poly_s([(8, 1), (12, 8), (12, 12), (8, 15), (4, 12), (4, 8)], Ramp.from_color("#4a7aff"))
    elif name == "break":
        c.poly_s([(3, 2), (13, 2), (11, 8), (14, 8), (5, 15), (7, 9), (3, 9)], Ramp.from_color("#ffb03a"))
    elif name == "arrow_up":
        c.poly_s([(8, 2), (14, 9), (10, 9), (10, 14), (6, 14), (6, 9), (2, 9)], Ramp.from_color("#7af0a0"))
    return c.render()


def icon_sheet() -> Image.Image:
    img = Image.new("RGBA", (16 * len(ICONS), 16), (0, 0, 0, 0))
    for i, n in enumerate(ICONS):
        img.paste(icon(n), (i * 16, 0))
    return img


def logo(text_w=320, text_h=96) -> Image.Image:
    """A decorative emblem behind the title (the text itself is drawn in-engine)."""
    c = Canvas(text_w, text_h)
    Y = Ramp.from_color("#ffd86a")
    P = Ramp.from_color("#5a2a8a")
    cx, cy = text_w / 2, text_h / 2
    c.glow(cx, cy, 70, (120, 60, 200), 90)
    c.ellipse_s(cx, cy, 36, 36, P, sh_w=3)
    c.ellipse_s(cx, cy, 30, 30, Ramp.from_color("#1a1030"), hi=False)
    # sword up the middle
    c.poly_s([(cx - 2.5, cy + 30), (cx - 2.5, cy - 24), (cx, cy - 34), (cx + 2.5, cy - 24), (cx + 2.5, cy + 30)], Ramp.from_color("#dfe6f4"))
    c.rect_s(cx - 12, cy + 12, cx + 12, cy + 16, Y)
    # wings
    for s in (-1, 1):
        for k in range(4):
            c.poly_s([(cx + s * 12, cy + 6 - k * 4), (cx + s * (40 + k * 6), cy - 6 - k * 10), (cx + s * 14, cy - 2 - k * 4)], Y, hi=False)
    return c.render()
