import Link from "next/link";
import { store } from "@/lib/store";
import { setTopicStatus } from "./actions";
import { CreateTopicForm } from "./CreateTopicForm";
import styles from "./admin.module.css";

export default async function AdminHome() {
  const topics = await store.listTopics({ includeHidden: true });

  return (
    <>
      <h1 className={`display ${styles.h1}`}>주제 관리</h1>

      <section className={`panel ${styles.section}`}>
        <h2 className={styles.h2}>새 주제 만들기</h2>
        <CreateTopicForm />
      </section>

      <section className={`panel ${styles.section}`}>
        <h2 className={styles.h2}>주제 {topics.length}개</h2>
        {topics.length === 0 ? (
          <p className="muted">아직 만든 주제가 없어요. 위에서 첫 주제를 만들어 보세요.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>주제</th>
                <th>분류</th>
                <th>캐릭터</th>
                <th>참여</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((t) => (
                <tr key={t.id} className={t.status === "hidden" ? styles.hidden : undefined}>
                  <td>
                    <Link href={`/admin/topics/${t.id}`}>
                      <b>{t.title}</b>
                    </Link>
                    <br />
                    <span className="muted">/t/{t.slug}</span>
                  </td>
                  <td>{t.category}</td>
                  <td>{t.item_count}</td>
                  <td>{t.participants}</td>
                  <td>
                    <form action={setTopicStatus} className={styles.inline}>
                      <input type="hidden" name="topicId" value={t.id} />
                      <input type="hidden" name="status" value={t.status === "active" ? "hidden" : "active"} />
                      {t.status === "active" ? "공개" : "숨김"}
                      <button className="link-button">{t.status === "active" ? "숨기기" : "다시 공개"}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
