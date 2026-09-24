"""Hero paper-doll layers: body (3 rows), hair, weapons."""
from __future__ import annotations

import math

from raster import Canvas, Ramp, add_outline, rot_pt, hex_to_rgb, mix, darken, lighten
import rig as rigmod
from rig import FW, FH, Rig, Body, solve, add, _dir

SKIN_TONES = {
    "fair": "#f4c7a5",
    "olive": "#d9a26f",
    "tan": "#b97a4b",
    "deep": "#7a4a30",
}
UNDER_M = Ramp.from_color("#4a4658")
UNDER_F = Ramp.from_color("#5a4a68")
EYE_WHITE = (245, 245, 250)
EYE_DARK = (30, 24, 40)
LIP = (214, 110, 128)
BROW = (60, 44, 48)


def skin_ramps(tone: str):
    base = hex_to_rgb(SKIN_TONES[tone])
    front = Ramp.from_color(base, 1.0)
    back = Ramp(darken(front.dark, 0.15), darken(front.mid, 0.22), darken(front.light, 0.22), darken(front.hi, 0.22))
    return front, back


def back_ramp(r: Ramp) -> Ramp:
    return Ramp(darken(r.dark, 0.18), darken(r.mid, 0.22), darken(r.light, 0.22), darken(r.hi, 0.22))


# ---------------------------------------------------------------------------
# BODY
# ---------------------------------------------------------------------------
def draw_body(rig: Rig, tone: str) -> list[Canvas]:
    """Returns [back, core, front] canvases."""
    b = rig.body
    fem = b.gender == "female"
    front, back = skin_ramps(tone)
    under = UNDER_F if fem else UNDER_M
    L = [Canvas(*rigmod.FRAME) for _ in range(3)]
    cb, cc, cf = L

    # ---- back layer: back arm, back leg
    _leg(cb, rig, "b", back, b)
    _arm(cb, rig, "b", back, b)

    # ---- core: front leg, torso, neck, head
    _leg(cc, rig, "f", front, b)
    cc.poly_s(rig.torso, front, sh_w=1.6)
    if fem:
        # bust curve
        bx = add(add(rig.hip, rig.right, b.shoulder_w * 0.5 + b.bust - 0.4), rig.up, b.torso_len * 0.70)
        cc.ellipse_s(bx[0], bx[1], 2.4, 2.1, front, hi_w=0.8)
    # underwear (hidden by armour but keeps the doll decent)
    hip = rig.hip
    hw = b.hip_w
    cc.poly_s([
        add(add(hip, rig.right, -hw * 0.5), rig.up, 1.5), add(add(hip, rig.right, hw * 0.5 + 0.6), rig.up, 1.5),
        add(add(hip, rig.right, hw * 0.5 + 0.4), rig.up, -3.5), add(add(hip, rig.right, -hw * 0.5 - 0.2), rig.up, -3.5),
    ], under, hi=False)
    if fem:
        c = add(rig.hip, rig.up, b.torso_len * 0.66)
        cc.poly_s([
            add(add(c, rig.right, -b.shoulder_w * 0.5 + 0.5), rig.up, 2.2), add(add(c, rig.right, b.shoulder_w * 0.5 + 2.5), rig.up, 2.4),
            add(add(c, rig.right, b.shoulder_w * 0.5 + 1.6), rig.up, -2.4), add(add(c, rig.right, -b.waist_w * 0.5 - 0.5), rig.up, -2.2),
        ], under, hi=False)
    # neck
    cc.capsule_s(rig.neck, add(rig.head, (0, b.head_ry * 0.6)), b.neck_r, front, hi=False)
    _head(cc, rig, front, b)

    # ---- front layer: front arm
    _arm(cf, rig, "f", front, b)
    return L


def _leg(c: Canvas, rig: Rig, side: str, ramp: Ramp, b: Body):
    hp = rig.hipf if side == "f" else rig.hipb
    k = getattr(rig, "k" + side)
    a = getattr(rig, "a" + side)
    f = getattr(rig, "f" + side)
    tr = b.thigh_r
    c.capsule_s(add(hp, (0, -1.0)), k, tr, ramp)
    c.capsule_s(k, a, b.shin_r, ramp)
    # foot
    c.capsule_s(add(a, (0, 0.6)), f, b.shin_r * 0.8, ramp, hi=False)


def _arm(c: Canvas, rig: Rig, side: str, ramp: Ramp, b: Body):
    sh = rig.sf if side == "f" else rig.sb
    e = getattr(rig, "e" + side)
    h = getattr(rig, "h" + side)
    c.capsule_s(sh, e, b.arm_r, ramp)
    c.capsule_s(e, h, b.fore_r, ramp)
    c.circle(h[0], h[1], b.hand_r, ramp.mid)
    c.ellipse_s(h[0], h[1], b.hand_r, b.hand_r, ramp, hi_w=0.7, sh_w=0.9)


def _head(c: Canvas, rig: Rig, ramp: Ramp, b: Body):
    hx, hy = rig.head
    fem = b.gender == "female"
    rx, ry = b.head_rx, b.head_ry
    # skull
    c.ellipse_s(hx, hy, rx, ry, ramp, sh_w=1.5)
    # jaw / chin
    if fem:
        c.poly_s([(hx - rx * 0.55, hy + ry * 0.35), (hx + rx * 0.95, hy + ry * 0.25), (hx + rx * 0.55, hy + ry * 0.95), (hx - rx * 0.2, hy + ry * 0.9)], ramp, hi=False)
    else:
        c.poly_s([(hx - rx * 0.7, hy + ry * 0.3), (hx + rx * 1.05, hy + ry * 0.2), (hx + rx * 0.85, hy + ry * 1.0), (hx - rx * 0.35, hy + ry * 1.0)], ramp, hi=False)
    # ear
    c.ellipse_s(hx - rx * 0.35, hy + 0.6, 1.1, 1.5, ramp, hi=False)
    # nose
    c.poly(([(hx + rx * 0.95, hy - 0.4), (hx + rx * 1.35, hy + 1.3), (hx + rx * 0.9, hy + 1.6)]), ramp.mid)
    c.pixel(hx + rx * 1.1, hy + 1.2, ramp.dark)
    # eye
    ex, ey = hx + rx * 0.45, hy - 0.6
    closed = rig.pose.get("face", 0) > 0.5
    if closed:
        c.rect(ex - 1, ey + 0.5, ex + 2, ey + 1.5, EYE_DARK)
    else:
        c.rect(ex - 1, ey - 0.5, ex + 2, ey + 1.5, EYE_WHITE)
        c.rect(ex, ey - 0.5, ex + 2, ey + 1.5, (70, 110, 200) if fem else (60, 90, 60))
        c.rect(ex + 1, ey - 0.5, ex + 2, ey + 0.5, EYE_DARK)
        c.rect(ex, ey + 0.5, ex + 1, ey + 1.5, EYE_DARK)
        if fem:
            c.rect(ex - 1, ey - 1.5, ex + 3, ey - 0.5, EYE_DARK)   # lashes
            c.pixel(ex + 2.5, ey - 0.5, EYE_DARK)
    # brow
    c.rect(ex - 1, ey - 2.5 if not fem else ey - 2.3, ex + 2, ey - 1.5 if not fem else ey - 1.6, BROW if not fem else darken(ramp.dark, 0.3))
    # mouth
    if fem:
        c.rect(hx + rx * 0.75, hy + 2.6, hx + rx * 0.75 + 2, hy + 3.4, LIP)
    else:
        c.rect(hx + rx * 0.7, hy + 2.8, hx + rx * 0.7 + 2, hy + 3.4, ramp.dark)
    # cheek blush
    if fem:
        c.pixel(hx + rx * 0.3, hy + 1.6, mix(ramp.mid, LIP, 0.35))


# ---------------------------------------------------------------------------
# HAIR (rendered in greyscale, tinted with modulate in-engine)
# ---------------------------------------------------------------------------
HAIR_RAMP = Ramp((92, 92, 104), (150, 150, 160), (196, 196, 206), (236, 236, 244))

HAIR_STYLES = ["short", "spiky", "swept", "ponytail", "long", "bob", "braid", "bun"]


def draw_hair(rig: Rig, style: str) -> Canvas:
    c = Canvas(*rigmod.FRAME)
    b = rig.body
    hx, hy = rig.head
    rx, ry = b.head_rx + 0.9, b.head_ry + 0.9
    R = HAIR_RAMP
    p = rig.pose
    bob = 0.0
    # hair swing follows head motion a little
    sway = -p["dx"] * 0.12 - rig.lean * 2.0

    def cap(extra_front=0.0, extra_back=0.0, top=0.0):
        # skull cap that leaves the face open (hairline sits above the brow)
        pts = [
            (hx - rx - extra_back, hy + 2.0),
            (hx - rx - extra_back * 0.6, hy - ry * 0.45),
            (hx - rx * 0.5, hy - ry - top),
            (hx + rx * 0.35, hy - ry - top - 0.3),
            (hx + rx * 0.95 + extra_front, hy - ry * 0.62),
            (hx + rx * 0.72 + extra_front * 0.5, hy - ry * 0.46),
            (hx + rx * 0.25, hy - ry * 0.50),
            (hx - rx * 0.30, hy - ry * 0.40),
            (hx - rx * 0.70, hy - ry * 0.10),
        ]
        c.poly_s(pts, R, sh_w=1.6)

    if style == "short":
        cap(0.3, 0.2, 0.4)
        c.poly_s([(hx - 0.5, hy - ry - 0.6), (hx + 2.5, hy - ry - 1.6), (hx + rx * 1.05, hy - ry * 0.55), (hx + 1, hy - ry * 0.45)], R)
    elif style == "spiky":
        cap(0.2, 0.3, 0.2)
        for i, (ox, oy, l) in enumerate([(-4.5, -3, 3.5), (-2.2, -4.6, 4.2), (0.6, -5.2, 4.5), (3.0, -4.2, 4.0), (4.8, -2.4, 3.2)]):
            ang = -0.9 + i * 0.45
            tip = (hx + ox + math.sin(ang) * l, hy - ry + oy - math.cos(ang) * l * 0.9)
            c.poly_s([(hx + ox - 1.6, hy - ry + oy + 2.5), tip, (hx + ox + 1.6, hy - ry + oy + 2.5)], R, hi=False)
    elif style == "swept":
        cap(1.2, 0.4, 0.6)
        c.poly_s([(hx - rx * 0.6, hy - ry - 0.8), (hx + rx * 0.4, hy - ry - 1.4), (hx + rx * 1.5, hy - ry * 0.5), (hx + rx * 1.3, hy - ry * 0.3), (hx + rx * 0.7, hy - ry * 0.45)], R)
    elif style == "ponytail":
        cap(0.4, 0.4, 0.3)
        tail_base = (hx - rx * 0.85, hy - ry * 0.35)
        tail_tip = (hx - rx - 5.5 + sway, hy + 7.5)
        c.capsule_s(tail_base, ((tail_base[0] + tail_tip[0]) / 2 - 1, (tail_base[1] + tail_tip[1]) / 2), 2.2, R)
        c.capsule_s(((tail_base[0] + tail_tip[0]) / 2 - 1, (tail_base[1] + tail_tip[1]) / 2), tail_tip, 1.5, R)
        c.circle(tail_base[0], tail_base[1], 1.4, (120, 40, 60))
    elif style == "long":
        # flowing hair down the back to mid-torso
        back = [
            (hx - rx * 0.2, hy - ry - 0.5), (hx - rx - 0.8, hy - ry * 0.3), (hx - rx - 2.6 + sway * 0.5, hy + 6),
            (hx - rx - 3.4 + sway, hy + 15), (hx - rx - 1.4 + sway, hy + 16.5), (hx - rx + 3.5 + sway * 0.6, hy + 12),
            (hx - rx + 3.0, hy + 3), (hx - rx * 0.1, hy + 0.5)
        ]
        c.poly_s(back, R, sh_w=1.8)
        cap(0.5, 0.6, 0.6)
        # front lock framing the face
        c.poly_s([(hx + rx * 0.85, hy - ry * 0.75), (hx + rx * 1.25, hy - ry * 0.45), (hx + rx * 1.15, hy - ry * 0.1), (hx + rx * 0.95, hy - ry * 0.2)], R)
    elif style == "bob":
        cap(0.6, 1.4, 0.7)
        c.poly_s([(hx - rx - 1.6, hy - ry * 0.4), (hx - rx - 2.4, hy + 4.5), (hx - rx + 0.5, hy + 5.5), (hx + rx * 0.2, hy + 4.0), (hx - rx * 0.1, hy + 0.5), (hx - rx * 0.6, hy + 0.5)], R)
        c.poly_s([(hx + rx * 0.85, hy - ry * 0.75), (hx + rx * 1.25, hy - ry * 0.4), (hx + rx * 1.1, hy - ry * 0.05), (hx + rx * 0.95, hy - ry * 0.2)], R)
    elif style == "braid":
        cap(0.5, 0.6, 0.5)
        base = (hx - rx * 0.8, hy + 0.5)
        pts = [base]
        for i in range(1, 6):
            pts.append((base[0] - 1.2 * i + sway * i / 5, base[1] + 3.2 * i))
        for p0, p1 in zip(pts, pts[1:]):
            c.capsule_s(p0, p1, 1.8, R)
        for p0 in pts[1:]:
            c.circle(p0[0] - 0.6, p0[1] - 1.2, 0.9, R.dark)
        c.circle(pts[-1][0], pts[-1][1] + 1.2, 1.1, (120, 40, 60))
        c.poly_s([(hx + rx * 0.85, hy - ry * 0.75), (hx + rx * 1.2, hy - ry * 0.45), (hx + rx * 1.05, hy - ry * 0.15), (hx + rx * 0.95, hy - ry * 0.25)], R)
    elif style == "bun":
        cap(0.4, 0.3, 0.3)
        c.ellipse_s(hx - rx * 0.65, hy - ry * 0.75, 3.0, 2.8, R)
        c.poly_s([(hx + rx * 0.85, hy - ry * 0.75), (hx + rx * 1.2, hy - ry * 0.45), (hx + rx * 1.05, hy - ry * 0.2), (hx + rx * 0.95, hy - ry * 0.3)], R)
    return c


# ---------------------------------------------------------------------------
# WEAPONS  -  drawn in the front hand
# ---------------------------------------------------------------------------
WEAPONS = {
    # id: (kind, blade/head colour, hilt colour, accent colour, scale)
    "sword_iron": ("sword", "#c8ccd8", "#6b4a2a", "#b08a3a", 1.0),
    "sword_steel": ("sword", "#dfe6f4", "#3a3a55", "#c9a13a", 1.05),
    "sword_flame": ("sword", "#ff9a3a", "#5a1a1a", "#ffd86a", 1.1),
    "sword_mythril": ("sword", "#9fe8ff", "#2a3a6a", "#e8f8ff", 1.15),
    "dagger_iron": ("dagger", "#c8ccd8", "#4a3a2a", "#a08a6a", 1.0),
    "dagger_shadow": ("dagger", "#8a6ad0", "#2a1a3a", "#e0c8ff", 1.05),
    "bow_hunting": ("bow", "#8a5a2a", "#e8e0c0", "#5a3a1a", 1.0),
    "bow_elven": ("bow", "#5ad08a", "#f0ffe8", "#2a6a3a", 1.1),
    "staff_oak": ("staff", "#8a5a2a", "#6a3aff", "#c8a0ff", 1.0),
    "staff_arcane": ("staff", "#3a3a6a", "#ffcf5c", "#ffffff", 1.1),
    "axe_iron": ("axe", "#c0c4d0", "#6a4a2a", "#8a8a9a", 1.0),
    "axe_war": ("axe", "#e0b060", "#3a2a2a", "#ffe8a0", 1.15),
    "mace_iron": ("mace", "#b8bcc8", "#5a4a3a", "#e8e8f0", 1.0),
    "mace_holy": ("mace", "#ffd86a", "#f0f0ff", "#ffffff", 1.1),
}


def draw_weapon(rig: Rig, wid: str, anim_name: str = "", wscale: float = 1.0) -> Canvas:
    kind, cblade, chilt, cacc, sc = WEAPONS[wid]
    sc *= wscale
    c = Canvas(*rigmod.FRAME)
    p = rig.pose
    hand = rig.hf
    w = p["wpn"]
    if kind == "bow" and anim_name != "attack_bow":
        w = 0.18 + (p["wpn"] - 2.55) * 0.15   # bows are carried upright
    if kind == "staff" and anim_name not in ("attack_staff", "cast"):
        w = min(w, 0.5)
    d = (math.sin(w), -math.cos(w))           # along the weapon toward the tip
    n = (math.cos(w), math.sin(w))            # perpendicular
    RB, RH, RA = Ramp.from_color(cblade), Ramp.from_color(chilt), Ramp.from_color(cacc)

    def P(t, s=0.0):
        return (hand[0] + d[0] * t + n[0] * s, hand[1] + d[1] * t + n[1] * s)

    if kind in ("sword", "dagger"):
        blade = (18 if kind == "sword" else 9) * sc
        bw = (2.2 if kind == "sword" else 1.6) * sc
        # pommel + grip
        c.capsule_s(P(-4.0 * sc), P(1.6), 1.0, RH, hi=False)
        c.circle(*P(-4.2 * sc), 1.4, RA.mid)
        # guard
        c.poly_s([P(1.6, -3.6 * sc), P(2.8, -3.6 * sc), P(2.8, 3.6 * sc), P(1.6, 3.6 * sc)], RA, hi=False)
        # blade with fuller
        c.poly_s([P(2.8, -bw), P(2.8 + blade * 0.82, -bw), P(2.8 + blade, 0), P(2.8 + blade * 0.82, bw), P(2.8, bw)], RB, sh_w=1.0, hi_w=0.7)
        c.line(P(4, 0), P(2.8 + blade * 0.7, 0), 0.6, RB.dark)
        if wid == "sword_flame":
            c.glow(*P(2.8 + blade * 0.5), 6, (255, 120, 40), 90)
    elif kind == "axe":
        c.capsule_s(P(-6 * sc), P(14 * sc), 1.1, RH, hi=False)
        hx = 11.5 * sc
        c.poly_s([P(hx - 2, 0), P(hx - 3.5, -6.5 * sc), P(hx + 4.5, -7.5 * sc), P(hx + 6.5, -1.5), P(hx + 6.5, 1.5), P(hx + 4.5, 7.5 * sc), P(hx - 3.5, 6.5 * sc), P(hx + 2, 0)], RB, sh_w=1.2)
        c.circle(*P(hx, 0), 1.5, RA.mid)
    elif kind == "mace":
        c.capsule_s(P(-5 * sc), P(12 * sc), 1.1, RH, hi=False)
        hx = 13.5 * sc
        c.ellipse_s(*P(hx), 3.4 * sc, 3.4 * sc, RB)
        for i in range(6):
            a = i * math.tau / 6
            q = P(hx + math.cos(a) * 3.6 * sc, math.sin(a) * 3.6 * sc)
            c.circle(q[0], q[1], 1.0, RB.light)
        if wid == "mace_holy":
            c.glow(*P(hx), 6, (255, 230, 150), 90)
    elif kind == "staff":
        c.capsule_s(P(-22 * sc), P(16 * sc), 1.2, RB, hi=False)
        top = P(17 * sc)
        # crescent / crook holding the gem
        c.poly_s([P(15, -3.2), P(21.5, -4.5), P(23.5, 0), P(21.5, 4.5), P(15, 3.2), P(18, 0)], RB, hi=False)
        g = p["glow"]
        c.ellipse_s(top[0] + d[0] * 2, top[1] + d[1] * 2, 2.6, 2.6, RH)
        c.glow(top[0] + d[0] * 2, top[1] + d[1] * 2, 4 + 5 * g, hex_to_rgb(cacc), int(80 + 120 * g))
    elif kind == "bow":
        # bow is held upright, limbs arc forward; string drawn back by `draw`
        draw = p["draw"]
        top, bot = P(19 * sc, 0), P(-19 * sc, 0)
        mid = P(0, 4.5 * sc)
        pts = []
        N = 12
        for i in range(N + 1):
            t = i / N
            x = (1 - t) ** 2 * bot[0] + 2 * (1 - t) * t * (mid[0] + n[0] * 4) + t * t * top[0]
            y = (1 - t) ** 2 * bot[1] + 2 * (1 - t) * t * (mid[1] + n[1] * 4) + t * t * top[1]
            pts.append((x, y))
        for a, b2 in zip(pts, pts[1:]):
            c.capsule_s(a, b2, 1.35, RB, hi=False)
        # limb tips
        c.circle(*top, 1.2, RA.mid)
        c.circle(*bot, 1.2, RA.mid)
        c.capsule_s(P(-3.5, 1.0), P(3.5, 1.0), 1.7, RH, hi=False)
        # string
        pull = P(-1.0 - 10 * draw, -1.0)
        c.line(top, pull, 0.6, hex_to_rgb(cacc))
        c.line(bot, pull, 0.6, hex_to_rgb(cacc))
        if draw > 0.05:
            # nocked arrow lies across the grip, pointing forward
            tip = (pull[0] + n[0] * 22, pull[1] + n[1] * 22)
            c.line(pull, tip, 1.0, (140, 95, 45))
            c.poly([add(tip, n, 3.0), add(tip, d, 1.4), add(tip, d, -1.4)], (210, 214, 225))
            c.poly([pull, add(pull, n, 3.5), add(add(pull, n, 1.5), d, 2.0)], (220, 60, 60))
            c.poly([pull, add(pull, n, 3.5), add(add(pull, n, 1.5), d, -2.0)], (220, 60, 60))
    return c
