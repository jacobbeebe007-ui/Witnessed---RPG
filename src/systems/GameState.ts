import type { Character } from "./character";
import type { EnemyDef } from "../data/enemies";

export interface Settings {
  masterVolume: number; // 0..1
  sfx: boolean;
  difficulty: "story" | "normal" | "hard";
}

export interface PendingBattle {
  enemies: EnemyDef[];
  isBoss: boolean;
  bossId?: string;
  /** Overworld position to return to. */
  returnX: number;
  returnY: number;
}

/** Simple global game state singleton (also persisted to localStorage). */
class GameStateStore {
  player: Character | null = null;
  settings: Settings = { masterVolume: 0.6, sfx: true, difficulty: "normal" };
  overworld = { x: 0, y: 0, hasSpawn: false, defeatedBosses: [] as string[] };
  pendingBattle: PendingBattle | null = null;

  difficultyMult(): number {
    switch (this.settings.difficulty) {
      case "story":
        return 0.7;
      case "hard":
        return 1.4;
      default:
        return 1;
    }
  }

  save(): void {
    try {
      localStorage.setItem(
        "witnessed_save",
        JSON.stringify({ player: this.player, settings: this.settings, overworld: this.overworld })
      );
    } catch {
      /* ignore quota / unavailable */
    }
  }

  load(): boolean {
    try {
      const raw = localStorage.getItem("witnessed_save");
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data.player) this.player = data.player;
      if (data.settings) this.settings = { ...this.settings, ...data.settings };
      if (data.overworld) this.overworld = { ...this.overworld, ...data.overworld };
      return !!data.player;
    } catch {
      return false;
    }
  }

  loadSettingsOnly(): void {
    try {
      const raw = localStorage.getItem("witnessed_save");
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.settings) this.settings = { ...this.settings, ...data.settings };
    } catch {
      /* ignore */
    }
  }

  reset(): void {
    this.player = null;
    this.overworld = { x: 0, y: 0, hasSpawn: false, defeatedBosses: [] };
    this.pendingBattle = null;
  }
}

export const GameState = new GameStateStore();
