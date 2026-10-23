"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CharacterHit, MediaHit } from "@/lib/anilist";
import { addAnilistCharacters, anilistCharacters, anilistSearch } from "../../actions";
import styles from "./importer.module.css";

interface Pick {
  hit: CharacterHit;
  name: string;
  checked: boolean;
}

export function AnilistImporter({ topicId, existing }: { topicId: string; existing: number[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [media, setMedia] = useState<MediaHit[] | null>(null);
  const [current, setCurrent] = useState<{ media: MediaHit; page: number; hasNext: boolean } | null>(null);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const have = new Set(existing);

  const search = () =>
    start(async () => {
      setMessage(null);
      setCurrent(null);
      const r = await anilistSearch(query);
      if ("error" in r) setMessage(r.error);
      else setMedia(r.hits);
    });

  const load = (m: MediaHit, page: number) =>
    start(async () => {
      setMessage(null);
      const r = await anilistCharacters(m.id, page);
      if ("error" in r) {
        setMessage(r.error);
        return;
      }
      setCurrent({ media: m, page, hasNext: r.hasNext });
      const fresh = r.characters.map((hit) => ({ hit, name: hit.name, checked: hit.role === "MAIN" && !have.has(hit.anilist_id!) }));
      setPicks((prev) => (page === 1 ? fresh : [...prev, ...fresh]));
    });

  const add = () =>
    start(async () => {
      const chosen = picks.filter((p) => p.checked && !have.has(p.hit.anilist_id!));
      const r = await addAnilistCharacters(
        topicId,
        chosen.map((p) => ({
          anilist_id: p.hit.anilist_id!,
          name: p.name,
          series: p.hit.series,
          image_url: p.hit.image_url,
          source_url: p.hit.source_url!,
        })),
      );
      if ("error" in r) {
        setMessage(r.error);
        return;
      }
      setMessage(`${r.added}명을 추가했어요.`);
      setPicks((prev) => prev.map((p) => ({ ...p, checked: false })));
      router.refresh();
    });

  const update = (i: number, patch: Partial<Pick>) => setPicks((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const chosenCount = picks.filter((p) => p.checked && !have.has(p.hit.anilist_id!)).length;

  return (
    <div className={styles.wrap}>
      <form
        className={styles.search}
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <label className="field">
          작품 검색 (영어나 일본어로)
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="jujutsu kaisen" />
        </label>
        <button className="btn btn-plain" disabled={pending || !query.trim()}>
          검색
        </button>
      </form>
      {message && <p className={styles.message}>{message}</p>}

      {media && !current && (
        <ul className={styles.media}>
          {media.length === 0 && <li className="muted">검색 결과가 없어요. 영어나 일본어 제목으로 찾아보세요.</li>}
          {media.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => load(m, 1)} disabled={pending}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.cover} alt="" />
                <span>
                  <b>{m.title}</b>
                  <small className="muted">
                    {m.subtitle} {m.format ?? ""} {m.year ?? ""}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {current && (
        <>
          <div className={styles.head}>
            <p>
              <b>{current.media.title}</b> 캐릭터 {picks.length}명. 주연은 미리 골라 뒀어요. 이름은 한국어로 고쳐서
              추가하세요.
            </p>
            <button type="button" className="link-button" onClick={() => setCurrent(null)}>
              다른 작품 고르기
            </button>
          </div>
          <ul className={styles.picks}>
            {picks.map((p, i) => {
              const added = have.has(p.hit.anilist_id!);
              return (
                <li key={p.hit.anilist_id} className={added ? styles.added : undefined}>
                  <label>
                    <input
                      type="checkbox"
                      checked={added || p.checked}
                      disabled={added}
                      onChange={(e) => update(i, { checked: e.target.checked })}
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.hit.image_url} alt="" loading="lazy" />
                  </label>
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => update(i, { name: e.target.value, checked: true })}
                    aria-label={`${p.hit.altName} 표시 이름`}
                    disabled={added}
                  />
                  <small className="muted">
                    {p.hit.altName} {p.hit.role === "MAIN" ? "주연" : ""}
                    {added ? " 추가됨" : ""}
                  </small>
                </li>
              );
            })}
          </ul>
          <div className={styles.footer}>
            {current.hasNext && (
              <button type="button" className="btn btn-small btn-plain" onClick={() => load(current.media, current.page + 1)} disabled={pending}>
                캐릭터 더 불러오기
              </button>
            )}
            <button type="button" className="btn" onClick={add} disabled={pending || chosenCount === 0}>
              고른 {chosenCount}명 추가
            </button>
          </div>
        </>
      )}
    </div>
  );
}
