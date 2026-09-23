import Phaser from "phaser";
import { SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS } from "../config";
import { GameState } from "../systems/GameState";
import { Button, drawPanel, textStyle } from "../ui/ui";
import { addAmbientBackground } from "../ui/background";
import { SHOP_STOCK, getItem, WEAPONS, ARMORS, type Item } from "../data/items";
import { maxHP, maxMP, weapon, armor } from "../systems/character";
import { CLASSES } from "../data/classes";

export class ShopScene extends Phaser.Scene {
  private buyContainer!: Phaser.GameObjects.Container;
  private invContainer!: Phaser.GameObjects.Container;
  private goldText!: Phaser.GameObjects.Text;
  private statText!: Phaser.GameObjects.Text;
  private feedback!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENES.Shop);
  }

  create(): void {
    if (!GameState.player) {
      this.scene.start(SCENES.Start);
      return;
    }
    addAmbientBackground(this, COLORS.accent2);
    const p = GameState.player;
    this.add.text(GAME_WIDTH / 2, 30, "Town Marketplace", textStyle(30, COLORS.text, { fontStyle: "bold" })).setOrigin(0.5);
    this.goldText = this.add.text(GAME_WIDTH / 2, 58, "", textStyle(16, COLORS.accent2)).setOrigin(0.5);

    // Buy panel
    drawPanel(this, 20, 82, 440, 400);
    this.add.text(40, 92, "WARES  (buy)", textStyle(15, COLORS.accent2, { fontStyle: "bold" }));
    this.buyContainer = this.add.container(0, 0);

    // Inventory panel
    drawPanel(this, 480, 82, 460, 330);
    this.add.text(500, 92, "YOUR GOODS  (equip / sell)", textStyle(15, COLORS.accent2, { fontStyle: "bold" }));
    this.invContainer = this.add.container(0, 0);

    // Player summary + rest
    drawPanel(this, 480, 424, 460, 58);
    this.statText = this.add.text(500, 434, "", textStyle(13, COLORS.text, { lineSpacing: 3 }));

    this.feedback = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 20, "", textStyle(14, COLORS.good)).setOrigin(0.5);

    new Button(this, 130, GAME_HEIGHT - 22, "Rest (Free Heal)", () => this.rest(), { width: 210, height: 36, fill: COLORS.panelLight });
    new Button(this, GAME_WIDTH - 130, GAME_HEIGHT - 22, "Leave Town", () => this.leave(), { width: 210, height: 36, fill: COLORS.border });

    void p;
    this.refresh();
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
    const p = GameState.player!;
    this.goldText.setText(`Gold: ${p.gold}`);
    this.statText.setText(
      `${p.name}  Lv ${p.level} ${CLASSES[p.classId].name(p.gender)}    HP ${p.hp}/${maxHP(p)}  MP ${p.mp}/${maxMP(p)}\n` +
        `Equipped:  ${weapon(p).name} (${weapon(p).dice})   •   ${armor(p).name} (AC+${armor(p).ac})`
    );

    // Buy list
    this.buyContainer.removeAll(true);
    SHOP_STOCK.forEach((id, i) => {
      const it = getItem(id)!;
      const y = 120 + i * 31;
      const price = this.priceWithCharisma(it.price, true);
      this.buyContainer.add(this.add.text(40, y, it.name, textStyle(14, COLORS.text)));
      this.buyContainer.add(this.add.text(210, y, this.itemSub(it), textStyle(11, COLORS.textDim)).setOrigin(0, 0));
      this.buyContainer.add(this.add.text(348, y + 8, `${price}g`, textStyle(13, COLORS.accent2)).setOrigin(1, 0.5));
      const btn = new Button(this, 410, y + 8, "Buy", () => this.buy(id), {
        width: 60,
        height: 24,
        size: 13,
        fill: p.gold >= price ? COLORS.panelLight : COLORS.panel,
        disabled: p.gold < price,
      });
      this.buyContainer.add(btn);
    });

    // Inventory list (owned gear + consumables), grouped with counts
    this.invContainer.removeAll(true);
    const counts = new Map<string, number>();
    for (const id of p.inventory) counts.set(id, (counts.get(id) ?? 0) + 1);
    let row = 0;
    // Equipped items first (can't sell equipped, but show)
    for (const [id, count] of counts) {
      const it = getItem(id);
      if (!it) continue;
      const y = 120 + row * 31;
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

  private buy(id: string): void {
    const p = GameState.player!;
    const it = getItem(id)!;
    const price = this.priceWithCharisma(it.price, true);
    if (p.gold < price) {
      this.flash("Not enough gold!", false);
      return;
    }
    p.gold -= price;
    p.inventory.push(id);
    GameState.save();
    this.flash(`Bought ${it.name}.`);
    this.refresh();
  }

  private sell(id: string): void {
    const p = GameState.player!;
    const it = getItem(id)!;
    const idx = p.inventory.indexOf(id);
    if (idx < 0) return;
    p.inventory.splice(idx, 1);
    const price = this.priceWithCharisma(it.price, false);
    p.gold += price;
    GameState.save();
    this.flash(`Sold ${it.name} for ${price}g.`);
    this.refresh();
  }

  private equip(id: string): void {
    const p = GameState.player!;
    const it = getItem(id);
    if (!it) return;
    const idx = p.inventory.indexOf(id);
    if (idx < 0) return;
    if (it.kind === "weapon") {
      const prev = p.weaponId;
      p.weaponId = id;
      p.inventory.splice(idx, 1);
      if (WEAPONS[prev]) p.inventory.push(prev);
      this.flash(`Equipped ${it.name}.`);
    } else if (it.kind === "armor") {
      const prev = p.armorId;
      p.armorId = id;
      p.inventory.splice(idx, 1);
      if (ARMORS[prev]) p.inventory.push(prev);
      this.flash(`Equipped ${it.name}.`);
    }
    GameState.save();
    this.refresh();
  }

  private rest(): void {
    const p = GameState.player!;
    p.hp = maxHP(p);
    p.mp = maxMP(p);
    GameState.save();
    this.flash("You rest and recover fully.");
    this.refresh();
  }

  private leave(): void {
    GameState.save();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.time.delayedCall(260, () => this.scene.start(SCENES.Overworld));
  }
}
