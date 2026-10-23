"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mediaCharacters, searchMedia, type CharacterHit, type MediaHit } from "@/lib/anilist";
import { requireAdmin, requireUser } from "@/lib/auth";
import { isUuid, store } from "@/lib/store";
import { isValidSlug, text } from "@/lib/validate";

// 모든 함수가 관리자 권한을 먼저 확인한다 (Server Action은 직접 POST로도 호출될 수 있다).

function refresh(slug?: string) {
  revalidatePath("/");
  revalidatePath("/admin", "layout");
  if (slug) revalidatePath(`/t/${slug}`, "layout");
}

export async function createTopic(_prev: string | null, formData: FormData): Promise<string | null> {
  const admin = await requireAdmin();
  const slug = text(formData.get("slug"), 60).toLowerCase();
  const title = text(formData.get("title"), 100);
  if (!isValidSlug(slug)) return "주소는 영문 소문자·숫자·하이픈 2~60자로 적어 주세요.";
  if (!title) return "제목을 적어 주세요.";

  await requireUser();
  const topic = await store.createTopic({
    slug,
    title,
    description: text(formData.get("description"), 500),
    category: text(formData.get("category"), 30),
    created_by: admin.id,
  });
  if (!topic) return "이미 있는 주소예요.";
  refresh();
  redirect(`/admin/topics/${topic.id}`);
}

export async function setTopicStatus(formData: FormData) {
  await requireAdmin();
  const id = formData.get("topicId");
  const status = formData.get("status");
  if (!isUuid(id) || (status !== "active" && status !== "hidden")) return;
  const topic = await store.getTopic(id);
  await store.setTopicStatus(id, status);
  refresh(topic?.slug);
}

export async function anilistSearch(query: string): Promise<{ hits: MediaHit[] } | { error: string }> {
  await requireAdmin();
  const q = query.trim().slice(0, 100);
  if (!q) return { hits: [] };
  try {
    return { hits: await searchMedia(q) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function anilistCharacters(
  mediaId: number,
  page: number,
): Promise<{ characters: CharacterHit[]; hasNext: boolean } | { error: string }> {
  await requireAdmin();
  if (!Number.isInteger(mediaId) || !Number.isInteger(page) || page < 1 || page > 20) return { error: "잘못된 요청" };
  try {
    return await mediaCharacters(mediaId, page);
  } catch (e) {
    return { error: (e as Error).message };
  }
}

const ANILIST_IMG = /^https:\/\/s4\.anilist\.co\/file\/anilistcdn\/character\//;

/** AniList에서 고른 캐릭터를 주제에 추가한다. 이름은 관리자가 고친 값을 쓴다. */
export async function addAnilistCharacters(
  topicId: string,
  picks: { anilist_id: number; name: string; series: string; image_url: string; source_url: string }[],
): Promise<{ added: number } | { error: string }> {
  await requireAdmin();
  if (!isUuid(topicId) || !Array.isArray(picks) || picks.length === 0 || picks.length > 200) return { error: "잘못된 요청" };
  const chars = [];
  for (const p of picks) {
    const name = typeof p.name === "string" ? p.name.trim().slice(0, 60) : "";
    if (!Number.isInteger(p.anilist_id) || !name || typeof p.image_url !== "string" || !ANILIST_IMG.test(p.image_url)) {
      return { error: "잘못된 캐릭터 데이터" };
    }
    chars.push({
      name,
      series: String(p.series ?? "").slice(0, 100),
      image_url: p.image_url,
      source: "anilist" as const,
      anilist_id: p.anilist_id,
      source_url: `https://anilist.co/character/${p.anilist_id}`,
    });
  }
  const topic = await store.getTopic(topicId);
  if (!topic) return { error: "없는 주제" };
  const added = await store.addItems(topicId, chars);
  refresh(topic.slug);
  return { added };
}

const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
const MAX_UPLOAD = 2 * 1024 * 1024;

/** 직접 업로드한 이미지로 캐릭터 추가 */
export async function addUploadedCharacter(_prev: string | null, formData: FormData): Promise<string | null> {
  await requireAdmin();
  const topicId = formData.get("topicId");
  const name = text(formData.get("name"), 60);
  const file = formData.get("image");
  if (!isUuid(topicId)) return "잘못된 주제";
  if (!name) return "이름을 적어 주세요.";
  if (!(file instanceof File) || file.size === 0) return "이미지를 골라 주세요.";
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return "PNG, JPG, WEBP, GIF만 올릴 수 있어요.";
  if (file.size > MAX_UPLOAD) return "이미지는 2MB 이하로 올려 주세요.";

  const topic = await store.getTopic(topicId);
  if (!topic) return "없는 주제";
  const url = await store.saveImage(Buffer.from(await file.arrayBuffer()), ext);
  await store.addItems(topicId, [
    { name, series: text(formData.get("series"), 100), image_url: url, source: "upload", anilist_id: null, source_url: null },
  ]);
  refresh(topic.slug);
  return null;
}

/** 이미지 없는 항목을 여러 개 추가한다. 한 줄에 하나, "이름" 또는 "이름 | 이모지" */
export async function addTextItems(_prev: string | null, formData: FormData): Promise<string | null> {
  await requireAdmin();
  const topicId = formData.get("topicId");
  if (!isUuid(topicId)) return "잘못된 주제";
  const lines = text(formData.get("lines"), 5000)
    .split(/\r?\n/)
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter(([name]) => name);
  if (lines.length === 0) return "항목을 한 줄에 하나씩 적어 주세요.";
  if (lines.length > 100) return "한 번에 100개까지 넣을 수 있어요.";

  const topic = await store.getTopic(topicId);
  if (!topic) return "없는 주제";
  const have = new Set((await store.listItems(topicId)).map((c) => c.name));
  await store.addItems(
    topicId,
    lines
      .filter(([name]) => !have.has(name.slice(0, 60)))
      .map(([name, emoji]) => ({
        name: name.slice(0, 60),
        series: "",
        image_url: "",
        emoji: emoji ? [...emoji].slice(0, 8).join("") : null,
        source: "text" as const,
        anilist_id: null,
        source_url: null,
      })),
  );
  refresh(topic.slug);
  return null;
}

export async function removeItem(formData: FormData) {
  await requireAdmin();
  const topicId = formData.get("topicId");
  const characterId = formData.get("characterId");
  if (!isUuid(topicId) || !isUuid(characterId)) return;
  const topic = await store.getTopic(topicId);
  await store.removeItem(topicId, characterId);
  refresh(topic?.slug);
}

export async function renameCharacter(formData: FormData) {
  await requireAdmin();
  const topicId = formData.get("topicId");
  const characterId = formData.get("characterId");
  const name = text(formData.get("name"), 60);
  if (!isUuid(topicId) || !isUuid(characterId) || !name) return;
  // 이 주제에 속한 캐릭터만 고칠 수 있다 (이름은 같은 캐릭터를 쓰는 모든 주제에 반영된다)
  if (!(await store.listItems(topicId)).some((c) => c.id === characterId)) return;
  await store.renameCharacter(characterId, name);
  const topic = await store.getTopic(topicId);
  refresh(topic?.slug);
}

/** 신고 처리: delete = 주제 숨김 또는 캐릭터 제거, dismiss = 기각 */
export async function resolveReport(formData: FormData) {
  await requireAdmin();
  const id = formData.get("reportId");
  const action = formData.get("action");
  if (!isUuid(id) || (action !== "delete" && action !== "dismiss")) return;
  const report = await store.getReport(id);
  if (!report || report.status !== "open") return;

  const topic = await store.getTopic(report.topic_id);
  if (action === "delete") {
    if (report.target_type === "topic") await store.setTopicStatus(report.topic_id, "hidden");
    else if (report.character_id) await store.removeItem(report.topic_id, report.character_id);
  }
  await store.setReportStatus(id, action === "delete" ? "resolved" : "dismissed");
  refresh(topic?.slug);
}
