import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemThumb } from "@/components/ItemThumb";
import { isUuid, store } from "@/lib/store";
import { removeItem, renameCharacter } from "../../actions";
import { AnilistImporter } from "./AnilistImporter";
import { TextItemsForm } from "./TextItemsForm";
import { UploadForm } from "./UploadForm";
import styles from "../../admin.module.css";

export default async function AdminTopicPage({ params }: PageProps<"/admin/topics/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const topic = await store.getTopic(id);
  if (!topic) notFound();
  const items = await store.listItems(id);

  return (
    <>
      <h1 className={`display ${styles.h1}`}>{topic.title}</h1>
      <p>
        <Link href={`/t/${topic.slug}`}>공개 페이지 보기</Link>
        {topic.status === "hidden" && <b className={styles.danger}> (숨김 상태)</b>}
      </p>

      <section className={`panel ${styles.section}`}>
        <h2 className={styles.h2}>AniList에서 캐릭터 가져오기</h2>
        <AnilistImporter topicId={topic.id} existing={items.flatMap((c) => (c.anilist_id ? [c.anilist_id] : []))} />
      </section>

      <section className={`panel ${styles.section}`}>
        <h2 className={styles.h2}>직접 올리기</h2>
        <p className="muted">AniList에 없는 캐릭터나 이미지는 직접 올려요. 저작권에 문제없는 이미지만 올려 주세요.</p>
        <UploadForm topicId={topic.id} />
      </section>

      <section className={`panel ${styles.section}`}>
        <h2 className={styles.h2}>글자·이모지 항목 넣기</h2>
        <p className="muted">음식, 브랜드, 아이돌 그룹처럼 이미지 없이 이름이나 이모지로 보여줄 항목이에요.</p>
        <TextItemsForm topicId={topic.id} />
      </section>

      <section className={`panel ${styles.section}`}>
        <h2 className={styles.h2}>캐릭터 {items.length}명</h2>
        {items.length === 0 ? (
          <p className="muted">아직 캐릭터가 없어요. 위에서 가져오거나 올려 주세요.</p>
        ) : (
          <table className={styles.table}>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <ItemThumb item={c} className={styles.thumb} />
                  </td>
                  <td>
                    <form action={renameCharacter} className={styles.inline}>
                      <input type="hidden" name="topicId" value={topic.id} />
                      <input type="hidden" name="characterId" value={c.id} />
                      <input type="text" name="name" defaultValue={c.name} maxLength={60} aria-label="이름" required />
                      <button className="btn btn-small btn-plain">이름 저장</button>
                    </form>
                    <span className="muted">
                      {c.series} {c.source === "upload" ? "(직접 올림)" : c.source === "text" ? "(글자 항목)" : ""}
                    </span>
                  </td>
                  <td>
                    <form action={removeItem}>
                      <input type="hidden" name="topicId" value={topic.id} />
                      <input type="hidden" name="characterId" value={c.id} />
                      <button className={`link-button ${styles.danger}`}>주제에서 빼기</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="muted">
          이름을 고치면 같은 캐릭터를 쓰는 다른 주제에도 반영돼요. 주제에서 빼면 그 캐릭터에 매긴 표도 함께 지워져요.
        </p>
      </section>
    </>
  );
}
