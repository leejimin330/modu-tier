import type { Thumb } from "@/lib/types";
import styles from "./ItemThumb.module.css";

/** 이미지가 없는 항목(음식·아이돌 등)도 칸 모양이 같도록 이모지나 이름 글자로 채운다 */
export const hasLabelInside = (t: Thumb) => !t.image_url && !t.emoji;

/** 이름으로 정해지는 파스텔 색 (같은 이름이면 항상 같은 색) */
export function thumbHue(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) % 360;
  return h;
}

export function ItemThumb({ item, className, alt = "" }: { item: Thumb; className?: string; alt?: string }) {
  if (item.image_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={className} src={item.image_url} alt={alt} loading="lazy" />;
  }
  return (
    <span
      className={`${styles.box} ${className ?? ""}`}
      style={{ "--hue": thumbHue(item.name) } as React.CSSProperties}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
    >
      {item.emoji ? (
        <span className={styles.emoji}>{item.emoji}</span>
      ) : (
        <span
          className={styles.text}
          data-len={item.name.length > 7 ? "long" : item.name.length > 4 ? "mid" : undefined}
        >
          {item.name}
        </span>
      )}
    </span>
  );
}
