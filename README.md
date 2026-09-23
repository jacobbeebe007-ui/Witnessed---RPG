# Witnessed — a Turn-Based RPG

A browser-based, turn-based JRPG inspired by **Dungeons & Dragons** mechanics and the
overworld-encounter feel of **Golden Sun**, **Final Fantasy**, and **Clair Obscur**.
Built with **Phaser 3**, **TypeScript**, and **Vite**. All art (characters, enemies,
tiles) is generated procedurally in code as **smooth vector 2D art with a dark/high-fantasy
palette** — no external assets required. Characters are **gender-differentiated**: male
figures have broader, more masculine builds and armor, while female figures have more
feminine silhouettes, clothing, and armor.

## Features

- **Start screen** with New Game / Continue (save is persisted to `localStorage`) and a **Settings** screen (master volume, SFX toggle, difficulty: Story / Normal / Hard).
- **Character creation**: choose **Male / Female** (which changes the body and armor styling), one of six classes, and spend a point-buy pool across the six D&D attributes (**STR, DEX, CON, INT, WIS, CHA**). Derived stats (HP, MP, Armor Class, Attack Bonus) update live, with an animated sprite preview.
- **Six classes**, each with a distinct sprite, kit, and starting gear:
  - **Mage / Siren** (the caster is named *Siren* for female characters) — arcane nuker
  - **Rogue** — fast, precise duelist
  - **Ranger** — reliable ranged damage & evasion
  - **Knight** — armored defender with holy strikes
  - **Brute** — high-HP berserker
  - **Inquisitor** — martial caster with self-healing
- **Overworld**: a procedurally-generated map (meadow → forest → wastes) with towns, obstacles (trees, water, mountains), an animated walking hero, camera follow, and collision.
- **Random encounters** while exploring, plus **roaming bosses** visible on the overworld that start a boss fight on contact.
- **Turn-based combat** driven by real **d20 to-hit rolls** and damage dice, with initiative-based turn order and commands: **Attack, Skill, Defend, Item, Flee**. Includes crits, floating damage numbers, HP/MP bars, XP, gold, and level-ups.
- **Town marketplace**: buy / sell / equip weapons and armor (which modify damage and rolls, D&D-style), buy potions, and rest to fully heal. Charisma affects shop prices.

## Controls

- **Move** (overworld): Arrow keys or **WASD**
- **Enter town**: **E** when the prompt appears
- **Menus / battle**: mouse click
- **Name entry** (character creation): type on the keyboard

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

## Project structure

```
src/
  config.ts            # global constants, colors, scene keys
  data/                # attributes, classes, skills, items, enemies, dice
  systems/             # character math, combat resolution, game state, RNG
  gfx/                 # procedural sprite/tile generation
  ui/                  # buttons, panels, ambient background
  scenes/              # Boot, Start, Settings, CharacterCreation, Overworld, Battle, Shop
```

## Roadmap ideas

- Party of up to 4 characters (systems are already structured for this)
- Status effects (poison, stun, buffs/debuffs) and elemental resistances
- More regions, quests, and story beats
- Sound effects and music
- Android packaging via Capacitor
