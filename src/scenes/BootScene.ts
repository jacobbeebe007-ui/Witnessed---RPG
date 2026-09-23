import Phaser from "phaser";
import { SCENES } from "../config";
import { buildCharacterTextures } from "../gfx/characters";
import { buildEnemyTextures } from "../gfx/enemies";
import { buildTileTextures } from "../gfx/tiles";
import { GameState } from "../systems/GameState";

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Boot);
  }

  create(): void {
    try {
      // Generate all procedural textures + animations once.
      buildTileTextures(this);
      buildCharacterTextures(this);
      buildEnemyTextures(this);
      GameState.loadSettingsOnly();
      this.scene.start(SCENES.Start);
    } catch (err) {
      console.error("[Witnessed] BootScene failed", err);
      const hide = this.game.registry.get("hideLoading") as (() => void) | undefined;
      // Keep the HTML overlay and surface the error there if possible.
      const loading = document.getElementById("loading");
      const status = document.getElementById("loading-status");
      if (loading) {
        loading.classList.add("error");
        if (status) {
          status.textContent =
            "Failed while preparing art:\n" + (err instanceof Error ? err.message : String(err));
        }
      } else if (hide) {
        hide();
      }
      window.__WITNESSED_FAIL = true;
    }
  }
}
