import { describe, expect, it } from "vitest";
import { aggregate, PRIOR_WEIGHT } from "./aggregate";

describe("aggregate", () => {
  it("표가 없으면 모든 캐릭터가 미평가이고 전체 평균은 3", () => {
    const r = aggregate(["a", "b"], []);
    expect(r.globalMean).toBe(3);
    expect(r.entries.map((e) => [e.characterId, e.votes, e.tier])).toEqual([
      ["a", 0, null],
      ["b", 0, null],
    ]);
  });

  it("베이지안 평균으로 표가 적은 캐릭터를 전체 평균 쪽으로 당긴다", () => {
    // a: S 1표, b: D 1표 → 전체 평균 3
    const r = aggregate(["a", "b"], [
      { character_id: "a", tier: "S", count: 1 },
      { character_id: "b", tier: "D", count: 1 },
    ]);
    const a = r.entries.find((e) => e.characterId === "a")!;
    expect(r.globalMean).toBe(3);
    expect(a.mean).toBe(5);
    expect(a.score).toBeCloseTo((5 + PRIOR_WEIGHT * 3) / (1 + PRIOR_WEIGHT));
    expect(a.tier).toBe("A"); // 3.5 → A, S 한 표로 바로 S가 되지 않는다
  });

  it("만장일치 표가 충분하면 S가 된다", () => {
    const r = aggregate(["a", "b"], [
      { character_id: "a", tier: "S", count: 20 },
      { character_id: "b", tier: "C", count: 20 },
    ]);
    expect(r.entries[0].characterId).toBe("a");
    expect(r.entries[0].tier).toBe("S");
    expect(r.entries[1].tier).toBe("C");
  });

  it("득표 분포와 점수 내림차순 정렬", () => {
    const r = aggregate(["a", "b", "c"], [
      { character_id: "b", tier: "S", count: 2 },
      { character_id: "b", tier: "B", count: 1 },
      { character_id: "a", tier: "A", count: 3 },
    ]);
    expect(r.entries.map((e) => e.characterId)).toEqual(["b", "a", "c"]);
    expect(r.entries[0].distribution).toEqual({ S: 2, A: 0, B: 1, C: 0, D: 0 });
    expect(r.entries[0].votes).toBe(3);
  });

  it("주제에 없는 캐릭터의 표는 무시한다", () => {
    const r = aggregate(["a"], [
      { character_id: "a", tier: "A", count: 1 },
      { character_id: "gone", tier: "D", count: 100 },
    ]);
    expect(r.globalMean).toBe(4);
    expect(r.entries).toHaveLength(1);
  });
});
