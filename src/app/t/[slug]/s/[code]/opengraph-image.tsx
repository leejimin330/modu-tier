import { compareToConsensus } from "@/lib/compare";
import { OG_SIZE, renderTierImage } from "@/lib/og-image";
import { decodeShare } from "@/lib/share-code";
import { getActiveTopic, getConsensus, rowsFrom } from "../../data";

export const alt = "내가 매긴 티어표";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string; code: string }> }) {
  const { slug, code } = await params;
  const topic = await getActiveTopic(slug);
  if (!topic) return new Response("Not found", { status: 404 });
  const { items, entries } = await getConsensus(topic.id);
  const votes = decodeShare(code, items.map((c) => c.id));
  if (!votes) return new Response("Not found", { status: 404 });

  const { matchRate } = compareToConsensus(votes, entries);
  return renderTierImage({
    title: topic.title,
    subtitle: matchRate === null ? "내가 매긴 티어" : `내가 매긴 티어 · 종합과 ${matchRate}% 일치`,
    rows: rowsFrom(items, (c) => votes[c.id]),
  });
}
