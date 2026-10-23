"use client";

import { useActionState } from "react";
import { createTopic } from "./actions";
import styles from "./admin.module.css";

export function CreateTopicForm() {
  const [error, action, pending] = useActionState(createTopic, null);

  return (
    <form action={action} className={styles.form}>
      <label className="field">
        제목
        <input name="title" required maxLength={100} placeholder="주술회전 강함 티어리스트" />
      </label>
      <div className={styles.formRow}>
        <label className="field">
          주소 (영문)
          <input name="slug" required maxLength={60} pattern="[a-z0-9][a-z0-9\-]{1,59}" placeholder="jjk-power" />
        </label>
        <label className="field">
          분류
          <input name="category" maxLength={30} placeholder="강함 티어리스트" list="categories" />
          <datalist id="categories">
            <option value="강함 티어리스트" />
            <option value="여자 캐릭터 외모 티어리스트" />
            <option value="남자 캐릭터 외모 티어리스트" />
          </datalist>
        </label>
      </div>
      <label className="field">
        설명 (선택)
        <textarea name="description" rows={2} maxLength={500} placeholder="원작 만화 최신화 기준, 전성기 실력으로 매겨 주세요." />
      </label>
      {error && <p className="error">{error}</p>}
      <div>
        <button className="btn" disabled={pending}>
          {pending ? "만드는 중" : "주제 만들기"}
        </button>
      </div>
    </form>
  );
}
