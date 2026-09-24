"""Skeleton, body proportions and animation poses for the hero paper-doll.

Everything faces RIGHT.  Angle conventions:
  * limb angle  a : direction (sin a, cos a)   -> 0 = hanging down, +pi/2 = forward
  * torso lean  l : direction (sin l, -cos l)  -> 0 = upright,     +   = leaning forward
  * weapon ang  w : direction (sin w, -cos w)  -> 0 = pointing up,  +pi/2 = forward
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

FW, FH = 80, 80          # default frame size
GROUND = 71              # y of the ground line
HIP_Y = 44
HIP_X = 38
FRAME = [FW, FH]         # mutable current frame size (see set_frame)


def set_frame(w: int, h: int, hip_x: float, hip_y: float):
    """Re-target the rig to a different frame size (used for large humanoid enemies)."""
    global HIP_X, HIP_Y
    FRAME[0], FRAME[1] = w, h
    HIP_X, HIP_Y = hip_x, hip_y


def reset_frame():
    set_frame(FW, FH, 38, 44)


@dataclass
class Body:
    gender: str
    torso_len: float
    shoulder_w: float
    waist_w: float
    hip_w: float
    upper_arm: float
    forearm: float
    arm_r: float
    fore_r: float
    hand_r: float
    thigh: float
    shin: float
    thigh_r: float
    shin_r: float
    head_rx: float
    head_ry: float
    neck_r: float
    bust: float
    jaw: float


MALE = Body("male", 17.0, 14.5, 10.5, 10.0, 8.5, 8.0, 2.4, 2.1, 2.1, 12.0, 12.0, 2.9, 2.2, 6.9, 7.4, 1.9, 0.0, 1.0)
FEMALE = Body("female", 16.0, 10.5, 6.8, 10.5, 7.8, 7.5, 1.8, 1.6, 1.7, 12.0, 11.5, 2.5, 1.8, 6.5, 7.1, 1.4, 2.4, 0.0)
BODIES = {"male": MALE, "female": FEMALE}

# ---------------------------------------------------------------------------
# Pose keys and defaults
# ---------------------------------------------------------------------------
DEFAULT_POSE = dict(
    dx=0.0, dy=0.0,          # root translation
    lean=0.06,               # torso lean
    hdx=0.0, hdy=0.0,        # head offset
    ab=-0.25, abb=0.35,      # back arm angle / elbow bend (bend swings forearm forward)
    af=0.30, afb=0.45,       # front arm
    lb=-0.20, lbb=0.10,      # back leg angle / knee bend (bend swings shin backward)
    lf=0.22, lfb=0.05,       # front leg
    wpn=2.55,                # weapon angle (pointing forward-down)
    draw=0.0,                # bow draw amount 0..1
    glow=0.0,                # magic glow on the front hand
    crouch=0.0,
    kneel=0.0,
    face=0.0,                # 1 = eyes closed
)


def kf(**kw):
    p = dict(DEFAULT_POSE)
    p.update(kw)
    return p


def ease(t):
    return t * t * (3 - 2 * t)


def interp(keys, t):
    """keys: list of (time, pose).  Piecewise smooth interpolation."""
    if t <= keys[0][0]:
        return dict(keys[0][1])
    for (t0, p0), (t1, p1) in zip(keys, keys[1:]):
        if t <= t1:
            u = ease((t - t0) / (t1 - t0)) if t1 > t0 else 1
            return {k: p0[k] + (p1[k] - p0[k]) * u for k in p0}
    return dict(keys[-1][1])


# ---------------------------------------------------------------------------
# Animations   name -> (frame_count, loop, fps, keyframes)
# ---------------------------------------------------------------------------
IDLE = kf()
ANIMS: dict[str, dict] = {}


def anim(name, n, loop, fps, keys, sample="closed"):
    ANIMS[name] = dict(n=n, loop=loop, fps=fps, keys=keys, sample=sample)


# breathing idle (loops)
anim("idle", 6, True, 6, [
    (0.0, kf()),
    (0.5, kf(dy=-1.0, hdy=-0.4, ab=-0.22, abb=0.40, af=0.33, afb=0.50, wpn=2.50)),
    (1.0, kf()),
], sample="loop")

# run cycle (loops) - used when dashing toward the enemy
_run = []
for i in range(6):
    t = i / 6
    s = math.sin(t * math.tau)
    c = math.cos(t * math.tau)
    _run.append((t, kf(lean=0.30, dy=-abs(s) * 2.0 - 1,
                       lb=-0.75 * s, lbb=0.9 * max(0, -s) + 0.3,
                       lf=0.75 * s, lfb=0.9 * max(0, s) + 0.3,
                       ab=0.8 * s, abb=1.2, af=-0.8 * s, afb=1.2, wpn=1.4 - 0.2 * s, hdy=0.5)))
_run.append((1.0, _run[0][1]))
anim("run", 6, True, 12, _run, sample="loop")

# sword / axe / mace / dagger swing
anim("attack_swing", 7, False, 14, [
    (0.00, kf(lean=-0.15, af=-1.3, afb=1.1, wpn=-0.55, ab=0.5, abb=0.4, lb=-0.35, lf=0.10, hdx=-0.5)),
    (0.20, kf(lean=-0.22, af=-1.6, afb=1.2, wpn=-0.85, ab=0.6, abb=0.5, lb=-0.40, lf=0.05, hdx=-0.8, dy=1)),
    (0.42, kf(lean=0.35, af=1.15, afb=0.35, wpn=0.55, ab=-0.5, abb=0.6, lb=-0.55, lbb=0.1, lf=0.75, lfb=0.55, dx=3, dy=1.5)),
    (0.58, kf(lean=0.48, af=1.45, afb=0.15, wpn=1.9, ab=-0.7, abb=0.7, lb=-0.60, lbb=0.05, lf=0.85, lfb=0.65, dx=5, dy=2.5)),
    (0.78, kf(lean=0.40, af=1.05, afb=0.20, wpn=2.55, ab=-0.5, abb=0.6, lb=-0.55, lf=0.75, lfb=0.5, dx=4, dy=2.0)),
    (1.00, kf(lean=0.12, af=0.45, afb=0.4, wpn=2.55, dx=1)),
])

# bow: raise, draw, loose, lower
anim("attack_bow", 7, False, 12, [
    (0.00, kf(lean=0.05, af=1.3, afb=0.2, ab=1.1, abb=0.5, wpn=0.0, draw=0.0, lb=-0.4, lf=0.35, lfb=0.1)),
    (0.30, kf(lean=0.02, af=1.57, afb=0.0, ab=1.45, abb=1.5, wpn=0.0, draw=0.6, lb=-0.4, lf=0.35, lfb=0.1)),
    (0.50, kf(lean=-0.02, af=1.57, afb=0.0, ab=1.35, abb=2.2, wpn=0.0, draw=1.0, lb=-0.4, lf=0.35, lfb=0.1, hdx=-0.5)),
    (0.62, kf(lean=0.10, af=1.62, afb=0.0, ab=1.0, abb=2.6, wpn=0.0, draw=0.0, lb=-0.4, lf=0.35, lfb=0.1, dx=1)),
    (1.00, kf(lean=0.06, af=0.9, afb=0.3, ab=-0.1, abb=0.4, wpn=0.15, draw=0.0)),
])

# staff: two-hand thrust with an arcane flare
anim("attack_staff", 7, False, 13, [
    (0.00, kf(lean=-0.12, af=-0.6, afb=1.5, ab=0.4, abb=0.8, wpn=0.35, glow=0.2, lb=-0.35, lf=0.1)),
    (0.35, kf(lean=-0.18, af=-0.9, afb=1.7, ab=0.6, abb=0.9, wpn=0.15, glow=0.6, lb=-0.4, lf=0.05, dy=1)),
    (0.60, kf(lean=0.40, af=1.55, afb=0.05, ab=0.9, abb=0.6, wpn=1.55, glow=1.0, lb=-0.55, lf=0.8, lfb=0.5, dx=4, dy=2)),
    (0.80, kf(lean=0.38, af=1.50, afb=0.10, ab=0.8, abb=0.6, wpn=1.55, glow=0.7, lb=-0.55, lf=0.75, lfb=0.5, dx=4, dy=2)),
    (1.00, kf(lean=0.10, af=0.4, afb=0.5, wpn=0.35, glow=0.0, dx=1)),
])

# spell cast - hand raised, glow builds then bursts
anim("cast", 6, False, 10, [
    (0.00, kf(lean=-0.05, af=0.9, afb=1.4, ab=-0.4, abb=0.6, wpn=0.1, glow=0.15)),
    (0.35, kf(lean=-0.10, af=2.3, afb=0.5, ab=-0.6, abb=0.7, wpn=0.05, glow=0.6, hdy=-0.5, dy=-0.5)),
    (0.65, kf(lean=0.20, af=1.75, afb=0.15, ab=-0.5, abb=0.7, wpn=0.2, glow=1.0, dx=2, lf=0.5, lfb=0.3)),
    (1.00, kf(lean=0.15, af=1.3, afb=0.3, ab=-0.4, abb=0.6, wpn=0.3, glow=0.4, dx=1)),
])

anim("hurt", 3, False, 10, [
    (0.0, kf(lean=-0.35, af=1.3, afb=0.9, ab=1.0, abb=0.8, wpn=1.7, hdx=-1.5, hdy=0.5, lb=-0.5, lf=0.35, lfb=0.3, dx=-2, face=1)),
    (1.0, kf(lean=-0.30, af=1.0, afb=0.9, ab=0.8, abb=0.8, wpn=1.9, hdx=-1.0, hdy=0.3, lb=-0.4, lf=0.3, lfb=0.3, dx=-3, dy=1, face=1)),
])

anim("guard", 2, True, 4, [
    (0.0, kf(lean=0.18, crouch=1, af=1.05, afb=1.9, ab=0.7, abb=1.3, wpn=0.35, lb=-0.45, lbb=0.4, lf=0.55, lfb=0.5, dy=2, hdy=0.5)),
    (1.0, kf(lean=0.20, crouch=1, af=1.10, afb=1.85, ab=0.75, abb=1.3, wpn=0.30, lb=-0.45, lbb=0.4, lf=0.55, lfb=0.5, dy=2.5, hdy=0.7)),
])

anim("parry", 3, False, 14, [
    (0.0, kf(lean=0.10, af=1.5, afb=1.1, ab=0.3, abb=1.0, wpn=-0.55, lb=-0.4, lf=0.45, lfb=0.3, dy=1)),
    (0.5, kf(lean=0.25, af=1.9, afb=0.6, ab=0.2, abb=1.0, wpn=-0.25, lb=-0.5, lf=0.6, lfb=0.4, dx=2, dy=1.5)),
    (1.0, kf(lean=0.20, af=1.7, afb=0.8, ab=0.2, abb=1.0, wpn=-0.4, lb=-0.45, lf=0.5, lfb=0.35, dx=1, dy=1)),
])

anim("dodge", 4, False, 14, [
    (0.0, kf(lean=-0.25, af=0.6, afb=0.8, ab=-0.2, abb=0.8, wpn=2.2, lb=-0.4, lf=0.3, dx=-2)),
    (0.5, kf(lean=-0.55, af=1.2, afb=1.0, ab=0.6, abb=0.9, wpn=1.4, lb=-0.9, lbb=0.9, lf=0.65, lfb=0.9, dx=-7, dy=-4, hdx=-1)),
    (1.0, kf(lean=-0.30, af=0.9, afb=0.9, ab=0.3, abb=0.8, wpn=1.9, lb=-0.5, lbb=0.3, lf=0.4, lfb=0.3, dx=-5, dy=0)),
])

anim("ko", 2, False, 6, [
    (0.0, kf(kneel=1, lean=0.38, af=0.9, afb=0.3, ab=0.6, abb=0.2, wpn=2.9, hdx=1.0, hdy=1.5, face=1, dy=9)),
    (1.0, kf(kneel=1, lean=0.44, af=0.95, afb=0.3, ab=0.65, abb=0.2, wpn=2.9, hdx=1.3, hdy=1.9, face=1, dy=9.5)),
])

anim("victory", 4, True, 5, [
    (0.0, kf(lean=-0.05, af=-2.9, afb=0.2, ab=0.4, abb=0.9, wpn=-3.0, lb=-0.3, lf=0.3)),
    (0.5, kf(lean=-0.08, af=-3.0, afb=0.15, ab=0.5, abb=1.0, wpn=-3.1, lb=-0.3, lf=0.3, dy=-2, hdy=-0.5)),
    (1.0, kf(lean=-0.05, af=-2.9, afb=0.2, ab=0.4, abb=0.9, wpn=-3.0, lb=-0.3, lf=0.3)),
], sample="loop")


def anim_frames():
    """Returns [(anim_name, frame_index_in_anim, pose)] in sheet order plus an index table."""
    frames = []
    index = {}
    for name, a in ANIMS.items():
        n = a["n"]
        index[name] = dict(start=len(frames), count=n, fps=a["fps"], loop=a["loop"])
        for i in range(n):
            t = i / n if a["sample"] == "loop" else (i / (n - 1) if n > 1 else 0)
            frames.append((name, i, interp(a["keys"], t)))
    return frames, index


# ---------------------------------------------------------------------------
# Forward kinematics
# ---------------------------------------------------------------------------
def _dir(a):
    return (math.sin(a), math.cos(a))


def add(p, v, k=1.0):
    return (p[0] + v[0] * k, p[1] + v[1] * k)


@dataclass
class Rig:
    body: Body
    pose: dict
    hip: tuple = (0, 0)
    up: tuple = (0, -1)
    right: tuple = (1, 0)
    shoulder: tuple = (0, 0)
    sf: tuple = (0, 0)
    sb: tuple = (0, 0)
    ef: tuple = (0, 0)
    eb: tuple = (0, 0)
    hf: tuple = (0, 0)
    hb: tuple = (0, 0)
    hipf: tuple = (0, 0)
    hipb: tuple = (0, 0)
    kf: tuple = (0, 0)
    kb: tuple = (0, 0)
    af: tuple = (0, 0)
    ab: tuple = (0, 0)
    ff: tuple = (0, 0)
    fb: tuple = (0, 0)
    head: tuple = (0, 0)
    neck: tuple = (0, 0)
    arm_f_ang: tuple = (0, 0)
    arm_b_ang: tuple = (0, 0)
    leg_f_ang: tuple = (0, 0)
    leg_b_ang: tuple = (0, 0)
    torso: list = field(default_factory=list)
    chest: tuple = (0, 0)
    waist: tuple = (0, 0)
    lean: float = 0.0


def solve(body: Body, pose: dict) -> Rig:
    r = Rig(body, pose)
    p = pose
    kneel = p["kneel"]
    crouch = p["crouch"]
    hip = (HIP_X + p["dx"], HIP_Y + p["dy"] + crouch * 3)
    r.hip = hip
    lean = p["lean"]
    r.lean = lean
    up = (math.sin(lean), -math.cos(lean))
    right = (math.cos(lean), math.sin(lean))
    r.up, r.right = up, right
    S = add(hip, up, body.torso_len)
    r.shoulder = S
    r.sf = add(add(S, right, 0.6), (0, 1.2))
    r.sb = add(add(S, right, -2.2), (0, 0.6))
    r.waist = add(hip, up, body.torso_len * 0.42)
    r.chest = add(hip, up, body.torso_len * 0.78)

    # arms
    for side, sh, key in (("f", r.sf, "af"), ("b", r.sb, "ab")):
        a1 = p[key]
        a2 = a1 + p[key + "b"]
        e = add(sh, _dir(a1), body.upper_arm)
        h = add(e, _dir(a2), body.forearm)
        setattr(r, "e" + side, e)
        setattr(r, "h" + side, h)
        setattr(r, f"arm_{side}_ang", (a1, a2))

    # legs
    r.hipf = add(hip, (1.2, 0.5))
    r.hipb = add(hip, (-1.6, 0.2))
    for side, hp, key in (("f", r.hipf, "lf"), ("b", r.hipb, "lb")):
        a1 = p[key]
        bend = p[key + "b"]
        if kneel:
            # kneeling: thighs forward, shins folded back under the body
            a1 = 1.15 if side == "f" else 0.95
            bend = 2.6
        a2 = a1 - bend
        k = add(hp, _dir(a1), body.thigh)
        a = add(k, _dir(a2), body.shin)
        setattr(r, "k" + side, k)
        setattr(r, "a" + side, a)
        setattr(r, f"leg_{side}_ang", (a1, a2))
        # foot points forward, mostly flat
        fa = 0.15 + (a2) * 0.25
        fdir = (math.cos(fa), math.sin(fa))
        setattr(r, "f" + side, add(a, fdir, 5.0))

    # head
    r.neck = add(S, up, 1.0)
    r.head = add(add(add(S, up, 2.2 + body.head_ry), right, 1.2), (p["hdx"], p["hdy"]))

    # torso outline (front = +right)
    sw, ww, hw = body.shoulder_w, body.waist_w, body.hip_w
    L = body.torso_len
    bust = body.bust
    pts = []
    pts.append(add(add(hip, right, -hw * 0.5), up, -1.5))          # back hip
    pts.append(add(add(hip, right, -ww * 0.5 - 0.6), up, L * 0.42))   # back waist
    pts.append(add(add(hip, right, -sw * 0.5 + 0.2), up, L * 0.82))   # back shoulder
    pts.append(add(add(hip, right, -sw * 0.5 + 1.5), up, L + 0.8))    # back neck
    pts.append(add(add(hip, right, sw * 0.5 - 1.0), up, L + 0.8))     # front neck
    pts.append(add(add(hip, right, sw * 0.5 + 0.4), up, L * 0.86))    # front shoulder / chest top
    pts.append(add(add(hip, right, sw * 0.5 + 0.9 + bust), up, L * 0.70))  # chest / bust
    pts.append(add(add(hip, right, ww * 0.5 + 0.2 + bust * 0.2), up, L * 0.48))  # belly
    pts.append(add(add(hip, right, ww * 0.5 + 0.1), up, L * 0.32))   # waist front
    pts.append(add(add(hip, right, hw * 0.5 + 0.6), up, 1.0))         # front hip
    pts.append(add(add(hip, right, hw * 0.5 + 0.2), up, -1.5))        # front hip low
    r.torso = pts
    return r
