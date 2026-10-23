import { OG_SIZE, renderTierImage } from "@/lib/og-image";
import { getActiveTopic, getConsensus, rowsFrom } from "./data";

export const alt = "종합 티어표";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const topic = await getActiveTopic((await params).slug);
  if (!topic) return new Response("Not found", { status: 404 });

  const { entries, participants } = await getConsensus(topic.id);
  const tierOf = new Map(entries.map((e) => [e.characterId, e.tier]));
  return renderTierImage({
    title: topic.title,
    subtitle: participants > 0 ? `${participants.toLocaleString()}명이 매긴 종합 티어` : "첫 표를 기다리는 중",
    rows: rowsFrom(
      entries.map((e) => e.character),
      (c) => tierOf.get(c.id),
    ),
  });
}
