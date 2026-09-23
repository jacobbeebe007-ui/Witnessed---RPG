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
    // Generate all procedural textures + animations once.
    buildTileTextures(this);
    buildCharacterTextures(this);
    buildEnemyTextures(this);
    GameState.loadSettingsOnly();
    this.scene.start(SCENES.Start);
  }
}
