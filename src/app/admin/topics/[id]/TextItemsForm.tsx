"use client";

import { useActionState } from "react";
import { addTextItems } from "../../actions";
import styles from "../../admin.module.css";

export function TextItemsForm({ topicId }: { topicId: string }) {
  const [error, action, pending] = useActionState(addTextItems, null);

  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="topicId" value={topicId} />
      <label className="field">
        한 줄에 하나씩. 이모지를 붙이려면 &quot;이름 | 이모지&quot;
        <textarea name="lines" rows={6} required placeholder={"치킨 | 🍗\n피자 | 🍕\n뉴진스"} />
      </label>
      {error && <p className="error">{error}</p>}
      <div>
        <button className="btn btn-plain" disabled={pending}>
          {pending ? "추가하는 중" : "항목 추가"}
        </button>
      </div>
    </form>
  );
}
