import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TierEditor } from "@/components/TierEditor";
import { getCurrentUser } from "@/lib/auth";
import { store } from "@/lib/store";
import { itemWords } from "@/lib/words";
import styles from "../topic.module.css";

export async function generateMetadata({ params }: PageProps<"/t/[slug]/rank">): Promise<Metadata> {
  const topic = await store.getTopicBySlug((await params).slug);
  return topic ? { title: `${topic.title} 티어 매기기` } : {};
}

export default async function RankPage({ params }: PageProps<"/t/[slug]/rank">) {
  const { slug } = await params;
  const topic = await store.getTopicBySlug(slug);
  if (!topic || topic.status !== "active") notFound();

  const user = await getCurrentUser();
  const [items, myVotes] = await Promise.all([
    store.listItems(topic.id),
    user ? store.getUserVotes(topic.id, user.id) : Promise.resolve({}),
  ]);

  const w = itemWords(items);

  return (
    <main className="container">
      <header className={styles.head}>
        <div>
          <p className={styles.category}>
            <Link href={`/t/${topic.slug}`}>{topic.title}</Link>
          </p>
          <h1 className={`display ${styles.title}`}>내 티어 매기기</h1>
          <p className={styles.meta}>
            {w.obj} 끌어다 놓거나, {w.obj} 누른 다음 티어 줄을 누르세요. 모르는 {w.topic} 아래에 남겨 둬도 돼요.
          </p>
        </div>
      </header>
      <TierEditor
        topicId={topic.id}
        slug={topic.slug}
        items={items}
        initialVotes={myVotes}
        loggedIn={Boolean(user)}
      />
    </main>
  );
}
