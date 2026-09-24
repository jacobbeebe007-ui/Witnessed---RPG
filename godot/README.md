# Witnessed: Chronicles of the Veil

A turn-based fantasy RPG built for **Godot 4.4+** with high-detail procedural pixel art.
Choose a hero, recruit companions, master parry-and-counter combat, and close the Veil.

- Six starting classes, each with a male and a female variant (Knight / Valkyrie, Mage / Siren,
  Rogue / Shadow, Ranger / Huntress, Berserker / Valkyr Fury, Inquisitor / Oracle).
- Eight abilities per class unlocked by level (Lv1 to Lv20).
- Layered paper-doll character models: every weapon and armour piece changes the sprite.
  Armour sets have distinct feminine and masculine silhouettes.
- Six recruitable companions found across the world; up to four party members fight on screen.
- Clair Obscur-style combat: action points, timed-hit attacks, parry / dodge windows on every
  enemy strike, perfect parries that counter, break gauges, elements and status effects.
- Golden Sun-style bestiary (slimes, goblins, dire wolves, harpies, dune scorpions, risen
  skeletons, golems, wyrms and more) with idle / attack / hurt / death animations.
- Overworld with towns, shops, inns, random encounters, region banners, dialogue with choices.
- Difficulty and parry-assist settings, save / load, game over and ending screens.

## Running

1. Install [Godot 4.4 or newer](https://godotengine.org/download) (standard build, no .NET required).
2. Open this `godot/` folder as a project (or run `godot --path godot` from the repo root).
3. Press Play. The main scene is `res://scenes/title/Title.tscn`.

The window renders a 640x360 canvas scaled by integer factors (1280x720 by default).

### Controls

| Action | Keys |
| --- | --- |
| Move | WASD / arrow keys |
| Interact / talk / open shop | E |
| Party menu (equip, skills, items, system) | Tab (Esc closes) |
| Confirm / advance dialogue | Enter / Space / E |
| Back / close | Esc / Backspace / Q |
| Parry (in battle, during an enemy strike) | Space |
| Dodge (in battle, wider but weaker window) | Shift |
| Timed hit (during your own attack) | Enter or Space when the ring closes |

Enemy targets can also be picked with the mouse.

## Project layout

```
godot/
  project.godot           Godot project (autoloads, input map, display)
  autoload/               Assets, GameData (all tables), GameState (save/load), Router, Sfx
  scripts/                HeroData, PaperDoll (layered sprite), SheetSprite, WorldGen
  scenes/
    title/                Title screen
    creation/             Character creation (gender, class, hair, name, live preview)
    overworld/            Overworld, dialogue, encounters, recruitment
    battle/               Battle scene and Combatant model
    menu/                 Party menu (party, equip, skills, items, system)
    shop/                 Shop overlay
    ui/                   Theme, GameOver, Ending
  tests/                  Headless test scene (TestRunner.tscn)
  tools/spritegen/        Python pixel-art generator (source of every sprite in assets/)
  assets/sprites/         Generated sprite sheets and Godot .import metadata
```

## Regenerating the pixel art

All art is generated procedurally from `tools/spritegen/` so the models stay consistent and
easy to extend (new armour sets, weapons, hair styles, creatures).

```
pip install pillow
cd godot
python3 tools/spritegen/generate.py                # everything
python3 tools/spritegen/generate.py --only heroes  # heroes|armor|weapons|hair|enemies|effects|world|ui
godot --headless --path . --import                 # reimport changed textures
```

## Headless tests

```
cd godot
godot --headless --path . res://tests/TestRunner.tscn
```

The runner compiles every script, validates the data tables (skills, items, enemies,
companions, story), checks that every referenced sprite exists, exercises hero progression,
save / load, the combatant model, world generation (all points of interest reachable), scene
instantiation, and scripted battles including timed-hit grading, parry / dodge windows and a
boss fight.

## Demo battles

`Battle.tscn` can be run directly for a quick showcase. Environment variables select the setup:

```
WITNESSED_DEMO_ENEMIES=boss_drake,harpy WITNESSED_DEMO_BACKDROP=lair \
WITNESSED_DEMO_PARTY=knight,mage,rogue,ranger WITNESSED_DEMO_LEVEL=12 \
godot --path . res://scenes/battle/Battle.tscn
```

Backdrops: `meadow`, `forest`, `cave`, `ruins`, `wastes`, `lair`, `tower`.
