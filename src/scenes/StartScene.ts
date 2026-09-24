import Phaser from "phaser";
import { SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS } from "../config";
import { Button, textStyle } from "../ui/ui";
import { addAmbientBackground } from "../ui/background";
import { GameState } from "../systems/GameState";

export class StartScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Start);
  }

  create(): void {
    const hideLoading = this.game.registry.get("hideLoading") as (() => void) | undefined;
    if (hideLoading) hideLoading();
    else {
      const loading = document.getElementById("loading");
      if (loading) loading.remove();
      window.__WITNESSED_READY = true;
    }

    addAmbientBackground(this);
    const cx = GAME_WIDTH / 2;

    // Decorative rune circle behind title
    const rune = this.add.circle(cx, 150, 90, COLORS.accent, 0.05).setStrokeStyle(2, COLORS.border, 0.5);
    this.tweens.add({ targets: rune, angle: 360, duration: 40000, repeat: -1 });

    const title = this.add
      .text(cx, 130, "WITNESSED", textStyle(72, COLORS.text, { fontStyle: "bold" }))
      .setOrigin(0.5)
      .setShadow(0, 0, "#b47bff", 24, true, true);
    this.tweens.add({ targets: title, y: 122, duration: 2600, yoyo: true, repeat: -1, ease: "Sine.inOut" });

    this.add
      .text(cx, 188, "A  T U R N - B A S E D  F A N T A S Y  R P G", textStyle(16, COLORS.accent2, { fontStyle: "bold" }))
      .setOrigin(0.5);

    const hasSave = this.hasSave();
    let y = 280;
    const gap = 66;

    if (hasSave) {
      new Button(this, cx, y, "Continue", () => this.continueGame(), { width: 260, fill: COLORS.border });
      y += gap;
    }

    new Button(this, cx, y, hasSave ? "New Game" : "Start", () => this.startNew(), { width: 260 });
    y += gap;
    new Button(this, cx, y, "Settings", () => this.scene.start(SCENES.Settings, { from: SCENES.Start }), { width: 260 });

    this.add
      .text(cx, GAME_HEIGHT - 24, "Party of 4  •  timed strikes & parries  •  v0.2", textStyle(13, COLORS.textDim))
      .setOrigin(0.5);
  }

  private hasSave(): boolean {
    try {
      const raw = localStorage.getItem("witnessed_save");
      if (!raw) return false;
      return !!JSON.parse(raw).player;
    } catch {
      return false;
    }
  }

  private startNew(): void {
    GameState.reset();
    this.scene.start(SCENES.CharacterCreation);
  }

  private continueGame(): void {
    if (GameState.load() && GameState.party.length) {
      this.scene.start(SCENES.Overworld);
    } else {
      this.startNew();
    }
  }
}
