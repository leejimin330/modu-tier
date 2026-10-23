import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/AdSlot";
import { ItemThumb, hasLabelInside } from "@/components/ItemThumb";
import { ShareButtons } from "@/components/ShareButtons";
import board from "@/components/tierboard.module.css";
import { compareToConsensus } from "@/lib/compare";
import { decodeShare } from "@/lib/share-code";
import { itemWords } from "@/lib/words";
import { TIERS } from "@/lib/tiers";
import type { Character } from "@/lib/types";
import { getActiveTopic, getConsensus } from "../../data";
import topicStyles from "../../topic.module.css";
import styles from "./share.module.css";

async function load(slug: string, code: string) {
  const topic = await getActiveTopic(slug);
  if (!topic) return null;
  const consensus = await getConsensus(topic.id);
  const votes = decodeShare(code, consensus.items.map((c) => c.id));
  return votes ? { topic, votes, ...consensus } : null;
}

export async function generateMetadata({ params }: PageProps<"/t/[slug]/s/[code]">): Promise<Metadata> {
  const { slug, code } = await params;
  const data = await load(slug, code);
  if (!data) return {};
  const { matchRate } = compareToConsensus(data.votes, data.entries);
  const title = `내가 매긴 ${data.topic.title}`;
  const description =
    matchRate === null ? "나도 티어를 매겨 보세요." : `종합 티어와 ${matchRate}% 일치. 당신은 몇 %인가요?`;
  return { title, description, openGraph: { title, description }, robots: { index: false } };
}

function matchComment(rate: number) {
  if (rate >= 80) return "거의 여론 그 자체";
  if (rate >= 60) return "대체로 대세를 따르는 편";
  if (rate >= 40) return "나름의 기준이 확실한 편";
  if (rate >= 20) return "소수 의견 전문가";
  return "혼자 다른 작품을 본 듯";
}

export default async function SharedTierPage({ params }: PageProps<"/t/[slug]/s/[code]">) {
  const { slug, code } = await params;
  const data = await load(slug, code);
  if (!data) notFound();
  const { topic, votes, items, entries } = data;

  const consensusOf = new Map(entries.map((e) => [e.characterId, e.tier]));
  const byId = new Map(items.map((c) => [c.id, c]));
  const cmp = compareToConsensus(votes, entries);
  const path = `/t/${topic.slug}/s/${code}`;
  const w = itemWords(items);

  const tile = (c: Character) => {
    const ct = consensusOf.get(c.id);
    return (
      <div key={c.id} className={board.tile}>
        <ItemThumb item={c} />
        {hasLabelInside(c) ? <span className="sr-only">{c.name}</span> : <span className={board.name}>{c.name}</span>}
        {ct && ct !== votes[c.id] && (
          <span className={board.badge} style={{ background: `var(--tier-${ct})` }} title={`종합 티어 ${ct}`}>
            {ct}
          </span>
        )}
      </div>
    );
  };

  return (
    <main className="container">
      <header className={topicStyles.head}>
        <div>
          <p className={topicStyles.category}>
            <Link href={`/t/${topic.slug}`}>{topic.title}</Link>
          </p>
          <h1 className={`display ${topicStyles.title}`}>누군가 매긴 티어</h1>
          <p className={topicStyles.meta}>
            {w.noun} {Object.keys(votes).length}
            {w.unit}에 티어를 매겼어요. 오른쪽 위 표시는 종합 티어가 다를 때만 보여요.
          </p>
        </div>
        <div className={topicStyles.actions}>
          <Link href={`/t/${topic.slug}/rank`} className="btn">
            나도 매겨 보기
          </Link>
        </div>
      </header>

      {cmp.matchRate !== null && (
        <section className={`panel ${styles.match}`}>
          <p className={styles.rate}>
            종합 티어와 <b className="display">{cmp.matchRate}%</b> 일치
          </p>
          <p className={styles.comment}>{matchComment(cmp.matchRate)}</p>
          <p className="muted">
            종합 티어가 정해진 {cmp.compared}
            {w.unit} 중 {cmp.same}
            {w.unitSubj} 같은 티어예요.
          </p>
          {cmp.differences.length > 0 && (
            <>
              <h2 className={styles.diffTitle}>가장 다르게 본 {w.noun}</h2>
              <ul className={styles.diffs}>
                {cmp.differences.slice(0, 3).map((d) => {
                  const c = byId.get(d.characterId)!;
                  return (
                    <li key={d.characterId}>
                      <ItemThumb item={c} className={styles.diffThumb} />
                      <span className={styles.diffName}>{c.name}</span>
                      <span className={styles.diffTiers}>
                        <span className={`display ${styles.chip}`} style={{ background: `var(--tier-${d.mine})` }}>
                          {d.mine}
                        </span>
                        <span className="muted">{d.gap > 0 ? "높게" : "낮게"} 봄, 종합</span>
                        <span className={`display ${styles.chip}`} style={{ background: `var(--tier-${d.consensus})` }}>
                          {d.consensus}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      )}

      <div className={board.board}>
        {TIERS.map((t) => (
          <div key={t} className={board.row}>
            <div className={`display ${board.label}`} style={{ background: `var(--tier-${t})` }}>
              {t}
            </div>
            <div className={board.tiles}>{items.filter((c) => votes[c.id] === t).map(tile)}</div>
          </div>
        ))}
      </div>

      <section className={styles.share}>
        <h2 className={styles.shareTitle}>이 티어 공유하기</h2>
        <ShareButtons
          path={path}
          text={`내가 매긴 ${topic.title}`}
          imagePath={`${path}/opengraph-image`}
          imageName={`${topic.slug}-my-tier.png`}
        />
      </section>
      <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOPIC} />
    </main>
  );
}
