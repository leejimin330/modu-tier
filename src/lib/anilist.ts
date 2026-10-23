import "server-only";
import type { NewCharacter } from "./types";

// AniList GraphQL API. 비상업·월 매출 $150 미만 상업 이용은 무료, 대량 수집은 금지.
// 관리자가 주제를 만들 때 필요한 만큼만 조회한다.
const ENDPOINT = "https://graphql.anilist.co";

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { data?: T; errors?: { message: string }[] } | null;
  if (!res.ok || !json?.data) {
    const msg = json?.errors?.map((e) => e.message).join(", ") || `HTTP ${res.status}`;
    throw new Error(`AniList 요청 실패: ${msg}`);
  }
  return json.data;
}

export interface MediaHit {
  id: number;
  title: string;
  subtitle: string;
  cover: string;
  year: number | null;
  format: string | null;
}

interface Title {
  romaji: string | null;
  english: string | null;
  native: string | null;
}

const pickTitle = (t: Title) => t.native || t.romaji || t.english || "";

export async function searchMedia(search: string): Promise<MediaHit[]> {
  const data = await gql<{
    Page: {
      media: {
        id: number;
        title: Title;
        coverImage: { medium: string };
        seasonYear: number | null;
        format: string | null;
      }[];
    };
  }>(
    `query ($search: String) {
      Page(perPage: 12) {
        media(search: $search, sort: SEARCH_MATCH) {
          id title { romaji english native } coverImage { medium } seasonYear format
        }
      }
    }`,
    { search },
  );
  return data.Page.media.map((m) => ({
    id: m.id,
    title: pickTitle(m.title),
    subtitle: [m.title.english, m.title.romaji].filter((s) => s && s !== pickTitle(m.title)).join(" · "),
    cover: m.coverImage.medium,
    year: m.seasonYear,
    format: m.format,
  }));
}

export interface CharacterHit extends NewCharacter {
  role: string;
  /** 영문(로마자) 이름. 관리자가 한국어 이름을 정할 때 참고용 */
  altName: string;
}

/** 작품의 캐릭터 목록 (주연 먼저, 최대 page당 50명) */
export async function mediaCharacters(mediaId: number, page = 1): Promise<{ series: string; characters: CharacterHit[]; hasNext: boolean }> {
  const data = await gql<{
    Media: {
      title: Title;
      characters: {
        pageInfo: { hasNextPage: boolean };
        edges: {
          role: string;
          node: { id: number; name: { full: string | null; native: string | null }; image: { large: string | null }; siteUrl: string };
        }[];
      };
    };
  }>(
    `query ($id: Int, $page: Int) {
      Media(id: $id) {
        title { romaji english native }
        characters(page: $page, perPage: 50, sort: [ROLE, RELEVANCE, ID]) {
          pageInfo { hasNextPage }
          edges { role node { id name { full native } image { large } siteUrl } }
        }
      }
    }`,
    { id: mediaId, page },
  );
  const series = pickTitle(data.Media.title);
  const characters = data.Media.characters.edges
    .filter((e) => e.node.image.large && !e.node.image.large.endsWith("/default.jpg"))
    .map((e) => ({
      name: e.node.name.native || e.node.name.full || "",
      altName: e.node.name.full ?? "",
      role: e.role,
      series,
      image_url: e.node.image.large!,
      source: "anilist" as const,
      anilist_id: e.node.id,
      source_url: e.node.siteUrl,
    }));
  return { series, characters, hasNext: data.Media.characters.pageInfo.hasNextPage };
}
