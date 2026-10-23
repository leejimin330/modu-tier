"use client";

import { useRef, useState } from "react";
import type { AggregateEntry } from "@/lib/aggregate";
import { TIERS, type Tier } from "@/lib/tiers";
import type { Character } from "@/lib/types";
import { itemWords, type ItemWords } from "@/lib/words";
import { ReportForm } from "./ReportButton";
import { ItemThumb, hasLabelInside } from "./ItemThumb";
import board from "./tierboard.module.css";
import styles from "./ConsensusBoard.module.css";

export interface BoardEntry extends AggregateEntry {
  character: Character;
}

interface Props {
  topicId: string;
  entries: BoardEntry[];
  myVotes: Record<string, Tier>;
}

export function ConsensusBoard({ topicId, entries, myVotes }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<BoardEntry | null>(null);
  const unrated = entries.filter((e) => e.tier === null);
  const w = itemWords(entries.map((e) => e.character));

  function open(e: BoardEntry) {
    setSelected(e);
    dialogRef.current?.showModal();
  }

  const tile = (e: BoardEntry) => {
    const mine = myVotes[e.characterId];
    return (
      <button key={e.characterId} type="button" className={board.tile} onClick={() => open(e)}>
        <ItemThumb item={e.character} />
        {hasLabelInside(e.character) ? (
          <span className="sr-only">{e.character.name}</span>
        ) : (
          <span className={board.name}>{e.character.name}</span>
        )}
        {mine && (
          <span className={board.badge} style={{ background: `var(--tier-${mine})` }} title={`내가 매긴 티어 ${mine}`}>
            {mine}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      <div className={board.board}>
        {TIERS.map((t) => (
          <div key={t} className={board.row}>
            <div className={`display ${board.label}`} style={{ background: `var(--tier-${t})` }}>
              {t}
            </div>
            <div className={board.tiles}>{entries.filter((e) => e.tier === t).map(tile)}</div>
          </div>
        ))}
        {unrated.length > 0 && (
          <div className={board.row}>
            <div className={`${board.label} ${board.labelNone}`}>표 없음</div>
            <div className={board.tiles}>{unrated.map(tile)}</div>
          </div>
        )}
      </div>
      {Object.keys(myVotes).length > 0 && <p className={styles.hint}>오른쪽 위 작은 표시는 내가 매긴 티어예요.</p>}

      <dialog ref={dialogRef} className={`panel ${styles.dialog}`} onClose={() => setSelected(null)}>
        {selected && <Detail entry={selected} topicId={topicId} mine={myVotes[selected.characterId]} w={w} />}
        <form method="dialog">
          <button className={`btn btn-small btn-plain ${styles.close}`}>닫기</button>
        </form>
      </dialog>
    </>
  );
}

function Detail({ entry, topicId, mine, w }: { entry: BoardEntry; topicId: string; mine?: Tier; w: ItemWords }) {
  const { character: c } = entry;
  const max = Math.max(1, ...TIERS.map((t) => entry.distribution[t]));

  return (
    <div className={styles.detail}>
      <div className={styles.portrait}>
        <ItemThumb item={c} alt={c.name} />
        {entry.tier && (
          <span className={`display ${styles.bigTier}`} style={{ background: `var(--tier-${entry.tier})` }}>
            {entry.tier}
          </span>
        )}
      </div>
      <div className={styles.info}>
        <h2 className="display">{c.name}</h2>
        {c.series && <p className="muted">{c.series}</p>}

        {entry.votes > 0 ? (
          <p className={styles.score}>
            종합 점수 <b>{entry.score!.toFixed(2)}</b> (단순 평균 {entry.mean!.toFixed(2)}, {entry.votes}표)
          </p>
        ) : (
          <p className={styles.score}>아직 이 {w.noun}에 매긴 표가 없어요.</p>
        )}
        {mine && <p className={styles.score}>내가 매긴 티어는 {mine}예요.</p>}

        <ul className={styles.dist} aria-label="티어별 득표">
          {TIERS.map((t) => (
            <li key={t}>
              <span className={styles.distLabel}>{t}</span>
              <span className={styles.bar}>
                <span style={{ width: `${(entry.distribution[t] / max) * 100}%`, background: `var(--tier-${t})` }} />
              </span>
              <span className={styles.distCount}>{entry.distribution[t]}</span>
            </li>
          ))}
        </ul>

        <div className={styles.links}>
          {c.source_url && (
            <a href={c.source_url} target="_blank" rel="noopener noreferrer">
              출처: AniList
            </a>
          )}
          <ReportForm topicId={topicId} characterId={c.id} label={`${w.noun} 신고·삭제 요청`} />
        </div>
      </div>
    </div>
  );
}
