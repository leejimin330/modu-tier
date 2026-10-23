import Link from "next/link";
import { store } from "@/lib/store";
import { resolveReport } from "../actions";
import styles from "../admin.module.css";

export default async function ReportsPage() {
  const reports = await store.listReports("open");

  return (
    <>
      <h1 className={`display ${styles.h1}`}>신고 처리</h1>
      <section className={`panel ${styles.section}`}>
        {reports.length === 0 ? (
          <p className="muted">처리할 신고가 없어요.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>대상</th>
                <th>사유</th>
                <th>접수</th>
                <th>처리</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.topic_slug ? <Link href={`/t/${r.topic_slug}`}>{r.topic_title}</Link> : r.topic_title}
                    <br />
                    <b>{r.target_type === "topic" ? "주제 전체" : (r.character_name ?? "(이미 빠진 캐릭터)")}</b>
                  </td>
                  <td>{r.reason}</td>
                  <td>
                    {new Date(r.created_at).toLocaleString("ko-KR")}
                    <br />
                    <span className="muted">{r.user_id ? "회원" : "비회원"}</span>
                  </td>
                  <td>
                    <form action={resolveReport} className={styles.inline}>
                      <input type="hidden" name="reportId" value={r.id} />
                      <button name="action" value="delete" className="btn btn-small">
                        {r.target_type === "topic" ? "주제 숨기기" : "캐릭터 빼기"}
                      </button>
                      <button name="action" value="dismiss" className="link-button">
                        기각
                      </button>
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
