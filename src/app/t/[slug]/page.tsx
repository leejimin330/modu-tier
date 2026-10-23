import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/AdSlot";
import { ConsensusBoard } from "@/components/ConsensusBoard";
import { ReportButton } from "@/components/ReportButton";
import { ShareButtons } from "@/components/ShareButtons";
import { getCurrentUser } from "@/lib/auth";
import { encodeShare } from "@/lib/share-code";
import { store } from "@/lib/store";
import { getActiveTopic, getConsensus } from "./data";
import styles from "./topic.module.css";

export async function generateMetadata({ params }: PageProps<"/t/[slug]">): Promise<Metadata> {
  const topic = await getActiveTopic((await params).slug);
  if (!topic) return {};
  const description = topic.description || `${topic.title}, 다 같이 매긴 종합 티어를 확인하고 내 티어도 매겨 보세요.`;
  return { title: topic.title, description, openGraph: { title: topic.title, description } };
}

export default async function TopicPage({ params }: PageProps<"/t/[slug]">) {
  const { slug } = await params;
  const topic = await getActiveTopic(slug);
  if (!topic) notFound();

  const user = await getCurrentUser();
  const [{ items, entries, participants }, myVotes] = await Promise.all([
    getConsensus(topic.id),
    user ? store.getUserVotes(topic.id, user.id) : Promise.resolve({}),
  ]);
  const voted = Object.keys(myVotes).length > 0;
  const myShare = voted ? `/t/${topic.slug}/s/${encodeShare(myVotes, items.map((c) => c.id))}` : null;

  return (
    <main className="container">
      <header className={styles.head}>
        <div>
          {topic.category && <p className={styles.category}>{topic.category}</p>}
          <h1 className={`display ${styles.title}`}>{topic.title}</h1>
          {topic.description && <p className={styles.desc}>{topic.description}</p>}
          <p className={styles.meta}>
            {participants > 0 ? (
              <>
                <b>{participants.toLocaleString()}명</b>이 매긴 종합 티어
              </>
            ) : (
              "아직 아무도 티어를 매기지 않았어요. 첫 표를 남겨 보세요."
            )}
          </p>
        </div>
        <div className={styles.actions}>
          {myShare && (
            <Link href={myShare} className="btn btn-plain">
              내 티어 공유
            </Link>
          )}
          <Link href={`/t/${topic.slug}/rank`} className="btn">
            {voted ? "내 티어 고치기" : "내 티어 매기기"}
          </Link>
          <ReportButton topicId={topic.id} label="주제 신고" />
        </div>
      </header>

      {items.length === 0 ? (
        <p className={`panel ${styles.empty}`}>아직 항목이 없는 주제예요.</p>
      ) : (
        <ConsensusBoard topicId={topic.id} entries={entries} myVotes={myVotes} />
      )}

      <section className={styles.share}>
        <ShareButtons
          path={`/t/${topic.slug}`}
          text={`${topic.title} 종합 티어`}
          imagePath={`/t/${topic.slug}/opengraph-image`}
          imageName={`${topic.slug}-tier.png`}
        />
      </section>

      <p className={styles.how}>
        종합 점수는 S=5, A=4, B=3, C=2, D=1로 바꿔 평균을 내되, 표가 적은 항목은 이 주제 전체 평균 쪽으로
        당겨서 계산해요. 그래서 한두 명이 S를 줬다고 바로 S티어가 되지는 않아요. 로그인한 사람의 표만 반영됩니다.
      </p>
      <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOPIC} />
    </main>
  );
}
