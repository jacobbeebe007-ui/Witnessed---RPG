import Phaser from "phaser";
import { SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS } from "../config";
import { GameState } from "../systems/GameState";
import { Button, drawPanel, textStyle } from "../ui/ui";
import { addAmbientBackground } from "../ui/background";
import { SHOP_STOCK, getItem, WEAPONS, ARMORS, type Item } from "../data/items";
import { maxHP, maxMP, weapon, armor, type Character } from "../systems/character";
import { CLASSES } from "../data/classes";
import { actorKeys } from "../gfx/characters";

export class ShopScene extends Phaser.Scene {
  private buyContainer!: Phaser.GameObjects.Container;
  private invContainer!: Phaser.GameObjects.Container;
  private goldText!: Phaser.GameObjects.Text;
  private statText!: Phaser.GameObjects.Text;
  private feedback!: Phaser.GameObjects.Text;
  private memberIdx = 0;
  private preview?: Phaser.GameObjects.Sprite;

  constructor() {
    super(SCENES.Shop);
  }

  create(): void {
    if (!GameState.player) {
      this.scene.start(SCENES.Start);
      return;
    }
    addAmbientBackground(this, COLORS.accent2);
    this.memberIdx = 0;
    this.add.text(GAME_WIDTH / 2, 24, "Town Marketplace", textStyle(28, COLORS.text, { fontStyle: "bold" })).setOrigin(0.5);
    this.goldText = this.add.text(GAME_WIDTH / 2, 50, "", textStyle(15, COLORS.accent2)).setOrigin(0.5);
    this.buildMemberTabs();

    // Buy panel
    drawPanel(this, 20, 96, 440, 386);
    this.add.text(40, 104, "WARES  (buy)", textStyle(15, COLORS.accent2, { fontStyle: "bold" }));
    this.buyContainer = this.add.container(0, 0);

    // Inventory panel
    drawPanel(this, 480, 96, 460, 316);
    this.add.text(500, 104, "YOUR GOODS  (equip / sell)", textStyle(15, COLORS.accent2, { fontStyle: "bold" }));
    this.invContainer = this.add.container(0, 0);

    // Player summary + rest
    drawPanel(this, 480, 424, 460, 58);
    this.statText = this.add.text(500, 434, "", textStyle(13, COLORS.text, { lineSpacing: 3 }));

    this.feedback = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 20, "", textStyle(14, COLORS.good)).setOrigin(0.5);

    new Button(this, 130, GAME_HEIGHT - 22, "Rest (Free Heal)", () => this.rest(), { width: 210, height: 36, fill: COLORS.panelLight });
    new Button(this, GAME_WIDTH - 130, GAME_HEIGHT - 22, "Leave Town", () => this.leave(), { width: 210, height: 36, fill: COLORS.border });

    this.refresh();
  }

  private selected(): Character {
    return GameState.party[this.memberIdx] ?? GameState.player!;
  }

  private buildMemberTabs(): void {
    GameState.party.forEach((c, i) => {
      const bx = 80 + i * 200;
      new Button(this, bx, 78, c.name, () => {
        this.memberIdx = i;
        this.refresh();
      }, { width: 180, height: 28, size: 13, fill: i === this.memberIdx ? COLORS.border : COLORS.panelLight });
    });
  }

  private priceWithCharisma(base: number, buying: boolean): number {
    const cha = GameState.player!.attrs.cha;
    const disc = Phaser.Math.Clamp((cha - 10) * 0.02, -0.1, 0.2);
    if (buying) return Math.max(1, Math.round(base * (1 - disc)));
    return Math.round(base * 0.5 * (1 + disc));
  }

  private itemSub(it: Item): string {
    if (it.kind === "weapon") return `${it.dice}${it.hit >= 0 ? " +" + it.hit : " " + it.hit} hit`;
    if (it.kind === "armor") return `AC +${it.ac}${it.evasionPenalty ? " (−" + it.evasionPenalty + " eva)" : ""}`;
    return it.effect === "heal" ? `Heal ${it.amount}` : `MP ${it.amount}`;
  }

  private refresh(): void {
    const hero = GameState.player!;
    const p = this.selected();
    this.goldText.setText(`Party gold: ${hero.gold}`);
    this.statText.setText(
      `Equip for ${p.name}  Lv ${p.level} ${CLASSES[p.classId].name(p.gender)}    HP ${p.hp}/${maxHP(p)}  MP ${p.mp}/${maxMP(p)}\n` +
        `Worn:  ${weapon(p).name} (${weapon(p).dice})   •   ${armor(p).name} (AC+${armor(p).ac})  — armor cut changes with gender`
    );
    this.updatePreview(p);

    // Buy list
    this.buyContainer.removeAll(true);
    SHOP_STOCK.forEach((id, i) => {
      const it = getItem(id)!;
      const y = 132 + i * 30;
      const price = this.priceWithCharisma(it.price, true);
      this.buyContainer.add(this.add.text(40, y, it.name, textStyle(14, COLORS.text)));
      this.buyContainer.add(this.add.text(210, y, this.itemSub(it), textStyle(11, COLORS.textDim)).setOrigin(0, 0));
      this.buyContainer.add(this.add.text(348, y + 8, `${price}g`, textStyle(13, COLORS.accent2)).setOrigin(1, 0.5));
      const btn = new Button(this, 410, y + 8, "Buy", () => this.buy(id), {
        width: 60,
        height: 24,
        size: 13,
        fill: hero.gold >= price ? COLORS.panelLight : COLORS.panel,
        disabled: hero.gold < price,
      });
      this.buyContainer.add(btn);
    });

    // Inventory list (owned gear + consumables), grouped with counts
    this.invContainer.removeAll(true);
    const counts = new Map<string, number>();
    for (const id of GameState.bag()) counts.set(id, (counts.get(id) ?? 0) + 1);
    let row = 0;
    // Equipped items first (can't sell equipped, but show)
    for (const [id, count] of counts) {
      const it = getItem(id);
      if (!it) continue;
      const y = 132 + row * 30;
      const sell = this.priceWithCharisma(it.price, false);
      this.invContainer.add(this.add.text(500, y, `${it.name}${count > 1 ? " x" + count : ""}`, textStyle(14, COLORS.text)));
      this.invContainer.add(this.add.text(660, y, this.itemSub(it), textStyle(11, COLORS.textDim)));
      if (it.kind === "weapon" || it.kind === "armor") {
        const eq = new Button(this, 815, y + 8, "Equip", () => this.equip(id), { width: 66, height: 24, size: 12, fill: COLORS.border });
        this.invContainer.add(eq);
      }
      const sb = new Button(this, 895, y + 8, `Sell ${sell}`, () => this.sell(id), { width: 78, height: 24, size: 11, fill: COLORS.panelLight });
      this.invContainer.add(sb);
      row++;
      if (row > 8) break;
    }
    if (counts.size === 0) {
      this.invContainer.add(this.add.text(500, 130, "(no spare items — everything is equipped)", textStyle(13, COLORS.textDim)));
    }
  }

  private flash(msg: string, good = true): void {
    this.feedback.setText(msg).setColor(good ? "#59d98a" : "#ff5c5c");
    this.feedback.setAlpha(1);
    this.tweens.add({ targets: this.feedback, alpha: 0.2, duration: 1400, yoyo: false });
  }

  private updatePreview(p: Character): void {
    const keys = actorKeys(this, p);
    if (!this.preview) {
      this.preview = this.add.sprite(900, 412, `vis_${keys.vid}_idle_0`).setScale(1.7).setOrigin(0.5, 1).setDepth(20);
    }
    this.preview.play(keys.idle);
  }

  private buy(id: string): void {
    const hero = GameState.player!;
    const it = getItem(id)!;
    const price = this.priceWithCharisma(it.price, true);
    if (hero.gold < price) {
      this.flash("Not enough gold!", false);
      return;
    }
    hero.gold -= price;
    GameState.bag().push(id);
    GameState.save();
    this.flash(`Bought ${it.name}.`);
    this.refresh();
  }

  private sell(id: string): void {
    const hero = GameState.player!;
    const it = getItem(id)!;
    const bag = GameState.bag();
    const idx = bag.indexOf(id);
    if (idx < 0) return;
    bag.splice(idx, 1);
    const price = this.priceWithCharisma(it.price, false);
    hero.gold += price;
    GameState.save();
    this.flash(`Sold ${it.name} for ${price}g.`);
    this.refresh();
  }

  private equip(id: string): void {
    const p = this.selected();
    const bag = GameState.bag();
    const it = getItem(id);
    if (!it) return;
    const idx = bag.indexOf(id);
    if (idx < 0) return;
    if (it.kind === "weapon") {
      const prev = p.weaponId;
      p.weaponId = id;
      bag.splice(idx, 1);
      if (WEAPONS[prev]) bag.push(prev);
      this.flash(`${p.name} wields ${it.name}.`);
    } else if (it.kind === "armor") {
      const prev = p.armorId;
      p.armorId = id;
      bag.splice(idx, 1);
      if (ARMORS[prev]) bag.push(prev);
      this.flash(`${p.name} dons ${it.name}.`);
    }
    GameState.save();
    this.refresh();
  }

  private rest(): void {
    for (const c of GameState.party) {
      c.hp = maxHP(c);
      c.mp = maxMP(c);
    }
    GameState.save();
    this.flash("The whole party rests and recovers.");
    this.refresh();
  }

  private leave(): void {
    GameState.save();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.time.delayedCall(260, () => this.scene.start(SCENES.Overworld));
  }
}
