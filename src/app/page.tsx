import Link from "next/link";
import { AdSlot } from "@/components/AdSlot";
import { ItemThumb } from "@/components/ItemThumb";
import { getCurrentUser } from "@/lib/auth";
import { store } from "@/lib/store";
import { TIERS } from "@/lib/tiers";
import { itemWords } from "@/lib/words";
import type { TopicSummary } from "@/lib/types";
import styles from "./home.module.css";

function groupByCategory(topics: TopicSummary[]) {
  const groups = new Map<string, TopicSummary[]>();
  for (const t of topics) {
    const key = t.category || "기타";
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  // 분류는 먼저 생긴 순서로, 분류 안의 주제는 최신순으로
  const oldest = (list: TopicSummary[]) =>
    list.reduce((m, t) => (t.created_at < m ? t.created_at : m), list[0].created_at);
  return [...groups].sort(([, a], [, b]) => oldest(a).localeCompare(oldest(b)));
}

export default async function Home() {
  // 로그인 여부와 무관하게 요청마다 최신 집계를 보여준다
  await getCurrentUser();
  const topics = await store.listTopics({ includeHidden: false });
  const groups = groupByCategory(topics);

  return (
    <main>
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <ol className={styles.ladder} aria-hidden="true">
            {TIERS.map((t) => (
              <li key={t} style={{ background: `var(--tier-${t})` }} className="display">
                {t}
              </li>
            ))}
          </ol>
          <div>
            <h1 className={`display ${styles.title}`}>
              내가 매긴 티어가
              <br />
              모두의 티어가 됩니다
            </h1>
            <p className={styles.lead}>공식이 뭘 알아? 우리가 곧 공식이야.</p>
          </div>
        </div>
      </section>

      <div className="container">
        {topics.length === 0 ? (
          <p className={`panel ${styles.empty}`}>아직 열린 주제가 없어요. 곧 첫 티어 주제가 올라옵니다.</p>
        ) : (
          <>
            <nav className={styles.catNav} aria-label="분류">
              {groups.map(([category, list], i) => (
                <a key={category} href={`#cat-${i}`} className={styles.catChip}>
                  {category} <span>{list.length}</span>
                </a>
              ))}
            </nav>
            {groups.map(([category, list], i) => (
              <section key={category} id={`cat-${i}`} className={styles.group}>
                <h2 className={`display ${styles.groupTitle}`}>{category}</h2>
                <ul className={styles.list}>
                  {list.map((t) => (
                    <li key={t.id}>
                      <Link href={`/t/${t.slug}`} className={`panel ${styles.topic}`}>
                        <div className={styles.thumbs} aria-hidden="true">
                          {t.preview.map((item, i) => (
                            <ItemThumb key={i} item={item} className={styles.thumbItem} />
                          ))}
                        </div>
                        <div className={styles.topicText}>
                          <h3 className="display">{t.title}</h3>
                          {t.description && <p>{t.description}</p>}
                          <p className={styles.meta}>
                            {itemWords(t.preview).noun} {t.item_count}
                            {itemWords(t.preview).unit}, 참여 {t.participants.toLocaleString()}명
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
        <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME} />
      </div>
    </main>
  );
}
