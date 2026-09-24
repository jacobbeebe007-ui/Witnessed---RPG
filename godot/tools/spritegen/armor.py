"""Armour paper-doll layers (3 rows: back / core / front) with distinct
feminine and masculine silhouettes for every armour family."""
from __future__ import annotations

import math

from raster import Canvas, Ramp, hex_to_rgb, darken, lighten, mix
import rig as rigmod
from rig import FW, FH, Rig, Body, add, _dir
from hero import back_ramp

# id: (family, main, secondary, trim/metal, leather)
ARMORS = {
    "cloth_tunic":       ("tunic",    "#6f8f4a", "#c9b07a", "#8a6a3a", "#5a3a22"),
    "cloth_traveler":    ("tunic",    "#4a6f9f", "#e0d0a0", "#b08a3a", "#4a2e1a"),
    "robe_apprentice":   ("robe",     "#6a4ab8", "#3a2a6a", "#ffcf5c", "#3a2a3a"),
    "robe_arch":         ("robe",     "#1e2a6a", "#5a7ad8", "#ffe28a", "#2a1a3a"),
    "leather_scout":     ("leather",  "#8a5a34", "#c98f5a", "#b8b8c8", "#4a2e1a"),
    "leather_shadow":    ("leather",  "#2e2838", "#6a4a8a", "#c8b8ff", "#1a1420"),
    "chain_mail":        ("chain",    "#8a90a0", "#b83a3a", "#d8dce8", "#4a3a2a"),
    "chain_knight":      ("chain",    "#a8b0c0", "#2a4aa0", "#f0f0ff", "#4a3a2a"),
    "plate_steel":       ("plate",    "#b8bcc8", "#8a4aa0", "#e8d070", "#3a3040"),
    "plate_royal":       ("plate",    "#e0c060", "#f0f0ff", "#ffffff", "#5a4020"),
    "plate_mythril":     ("plate",    "#a8e8f8", "#2a4a8a", "#ffffff", "#2a3a5a"),
    "hide_barbarian":    ("hide",     "#7a5a3a", "#a08060", "#c8c0a0", "#4a3020"),
    "hide_warlord":      ("hide",     "#3a2a2a", "#8a2a2a", "#e8c060", "#2a1a1a"),
    "ranger_jerkin":     ("ranger",   "#3f7a3a", "#7a5a34", "#c9a55c", "#3a2a18"),
    "ranger_elder":      ("ranger",   "#2a7a7a", "#5a4a8a", "#e8e0a0", "#2a3a3a"),
    "vestment_acolyte":  ("vestment", "#ece4d8", "#c8a040", "#ffe8a0", "#6a4a2a"),
    "vestment_inquisitor": ("vestment", "#2a2030", "#a02a2a", "#ffd86a", "#1a1420"),
}


class Pal:
    def __init__(self, spec):
        fam, main, sec, trim, leather = spec
        self.family = fam
        self.main = Ramp.from_color(main, 1.15 if fam in ("plate", "chain") else 1.0)
        self.sec = Ramp.from_color(sec)
        self.trim = Ramp.from_color(trim, 0.9)
        self.leather = Ramp.from_color(leather, 0.8)
        self.metal = Ramp.from_color("#c8ccd8", 1.1)
        self.fur = Ramp.from_color(mix(hex_to_rgb(main), (60, 40, 30), 0.3), 1.2)


def torso_poly(rig: Rig, expand=0.8, waist=1.0, chest=0.0, shoulders=0.0, top=0.6, bottom=-1.5, boxy=False, bust=None):
    """Build an armour torso outline from the same measurements as the body."""
    b = rig.body
    hip, up, right = rig.hip, rig.up, rig.right
    sw = b.shoulder_w + shoulders * 2 + expand * 2
    ww = (b.waist_w * waist if not boxy else b.shoulder_w * 0.9) + expand * 2
    hw = b.hip_w + expand * 2
    L = b.torso_len
    bu = b.bust if bust is None else bust
    pts = [
        add(add(hip, right, -hw * 0.5), up, bottom),
        add(add(hip, right, -ww * 0.5 - 0.6), up, L * 0.42),
        add(add(hip, right, -sw * 0.5 + 0.2), up, L * 0.82),
        add(add(hip, right, -sw * 0.5 + 1.5), up, L + top),
        add(add(hip, right, sw * 0.5 - 1.0), up, L + top),
        add(add(hip, right, sw * 0.5 + 0.4 + chest), up, L * 0.86),
        add(add(hip, right, sw * 0.5 + 0.9 + bu + chest), up, L * 0.70),
        add(add(hip, right, ww * 0.5 + 0.2 + bu * 0.2), up, L * 0.48),
        add(add(hip, right, ww * 0.5 + 0.1), up, L * 0.32),
        add(add(hip, right, hw * 0.5 + 0.6), up, 1.0),
        add(add(hip, right, hw * 0.5 + 0.2), up, bottom),
    ]
    return pts


def sleeve(c: Canvas, rig: Rig, side: str, ramp: Ramp, upper=True, lower=True, extra=0.7, flare=0.0):
    b = rig.body
    sh = rig.sf if side == "f" else rig.sb
    e = getattr(rig, "e" + side)
    h = getattr(rig, "h" + side)
    if upper:
        c.capsule_s(sh, add(e, _dir(rig.arm_f_ang[0] if side == "f" else rig.arm_b_ang[0]), -0.5), b.arm_r + extra, ramp)
    if lower:
        a2 = (rig.arm_f_ang if side == "f" else rig.arm_b_ang)[1]
        end = add(h, _dir(a2), -1.2)
        c.capsule_s(add(e, _dir(a2), 0.5), end, b.fore_r + extra * 0.8, ramp)
        if flare > 0:
            n = (math.cos(a2), -math.sin(a2))
            c.poly_s([add(add(e, _dir(a2), 3), n, -(b.fore_r + extra)), add(add(e, _dir(a2), 3), n, (b.fore_r + extra)),
                      add(add(end, n, (b.fore_r + extra + flare)), _dir(a2), 1.5), add(add(end, n, -(b.fore_r + extra + flare)), _dir(a2), 1.5)], ramp)


def bracer(c: Canvas, rig: Rig, side: str, ramp: Ramp, extra=0.6):
    b = rig.body
    e = getattr(rig, "e" + side)
    h = getattr(rig, "h" + side)
    a2 = (rig.arm_f_ang if side == "f" else rig.arm_b_ang)[1]
    c.capsule_s(add(e, _dir(a2), b.forearm * 0.4), add(h, _dir(a2), -1.3), b.fore_r + extra, ramp)


def gauntlet(c: Canvas, rig: Rig, side: str, ramp: Ramp):
    b = rig.body
    h = getattr(rig, "h" + side)
    a2 = (rig.arm_f_ang if side == "f" else rig.arm_b_ang)[1]
    c.ellipse_s(h[0], h[1], b.hand_r + 0.6, b.hand_r + 0.6, ramp, hi_w=0.8)
    c.capsule_s(add(h, _dir(a2), -3.5), add(h, _dir(a2), -1.0), b.fore_r + 0.9, ramp)


def pauldron(c: Canvas, rig: Rig, side: str, ramp: Ramp, size="small", trim: Ramp | None = None):
    sh = rig.sf if side == "f" else rig.sb
    x, y = sh
    if size == "small":
        c.ellipse_s(x, y - 0.6, 3.0, 2.4, ramp)
    elif size == "medium":
        c.poly_s([(x - 3.6, y - 1.5), (x - 1, y - 3.4), (x + 3, y - 3.0), (x + 4.2, y + 0.5), (x + 3.0, y + 2.4), (x - 3.2, y + 1.5)], ramp)
        if trim:
            c.line((x - 2.5, y - 1.5), (x + 3, y - 2.2), 0.8, trim.mid)
    elif size == "large":
        c.poly_s([(x - 5.0, y - 1.0), (x - 2.5, y - 4.4), (x + 3.5, y - 4.2), (x + 5.8, y - 0.5), (x + 4.5, y + 3.4), (x - 4.4, y + 2.5)], ramp, sh_w=1.6)
        c.poly_s([(x - 4.0, y + 1.0), (x + 4.8, y + 0.8), (x + 3.5, y + 3.8), (x - 3.5, y + 3.4)], ramp, hi=False)
        if trim:
            c.circle(x + 0.4, y - 1.4, 1.2, trim.mid)
    elif size == "fur":
        for i in range(7):
            a = -2.6 + i * 0.55
            c.ellipse_s(x + math.cos(a) * 3.2, y - 0.8 + math.sin(a) * 2.4, 2.1, 1.8, ramp, hi=False)
        c.ellipse_s(x, y - 0.6, 4.2, 3.2, ramp, sh_w=1.0)


def belt(c: Canvas, rig: Rig, ramp: Ramp, buckle: Ramp | None = None, y_off=2.0, thick=2.2, extra=1.6):
    b = rig.body
    ctr = add(rig.hip, rig.up, y_off)
    c.rotated_rect_s(ctr[0], ctr[1], b.hip_w + extra + 1.2, thick, rig.lean, ramp, hi=False)
    if buckle:
        bk = add(ctr, rig.right, b.hip_w * 0.5 - 0.5)
        c.rect(bk[0] - 1, bk[1] - 1, bk[0] + 1, bk[1] + 1, buckle.light)


def skirt(c: Canvas, rig: Rig, ramp: Ramp, length=9.0, flare=3.0, top=2.0, trim: Ramp | None = None, split=False):
    b = rig.body
    hw = b.hip_w * 0.5 + 1.2
    t = add(rig.hip, rig.up, top)
    p0 = add(t, rig.right, -hw)
    p1 = add(t, rig.right, hw + 0.4)
    sway = rig.pose["dx"] * -0.15
    b0 = (p0[0] - flare + sway, t[1] + length)
    b1 = (p1[0] + flare * 0.8 + sway * 0.4, t[1] + length - 1.0)
    if split:
        pts = [p0, p1, b1, ((b0[0] + b1[0]) / 2 + 1.5, t[1] + length - 3.5), b0]
    else:
        pts = [p0, p1, b1, ((b0[0] + b1[0]) / 2, t[1] + length + 1.0), b0]
    c.poly_s(pts, ramp, sh_w=1.6)
    if trim:
        c.line(b0, (b1[0], b1[1] + 0.5), 1.0, trim.mid)


def tassets(c: Canvas, rig: Rig, ramp: Ramp, length=7.0, n=3):
    b = rig.body
    hw = b.hip_w * 0.5 + 1.5
    t = add(rig.hip, rig.up, 1.0)
    for i in range(n):
        u = -1 + 2 * i / max(1, n - 1)
        x = t[0] + u * hw
        w = 3.2
        c.poly_s([(x - w, t[1]), (x + w, t[1]), (x + w * 0.85, t[1] + length), (x, t[1] + length + 1.5), (x - w * 0.85, t[1] + length)], ramp)


def leg_wear(c: Canvas, rig: Rig, side: str, ramp: Ramp, part="full", extra=0.6):
    """part: full (thigh+shin), shin, thigh_boot (mid-thigh down)"""
    b = rig.body
    hp = rig.hipf if side == "f" else rig.hipb
    k = getattr(rig, "k" + side)
    a = getattr(rig, "a" + side)
    th = rig.leg_f_ang if side == "f" else rig.leg_b_ang
    if part in ("full", "thigh"):
        c.capsule_s(add(hp, (0, -0.5)), k, b.thigh_r + extra, ramp)
    if part == "thigh_boot":
        c.capsule_s(add(hp, _dir(th[0]), b.thigh * 0.45), k, b.thigh_r + extra, ramp)
    if part in ("full", "shin", "thigh_boot"):
        c.capsule_s(k, a, b.shin_r + extra, ramp)


def boots(c: Canvas, rig: Rig, side: str, ramp: Ramp, height=0.5, extra=0.7, sole: Ramp | None = None):
    b = rig.body
    k = getattr(rig, "k" + side)
    a = getattr(rig, "a" + side)
    f = getattr(rig, "f" + side)
    th = rig.leg_f_ang if side == "f" else rig.leg_b_ang
    start = add(k, _dir(th[1]), b.shin * (1 - height))
    c.capsule_s(start, a, b.shin_r + extra, ramp)
    c.capsule_s(add(a, (0, 0.8)), add(f, (0.6, 0.2)), b.shin_r * 0.8 + extra * 0.8, ramp, hi=False)
    if sole:
        c.line(add(a, (-1.5, 2.6)), add(f, (1.8, 2.2)), 1.0, sole.dark)


def cape(c: Canvas, rig: Rig, ramp: Ramp, length=30, width=9):
    S = rig.shoulder
    sway = rig.pose["dx"] * -0.35 - rig.lean * 6
    top0 = add(add(S, rig.right, -4.5), rig.up, 0.5)
    top1 = add(add(S, rig.right, 2.0), rig.up, 1.5)
    bot0 = (top0[0] - width * 0.6 + sway, S[1] + length)
    bot1 = (top0[0] + width * 0.5 + sway * 0.5, S[1] + length - 2)
    c.poly_s([top0, top1, add(top1, (-1, 6)), bot1, ((bot0[0] + bot1[0]) / 2, S[1] + length + 1.5), bot0], ramp, sh_w=2.0)


def hood_down(c: Canvas, rig: Rig, ramp: Ramp):
    S = rig.shoulder
    n = rig.neck
    c.poly_s([add(add(S, rig.right, -6.0), rig.up, -1.5), add(add(S, rig.right, -4.5), rig.up, 3.5), add(add(n, rig.right, -0.5), rig.up, 2.5),
              add(add(S, rig.right, 4.0), rig.up, 2.0), add(add(S, rig.right, 5.5), rig.up, -2.0)], ramp)


def mantle(c: Canvas, rig: Rig, ramp: Ramp, trim: Ramp):
    S = rig.shoulder
    b = rig.body
    w = b.shoulder_w * 0.5 + 2.5
    c.poly_s([add(add(S, rig.right, -w - 1), rig.up, -0.5), add(add(S, rig.right, -w * 0.5), rig.up, 2.0), add(add(S, rig.right, w * 0.5), rig.up, 2.0),
              add(add(S, rig.right, w + 1), rig.up, -0.5), add(add(S, rig.right, w * 0.8), rig.up, -4.0), add(add(S, rig.right, -w * 0.8), rig.up, -4.0)], ramp)
    c.line(add(add(S, rig.right, -w), rig.up, -3.5), add(add(S, rig.right, w), rig.up, -3.5), 0.9, trim.mid)


def emblem(c: Canvas, rig: Rig, kind: str, ramp: Ramp):
    ctr = add(add(rig.hip, rig.up, rig.body.torso_len * 0.66), rig.right, 1.0)
    x, y = ctr
    if kind == "cross":
        c.rect(x - 0.5, y - 2.5, x + 0.5, y + 2.5, ramp.light)
        c.rect(x - 1.5, y - 1.0, x + 1.5, y, ramp.light)
    elif kind == "gem":
        c.poly_s([(x, y - 2), (x + 1.8, y), (x, y + 2), (x - 1.8, y)], ramp, hi_w=0.6)
    elif kind == "strap":
        pass


def quiver(c: Canvas, rig: Rig, ramp: Ramp, arrows: Ramp):
    S = rig.shoulder
    top = add(add(S, rig.right, -5.5), rig.up, 3.0)
    bot = add(add(rig.waist, rig.right, -3.5), rig.up, -2.0)
    c.capsule_s(top, bot, 2.0, ramp, hi=False)
    for i in range(3):
        p = add(top, ((i - 1) * 1.5, -3.5 - (i % 2)))
        c.line(add(top, ((i - 1) * 1.2, 0)), p, 0.7, arrows.dark)
        c.pixel(p[0], p[1] - 1, arrows.light)


# ---------------------------------------------------------------------------
def draw_armor(rig: Rig, aid: str) -> list[Canvas]:
    P = Pal(ARMORS[aid])
    fam = P.family
    fem = rig.body.gender == "female"
    cb, cc, cf = Canvas(*rigmod.FRAME), Canvas(*rigmod.FRAME), Canvas(*rigmod.FRAME)
    b = rig.body
    bk = back_ramp

    if fam == "tunic":
        if fem:
            leg_wear(cb, rig, "b", bk(P.sec), "full", 0.3)
            boots(cb, rig, "b", bk(P.leather), 0.55)
            sleeve(cb, rig, "b", bk(P.main), lower=False, extra=0.7)
            leg_wear(cc, rig, "f", P.sec, "full", 0.3)
            boots(cc, rig, "f", P.leather, 0.55)
            cc.poly_s(torso_poly(rig, 0.7, waist=0.95, bottom=-1.0), P.main, sh_w=1.6)
            skirt(cc, rig, P.main, 8.0, 3.0, 1.5, trim=P.trim)
            belt(cc, rig, P.leather, P.trim, 2.5, 1.8)
            # neckline trim
            cc.line(add(add(rig.shoulder, rig.right, -3), rig.up, -1), add(add(rig.shoulder, rig.right, 4), rig.up, -1), 0.9, P.trim.mid)
            sleeve(cf, rig, "f", P.main, lower=False, extra=0.7)
        else:
            leg_wear(cb, rig, "b", bk(P.leather), "full", 0.5)
            boots(cb, rig, "b", bk(P.sec), 0.4)
            sleeve(cb, rig, "b", bk(P.main), lower=False, extra=0.9)
            leg_wear(cc, rig, "f", P.leather, "full", 0.5)
            boots(cc, rig, "f", P.sec, 0.4)
            cc.poly_s(torso_poly(rig, 1.0, waist=1.15, bottom=-4.0), P.main, sh_w=1.6)
            belt(cc, rig, P.leather, P.trim, 1.5, 2.2)
            cc.line(add(add(rig.shoulder, rig.right, -2), rig.up, -1), add(add(rig.shoulder, rig.right, 3), rig.up, -4), 0.8, P.main.dark)
            sleeve(cf, rig, "f", P.main, lower=False, extra=0.9)

    elif fam == "robe":
        if fem:
            # fitted gown with a side slit, off-shoulder drape, wide sleeves
            leg_wear(cb, rig, "b", bk(P.sec), "full", 0.3)
            sleeve(cb, rig, "b", bk(P.main), extra=0.9, flare=2.0)
            leg_wear(cc, rig, "f", P.sec, "shin", 0.2)
            boots(cc, rig, "f", P.leather, 0.35)
            boots(cb, rig, "b", bk(P.leather), 0.35)
            cc.poly_s(torso_poly(rig, 0.7, waist=0.9, top=-0.5, bottom=-1.0), P.main, sh_w=1.6)
            # long gown, split up the front leg
            hw = b.hip_w * 0.5 + 1.6
            t = add(rig.hip, rig.up, 1.5)
            p0, p1 = add(t, rig.right, -hw), add(t, rig.right, hw + 0.2)
            sway = rig.pose["dx"] * -0.2
            bot_b = (rig.ab[0] - 4.5 + sway, rig.ab[1] + 1.5)
            cc.poly_s([p0, p1, add(p1, (0.5, 7)), add(rig.kf, (2.5, 0.5)), add(rig.kf, (-2.5, 3.0)), add(bot_b, (4, 0)), bot_b], P.main, sh_w=1.8)
            cc.line(add(p1, (0.5, 7)), add(rig.kf, (2.5, 0.5)), 0.8, P.trim.mid)
            belt(cc, rig, P.sec, P.trim, 3.5, 2.6, 0.8)
            cc.poly_s([add(add(rig.shoulder, rig.right, -6), rig.up, -1), add(add(rig.shoulder, rig.right, -3), rig.up, 1.5), add(add(rig.shoulder, rig.right, 4.5), rig.up, 1.5),
                       add(add(rig.shoulder, rig.right, 6.5), rig.up, -1.5), add(add(rig.shoulder, rig.right, 2), rig.up, -3.5)], P.sec)
            emblem(cc, rig, "gem", P.trim)
            sleeve(cf, rig, "f", P.main, extra=0.9, flare=2.0)
        else:
            leg_wear(cb, rig, "b", bk(P.sec), "shin", 0.3)
            boots(cb, rig, "b", bk(P.leather), 0.3)
            sleeve(cb, rig, "b", bk(P.main), extra=1.2, flare=2.5)
            leg_wear(cc, rig, "f", P.sec, "shin", 0.3)
            boots(cc, rig, "f", P.leather, 0.3)
            cc.poly_s(torso_poly(rig, 1.3, waist=1.2, top=-0.3, bottom=-1.0), P.main, sh_w=1.8)
            hw = b.hip_w * 0.5 + 2.4
            t = add(rig.hip, rig.up, 1.0)
            p0, p1 = add(t, rig.right, -hw), add(t, rig.right, hw)
            sway = rig.pose["dx"] * -0.2
            bot_b = (rig.ab[0] - 4.0 + sway, rig.ab[1] + 1.0)
            bot_f = (rig.af[0] + 3.0, rig.af[1] + 0.5)
            cc.poly_s([p0, p1, bot_f, ((bot_f[0] + bot_b[0]) / 2, max(bot_f[1], bot_b[1]) + 1.5), bot_b], P.main, sh_w=1.8)
            cc.line(add(p1, (-1, 0)), add(bot_f, (-1.5, 0)), 1.0, P.sec.mid)
            belt(cc, rig, P.sec, P.trim, 2.0, 2.4, 2.0)
            hood_down(cc, rig, P.sec)
            emblem(cc, rig, "gem", P.trim)
            sleeve(cf, rig, "f", P.main, extra=1.2, flare=2.5)

    elif fam == "leather":
        if fem:
            leg_wear(cb, rig, "b", bk(P.leather), "full", 0.3)
            boots(cb, rig, "b", bk(P.main), 0.5)
            leg_wear(cb, rig, "b", bk(P.main), "thigh_boot", 0.5)
            bracer(cb, rig, "b", bk(P.main))
            cape(cb, rig, bk(P.sec), length=16, width=7)
            leg_wear(cc, rig, "f", P.leather, "full", 0.3)
            leg_wear(cc, rig, "f", P.main, "thigh_boot", 0.5)
            boots(cc, rig, "f", P.main, 0.5)
            cc.poly_s(torso_poly(rig, 0.6, waist=0.85, top=-1.2, bottom=-1.0), P.main, sh_w=1.6)
            # lacing on the bodice
            ch = rig.chest
            for i in range(3):
                q = add(add(ch, rig.up, -1.5 - i * 2.2), rig.right, 1.2)
                cc.line(add(q, rig.right, -1.5), add(q, rig.right, 1.5), 0.7, P.trim.light)
            belt(cc, rig, P.leather, P.trim, 2.0, 2.0, 1.0)
            skirt(cc, rig, P.leather, 5.5, 1.5, 1.0, split=True)
            pauldron(cc, rig, "f", P.main, "small")
            bracer(cf, rig, "f", P.main)
        else:
            leg_wear(cb, rig, "b", bk(P.leather), "full", 0.6)
            boots(cb, rig, "b", bk(P.main), 0.5)
            sleeve(cb, rig, "b", bk(P.sec), lower=False, extra=0.6)
            bracer(cb, rig, "b", bk(P.main))
            leg_wear(cc, rig, "f", P.leather, "full", 0.6)
            boots(cc, rig, "f", P.main, 0.5)
            cc.poly_s(torso_poly(rig, 1.0, waist=1.15, top=-1.0, bottom=-2.0), P.main, sh_w=1.6)
            # cross strap
            cc.line(add(add(rig.shoulder, rig.right, -4), rig.up, -1), add(add(rig.waist, rig.right, 4), rig.up, 0), 1.2, P.leather.dark)
            belt(cc, rig, P.leather, P.trim, 1.5, 2.4)
            pauldron(cc, rig, "f", P.main, "medium", P.trim)
            bracer(cf, rig, "f", P.main)

    elif fam == "chain":
        mail = P.main
        if fem:
            leg_wear(cb, rig, "b", bk(mail), "full", 0.4)
            boots(cb, rig, "b", bk(P.leather), 0.5)
            sleeve(cb, rig, "b", bk(mail), extra=0.6)
            gauntlet(cb, rig, "b", bk(P.metal))
            leg_wear(cc, rig, "f", mail, "full", 0.4)
            boots(cc, rig, "f", P.leather, 0.5)
            cc.poly_s(torso_poly(rig, 0.7, waist=0.9, top=0.3, bottom=-1.0), mail, sh_w=1.6)
            # fitted tabard
            cc.poly_s(torso_poly(rig, 0.2, waist=0.75, shoulders=-2.0, top=-1.0, bottom=-1.0, bust=b.bust * 0.9), P.sec, sh_w=1.4)
            tassets(cc, rig, P.metal, 6.0, 3)
            skirt(cc, rig, P.sec, 7.0, 1.0, 0.5, split=True)
            belt(cc, rig, P.leather, P.trim, 2.5, 2.0, 1.0)
            pauldron(cc, rig, "b", bk(P.metal), "small")
            pauldron(cc, rig, "f", P.metal, "small")
            sleeve(cf, rig, "f", mail, extra=0.6)
            gauntlet(cf, rig, "f", P.metal)
        else:
            leg_wear(cb, rig, "b", bk(mail), "full", 0.6)
            boots(cb, rig, "b", bk(P.leather), 0.5)
            sleeve(cb, rig, "b", bk(mail), extra=0.9)
            gauntlet(cb, rig, "b", bk(P.metal))
            leg_wear(cc, rig, "f", mail, "full", 0.6)
            boots(cc, rig, "f", P.leather, 0.5)
            cc.poly_s(torso_poly(rig, 1.2, waist=1.25, top=0.5, bottom=-3.0), mail, sh_w=1.8)
            cc.poly_s(torso_poly(rig, 0.4, waist=1.1, shoulders=-1.5, top=-1.0, bottom=-7.0), P.sec, sh_w=1.4)
            belt(cc, rig, P.leather, P.trim, 1.5, 2.4, 2.0)
            pauldron(cc, rig, "b", bk(P.metal), "medium")
            pauldron(cc, rig, "f", P.metal, "medium", P.trim)
            sleeve(cf, rig, "f", mail, extra=0.9)
            gauntlet(cf, rig, "f", P.metal)

    elif fam == "plate":
        M, T = P.main, P.trim
        if fem:
            leg_wear(cb, rig, "b", bk(P.leather), "full", 0.3)
            leg_wear(cb, rig, "b", bk(M), "thigh_boot", 0.6)
            boots(cb, rig, "b", bk(M), 0.6, 0.8)
            sleeve(cb, rig, "b", bk(M), extra=0.7)
            gauntlet(cb, rig, "b", bk(M))
            pauldron(cb, rig, "b", bk(M), "medium")
            leg_wear(cc, rig, "f", P.leather, "full", 0.3)
            leg_wear(cc, rig, "f", M, "thigh_boot", 0.6)
            boots(cc, rig, "f", M, 0.6, 0.8)
            # sculpted cuirass following the figure
            cc.poly_s(torso_poly(rig, 0.9, waist=0.9, chest=0.6, top=0.2, bottom=-0.5), M, sh_w=1.8)
            ch = rig.chest
            cc.ellipse_s(ch[0] + rig.right[0] * (b.shoulder_w * 0.5 + b.bust), ch[1] + rig.right[1] * 2, 2.6, 2.3, M, hi_w=0.8)
            cc.line(add(add(rig.waist, rig.right, -4), rig.up, 0), add(add(rig.waist, rig.right, 5), rig.up, 0), 1.0, T.mid)
            skirt(cc, rig, P.sec, 7.5, 2.0, 1.0, split=True)
            tassets(cc, rig, M, 5.5, 3)
            belt(cc, rig, P.leather, T, 2.5, 2.0, 1.4)
            pauldron(cc, rig, "f", M, "medium", T)
            emblem(cc, rig, "gem", P.sec)
            sleeve(cf, rig, "f", M, extra=0.7)
            gauntlet(cf, rig, "f", M)
        else:
            leg_wear(cb, rig, "b", bk(P.leather), "full", 0.5)
            leg_wear(cb, rig, "b", bk(M), "shin", 1.0)
            boots(cb, rig, "b", bk(M), 0.5, 1.0)
            sleeve(cb, rig, "b", bk(M), extra=1.1)
            gauntlet(cb, rig, "b", bk(M))
            pauldron(cb, rig, "b", bk(M), "large")
            leg_wear(cc, rig, "f", P.leather, "full", 0.5)
            leg_wear(cc, rig, "f", M, "shin", 1.0)
            boots(cc, rig, "f", M, 0.5, 1.0)
            cc.poly_s(torso_poly(rig, 1.8, waist=1.3, chest=1.2, shoulders=0.8, top=0.8, bottom=-3.0, boxy=True), M, sh_w=2.0)
            cc.line(add(add(rig.chest, rig.right, -5), rig.up, 1), add(add(rig.chest, rig.right, 6), rig.up, 1), 1.0, T.mid)
            tassets(cc, rig, M, 7.5, 3)
            belt(cc, rig, P.leather, T, 1.5, 2.6, 2.6)
            pauldron(cc, rig, "f", M, "large", T)
            emblem(cc, rig, "gem", P.sec)
            # gorget
            cc.rotated_rect_s(rig.neck[0], rig.neck[1] + 0.5, 7, 3, rig.lean, M, hi=False)
            sleeve(cf, rig, "f", M, extra=1.1)
            gauntlet(cf, rig, "f", M)

    elif fam == "hide":
        F = P.fur
        if fem:
            leg_wear(cb, rig, "b", bk(P.leather), "thigh_boot", 0.5)
            boots(cb, rig, "b", bk(F), 0.4, 0.9)
            bracer(cb, rig, "b", bk(P.leather))
            pauldron(cb, rig, "b", bk(F), "fur")
            leg_wear(cc, rig, "f", P.leather, "thigh_boot", 0.5)
            boots(cc, rig, "f", F, 0.4, 0.9)
            # fur-trimmed top, bare midriff
            ch = rig.chest
            top = torso_poly(rig, 0.7, waist=0.9, top=-1.5, bottom=b.torso_len * 0.52)
            cc.poly_s(top, P.leather, sh_w=1.4)
            cc.line(add(add(ch, rig.right, -5), rig.up, -2.5), add(add(ch, rig.right, 5.5), rig.up, -2.5), 1.6, F.mid)
            skirt(cc, rig, F, 6.5, 2.5, 1.5, split=True)
            belt(cc, rig, P.leather, P.trim, 2.5, 2.0, 1.0)
            pauldron(cc, rig, "f", F, "fur")
            # necklace
            cc.pixel(rig.neck[0] + 1, rig.neck[1] + 3, P.trim.light)
            bracer(cf, rig, "f", P.leather)
        else:
            leg_wear(cb, rig, "b", bk(P.leather), "full", 0.6)
            boots(cb, rig, "b", bk(F), 0.5, 1.0)
            bracer(cb, rig, "b", bk(P.leather))
            pauldron(cb, rig, "b", bk(F), "fur")
            leg_wear(cc, rig, "f", P.leather, "full", 0.6)
            boots(cc, rig, "f", F, 0.5, 1.0)
            # bare chest with harness strap
            cc.line(add(add(rig.shoulder, rig.right, -5), rig.up, -1), add(add(rig.waist, rig.right, 4.5), rig.up, -1), 1.6, P.leather.mid)
            # fur kilt
            skirt(cc, rig, F, 9.0, 3.0, 1.5)
            belt(cc, rig, P.leather, P.trim, 1.5, 2.6, 2.4)
            pauldron(cc, rig, "f", F, "fur")
            # war paint
            cc.line(add(rig.chest, (1, -1)), add(rig.chest, (4, 2)), 0.8, P.sec.mid)
            bracer(cf, rig, "f", P.leather)

    elif fam == "ranger":
        if fem:
            leg_wear(cb, rig, "b", bk(P.leather), "full", 0.3)
            leg_wear(cb, rig, "b", bk(P.sec), "thigh_boot", 0.5)
            boots(cb, rig, "b", bk(P.sec), 0.5)
            sleeve(cb, rig, "b", bk(P.main), extra=0.6)
            bracer(cb, rig, "b", bk(P.sec))
            quiver(cb, rig, bk(P.leather), P.trim)
            cape(cb, rig, bk(P.main), length=20, width=8)
            leg_wear(cc, rig, "f", P.leather, "full", 0.3)
            leg_wear(cc, rig, "f", P.sec, "thigh_boot", 0.5)
            boots(cc, rig, "f", P.sec, 0.5)
            cc.poly_s(torso_poly(rig, 0.7, waist=0.85, top=0.0, bottom=-1.0), P.main, sh_w=1.6)
            cc.poly_s(torso_poly(rig, 0.4, waist=0.8, shoulders=-2.5, top=-1.5, bottom=-1.0, bust=b.bust * 0.9), P.sec, sh_w=1.4)
            belt(cc, rig, P.leather, P.trim, 2.0, 2.0, 1.0)
            skirt(cc, rig, P.main, 5.0, 1.5, 1.0, split=True)
            hood_down(cc, rig, P.main)
            sleeve(cf, rig, "f", P.main, extra=0.6)
            bracer(cf, rig, "f", P.sec)
        else:
            leg_wear(cb, rig, "b", bk(P.leather), "full", 0.6)
            boots(cb, rig, "b", bk(P.sec), 0.5)
            sleeve(cb, rig, "b", bk(P.main), extra=0.9)
            bracer(cb, rig, "b", bk(P.sec))
            quiver(cb, rig, bk(P.leather), P.trim)
            leg_wear(cc, rig, "f", P.leather, "full", 0.6)
            boots(cc, rig, "f", P.sec, 0.5)
            cc.poly_s(torso_poly(rig, 1.1, waist=1.15, top=0.2, bottom=-4.0), P.main, sh_w=1.6)
            cc.poly_s(torso_poly(rig, 0.6, waist=1.0, shoulders=-2.5, top=-1.5, bottom=-4.0), P.sec, sh_w=1.4)
            belt(cc, rig, P.leather, P.trim, 1.5, 2.4, 2.0)
            hood_down(cc, rig, P.main)
            sleeve(cf, rig, "f", P.main, extra=0.9)
            bracer(cf, rig, "f", P.sec)

    elif fam == "vestment":
        if fem:
            leg_wear(cb, rig, "b", bk(P.leather), "shin", 0.2)
            boots(cb, rig, "b", bk(P.leather), 0.4)
            sleeve(cb, rig, "b", bk(P.main), extra=0.8)
            gauntlet(cb, rig, "b", bk(P.sec))
            leg_wear(cc, rig, "f", P.leather, "shin", 0.2)
            boots(cc, rig, "f", P.leather, 0.4)
            cc.poly_s(torso_poly(rig, 0.7, waist=0.9, top=0.0, bottom=-1.0), P.main, sh_w=1.6)
            hw = b.hip_w * 0.5 + 1.6
            t = add(rig.hip, rig.up, 1.5)
            p0, p1 = add(t, rig.right, -hw), add(t, rig.right, hw + 0.2)
            sway = rig.pose["dx"] * -0.2
            bot_b = (rig.ab[0] - 4.0 + sway, rig.ab[1] + 1.0)
            cc.poly_s([p0, p1, add(p1, (0.5, 6)), add(rig.kf, (2.5, -0.5)), add(rig.kf, (-2.5, 2.5)), add(bot_b, (4, 0)), bot_b], P.main, sh_w=1.8)
            cc.line(add(p1, (0.5, 6)), add(rig.kf, (2.5, -0.5)), 0.8, P.trim.mid)
            belt(cc, rig, P.sec, P.trim, 3.0, 2.4, 0.8)
            mantle(cc, rig, P.sec, P.trim)
            emblem(cc, rig, "cross", P.trim)
            sleeve(cf, rig, "f", P.main, extra=0.8)
            gauntlet(cf, rig, "f", P.sec)
        else:
            leg_wear(cb, rig, "b", bk(P.leather), "full", 0.5)
            boots(cb, rig, "b", bk(P.leather), 0.45, 0.8)
            sleeve(cb, rig, "b", bk(P.main), extra=1.0)
            gauntlet(cb, rig, "b", bk(P.sec))
            leg_wear(cc, rig, "f", P.leather, "full", 0.5)
            boots(cc, rig, "f", P.leather, 0.45, 0.8)
            cc.poly_s(torso_poly(rig, 1.2, waist=1.2, top=0.3, bottom=-2.0), P.main, sh_w=1.8)
            # long open coat tails
            hw = b.hip_w * 0.5 + 2.2
            t = add(rig.hip, rig.up, 1.0)
            sway = rig.pose["dx"] * -0.2
            p0 = add(t, rig.right, -hw)
            cc.poly_s([p0, add(t, rig.right, -1.0), (rig.kb[0] - 1.0 + sway, rig.kb[1] + 5), (rig.kb[0] - 6 + sway, rig.kb[1] + 6)], P.main, sh_w=1.6)
            p1 = add(t, rig.right, hw)
            cc.poly_s([add(t, rig.right, 1.0), p1, (rig.kf[0] + 4, rig.kf[1] + 5), (rig.kf[0] - 1.0, rig.kf[1] + 6)], P.main, sh_w=1.6)
            cc.line(add(add(rig.shoulder, rig.right, 1), rig.up, -2), add(t, rig.right, 1), 0.9, P.sec.mid)
            belt(cc, rig, P.sec, P.trim, 1.5, 2.6, 2.0)
            mantle(cc, rig, P.sec, P.trim)
            emblem(cc, rig, "cross", P.trim)
            sleeve(cf, rig, "f", P.main, extra=1.0)
            gauntlet(cf, rig, "f", P.sec)

    return [cb, cc, cf]
