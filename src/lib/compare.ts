import type { AggregateEntry } from "./aggregate";
import { TIER_SCORE, type Tier } from "./tiers";

export interface Difference {
  characterId: string;
  mine: Tier;
  consensus: Tier;
  /** 양수면 내가 더 높게 봤다 */
  gap: number;
}

export interface Comparison {
  /** 종합 티어가 정해진 캐릭터 중 내가 매긴 수 */
  compared: number;
  /** 그중 티어가 똑같은 수 */
  same: number;
  /** 0~100. 비교할 캐릭터가 없으면 null */
  matchRate: number | null;
  /** 티어가 다른 캐릭터, 차이가 큰 순 */
  differences: Difference[];
}

export function compareToConsensus(mine: Record<string, Tier>, entries: AggregateEntry[]): Comparison {
  let compared = 0;
  let same = 0;
  const differences: Difference[] = [];
  for (const e of entries) {
    const m = mine[e.characterId];
    if (!m || !e.tier) continue;
    compared += 1;
    const gap = TIER_SCORE[m] - TIER_SCORE[e.tier];
    if (gap === 0) same += 1;
    else differences.push({ characterId: e.characterId, mine: m, consensus: e.tier, gap });
  }
  differences.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
  return {
    compared,
    same,
    matchRate: compared > 0 ? Math.round((same / compared) * 100) : null,
    differences,
  };
}
