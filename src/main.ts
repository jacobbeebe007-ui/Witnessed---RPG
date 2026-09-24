import type Phaser from "phaser";

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
    hint.textContent =
      "Run npm run dev (or npm run preview) and open the printed http:// URL — do not open index.html as a file.";
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

  setLoadingStatus("LOADING ENGINE…");
  // Dynamic import so a missing/blocked Phaser bundle surfaces as a caught error
  // instead of a silent forever-loading HTML overlay.
  const PhaserMod = await import("phaser");
  const Phaser = PhaserMod.default;

  const { GAME_WIDTH, GAME_HEIGHT, COLORS } = await import("./config");
  const { BootScene } = await import("./scenes/BootScene");
  const { StartScene } = await import("./scenes/StartScene");
  const { SettingsScene } = await import("./scenes/SettingsScene");
  const { CharacterCreationScene } = await import("./scenes/CharacterCreationScene");
  const { OverworldScene } = await import("./scenes/OverworldScene");
  const { BattleScene } = await import("./scenes/BattleScene");
  const { ShopScene } = await import("./scenes/ShopScene");
  const { DialogueScene } = await import("./scenes/DialogueScene");

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
    scene: [BootScene, StartScene, SettingsScene, CharacterCreationScene, OverworldScene, BattleScene, ShopScene, DialogueScene],
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
