import Phaser from "phaser";
import { SCENES, GAME_WIDTH, COLORS } from "../config";
import { Button, drawPanel, textStyle } from "../ui/ui";
import { addAmbientBackground } from "../ui/background";
import { GameState } from "../systems/GameState";
import { COMPANIONS } from "../data/companions";
import { makeCompanion, syncSkills, maxHP, maxMP } from "../systems/character";
import { actorKeys } from "../gfx/characters";
import { CLASSES } from "../data/classes";

export type DialogueMode = "intro" | "recruit";

export class DialogueScene extends Phaser.Scene {
  private mode: DialogueMode = "intro";
  private companionId?: string;
  private lineIdx = 0;

  constructor() {
    super(SCENES.Dialogue);
  }

  init(data: { mode?: DialogueMode; companionId?: string }): void {
    this.mode = data.mode ?? "intro";
    this.companionId = data.companionId;
    this.lineIdx = 0;
  }

  create(): void {
    addAmbientBackground(this);
    if (this.mode === "intro") this.buildIntro();
    else this.buildRecruit();
  }

  private buildIntro(): void {
    const cx = GAME_WIDTH / 2;
    this.add.text(cx, 70, "THE WITNESSED", textStyle(36, COLORS.accent2, { fontStyle: "bold" })).setOrigin(0.5);
    drawPanel(this, 80, 120, GAME_WIDTH - 160, 280);
    const body =
      "The Solstice Seal that kept the old gods sleeping has cracked.\n\n" +
      "You are one of the Witnessed — marked to walk the meadow, the wood, and the ash, and to gather a party of four before the Ember Wyrm wakes.\n\n" +
      "In battle, time itself can be bent. Strike when the gold flashes. When a blow comes, Dodge or Parry — a perfect parry answers in kind.\n\n" +
      "Companions wait in every town. Gear will change the very shape of your armor. Go.";
    this.add.text(100, 140, body, textStyle(16, COLORS.text, { wordWrap: { width: GAME_WIDTH - 200 }, lineSpacing: 6 }));
    new Button(this, cx, 460, "Step into the world", () => {
      GameState.flags.introSeen = true;
      GameState.save();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(320, () => this.scene.start(SCENES.Overworld));
    }, { width: 280, fill: COLORS.border });
  }

  private buildRecruit(): void {
    const def = this.companionId ? COMPANIONS[this.companionId] : null;
    if (!def) {
      this.scene.start(SCENES.Overworld);
      return;
    }
    const cx = GAME_WIDTH / 2;
    const guest = makeCompanion(def.id);
    const keys = actorKeys(this, guest);
    this.add.text(cx, 48, def.regionLabel, textStyle(14, COLORS.accent2, { fontStyle: "bold" })).setOrigin(0.5);
    this.add.text(cx, 78, def.name, textStyle(32, COLORS.text, { fontStyle: "bold" })).setOrigin(0.5);
    this.add.text(cx, 112, `${CLASSES[def.classId].name(def.gender)}  •  ${def.title}`, textStyle(15, COLORS.textDim)).setOrigin(0.5);

    this.add.ellipse(cx, 280, 100, 22, 0x000000, 0.35);
    const spr = this.add.sprite(cx, 250, `vis_${keys.vid}_idle_0`).setScale(3.4).setOrigin(0.5, 1);
    spr.play(keys.idle);

    drawPanel(this, 90, 300, GAME_WIDTH - 180, 120);
    const line = this.add.text(110, 318, def.lines[0], textStyle(17, COLORS.text, { wordWrap: { width: GAME_WIDTH - 220 }, lineSpacing: 6 }));

    const already = GameState.flags.recruited.includes(def.id);
    const full = !GameState.canRecruit();

    const next = new Button(this, cx - 150, 470, "Listen", () => {
      this.lineIdx = Math.min(def.lines.length - 1, this.lineIdx + 1);
      line.setText(def.lines[this.lineIdx]);
    }, { width: 180, height: 42, fill: COLORS.panelLight });

    const join = new Button(this, cx + 150, 470, already ? "Already joined" : full ? "Party full" : "Join the party", () => {
      if (already || full) return;
      const member = makeCompanion(def.id);
      if (GameState.player) member.level = GameState.player.level;
      syncSkills(member);
      member.hp = maxHP(member);
      member.mp = maxMP(member);
      GameState.addCompanion(member);
      GameState.save();
      line.setText(def.joinLine);
      join.setText("Joined!").setDisabled(true);
      this.time.delayedCall(900, () => {
        this.cameras.main.fadeOut(280, 0, 0, 0);
        this.time.delayedCall(300, () => this.scene.start(SCENES.Overworld));
      });
    }, { width: 240, height: 42, fill: already || full ? COLORS.panel : COLORS.border, disabled: already || full });

    new Button(this, 110, 470, "Leave", () => this.scene.start(SCENES.Overworld), { width: 120, height: 42, fill: COLORS.panelLight });
    void next;
    void spr;
  }
}
