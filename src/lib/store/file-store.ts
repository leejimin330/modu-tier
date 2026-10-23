import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { VoteCount } from "../aggregate";
import type { Tier } from "../tiers";
import type { Character, Report, Store, Topic } from "../types";

// 로컬 개발용 JSON 파일 DB. 단일 프로세스 전제이며 운영에는 Supabase를 쓴다.

interface DbShape {
  users: Record<string, { id: string; provider: string; label: string; created_at: string }>;
  topics: Topic[];
  characters: Character[];
  topic_items: { topic_id: string; character_id: string; added_at: string }[];
  votes: { topic_id: string; user_id: string; character_id: string; tier: Tier; updated_at: string }[];
  reports: Report[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "dev-db.json");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

// 모듈이 여러 번 로드돼도 잠금은 하나만 쓰도록 globalThis에 둔다.
const g = globalThis as unknown as { __devDbLock?: Promise<unknown> };

async function load(): Promise<DbShape> {
  try {
    return JSON.parse(await fs.readFile(DB_PATH, "utf8"));
  } catch {
    return { users: {}, topics: [], characters: [], topic_items: [], votes: [], reports: [] };
  }
}

async function save(db: DbShape) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 1));
  await fs.rename(tmp, DB_PATH);
}

/** 읽기-수정-쓰기를 직렬화해 트랜잭션처럼 동작시킨다. */
function tx<T>(fn: (db: DbShape) => T | Promise<T>, write = true): Promise<T> {
  const run = (g.__devDbLock ?? Promise.resolve()).then(async () => {
    const db = await load();
    const result = await fn(db);
    if (write) await save(db);
    return result;
  });
  g.__devDbLock = run.catch(() => {});
  return run;
}

const read = <T>(fn: (db: DbShape) => T) => tx(fn, false);

function itemsOf(db: DbShape, topicId: string): Character[] {
  const byId = new Map(db.characters.map((c) => [c.id, c]));
  return db.topic_items
    .filter((i) => i.topic_id === topicId)
    .sort((a, b) => a.added_at.localeCompare(b.added_at))
    .map((i) => byId.get(i.character_id)!)
    .filter(Boolean);
}

const participants = (db: DbShape, topicId: string) =>
  new Set(db.votes.filter((v) => v.topic_id === topicId).map((v) => v.user_id)).size;

export const fileStore: Store = {
  ensureUser: (id, provider, label) =>
    tx((db) => {
      db.users[id] ??= { id, provider, label, created_at: new Date().toISOString() };
    }),

  listTopics: ({ includeHidden }) =>
    read((db) =>
      db.topics
        .filter((t) => includeHidden || t.status === "active")
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((t) => {
          const items = itemsOf(db, t.id);
          return {
            ...t,
            participants: participants(db, t.id),
            item_count: items.length,
            preview: items.slice(0, 4).map(({ name, image_url, emoji }) => ({ name, image_url, emoji })),
          };
        }),
    ),

  getTopic: (id) => read((db) => db.topics.find((t) => t.id === id) ?? null),
  getTopicBySlug: (slug) => read((db) => db.topics.find((t) => t.slug === slug) ?? null),

  createTopic: (t) =>
    tx((db) => {
      if (db.topics.some((x) => x.slug === t.slug)) return null;
      const topic: Topic = { ...t, id: randomUUID(), status: "active", created_at: new Date().toISOString() };
      db.topics.push(topic);
      return topic;
    }),

  setTopicStatus: (id, status) =>
    tx((db) => {
      const t = db.topics.find((x) => x.id === id);
      if (t) t.status = status;
    }),

  updateTopic: (id, fields) =>
    tx((db) => {
      const t = db.topics.find((x) => x.id === id);
      if (t) Object.assign(t, fields);
    }),

  listItems: (topicId) => read((db) => itemsOf(db, topicId)),

  addItems: (topicId, chars) =>
    tx((db) => {
      let added = 0;
      for (const c of chars) {
        let ch = c.anilist_id !== null ? db.characters.find((x) => x.anilist_id === c.anilist_id) : undefined;
        if (!ch) {
          ch = { ...c, id: randomUUID() };
          db.characters.push(ch);
        }
        if (db.topic_items.some((i) => i.topic_id === topicId && i.character_id === ch.id)) continue;
        db.topic_items.push({ topic_id: topicId, character_id: ch.id, added_at: new Date(Date.now() + added).toISOString() });
        added += 1;
      }
      return added;
    }),

  removeItem: (topicId, characterId) =>
    tx((db) => {
      db.topic_items = db.topic_items.filter((i) => !(i.topic_id === topicId && i.character_id === characterId));
      db.votes = db.votes.filter((v) => !(v.topic_id === topicId && v.character_id === characterId));
    }),

  renameCharacter: (characterId, name) =>
    tx((db) => {
      const c = db.characters.find((x) => x.id === characterId);
      if (c) c.name = name;
    }),

  getUserVotes: (topicId, userId) =>
    read((db) =>
      Object.fromEntries(
        db.votes.filter((v) => v.topic_id === topicId && v.user_id === userId).map((v) => [v.character_id, v.tier]),
      ),
    ),

  replaceVotes: (topicId, userId, votes) =>
    tx((db) => {
      db.votes = db.votes.filter((v) => !(v.topic_id === topicId && v.user_id === userId));
      const now = new Date().toISOString();
      for (const v of votes) db.votes.push({ topic_id: topicId, user_id: userId, ...v, updated_at: now });
    }),

  voteCounts: (topicId) =>
    read((db) => {
      const map = new Map<string, VoteCount>();
      for (const v of db.votes) {
        if (v.topic_id !== topicId) continue;
        const key = `${v.character_id}:${v.tier}`;
        const c = map.get(key);
        if (c) c.count += 1;
        else map.set(key, { character_id: v.character_id, tier: v.tier, count: 1 });
      }
      return [...map.values()];
    }),

  participantCount: (topicId) => read((db) => participants(db, topicId)),

  createReport: (r) =>
    tx((db) => {
      db.reports.push({ ...r, id: randomUUID(), status: "open", created_at: new Date().toISOString() });
    }),

  listReports: (status) =>
    read((db) =>
      db.reports
        .filter((r) => r.status === status)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((r) => {
          const t = db.topics.find((x) => x.id === r.topic_id);
          const c = r.character_id ? db.characters.find((x) => x.id === r.character_id) : undefined;
          return { ...r, topic_title: t?.title ?? "(삭제된 주제)", topic_slug: t?.slug ?? "", character_name: c?.name ?? null };
        }),
    ),

  getReport: (id) => read((db) => db.reports.find((r) => r.id === id) ?? null),

  setReportStatus: (id, status) =>
    tx((db) => {
      const r = db.reports.find((x) => x.id === id);
      if (r) r.status = status;
    }),

  async saveImage(data, ext) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const name = `${randomUUID()}.${ext}`;
    await fs.writeFile(path.join(UPLOAD_DIR, name), data);
    return `/uploads/${name}`;
  },
};
