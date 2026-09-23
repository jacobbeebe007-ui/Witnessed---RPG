import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from "./config";
import { BootScene } from "./scenes/BootScene";
import { StartScene } from "./scenes/StartScene";
import { SettingsScene } from "./scenes/SettingsScene";
import { CharacterCreationScene } from "./scenes/CharacterCreationScene";
import { OverworldScene } from "./scenes/OverworldScene";
import { BattleScene } from "./scenes/BattleScene";
import { ShopScene } from "./scenes/ShopScene";

declare global {
  interface Window {
    __WITNESSED_READY?: boolean;
    __WITNESSED_FAIL?: boolean;
    __WITNESSED_GAME?: Phaser.Game;
  }
}

function setLoadingStatus(text: string): void {
  const status = document.getElementById("loading-status");
  if (status) status.textContent = text;
}

function hideLoading(): void {
  const loading = document.getElementById("loading");
  if (loading) loading.remove();
  window.__WITNESSED_READY = true;
}

function showBootError(err: unknown): void {
  window.__WITNESSED_FAIL = true;
  const loading = document.getElementById("loading");
  const status = document.getElementById("loading-status");
  const hint = document.getElementById("loading-hint");
  const message = err instanceof Error ? err.message : String(err);
  if (loading) loading.classList.add("error");
  if (status) status.textContent = "Failed to start Witnessed:\n" + message;
  if (hint) {
    hint.textContent = "Open the browser console for details, then refresh after fixing the error.";
  }
  console.error("[Witnessed] boot failed", err);
}

/** Yield a frame so the loading UI can paint before heavy sync work. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function startGame(): Promise<void> {
  setLoadingStatus("SUMMONING THE WITNESS…");
  await nextFrame();

  // Prefer Canvas: this is a 2D pixel-art game, and WebGL software fallbacks
  // are increasingly flaky in VMs / locked-down browsers (can hang before first paint).
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.CANVAS,
    parent: "game",
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#" + COLORS.bg.toString(16).padStart(6, "0"),
    pixelArt: true,
    roundPixels: true,
    banner: false,
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: { antialias: false },
    scene: [BootScene, StartScene, SettingsScene, CharacterCreationScene, OverworldScene, BattleScene, ShopScene],
    callbacks: {
      postBoot: (game) => {
        // BootScene may still be generating textures; StartScene clears the overlay.
        game.registry.set("hideLoading", hideLoading);
      },
    },
  };

  setLoadingStatus("WEAVING THE REALM…");
  await nextFrame();

  const game = new Phaser.Game(config);
  window.__WITNESSED_GAME = game;
}

startGame().catch(showBootError);
