"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { isUuid, store } from "@/lib/store";
import { parseVotes, text } from "@/lib/validate";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** 내 티어 제출. 로그인 사용자만 종합 티어에 반영된다. */
export async function saveVotes(topicId: string, votes: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인하면 종합 티어에 반영돼요." };
  if (!isUuid(topicId)) return { ok: false, error: "잘못된 주제예요." };

  const topic = await store.getTopic(topicId);
  if (!topic || topic.status !== "active") return { ok: false, error: "없는 주제예요." };

  const items = await store.listItems(topicId);
  const parsed = parseVotes(votes, new Set(items.map((c) => c.id)));
  if (!parsed) return { ok: false, error: "티어를 한 명 이상 배정해 주세요." };

  await requireUser();
  await store.replaceVotes(topicId, user.id, parsed);
  revalidatePath(`/t/${topic.slug}`);
  revalidatePath("/");
  return { ok: true };
}

/** 주제나 캐릭터 신고 (권리자 삭제 요청 포함). 비로그인도 가능. */
export async function submitReport(formData: FormData): Promise<ActionResult> {
  const topicId = formData.get("topicId");
  const characterId = formData.get("characterId") || null;
  const reason = text(formData.get("reason"), 1000);
  if (!isUuid(topicId) || (characterId !== null && !isUuid(characterId))) return { ok: false, error: "잘못된 요청이에요." };
  if (reason.length < 2) return { ok: false, error: "신고 사유를 적어 주세요." };

  const topic = await store.getTopic(topicId);
  if (!topic) return { ok: false, error: "없는 주제예요." };
  if (characterId && !(await store.listItems(topicId)).some((c) => c.id === characterId)) {
    return { ok: false, error: "없는 캐릭터예요." };
  }

  const user = await getCurrentUser();
  if (user) await store.ensureUser(user.id, user.provider, user.label);
  await store.createReport({
    target_type: characterId ? "item" : "topic",
    topic_id: topicId,
    character_id: characterId,
    reason,
    user_id: user?.id ?? null,
  });
  return { ok: true };
}
