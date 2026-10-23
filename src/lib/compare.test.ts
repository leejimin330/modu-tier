import { describe, expect, it } from "vitest";
import { aggregate } from "./aggregate";
import { compareToConsensus } from "./compare";

describe("compareToConsensus", () => {
  it("종합 티어가 있는 캐릭터만 비교하고 차이가 큰 순으로 정렬한다", () => {
    const { entries } = aggregate(
      ["a", "b", "c", "d"],
      [
        { character_id: "a", tier: "S", count: 50 },
        { character_id: "b", tier: "B", count: 50 },
        { character_id: "c", tier: "D", count: 50 },
      ],
    );
    const r = compareToConsensus({ a: "S", b: "A", c: "S", d: "S" }, entries);
    expect(r.compared).toBe(3);
    expect(r.same).toBe(1);
    expect(r.matchRate).toBe(33);
    expect(r.differences.map((d) => [d.characterId, d.gap])).toEqual([
      ["c", 4],
      ["b", 1],
    ]);
  });

  it("비교할 게 없으면 일치율은 null", () => {
    const { entries } = aggregate(["a"], []);
    expect(compareToConsensus({ a: "S" }, entries).matchRate).toBeNull();
  });
});
