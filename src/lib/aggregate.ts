import { TIERS, TIER_SCORE, tierFromScore, type Tier } from "./tiers";

/** 표가 적은 캐릭터를 전체 평균 쪽으로 당기는 가상의 표 수 */
export const PRIOR_WEIGHT = 3;
const NEUTRAL_MEAN = TIER_SCORE.B;

export interface VoteCount {
  character_id: string;
  tier: Tier;
  count: number;
}

export interface AggregateEntry {
  characterId: string;
  votes: number;
  /** 보정 전 단순 평균 (표가 없으면 null) */
  mean: number | null;
  /** 베이지안 보정 점수 (표가 없으면 null) */
  score: number | null;
  /** 종합 티어 (표가 없으면 null) */
  tier: Tier | null;
  distribution: Record<Tier, number>;
}

export interface AggregateResult {
  globalMean: number;
  /** 점수 내림차순, 미평가는 맨 뒤 (입력 순서 유지) */
  entries: AggregateEntry[];
}

const emptyDistribution = (): Record<Tier, number> => ({ S: 0, A: 0, B: 0, C: 0, D: 0 });

export function aggregate(characterIds: string[], counts: VoteCount[]): AggregateResult {
  const dist = new Map(characterIds.map((id) => [id, emptyDistribution()]));
  let total = 0;
  let sum = 0;
  for (const c of counts) {
    const d = dist.get(c.character_id);
    if (!d) continue;
    d[c.tier] += c.count;
    total += c.count;
    sum += TIER_SCORE[c.tier] * c.count;
  }
  const globalMean = total > 0 ? sum / total : NEUTRAL_MEAN;

  const entries: AggregateEntry[] = characterIds.map((id) => {
    const distribution = dist.get(id)!;
    let votes = 0;
    let s = 0;
    for (const t of TIERS) {
      votes += distribution[t];
      s += TIER_SCORE[t] * distribution[t];
    }
    if (votes === 0) return { characterId: id, votes, mean: null, score: null, tier: null, distribution };
    const score = (s + PRIOR_WEIGHT * globalMean) / (votes + PRIOR_WEIGHT);
    return { characterId: id, votes, mean: s / votes, score, tier: tierFromScore(score), distribution };
  });

  const order = new Map(characterIds.map((id, i) => [id, i]));
  entries.sort((a, b) => {
    if (a.score === null || b.score === null) {
      if (a.score !== b.score) return a.score === null ? 1 : -1;
      return order.get(a.characterId)! - order.get(b.characterId)!;
    }
    return b.score - a.score || b.votes - a.votes;
  });
  return { globalMean, entries };
}
