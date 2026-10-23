"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { saveVotes } from "@/app/actions";
import { encodeShare } from "@/lib/share-code";
import { itemWords } from "@/lib/words";
import { TIERS, isTier, type Tier } from "@/lib/tiers";
import type { Character } from "@/lib/types";
import { ItemThumb, hasLabelInside } from "./ItemThumb";
import board from "./tierboard.module.css";
import styles from "./TierEditor.module.css";

interface Props {
  topicId: string;
  slug: string;
  items: Character[];
  initialVotes: Record<string, Tier>;
  loggedIn: boolean;
}

type Assign = Record<string, Tier>;

const draftKey = (topicId: string) => `tier-draft:${topicId}`;

// 브라우저 저장소는 막혀 있을 수 있으니 실패해도 편집은 계속되게 한다
function readDraft(topicId: string, valid: Set<string>): Assign {
  try {
    const raw = JSON.parse(localStorage.getItem(draftKey(topicId)) ?? "{}") as Record<string, unknown>;
    return Object.fromEntries(Object.entries(raw).filter(([id, t]) => valid.has(id) && isTier(t))) as Assign;
  } catch {
    return {};
  }
}

function writeDraft(topicId: string, assign: Assign | null) {
  try {
    if (assign && Object.keys(assign).length > 0) localStorage.setItem(draftKey(topicId), JSON.stringify(assign));
    else localStorage.removeItem(draftKey(topicId));
  } catch {
    // 무시
  }
}

export function TierEditor({ topicId, slug, items, initialVotes, loggedIn }: Props) {
  const router = useRouter();
  const [assign, setAssign] = useState<Assign>(initialVotes);
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [pending, start] = useTransition();
  const loaded = useRef(false);

  // 서버에 저장된 표가 없으면 이 브라우저에 임시 저장해 둔 티어를 불러온다
  useEffect(() => {
    if (Object.keys(initialVotes).length === 0) {
      const draft = readDraft(topicId, new Set(items.map((c) => c.id)));
      if (Object.keys(draft).length > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 후에만 읽을 수 있는 브라우저 저장소
        setAssign(draft);
        setNotice("이 브라우저에 임시 저장해 둔 티어를 불러왔어요.");
      }
    }
    loaded.current = true;
  }, [topicId, items, initialVotes]);

  useEffect(() => {
    if (loaded.current) writeDraft(topicId, assign);
  }, [topicId, assign]);

  function place(id: string, tier: Tier | null) {
    setAssign((prev) => {
      const next = { ...prev };
      if (tier) next[id] = tier;
      else delete next[id];
      return next;
    });
    setSelected(null);
    setError(null);
  }

  function dropProps(tier: Tier | null) {
    return {
      onDragOver: (e: React.DragEvent) => e.preventDefault(),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        if (items.some((c) => c.id === id)) place(id, tier);
      },
      onClick: (e: React.MouseEvent) => {
        if (selected && e.target === e.currentTarget) place(selected, tier);
      },
    };
  }

  const tile = (c: Character) => (
    <button
      key={c.id}
      type="button"
      draggable
      className={`${board.tile} ${selected === c.id ? styles.selected : ""}`}
      aria-pressed={selected === c.id}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", c.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => setSelected((s) => (s === c.id ? null : c.id))}
    >
      <ItemThumb item={c} />
      {hasLabelInside(c) ? <span className="sr-only">{c.name}</span> : <span className={board.name}>{c.name}</span>}
    </button>
  );

  const w = itemWords(items);
  const pool = items.filter((c) => !assign[c.id]);
  const count = items.length - pool.length;

  function submit() {
    setError(null);
    if (!loggedIn) {
      setNeedLogin(true);
      return;
    }
    start(async () => {
      const votes = Object.entries(assign).map(([characterId, tier]) => ({ characterId, tier }));
      const r = await saveVotes(topicId, votes);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      writeDraft(topicId, null);
      router.push(`/t/${slug}`);
      router.refresh();
    });
  }

  return (
    <div>
      {notice && <p className={styles.notice}>{notice}</p>}

      <div className={board.board}>
        {TIERS.map((t) => (
          <div key={t} className={`${board.row} ${selected ? styles.target : ""}`}>
            <button
              type="button"
              className={`display ${board.label} ${styles.labelButton}`}
              style={{ background: `var(--tier-${t})` }}
              onClick={() => selected && place(selected, t)}
              disabled={!selected}
              aria-label={`선택한 ${w.obj} ${t}티어에 놓기`}
            >
              {t}
            </button>
            <div className={board.tiles} {...dropProps(t)}>
              {items.filter((c) => assign[c.id] === t).map(tile)}
            </div>
          </div>
        ))}
      </div>

      <section className={styles.poolWrap}>
        <h2 className={styles.poolTitle}>
          아직 안 매긴 {w.noun}{" "}
          <span className="muted">
            ({pool.length}
            {w.unit})
          </span>
        </h2>
        <div className={`${board.tiles} ${styles.pool}`} {...dropProps(null)}>
          {pool.length > 0 ? pool.map(tile) : <p className="muted">모든 {w.noun}에 티어를 매겼어요.</p>}
        </div>
      </section>

      <div className={styles.bar}>
        <p>
          <b>{count}</b> / {items.length}
          {w.unit} 매김
        </p>
        <div className={styles.barActions}>
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setAssign({});
              setNotice(null);
            }}
            disabled={count === 0}
          >
            모두 되돌리기
          </button>
          <button
            type="button"
            className="btn btn-plain"
            onClick={() => router.push(`/t/${slug}/s/${encodeShare(assign, items.map((c) => c.id))}`)}
            disabled={count === 0}
          >
            공유용 링크 만들기
          </button>
          <button type="button" className="btn" onClick={submit} disabled={pending || count === 0}>
            {pending ? "반영하는 중" : "종합 티어에 반영하기"}
          </button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {needLogin && (
        <div className={`panel ${styles.login}`}>
          <p>
            지금 매긴 티어는 이 브라우저에 임시 저장해 뒀어요. 로그인하면 그대로 불러와서 종합 티어에 반영할 수
            있어요.
          </p>
          <Link className="btn" href={`/login?next=${encodeURIComponent(`/t/${slug}/rank`)}`}>
            로그인하고 반영하기
          </Link>
        </div>
      )}
    </div>
  );
}
