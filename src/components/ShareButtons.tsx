"use client";

import Script from "next/script";
import { useState } from "react";
import styles from "./ShareButtons.module.css";

interface Props {
  /** 사이트 안 경로 (예: /t/jjk-power) */
  path: string;
  /** 공유 문구 */
  text: string;
  /** 있으면 "이미지 저장" 버튼을 보여준다 */
  imagePath?: string;
  imageName?: string;
}

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

interface KakaoSdk {
  isInitialized(): boolean;
  init(key: string): void;
  Share: { sendScrap(opts: { requestUrl: string }): void };
}

export function ShareButtons({ path, text, imagePath, imageName }: Props) {
  const [copied, setCopied] = useState(false);
  const url = () => new URL(path, window.location.origin).toString();

  async function copy() {
    try {
      await navigator.clipboard.writeText(url());
    } catch {
      window.prompt("이 주소를 복사하세요", url());
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function native() {
    if (navigator.share) {
      try {
        await navigator.share({ title: text, url: url() });
      } catch {
        // 사용자가 닫음
      }
    } else {
      await copy();
    }
  }

  function kakao() {
    const k = (window as unknown as { Kakao?: KakaoSdk }).Kakao;
    if (!k || !KAKAO_KEY) return;
    if (!k.isInitialized()) k.init(KAKAO_KEY);
    k.Share.sendScrap({ requestUrl: url() });
  }

  const xHref = () =>
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url())}`;

  return (
    <div className={styles.wrap}>
      <button type="button" className="btn btn-small" onClick={native}>
        공유하기
      </button>
      <button type="button" className="btn btn-small btn-plain" onClick={copy}>
        {copied ? "복사했어요" : "링크 복사"}
      </button>
      {KAKAO_KEY && (
        <>
          <Script src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js" strategy="lazyOnload" />
          <button type="button" className={`btn btn-small btn-plain ${styles.kakao}`} onClick={kakao}>
            카카오톡
          </button>
        </>
      )}
      <button
        type="button"
        className="btn btn-small btn-plain"
        onClick={() => window.open(xHref(), "_blank", "noopener,noreferrer")}
      >
        X
      </button>
      {imagePath && (
        <a className="btn btn-small btn-plain" href={imagePath} download={imageName ?? "tier.png"}>
          이미지 저장
        </a>
      )}
    </div>
  );
}
