"""Battle VFX sprite sheets (spells, slashes, impacts)."""
from __future__ import annotations

import math
import random

from raster import Canvas, Ramp, hex_to_rgb, mix, rot_pt, add_outline

E = 64
FX_FRAMES = 6


def _frames(fn, n=FX_FRAMES, size=E, outline=False):
    out = []
    for i in range(n):
        c = Canvas(size, size)
        fn(c, i / (n - 1) if n > 1 else 0, i)
        out.append(c.render(outline=outline))
    return out


def slash(c: Canvas, t, i):
    # a broad crescent sweeping from the upper-right down to the lower-left
    cx, cy = E * 0.35, E * 0.45
    R = Ramp.from_color("#ffffff")
    Y = Ramp.from_color("#ffe27a")
    sweep = min(1, t * 1.5 + 0.15)
    a0 = -1.1
    a1 = a0 + 2.4 * sweep
    fade = 1 - max(0, t - 0.55) / 0.45
    pts_out, pts_in = [], []
    N = 16
    for k in range(N):
        u = k / (N - 1)
        a = a0 + (a1 - a0) * u
        r_out = 30
        thick = (10 * math.sin(u * math.pi) + 1.5) * fade
        pts_out.append((cx + math.cos(a) * r_out, cy + math.sin(a) * r_out))
        pts_in.append((cx + math.cos(a) * (r_out - thick), cy + math.sin(a) * (r_out - thick)))
    if fade > 0.05:
        c.poly_s(pts_out + pts_in[::-1], Y, hi=False)
        core_o = [(cx + (p[0] - cx) * 0.96, cy + (p[1] - cy) * 0.96) for p in pts_out]
        core_i = [(cx + (p[0] - cx) * 1.06, cy + (p[1] - cy) * 1.06) for p in pts_in]
        c.poly(core_o + core_i[::-1], R.hi)
    if 0.2 < t < 0.85:
        for k in range(6):
            a = a1 - 0.15 - k * 0.12
            c.circle(cx + math.cos(a) * (33 + k), cy + math.sin(a) * (33 + k), 1.2, (255, 255, 255))


def fire(c: Canvas, t, i):
    rnd = random.Random(i)
    cx, base = E / 2, E * 0.85
    grow = min(1, t * 1.6)
    fade = max(0, 1 - max(0, t - 0.6) / 0.4)
    for k in range(9):
        ox = (k - 4) * 4.5 * grow
        h = (28 - abs(k - 4) * 4) * grow * fade + rnd.random() * 6
        w = 5 - abs(k - 4) * 0.5
        c.poly_s([(cx + ox - w, base), (cx + ox - w * 0.6, base - h * 0.55), (cx + ox + rnd.uniform(-2, 2), base - h), (cx + ox + w * 0.6, base - h * 0.5), (cx + ox + w, base)], Ramp.from_color("#ff7a2a", 1.2), hi=False)
    for k in range(7):
        ox = (k - 3) * 4.2 * grow
        h = (18 - abs(k - 3) * 3) * grow * fade + rnd.random() * 4
        c.poly_s([(cx + ox - 2.5, base - 1), (cx + ox + rnd.uniform(-1, 1), base - h), (cx + ox + 2.5, base - 1)], Ramp.from_color("#ffd86a"), hi=False)
    c.glow(cx, base - 14 * grow, 22 * grow, (255, 140, 40), int(100 * fade))
    for k in range(6):
        c.glow(cx + rnd.uniform(-16, 16), base - 20 - t * 30 + rnd.uniform(-8, 8), 1.6, (255, 220, 120), int(220 * fade))


def ice(c: Canvas, t, i):
    cx, cy = E / 2, E * 0.7
    B = Ramp.from_color("#9ae8ff", 1.2)
    W = Ramp.from_color("#e8fbff")
    grow = min(1, t * 1.5)
    shatter = max(0, (t - 0.7) / 0.3)
    for k, (ang, ln, w) in enumerate([(-0.3, 30, 6), (0.35, 24, 5), (-0.9, 20, 4), (0.9, 18, 4), (0.0, 34, 5)]):
        L = ln * grow
        bx, by = cx + k * 3 - 6 + shatter * (k - 2) * 8, cy + 4 - shatter * 10
        tip = (bx + math.sin(ang) * L, by - math.cos(ang) * L)
        n = (math.cos(ang), math.sin(ang))
        c.poly_s([(bx - n[0] * w, by - n[1] * w), tip, (bx + n[0] * w, by + n[1] * w)], B if k % 2 else W, sh_w=1.6)
    c.glow(cx, cy - 6, 18 * grow, (140, 220, 255), int(90 * (1 - shatter)))
    for k in range(8):
        a = k * 0.8 + t * 3
        r = 12 + t * 20
        c.glow(cx + math.cos(a) * r, cy - 6 + math.sin(a) * r * 0.6, 1.3, (230, 250, 255), 200)


def earth(c: Canvas, t, i):
    cx, base = E / 2, E * 0.88
    R = Ramp.from_color("#9a7a52", 1.1)
    D = Ramp.from_color("#6a4e34")
    rise = min(1, t * 1.4)
    sink = max(0, (t - 0.75) / 0.25)
    for k, (ox, h, w) in enumerate([(-16, 22, 6), (-6, 34, 7), (5, 28, 7), (15, 20, 5)]):
        H = h * rise * (1 - sink)
        c.poly_s([(cx + ox - w, base), (cx + ox - w * 0.4, base - H * 0.8), (cx + ox + 1, base - H), (cx + ox + w * 0.5, base - H * 0.7), (cx + ox + w, base)], R if k % 2 else D, sh_w=1.8)
    # dust
    for k in range(10):
        a = k * 0.63
        c.glow(cx + math.cos(a) * (14 + t * 22), base - 2 - abs(math.sin(a)) * (4 + t * 10), 2.2, (180, 150, 110), int(160 * (1 - t)))


def wind(c: Canvas, t, i):
    cx, cy = E / 2, E / 2
    G = Ramp.from_color("#a8f0c8")
    for k in range(4):
        a0 = t * 7 + k * 1.57
        r = 10 + k * 5 + t * 6
        pts_o, pts_i = [], []
        for s in range(12):
            a = a0 + s * 0.22
            pts_o.append((cx + math.cos(a) * (r + 2.5), cy + math.sin(a) * (r + 2.5) * 0.7))
            pts_i.append((cx + math.cos(a) * (r - 1.5 + s * 0.3), cy + math.sin(a) * (r - 1.5 + s * 0.3) * 0.7))
        c.poly_s(pts_o + pts_i[::-1], G, hi=False)
    for k in range(6):
        a = t * 9 + k * 1.05
        c.glow(cx + math.cos(a) * 26, cy + math.sin(a) * 18, 1.5, (240, 255, 245), 220)


def light(c: Canvas, t, i):
    cx = E / 2
    W = Ramp.from_color("#fff8d8")
    Y = Ramp.from_color("#ffe27a")
    w = 14 * (1 - abs(t - 0.4) * 1.3)
    w = max(0, w)
    if w > 0:
        c.poly_s([(cx - w, 0), (cx + w, 0), (cx + w * 0.7, E), (cx - w * 0.7, E)], Y, hi=False)
        c.poly([(cx - w * 0.5, 0), (cx + w * 0.5, 0), (cx + w * 0.3, E), (cx - w * 0.3, E)], W.hi)
    c.glow(cx, E * 0.7, 20 * (1 - abs(t - 0.5)), (255, 240, 180), 120)
    for k in range(8):
        a = k * 0.78 + t
        r = 8 + t * 26
        c.glow(cx + math.cos(a) * r, E * 0.65 + math.sin(a) * r * 0.5, 1.6, (255, 255, 230), int(230 * (1 - t)))


def dark(c: Canvas, t, i):
    cx, cy = E / 2, E * 0.55
    P = Ramp.from_color("#5a2a8a", 1.2)
    r = 6 + 18 * math.sin(min(1, t * 1.3) * math.pi)
    c.glow(cx, cy, r + 8, (90, 30, 140), 140)
    c.ellipse_s(cx, cy, r, r, P, sh_w=2.0)
    c.ellipse_s(cx, cy, r * 0.5, r * 0.5, Ramp.from_color("#150a24"), hi=False)
    for k in range(7):
        a = k * 0.9 - t * 5
        L = r + 6 + 8 * math.sin(t * 6 + k)
        p0 = (cx + math.cos(a) * r * 0.8, cy + math.sin(a) * r * 0.8)
        p1 = (cx + math.cos(a + 0.5) * L, cy + math.sin(a + 0.5) * L)
        c.capsule_s(p0, p1, 1.5, P, hi=False)
    for k in range(6):
        c.glow(cx + math.cos(k * 1.1 + t * 4) * (r + 10), cy + math.sin(k * 1.1 + t * 4) * (r + 10), 1.4, (220, 160, 255), 200)


def heal(c: Canvas, t, i):
    cx, base = E / 2, E * 0.9
    G = Ramp.from_color("#7af0a0")
    c.glow(cx, base - 10, 22 * min(1, t * 2), (120, 255, 170), int(90 * (1 - t)))
    rnd = random.Random(3)
    for k in range(10):
        x = cx + rnd.uniform(-20, 20)
        y = base - rnd.uniform(0, 20) - t * 40
        s = 1.2 + rnd.random() * 1.2
        if 0 < y < E:
            c.rect(x - s, y - 0.5, x + s, y + 0.5, G.hi)
            c.rect(x - 0.5, y - s, x + 0.5, y + s, G.hi)
    # cross emblem
    a = math.sin(min(1, t * 1.5) * math.pi)
    if a > 0:
        c.rect(cx - 2, base - 30 - 8 * a, cx + 2, base - 30 + 8 * a, G.light)
        c.rect(cx - 8 * a, base - 32, cx + 8 * a, base - 28, G.light)


def hit(c: Canvas, t, i):
    cx, cy = 16, 16
    W = Ramp.from_color("#ffffff")
    Y = Ramp.from_color("#ffd86a")
    n = 8
    r = 4 + 12 * t
    pts = []
    for k in range(n * 2):
        a = k * math.pi / n
        rr = r if k % 2 == 0 else r * 0.45
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    c.poly_s(pts, Y if t > 0.4 else W, hi=False)
    c.circle(cx, cy, r * 0.35 * (1 - t), W.hi)


def parry(c: Canvas, t, i):
    cx, cy = 24, 24
    B = Ramp.from_color("#7ad0ff")
    r = 6 + 16 * t
    c.glow(cx, cy, r, (120, 200, 255), int(150 * (1 - t)))
    c.ellipse_s(cx, cy, r, r, B, hi=False)
    c.erase(lambda d, s: d.ellipse([(cx - r + 3) * s, (cy - r + 3) * s, (cx + r - 3) * s, (cy + r - 3) * s], fill=255))
    for k in range(6):
        a = k * 1.05 + t * 2
        c.line((cx + math.cos(a) * (r + 2), cy + math.sin(a) * (r + 2)), (cx + math.cos(a) * (r + 6 + t * 6), cy + math.sin(a) * (r + 6 + t * 6)), 1.2, (230, 245, 255))


def buff(c: Canvas, t, i):
    cx, base = E / 2, E * 0.9
    Y = Ramp.from_color("#ffd86a")
    for k in range(3):
        y = base - 10 - t * 34 - k * 12
        if 4 < y < E - 4:
            c.poly_s([(cx - 10, y + 6), (cx, y - 4), (cx + 10, y + 6), (cx + 6, y + 6), (cx, y + 1), (cx - 6, y + 6)], Y, hi=False)
    c.glow(cx, base - 16, 18, (255, 220, 120), int(70 * (1 - t)))


def poison(c: Canvas, t, i):
    cx, base = E / 2, E * 0.85
    P = Ramp.from_color("#9a5ad0")
    rnd = random.Random(7)
    for k in range(8):
        x = cx + rnd.uniform(-16, 16)
        y = base - (t * 30 + k * 6) % 36
        r = 1.5 + rnd.random() * 2
        c.ellipse_s(x, y, r, r, P, hi_w=0.6)
    c.glow(cx, base - 12, 16, (140, 80, 200), int(80 * (1 - t)))


def shield(c: Canvas, t, i):
    cx, cy = E / 2, E / 2
    B = Ramp.from_color("#7ac8ff")
    a = math.sin(min(1, t * 1.2) * math.pi)
    r = 24 * a
    if r > 1:
        c.ellipse_s(cx, cy, r, r * 1.15, B, hi=False)
        c.erase(lambda d, s: d.ellipse([(cx - r + 2.5) * s, (cy - r * 1.15 + 2.5) * s, (cx + r - 2.5) * s, (cy + r * 1.15 - 2.5) * s], fill=255))
        c.glow(cx, cy, r, (120, 200, 255), 60)


def stun(c: Canvas, t, i):
    cx, cy = 16, 12
    Y = Ramp.from_color("#ffe27a")
    for k in range(3):
        a = t * math.tau + k * 2.1
        x, y = cx + math.cos(a) * 10, cy + math.sin(a) * 4
        c.poly_s([(x, y - 3), (x + 3, y), (x, y + 3), (x - 3, y)], Y, hi=False)


EFFECTS = {
    # name: (fn, frames, size)
    "slash": (slash, 6, E),
    "fire": (fire, 7, E),
    "ice": (ice, 7, E),
    "earth": (earth, 7, E),
    "wind": (wind, 7, E),
    "light": (light, 7, E),
    "dark": (dark, 7, E),
    "heal": (heal, 7, E),
    "buff": (buff, 6, E),
    "poison": (poison, 6, E),
    "shield": (shield, 6, E),
    "hit": (hit, 4, 32),
    "parry": (parry, 5, 48),
    "stun": (stun, 4, 32),
}


def render_effect(name):
    fn, n, size = EFFECTS[name]
    return _frames(fn, n, size), n, size
