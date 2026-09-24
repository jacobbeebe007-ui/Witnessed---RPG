# Witnessed — a Turn-Based Fantasy RPG

A browser-based JRPG in the spirit of **Golden Sun** (overworld, towns, roaming bosses)
and **Clair Obscur: Expedition 33** (timed strikes, dodge, and parry). Built with
**Phaser 3**, **TypeScript**, and **Vite**. All art is generated in code — high-detail
pixel characters whose **armor and weapons rewrite their silhouette**, with distinct
masculine and feminine cuts.

> This repository is a web/Phaser game. The same design (party of four, timed combat,
> equipment-driven models) can be ported to Godot; the playable build here is the
> Phaser implementation so it runs in any browser.

## Features

- **Character creation**: Male / Female, six classes, D&D point-buy (STR DEX CON INT WIS CHA), live sprite preview.
- **Six classes** with gendered names and kits (Mage / *Siren*, Rogue, Ranger, Knight, Brute, Inquisitor).
- **Party of up to 4** on screen at once. Recruit **Aria Vale**, **Thorne Kestrel**, and **Dame Mirielle** along the road.
- **Equipment changes the model**: cloth gowns vs tabards, fitted leather vs bulky vests, valkyrie plate vs war-bulwark. Weapons (staff, bow, blades, axe, mace, hammer) are drawn on the sprite.
- **Attack animations**: walk, idle, slash / shot, cast, hurt, and guard frames.
- **Expedition-style combat**: a sliding gold window on every strike (SPACE / click). Incoming blows can be **Dodged [D]** or **Parried [F]** — a perfect parry counters.
- **Level-up abilities**: each class unlocks new skills at set levels (Frost Lance, Flurry, Solstice Nova, Earthshatter, …).
- **Overworld**: meadow → forest → wastes, towns, roaming bosses, followers trailing the hero.
- **Town marketplace**: buy / sell / rest, and equip **any party member** (preview updates live).

## Controls

- **Move** (overworld): Arrow keys or **WASD**
- **Talk / enter town**: **E**
- **Battle menus**: mouse
- **Time a strike**: **SPACE** or click when the marker is in gold
- **Dodge / Parry**: **D** / **F** (SPACE also dodges)
- **Name entry**: type on the keyboard

## Running locally

```bash
npm install
npm run dev
```

Then open the printed URL (default http://localhost:5173/).

### Other scripts

- `npm run build` — type-check and produce a production build in `dist/`
- `npm run preview` — serve the production build
- `npm run typecheck` — type-check only
- `npm test` — unit tests for timing, skill unlocks, and party size

## Project structure

```
src/
  config.ts            # global constants, colors, scene keys
  data/                # attributes, classes, skills, items, enemies, companions
  systems/             # character math, combat, timing, game state
  gfx/                 # procedural sprites (equipment-aware, gendered)
  ui/                  # buttons, panels, ambient background
  scenes/              # Boot, Start, Settings, Creation, Dialogue, Overworld, Battle, Shop
tests/                 # vitest coverage for combat timing and party rules
```
