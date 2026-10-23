import { describe, expect, it } from "vitest";
import { decodeShare, encodeShare } from "./share-code";

const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";
const C = "cccccccc-0000-4000-8000-000000000003";
const items = [A, B, C];

describe("share code", () => {
  it("티어별로 묶어 짧게 만들고 그대로 되돌린다", () => {
    const code = encodeShare({ [B]: "S", [A]: "S", [C]: "C" }, items);
    expect(code).toBe("aaaaaaaabbbbbbbb---cccccccc");
    expect(decodeShare(code, items)).toEqual({ [A]: "S", [B]: "S", [C]: "C" });
  });

  it("주제에 없는 캐릭터는 버린다", () => {
    expect(encodeShare({ [A]: "A", "dddddddd-0000-4000-8000-000000000004": "S" }, items)).toBe("-aaaaaaaa");
    expect(decodeShare("dddddddd-aaaaaaaa", items)).toEqual({ [A]: "A" });
  });

  it("같은 캐릭터가 두 번 나오면 처음 것만 쓴다", () => {
    expect(decodeShare("aaaaaaaa-aaaaaaaa", items)).toEqual({ [A]: "S" });
  });

  it("형식이 틀리거나 비어 있으면 null", () => {
    expect(decodeShare("", items)).toBeNull();
    expect(decodeShare("----", items)).toBeNull();
    expect(decodeShare("aaaa", items)).toBeNull();
    expect(decodeShare("AAAAAAAA", items)).toBeNull();
    expect(decodeShare("aaaaaaaa-----", items)).toBeNull();
    expect(decodeShare("x".repeat(5000), items)).toBeNull();
  });
});
