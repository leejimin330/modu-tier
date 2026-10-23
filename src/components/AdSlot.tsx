"use client";

import { useEffect } from "react";
import { ADSENSE_CLIENT } from "@/lib/ads";
import styles from "./AdSlot.module.css";

/**
 * 애드센스 광고 자리. NEXT_PUBLIC_ADSENSE_CLIENT와 slot이 있어야 실제 광고가 나온다.
 * 설정 전에는 개발 중에만 자리 표시를 보여주고 운영에서는 아무것도 그리지 않는다.
 */
export function AdSlot({ slot }: { slot?: string }) {
  const enabled = Boolean(ADSENSE_CLIENT && slot);

  useEffect(() => {
    if (!enabled) return;
    try {
      ((window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle ??= []).push({});
    } catch {
      // 광고 차단 등으로 실패해도 페이지는 그대로 둔다
    }
  }, [enabled]);

  if (!enabled) {
    return process.env.NODE_ENV === "production" ? null : <div className={styles.placeholder}>광고 자리</div>;
  }
  return (
    <ins
      className={`adsbygoogle ${styles.ad}`}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
