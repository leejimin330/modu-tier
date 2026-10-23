import "server-only";
import { cache } from "react";
import type { BoardEntry } from "@/components/ConsensusBoard";
import { aggregate } from "@/lib/aggregate";
import { store } from "@/lib/store";
import { TIERS, type Tier } from "@/lib/tiers";
import type { Character, Topic } from "@/lib/types";

/** 공개된 주제만. 같은 요청 안의 page·metadata·이미지가 한 번만 읽도록 캐시한다. */
export const getActiveTopic = cache(async (slug: string): Promise<Topic | null> => {
  const topic = await store.getTopicBySlug(slug);
  return topic && topic.status === "active" ? topic : null;
});

export const getConsensus = cache(async (topicId: string) => {
  const [items, counts, participants] = await Promise.all([
    store.listItems(topicId),
    store.voteCounts(topicId),
    store.participantCount(topicId),
  ]);
  const byId = new Map(items.map((c) => [c.id, c]));
  const result = aggregate(
    items.map((c) => c.id),
    counts,
  );
  const entries: BoardEntry[] = result.entries.map((e) => ({ ...e, character: byId.get(e.characterId)! }));
  return { items, entries, participants };
});

/** 티어별 항목 목록 (그림용) */
export function rowsFrom(items: Character[], tierOf: (c: Character) => Tier | null | undefined) {
  return TIERS.map((tier) => ({ tier, items: items.filter((c) => tierOf(c) === tier) }));
}
