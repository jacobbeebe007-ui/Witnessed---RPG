#!/usr/bin/env python3
"""Generate every sprite sheet used by the Godot project.

    python3 tools/spritegen/generate.py [--only heroes|armor|weapons|hair|enemies|effects|world|ui]

Outputs land in godot/assets/... together with JSON index files that the
GDScript side reads (animation tables, frame sizes, layer names).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from multiprocessing import Pool

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PIL import Image  # noqa: E402

import rig  # noqa: E402
import hero  # noqa: E402
import armor  # noqa: E402
import enemies  # noqa: E402
import effects  # noqa: E402
import tiles  # noqa: E402
import overworld  # noqa: E402
import ui  # noqa: E402
from raster import sheet_rows  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "assets"))
GENDERS = ["male", "female"]


def out(*parts):
    p = os.path.join(ROOT, *parts)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    return p


def save(img: Image.Image, *parts):
    p = out(*parts)
    img.save(p, optimize=True)
    return p


# ---------------------------------------------------------------------------
def frames_for(gender):
    frames, index = rig.anim_frames()
    body = rig.BODIES[gender]
    return [(name, i, rig.solve(body, pose)) for name, i, pose in frames], index


def job_body(args):
    gender, tone = args
    fr, _ = frames_for(gender)
    rows = [[], [], []]
    for _, _, r in fr:
        layers = hero.draw_body(r, tone)
        for k in range(3):
            rows[k].append(layers[k].render())
    save(sheet_rows(rows, rig.FW, rig.FH), "sprites", "heroes", f"body_{gender}_{tone}.png")
    return f"body_{gender}_{tone}"


def job_hair(args):
    gender, style = args
    fr, _ = frames_for(gender)
    row = [hero.draw_hair(r, style).render() for _, _, r in fr]
    save(sheet_rows([row], rig.FW, rig.FH), "sprites", "hair", f"hair_{style}_{gender}.png")
    return f"hair_{style}_{gender}"


def job_armor(args):
    gender, aid = args
    fr, _ = frames_for(gender)
    rows = [[], [], []]
    for _, _, r in fr:
        layers = armor.draw_armor(r, aid)
        for k in range(3):
            rows[k].append(layers[k].render())
    save(sheet_rows(rows, rig.FW, rig.FH), "sprites", "armor", f"{aid}_{gender}.png")
    return f"{aid}_{gender}"


def job_weapon(args):
    gender, wid = args
    fr, _ = frames_for(gender)
    row = [hero.draw_weapon(r, wid, name).render() for name, _, r in fr]
    save(sheet_rows([row], rig.FW, rig.FH), "sprites", "weapons", f"{wid}_{gender}.png")
    return f"{wid}_{gender}"


def job_creature(name):
    frames, size = enemies.render_creature(name)
    save(sheet_rows([frames], size, size), "sprites", "enemies", f"{name}.png")
    return name, dict(kind="creature", frame=size, anims=enemies.CREATURE_ANIMS)


def job_humanoid(name):
    frames, size, index = enemies.render_humanoid(name)
    save(sheet_rows([frames], size, size), "sprites", "enemies", f"{name}.png")
    return name, dict(kind="humanoid", frame=size, anims=index)


def job_effect(name):
    frames, n, size = effects.render_effect(name)
    save(sheet_rows([frames], size, size), "sprites", "effects", f"{name}.png")
    return name, dict(frames=n, size=size)


def job_ow(args):
    kind, gender, key = args
    if kind == "body":
        img = overworld.render_ow_sheet(overworld.draw_ow_body, gender, key)
        save(img, "sprites", "overworld", f"ow_body_{gender}_{key}.png")
    elif kind == "hair":
        img = overworld.render_ow_sheet(overworld.draw_ow_hair, gender, key)
        save(img, "sprites", "overworld", f"ow_hair_{key}_{gender}.png")
    else:
        img = overworld.render_ow_sheet(overworld.draw_ow_outfit, gender, key)
        save(img, "sprites", "overworld", f"ow_outfit_{key}_{gender}.png")
    return f"ow_{kind}_{gender}_{key}"


def job_world(_):
    save(tiles.render_tileset(), "sprites", "overworld", "tileset.png")
    for name, img in tiles.render_objects().items():
        save(img, "sprites", "overworld", "objects", f"{name}.png")
    for kind in tiles.BACKDROPS:
        save(tiles.render_backdrop(kind), "sprites", "backdrops", f"{kind}.png")
    return "world"


def job_ui(_):
    save(ui.panel(), "sprites", "ui", "panel.png")
    save(ui.panel(fill=(40, 28, 60), border=(255, 230, 160), inner=(140, 110, 180)), "sprites", "ui", "panel_hi.png")
    save(ui.button(), "sprites", "ui", "button.png")
    save(ui.button(fill=(110, 80, 160), border=(255, 240, 180)), "sprites", "ui", "button_hover.png")
    save(ui.button(fill=(30, 22, 44), border=(90, 80, 110)), "sprites", "ui", "button_disabled.png")
    save(ui.bar_bg(), "sprites", "ui", "bar_bg.png")
    save(ui.cursor(), "sprites", "ui", "cursor.png")
    save(ui.target_arrow(), "sprites", "ui", "target.png")
    save(ui.icon_sheet(), "sprites", "ui", "icons.png")
    save(ui.logo(), "sprites", "ui", "logo.png")
    with open(out("sprites", "ui", "icons.json"), "w") as f:
        json.dump({n: i for i, n in enumerate(ui.ICONS)}, f, indent=1)
    return "ui"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="all")
    ap.add_argument("--jobs", type=int, default=max(1, os.cpu_count() or 1))
    a = ap.parse_args()
    only = a.only

    _, index = rig.anim_frames()
    with open(out("sprites", "heroes", "anim_index.json"), "w") as f:
        json.dump(dict(frame=[rig.FW, rig.FH], rows=["back", "core", "front"], anims=index,
                       skin_tones=list(hero.SKIN_TONES.keys()), hair_styles=hero.HAIR_STYLES,
                       armors=list(armor.ARMORS.keys()), weapons=list(hero.WEAPONS.keys())), f, indent=1)

    with Pool(a.jobs) as pool:
        def run(label, fn, items):
            if only not in ("all", label):
                return []
            res = pool.map(fn, items)
            print(f"[{label}] {len(res)} sheets")
            return res

        run("heroes", job_body, [(g, t) for g in GENDERS for t in hero.SKIN_TONES if not t.startswith("_")])
        run("hair", job_hair, [(g, s) for g in GENDERS for s in hero.HAIR_STYLES])
        run("armor", job_armor, [(g, aid) for g in GENDERS for aid in armor.ARMORS])
        run("weapons", job_weapon, [(g, w) for g in GENDERS for w in hero.WEAPONS])
        en = {}
        for name, info in run("enemies", job_creature, list(enemies.CREATURES)) + run("enemies", job_humanoid, list(enemies.HUMANOIDS)):
            en[name] = info
        if en:
            with open(out("sprites", "enemies", "index.json"), "w") as f:
                json.dump(en, f, indent=1)
        fx = dict(run("effects", job_effect, list(effects.EFFECTS)))
        if fx:
            with open(out("sprites", "effects", "index.json"), "w") as f:
                json.dump(fx, f, indent=1)
        ow_jobs = [("body", g, t) for g in GENDERS for t in hero.SKIN_TONES if not t.startswith("_")]
        ow_jobs += [("hair", g, s) for g in GENDERS for s in hero.HAIR_STYLES]
        ow_jobs += [("outfit", g, aid) for g in GENDERS for aid in armor.ARMORS]
        run("world", job_ow, ow_jobs)
        run("world", job_world, [0])
        run("ui", job_ui, [0])
    print("done ->", ROOT)


if __name__ == "__main__":
    main()
