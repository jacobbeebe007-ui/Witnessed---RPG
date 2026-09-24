import Phaser from "phaser";
import { SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS } from "../config";
import { GameState } from "../systems/GameState";
import { actorKeys } from "../gfx/characters";
import { enemyKey } from "../gfx/enemies";
import { textStyle, drawPanel, Button } from "../ui/ui";
import { SKILLS } from "../data/skills";
import { CONSUMABLES } from "../data/items";
import { maxHP, maxMP, grantXP, initiative, type Character } from "../systems/character";
import { CLASSES } from "../data/classes";
import { rollNotation, chance } from "../data/dice";
import {
  spawnEnemy,
  playerAttack,
  playerSkill,
  enemyAttack,
  type EnemyInstance,
} from "../systems/battle";
import {
  type TimingGrade,
  gradeAttackTiming,
  comboMultiplier,
  gradeLabel,
  gradeColor,
  resolveDefense,
  type DefenseMove,
} from "../systems/timing";

type BattleState = "intro" | "menu" | "target" | "skillmenu" | "itemmenu" | "timing" | "defense" | "busy" | "over";

interface EnemyView {
  inst: EnemyInstance;
  sprite: Phaser.GameObjects.Sprite;
  bar: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  x: number;
  y: number;
}

interface AllyView {
  character: Character;
  sprite: Phaser.GameObjects.Sprite;
  keys: ReturnType<typeof actorKeys>;
  x: number;
  y: number;
  guarding: boolean;
  focusBonus: number;
}

export class BattleScene extends Phaser.Scene {
  private enemies: EnemyView[] = [];
  private allies: AllyView[] = [];
  private actor: AllyView | null = null;
  private state: BattleState = "intro";
  private isBoss = false;
  private bossId?: string;

  private logLines: string[] = [];
  private logText!: Phaser.GameObjects.Text;
  private menuContainer!: Phaser.GameObjects.Container;
  private subContainer!: Phaser.GameObjects.Container;
  private hint!: Phaser.GameObjects.Text;
  private partyHud!: Phaser.GameObjects.Graphics;
  private partyHudText: Phaser.GameObjects.Text[] = [];

  private turnOrder: Array<{ kind: "ally"; view: AllyView } | { kind: "enemy"; view: EnemyView }> = [];
  private turnIdx = 0;

  private meterGfx?: Phaser.GameObjects.Graphics;
  private meterMarker?: Phaser.GameObjects.Rectangle;
  private meterLabel?: Phaser.GameObjects.Text;

  constructor() {
    super(SCENES.Battle);
  }

  create(): void {
    const pending = GameState.pendingBattle;
    if (!pending || !GameState.party.length) {
      this.scene.start(GameState.party.length ? SCENES.Overworld : SCENES.Start);
      return;
    }
    this.enemies = [];
    this.allies = [];
    this.logLines = [];
    this.isBoss = pending.isBoss;
    this.bossId = pending.bossId;
    this.actor = null;

    this.buildBackground();
    this.buildEnemies(pending);
    this.buildParty();
    this.buildUi();

    this.state = "intro";
    this.cameras.main.fadeIn(300, 0, 0, 0);
    const introMsg = this.isBoss
      ? `${this.enemies[0].inst.def.name} blocks your path!`
      : `${this.enemies.map((e) => e.inst.def.name).join(", ")} appear!`;
    this.log(introMsg);
    this.log("Strike in the gold. Dodge [D] or Parry [F] incoming blows.");
    this.time.delayedCall(650, () => this.startRound());
  }

  private buildBackground(): void {
    const top = this.isBoss ? 0x3a1848 : 0x1c3a28;
    const bot = this.isBoss ? 0x140818 : 0x0c1810;
    const g = this.add.graphics();
    g.fillGradientStyle(top, top, bot, bot, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(0x2a4a30, 0.45);
    g.fillEllipse(GAME_WIDTH / 2, 310, GAME_WIDTH * 1.1, 220);
    g.fillStyle(0x1a3020, 0.5);
    g.fillEllipse(GAME_WIDTH / 2, 318, GAME_WIDTH * 0.7, 90);
    if (this.isBoss) {
      const flash = this.add.text(GAME_WIDTH / 2, 36, "BOSS BATTLE", textStyle(22, COLORS.danger, { fontStyle: "bold" })).setOrigin(0.5);
      this.tweens.add({ targets: flash, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
    }
  }

  private buildEnemies(pending: NonNullable<typeof GameState.pendingBattle>): void {
    const level = GameState.player?.level ?? 1;
    const diff = GameState.difficultyMult();
    const n = pending.enemies.length;
    pending.enemies.forEach((def, i) => {
      const hpMult = (def.boss ? 1 : 1 + 0.06 * (level - 1)) * diff;
      const inst = spawnEnemy(def, hpMult);
      const x = n === 1 ? GAME_WIDTH / 2 + 160 : GAME_WIDTH / 2 + 40 + i * 180;
      const y = 168 + (i % 2) * 18;
      const scale = def.boss ? 2.6 : 1.9;
      const sprite = this.add.sprite(x, y, enemyKey(def.id, 0)).setScale(scale).setOrigin(0.5, 1);
      sprite.play(`enemyidle_${def.id}`);
      sprite.setInteractive({ useHandCursor: true });
      const label = this.add.text(x, y - (def.boss ? 130 : 90), def.name, textStyle(13, COLORS.text, { fontStyle: "bold" })).setOrigin(0.5);
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

  private buildParty(): void {
    const slots = [
      { x: 188, y: 318 },
      { x: 118, y: 268 },
      { x: 210, y: 230 },
      { x: 96, y: 210 },
    ];
    GameState.party.forEach((c, i) => {
      const pos = slots[i] ?? { x: 80 + i * 40, y: 200 };
      const keys = actorKeys(this, c);
      const sprite = this.add.sprite(pos.x, pos.y, `vis_${keys.vid}_idle_0`).setScale(2.5).setOrigin(0.5, 1);
      sprite.play(keys.idle);
      this.add.ellipse(pos.x, pos.y + 2, 56, 12, 0x000000, 0.35).setDepth(-1);
      if (c.hp <= 0) sprite.setTint(0x555555);
      this.allies.push({ character: c, sprite, keys, x: pos.x, y: pos.y, guarding: false, focusBonus: 0 });
    });
  }

  private buildUi(): void {
    drawPanel(this, 430, 388, 510, 140);
    this.logText = this.add.text(444, 398, "", textStyle(13, COLORS.text, { lineSpacing: 3, wordWrap: { width: 486 } }));

    drawPanel(this, 20, 388, 396, 140);
    this.hint = this.add.text(38, 396, "", textStyle(13, COLORS.accent2)).setDepth(50);
    this.menuContainer = this.add.container(0, 0);
    this.subContainer = this.add.container(0, 0);

    this.partyHud = this.add.graphics().setDepth(40);
    this.partyHudText = GameState.party.map((_c, i) =>
      this.add.text(28, 12 + i * 46, "", textStyle(12, COLORS.text, { lineSpacing: 1 })).setDepth(50)
    );
    this.updatePartyHud();
    this.buildMainMenu();
  }

  private updatePartyHud(): void {
    this.partyHud.clear();
    this.partyHud.fillStyle(0x000000, 0.45);
    this.partyHud.fillRoundedRect(16, 8, 250, 8 + GameState.party.length * 46, 8);
    GameState.party.forEach((c, i) => {
      const y = 14 + i * 46;
      const mhp = Math.max(1, maxHP(c));
      const mmp = Math.max(1, maxMP(c));
      const t = this.partyHudText[i];
      if (t) t.setText(`${c.name}  Lv${c.level} ${CLASSES[c.classId].name(c.gender)}\nHP ${c.hp}/${mhp}  MP ${c.mp}/${mmp}`);
      this.partyHud.fillStyle(0x2a1a22, 1);
      this.partyHud.fillRect(150, y + 20, 108, 8);
      this.partyHud.fillStyle(c.hp <= 0 ? 0x444444 : COLORS.hp, 1);
      this.partyHud.fillRect(150, y + 20, 108 * Phaser.Math.Clamp(c.hp / mhp, 0, 1), 8);
      this.partyHud.fillStyle(0x14203a, 1);
      this.partyHud.fillRect(150, y + 30, 108, 5);
      this.partyHud.fillStyle(COLORS.mp, 1);
      this.partyHud.fillRect(150, y + 30, 108 * Phaser.Math.Clamp(c.mp / mmp, 0, 1), 5);
    });
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

  private startRound(): void {
    const order: BattleScene["turnOrder"] = [];
    const rolls = new Map<object, number>();
    for (const v of this.allies) {
      if (v.character.hp <= 0) continue;
      const entry = { kind: "ally" as const, view: v };
      order.push(entry);
      rolls.set(entry, Phaser.Math.Between(1, 20) + initiative(v.character));
    }
    for (const v of this.enemies) {
      if (!v.inst.alive) continue;
      const entry = { kind: "enemy" as const, view: v };
      order.push(entry);
      rolls.set(entry, Phaser.Math.Between(1, 20) + Math.floor((v.inst.def.speed - 10) / 2));
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
    if (actor.kind === "ally" && actor.view.character.hp <= 0) {
      this.turnIdx++;
      this.nextTurn();
      return;
    }
    if (actor.kind === "enemy" && !actor.view.inst.alive) {
      this.turnIdx++;
      this.nextTurn();
      return;
    }
    if (actor.kind === "ally") {
      this.actor = actor.view;
      this.actor.guarding = false;
      this.state = "menu";
      this.hint.setText(`${actor.view.character.name}'s turn — choose an action:`);
      this.menuContainer.setVisible(true);
      this.highlightActor(actor.view);
    } else {
      this.actor = null;
      this.state = "busy";
      this.menuContainer.setVisible(false);
      this.hint.setText(`${actor.view.inst.def.name}'s turn…`);
      this.time.delayedCall(500, () => this.enemyAct(actor.view));
    }
  }

  private highlightActor(v: AllyView): void {
    this.allies.forEach((a) => a.sprite.clearTint());
    v.sprite.setTint(0xffe9a8);
    this.time.delayedCall(280, () => v.sprite.clearTint());
  }

  private advance(): void {
    this.turnIdx++;
    this.time.delayedCall(420, () => this.nextTurn());
  }

  private aliveEnemies(): EnemyView[] {
    return this.enemies.filter((e) => e.inst.alive);
  }

  private livingAllies(): AllyView[] {
    return this.allies.filter((a) => a.character.hp > 0);
  }

  private lowestAlly(): AllyView {
    return this.livingAllies().slice().sort((a, b) => a.character.hp / maxHP(a.character) - b.character.hp / maxHP(b.character))[0] ?? this.allies[0];
  }

  private chooseAttack(): void {
    this.beginTargeting((v) => this.runOffense(v, null));
  }

  private openSkillMenu(): void {
    const p = this.actor?.character;
    if (!p) return;
    this.state = "skillmenu";
    this.menuContainer.setVisible(false);
    this.clearSub();
    this.hint.setText("Choose a skill (Esc to cancel):");
    p.skills.forEach((id, i) => {
      const sk = SKILLS[id];
      if (!sk) return;
      const bx = 110 + (i % 2) * 190;
      const by = 418 + Math.floor(i / 2) * 36;
      const btn = new Button(this, bx, by, `${sk.name} (${sk.mp})`, () => this.castSkill(id), {
        width: 175,
        height: 32,
        size: 14,
        fill: COLORS.panelLight,
        disabled: p.mp < sk.mp,
      });
      this.subContainer.add(btn);
    });
    this.addCancel();
    this.enableEscCancel();
  }

  private castSkill(id: string): void {
    const ally = this.actor;
    if (!ally) return;
    const p = ally.character;
    const sk = SKILLS[id];
    if (!sk || p.mp < sk.mp) return;
    if (sk.kind === "heal") {
      this.clearSub();
      this.runHeal(ally, id);
      return;
    }
    if (sk.kind === "buff") {
      this.clearSub();
      this.runBuff(ally, id);
      return;
    }
    this.clearSub();
    if (sk.aoe) {
      this.runOffense(this.aliveEnemies()[0], id);
      return;
    }
    this.beginTargeting((v) => this.runOffense(v, id));
  }

  private runHeal(ally: AllyView, skillId: string): void {
    this.playTiming(1, (grades) => {
      const p = ally.character;
      const sk = SKILLS[skillId];
      p.mp -= sk.mp;
      const target = this.lowestAlly();
      const res = playerSkill(p, skillId, this.enemies[0].inst, ally.focusBonus, comboMultiplier(grades));
      target.character.hp = Math.min(maxHP(target.character), target.character.hp + res.heal);
      this.log(res.log.replace("restoring", `restoring ${target.character.name}`));
      this.floatText(target.x, target.y - 40, `+${res.heal}`, COLORS.good);
      this.playActorAnim(ally, "cast");
      this.updatePartyHud();
      this.advance();
    });
  }

  private runBuff(ally: AllyView, skillId: string): void {
    const p = ally.character;
    const sk = SKILLS[skillId];
    p.mp -= sk.mp;
    const res = playerSkill(p, skillId, this.enemies[0].inst, ally.focusBonus);
    this.log(res.log);
    if (res.buff === "guard") ally.guarding = true;
    if (res.buff === "focus" || res.buff === "haste") ally.focusBonus = res.buff === "focus" ? 4 : 2;
    this.playActorAnim(ally, "cast");
    this.updatePartyHud();
    this.advance();
  }

  private runOffense(primary: EnemyView, skillId: string | null): void {
    const ally = this.actor;
    if (!ally) return;
    const sk = skillId ? SKILLS[skillId] : null;
    const hits = sk?.hits ?? 1;
    this.playTiming(hits, (grades) => {
      const p = ally.character;
      const timing = comboMultiplier(grades);
      this.flashGrade(grades);
      this.playActorAnim(ally, sk && sk.kind === "magical" ? "cast" : "attack");
      this.tweens.add({ targets: ally.sprite, x: ally.x + 36, duration: 120, yoyo: true, ease: "Quad.out" });

      const targets = sk?.aoe ? this.aliveEnemies() : [primary];
      if (sk) p.mp -= sk.mp;

      for (const v of targets) {
        if (sk) {
          const res = playerSkill(p, sk.id, v.inst, ally.focusBonus, timing);
          this.log(res.log);
          if (res.damage > 0) this.applyDamageToEnemy(v, res.damage, false);
        } else {
          const res = playerAttack(p, v.inst, timing);
          this.log(res.log);
          if (res.hit) this.applyDamageToEnemy(v, res.damage, res.crit);
        }
      }
      ally.focusBonus = 0;
      this.updatePartyHud();
      this.advance();
    });
  }

  private playActorAnim(ally: AllyView, kind: "attack" | "cast" | "hurt" | "guard"): void {
    const key = ally.keys[kind];
    ally.sprite.play(key);
    ally.sprite.once("animationcomplete", () => {
      if (ally.character.hp > 0) ally.sprite.play(ally.keys.idle);
    });
  }

  private playTiming(hits: number, done: (grades: TimingGrade[]) => void): void {
    this.state = "timing";
    this.menuContainer.setVisible(false);
    this.clearSub();
    const grades: TimingGrade[] = [];
    let remaining = Math.max(1, hits);
    const runOnce = () => {
      this.hint.setText(`Time the strike!  SPACE / click  (${grades.length + 1}/${hits})`);
      this.openMeter((grade) => {
        grades.push(grade);
        remaining--;
        if (remaining <= 0) {
          this.clearMeter();
          this.state = "busy";
          done(grades);
        } else {
          this.time.delayedCall(160, runOnce);
        }
      });
    };
    runOnce();
  }

  private openMeter(onGrade: (g: TimingGrade) => void): void {
    this.clearMeter();
    const x = 220;
    const y = 250;
    const w = 520;
    const sweet0 = 0.62;
    const sweet1 = 0.78;
    const g = this.add.graphics().setDepth(80);
    g.fillStyle(0x000000, 0.55);
    g.fillRoundedRect(x - 8, y - 18, w + 16, 36, 8);
    g.fillStyle(0x2a1e3c, 1);
    g.fillRect(x, y, w, 12);
    g.fillStyle(0xffcf5c, 1);
    g.fillRect(x + w * sweet0, y, w * (sweet1 - sweet0), 12);
    g.fillStyle(0xfff3c0, 1);
    g.fillRect(x + w * 0.68, y, w * 0.04, 12);
    this.meterGfx = g;
    const marker = this.add.rectangle(x, y + 6, 5, 22, 0xffffff).setDepth(81);
    this.meterMarker = marker;
    this.meterLabel = this.add.text(x + w / 2, y - 28, "STRIKE", textStyle(14, COLORS.accent2, { fontStyle: "bold" })).setOrigin(0.5).setDepth(81);

    let resolved = false;
    const duration = 1300;
    const tween = this.tweens.add({
      targets: marker,
      x: x + w,
      duration,
      ease: "Linear",
      onComplete: () => finish("miss"),
    });

    const finish = (forced?: TimingGrade) => {
      if (resolved) return;
      resolved = true;
      tween.stop();
      const pos = Phaser.Math.Clamp((marker.x - x) / w, 0, 1);
      const grade = forced ?? gradeAttackTiming(pos, sweet0, sweet1);
      if (this.meterLabel) this.meterLabel.setText(gradeLabel(grade)).setColor("#" + gradeColor(grade).toString(16).padStart(6, "0"));
      this.time.delayedCall(180, () => onGrade(grade));
    };

    const handler = () => finish();
    // Ignore the click that opened Attack so the bar cannot auto-resolve.
    this.time.delayedCall(180, () => {
      if (resolved) return;
      this.input.keyboard?.once("keydown-SPACE", handler);
      this.input.once("pointerdown", handler);
    });
  }

  private clearMeter(): void {
    this.meterGfx?.destroy();
    this.meterMarker?.destroy();
    this.meterLabel?.destroy();
    this.meterGfx = undefined;
    this.meterMarker = undefined;
    this.meterLabel = undefined;
  }

  private flashGrade(grades: TimingGrade[]): void {
    const best = grades.includes("perfect") ? "perfect" : grades.includes("good") ? "good" : grades[0];
    const t = this.add
      .text(GAME_WIDTH / 2, 120, gradeLabel(best) + (grades.length > 1 ? `  ×${grades.length}` : ""), textStyle(36, gradeColor(best), { fontStyle: "bold" }))
      .setOrigin(0.5)
      .setDepth(200);
    t.setStroke("#000000", 6);
    this.tweens.add({ targets: t, y: 90, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }

  private openItemMenu(): void {
    const bag = GameState.bag();
    this.state = "itemmenu";
    this.menuContainer.setVisible(false);
    this.clearSub();
    const counts = new Map<string, number>();
    for (const id of bag) counts.set(id, (counts.get(id) ?? 0) + 1);
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
    const bag = GameState.bag();
    const it = CONSUMABLES[id];
    const idx = bag.indexOf(id);
    if (idx < 0) return;
    bag.splice(idx, 1);
    const amt = rollNotation(it.amount).total;
    const target = this.lowestAlly();
    if (it.effect === "heal") {
      target.character.hp = Math.min(maxHP(target.character), target.character.hp + amt);
      this.log(`${target.character.name} drinks ${it.name} and recovers ${amt} HP.`);
      this.floatText(target.x, target.y - 40, `+${amt}`, COLORS.good);
    } else {
      target.character.mp = Math.min(maxMP(target.character), target.character.mp + amt);
      this.log(`${target.character.name} uses ${it.name} and recovers ${amt} MP.`);
      this.floatText(target.x, target.y - 40, `+${amt} MP`, COLORS.mp);
    }
    this.updatePartyHud();
    this.clearSub();
    this.advance();
  }

  private doDefend(): void {
    const ally = this.actor;
    if (!ally) return;
    ally.guarding = true;
    const rec = Math.max(2, Math.floor(maxMP(ally.character) * 0.1));
    ally.character.mp = Math.min(maxMP(ally.character), ally.character.mp + rec);
    this.log(`${ally.character.name} takes a defensive stance. (+${rec} MP)`);
    this.playActorAnim(ally, "guard");
    this.updatePartyHud();
    this.advance();
  }

  private doFlee(): void {
    if (this.isBoss) {
      this.log("There's no fleeing from a boss!");
      return;
    }
    const fastest = Math.max(...this.aliveEnemies().map((e) => e.inst.def.speed));
    const dex = GameState.player?.attrs.dex ?? 10;
    const fleeChance = Phaser.Math.Clamp(0.4 + (dex - fastest) * 0.03, 0.15, 0.9);
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
    this.hint.setText(this.actor ? `${this.actor.character.name}'s turn — choose an action:` : "Choose an action:");
    this.menuContainer.setVisible(true);
  }

  private enemyAct(v: EnemyView): void {
    if (!v.inst.alive) {
      this.advance();
      return;
    }
    const targets = this.livingAllies();
    if (!targets.length) {
      this.defeat();
      return;
    }
    const target = targets[Math.floor(Math.random() * targets.length)];
    this.tweens.add({ targets: v.sprite, x: v.x - 40, duration: 120, yoyo: true });
    this.hint.setText(`${v.inst.def.name} strikes ${target.character.name}!  D dodge  •  F parry`);
    this.runDefense(target, (result) => {
      if (result === "parry") {
        this.log(`${target.character.name} PARRIES ${v.inst.def.name}!`);
        this.floatText(target.x, target.y - 50, "PARRY", COLORS.accent2, true);
        this.playActorAnim(target, "guard");
        const counter = Math.max(2, Math.floor(4 + target.character.level));
        this.applyDamageToEnemy(v, counter, false);
        this.log(`${target.character.name} counters for ${counter}!`);
      } else if (result === "dodge") {
        this.log(`${target.character.name} dodges ${v.inst.def.name}'s blow!`);
        this.floatText(target.x, target.y - 50, "DODGE", COLORS.good);
        this.tweens.add({ targets: target.sprite, x: target.x - 18, duration: 90, yoyo: true });
      } else {
        const res = enemyAttack(v.inst, target.character, target.guarding, GameState.difficultyMult());
        this.log(res.log.replace(GameState.player?.name ?? "", target.character.name));
        if (res.hit) {
          target.character.hp = Math.max(0, target.character.hp - res.damage);
          this.floatText(target.x, target.y - 40, `-${res.damage}`, COLORS.danger);
          this.cameras.main.shake(160, 0.008);
          this.playActorAnim(target, "hurt");
          target.sprite.setTint(0xff6666);
          this.time.delayedCall(160, () => target.sprite.clearTint());
          this.updatePartyHud();
          if (target.character.hp <= 0) {
            this.log(`${target.character.name} falls!`);
            target.sprite.setTint(0x555555);
          }
        } else {
          this.floatText(target.x, target.y - 40, "MISS", COLORS.textDim);
        }
      }
      this.updatePartyHud();
      this.advance();
    });
  }

  private runDefense(target: AllyView, done: (r: "parry" | "dodge" | "hit") => void): void {
    this.state = "defense";
    this.clearMeter();
    const ring = this.add.circle(target.x, target.y - 36, 46, 0xffffff, 0).setStrokeStyle(3, COLORS.accent2).setDepth(90);
    const inner = this.add.circle(target.x, target.y - 36, 16, 0xffffff, 0).setStrokeStyle(2, COLORS.good, 0.8).setDepth(90);
    this.meterLabel = this.add.text(target.x, target.y - 88, "D dodge   F parry", textStyle(13, COLORS.accent2)).setOrigin(0.5).setDepth(91);

    let resolved = false;
    const duration = 780;
    const start = this.time.now;
    this.tweens.add({ targets: ring, scale: 0.28, duration, ease: "Linear" });

    const finish = (move?: DefenseMove) => {
      if (resolved) return;
      resolved = true;
      const t = Phaser.Math.Clamp((this.time.now - start) / duration, 0, 1);
      const result = move ? resolveDefense(t, move) : "hit";
      ring.destroy();
      inner.destroy();
      this.meterLabel?.destroy();
      this.meterLabel = undefined;
      this.state = "busy";
      done(result);
    };

    this.input.keyboard?.once("keydown-D", () => finish("dodge"));
    this.input.keyboard?.once("keydown-F", () => finish("parry"));
    this.input.keyboard?.once("keydown-SPACE", () => finish("dodge"));
    this.time.delayedCall(duration + 40, () => finish());
  }

  private applyDamageToEnemy(v: EnemyView, dmg: number, crit: boolean): void {
    this.time.delayedCall(120, () => {
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

  private floatText(x: number, y: number, msg: string, color: number, big = false): void {
    const t = this.add.text(x, y, msg, textStyle(big ? 30 : 22, color, { fontStyle: "bold" })).setOrigin(0.5).setDepth(200);
    t.setStroke("#000000", 4);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 900, ease: "Quad.out", onComplete: () => t.destroy() });
  }

  private log(line: string): void {
    this.logLines.push(line);
    if (this.logLines.length > 6) this.logLines.shift();
    this.logText.setText(this.logLines.join("\n"));
  }

  private checkEnd(): boolean {
    if (this.state === "over") return true;
    if (this.aliveEnemies().length === 0) {
      this.victory();
      return true;
    }
    if (this.livingAllies().length === 0) {
      this.defeat();
      return true;
    }
    return false;
  }

  private victory(): void {
    this.state = "over";
    this.menuContainer.setVisible(false);
    this.clearSub();
    this.clearMeter();
    const pending = GameState.pendingBattle!;
    let xp = 0;
    let gold = 0;
    for (const def of pending.enemies) {
      xp += def.xp;
      gold += rollNotation(def.gold).total;
    }
    const lines: string[] = [`Experience gained: ${xp}`, `Gold found: ${gold}`];
    const skillNotes: string[] = [];
    for (const c of GameState.party) {
      if (c.hp <= 0) {
        c.hp = 1;
      }
      const before = c.level;
      const lu = grantXP(c, xp);
      if (lu.leveled) {
        lines.push(`${c.name}: LEVEL ${before} → ${lu.newLevel}  (+${lu.hpGain} HP, +${lu.mpGain} MP)`);
        for (const sid of lu.newSkills) {
          const sk = SKILLS[sid];
          if (sk) skillNotes.push(`${c.name} learned ${sk.name}!`);
        }
      }
    }
    if (GameState.player) GameState.player.gold += gold;
    if (this.bossId && !GameState.overworld.defeatedBosses.includes(this.bossId)) {
      GameState.overworld.defeatedBosses.push(this.bossId);
    }
    GameState.syncLeader();
    GameState.save();

    const panel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(300);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.6);
    bg.fillRect(-GAME_WIDTH / 2, -GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT);
    panel.add(bg);
    drawPanelInContainer(this, panel, -260, -150, 520, 300);
    panel.add(this.add.text(0, -120, this.isBoss ? "BOSS DEFEATED!" : "VICTORY!", textStyle(32, COLORS.accent2, { fontStyle: "bold" })).setOrigin(0.5));
    const body = [...lines, ...skillNotes].join("\n");
    panel.add(this.add.text(0, -20, body, textStyle(15, COLORS.text, { align: "center", lineSpacing: 5 })).setOrigin(0.5));
    const cont = new Button(this, 0, 110, "Continue", () => this.returnToOverworld(), { width: 200, height: 44, fill: COLORS.border });
    panel.add(cont);
    if (skillNotes.length) this.cameras.main.flash(400, 180, 150, 60);
  }

  private defeat(): void {
    if (this.state === "over") return;
    this.state = "over";
    this.menuContainer.setVisible(false);
    this.clearSub();
    this.clearMeter();
    const hero = GameState.player!;
    const lostGold = Math.floor(hero.gold * 0.2);
    hero.gold -= lostGold;
    for (const c of GameState.party) {
      c.hp = maxHP(c);
      c.mp = maxMP(c);
    }

    const panel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(300);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.75);
    bg.fillRect(-GAME_WIDTH / 2, -GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT);
    panel.add(bg);
    drawPanelInContainer(this, panel, -230, -120, 460, 240);
    panel.add(this.add.text(0, -90, "THE PARTY FELL", textStyle(30, COLORS.danger, { fontStyle: "bold" })).setOrigin(0.5));
    panel.add(
      this.add
        .text(0, -34, `A traveling healer revives you at Valehaven.\nYou lost ${lostGold} gold.`, textStyle(16, COLORS.text, { align: "center", lineSpacing: 6 }))
        .setOrigin(0.5)
    );
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
