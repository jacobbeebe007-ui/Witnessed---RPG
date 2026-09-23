import Phaser from "phaser";
import { SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS } from "../config";
import { Button, drawPanel, textStyle } from "../ui/ui";
import { addAmbientBackground } from "../ui/background";
import { GameState, type Settings } from "../systems/GameState";

export class SettingsScene extends Phaser.Scene {
  private from = SCENES.Start as string;

  constructor() {
    super(SCENES.Settings);
  }

  init(data: { from?: string }): void {
    this.from = data.from ?? SCENES.Start;
  }

  create(): void {
    addAmbientBackground(this);
    const cx = GAME_WIDTH / 2;
    this.add.text(cx, 60, "Settings", textStyle(44, COLORS.text, { fontStyle: "bold" })).setOrigin(0.5);

    drawPanel(this, cx - 300, 120, 600, 300);

    // Master volume slider
    this.buildSlider(cx, 175, "Master Volume", () => GameState.settings.masterVolume, (v) => {
      GameState.settings.masterVolume = v;
      this.sound.volume = v;
    });

    // SFX toggle
    this.buildToggle(cx, 245, "Sound Effects", () => GameState.settings.sfx, (v) => (GameState.settings.sfx = v));

    // Difficulty selector
    this.buildDifficulty(cx, 330);

    new Button(this, cx, 470, "Back", () => {
      GameState.save();
      this.scene.start(this.from);
    }, { width: 220 });
  }

  private buildSlider(cx: number, y: number, label: string, get: () => number, set: (v: number) => void): void {
    this.add.text(cx - 260, y, label, textStyle(20)).setOrigin(0, 0.5);
    const trackX = cx + 20;
    const trackW = 220;
    const track = this.add.rectangle(trackX, y, trackW, 8, COLORS.panelLight).setOrigin(0, 0.5).setStrokeStyle(1, COLORS.border);
    const knob = this.add.circle(trackX + get() * trackW, y, 11, COLORS.accent).setStrokeStyle(2, 0xffffff, 0.4);
    const valText = this.add.text(trackX + trackW + 16, y, `${Math.round(get() * 100)}`, textStyle(18, COLORS.accent2)).setOrigin(0, 0.5);
    knob.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(knob);
    this.input.on("drag", (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Arc, dragX: number) => {
      if (obj !== knob) return;
      const clamped = Phaser.Math.Clamp(dragX, trackX, trackX + trackW);
      knob.x = clamped;
      const v = (clamped - trackX) / trackW;
      set(v);
      valText.setText(`${Math.round(v * 100)}`);
    });
    void track;
  }

  private buildToggle(cx: number, y: number, label: string, get: () => boolean, set: (v: boolean) => void): void {
    this.add.text(cx - 260, y, label, textStyle(20)).setOrigin(0, 0.5);
    const box = this.add.rectangle(cx + 130, y, 64, 30, get() ? COLORS.good : COLORS.panelLight).setStrokeStyle(2, COLORS.border);
    const knob = this.add.circle(cx + 130 + (get() ? 16 : -16), y, 12, 0xffffff);
    const t = this.add.text(cx + 175, y, get() ? "ON" : "OFF", textStyle(16, COLORS.textDim)).setOrigin(0, 0.5);
    box.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
      const v = !get();
      set(v);
      box.setFillStyle(v ? COLORS.good : COLORS.panelLight);
      this.tweens.add({ targets: knob, x: cx + 130 + (v ? 16 : -16), duration: 120 });
      t.setText(v ? "ON" : "OFF");
    });
  }

  private buildDifficulty(cx: number, y: number): void {
    this.add.text(cx - 260, y, "Difficulty", textStyle(20)).setOrigin(0, 0.5);
    const options: Array<Settings["difficulty"]> = ["story", "normal", "hard"];
    const labels = { story: "Story", normal: "Normal", hard: "Hard" };
    const startX = cx - 40;
    const rects: Phaser.GameObjects.Rectangle[] = [];
    options.forEach((opt, i) => {
      const rx = startX + i * 110;
      const selected = GameState.settings.difficulty === opt;
      const r = this.add.rectangle(rx, y, 100, 36, selected ? COLORS.border : COLORS.panelLight).setStrokeStyle(2, selected ? COLORS.accent : COLORS.border);
      this.add.text(rx, y, labels[opt], textStyle(16)).setOrigin(0.5);
      r.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
        GameState.settings.difficulty = opt;
        rects.forEach((rr, j) => {
          const sel = options[j] === opt;
          rr.setFillStyle(sel ? COLORS.border : COLORS.panelLight).setStrokeStyle(2, sel ? COLORS.accent : COLORS.border);
        });
      });
      rects.push(r);
    });
    void GAME_HEIGHT;
  }
}
