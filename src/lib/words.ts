import type { Thumb } from "./types";

/** 애니 주제는 "캐릭터 N명", 음식·아이돌처럼 이미지 없는 주제는 "항목 N개"로 부른다 */
export function itemWords(items: Thumb[]) {
  const plain = items.length > 0 && items.every((c) => !c.image_url);
  return plain
    ? { noun: "항목", unit: "개", obj: "항목을", topic: "항목은", unitSubj: "개가" }
    : { noun: "캐릭터", unit: "명", obj: "캐릭터를", topic: "캐릭터는", unitSubj: "명이" };
}

export type ItemWords = ReturnType<typeof itemWords>;
