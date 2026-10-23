import "server-only";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { VoteCount } from "../aggregate";
import { SUPABASE_URL } from "../config";
import type { Tier } from "../tiers";
import type { Character, Report, ReportView, Store, Topic, TopicSummary } from "../types";

let admin: SupabaseClient | null = null;

/** secret key 클라이언트. RLS를 우회하므로 서버에서만 쓴다. */
function db() {
  if (!admin) {
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!key) throw new Error("SUPABASE_SECRET_KEY is not set");
    admin = createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return admin;
}

/** 에러면 던지고, 아니면 data를 돌려준다 */
function ok<T>({ data, error }: { data: T; error: unknown }): T {
  if (error) throw error;
  return data;
}

export const supabaseStore: Store = {
  async ensureUser(id, provider, label) {
    ok(await db().from("users").upsert({ id, provider, label }, { onConflict: "id", ignoreDuplicates: true }));
  },

  async listTopics({ includeHidden }) {
    let q = db().from("topic_summaries").select("*").order("created_at", { ascending: false });
    if (!includeHidden) q = q.eq("status", "active");
    return ok(await q) as TopicSummary[];
  },

  async getTopic(id) {
    return ok(await db().from("topics").select("*").eq("id", id).maybeSingle()) as Topic | null;
  },

  async getTopicBySlug(slug) {
    return ok(await db().from("topics").select("*").eq("slug", slug).maybeSingle()) as Topic | null;
  },

  async createTopic(t) {
    const { data, error } = await db().from("topics").insert(t).select("*").single();
    if (error?.code === "23505") return null; // slug 중복
    if (error) throw error;
    return data as Topic;
  },

  async setTopicStatus(id, status) {
    ok(await db().from("topics").update({ status }).eq("id", id));
  },

  async updateTopic(id, fields) {
    ok(await db().from("topics").update(fields).eq("id", id));
  },

  async listItems(topicId) {
    const rows = ok(
      await db()
        .from("topic_items")
        .select("added_at, characters(*)")
        .eq("topic_id", topicId)
        .order("added_at", { ascending: true }),
    ) as unknown as { characters: Character }[];
    return rows.map((r) => r.characters);
  },

  async addItems(topicId, chars) {
    return ok(await db().rpc("add_topic_items", { p_topic_id: topicId, p_chars: chars })) as number;
  },

  async removeItem(topicId, characterId) {
    ok(await db().from("topic_items").delete().eq("topic_id", topicId).eq("character_id", characterId));
  },

  async renameCharacter(characterId, name) {
    ok(await db().from("characters").update({ name }).eq("id", characterId));
  },

  async getUserVotes(topicId, userId) {
    const rows = ok(
      await db().from("votes").select("character_id, tier").eq("topic_id", topicId).eq("user_id", userId),
    ) as { character_id: string; tier: Tier }[];
    return Object.fromEntries(rows.map((r) => [r.character_id, r.tier]));
  },

  async replaceVotes(topicId, userId, votes) {
    ok(await db().rpc("replace_votes", { p_topic_id: topicId, p_user_id: userId, p_votes: votes }));
  },

  async voteCounts(topicId) {
    return ok(await db().rpc("topic_vote_counts", { p_topic_id: topicId })) as VoteCount[];
  },

  async participantCount(topicId) {
    const row = ok(
      await db().from("topic_summaries").select("participants").eq("id", topicId).maybeSingle(),
    ) as { participants: number } | null;
    return row?.participants ?? 0;
  },

  async createReport(r) {
    ok(await db().from("reports").insert(r));
  },

  async listReports(status) {
    const rows = ok(
      await db()
        .from("reports")
        .select("*, topics(title, slug), characters(name)")
        .eq("status", status)
        .order("created_at", { ascending: false }),
    ) as unknown as (Report & { topics: { title: string; slug: string } | null; characters: { name: string } | null })[];
    return rows.map(({ topics, characters, ...r }): ReportView => ({
      ...r,
      topic_title: topics?.title ?? "(삭제된 주제)",
      topic_slug: topics?.slug ?? "",
      character_name: characters?.name ?? null,
    }));
  },

  async getReport(id) {
    return ok(await db().from("reports").select("*").eq("id", id).maybeSingle()) as Report | null;
  },

  async setReportStatus(id, status) {
    ok(await db().from("reports").update({ status }).eq("id", id));
  },

  async saveImage(data, ext) {
    const name = `${randomUUID()}.${ext}`;
    ok(await db().storage.from("uploads").upload(name, data, { contentType: `image/${ext === "jpg" ? "jpeg" : ext}` }));
    return db().storage.from("uploads").getPublicUrl(name).data.publicUrl;
  },
};
