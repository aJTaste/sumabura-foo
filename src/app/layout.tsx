import "./globals.css";
import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Header, HeaderFallback, BottomNav } from "@/components/Header";

export const metadata: Metadata = {
  title: "スマブラ レートランキング",
  description: "身内向けスマブラSPレーティング",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

// レイアウト自体は何も待たない。ヘッダー（プロフィール取得）とページ本体が同時に動き、
// できた部分から順に画面へ出る。
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Suspense fallback={<HeaderFallback />}>
          <Header />
        </Suspense>
        <main className="mx-auto max-w-4xl px-4 py-6 pb-28 sm:pb-10">{children}</main>
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
      </body>
    </html>
  );
}
