"use client";

import { useState, useTransition } from "react";
import { submitReport } from "@/app/actions";
import styles from "./ReportButton.module.css";

interface Props {
  topicId: string;
  characterId?: string;
  label: string;
}

/** 링크 모양 버튼을 누르면 사유 입력 칸이 펼쳐지는 신고 양식 */
export function ReportForm({ topicId, characterId, label }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  if (message?.ok) return <p className={styles.done}>{message.text}</p>;
  if (!open) {
    return (
      <button type="button" className="link-button" onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }

  return (
    <form
      className={styles.form}
      action={(fd) =>
        start(async () => {
          const r = await submitReport(fd);
          setMessage(r.ok ? { ok: true, text: "신고를 보냈어요. 관리자가 확인한 뒤 처리합니다." } : { ok: false, text: r.error });
        })
      }
    >
      <input type="hidden" name="topicId" value={topicId} />
      {characterId && <input type="hidden" name="characterId" value={characterId} />}
      <label className="field">
        신고 사유
        <textarea
          name="reason"
          rows={3}
          maxLength={1000}
          required
          placeholder="예: 다른 작품 캐릭터가 섞여 있어요 / 권리자로서 이미지 삭제를 요청합니다"
        />
      </label>
      {message && <p className="error">{message.text}</p>}
      <div className={styles.row}>
        <button className="btn btn-small" disabled={pending}>
          {pending ? "보내는 중" : "신고 보내기"}
        </button>
        <button type="button" className="link-button" onClick={() => setOpen(false)}>
          취소
        </button>
      </div>
    </form>
  );
}

/** 페이지 머리말용: 신고 양식을 팝업으로 띄운다 */
export function ReportButton(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.wrap}>
      <button type="button" className="link-button" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {props.label}
      </button>
      {open && (
        <div className={`panel ${styles.popover}`}>
          <ReportForm {...props} label={props.label} />
        </div>
      )}
    </div>
  );
}
