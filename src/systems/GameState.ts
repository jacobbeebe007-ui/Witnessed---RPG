import type { Character } from "./character";
import type { EnemyDef } from "../data/enemies";
import { MAX_PARTY } from "../data/companions";

export interface Settings {
  masterVolume: number;
  sfx: boolean;
  difficulty: "story" | "normal" | "hard";
}

export interface PendingBattle {
  enemies: EnemyDef[];
  isBoss: boolean;
  bossId?: string;
  returnX: number;
  returnY: number;
}

export interface StoryFlags {
  recruited: string[];
  introSeen: boolean;
}

/** Simple global game state singleton (also persisted to localStorage). */
class GameStateStore {
  /** Always mirrors party[0] when a party exists. */
  player: Character | null = null;
  party: Character[] = [];
  settings: Settings = { masterVolume: 0.6, sfx: true, difficulty: "normal" };
  overworld = { x: 0, y: 0, hasSpawn: false, defeatedBosses: [] as string[] };
  pendingBattle: PendingBattle | null = null;
  flags: StoryFlags = { recruited: [], introSeen: false };

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

  livingParty(): Character[] {
    return this.party.filter((c) => c.hp > 0);
  }

  bag(): string[] {
    return this.party[0]?.inventory ?? this.player?.inventory ?? [];
  }

  canRecruit(): boolean {
    return this.party.length < MAX_PARTY;
  }

  addCompanion(c: Character): boolean {
    if (this.party.length >= MAX_PARTY) return false;
    if (c.companionId && this.flags.recruited.includes(c.companionId)) return false;
    this.party.push(c);
    if (c.companionId) this.flags.recruited.push(c.companionId);
    this.syncLeader();
    return true;
  }

  syncLeader(): void {
    this.player = this.party[0] ?? null;
  }

  startNew(hero: Character): void {
    this.party = [hero];
    this.player = hero;
    this.overworld = { x: 0, y: 0, hasSpawn: false, defeatedBosses: [] };
    this.pendingBattle = null;
    this.flags = { recruited: [], introSeen: false };
  }

  save(): void {
    try {
      this.syncLeader();
      localStorage.setItem(
        "witnessed_save",
        JSON.stringify({
          player: this.player,
          party: this.party,
          settings: this.settings,
          overworld: this.overworld,
          flags: this.flags,
        })
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
      if (data.settings) this.settings = { ...this.settings, ...data.settings };
      if (data.overworld) this.overworld = { ...this.overworld, ...data.overworld };
      if (data.flags) this.flags = { recruited: [], introSeen: false, ...data.flags };
      if (Array.isArray(data.party) && data.party.length) {
        this.party = data.party;
        this.player = this.party[0];
      } else if (data.player) {
        this.player = data.player;
        this.party = [data.player];
      }
      return this.party.length > 0;
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
    this.party = [];
    this.overworld = { x: 0, y: 0, hasSpawn: false, defeatedBosses: [] };
    this.pendingBattle = null;
    this.flags = { recruited: [], introSeen: false };
  }
}

export const GameState = new GameStateStore();
