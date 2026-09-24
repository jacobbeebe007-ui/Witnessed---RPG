"""Top-down chibi paper-dolls for the overworld (24x32, 4 directions x 4 frames).

Rows of the produced sheet = direction (down, left, right, up), columns = walk frame.
Layers: body (skin), hair (greyscale for tinting), outfit (per armour + gender).
"""
from __future__ import annotations

import math

from PIL import Image

from raster import Canvas, Ramp, hex_to_rgb, darken
from hero import SKIN_TONES, HAIR_RAMP, EYE_DARK, EYE_WHITE, LIP
from armor import ARMORS, Pal

OW, OH = 24, 32
DIRS = ["down", "left", "right", "up"]


def _walk(frame):
    """Returns (leg offset front, leg offset back, bob) for walk frame 0..3."""
    return [(0, 0, 0), (2, -2, -1), (0, 0, 0), (-2, 2, -1)][frame]


def _geom(gender, frame):
    fem = gender == "female"
    lf, lb, bob = _walk(frame)
    g = dict(
        fem=fem,
        cx=12, head_y=10 + bob, head_r=5.2 if not fem else 5.0,
        sh_y=16 + bob, hip_y=23 + bob, foot_y=30,
        sw=(4.6 if not fem else 3.6), ww=(4.0 if not fem else 2.6), hw=(4.2 if not fem else 4.0),
        arm_r=(1.5 if not fem else 1.2), leg_r=(1.8 if not fem else 1.5),
        lf=lf, lb=lb, bob=bob,
    )
    return g


def draw_ow_body(gender, tone, direction, frame) -> Canvas:
    c = Canvas(OW, OH)
    g = _geom(gender, frame)
    skin = Ramp.from_color(SKIN_TONES[tone])
    cx = g["cx"]
    under = Ramp.from_color("#4a4658")
    if direction in ("down", "up"):
        # legs
        for side, off in ((-1, g["lf"]), (1, g["lb"])):
            x = cx + side * 2.2
            c.capsule_s((x, g["hip_y"]), (x, g["foot_y"] - 1 + off * 0.5), g["leg_r"], skin)
        # torso
        c.poly_s([(cx - g["sw"], g["sh_y"]), (cx + g["sw"], g["sh_y"]), (cx + g["hw"], g["hip_y"] + 1), (cx - g["hw"], g["hip_y"] + 1)], skin)
        c.poly_s([(cx - g["hw"], g["hip_y"] - 1), (cx + g["hw"], g["hip_y"] - 1), (cx + g["hw"], g["hip_y"] + 2), (cx - g["hw"], g["hip_y"] + 2)], under, hi=False)
        # arms
        for side, off in ((-1, g["lb"]), (1, g["lf"])):
            x = cx + side * (g["sw"] + 1.0)
            c.capsule_s((x, g["sh_y"] + 1), (x + side * 0.5, g["hip_y"] - 1 + off * 0.4), g["arm_r"], skin)
        # head
        c.ellipse_s(cx, g["head_y"], g["head_r"], g["head_r"] + 0.4, skin, sh_w=1.4)
        if direction == "down":
            ey = g["head_y"] + 1
            for ex in (cx - 2, cx + 2):
                c.rect(ex - 0.5, ey - 0.5, ex + 1.5, ey + 1.5, EYE_WHITE)
                c.rect(ex + 0.5 - (0 if ex > cx else 0), ey - 0.5, ex + 1.5, ey + 1.5, EYE_DARK)
            if g["fem"]:
                c.rect(cx - 0.5, ey + 3, cx + 1.5, ey + 4, LIP)
    else:
        flip = -1 if direction == "left" else 1
        # legs (side view)
        for off, r in ((g["lb"], darken(skin.mid, 0.2)), (g["lf"], skin.mid)):
            x = cx + off * flip * 0.9
            c.capsule_s((cx, g["hip_y"]), (x, g["foot_y"] - 1), g["leg_r"], Ramp.from_color(r))
            c.capsule_s((x, g["foot_y"] - 1), (x + flip * 1.5, g["foot_y"] - 1), g["leg_r"], Ramp.from_color(r), hi=False)
        # torso
        w = g["sw"] * 0.75
        c.poly_s([(cx - w, g["sh_y"]), (cx + w, g["sh_y"]), (cx + w - 0.3, g["hip_y"] + 1), (cx - w + 0.3, g["hip_y"] + 1)], skin)
        c.poly_s([(cx - w, g["hip_y"] - 1), (cx + w, g["hip_y"] - 1), (cx + w, g["hip_y"] + 2), (cx - w, g["hip_y"] + 2)], under, hi=False)
        # arm (swinging)
        c.capsule_s((cx, g["sh_y"] + 1), (cx + flip * g["lf"] * 0.8, g["hip_y"] - 1), g["arm_r"], skin)
        # head
        c.ellipse_s(cx + flip * 0.5, g["head_y"], g["head_r"], g["head_r"] + 0.4, skin, sh_w=1.4)
        ex = cx + flip * 2.5
        ey = g["head_y"] + 1
        c.rect(ex - 0.5, ey - 0.5, ex + 1.5, ey + 1.5, EYE_WHITE)
        c.rect(ex + (0.5 if flip > 0 else -0.5), ey - 0.5, ex + (1.5 if flip > 0 else 0.5), ey + 1.5, EYE_DARK)
        c.pixel(cx + flip * 5.0, g["head_y"] + 2, skin.dark)
    return c


def draw_ow_hair(gender, style, direction, frame) -> Canvas:
    c = Canvas(OW, OH)
    g = _geom(gender, frame)
    cx, hy, r = g["cx"], g["head_y"], g["head_r"] + 0.8
    R = HAIR_RAMP
    long_hair = style in ("long", "braid", "ponytail", "bob")
    if direction == "down":
        c.poly_s([(cx - r, hy + 1.5), (cx - r, hy - r * 0.4), (cx - r * 0.5, hy - r), (cx + r * 0.5, hy - r), (cx + r, hy - r * 0.4), (cx + r, hy + 1.5), (cx + r * 0.7, hy - 1.0), (cx, hy - 2.2), (cx - r * 0.7, hy - 1.0)], R, sh_w=1.4)
        if style in ("spiky",):
            for k in range(-2, 3):
                c.poly_s([(cx + k * 2.2 - 1.2, hy - r + 1), (cx + k * 2.2, hy - r - 3 + abs(k)), (cx + k * 2.2 + 1.2, hy - r + 1)], R, hi=False)
        if long_hair:
            for side in (-1, 1):
                c.capsule_s((cx + side * (r - 0.5), hy + 1), (cx + side * (r + 0.5), hy + 10), 1.6, R)
        if style == "bun":
            c.ellipse_s(cx, hy - r - 1, 2.5, 2.2, R)
    elif direction == "up":
        c.ellipse_s(cx, hy - 0.3, r, r, R, sh_w=1.4)
        if style in ("spiky",):
            for k in range(-2, 3):
                c.poly_s([(cx + k * 2.2 - 1.2, hy - r + 1), (cx + k * 2.2, hy - r - 3 + abs(k)), (cx + k * 2.2 + 1.2, hy - r + 1)], R, hi=False)
        if style == "long" or style == "braid":
            c.poly_s([(cx - r + 0.5, hy + 1), (cx + r - 0.5, hy + 1), (cx + r * 0.8, hy + 13), (cx - r * 0.8, hy + 13)], R, sh_w=1.6)
        if style == "ponytail":
            c.capsule_s((cx, hy + 2), (cx, hy + 12), 1.8, R)
        if style == "bob":
            c.poly_s([(cx - r, hy + 1), (cx + r, hy + 1), (cx + r * 0.9, hy + 6), (cx - r * 0.9, hy + 6)], R, sh_w=1.4)
        if style == "bun":
            c.ellipse_s(cx, hy - 1, 2.6, 2.4, Ramp.from_color("#b0b0b8"))
    else:
        flip = -1 if direction == "left" else 1
        hx = cx + flip * 0.5
        c.poly_s([(hx - flip * r, hy + 2), (hx - flip * r, hy - r * 0.5), (hx - flip * r * 0.4, hy - r), (hx + flip * r * 0.5, hy - r), (hx + flip * r * 0.95, hy - r * 0.5), (hx + flip * r * 0.6, hy - r * 0.35), (hx, hy - r * 0.4), (hx - flip * r * 0.6, hy - 0.5)], R, sh_w=1.4)
        if style == "spiky":
            for k in range(3):
                x = hx - flip * (k * 2.5 - 2)
                c.poly_s([(x - 1.2, hy - r + 1), (x - flip * 1.0, hy - r - 3), (x + 1.2, hy - r + 1)], R, hi=False)
        if style in ("long", "braid"):
            c.poly_s([(hx - flip * r, hy - 1), (hx - flip * (r - 3), hy + 1), (hx - flip * (r - 2), hy + 13), (hx - flip * (r + 1.5), hy + 12)], R, sh_w=1.4)
        if style == "ponytail":
            c.capsule_s((hx - flip * r * 0.8, hy - 1), (hx - flip * (r + 2), hy + 9), 1.7, R)
        if style == "bob":
            c.poly_s([(hx - flip * r, hy - 1), (hx - flip * (r - 2.5), hy + 1), (hx - flip * (r - 2), hy + 6), (hx - flip * (r + 1), hy + 5.5)], R, sh_w=1.4)
        if style == "bun":
            c.ellipse_s(hx - flip * r * 0.6, hy - r + 0.5, 2.4, 2.2, R)
    return c


def draw_ow_outfit(gender, aid, direction, frame) -> Canvas:
    c = Canvas(OW, OH)
    g = _geom(gender, frame)
    P = Pal(ARMORS[aid])
    fam = P.family
    fem = g["fem"]
    cx = g["cx"]
    main, sec, trim, leather = P.main, P.sec, P.trim, P.leather
    torso_col = leather if fam == "hide" and not fem else main
    skirted = fem and fam in ("tunic", "robe", "vestment", "chain", "plate", "hide", "leather", "ranger")
    long_robe = fam in ("robe", "vestment") and not fem
    side = direction in ("left", "right")
    flip = -1 if direction == "left" else 1
    w_sh = g["sw"] * (0.75 if side else 1.0) + 0.6
    w_hip = g["hw"] * (0.75 if side else 1.0) + 0.4
    # boots
    for off in (g["lb"], g["lf"]):
        if side:
            x = cx + off * flip * 0.9
            c.capsule_s((x, g["foot_y"] - 3.5), (x, g["foot_y"] - 1), g["leg_r"] + 0.5, leather)
            c.capsule_s((x, g["foot_y"] - 1), (x + flip * 1.8, g["foot_y"] - 1), g["leg_r"] + 0.3, leather, hi=False)
        else:
            x = cx + (-2.2 if off == g["lf"] else 2.2)
            c.capsule_s((x, g["foot_y"] - 4 + off * 0.5), (x, g["foot_y"] - 1 + off * 0.5), g["leg_r"] + 0.5, leather)
    # trousers / leggings
    if not long_robe:
        for off in (g["lb"], g["lf"]):
            if side:
                x = cx + off * flip * 0.9
                c.capsule_s((cx, g["hip_y"]), (x, g["foot_y"] - 4), g["leg_r"] + 0.3, sec if fam in ("tunic", "chain") else leather)
            else:
                x = cx + (-2.2 if off == g["lf"] else 2.2)
                c.capsule_s((x, g["hip_y"]), (x, g["foot_y"] - 4 + off * 0.5), g["leg_r"] + 0.3, sec if fam in ("tunic", "chain") else leather)
    # torso
    top = g["sh_y"] - 0.5
    bottom = g["hip_y"] + 1.5
    c.poly_s([(cx - w_sh, top), (cx + w_sh, top), (cx + w_hip, bottom), (cx - w_hip, bottom)], torso_col, sh_w=1.4)
    if fam in ("chain", "ranger") or (fam == "plate" and not fem):
        c.poly_s([(cx - w_sh * 0.5, top + 1), (cx + w_sh * 0.5, top + 1), (cx + w_hip * 0.5, bottom), (cx - w_hip * 0.5, bottom)], sec, hi=False)
    if fam == "plate":
        for s in (-1, 1):
            c.ellipse_s(cx + s * (w_sh + 0.3), top + 0.8, 2.2, 1.7, main)
    if fam == "hide":
        for s in ((-1,) if side else (-1, 1)):
            c.ellipse_s(cx + s * (w_sh + 0.2), top + 0.8, 2.2, 1.8, P.fur)
    # belt
    c.rect_s(cx - w_hip - 0.3, g["hip_y"] - 1.2, cx + w_hip + 0.3, g["hip_y"] + 0.4, leather, hi=False)
    c.pixel(cx, g["hip_y"] - 1, trim.light)
    # skirt / robe
    if skirted:
        length = 7 if fam in ("robe", "vestment") else 4
        col = main if fam not in ("hide",) else P.fur
        c.poly_s([(cx - w_hip, g["hip_y"] + 0.5), (cx + w_hip, g["hip_y"] + 0.5), (cx + w_hip + 1.5, g["hip_y"] + length), (cx - w_hip - 1.5, g["hip_y"] + length)], col, sh_w=1.4)
    if long_robe:
        c.poly_s([(cx - w_hip, g["hip_y"] + 0.5), (cx + w_hip, g["hip_y"] + 0.5), (cx + w_hip + 1.5, g["foot_y"] - 1), (cx - w_hip - 1.5, g["foot_y"] - 1)], main, sh_w=1.4)
    # cape / hood hints
    if fam in ("ranger", "leather") and fem and direction == "up":
        c.poly_s([(cx - w_sh, top), (cx + w_sh, top), (cx + w_sh - 0.5, g["hip_y"] + 3), (cx - w_sh + 0.5, g["hip_y"] + 3)], sec if fam == "leather" else main, sh_w=1.4)
    if fam == "ranger" and direction != "up":
        c.poly_s([(cx - w_sh - 0.5, top - 1), (cx + w_sh + 0.5, top - 1), (cx + w_sh, top + 1.5), (cx - w_sh, top + 1.5)], main, hi=False)
    # emblem
    if fam == "vestment" and direction == "down":
        c.rect(cx - 0.5, top + 2, cx + 0.5, top + 5, trim.light)
        c.rect(cx - 1.5, top + 3, cx + 1.5, top + 4, trim.light)
    return c


def render_ow_sheet(draw_fn, *args) -> Image.Image:
    img = Image.new("RGBA", (OW * 4, OH * 4), (0, 0, 0, 0))
    for r, d in enumerate(DIRS):
        for f in range(4):
            c = draw_fn(*args, d, f)
            img.paste(c.render(), (f * OW, r * OH))
    return img
