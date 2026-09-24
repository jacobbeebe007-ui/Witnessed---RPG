/** Expedition 33-style timing grades for attacks and defensive reads. */

export type TimingGrade = "perfect" | "good" | "ok" | "miss";
export type DefenseMove = "dodge" | "parry";
export type DefenseResult = "parry" | "dodge" | "hit";

export function gradeAttackTiming(position: number, sweetStart = 0.62, sweetEnd = 0.78): TimingGrade {
  const mid = (sweetStart + sweetEnd) / 2;
  const half = (sweetEnd - sweetStart) / 2;
  const dist = Math.abs(position - mid);
  if (dist <= half * 0.38) return "perfect";
  if (dist <= half) return "good";
  if (dist <= half * 1.85) return "ok";
  return "miss";
}

export function attackMultiplier(grade: TimingGrade): number {
  switch (grade) {
    case "perfect":
      return 1.65;
    case "good":
      return 1.28;
    case "ok":
      return 1.0;
    case "miss":
      return 0.55;
  }
}

export function comboMultiplier(grades: TimingGrade[]): number {
  if (grades.length === 0) return 1;
  const avg = grades.reduce((s, g) => s + attackMultiplier(g), 0) / grades.length;
  const perfects = grades.filter((g) => g === "perfect").length;
  return avg + perfects * 0.08;
}

export function gradeLabel(grade: TimingGrade): string {
  switch (grade) {
    case "perfect":
      return "PERFECT";
    case "good":
      return "GREAT";
    case "ok":
      return "OK";
    case "miss":
      return "MISS";
  }
}

export function gradeColor(grade: TimingGrade): number {
  switch (grade) {
    case "perfect":
      return 0xffcf5c;
    case "good":
      return 0x59d98a;
    case "ok":
      return 0x4aa6ff;
    case "miss":
      return 0xff5c5c;
  }
}

/**
 * Defense window uses a shrinking ring. `t` is 0..1 (just started → expired).
 * The sweet band sits near the end of the tween.
 */
export function resolveDefense(t: number, move: DefenseMove): DefenseResult {
  if (move === "parry") {
    if (t >= 0.72 && t <= 0.88) return "parry";
    if (t >= 0.6 && t <= 0.94) return "dodge";
    return "hit";
  }
  // Dodge is more forgiving.
  if (t >= 0.55 && t <= 0.92) return "dodge";
  return "hit";
}
