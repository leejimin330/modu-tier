import { TIERS, type Tier } from "./tiers";

// 공유 링크에 담는 "내 티어". 서버에 저장하지 않아서 비로그인도 공유할 수 있다.
// 형식: S-A-B-C-D 순서로 티어별 묶음을 "-"로 잇고, 묶음 안에는 캐릭터 id 앞 8자리를 이어 붙인다.
const ID_LEN = 8;
const MAX_LEN = 4000;

export function encodeShare(votes: Record<string, Tier>, itemIds: string[]): string {
  return TIERS.map((t) =>
    itemIds
      .filter((id) => votes[id] === t)
      .map((id) => id.slice(0, ID_LEN))
      .join(""),
  )
    .join("-")
    .replace(/-+$/, "");
}

export function decodeShare(code: string, itemIds: string[]): Record<string, Tier> | null {
  if (code.length > MAX_LEN || !/^[0-9a-f-]+$/.test(code)) return null;
  const groups = code.split("-");
  if (groups.length > TIERS.length) return null;

  const byPrefix = new Map<string, string>();
  for (const id of itemIds) {
    const p = id.slice(0, ID_LEN);
    if (!byPrefix.has(p)) byPrefix.set(p, id);
  }

  const votes: Record<string, Tier> = {};
  for (const [i, group] of groups.entries()) {
    if (group.length % ID_LEN !== 0) return null;
    for (let j = 0; j < group.length; j += ID_LEN) {
      const id = byPrefix.get(group.slice(j, j + ID_LEN));
      if (id && !votes[id]) votes[id] = TIERS[i];
    }
  }
  return Object.keys(votes).length > 0 ? votes : null;
}
