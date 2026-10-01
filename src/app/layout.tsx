import "./globals.css";
import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Header, HeaderFallback, BottomNav } from "@/components/Header";
import InstallPrompt from "@/components/InstallPrompt";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME, LINK_PREVIEW } from "@/lib/app-config";

// 名前や説明文は src/lib/app-config.ts で変更する。
// manifest（インストール用の情報）は src/app/manifest.ts、アイコンは src/app/ と public/icons/ にある
export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  // iPhone のホーム画面から開いたときの設定（名前とアプリ表示）
  appleWebApp: { capable: true, title: APP_SHORT_NAME, statusBarStyle: "default" },
  // リンクを貼ったときのプレビュー
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: APP_NAME,
    title: LINK_PREVIEW.title,
    description: LINK_PREVIEW.description,
  },
  twitter: { card: "summary", title: LINK_PREVIEW.title, description: LINK_PREVIEW.description },
};

// themeColor はスマホのステータスバー（アプリ表示ではアプリの上端）の色。ヘッダーの色に合わせている
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#161d30" },
  ],
};

// レイアウト自体は何も待たない。ヘッダー（プロフィール取得）とページ本体が同時に動き、
// できた部分から順に画面へ出る。
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <ServiceWorkerRegister />
        <Suspense fallback={<HeaderFallback />}>
          <Header />
        </Suspense>
        <main className="safe-x mx-auto max-w-4xl py-6 pb-28 sm:pb-10">
          <InstallPrompt />
          {children}
        </main>
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
      </body>
    </html>
  );
}
