import { describe, expect, it } from "vitest";
import { parseVotes, isValidSlug } from "./validate";

describe("parseVotes", () => {
  const allowed = new Set(["a", "b"]);

  it("허용된 캐릭터와 티어만 통과시킨다", () => {
    expect(parseVotes([{ characterId: "a", tier: "S" }, { characterId: "b", tier: "D" }], allowed)).toEqual([
      { character_id: "a", tier: "S" },
      { character_id: "b", tier: "D" },
    ]);
  });

  it("주제에 없는 캐릭터, 잘못된 티어, 중복은 거부한다", () => {
    expect(parseVotes([{ characterId: "x", tier: "S" }], allowed)).toBeNull();
    expect(parseVotes([{ characterId: "a", tier: "Z" }], allowed)).toBeNull();
    expect(parseVotes([{ characterId: "a", tier: "S" }, { characterId: "a", tier: "A" }], allowed)).toBeNull();
    expect(parseVotes("nope", allowed)).toBeNull();
  });

  it("빈 목록은 거부한다", () => {
    expect(parseVotes([], allowed)).toBeNull();
  });
});

describe("isValidSlug", () => {
  it("영문 소문자·숫자·하이픈 2~60자", () => {
    expect(isValidSlug("jjk-power")).toBe(true);
    expect(isValidSlug("a")).toBe(false);
    expect(isValidSlug("Bad Slug")).toBe(false);
    expect(isValidSlug("-start")).toBe(false);
  });
});
