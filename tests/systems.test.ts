import { describe, expect, it } from "vitest";
import { attackMultiplier, comboMultiplier, gradeAttackTiming, resolveDefense } from "../src/systems/timing";
import { createCharacter, grantXP, syncSkills, makeCompanion } from "../src/systems/character";
import { GameState } from "../src/systems/GameState";
import { MAX_PARTY } from "../src/data/companions";

describe("attack timing", () => {
  it("scores the gold window as perfect or good", () => {
    expect(gradeAttackTiming(0.7)).toBe("perfect");
    expect(["perfect", "good"]).toContain(gradeAttackTiming(0.64));
    expect(gradeAttackTiming(0.1)).toBe("miss");
  });

  it("scales damage for a perfect combo", () => {
    expect(attackMultiplier("perfect")).toBeGreaterThan(1.5);
    expect(comboMultiplier(["perfect", "perfect"])).toBeGreaterThan(1.6);
    expect(comboMultiplier(["miss", "miss"])).toBeLessThan(0.7);
  });

  it("parries only in the tight window", () => {
    expect(resolveDefense(0.8, "parry")).toBe("parry");
    expect(resolveDefense(0.2, "parry")).toBe("hit");
    expect(resolveDefense(0.7, "dodge")).toBe("dodge");
  });
});

describe("level-up skills", () => {
  it("unlocks frostlance for a mage at level 3", () => {
    const c = createCharacter("male", "mage", { str: 8, dex: 8, con: 10, int: 16, wis: 12, cha: 10 }, "Ash");
    expect(c.skills).toContain("firebolt");
    while (c.level < 3) grantXP(c, 200);
    expect(c.level).toBeGreaterThanOrEqual(3);
    expect(c.skills).toContain("frostlance");
  });

  it("gives siren_wail to a female mage", () => {
    const c = createCharacter("female", "mage", { str: 8, dex: 8, con: 10, int: 14, wis: 12, cha: 14 }, "Lyra");
    expect(c.skills).toContain("siren_wail");
    expect(syncSkills(c)).toEqual([]);
  });
});

describe("party", () => {
  it("recruits up to four", () => {
    GameState.reset();
    const hero = createCharacter("male", "knight", { str: 16, dex: 10, con: 14, int: 8, wis: 10, cha: 10 }, "Roland");
    GameState.startNew(hero);
    expect(GameState.addCompanion(makeCompanion("aria"))).toBe(true);
    expect(GameState.addCompanion(makeCompanion("thorne"))).toBe(true);
    expect(GameState.addCompanion(makeCompanion("mirielle"))).toBe(true);
    expect(GameState.party.length).toBe(MAX_PARTY);
    expect(GameState.addCompanion(makeCompanion("aria"))).toBe(false);
  });
});
