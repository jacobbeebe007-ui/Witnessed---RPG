"""Overworld tileset (16x16 atlas), map objects and painted battle backdrops."""
from __future__ import annotations

import math
import random

from PIL import Image, ImageDraw

from raster import Canvas, Ramp, hex_to_rgb, mix, darken, lighten

T = 16

# atlas layout (column, row) -> name.  Godot builds the TileSet from this list.
TILES = [
    "grass", "grass2", "grass3", "tall_grass", "flowers", "path", "path_edge", "sand",
    "water", "water2", "deep_water", "mountain", "mountain_snow", "forest_floor", "dirt", "cobble",
    "rock", "bush", "stump", "shore", "swamp", "ash", "lava", "lava2",
]


def _noise_px(d, x0, y0, base, alt, rnd, density=0.12, size=1):
    for y in range(T):
        for x in range(T):
            if rnd.random() < density:
                d.rectangle([x0 + x, y0 + y, x0 + x + size - 1, y0 + y + size - 1], fill=alt)


def render_tileset() -> Image.Image:
    cols = 8
    rows = math.ceil(len(TILES) / cols)
    img = Image.new("RGBA", (cols * T, rows * T), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rnd = random.Random(42)
    C = {
        "grass": (94, 160, 72), "grass_d": (70, 130, 58), "grass_l": (126, 190, 92),
        "path": (196, 168, 112), "path_d": (166, 138, 88), "sand": (222, 200, 140), "sand_d": (200, 176, 120),
        "water": (60, 120, 200), "water_l": (110, 170, 230), "deep": (34, 70, 150),
        "rock": (128, 118, 118), "rock_d": (86, 78, 84), "rock_l": (170, 160, 160), "snow": (240, 244, 250),
        "floor": (58, 104, 56), "floor_d": (40, 78, 42), "dirt": (120, 92, 60), "dirt_d": (92, 68, 44),
        "cobble": (150, 148, 160), "cobble_d": (110, 108, 122), "swamp": (70, 96, 60), "swamp_d": (48, 70, 46),
        "ash": (96, 88, 96), "ash_d": (70, 62, 72), "lava": (240, 110, 40), "lava_l": (255, 200, 80), "lava_d": (150, 40, 20),
    }
    for i, name in enumerate(TILES):
        x0, y0 = (i % cols) * T, (i // cols) * T
        box = [x0, y0, x0 + T - 1, y0 + T - 1]
        if name.startswith("grass"):
            d.rectangle(box, fill=C["grass"])
            _noise_px(d, x0, y0, C["grass"], C["grass_d"], rnd, 0.10)
            _noise_px(d, x0, y0, C["grass"], C["grass_l"], rnd, 0.06)
            if name == "grass2":
                for _ in range(3):
                    x, y = x0 + rnd.randrange(2, 13), y0 + rnd.randrange(2, 13)
                    d.line([x, y + 2, x, y], fill=C["grass_d"])
                    d.line([x + 2, y + 2, x + 2, y + 1], fill=C["grass_d"])
        elif name == "tall_grass":
            d.rectangle(box, fill=C["grass_d"])
            for k in range(7):
                x = x0 + 1 + k * 2
                h = rnd.randrange(5, 11)
                d.line([x, y0 + 15, x, y0 + 15 - h], fill=C["grass_l"] if k % 2 else C["grass"])
        elif name == "flowers":
            d.rectangle(box, fill=C["grass"])
            _noise_px(d, x0, y0, C["grass"], C["grass_d"], rnd, 0.1)
            for col in ((240, 220, 90), (240, 120, 150), (230, 240, 250), (200, 120, 240)):
                x, y = x0 + rnd.randrange(1, 14), y0 + rnd.randrange(1, 14)
                d.point([(x, y), (x + 1, y), (x, y + 1), (x + 1, y + 1)], fill=col)
        elif name == "path":
            d.rectangle(box, fill=C["path"])
            _noise_px(d, x0, y0, C["path"], C["path_d"], rnd, 0.12)
        elif name == "path_edge":
            d.rectangle(box, fill=C["grass"])
            d.ellipse([x0 - 4, y0 + 3, x0 + 20, y0 + 22], fill=C["path"])
        elif name == "sand":
            d.rectangle(box, fill=C["sand"])
            _noise_px(d, x0, y0, C["sand"], C["sand_d"], rnd, 0.1)
        elif name in ("water", "water2"):
            d.rectangle(box, fill=C["water"])
            off = 0 if name == "water" else 3
            for k in range(3):
                y = y0 + 2 + k * 5
                x = x0 + (k * 4 + off) % 12
                d.line([x, y, x + 3, y], fill=C["water_l"])
        elif name == "deep_water":
            d.rectangle(box, fill=C["deep"])
            _noise_px(d, x0, y0, C["deep"], C["water"], rnd, 0.06)
        elif name in ("mountain", "mountain_snow"):
            d.rectangle(box, fill=C["rock"])
            d.polygon([(x0, y0 + 15), (x0 + 8, y0 + 1), (x0 + 15, y0 + 15)], fill=C["rock_l"])
            d.polygon([(x0 + 8, y0 + 1), (x0 + 15, y0 + 15), (x0 + 8, y0 + 15)], fill=C["rock_d"])
            if name == "mountain_snow":
                d.polygon([(x0 + 5, y0 + 6), (x0 + 8, y0 + 1), (x0 + 11, y0 + 6), (x0 + 9, y0 + 5), (x0 + 7, y0 + 7)], fill=C["snow"])
        elif name == "forest_floor":
            d.rectangle(box, fill=C["floor"])
            _noise_px(d, x0, y0, C["floor"], C["floor_d"], rnd, 0.14)
        elif name == "dirt":
            d.rectangle(box, fill=C["dirt"])
            _noise_px(d, x0, y0, C["dirt"], C["dirt_d"], rnd, 0.12)
        elif name == "cobble":
            d.rectangle(box, fill=C["cobble_d"])
            for yy in range(0, 16, 4):
                for xx in range(0, 16, 8):
                    ox = 4 if (yy // 4) % 2 else 0
                    d.rectangle([x0 + (xx + ox) % 16, y0 + yy, x0 + (xx + ox) % 16 + 6, y0 + yy + 2], fill=C["cobble"])
        elif name == "rock":
            d.rectangle(box, fill=C["grass"])
            d.ellipse([x0 + 2, y0 + 5, x0 + 13, y0 + 14], fill=C["rock_d"])
            d.ellipse([x0 + 3, y0 + 4, x0 + 12, y0 + 11], fill=C["rock"])
            d.ellipse([x0 + 5, y0 + 5, x0 + 9, y0 + 8], fill=C["rock_l"])
        elif name == "bush":
            d.rectangle(box, fill=C["grass"])
            d.ellipse([x0 + 1, y0 + 4, x0 + 14, y0 + 15], fill=C["floor_d"])
            d.ellipse([x0 + 2, y0 + 3, x0 + 12, y0 + 12], fill=C["floor"])
            d.ellipse([x0 + 4, y0 + 4, x0 + 9, y0 + 8], fill=C["grass_l"])
        elif name == "stump":
            d.rectangle(box, fill=C["grass"])
            d.rectangle([x0 + 4, y0 + 6, x0 + 11, y0 + 13], fill=C["dirt_d"])
            d.ellipse([x0 + 3, y0 + 3, x0 + 12, y0 + 9], fill=C["dirt"])
            d.ellipse([x0 + 6, y0 + 5, x0 + 9, y0 + 7], fill=C["dirt_d"])
        elif name == "shore":
            d.rectangle(box, fill=C["sand"])
            d.rectangle([x0, y0 + 10, x0 + 15, y0 + 15], fill=C["water"])
            d.line([x0, y0 + 10, x0 + 15, y0 + 10], fill=C["water_l"])
        elif name == "swamp":
            d.rectangle(box, fill=C["swamp"])
            _noise_px(d, x0, y0, C["swamp"], C["swamp_d"], rnd, 0.15)
            d.ellipse([x0 + 4, y0 + 6, x0 + 12, y0 + 11], fill=C["swamp_d"])
        elif name == "ash":
            d.rectangle(box, fill=C["ash"])
            _noise_px(d, x0, y0, C["ash"], C["ash_d"], rnd, 0.14)
        elif name in ("lava", "lava2"):
            d.rectangle(box, fill=C["lava"])
            off = 0 if name == "lava" else 2
            for k in range(3):
                d.line([x0 + (k * 5 + off) % 14, y0 + 3 + k * 4, x0 + (k * 5 + off) % 14 + 3, y0 + 3 + k * 4], fill=C["lava_l"])
            _noise_px(d, x0, y0, C["lava"], C["lava_d"], rnd, 0.08)
    return img


# ---------------------------------------------------------------------------
# objects (trees, houses ...)   name -> (w, h)
# ---------------------------------------------------------------------------
def render_objects() -> dict[str, Image.Image]:
    out = {}
    # tree 32x40
    c = Canvas(32, 40)
    trunk = Ramp.from_color("#6a4a2a")
    leaf = Ramp.from_color("#3f8f3a", 1.2)
    c.rect_s(13, 26, 19, 39, trunk)
    c.ellipse_s(16, 18, 14, 12, leaf, sh_w=2.4)
    c.ellipse_s(11, 12, 8, 7, leaf, hi_w=1.5)
    c.ellipse_s(21, 14, 8, 7, leaf, hi_w=1.5)
    out["tree"] = c.render()
    # pine tree 32x44
    c = Canvas(32, 44)
    pine = Ramp.from_color("#2f6f44", 1.2)
    c.rect_s(14, 32, 18, 43, trunk)
    for k, (y, w) in enumerate([(34, 15), (26, 12), (18, 9), (10, 6)]):
        c.poly_s([(16 - w, y), (16, y - 12), (16 + w, y)], pine, sh_w=1.8)
    out["pine"] = c.render()
    # dead tree
    c = Canvas(32, 40)
    dead = Ramp.from_color("#5a4a48")
    c.capsule_s((16, 39), (15, 16), 2.4, dead)
    c.capsule_s((15, 22), (7, 10), 1.5, dead)
    c.capsule_s((15, 18), (24, 8), 1.5, dead)
    c.capsule_s((7, 10), (5, 4), 1.0, dead)
    out["dead_tree"] = c.render()
    # house 48x48
    c = Canvas(48, 48)
    wall = Ramp.from_color("#d8c8a8")
    roof = Ramp.from_color("#a84a3a", 1.1)
    door = Ramp.from_color("#6a4a2a")
    c.rect_s(6, 22, 42, 46, wall)
    c.poly_s([(2, 24), (24, 4), (46, 24)], roof, sh_w=2.4)
    c.rect_s(20, 32, 28, 46, door)
    c.rect_s(10, 28, 16, 34, Ramp.from_color("#7ac8ff"))
    c.rect_s(32, 28, 38, 34, Ramp.from_color("#7ac8ff"))
    c.rect_s(34, 8, 39, 18, Ramp.from_color("#8a8a9a"))
    out["house"] = c.render()
    # inn 64x56
    c = Canvas(64, 56)
    c.rect_s(4, 26, 60, 54, Ramp.from_color("#c8b088"))
    c.poly_s([(0, 28), (32, 4), (64, 28)], Ramp.from_color("#4a6aa8", 1.1), sh_w=2.4)
    c.rect_s(26, 38, 38, 54, door)
    for x in (10, 46):
        c.rect_s(x, 34, x + 8, 42, Ramp.from_color("#ffd86a"))
    c.rect_s(20, 16, 44, 24, Ramp.from_color("#6a4a2a"))
    out["inn"] = c.render()
    # shop 56x50
    c = Canvas(56, 50)
    c.rect_s(4, 22, 52, 48, Ramp.from_color("#e0d0b0"))
    c.poly_s([(0, 24), (28, 4), (56, 24)], Ramp.from_color("#3f8f5a", 1.1), sh_w=2.4)
    c.rect_s(22, 34, 34, 48, door)
    for x in (8, 40):
        c.rect_s(x, 30, x + 8, 38, Ramp.from_color("#7ac8ff"))
    c.rect_s(6, 24, 50, 29, Ramp.from_color("#b84a3a"))
    for x in range(6, 50, 6):
        c.rect_s(x, 24, x + 3, 29, Ramp.from_color("#f0f0f0"))
    out["shop"] = c.render()
    # cave entrance 40x32
    c = Canvas(40, 32)
    rock = Ramp.from_color("#7a7080")
    c.ellipse_s(20, 22, 20, 14, rock, sh_w=2.4)
    c.ellipse_s(20, 26, 10, 9, Ramp.from_color("#120a18"), hi=False)
    out["cave"] = c.render()
    # shrine 40x48
    c = Canvas(40, 48)
    stone = Ramp.from_color("#b8b8c8")
    c.rect_s(4, 40, 36, 47, stone)
    for x in (8, 28):
        c.rect_s(x, 14, x + 5, 40, stone)
    c.poly_s([(2, 14), (20, 4), (38, 14), (38, 18), (2, 18)], stone, sh_w=1.8)
    c.glow(20, 30, 8, (120, 220, 255), 160)
    out["shrine"] = c.render()
    # bandit camp tent 48x36
    c = Canvas(48, 36)
    c.poly_s([(2, 34), (24, 4), (46, 34)], Ramp.from_color("#8a5a3a", 1.1), sh_w=2.4)
    c.poly([(24, 12), (16, 34), (32, 34)], (30, 20, 30))
    c.glow(40, 30, 5, (255, 160, 60), 200)
    out["camp"] = c.render()
    # tower 48x80
    c = Canvas(48, 80)
    tw = Ramp.from_color("#5a5a7a")
    c.rect_s(10, 16, 38, 78, tw, sh_w=2.4)
    for x in range(8, 40, 8):
        c.rect_s(x, 10, x + 5, 18, tw)
    c.rect_s(20, 60, 28, 78, Ramp.from_color("#2a1a3a"))
    c.glow(24, 40, 6, (200, 80, 255), 180)
    out["tower"] = c.render()
    # bridge 16x32 (vertical)
    c = Canvas(16, 32)
    c.rect_s(0, 0, 16, 32, Ramp.from_color("#8a6a3a"))
    for y in range(0, 32, 4):
        c.rect(0, y, 16, y + 1, (100, 75, 40))
    out["bridge"] = c.render(outline=False)
    # sign post
    c = Canvas(16, 24)
    c.rect_s(7, 8, 10, 23, Ramp.from_color("#6a4a2a"))
    c.rect_s(1, 2, 15, 11, Ramp.from_color("#c8a060"))
    out["sign"] = c.render()
    # treasure chest 20x16
    c = Canvas(20, 16)
    c.rect_s(1, 5, 19, 15, Ramp.from_color("#8a5a2a"))
    c.rect_s(1, 3, 19, 8, Ramp.from_color("#a87a3a"))
    c.rect(9, 6, 11, 10, (240, 210, 80))
    out["chest"] = c.render()
    c = Canvas(20, 16)
    c.rect_s(1, 7, 19, 15, Ramp.from_color("#8a5a2a"))
    c.rect_s(1, 1, 19, 6, Ramp.from_color("#5a3a1a"))
    c.rect(3, 7, 17, 9, (40, 30, 20))
    out["chest_open"] = c.render()
    return out


# ---------------------------------------------------------------------------
# battle backdrops (640x360 drawn at 320x180 and doubled)
# ---------------------------------------------------------------------------
def _sky(d, w, h, top, bottom, steps=12):
    for i in range(steps):
        y0 = int(h * i / steps)
        y1 = int(h * (i + 1) / steps)
        d.rectangle([0, y0, w, y1], fill=mix(top, bottom, i / (steps - 1)))


def render_backdrop(kind: str) -> Image.Image:
    W, H = 320, 180
    img = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    d = ImageDraw.Draw(img)
    rnd = random.Random(hash(kind) % 1000)
    if kind == "meadow":
        _sky(d, W, 110, (120, 180, 240), (200, 225, 250))
        # distant mountains
        for k in range(6):
            x = k * 64 - 20
            d.polygon([(x, 112), (x + 34, 60 + rnd.randrange(0, 20)), (x + 70, 112)], fill=(140, 150, 190))
        for k in range(5):
            x = k * 80 - 30
            d.polygon([(x, 115), (x + 40, 85 + rnd.randrange(0, 12)), (x + 80, 115)], fill=(90, 120, 150))
        # hills
        d.ellipse([-60, 95, 200, 160], fill=(96, 160, 80))
        d.ellipse([120, 100, 400, 170], fill=(84, 148, 72))
        d.rectangle([0, 120, W, H], fill=(94, 160, 72))
        for _ in range(180):
            x, y = rnd.randrange(W), rnd.randrange(120, H)
            d.point((x, y), fill=(70, 130, 58) if rnd.random() < 0.6 else (126, 190, 92))
        for _ in range(30):
            x, y = rnd.randrange(W), rnd.randrange(125, H)
            d.point([(x, y), (x + 1, y)], fill=rnd.choice([(240, 220, 90), (240, 120, 150), (240, 240, 250)]))
        # trees at the horizon
        for k in range(9):
            x = rnd.randrange(W)
            y = 105 + rnd.randrange(0, 10)
            d.rectangle([x - 1, y, x + 1, y + 8], fill=(80, 55, 30))
            d.ellipse([x - 6, y - 10, x + 6, y + 2], fill=(60, 120, 50))
    elif kind == "forest":
        _sky(d, W, H, (26, 40, 34), (46, 80, 56))
        for layer, (col, n, h) in enumerate([((30, 56, 40), 10, 130), ((38, 74, 48), 8, 150), ((48, 96, 56), 6, 170)]):
            for k in range(n):
                x = rnd.randrange(-10, W)
                d.rectangle([x, H - h + 40, x + 6 + layer * 3, H], fill=darken(col, 0.35))
                d.ellipse([x - 22 - layer * 4, H - h - 20, x + 30 + layer * 4, H - h + 60], fill=col)
        d.rectangle([0, 150, W, H], fill=(58, 104, 56))
        for _ in range(160):
            x, y = rnd.randrange(W), rnd.randrange(150, H)
            d.point((x, y), fill=(40, 78, 42))
        # light shafts
        for k in range(4):
            x = 40 + k * 80
            d.polygon([(x, 0), (x + 14, 0), (x + 40, 150), (x + 10, 150)], fill=(70, 110, 76))
    elif kind == "cave":
        _sky(d, W, H, (24, 18, 34), (40, 30, 52))
        for k in range(14):
            x = rnd.randrange(-10, W)
            h = rnd.randrange(30, 90)
            d.polygon([(x, 0), (x + rnd.randrange(8, 24), h), (x + 30, 0)], fill=(52, 42, 66))
        for k in range(14):
            x = rnd.randrange(-10, W)
            h = rnd.randrange(20, 70)
            d.polygon([(x, 150), (x + rnd.randrange(8, 24), 150 - h), (x + 30, 150)], fill=(60, 50, 76))
        d.rectangle([0, 148, W, H], fill=(74, 62, 84))
        for _ in range(140):
            x, y = rnd.randrange(W), rnd.randrange(148, H)
            d.point((x, y), fill=(56, 46, 66))
        for k in range(6):
            x, y = rnd.randrange(W), rnd.randrange(40, 140)
            d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=(90, 200, 255))
            d.ellipse([x - 1, y - 1, x + 1, y + 1], fill=(220, 250, 255))
    elif kind == "ruins":
        _sky(d, W, 120, (70, 50, 90), (220, 140, 110))
        d.ellipse([230, 30, 270, 70], fill=(255, 220, 170))
        for k in range(7):
            x = 10 + k * 46
            h = rnd.randrange(50, 110)
            d.rectangle([x, 120 - h, x + 14, 125], fill=(120, 110, 130))
            d.rectangle([x - 3, 120 - h, x + 17, 120 - h + 6], fill=(140, 130, 150))
            d.rectangle([x + 2, 120 - h, x + 5, 125], fill=(96, 86, 106))
        d.rectangle([0, 120, W, H], fill=(140, 132, 150))
        for y in range(120, H, 10):
            for x in range(0, W, 20):
                ox = 10 if (y // 10) % 2 else 0
                d.rectangle([x + ox, y, x + ox + 18, y + 8], fill=(150, 142, 160), outline=(120, 112, 130))
        for _ in range(40):
            x, y = rnd.randrange(W), rnd.randrange(120, H)
            d.point([(x, y), (x + 1, y)], fill=(90, 140, 80))
    elif kind == "wastes":
        _sky(d, W, 120, (160, 110, 70), (230, 190, 130))
        for k in range(5):
            x = k * 80 - 30
            d.polygon([(x, 122), (x + 40, 80 + rnd.randrange(0, 20)), (x + 80, 122)], fill=(150, 110, 80))
        d.rectangle([0, 120, W, H], fill=(200, 170, 110))
        for _ in range(200):
            x, y = rnd.randrange(W), rnd.randrange(120, H)
            d.point((x, y), fill=(176, 148, 96))
        for k in range(8):
            x, y = rnd.randrange(W), rnd.randrange(125, H)
            d.ellipse([x - 6, y - 3, x + 6, y + 3], fill=(150, 120, 90))
    elif kind == "lair":
        _sky(d, W, H, (30, 10, 14), (90, 30, 20))
        for k in range(10):
            x = rnd.randrange(-10, W)
            h = rnd.randrange(40, 120)
            d.polygon([(x, 150), (x + rnd.randrange(10, 30), 150 - h), (x + 40, 150)], fill=(50, 22, 26))
        d.rectangle([0, 148, W, H], fill=(60, 30, 34))
        for k in range(6):
            x, y = rnd.randrange(W), rnd.randrange(150, H)
            d.ellipse([x - 14, y - 4, x + 14, y + 4], fill=(240, 110, 40))
            d.ellipse([x - 8, y - 2, x + 8, y + 2], fill=(255, 200, 80))
        for _ in range(60):
            x, y = rnd.randrange(W), rnd.randrange(0, 150)
            d.point((x, y), fill=(255, 140, 60))
    elif kind == "tower":
        _sky(d, W, H, (14, 8, 30), (50, 20, 70))
        for k in range(30):
            d.point((rnd.randrange(W), rnd.randrange(100)), fill=(230, 230, 255))
        for x in range(0, W, 40):
            d.rectangle([x, 20, x + 10, 150], fill=(60, 40, 90))
            d.rectangle([x + 2, 20, x + 4, 150], fill=(90, 60, 130))
        d.rectangle([0, 148, W, H], fill=(70, 50, 100))
        for y in range(148, H, 8):
            for x in range(0, W, 16):
                ox = 8 if (y // 8) % 2 else 0
                d.rectangle([x + ox, y, x + ox + 14, y + 6], fill=(80, 58, 112), outline=(56, 40, 84))
        for k in range(5):
            x = 30 + k * 70
            d.ellipse([x - 4, 60, x + 4, 68], fill=(200, 90, 255))
    return img.resize((W * 2, H * 2), Image.Resampling.NEAREST)


BACKDROPS = ["meadow", "forest", "cave", "ruins", "wastes", "lair", "tower"]
