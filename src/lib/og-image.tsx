import "server-only";
import { ImageResponse } from "next/og";
import { siteOrigin } from "./config";
import { TIERS, type Tier } from "./tiers";
import type { Thumb } from "./types";

// 링크 미리보기(카톡·X 등)와 "이미지로 저장"에 같이 쓰는 티어표 그림.

export const OG_SIZE = { width: 1200, height: 630 };

const TIER_COLOR: Record<Tier, string> = { S: "#ff5864", A: "#ff9f43", B: "#ffd84d", C: "#63d47f", D: "#58a8ff" };
const INK = "#16171d";
const PER_ROW = 15;
const MAX_IMAGES = TIERS.length * PER_ROW;

export interface OgRow {
  tier: Tier;
  items: Thumb[];
}

const hue = (name: string) => {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) % 360;
  return h;
};

/** 구글 폰트에서 그림에 쓰인 글자만 잘라 받는다. 실패하면 기본 글꼴로 그린다. */
async function loadFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=Black+Han+Sans&text=${encodeURIComponent(text)}`)
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** 이미지를 미리 받아 data URL로 바꾼다. 못 받거나 그릴 수 없는 형식은 null (빈 칸으로 그림). */
async function inlineImage(src: string): Promise<string | null> {
  try {
    const res = await fetch(src.startsWith("/") ? `${siteOrigin()}${src}` : src, { signal: AbortSignal.timeout(4000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/^image\/(png|jpe?g|gif)/.test(type)) return null;
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function renderTierImage({ title, subtitle, rows }: { title: string; subtitle: string; rows: OgRow[] }) {
  let budget = MAX_IMAGES;
  const shown = rows.map((r) => {
    const take = Math.min(r.items.length, PER_ROW, budget);
    budget -= take;
    return { tier: r.tier, items: r.items.slice(0, take), more: r.items.length - take };
  });
  const sources = [...new Set(shown.flatMap((r) => r.items.map((t) => t.image_url).filter(Boolean)))];
  const inlined = new Map(await Promise.all(sources.map(async (s) => [s, await inlineImage(s)] as const)));

  const brand = "티어잇";
  const textItems = shown.flatMap((r) => r.items.filter((t) => !t.image_url && !t.emoji).map((t) => t.name));
  const font = await loadFont(`${title}${subtitle}${brand}SABCD+0123456789${textItems.join("")}`);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#e9ecf2", padding: "36px 44px", fontFamily: "Display" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22 }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 900 }}>
            <div style={{ fontSize: 26, color: "#5d6270" }}>{subtitle}</div>
            <div style={{ fontSize: 52, color: INK, lineHeight: 1.1 }}>{title}</div>
          </div>
          <div style={{ fontSize: 34, color: "#2f3bd6" }}>{brand}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, border: `3px solid ${INK}`, borderRadius: 10, overflow: "hidden", background: "#fff" }}>
          {shown.map((r, i) => (
            <div key={r.tier} style={{ display: "flex", flex: 1, borderTop: i === 0 ? "none" : `2px solid ${INK}` }}>
              <div style={{ width: 84, display: "flex", alignItems: "center", justifyContent: "center", background: TIER_COLOR[r.tier], color: INK, fontSize: 48, borderRight: `2px solid ${INK}` }}>
                {r.tier}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px", flex: 1 }}>
                {r.items.map((t, j) => {
                  const data = t.image_url ? inlined.get(t.image_url) : null;
                  if (data) {
                    // eslint-disable-next-line @next/next/no-img-element
                    return <img key={j} src={data} width={60} height={80} style={{ objectFit: "cover", objectPosition: "top", borderRadius: 6 }} alt="" />;
                  }
                  const box = { width: 60, height: 80, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" as const };
                  if (t.image_url) return <div key={j} style={{ ...box, background: "#d3d8e2" }} />;
                  return (
                    <div key={j} style={{ ...box, background: `hsl(${hue(t.name)}, 85%, 86%)`, color: INK, padding: 3, fontSize: t.emoji ? 32 : t.name.length > 6 ? 11 : 14, lineHeight: 1.1 }}>
                      {t.emoji || t.name}
                    </div>
                  );
                })}
                {r.more > 0 && <div style={{ fontSize: 30, color: "#5d6270", marginLeft: 6 }}>+{r.more}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: font ? [{ name: "Display", data: font, style: "normal", weight: 400 }] : undefined,
      emoji: "twemoji",
    },
  );
}
