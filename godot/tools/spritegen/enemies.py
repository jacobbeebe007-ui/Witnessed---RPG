"""Enemy sprites.  Two families:

* creature sheets  - bespoke shapes (slime, wolf, wraith...), 14 frames:
                     idle 4 | attack 4 | hurt 2 | death 4
* humanoid sheets  - reuse the hero rig (goblin, skeleton, bandit, cultist,
                     harpy, ogre, lich) and share the hero animation index.
All enemies face RIGHT and are flipped in-engine.
"""
from __future__ import annotations

import math

from raster import Canvas, Ramp, hex_to_rgb, mix, darken, lighten, rot_pt
from rig import Body, solve, anim_frames, FW, FH, add, _dir
import rig as rigmod
import hero
import armor

CREATURE_ANIMS = {
    "idle": dict(start=0, count=4, fps=5, loop=True),
    "attack": dict(start=4, count=4, fps=10, loop=False),
    "hurt": dict(start=8, count=2, fps=8, loop=False),
    "death": dict(start=10, count=4, fps=6, loop=False),
}


def creature_phases():
    """Yields (anim, t) for the 14 creature frames."""
    for i in range(4):
        yield "idle", i / 4
    for i in range(4):
        yield "attack", i / 3
    for i in range(2):
        yield "hurt", i
    for i in range(4):
        yield "death", i / 3


# ---------------------------------------------------------------------------
# bespoke creatures
# ---------------------------------------------------------------------------
def slime(c: Canvas, anim, t, size):
    R = Ramp.from_color("#4fd07a", 1.2)
    core = Ramp.from_color("#2a7a48")
    cx, gy = size * 0.5, size * 0.9
    sq = 1.0
    dy = 0
    if anim == "idle":
        sq = 1 + 0.08 * math.sin(t * math.tau)
    elif anim == "attack":
        sq = [0.75, 1.35, 1.1, 1.0][int(t * 3)]
        dy = [4, -12, -4, 0][int(t * 3)]
    elif anim == "hurt":
        sq = 0.8
    elif anim == "death":
        sq = 1 - 0.7 * t
    rx, ry = 15 / sq * 0.9 + 2, 13 * sq
    c.ellipse_s(cx, gy - ry + dy, rx, ry, R, sh_w=2.0)
    c.ellipse_s(cx - 2, gy - ry * 0.75 + dy, rx * 0.5, ry * 0.45, core, hi=False)
    # face
    ex = cx + rx * 0.4
    ey = gy - ry * 1.05 + dy
    for ox in (-4, 3):
        c.ellipse_s(ex + ox, ey, 1.8, 2.2 * (1 if anim != "death" else 0.4), Ramp.from_color("#f0fff0"), hi=False)
        c.pixel(ex + ox + 0.5, ey + 0.5, (20, 40, 30))
    c.line((ex - 3, ey + 4.5), (ex + 3, ey + 5.0 - (2 if anim == "attack" else 0)), 1.0, core.dark)
    # highlight blob
    c.ellipse_s(cx - rx * 0.4, gy - ry * 1.5 + dy, 3.0, 2.0, Ramp.from_color("#c8ffd8"), hi=False)


def wolf(c: Canvas, anim, t, size):
    F = Ramp.from_color("#6f6f80", 1.1)
    D = Ramp.from_color("#3a3a48")
    cx, gy = size * 0.5, size * 0.9
    bob = math.sin(t * math.tau) * 1.0 if anim == "idle" else 0
    lunge = 0
    dy = bob
    lean = 0
    if anim == "attack":
        lunge = [-4, 6, 10, 4][int(t * 3)]
        dy = [2, -6, -3, 0][int(t * 3)]
        lean = [0.1, -0.35, -0.3, 0][int(t * 3)]
    if anim == "hurt":
        lunge, dy = -4, 1
    if anim == "death":
        dy = 8 * t
        lean = 0.6 * t
    bx, by = cx + lunge, gy - 15 + dy
    legs = [(-10, 0.4), (-6, -0.3), (5, -0.4), (9, 0.4)]
    ph = math.sin(t * math.tau)
    for i, (ox, sw) in enumerate(legs):
        a = sw * (0.6 if anim == "attack" else 0.25 * ph)
        top = (bx + ox, by + 4)
        kn = add(top, _dir(a), 6)
        ft = add(kn, _dir(a * 0.5 - 0.3), 6)
        r = D if i in (0, 2) else F
        c.capsule_s(top, kn, 2.4, r)
        c.capsule_s(kn, ft, 1.9, r)
        c.capsule_s(ft, add(ft, (2.5, 0.5)), 1.6, r, hi=False)
    # body
    c.poly_s([(bx - 15, by - 4), (bx - 10, by - 8), (bx + 8, by - 9), (bx + 15, by - 3), (bx + 13, by + 5), (bx - 8, by + 6), (bx - 15, by + 2)], F, sh_w=2.0)
    # tail
    c.capsule_s((bx - 14, by - 3), (bx - 22, by - 10 + ph * 2), 2.2, F)
    c.capsule_s((bx - 20, by - 8 + ph * 2), (bx - 24, by - 13 + ph * 2), 1.5, D)
    # head
    hx, hy = bx + 17, by - 8 + lean * 12
    c.ellipse_s(hx, hy, 7, 6, F, sh_w=1.6)
    c.poly_s([(hx + 3, hy - 2), (hx + 12, hy + 1), (hx + 11, hy + 4), (hx + 3, hy + 4)], F)  # muzzle
    c.pixel(hx + 11.5, hy + 0.5, (20, 20, 30))
    open_m = 3 if anim == "attack" else 0.5
    c.poly([(hx + 4, hy + 4), (hx + 12, hy + 4), (hx + 10, hy + 4 + open_m), (hx + 4, hy + 5 + open_m * 0.5)], (120, 30, 40))
    for k in range(3):
        c.pixel(hx + 5 + k * 2.2, hy + 4.2, (240, 240, 240))
    c.poly_s([(hx - 3, hy - 4), (hx - 5, hy - 12), (hx + 1, hy - 5)], F)  # ear
    c.poly_s([(hx + 1, hy - 5), (hx + 2, hy - 11), (hx + 5, hy - 4)], D)
    c.rect(hx + 3, hy - 2, hx + 6, hy - 0.5, (255, 200, 60))
    c.pixel(hx + 4.5, hy - 1.5, (20, 20, 30))


def wraith(c: Canvas, anim, t, size):
    R = Ramp.from_color("#5a4a9a", 1.2)
    D = Ramp.from_color("#241a40")
    cx, gy = size * 0.5, size * 0.85
    hover = math.sin(t * math.tau) * 2.5
    reach = 0
    dy = hover
    if anim == "attack":
        reach = [2, 10, 12, 4][int(t * 3)]
    if anim == "hurt":
        reach = -4
    if anim == "death":
        dy = -10 * t
    top = gy - 40 + dy
    # tattered robe body
    pts = [(cx - 8, top + 8), (cx - 12, top + 26), (cx - 14, top + 40), (cx - 8, top + 36), (cx - 4, top + 42), (cx + 2, top + 35), (cx + 7, top + 41), (cx + 11, top + 33), (cx + 12, top + 24), (cx + 8, top + 8)]
    c.poly_s(pts, R, sh_w=2.4)
    c.glow(cx, top + 22, 14, (120, 90, 220), 60)
    # hood + face void
    c.poly_s([(cx - 9, top + 12), (cx - 6, top - 1), (cx + 4, top - 3), (cx + 11, top + 6), (cx + 9, top + 14)], R)
    c.poly([(cx - 3, top + 3), (cx + 7, top + 1), (cx + 8, top + 11), (cx - 4, top + 11)], D.dark)
    c.glow(cx + 1, top + 6, 3, (160, 240, 255), 200)
    c.glow(cx + 5, top + 6, 3, (160, 240, 255), 200)
    c.pixel(cx + 1, top + 6, (220, 255, 255))
    c.pixel(cx + 5, top + 6, (220, 255, 255))
    # clawed arms
    for side, ox in ((-1, -2), (1, 4)):
        sh = (cx + ox, top + 14)
        hand = (cx + 8 + reach + ox, top + 16 + (4 if side < 0 else 0))
        c.capsule_s(sh, hand, 2.0, R if side > 0 else D)
        for k in range(3):
            c.line(hand, (hand[0] + 4, hand[1] - 3 + k * 3), 0.9, (200, 210, 240))


def golem(c: Canvas, anim, t, size):
    R = Ramp.from_color("#8a7a6a", 1.1)
    D = Ramp.from_color("#5a4a40")
    G = Ramp.from_color("#5ad0ff")
    cx, gy = size * 0.5, size * 0.92
    dy = math.sin(t * math.tau) * 0.6 if anim == "idle" else 0
    arm_a = -0.2
    lean = 0
    if anim == "attack":
        arm_a = [-2.4, -2.8, 1.4, 1.1][int(t * 3)]
        lean = [-0.15, -0.2, 0.35, 0.3][int(t * 3)]
        dy = [0, -2, 3, 2][int(t * 3)]
    if anim == "hurt":
        lean = -0.2
    if anim == "death":
        dy = 14 * t
        lean = 0.5 * t
    hip = (cx, gy - 24 + dy)
    up = (math.sin(lean), -math.cos(lean))
    # legs
    for ox, r in ((-8, D), (7, R)):
        c.poly_s([(hip[0] + ox - 5, hip[1] - 2), (hip[0] + ox + 5, hip[1] - 2), (hip[0] + ox + 6, gy), (hip[0] + ox - 7, gy)], r, sh_w=1.6)
    # torso boulders
    S = add(hip, up, 22)
    c.poly_s([add(hip, (-13, 2)), add(add(hip, up, 10), (-15, 0)), add(S, (-16, 2)), add(S, (-6, -6)), add(S, (10, -5)), add(S, (17, 4)), add(add(hip, up, 8), (14, 0)), add(hip, (12, 3))], R, sh_w=2.2)
    c.ellipse_s(add(hip, up, 12)[0], add(hip, up, 12)[1], 5, 3.5, D, hi=False)
    # runes
    c.glow(*add(hip, up, 14), 4, (90, 200, 255), 150)
    c.pixel(*add(hip, up, 14), (220, 250, 255))
    # arms (back arm behind, front arm big)
    for side, sh_off, r, extra in ((-1, (-13, 2), D, 0), (1, (14, 3), R, 1.5)):
        sh = add(S, sh_off)
        a = arm_a if side > 0 else (0.25 if anim != "attack" else arm_a * 0.5)
        el = add(sh, _dir(a), 12)
        hd = add(el, _dir(a + (0.3 if side > 0 else 0.4)), 12)
        c.capsule_s(sh, el, 5 + extra, r)
        c.capsule_s(el, hd, 4.5 + extra, r)
        c.ellipse_s(hd[0], hd[1], 6.5 + extra, 5.5 + extra, r, sh_w=1.6)
    # head
    hd = add(S, up, 5)
    hd = add(hd, (3, 0))
    c.poly_s([add(hd, (-6, 4)), add(hd, (-5, -5)), add(hd, (4, -6)), add(hd, (8, 0)), add(hd, (6, 5))], R)
    c.glow(hd[0] + 3, hd[1] - 1, 2.5, (90, 200, 255), 220)
    c.pixel(hd[0] + 3, hd[1] - 1, (240, 255, 255))


def myconid(c: Canvas, anim, t, size):
    cap = Ramp.from_color("#c84a5a", 1.1)
    spots = Ramp.from_color("#f8e8d0")
    stem = Ramp.from_color("#e8d8b8")
    cx, gy = size * 0.5, size * 0.9
    sq = 1 + 0.05 * math.sin(t * math.tau)
    dy = 0
    tilt = 0
    if anim == "attack":
        sq = [0.85, 1.2, 1.05, 1.0][int(t * 3)]
        tilt = [0.2, -0.4, -0.2, 0][int(t * 3)]
    if anim == "hurt":
        tilt = 0.3
    if anim == "death":
        dy = 10 * t
        sq = 1 - 0.4 * t
    # stubby legs / feet
    for ox in (-7, 5):
        c.capsule_s((cx + ox, gy - 6), (cx + ox + 2, gy - 1), 3.0, stem)
    # stem body with face
    c.poly_s([(cx - 9, gy - 4 + dy), (cx - 8, gy - 22 * sq + dy), (cx + 8, gy - 22 * sq + dy), (cx + 10, gy - 4 + dy)], stem, sh_w=2.0)
    ex, ey = cx + 2, gy - 15 * sq + dy
    for ox in (-3, 4):
        c.rect(ex + ox - 1, ey - 1, ex + ox + 1, ey + 1, (30, 20, 30))
        c.pixel(ex + ox, ey - 1, (250, 250, 250))
    c.line((ex - 2, ey + 4), (ex + 5, ey + 4 + (2 if anim == "attack" else 0)), 1.0, (90, 40, 40))
    # cap
    ccx, ccy = cx + tilt * 6, gy - 24 * sq + dy
    c.poly_s([(ccx - 20, ccy + 2), (ccx - 16, ccy - 8), (ccx - 6, ccy - 14), (ccx + 6, ccy - 14), (ccx + 17, ccy - 8), (ccx + 21, ccy + 2), (ccx + 12, ccy + 4), (ccx - 12, ccy + 4)], cap, sh_w=2.4)
    for sx, sy, r in ((-10, -4, 2.2), (2, -9, 2.6), (12, -3, 1.8), (-3, -2, 1.4)):
        c.ellipse_s(ccx + sx, ccy + sy, r, r * 0.8, spots, hi=False)
    if anim == "attack" and t > 0.2:
        for k in range(6):
            a = k * 1.05 + t
            c.glow(ccx + math.cos(a) * 18, ccy - 6 + math.sin(a) * 8 - 4, 2.5, (220, 120, 180), 160)


def scorpion(c: Canvas, anim, t, size):
    R = Ramp.from_color("#b8783a", 1.1)
    D = Ramp.from_color("#7a4a22")
    cx, gy = size * 0.5, size * 0.9
    sting = 0.0
    claws = 0.0
    dy = 0
    if anim == "idle":
        sting = 0.15 * math.sin(t * math.tau)
        claws = 0.1 * math.sin(t * math.tau)
    if anim == "attack":
        sting = [-0.4, -0.6, 1.6, 1.2][int(t * 3)]
        claws = [0.5, 0.6, 0.1, 0][int(t * 3)]
    if anim == "hurt":
        sting = -0.3
    if anim == "death":
        dy = 6 * t
        sting = -0.8 * t
    bx, by = cx - 2, gy - 9 + dy
    # legs
    for i, ox in enumerate((-12, -6, 0, 6)):
        ph = math.sin(t * math.tau + i) * 0.25 if anim == "idle" else 0
        top = (bx + ox, by + 2)
        kn = (bx + ox + 3 - i, by - 4 + ph * 2)
        ft = (bx + ox + 6 - i * 1.5, gy - 1)
        c.capsule_s(top, kn, 1.4, D)
        c.capsule_s(kn, ft, 1.1, D)
    # body segments
    for i in range(4):
        c.ellipse_s(bx - 10 + i * 6, by, 5.5 - i * 0.4, 4.5 - i * 0.3, R, sh_w=1.6)
    # head + claws
    hx, hy = bx + 12, by - 1
    c.ellipse_s(hx, hy, 6, 5, R, sh_w=1.6)
    c.pixel(hx + 4, hy - 2, (20, 10, 10))
    c.pixel(hx + 2, hy - 3, (20, 10, 10))
    for side, oy in ((-1, -4), (1, 2)):
        base = (hx + 4, hy + oy)
        el = add(base, _dir(1.2 + claws * side * 0.3), 7)
        c.capsule_s(base, el, 2.2, R if side > 0 else D)
        c.poly_s([el, add(el, (7, -2 - claws * 4)), add(el, (5, 1)), add(el, (7, 3 + claws * 3)), add(el, (1, 3))], R if side > 0 else D)
    # tail
    p = (bx - 14, by - 2)
    ang = -1.7 - sting * 0.2
    pts = [p]
    for i in range(5):
        ang -= 0.5 + sting * 0.3
        p = add(p, _dir(ang), 6)
        pts.append(p)
    for a, b2 in zip(pts, pts[1:]):
        c.capsule_s(a, b2, 2.2, R)
    tip = add(pts[-1], _dir(ang - 0.6), 5)
    c.poly_s([add(pts[-1], (-2, -2)), tip, add(pts[-1], (2, 2))], D)
    c.pixel(tip[0], tip[1], (240, 120, 160))


def treant(c: Canvas, anim, t, size):
    bark = Ramp.from_color("#6a4a2a", 1.1)
    dark = Ramp.from_color("#3a2a18")
    leaf = Ramp.from_color("#3f8f3a", 1.2)
    cx, gy = size * 0.5, size * 0.92
    sway = math.sin(t * math.tau) * 1.5 if anim == "idle" else 0
    arm = 0.3
    dy = 0
    lean = 0
    if anim == "attack":
        arm = [-1.8, -2.4, 1.3, 1.0][int(t * 3)]
        lean = [-0.1, -0.15, 0.3, 0.25][int(t * 3)]
    if anim == "hurt":
        lean = -0.15
    if anim == "death":
        dy = 12 * t
        lean = 0.5 * t
    up = (math.sin(lean), -math.cos(lean))
    base = (cx, gy + dy)
    # roots
    for ox in (-12, -4, 5, 12):
        c.capsule_s((cx + ox * 0.5, gy - 6), (cx + ox, gy - 1), 2.5, dark, hi=False)
    top = add(base, up, 34)
    # trunk
    c.poly_s([add(base, (-11, 0)), add(add(base, up, 12), (-9, 0)), add(top, (-8, 0)), add(top, (9, 0)), add(add(base, up, 12), (10, 0)), add(base, (12, 0))], bark, sh_w=2.4)
    # face
    fx, fy = add(add(base, up, 20), (2, 0))
    c.poly([(fx - 4, fy - 2), (fx - 1, fy - 3), (fx - 1, fy), (fx - 4, fy)], dark.dark)
    c.poly([(fx + 3, fy - 2), (fx + 6, fy - 3), (fx + 6, fy), (fx + 3, fy)], dark.dark)
    c.glow(fx - 2.5, fy - 1.5, 1.5, (255, 220, 100), 220)
    c.glow(fx + 4.5, fy - 1.5, 1.5, (255, 220, 100), 220)
    c.poly([(fx - 3, fy + 5), (fx + 5, fy + 5), (fx + 4, fy + 7 + (2 if anim == "attack" else 0)), (fx - 2, fy + 7)], dark.dark)
    # arms (branches)
    for side, off, r in ((-1, (-9, -4), dark), (1, (9, -2), bark)):
        sh = add(top, off)
        a = arm if side > 0 else 0.4
        el = add(sh, _dir(a - 0.8 * side), 12)
        hd = add(el, _dir(a + 0.3), 10)
        c.capsule_s(sh, el, 3.2, r)
        c.capsule_s(el, hd, 2.4, r)
        for k in range(3):
            c.capsule_s(hd, add(hd, _dir(a + 0.3 + (k - 1) * 0.7), 5), 1.2, r, hi=False)
    # crown
    for ox, oy, rr in ((-10, -2, 8), (8, -3, 9), (-1, -9 + sway * 0.3, 10), (12, 4, 6), (-13, 5, 6)):
        c.ellipse_s(top[0] + ox + sway * 0.3, top[1] + oy - 4, rr, rr * 0.85, leaf, sh_w=2.0)


def drake(c: Canvas, anim, t, size):
    sc = Ramp.from_color("#c8402a", 1.15)
    belly = Ramp.from_color("#e8b060")
    wing = Ramp.from_color("#7a1e1e")
    horn = Ramp.from_color("#e8e0c8")
    cx, gy = size * 0.5, size * 0.9
    flap = math.sin(t * math.tau) if anim == "idle" else 0.3
    neck = 0
    dy = flap * 1.5
    if anim == "attack":
        neck = [-0.4, -0.6, 0.8, 0.6][int(t * 3)]
        flap = [0.8, 1, -0.5, -0.3][int(t * 3)]
        dy = [-2, -6, 4, 2][int(t * 3)]
    if anim == "hurt":
        neck = -0.4
    if anim == "death":
        dy = 16 * t
        neck = 0.9 * t
    bx, by = cx - 6, gy - 26 + dy
    # far wing
    c.poly_s([(bx - 4, by - 6), (bx - 30, by - 22 - flap * 10), (bx - 36, by - 4 - flap * 6), (bx - 16, by - 2)], wing, sh_w=2.0)
    # tail
    p = (bx - 16, by + 2)
    ang = -1.9
    pts = [p]
    for i in range(5):
        ang += 0.25 + 0.05 * flap
        p = add(p, _dir(ang), 8)
        pts.append(p)
    for i, (a, b2) in enumerate(zip(pts, pts[1:])):
        c.capsule_s(a, b2, 4.5 - i * 0.7, sc)
    c.poly_s([add(pts[-1], (-3, 3)), add(pts[-1], _dir(ang), 8), add(pts[-1], (3, -2))], horn)
    # hind leg
    c.capsule_s((bx - 8, by + 6), (bx - 12, by + 16), 4.5, sc)
    c.capsule_s((bx - 12, by + 16), (bx - 6, gy - 2 + dy * 0), 3.2, sc)
    c.capsule_s((bx - 6, gy - 2), (bx + 2, gy - 2), 2.6, sc, hi=False)
    # body
    c.ellipse_s(bx, by, 20, 13, sc, sh_w=2.4)
    c.ellipse_s(bx + 2, by + 6, 15, 6, belly, hi=False)
    # front leg
    c.capsule_s((bx + 10, by + 6), (bx + 14, by + 16), 4.0, sc)
    c.capsule_s((bx + 14, by + 16), (bx + 16, gy - 2), 3.0, sc)
    c.capsule_s((bx + 16, gy - 2), (bx + 24, gy - 2), 2.4, sc, hi=False)
    # neck + head
    n0 = (bx + 14, by - 6)
    n1 = add(n0, _dir(1.9 - 0.6 + neck * 0.5 - 1.6), 16)
    n2 = add(n1, _dir(1.9 + neck - 1.0), 12)
    c.capsule_s(n0, n1, 6, sc)
    c.capsule_s(n1, n2, 5, sc)
    hx, hy = n2
    c.ellipse_s(hx + 2, hy, 8, 6, sc, sh_w=1.8)
    open_m = 5 if anim == "attack" and t > 0.4 else 1
    c.poly_s([(hx + 2, hy - 3), (hx + 18, hy - 1), (hx + 17, hy + 2), (hx + 2, hy + 3)], sc)
    c.poly_s([(hx + 3, hy + 3), (hx + 16, hy + 2 + open_m), (hx + 3, hy + 4 + open_m * 0.6)], belly, hi=False)
    for k in range(4):
        c.pixel(hx + 6 + k * 3, hy + 2.2, (250, 250, 250))
    c.poly_s([(hx - 2, hy - 4), (hx - 8, hy - 14), (hx + 3, hy - 5)], horn)
    c.poly_s([(hx + 3, hy - 5), (hx + 1, hy - 13), (hx + 7, hy - 5)], horn)
    c.rect(hx + 6, hy - 3, hx + 9, hy - 1, (255, 220, 60))
    c.pixel(hx + 7.5, hy - 2, (20, 10, 10))
    if anim == "attack" and t > 0.4:
        c.glow(hx + 24, hy + 3, 9, (255, 140, 40), 180)
        c.glow(hx + 32, hy + 4, 6, (255, 220, 120), 200)
    # near wing
    c.poly_s([(bx + 2, by - 8), (bx - 22, by - 30 - flap * 12), (bx - 34, by - 8 - flap * 8), (bx - 14, by - 4)], wing, sh_w=2.4)
    c.line((bx + 2, by - 8), (bx - 22, by - 30 - flap * 12), 1.2, wing.dark)
    c.line((bx - 6, by - 8), (bx - 34, by - 8 - flap * 8), 1.0, wing.dark)


CREATURES = {
    "slime": (slime, 64),
    "wolf": (wolf, 64),
    "wraith": (wraith, 64),
    "golem": (golem, 80),
    "myconid": (myconid, 64),
    "scorpion": (scorpion, 64),
    "treant": (treant, 96),
    "drake": (drake, 128),
}


def render_creature(name):
    fn, size = CREATURES[name]
    frames = []
    for anim, t in creature_phases():
        c = Canvas(size, size)
        fn(c, anim, t, size)
        frames.append(c.render())
    return frames, size


# ---------------------------------------------------------------------------
# humanoid enemies built on the hero rig
# ---------------------------------------------------------------------------
GOBLIN = Body("male", 12.0, 10.5, 8.5, 8.5, 6.5, 6.5, 1.9, 1.7, 1.9, 8.0, 8.0, 2.4, 1.9, 7.0, 6.2, 1.5, 0.0, 0.5)
SKELETON = Body("male", 17.0, 12.5, 7.5, 8.0, 8.5, 8.0, 1.4, 1.2, 1.6, 12.0, 12.0, 1.6, 1.3, 6.6, 7.2, 1.1, 0.0, 0.8)
OGRE = Body("male", 22.0, 24.0, 20.0, 18.0, 12.0, 11.0, 4.6, 4.0, 3.6, 13.0, 11.0, 5.0, 4.0, 8.5, 8.0, 3.5, 0.0, 1.5)

HUMANOIDS = {
    # id: dict(body, skin, hair, hair_tint, armor, weapon, features, frame)
    "goblin":   dict(body=GOBLIN, skin="#7fb04a", hair="spiky", armor="hide_barbarian", weapon="dagger_iron", features="goblin", frame=80),
    "bandit":   dict(body=rigmod.MALE, skin="#d9a26f", hair="short", armor="leather_shadow", weapon="dagger_iron", features="mask", frame=80),
    "cultist":  dict(body=rigmod.FEMALE, skin="#e8d0c0", hair="long", armor="robe_apprentice", weapon="staff_oak", features="hood", frame=80),
    "skeleton": dict(body=SKELETON, skin="#e8e0d0", hair=None, armor=None, weapon="sword_iron", features="skull", frame=80),
    "harpy":    dict(body=rigmod.FEMALE, skin="#f4c7a5", hair="long", armor="hide_warlord", weapon=None, features="wings", frame=96),
    "ogre":     dict(body=OGRE, skin="#8a9a5a", hair=None, armor="hide_warlord", weapon="mace_iron", features="ogre", frame=128, wscale=2.2),
    "lich":     dict(body=SKELETON, skin="#c8d0d8", hair=None, armor="robe_arch", weapon="staff_arcane", features="skull", frame=96),
}

HUMANOID_ANIMS = ["idle", "attack_swing", "attack_staff", "cast", "hurt", "ko", "victory"]


def render_humanoid(name):
    spec = HUMANOIDS[name]
    body = spec["body"]
    size = spec["frame"]
    frames, index = anim_frames()
    out = []
    new_index = {}
    hero.SKIN_TONES["_enemy"] = spec["skin"]
    legs = body.thigh + body.shin + 2.5
    rigmod.set_frame(size, size, size * 0.47, size * 0.9 - legs)
    try:
        for an in HUMANOID_ANIMS:
            info = index[an]
            new_index[an] = dict(info)
            new_index[an]["start"] = len(out)
            for k in range(info["count"]):
                _, _, pose = frames[info["start"] + k]
                rig = solve(body, dict(pose))
                layers = hero.draw_body(rig, "_enemy")
                arm = armor.draw_armor(rig, spec["armor"]) if spec["armor"] else [None, None, None]
                hair_c = hero.draw_hair(rig, spec["hair"]) if spec["hair"] else None
                wep = hero.draw_weapon(rig, spec["weapon"], an, spec.get("wscale", 1.0)) if spec["weapon"] else None
                order = [_features(rig, spec["features"], "back"), layers[0], arm[0], layers[1], arm[1], hair_c,
                         layers[2], arm[2], wep, _features(rig, spec["features"], "front")]
                from PIL import Image
                img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
                for L in order:
                    if L is not None:
                        img = Image.alpha_composite(img, L.render())
                out.append(img)
    finally:
        rigmod.reset_frame()
    return out, size, new_index


def _features(rig, kind, stage):
    """Extra creature features (ears, wings, masks, hoods)."""
    hx, hy = rig.head
    b = rig.body
    if kind == "goblin" and stage == "front":
        c = Canvas(*rigmod.FRAME)
        ear = Ramp.from_color("#6f9a3a")
        c.poly_s([(hx - 4, hy - 1), (hx - 12, hy - 6), (hx - 3, hy + 2)], ear)
        c.poly_s([(hx + 5, hy + 1), (hx + 10, hy + 0.5), (hx + 7, hy + 3)], ear, hi=False)  # nose
        c.rect(hx + 2, hy - 1.5, hx + 5, hy + 0.5, (240, 60, 40))
        c.rect(hx + 1, hy + 3, hx + 5, hy + 4, (230, 230, 230))
        return c
    if kind == "mask" and stage == "front":
        c = Canvas(*rigmod.FRAME)
        c.poly_s([(hx - 4, hy + 1), (hx + 9, hy + 0.5), (hx + 8, hy + 5), (hx - 2, hy + 7)], Ramp.from_color("#8a2a2a"), hi=False)
        c.poly_s([(hx - 6, hy - 6), (hx + 8, hy - 7), (hx + 9, hy - 3), (hx - 7, hy - 2)], Ramp.from_color("#3a3a4a"), hi=False)
        return c
    if kind == "hood" and stage == "front":
        c = Canvas(*rigmod.FRAME)
        R = Ramp.from_color("#2e2450")
        c.poly_s([(hx - 8, hy + 6), (hx - 9, hy - 4), (hx - 3, hy - 10), (hx + 5, hy - 10), (hx + 10, hy - 4), (hx + 9, hy - 1), (hx + 4, hy - 3), (hx + 2, hy + 4)], R, sh_w=1.6)
        return c
    if kind == "skull" and stage == "front":
        c = Canvas(*rigmod.FRAME)
        dark = (20, 16, 30)
        c.rect(hx + 1, hy - 2, hx + 4, hy + 1, dark)
        c.pixel(hx + 2, hy - 1, (200, 60, 60))
        c.rect(hx + 5, hy + 1, hx + 7, hy + 2, dark)
        for k in range(3):
            c.rect(hx + 1 + k * 2, hy + 3.5, hx + 2 + k * 2, hy + 5, dark)
        # ribs on the core torso
        ch = rig.chest
        for k in range(3):
            c.line(add(ch, (-3, -3 + k * 2.4)), add(ch, (4, -3 + k * 2.4)), 0.7, (120, 112, 100))
        return c
    if kind == "wings" and stage == "back":
        c = Canvas(*rigmod.FRAME)
        W = Ramp.from_color("#6a3a3a", 1.2)
        F = Ramp.from_color("#c8907a")
        S = rig.shoulder
        flap = math.sin(rig.pose["dy"]) * 3
        for side in (-1, 1):
            base = add(S, (-3 - side * 2, -1))
            tip = (base[0] - 26 + side * 4, base[1] - 22 - flap + side * 5)
            mid = (base[0] - 14, base[1] - 20 - flap)
            c.poly_s([base, mid, tip, (tip[0] + 6, tip[1] + 14), (base[0] - 8, base[1] + 10)], W if side > 0 else F, sh_w=2.0)
            for k in range(4):
                c.line(base, ((tip[0] * (k + 1) + (base[0] - 8) * (3 - k)) / 4, (tip[1] * (k + 1) + (base[1] + 10) * (3 - k)) / 4), 0.8, W.dark)
        return c
    if kind == "wings" and stage == "front":
        c = Canvas(*rigmod.FRAME)
        T = Ramp.from_color("#e8d060")
        for side in ("f", "b"):
            f = getattr(rig, "f" + side)
            for k in range(3):
                c.line(add(f, (0, 0)), add(f, (2 + k * 1.5, 2.5)), 0.9, T.mid)
        return c
    if kind == "ogre" and stage == "front":
        c = Canvas(*rigmod.FRAME)
        c.poly_s([(hx + 6, hy + 4), (hx + 8, hy - 2), (hx + 10, hy + 5)], Ramp.from_color("#f0e8d0"))  # tusk
        c.rect(hx + 2, hy - 2, hx + 5, hy + 1, (250, 200, 60))
        c.pixel(hx + 3.5, hy - 1, (20, 10, 10))
        return c
    return None
