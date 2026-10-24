/** 노래 항목의 source_url(유튜브 주소)에서 영상 id를 꺼낸다. 유튜브가 아니면 null */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

/** 출처 링크에 붙일 이름 */
export function sourceLabel(url: string) {
  if (youtubeId(url)) return "YouTube에서 보기";
  if (url.includes("anilist.co")) return "출처: AniList";
  return "출처";
}
