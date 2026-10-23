export const TIERS = ["S", "A", "B", "C", "D"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_SCORE: Record<Tier, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };

/** 종합 점수 → 종합 티어. 각 티어 점수의 중간값이 경계다. */
export function tierFromScore(score: number): Tier {
  if (score >= 4.5) return "S";
  if (score >= 3.5) return "A";
  if (score >= 2.5) return "B";
  if (score >= 1.5) return "C";
  return "D";
}

export const isTier = (v: unknown): v is Tier => typeof v === "string" && (TIERS as readonly string[]).includes(v);
