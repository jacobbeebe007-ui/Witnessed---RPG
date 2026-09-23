import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from "./config";
import { BootScene } from "./scenes/BootScene";
import { StartScene } from "./scenes/StartScene";
import { SettingsScene } from "./scenes/SettingsScene";
import { CharacterCreationScene } from "./scenes/CharacterCreationScene";
import { OverworldScene } from "./scenes/OverworldScene";
import { BattleScene } from "./scenes/BattleScene";
import { ShopScene } from "./scenes/ShopScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#" + COLORS.bg.toString(16).padStart(6, "0"),
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { antialias: false },
  scene: [BootScene, StartScene, SettingsScene, CharacterCreationScene, OverworldScene, BattleScene, ShopScene],
};

const loading = document.getElementById("loading");
if (loading) loading.remove();

new Phaser.Game(config);
