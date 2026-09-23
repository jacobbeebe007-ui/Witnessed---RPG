import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from "../config";

/** A reusable dark, drifting-embers background for menu scenes. */
export function addAmbientBackground(scene: Phaser.Scene, tint: number = COLORS.accent): void {
  const g = scene.add.graphics();
  // vertical gradient
  for (let i = 0; i < GAME_HEIGHT; i += 2) {
    const t = i / GAME_HEIGHT;
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0x140a1e),
      Phaser.Display.Color.ValueToColor(0x05030a),
      GAME_HEIGHT,
      i
    );
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
    g.fillRect(0, i, GAME_WIDTH, 2);
    void t;
  }

  // drifting embers
  for (let i = 0; i < 40; i++) {
    const x = Phaser.Math.Between(0, GAME_WIDTH);
    const y = Phaser.Math.Between(0, GAME_HEIGHT);
    const r = Phaser.Math.FloatBetween(0.6, 2.2);
    const dot = scene.add.circle(x, y, r, tint, Phaser.Math.FloatBetween(0.2, 0.7));
    scene.tweens.add({
      targets: dot,
      y: y - Phaser.Math.Between(40, 120),
      alpha: 0,
      duration: Phaser.Math.Between(3000, 7000),
      repeat: -1,
      delay: Phaser.Math.Between(0, 3000),
      onRepeat: () => {
        dot.y = GAME_HEIGHT + 10;
        dot.x = Phaser.Math.Between(0, GAME_WIDTH);
        dot.setAlpha(Phaser.Math.FloatBetween(0.2, 0.7));
      },
    });
  }

  // vignette
  const v = scene.add.graphics();
  v.fillStyle(0x000000, 0.35);
  v.fillRect(0, 0, GAME_WIDTH, 40);
  v.fillRect(0, GAME_HEIGHT - 40, GAME_WIDTH, 40);
}
