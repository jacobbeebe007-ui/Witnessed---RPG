import Phaser from "phaser";
import { SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS } from "../config";
import { Button, drawPanel, textStyle } from "../ui/ui";
import { addAmbientBackground } from "../ui/background";
import { ATTRIBUTES, ATTR_KEYS, baseAttributes, POINT_BUY_POOL, ATTR_MIN, ATTR_MAX, type Attributes, type AttrKey } from "../data/attributes";
import { CLASSES, CLASS_ORDER, type ClassId, type Gender } from "../data/classes";
import { abilityMod } from "../data/dice";
import { charKey, ensureWalkAnim } from "../gfx/characters";
import { createCharacter, maxHP, maxMP, armorClass, attackBonus } from "../systems/character";
import { GameState } from "../systems/GameState";
import { WEAPONS, ARMORS } from "../data/items";

const DEFAULT_NAMES: Record<ClassId, string> = {
  mage: "Lyra",
  rogue: "Vesper",
  ranger: "Kaelen",
  knight: "Roland",
  brute: "Grommok",
  inquisitor: "Seraphine",
};

export class CharacterCreationScene extends Phaser.Scene {
  private gender: Gender = "male";
  private classId: ClassId = "mage";
  private attrs: Attributes = baseAttributes();
  private name = DEFAULT_NAMES.mage;
  private nameEdited = false;

  private preview!: Phaser.GameObjects.Sprite;
  private classNameText!: Phaser.GameObjects.Text;
  private roleText!: Phaser.GameObjects.Text;
  private descText!: Phaser.GameObjects.Text;
  private nameText!: Phaser.GameObjects.Text;
  private pointsText!: Phaser.GameObjects.Text;
  private derivedText!: Phaser.GameObjects.Text;
  private gearText!: Phaser.GameObjects.Text;
  private attrRows: Record<AttrKey, { value: Phaser.GameObjects.Text; minus: Button; plus: Button }> = {} as never;
  private classCards: Record<ClassId, Phaser.GameObjects.Container> = {} as never;
  private genderTabs: Record<Gender, Phaser.GameObjects.Rectangle> = {} as never;

  constructor() {
    super(SCENES.CharacterCreation);
  }

  create(): void {
    this.gender = "male";
    this.classId = "mage";
    this.attrs = baseAttributes();
    this.name = DEFAULT_NAMES.mage;
    this.nameEdited = false;

    addAmbientBackground(this);
    this.add.text(GAME_WIDTH / 2, 34, "Create Your Witness", textStyle(34, COLORS.text, { fontStyle: "bold" })).setOrigin(0.5);

    this.buildClassColumn();
    this.buildPreviewColumn();
    this.buildAttrColumn();
    this.buildFooter();

    this.applySuggested();
    this.refresh();
    this.setupNameInput();
  }

  // ---- Left: class selection ----
  private buildClassColumn(): void {
    const x = 30;
    const y0 = 80;
    this.add.text(x + 110, y0 - 16, "CLASS", textStyle(15, COLORS.accent2, { fontStyle: "bold" })).setOrigin(0.5);
    CLASS_ORDER.forEach((id, i) => {
      const cy = y0 + 12 + i * 66;
      const card = this.add.container(x, cy);
      const bg = this.add.graphics();
      card.add(bg);
      const def = CLASSES[id];
      const swatch = this.add.rectangle(24, 26, 34, 34, def.palette[0]).setStrokeStyle(2, def.palette[2]);
      const nm = this.add.text(50, 12, def.name(this.gender), textStyle(18, COLORS.text, { fontStyle: "bold" })).setName("nm");
      const role = this.add.text(50, 34, def.role, textStyle(12, COLORS.textDim));
      card.add([swatch, nm, role]);
      card.setSize(220, 58);
      card.setInteractive(new Phaser.Geom.Rectangle(0, 0, 220, 58), Phaser.Geom.Rectangle.Contains);
      card.on("pointerdown", () => this.selectClass(id));
      card.on("pointerover", () => this.drawCard(card, id, true));
      card.on("pointerout", () => this.drawCard(card, id, this.classId === id));
      this.classCards[id] = card;
      this.drawCard(card, id, this.classId === id);
    });
  }

  private drawCard(card: Phaser.GameObjects.Container, _id: ClassId, active: boolean): void {
    const bg = card.list[0] as Phaser.GameObjects.Graphics;
    bg.clear();
    bg.fillStyle(active ? COLORS.border : COLORS.panel, active ? 1 : 0.85);
    bg.fillRoundedRect(0, 0, 220, 58, 6);
    bg.lineStyle(2, active ? COLORS.accent : COLORS.border, active ? 1 : 0.6);
    bg.strokeRoundedRect(0, 0, 220, 58, 6);
  }

  // ---- Center: preview ----
  private buildPreviewColumn(): void {
    const cx = GAME_WIDTH / 2 + 6;
    drawPanel(this, cx - 150, 80, 300, 250);

    // Gender tabs
    (["male", "female"] as Gender[]).forEach((g, i) => {
      const gx = cx - 70 + i * 140;
      const tab = this.add.rectangle(gx, 108, 130, 34, COLORS.panelLight).setStrokeStyle(2, COLORS.border);
      this.add.text(gx, 108, g === "male" ? "Male" : "Female", textStyle(16)).setOrigin(0.5);
      tab.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.selectGender(g));
      this.genderTabs[g] = tab;
    });

    // Sprite preview on a pedestal
    this.add.ellipse(cx, 250, 90, 22, 0x000000, 0.35);
    this.preview = this.add.sprite(cx, 210, charKey(this.classId, this.gender, 0)).setScale(4.2).setOrigin(0.5, 1);
    ensureWalkAnim(this, this.classId, this.gender);
    this.preview.play(`idle_${this.classId}_${this.gender}`);

    this.classNameText = this.add.text(cx, 270, "", textStyle(24, COLORS.accent, { fontStyle: "bold" })).setOrigin(0.5);
    this.roleText = this.add.text(cx, 296, "", textStyle(14, COLORS.textDim)).setOrigin(0.5);

    // Name
    this.add.text(cx - 150, 344, "NAME", textStyle(13, COLORS.accent2, { fontStyle: "bold" })).setOrigin(0, 0.5);
    const nameBox = this.add.rectangle(cx, 372, 300, 34, COLORS.panelLight).setStrokeStyle(2, COLORS.border);
    this.nameText = this.add.text(cx, 372, this.name, textStyle(20)).setOrigin(0.5);
    nameBox.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.nameText.setColor("#" + COLORS.accent2.toString(16)));

    // Description
    drawPanel(this, cx - 150, 396, 300, 96, { fill: COLORS.panel, alpha: 0.7 });
    this.descText = this.add.text(cx - 140, 404, "", textStyle(13, COLORS.text, { wordWrap: { width: 280 } }));
  }

  // ---- Right: attributes ----
  private buildAttrColumn(): void {
    const x = GAME_WIDTH - 320;
    const y0 = 80;
    drawPanel(this, x - 12, y0, 300, 300);
    this.add.text(x + 128, y0 + 14, "ATTRIBUTES", textStyle(15, COLORS.accent2, { fontStyle: "bold" })).setOrigin(0.5);
    this.pointsText = this.add.text(x + 128, y0 + 34, "", textStyle(14, COLORS.text)).setOrigin(0.5);

    ATTR_KEYS.forEach((key, i) => {
      const ry = y0 + 62 + i * 36;
      const info = ATTRIBUTES[key];
      this.add.text(x, ry, info.abbr, textStyle(16, COLORS.text, { fontStyle: "bold" })).setOrigin(0, 0.5);
      this.add.text(x + 42, ry, info.blurb, textStyle(10, COLORS.textDim)).setOrigin(0, 0.5);
      const minus = new Button(this, x + 196, ry, "–", () => this.adjust(key, -1), { width: 30, height: 28, size: 20, fill: COLORS.panelLight });
      const value = this.add.text(x + 228, ry, "8", textStyle(18, COLORS.accent2, { fontStyle: "bold" })).setOrigin(0.5);
      const plus = new Button(this, x + 260, ry, "+", () => this.adjust(key, 1), { width: 30, height: 28, size: 20, fill: COLORS.panelLight });
      this.attrRows[key] = { value, minus, plus };
    });

    // Derived stats panel
    drawPanel(this, x - 12, y0 + 308, 300, 132);
    this.add.text(x + 128, y0 + 320, "DERIVED", textStyle(13, COLORS.accent2, { fontStyle: "bold" })).setOrigin(0.5);
    this.derivedText = this.add.text(x, y0 + 338, "", textStyle(14, COLORS.text, { lineSpacing: 4 }));
    this.gearText = this.add.text(x, y0 + 398, "", textStyle(12, COLORS.textDim, { lineSpacing: 3, wordWrap: { width: 280 } }));
  }

  private buildFooter(): void {
    new Button(this, 130, GAME_HEIGHT - 34, "Back", () => this.scene.start(SCENES.Start), { width: 180, height: 44, fill: COLORS.panelLight });
    new Button(this, GAME_WIDTH / 2 + 6, GAME_HEIGHT - 34, "Randomize", () => this.randomize(), { width: 200, height: 44, fill: COLORS.panelLight });
    new Button(this, GAME_WIDTH - 150, GAME_HEIGHT - 34, "Begin Journey", () => this.confirm(), { width: 240, height: 44, fill: COLORS.border });
  }

  // ---- Interaction ----
  private pointsSpent(): number {
    return ATTR_KEYS.reduce((sum, k) => sum + (this.attrs[k] - ATTR_MIN), 0);
  }

  private adjust(key: AttrKey, delta: number): void {
    const next = this.attrs[key] + delta;
    if (next < ATTR_MIN || next > ATTR_MAX) return;
    if (delta > 0 && this.pointsSpent() >= POINT_BUY_POOL) return;
    this.attrs[key] = next;
    this.refresh();
  }

  private applySuggested(): void {
    this.attrs = baseAttributes();
    const sug = CLASSES[this.classId].suggested;
    for (const k of ATTR_KEYS) {
      const add = sug[k] ?? 0;
      this.attrs[k] = Math.min(ATTR_MAX, ATTR_MIN + add);
    }
  }

  private selectClass(id: ClassId): void {
    if (this.classId === id) return;
    this.classId = id;
    if (!this.nameEdited) this.name = DEFAULT_NAMES[id];
    this.applySuggested();
    CLASS_ORDER.forEach((c) => this.drawCard(this.classCards[c], c, c === id));
    this.updatePreviewSprite();
    this.refresh();
  }

  private selectGender(g: Gender): void {
    if (this.gender === g) return;
    this.gender = g;
    this.updatePreviewSprite();
    // refresh class card names (Mage/Siren)
    CLASS_ORDER.forEach((c) => {
      const nm = (this.classCards[c].getByName("nm") as Phaser.GameObjects.Text) ?? null;
      if (nm) nm.setText(CLASSES[c].name(g));
    });
    this.refresh();
  }

  private updatePreviewSprite(): void {
    ensureWalkAnim(this, this.classId, this.gender);
    this.preview.play(`idle_${this.classId}_${this.gender}`);
    (["male", "female"] as Gender[]).forEach((g) => {
      const sel = g === this.gender;
      this.genderTabs[g].setFillStyle(sel ? COLORS.border : COLORS.panelLight).setStrokeStyle(2, sel ? COLORS.accent : COLORS.border);
    });
  }

  private randomize(): void {
    this.selectGender(Math.random() < 0.5 ? "male" : "female");
    this.selectClass(CLASS_ORDER[Math.floor(Math.random() * CLASS_ORDER.length)]);
    // random spend of remaining points
    let guard = 200;
    while (this.pointsSpent() < POINT_BUY_POOL && guard-- > 0) {
      const k = ATTR_KEYS[Math.floor(Math.random() * ATTR_KEYS.length)];
      if (this.attrs[k] < ATTR_MAX) this.attrs[k]++;
    }
    this.refresh();
  }

  private refresh(): void {
    const def = CLASSES[this.classId];
    this.classNameText.setText(def.name(this.gender));
    this.roleText.setText(def.role);
    this.descText.setText(def.desc);
    this.nameText.setText(this.name.length ? this.name : "_");

    const remaining = POINT_BUY_POOL - this.pointsSpent();
    this.pointsText.setText(`Points remaining: ${remaining} / ${POINT_BUY_POOL}`).setColor(remaining === 0 ? "#59d98a" : "#e8e0f0");

    for (const key of ATTR_KEYS) {
      const v = this.attrs[key];
      const mod = abilityMod(v);
      this.attrRows[key].value.setText(`${v} (${mod >= 0 ? "+" : ""}${mod})`);
      this.attrRows[key].minus.setDisabled(v <= ATTR_MIN);
      this.attrRows[key].plus.setDisabled(v >= ATTR_MAX || remaining <= 0);
    }

    const tmp = createCharacter(this.gender, this.classId, this.attrs, this.name);
    this.derivedText.setText(
      [
        `HP  ${maxHP(tmp)}      MP  ${maxMP(tmp)}`,
        `Armor Class  ${armorClass(tmp)}`,
        `Attack Bonus  +${attackBonus(tmp)}`,
      ].join("\n")
    );
    const w = WEAPONS[def.startingWeapon];
    const a = ARMORS[def.startingArmor];
    const skills = def.startingSkills.length;
    this.gearText.setText(`Gear: ${w.name} (${w.dice}), ${a.name} (AC+${a.ac})\nSkills: ${skills} known  •  Gold: 60`);
  }

  private setupNameInput(): void {
    this.input.keyboard?.on("keydown", (ev: KeyboardEvent) => {
      if (ev.key === "Backspace") {
        this.name = this.name.slice(0, -1);
        this.nameEdited = true;
      } else if (ev.key.length === 1 && /[A-Za-z '\-]/.test(ev.key) && this.name.length < 14) {
        this.name += ev.key;
        this.nameEdited = true;
      } else {
        return;
      }
      this.refresh();
    });
  }

  private confirm(): void {
    const finalName = this.name.trim() || DEFAULT_NAMES[this.classId];
    GameState.player = createCharacter(this.gender, this.classId, this.attrs, finalName);
    GameState.overworld = { x: 0, y: 0, hasSpawn: false, defeatedBosses: [] };
    GameState.save();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.time.delayedCall(420, () => this.scene.start(SCENES.Overworld));
  }
}
