import { isTier, type Tier } from "./tiers";

export const isValidSlug = (s: unknown): s is string =>
  typeof s === "string" && /^[a-z0-9][a-z0-9-]{1,59}$/.test(s);

export interface VoteInput {
  character_id: string;
  tier: Tier;
}

/** 클라이언트가 보낸 티어 배정을 검증한다. 하나라도 이상하면 전체를 거부한다. */
export function parseVotes(raw: unknown, allowed: Set<string>): VoteInput[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > allowed.size) return null;
  const seen = new Set<string>();
  const out: VoteInput[] = [];
  for (const v of raw) {
    if (!v || typeof v !== "object") return null;
    const { characterId, tier } = v as { characterId?: unknown; tier?: unknown };
    if (typeof characterId !== "string" || !allowed.has(characterId) || seen.has(characterId) || !isTier(tier)) {
      return null;
    }
    seen.add(characterId);
    out.push({ character_id: characterId, tier });
  }
  return out;
}

/** 폼 문자열 정리: 앞뒤 공백 제거, 길이 제한 */
export function text(value: FormDataEntryValue | null, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
