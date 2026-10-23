// 기본 주제를 넣는다. 이미 있는 주제는 제목·설명·분류를 맞추고 빠진 캐릭터만 채운다 (여러 번 돌려도 안전).
// 주제 목록은 seed-data.ts. 실행: npm run seed  (.env.local에 Supabase 키가 있으면 운영 DB, 없으면 .data/dev-db.json)

import { CUSTOM_TOPICS } from "./seed-custom";
import { TOPICS } from "./seed-data";
import { CROSSOVER_TOPICS } from "./seed-crossover";
import { MEDIA_TOPICS } from "./seed-media";

interface AnilistChar {
  id: number;
  image: { large: string | null };
  siteUrl: string;
}

async function fetchCharacters(ids: number[], attempt = 1): Promise<Map<number, AnilistChar>> {
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      query: `query ($ids: [Int]) { Page(perPage: 50) { characters(id_in: $ids) { id image { large } siteUrl } } }`,
      variables: { ids },
    }),
  });
  if (res.status === 429 && attempt <= 5) {
    // 분당 호출 제한. 알려준 시간만큼 (없으면 1분) 쉬었다가 다시 시도한다
    const wait = Number(res.headers.get("retry-after") ?? 60) + 1;
    console.log(`  AniList 호출 제한, ${wait}초 기다림`);
    await new Promise((r) => setTimeout(r, wait * 1000));
    return fetchCharacters(ids, attempt + 1);
  }
  const json = (await res.json()) as { data?: { Page: { characters: AnilistChar[] } }; errors?: unknown };
  if (!json.data) throw new Error(`AniList 요청 실패: ${JSON.stringify(json.errors)}`);
  return new Map(json.data.Page.characters.map((c) => [c.id, c]));
}

interface AnilistMedia {
  id: number;
  coverImage: { large: string | null };
  siteUrl: string;
}

async function fetchMedia(ids: number[], attempt = 1): Promise<Map<number, AnilistMedia>> {
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      query: `query ($ids: [Int]) { Page(perPage: 50) { media(id_in: $ids) { id coverImage { large } siteUrl } } }`,
      variables: { ids },
    }),
  });
  if (res.status === 429 && attempt <= 5) {
    const wait = Number(res.headers.get("retry-after") ?? 60) + 1;
    console.log(`  AniList 호출 제한, ${wait}초 기다림`);
    await new Promise((r) => setTimeout(r, wait * 1000));
    return fetchMedia(ids, attempt + 1);
  }
  const json = (await res.json()) as { data?: { Page: { media: AnilistMedia[] } }; errors?: unknown };
  if (!json.data) throw new Error(`AniList 요청 실패: ${JSON.stringify(json.errors)}`);
  return new Map(json.data.Page.media.map((m) => [m.id, m]));
}

async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // 없으면 로컬 개발 모드
  }
  // 환경변수를 읽은 뒤에 불러와야 저장소 종류가 제대로 정해진다
  const { store } = await import("../src/lib/store/index");
  const { isSupabaseEnabled } = await import("../src/lib/config");
  console.log(`저장소: ${isSupabaseEnabled ? "Supabase" : "로컬 파일 (.data/dev-db.json)"}`);

  type Store = typeof store;
  async function upsertTopic(t: { slug: string; title: string; description: string; category: string }) {
    const meta = { title: t.title, description: t.description, category: t.category };
    const created = await store.createTopic({ slug: t.slug, ...meta, created_by: null });
    if (created) return created;
    const topic = await store.getTopicBySlug(t.slug);
    if (!topic) throw new Error(`주제를 만들 수 없음: ${t.slug}`);
    await store.updateTopic(topic.id, meta);
    return topic;
  }
  const existing = (s: Store, topicId: string) => s.listItems(topicId);

  for (const t of [...TOPICS, ...CROSSOVER_TOPICS]) {
    const topic = await upsertTopic(t);
    const have = new Set((await existing(store, topic.id)).map((c) => c.anilist_id));
    const todo = t.characters.filter(([id]) => !have.has(id));
    if (todo.length === 0) continue; // 이미 다 있으면 AniList를 부르지 않는다

    const found = await fetchCharacters(todo.map(([id]) => id));
    const missing = todo.filter(([id]) => !found.get(id)?.image.large);
    if (missing.length) console.warn(`  ${t.slug}: AniList에 없거나 이미지 없음 ${missing.map(([, n]) => n).join(", ")}`);

    const added = await store.addItems(
      topic.id,
      todo
        .filter(([id]) => found.get(id)?.image.large)
        .map(([id, name, series]) => {
          const c = found.get(id)!;
          return {
            name,
            series: series ?? t.series,
            image_url: c.image.large!,
            source: "anilist" as const,
            anilist_id: id,
            source_url: c.siteUrl,
          };
        }),
    );
    console.log(`${t.title}: 캐릭터 ${added}명 추가`);
    await new Promise((r) => setTimeout(r, 2000)); // AniList 호출 간격
  }

  // 작품 주제는 표지 이미지를 쓴다. 이름이 같은 항목이 이미 있으면 건너뛴다
  for (const t of MEDIA_TOPICS) {
    const topic = await upsertTopic(t);
    const have = new Set((await existing(store, topic.id)).map((c) => c.name));
    const todo = t.works.filter(([, name]) => !have.has(name));
    if (todo.length === 0) continue;

    const found = await fetchMedia(todo.map(([id]) => id));
    const missing = todo.filter(([id]) => !found.get(id)?.coverImage.large);
    if (missing.length) console.warn(`  ${t.slug}: AniList에 없거나 표지 없음 ${missing.map(([, n]) => n).join(", ")}`);

    const added = await store.addItems(
      topic.id,
      todo
        .filter(([id]) => found.get(id)?.coverImage.large)
        .map(([id, name]) => {
          const m = found.get(id)!;
          return {
            name,
            series: "",
            image_url: m.coverImage.large!,
            source: "anilist" as const,
            anilist_id: null, // 작품 id라서 캐릭터 id 칸에 넣지 않는다
            source_url: m.siteUrl,
          };
        }),
    );
    console.log(`${t.title}: 작품 ${added}개 추가`);
    await new Promise((r) => setTimeout(r, 2000));
  }

  // 이미지 없는 주제는 이름이 같은 항목이 이미 있으면 건너뛴다
  for (const t of CUSTOM_TOPICS) {
    const topic = await upsertTopic(t);
    const have = new Set((await existing(store, topic.id)).map((c) => c.name));
    const added = await store.addItems(
      topic.id,
      t.items
        .filter(([name]) => !have.has(name))
        .map(([name, emoji]) => ({
          name,
          series: "",
          image_url: "",
          emoji: emoji ?? null,
          source: "text" as const,
          anilist_id: null,
          source_url: null,
        })),
    );
    if (added) console.log(`${t.title}: 항목 ${added}개 추가`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
