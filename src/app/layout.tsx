import type { Metadata } from "next";
import Script from "next/script";
import { Black_Han_Sans, Gothic_A1 } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ADSENSE_CLIENT } from "@/lib/ads";
import { siteOrigin } from "@/lib/config";
import "./globals.css";

const display = Black_Han_Sans({ variable: "--font-display", weight: "400", subsets: ["latin"] });
const body = Gothic_A1({ variable: "--font-body", weight: ["400", "700", "800"], subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: { default: "티어잇", template: "%s | 티어잇" },
  description: "공식이 뭘 알아? 우리가 곧 공식이야. 각자 매긴 티어를 모아 만든 종합 티어.",
  openGraph: { siteName: "티어잇", locale: "ko_KR", type: "website" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${display.variable} ${body.variable}`}>
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
        {ADSENSE_CLIENT && (
          <Script
            async
            strategy="afterInteractive"
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          />
        )}
      </body>
    </html>
  );
}
