import Phaser from "phaser";
import { SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS } from "../config";
import { GameState } from "../systems/GameState";
import { charKey } from "../gfx/characters";
import { enemyKey } from "../gfx/enemies";
import { textStyle, drawPanel, Button } from "../ui/ui";
import { SKILLS } from "../data/skills";
import { CONSUMABLES } from "../data/items";
import { maxHP, maxMP, grantXP, initiative } from "../systems/character";
import { CLASSES } from "../data/classes";
import { rollNotation, chance } from "../data/dice";
import {
  spawnEnemy,
  playerAttack,
  playerSkill,
  enemyAttack,
  type EnemyInstance,
} from "../systems/battle";

type BattleState = "intro" | "menu" | "target" | "skillmenu" | "itemmenu" | "busy" | "over";

interface EnemyView {
  inst: EnemyInstance;
  sprite: Phaser.GameObjects.Sprite;
  bar: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  x: number;
  y: number;
}

export class BattleScene extends Phaser.Scene {
  private enemies: EnemyView[] = [];
  private playerSprite!: Phaser.GameObjects.Sprite;
  private state: BattleState = "intro";
  private isBoss = false;
  private bossId?: string;

  private guarding = false;
  private focusBonus = 0;

  private logLines: string[] = [];
  private logText!: Phaser.GameObjects.Text;
  private menuContainer!: Phaser.GameObjects.Container;
  private subContainer!: Phaser.GameObjects.Container;
  private hint!: Phaser.GameObjects.Text;
  private pHpText!: Phaser.GameObjects.Text;
  private pBar!: Phaser.GameObjects.Graphics;

  private turnOrder: Array<{ kind: "player" } | { kind: "enemy"; view: EnemyView }> = [];
  private turnIdx = 0;

  constructor() {
    super(SCENES.Battle);
  }

  create(): void {
    const pending = GameState.pendingBattle;
    if (!pending || !GameState.player) {
      this.scene.start(GameState.player ? SCENES.Overworld : SCENES.Start);
      return;
    }
    this.enemies = [];
    this.logLines = [];
    this.guarding = false;
    this.focusBonus = 0;
    this.isBoss = pending.isBoss;
    this.bossId = pending.bossId;

    this.buildBackground();
    this.buildEnemies(pending);
    this.buildPlayer();
    this.buildUi();

    this.state = "intro";
    this.cameras.main.fadeIn(300, 0, 0, 0);
    const introMsg = this.isBoss ? `${this.enemies[0].inst.def.name} blocks your path!` : `${this.enemies.map((e) => e.inst.def.name).join(", ")} appear!`;
    this.log(introMsg);
    this.time.delayedCall(650, () => this.startRound());
  }

  private buildBackground(): void {
    const region = this.isBoss ? 0x2a1230 : 0x142014;
    const g = this.add.graphics();
    g.fillGradientStyle(region, region, 0x05030a, 0x05030a, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    // ground band
    g.fillStyle(0x0a0710, 0.6);
    g.fillEllipse(GAME_WIDTH / 2, 300, GAME_WIDTH * 1.2, 260);
    if (this.isBoss) {
      const flash = this.add.text(GAME_WIDTH / 2, 40, "BOSS BATTLE", textStyle(22, COLORS.danger, { fontStyle: "bold" })).setOrigin(0.5);
      this.tweens.add({ targets: flash, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
    }
  }

  private buildEnemies(pending: NonNullable<typeof GameState.pendingBattle>): void {
    const level = GameState.player!.level;
    const diff = GameState.difficultyMult();
    const n = pending.enemies.length;
    pending.enemies.forEach((def, i) => {
      const hpMult = (def.boss ? 1 : 1 + 0.06 * (level - 1)) * diff;
      const inst = spawnEnemy(def, hpMult);
      const x = n === 1 ? GAME_WIDTH / 2 + 120 : GAME_WIDTH / 2 + 30 + i * 190;
      const y = 175 + (i % 2) * 20;
      const scale = def.boss ? 2.6 : 1.9;
      const sprite = this.add.sprite(x, y, enemyKey(def.id, 0)).setScale(scale).setOrigin(0.5, 1);
      sprite.play(`enemyidle_${def.id}`);
      sprite.setInteractive({ useHandCursor: true });
      const label = this.add.text(x, y - def.hp * 0 - (def.boss ? 130 : 90), def.name, textStyle(13, COLORS.text, { fontStyle: "bold" })).setOrigin(0.5);
      const bar = this.add.graphics();
      const view: EnemyView = { inst, sprite, bar, label, x, y };
      sprite.on("pointerdown", () => this.onEnemyClicked(view));
      sprite.on("pointerover", () => this.state === "target" && sprite.setTint(0xff8888));
      sprite.on("pointerout", () => sprite.clearTint());
      this.enemies.push(view);
      this.drawEnemyBar(view);
    });
  }

  private drawEnemyBar(v: EnemyView): void {
    const w = v.inst.def.boss ? 160 : 96;
    const topY = v.y - (v.inst.def.boss ? 120 : 84);
    v.label.setY(topY - 16);
    const g = v.bar;
    g.clear();
    if (!v.inst.alive) return;
    g.fillStyle(0x000000, 0.6);
    g.fillRect(v.x - w / 2 - 2, topY - 2, w + 4, 12);
    g.fillStyle(0x3a1a22, 1);
    g.fillRect(v.x - w / 2, topY, w, 8);
    g.fillStyle(v.inst.def.boss ? COLORS.danger : COLORS.hp, 1);
    g.fillRect(v.x - w / 2, topY, w * Phaser.Math.Clamp(v.inst.hp / v.inst.maxHp, 0, 1), 8);
  }

  private buildPlayer(): void {
    const p = GameState.player!;
    this.playerSprite = this.add.sprite(190, 330, charKey(p.classId, p.gender, 0)).setScale(3.6).setOrigin(0.5, 1);
    this.playerSprite.play(`idle_${p.classId}_${p.gender}`);
    this.add.ellipse(190, 332, 90, 20, 0x000000, 0.4).setDepth(-1);
  }

  // ---- UI ----
  private buildUi(): void {
    // Log panel
    drawPanel(this, 430, 388, 510, 140);
    this.logText = this.add.text(444, 398, "", textStyle(14, COLORS.text, { lineSpacing: 4, wordWrap: { width: 486 } }));

    // Command panel
    drawPanel(this, 20, 388, 396, 140);
    this.hint = this.add.text(38, 396, "", textStyle(13, COLORS.accent2)).setDepth(50);
    this.menuContainer = this.add.container(0, 0);
    this.subContainer = this.add.container(0, 0);

    // Player status
    drawPanel(this, 20, 300, 250, 76);
    const p = GameState.player!;
    this.add.text(34, 306, `${p.name}  Lv ${p.level} ${CLASSES[p.classId].name(p.gender)}`, textStyle(14, COLORS.text)).setDepth(50);
    this.pHpText = this.add.text(34, 350, "", textStyle(12, COLORS.textDim)).setDepth(50);
    this.pBar = this.add.graphics().setDepth(50);
    this.updatePlayerBar();

    this.buildMainMenu();
  }

  private updatePlayerBar(): void {
    const p = GameState.player!;
    const mhp = maxHP(p);
    const mmp = maxMP(p);
    this.pHpText.setText(`HP ${p.hp}/${mhp}    MP ${p.mp}/${mmp}`);
    const g = this.pBar;
    g.clear();
    g.fillStyle(0x2a1a22, 1);
    g.fillRect(34, 328, 220, 12);
    g.fillStyle(COLORS.hp, 1);
    g.fillRect(34, 328, 220 * Phaser.Math.Clamp(p.hp / mhp, 0, 1), 12);
    g.fillStyle(0x14203a, 1);
    g.fillRect(34, 342, 220, 6);
    g.fillStyle(COLORS.mp, 1);
    g.fillRect(34, 342, 220 * Phaser.Math.Clamp(p.mp / mmp, 0, 1), 6);
  }

  private buildMainMenu(): void {
    this.menuContainer.removeAll(true);
    const opts: Array<[string, () => void]> = [
      ["Attack", () => this.chooseAttack()],
      ["Skill", () => this.openSkillMenu()],
      ["Defend", () => this.doDefend()],
      ["Item", () => this.openItemMenu()],
      ["Flee", () => this.doFlee()],
    ];
    opts.forEach(([label, fn], i) => {
      const bx = 110 + (i % 2) * 190;
      const by = 424 + Math.floor(i / 2) * 44;
      const btn = new Button(this, bx, by, label, () => {
        if (this.state !== "menu") return;
        fn();
      }, { width: 175, height: 38, size: 17, fill: COLORS.panelLight });
      this.menuContainer.add(btn);
    });
  }

  private clearSub(): void {
    this.subContainer.removeAll(true);
  }

  // ---- Turn flow ----
  private startRound(): void {
    // build initiative order
    const order: BattleScene["turnOrder"] = [{ kind: "player" }];
    for (const v of this.enemies) if (v.inst.alive) order.push({ kind: "enemy", view: v });
    // sort by initiative roll (desc)
    const p = GameState.player!;
    const pInit = Phaser.Math.Between(1, 20) + initiative(p);
    const rolls = new Map<object, number>();
    rolls.set(order[0], pInit);
    for (let i = 1; i < order.length; i++) {
      const v = (order[i] as { view: EnemyView }).view;
      rolls.set(order[i], Phaser.Math.Between(1, 20) + Math.floor((v.inst.def.speed - 10) / 2));
    }
    order.sort((a, b) => (rolls.get(b) ?? 0) - (rolls.get(a) ?? 0));
    this.turnOrder = order;
    this.turnIdx = 0;
    this.nextTurn();
  }

  private nextTurn(): void {
    if (this.checkEnd()) return;
    if (this.turnIdx >= this.turnOrder.length) {
      this.startRound();
      return;
    }
    const actor = this.turnOrder[this.turnIdx];
    if (actor.kind === "enemy" && !actor.view.inst.alive) {
      this.turnIdx++;
      this.nextTurn();
      return;
    }
    if (actor.kind === "player") {
      this.guarding = false;
      this.state = "menu";
      this.hint.setText("Choose an action:");
      this.menuContainer.setVisible(true);
    } else {
      this.state = "busy";
      this.menuContainer.setVisible(false);
      this.hint.setText(`${actor.view.inst.def.name}'s turn…`);
      this.time.delayedCall(600, () => this.enemyAct(actor.view));
    }
  }

  private advance(): void {
    this.turnIdx++;
    this.time.delayedCall(500, () => this.nextTurn());
  }

  // ---- Player actions ----
  private aliveEnemies(): EnemyView[] {
    return this.enemies.filter((e) => e.inst.alive);
  }

  private chooseAttack(): void {
    this.beginTargeting((v) => {
      this.state = "busy";
      const res = playerAttack(GameState.player!, v.inst);
      this.log(res.log);
      this.lungePlayer();
      if (res.hit) this.applyDamageToEnemy(v, res.damage, res.crit);
      this.focusBonus = 0;
      this.advance();
    });
  }

  private openSkillMenu(): void {
    const p = GameState.player!;
    this.state = "skillmenu";
    this.menuContainer.setVisible(false);
    this.clearSub();
    this.hint.setText("Choose a skill (Esc to cancel):");
    p.skills.forEach((id, i) => {
      const sk = SKILLS[id];
      const bx = 110 + (i % 2) * 190;
      const by = 418 + Math.floor(i / 2) * 40;
      const affordable = p.mp >= sk.mp;
      const btn = new Button(this, bx, by, `${sk.name} (${sk.mp})`, () => this.castSkill(id), {
        width: 175,
        height: 34,
        size: 15,
        fill: COLORS.panelLight,
        disabled: !affordable,
      });
      this.subContainer.add(btn);
    });
    this.addCancel();
    this.enableEscCancel();
  }

  private castSkill(id: string): void {
    const p = GameState.player!;
    const sk = SKILLS[id];
    if (p.mp < sk.mp) return;
    if (sk.kind === "heal") {
      p.mp -= sk.mp;
      const res = playerSkill(p, id, this.enemies[0].inst, this.focusBonus);
      p.hp = Math.min(maxHP(p), p.hp + res.heal);
      this.log(res.log);
      this.floatText(190, 290, `+${res.heal}`, COLORS.good);
      this.updatePlayerBar();
      this.clearSub();
      this.advance();
      return;
    }
    if (sk.kind === "buff") {
      p.mp -= sk.mp;
      const res = playerSkill(p, id, this.enemies[0].inst, this.focusBonus);
      this.log(res.log);
      if (res.buff === "guard") this.guarding = true;
      if (res.buff === "focus") this.focusBonus = 4;
      if (res.buff === "haste") this.focusBonus = 2;
      this.updatePlayerBar();
      this.clearSub();
      this.advance();
      return;
    }
    // offensive: pick target
    this.clearSub();
    this.beginTargeting((v) => {
      p.mp -= sk.mp;
      this.state = "busy";
      const res = playerSkill(p, id, v.inst, this.focusBonus);
      this.log(res.log);
      this.lungePlayer();
      if (res.damage > 0) this.applyDamageToEnemy(v, res.damage, false);
      this.focusBonus = 0;
      this.updatePlayerBar();
      this.advance();
    });
  }

  private openItemMenu(): void {
    const p = GameState.player!;
    this.state = "itemmenu";
    this.menuContainer.setVisible(false);
    this.clearSub();
    const counts = new Map<string, number>();
    for (const id of p.inventory) counts.set(id, (counts.get(id) ?? 0) + 1);
    const consumables = [...counts.keys()].filter((id) => CONSUMABLES[id]);
    if (consumables.length === 0) {
      this.hint.setText("No usable items! (Esc to cancel)");
      this.addCancel();
      this.enableEscCancel();
      return;
    }
    this.hint.setText("Use an item (Esc to cancel):");
    consumables.forEach((id, i) => {
      const it = CONSUMABLES[id];
      const bx = 110 + (i % 2) * 190;
      const by = 418 + Math.floor(i / 2) * 40;
      const btn = new Button(this, bx, by, `${it.name} x${counts.get(id)}`, () => this.useItem(id), {
        width: 175,
        height: 34,
        size: 14,
        fill: COLORS.panelLight,
      });
      this.subContainer.add(btn);
    });
    this.addCancel();
    this.enableEscCancel();
  }

  private useItem(id: string): void {
    const p = GameState.player!;
    const it = CONSUMABLES[id];
    const idx = p.inventory.indexOf(id);
    if (idx < 0) return;
    p.inventory.splice(idx, 1);
    const amt = rollNotation(it.amount).total;
    if (it.effect === "heal") {
      p.hp = Math.min(maxHP(p), p.hp + amt);
      this.log(`${p.name} drinks ${it.name} and recovers ${amt} HP.`);
      this.floatText(190, 290, `+${amt}`, COLORS.good);
    } else {
      p.mp = Math.min(maxMP(p), p.mp + amt);
      this.log(`${p.name} uses ${it.name} and recovers ${amt} MP.`);
      this.floatText(190, 290, `+${amt} MP`, COLORS.mp);
    }
    this.updatePlayerBar();
    this.clearSub();
    this.advance();
  }

  private doDefend(): void {
    const p = GameState.player!;
    this.guarding = true;
    const rec = Math.max(2, Math.floor(maxMP(p) * 0.1));
    p.mp = Math.min(maxMP(p), p.mp + rec);
    this.log(`${p.name} takes a defensive stance. (+${rec} MP, incoming damage halved)`);
    this.updatePlayerBar();
    this.advance();
  }

  private doFlee(): void {
    const p = GameState.player!;
    if (this.isBoss) {
      this.log("There's no fleeing from a boss!");
      return;
    }
    const fastest = Math.max(...this.aliveEnemies().map((e) => e.inst.def.speed));
    const fleeChance = Phaser.Math.Clamp(0.4 + (p.attrs.dex - fastest) * 0.03, 0.15, 0.9);
    this.state = "busy";
    this.menuContainer.setVisible(false);
    if (chance(fleeChance)) {
      this.log("Got away safely!");
      this.time.delayedCall(700, () => this.returnToOverworld());
    } else {
      this.log("Couldn't escape!");
      this.advance();
    }
  }

  // ---- Targeting ----
  private targetCb: ((v: EnemyView) => void) | null = null;

  private beginTargeting(cb: (v: EnemyView) => void): void {
    const alive = this.aliveEnemies();
    if (alive.length === 1) {
      cb(alive[0]);
      return;
    }
    this.state = "target";
    this.targetCb = cb;
    this.menuContainer.setVisible(false);
    this.hint.setText("Select a target (click an enemy):");
    alive.forEach((v) => v.sprite.setTint(0xffcccc));
    this.addCancel(() => {
      this.aliveEnemies().forEach((v) => v.sprite.clearTint());
      this.targetCb = null;
      this.backToMenu();
    });
  }

  private onEnemyClicked(v: EnemyView): void {
    if (this.state !== "target" || !v.inst.alive || !this.targetCb) return;
    const cb = this.targetCb;
    this.targetCb = null;
    this.aliveEnemies().forEach((e) => e.sprite.clearTint());
    this.clearSub();
    cb(v);
  }

  private addCancel(onCancel?: () => void): void {
    const btn = new Button(this, 360, 500, "Cancel", () => {
      if (onCancel) onCancel();
      else this.backToMenu();
    }, { width: 90, height: 26, size: 13, fill: COLORS.panel });
    this.subContainer.add(btn);
  }

  private enableEscCancel(): void {
    this.input.keyboard?.once("keydown-ESC", () => {
      if (this.state === "skillmenu" || this.state === "itemmenu") this.backToMenu();
    });
  }

  private backToMenu(): void {
    this.clearSub();
    this.state = "menu";
    this.hint.setText("Choose an action:");
    this.menuContainer.setVisible(true);
  }

  // ---- Enemy action ----
  private enemyAct(v: EnemyView): void {
    if (!v.inst.alive) {
      this.advance();
      return;
    }
    const p = GameState.player!;
    const res = enemyAttack(v.inst, p, this.guarding, 1);
    // enemy lunge
    this.tweens.add({ targets: v.sprite, x: v.x - 40, duration: 120, yoyo: true });
    this.log(res.log);
    if (res.hit) {
      this.time.delayedCall(140, () => {
        p.hp = Math.max(0, p.hp - res.damage);
        this.floatText(190, 280, `-${res.damage}`, COLORS.danger);
        this.cameras.main.shake(160, 0.008);
        this.playerSprite.setTint(0xff6666);
        this.time.delayedCall(160, () => this.playerSprite.clearTint());
        this.updatePlayerBar();
        if (p.hp <= 0) {
          this.time.delayedCall(500, () => this.defeat());
          return;
        }
      });
    }
    this.advance();
  }

  // ---- Damage application ----
  private applyDamageToEnemy(v: EnemyView, dmg: number, crit: boolean): void {
    this.time.delayedCall(150, () => {
      v.inst.hp = Math.max(0, v.inst.hp - dmg);
      this.floatText(v.x, v.y - (v.inst.def.boss ? 90 : 60), `${dmg}`, crit ? COLORS.accent2 : COLORS.text, crit);
      this.tweens.add({ targets: v.sprite, x: v.x + 24, duration: 70, yoyo: true });
      v.sprite.setTint(0xffffff);
      this.time.delayedCall(80, () => v.sprite.clearTint());
      this.drawEnemyBar(v);
      if (v.inst.hp <= 0) this.killEnemy(v);
    });
  }

  private killEnemy(v: EnemyView): void {
    v.inst.alive = false;
    this.log(`${v.inst.def.name} is defeated!`);
    v.bar.clear();
    v.label.setVisible(false);
    this.tweens.add({
      targets: v.sprite,
      alpha: 0,
      y: v.y + 12,
      angle: v.inst.def.boss ? 0 : 90,
      duration: 500,
      onComplete: () => v.sprite.setVisible(false),
    });
  }

  // ---- Effects ----
  private lungePlayer(): void {
    this.tweens.add({ targets: this.playerSprite, x: 250, duration: 110, yoyo: true, ease: "Quad.out" });
  }

  private floatText(x: number, y: number, msg: string, color: number, big = false): void {
    const t = this.add.text(x, y, msg, textStyle(big ? 30 : 22, color, { fontStyle: "bold" })).setOrigin(0.5).setDepth(200);
    t.setStroke("#000000", 4);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 900, ease: "Quad.out", onComplete: () => t.destroy() });
  }

  private log(line: string): void {
    this.logLines.push(line);
    if (this.logLines.length > 5) this.logLines.shift();
    this.logText.setText(this.logLines.join("\n"));
  }

  // ---- End states ----
  private checkEnd(): boolean {
    if (this.state === "over") return true;
    if (this.aliveEnemies().length === 0) {
      this.victory();
      return true;
    }
    if (GameState.player!.hp <= 0) {
      this.defeat();
      return true;
    }
    return false;
  }

  private victory(): void {
    this.state = "over";
    this.menuContainer.setVisible(false);
    this.clearSub();
    const p = GameState.player!;
    const pending = GameState.pendingBattle!;
    let xp = 0;
    let gold = 0;
    for (const def of pending.enemies) {
      xp += def.xp;
      gold += rollNotation(def.gold).total;
    }
    xp = Math.round(xp * (this.isBoss ? 1 : 1));
    const before = p.level;
    const lu = grantXP(p, xp);
    p.gold += gold;
    if (this.bossId && !GameState.overworld.defeatedBosses.includes(this.bossId)) {
      GameState.overworld.defeatedBosses.push(this.bossId);
    }
    GameState.save();

    const panel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(300);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.6);
    bg.fillRect(-GAME_WIDTH / 2, -GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT);
    panel.add(bg);
    drawPanelInContainer(this, panel, -230, -120, 460, 240);
    panel.add(this.add.text(0, -95, this.isBoss ? "BOSS DEFEATED!" : "VICTORY!", textStyle(34, COLORS.accent2, { fontStyle: "bold" })).setOrigin(0.5));
    const lines = [`Experience gained: ${xp}`, `Gold found: ${gold}`];
    if (lu.leveled) lines.push(`LEVEL UP!  ${before} → ${lu.newLevel}   (+${lu.hpGain} HP, +${lu.mpGain} MP)`);
    panel.add(this.add.text(0, -30, lines.join("\n"), textStyle(18, COLORS.text, { align: "center", lineSpacing: 8 })).setOrigin(0.5));
    const cont = new Button(this, 0, 78, "Continue", () => this.returnToOverworld(), { width: 200, height: 44, fill: COLORS.border });
    panel.add(cont);
    if (lu.leveled) this.cameras.main.flash(400, 180, 150, 60);
  }

  private defeat(): void {
    if (this.state === "over") return;
    this.state = "over";
    this.menuContainer.setVisible(false);
    this.clearSub();
    const p = GameState.player!;
    this.playerSprite.setTint(0x555555);
    const lostGold = Math.floor(p.gold * 0.2);
    p.gold -= lostGold;

    const panel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(300);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.75);
    bg.fillRect(-GAME_WIDTH / 2, -GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT);
    panel.add(bg);
    drawPanelInContainer(this, panel, -230, -120, 460, 240);
    panel.add(this.add.text(0, -90, "YOU WERE DEFEATED", textStyle(30, COLORS.danger, { fontStyle: "bold" })).setOrigin(0.5));
    panel.add(this.add.text(0, -34, `A traveling healer revives you at the last town.\nYou lost ${lostGold} gold.`, textStyle(16, COLORS.text, { align: "center", lineSpacing: 6 })).setOrigin(0.5));
    // revive
    p.hp = maxHP(p);
    p.mp = maxMP(p);
    GameState.overworld.hasSpawn = true;
    GameState.overworld.x = 5 * 32;
    GameState.overworld.y = 16 * 32;
    GameState.save();
    const btn = new Button(this, 0, 74, "Return to Town", () => this.returnToOverworld(), { width: 220, height: 44, fill: COLORS.border });
    panel.add(btn);
  }

  private returnToOverworld(): void {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.time.delayedCall(320, () => {
      GameState.pendingBattle = null;
      this.scene.start(SCENES.Overworld);
    });
  }
}

function drawPanelInContainer(scene: Phaser.Scene, container: Phaser.GameObjects.Container, x: number, y: number, w: number, h: number): void {
  const g = scene.add.graphics();
  g.fillStyle(COLORS.panel, 0.98);
  g.fillRoundedRect(x, y, w, h, 10);
  g.lineStyle(2, COLORS.accent, 1);
  g.strokeRoundedRect(x, y, w, h, 10);
  container.add(g);
}
