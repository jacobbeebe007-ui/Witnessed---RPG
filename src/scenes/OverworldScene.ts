import Phaser from "phaser";
import { SCENES, TILE, COLORS, GAME_WIDTH, GAME_HEIGHT } from "../config";
import { GameState } from "../systems/GameState";
import { charKey, ensureWalkAnim } from "../gfx/characters";
import { enemyKey } from "../gfx/enemies";
import { ENEMIES, ENCOUNTER_TABLES, type EnemyDef } from "../data/enemies";
import { CLASSES } from "../data/classes";
import { makeRng } from "../systems/rng";
import { textStyle } from "../ui/ui";
import { maxHP, maxMP } from "../systems/character";

const MAP_W = 48;
const MAP_H = 32;
const SEED = 1337;

type TileType = "ground" | "tree" | "water" | "mountain" | "town" | "path";

interface Town {
  tx: number;
  ty: number;
  region: string;
}

interface BossMarker {
  id: string;
  sprite: Phaser.GameObjects.Sprite;
  tween?: Phaser.Tweens.Tween;
}

export class OverworldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private grid: TileType[][] = [];
  private towns: Town[] = [];
  private bosses: BossMarker[] = [];
  private distanceAcc = 0;
  private nextEncounter = 180;
  private nearTown: Town | null = null;
  private transitioning = false;

  // HUD
  private hpBar!: Phaser.GameObjects.Graphics;
  private hudText!: Phaser.GameObjects.Text;
  private toast!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENES.Overworld);
  }

  create(): void {
    if (!GameState.player) {
      this.scene.start(SCENES.Start);
      return;
    }
    this.transitioning = false;
    this.distanceAcc = 0;
    this.nextEncounter = Phaser.Math.Between(320, 560);

    this.buildMap();
    this.buildPlayer();
    this.buildBosses();
    this.buildHud();
    this.setupInput();

    this.cameras.main.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    this.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300, 0, 0, 0);

    if (GameState.pendingBattle) GameState.pendingBattle = null; // returning from battle handled by init state
  }

  // ---- Map generation ----
  private regionAt(tx: number): string {
    if (tx < MAP_W * 0.34) return "meadow";
    if (tx < MAP_W * 0.67) return "forest";
    return "wastes";
  }

  private buildMap(): void {
    const rng = makeRng(SEED);
    this.grid = [];
    for (let y = 0; y < MAP_H; y++) {
      const row: TileType[] = [];
      for (let x = 0; x < MAP_W; x++) row.push("ground");
      this.grid.push(row);
    }

    // Towns (fixed)
    this.towns = [
      { tx: 5, ty: 16, region: "meadow" },
      { tx: 23, ty: 9, region: "forest" },
      { tx: 41, ty: 22, region: "wastes" },
    ];

    // Scatter obstacles
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const edge = x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1;
        const region = this.regionAt(x);
        const r = rng();
        if (edge) {
          this.grid[y][x] = region === "wastes" ? "mountain" : "tree";
          continue;
        }
        if (region === "meadow") {
          if (r < 0.06) this.grid[y][x] = "tree";
          else if (r < 0.08) this.grid[y][x] = "water";
        } else if (region === "forest") {
          if (r < 0.2) this.grid[y][x] = "tree";
          else if (r < 0.23) this.grid[y][x] = "water";
        } else {
          if (r < 0.12) this.grid[y][x] = "mountain";
          else if (r < 0.14) this.grid[y][x] = "tree";
        }
      }
    }

    // Clear spawn area + around towns, and carve a horizontal path
    this.clearArea(2, 15, 4);
    for (const t of this.towns) {
      this.clearArea(t.tx, t.ty, 2);
      this.grid[t.ty][t.tx] = "town";
    }
    // Carve a rough main path across the map at varying y
    let py = 16;
    const prng = makeRng(SEED + 7);
    for (let x = 2; x < MAP_W - 2; x++) {
      if (prng() < 0.25) py += prng() < 0.5 ? 1 : -1;
      py = Phaser.Math.Clamp(py, 3, MAP_H - 4);
      for (let dy = -1; dy <= 1; dy++) {
        const yy = py + dy;
        if (this.grid[yy][x] !== "town") this.grid[yy][x] = dy === 0 ? "path" : this.grid[yy][x] === "ground" ? "ground" : this.grid[yy][x];
      }
      if (this.grid[py][x] === "tree" || this.grid[py][x] === "water" || this.grid[py][x] === "mountain") this.grid[py][x] = "path";
    }

    // Render tiles
    this.obstacles = this.physics.add.staticGroup();
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const region = this.regionAt(x);
        const groundKey = region === "meadow" ? "tile_meadow" : region === "forest" ? "tile_forest" : "tile_wastes";
        const t = this.grid[y][x];
        const wx = x * TILE;
        const wy = y * TILE;
        if (t === "path") {
          this.add.image(wx, wy, "tile_path").setOrigin(0);
        } else {
          this.add.image(wx, wy, groundKey).setOrigin(0);
        }
        if (t === "tree" || t === "water" || t === "mountain") {
          const key = t === "tree" ? "tile_tree" : t === "water" ? "tile_water" : "tile_mountain";
          this.add.image(wx, wy, key).setOrigin(0);
          const ob = this.obstacles.create(wx + TILE / 2, wy + TILE / 2, "tile_blank") as Phaser.Physics.Arcade.Sprite;
          ob.setVisible(false).setSize(TILE, TILE).refreshBody();
        } else if (t === "town") {
          this.add.image(wx, wy, "tile_town").setOrigin(0);
          this.add.text(wx + TILE / 2, wy - 6, "Town", textStyle(11, COLORS.accent2, { fontStyle: "bold" })).setOrigin(0.5);
        }
      }
    }
  }

  private clearArea(tx: number, ty: number, r: number): void {
    for (let y = ty - r; y <= ty + r; y++) {
      for (let x = tx - r; x <= tx + r; x++) {
        if (x > 0 && y > 0 && x < MAP_W - 1 && y < MAP_H - 1) this.grid[y][x] = "ground";
      }
    }
  }

  // ---- Player ----
  private buildPlayer(): void {
    const p = GameState.player!;
    ensureWalkAnim(this, p.classId, p.gender);
    let sx = GameState.overworld.hasSpawn ? GameState.overworld.x : 3 * TILE;
    let sy = GameState.overworld.hasSpawn ? GameState.overworld.y : 15 * TILE;
    this.player = this.physics.add.sprite(sx, sy, charKey(p.classId, p.gender, 0)).setScale(1.4);
    this.player.setSize(16, 10).setOffset(4, 22);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.physics.add.collider(this.player, this.obstacles);
    this.player.play(`idle_${p.classId}_${p.gender}`);
  }

  private buildBosses(): void {
    const defs: Array<{ id: string; tx: number; ty: number }> = [
      { id: "boss_ogre", tx: 30, ty: 20 },
      { id: "boss_dragon", tx: 43, ty: 8 },
    ];
    for (const b of defs) {
      if (GameState.overworld.defeatedBosses.includes(b.id)) continue;
      const def = ENEMIES[b.id];
      const spr = this.add.sprite(b.tx * TILE, b.ty * TILE, enemyKey(b.id, 0)).setScale(1.1).setDepth(9);
      spr.play(`enemyidle_${b.id}`);
      const marker: BossMarker = { id: b.id, sprite: spr };
      // wander
      marker.tween = this.tweens.add({
        targets: spr,
        x: spr.x + Phaser.Math.Between(-2, 2) * TILE,
        y: spr.y + Phaser.Math.Between(-2, 2) * TILE,
        duration: 2600,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
      // danger aura
      const aura = this.add.circle(spr.x, spr.y, 40, def.palette[0], 0.15).setDepth(8);
      this.tweens.add({ targets: aura, scale: 1.3, alpha: 0.02, duration: 1400, yoyo: true, repeat: -1 });
      spr.on("destroy", () => aura.destroy());
      this.bosses.push(marker);
    }
  }

  // ---- HUD ----
  private buildHud(): void {
    const g = this.add.graphics().setScrollFactor(0).setDepth(100);
    g.fillStyle(0x000000, 0.55);
    g.fillRoundedRect(10, 10, 260, 74, 8);
    g.lineStyle(2, COLORS.border, 1);
    g.strokeRoundedRect(10, 10, 260, 74, 8);
    this.hpBar = this.add.graphics().setScrollFactor(0).setDepth(101);
    this.hudText = this.add.text(20, 16, "", textStyle(13, COLORS.text, { lineSpacing: 2 })).setScrollFactor(0).setDepth(102);

    this.toast = this.add.text(GAME_WIDTH / 2, 90, "", textStyle(20, COLORS.accent2, { fontStyle: "bold" })).setScrollFactor(0).setOrigin(0.5).setDepth(103).setAlpha(0);
    this.promptText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, "", textStyle(16, COLORS.text, { backgroundColor: "#1a1226aa" })).setScrollFactor(0).setOrigin(0.5).setDepth(103).setPadding(10, 6, 10, 6).setAlpha(0);

    this.add.text(GAME_WIDTH - 12, 12, "Move: Arrows / WASD   •   Enter Town: E", textStyle(12, COLORS.textDim)).setScrollFactor(0).setOrigin(1, 0).setDepth(102);
    this.updateHud();
  }

  private updateHud(): void {
    const p = GameState.player!;
    const mhp = maxHP(p);
    const mmp = maxMP(p);
    this.hudText.setText(`${p.name}  •  Lv ${p.level} ${this.className()}\nGold: ${p.gold}`);
    const g = this.hpBar;
    g.clear();
    // HP
    g.fillStyle(0x2a1a22, 1);
    g.fillRect(20, 48, 240, 12);
    g.fillStyle(COLORS.hp, 1);
    g.fillRect(20, 48, 240 * Phaser.Math.Clamp(p.hp / mhp, 0, 1), 12);
    // MP
    g.fillStyle(0x14203a, 1);
    g.fillRect(20, 64, 240, 8);
    g.fillStyle(COLORS.mp, 1);
    g.fillRect(20, 64, 240 * Phaser.Math.Clamp(p.mp / mmp, 0, 1), 8);
  }

  private className(): string {
    const p = GameState.player!;
    return CLASSES[p.classId].name(p.gender);
  }

  private showToast(msg: string, color = COLORS.accent2): void {
    this.toast.setText(msg).setColor("#" + color.toString(16).padStart(6, "0")).setAlpha(1);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: 1200, duration: 600 });
  }

  // ---- Input ----
  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,E") as Record<string, Phaser.Input.Keyboard.Key>;
    this.keys.E.on("down", () => {
      if (this.nearTown && !this.transitioning) this.enterTown();
    });
  }

  private enterTown(): void {
    this.transitioning = true;
    GameState.overworld.x = this.player.x;
    GameState.overworld.y = this.player.y;
    GameState.overworld.hasSpawn = true;
    GameState.save();
    this.scene.start(SCENES.Shop);
  }

  update(_time: number, delta: number): void {
    if (!this.player || this.transitioning || !GameState.player) return;
    const p = GameState.player;
    const speed = 150;
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) vx = -speed;
    else if (this.cursors.right.isDown || this.keys.D.isDown) vx = speed;
    if (this.cursors.up.isDown || this.keys.W.isDown) vy = -speed;
    else if (this.cursors.down.isDown || this.keys.S.isDown) vy = speed;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(vx, vy);
    if (vx !== 0 && vy !== 0) body.velocity.normalize().scale(speed);

    const moving = vx !== 0 || vy !== 0;
    const walkKey = `walk_${p.classId}_${p.gender}`;
    const idleKey = `idle_${p.classId}_${p.gender}`;
    if (moving) {
      if (this.player.anims.currentAnim?.key !== walkKey) this.player.play(walkKey);
      if (vx !== 0) this.player.setFlipX(vx < 0);
    } else if (this.player.anims.currentAnim?.key !== idleKey) {
      this.player.play(idleKey);
    }

    // encounter accumulation
    if (moving) {
      this.distanceAcc += (speed * delta) / 1000;
      if (this.distanceAcc >= this.nextEncounter) {
        this.distanceAcc = 0;
        this.nextEncounter = Phaser.Math.Between(320, 560);
        this.tryEncounter();
        return;
      }
    }

    // town proximity
    this.nearTown = null;
    const ptx = Math.floor(this.player.x / TILE);
    const pty = Math.floor(this.player.y / TILE);
    for (const t of this.towns) {
      if (Math.abs(t.tx - ptx) <= 1 && Math.abs(t.ty - pty) <= 1) {
        this.nearTown = t;
        break;
      }
    }
    if (this.nearTown) {
      if (this.promptText.alpha < 1) this.promptText.setText("Press  E  to enter Town (shop & rest)").setAlpha(1);
    } else if (this.promptText.alpha > 0) {
      this.promptText.setAlpha(0);
    }

    // boss contact
    for (const b of this.bosses) {
      if (!b.sprite.active) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, b.sprite.x, b.sprite.y);
      if (d < 34) {
        this.startBossBattle(b);
        return;
      }
    }

    this.updateHud();
  }

  private tryEncounter(): void {
    const region = this.regionAt(Math.floor(this.player.x / TILE));
    const chance = region === "meadow" ? 0.35 : region === "forest" ? 0.5 : 0.65;
    if (Math.random() > chance) return;
    const table = ENCOUNTER_TABLES[region];
    const count = Math.random() < 0.4 ? 2 : 1;
    const enemies: EnemyDef[] = [];
    const level = GameState.player!.level;
    for (let i = 0; i < count; i++) {
      const pool = table.filter((id) => ENEMIES[id].minLevel <= level + 1);
      const id = (pool.length ? pool : table)[Math.floor(Math.random() * (pool.length ? pool.length : table.length))];
      enemies.push(ENEMIES[id]);
    }
    this.launchBattle(enemies, false);
  }

  private startBossBattle(b: BossMarker): void {
    b.tween?.stop();
    this.launchBattle([ENEMIES[b.id]], true, b.id);
  }

  private launchBattle(enemies: EnemyDef[], isBoss: boolean, bossId?: string): void {
    this.transitioning = true;
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    GameState.overworld.x = this.player.x;
    GameState.overworld.y = this.player.y;
    GameState.overworld.hasSpawn = true;
    GameState.pendingBattle = {
      enemies,
      isBoss,
      bossId,
      returnX: this.player.x,
      returnY: this.player.y,
    };
    // Flash + zoom transition
    this.showToast(isBoss ? "! BOSS ENCOUNTER !" : "Ambushed!", isBoss ? COLORS.danger : COLORS.accent2);
    this.cameras.main.flash(300, 120, 40, 160);
    this.cameras.main.shake(260, 0.006);
    this.time.delayedCall(360, () => this.scene.start(SCENES.Battle));
  }
}
