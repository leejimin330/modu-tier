"use client";

import { useActionState } from "react";
import { addUploadedCharacter } from "../../actions";
import styles from "../../admin.module.css";

export function UploadForm({ topicId }: { topicId: string }) {
  const [error, action, pending] = useActionState(addUploadedCharacter, null);

  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="topicId" value={topicId} />
      <div className={styles.formRow}>
        <label className="field">
          이름
          <input name="name" required maxLength={60} />
        </label>
        <label className="field">
          작품 (선택)
          <input name="series" maxLength={100} />
        </label>
      </div>
      <label className="field">
        이미지 (PNG·JPG·WEBP·GIF, 2MB 이하, 세로 3:4 권장)
        <input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required />
      </label>
      {error && <p className="error">{error}</p>}
      <div>
        <button className="btn btn-plain" disabled={pending}>
          {pending ? "올리는 중" : "캐릭터 추가"}
        </button>
      </div>
    </form>
  );
}
