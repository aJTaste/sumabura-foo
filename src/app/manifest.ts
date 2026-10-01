import type { MetadataRoute } from "next";
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME } from "@/lib/app-config";

// アプリとしてインストールするための情報。/manifest.webmanifest として配信される
// （middleware の matcher で、ログインなしでも返すようにしてある）。
// 名前・説明文は src/lib/app-config.ts、アイコンは public/icons/ の画像を差し替えて変更する。
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    lang: "ja",
    start_url: "/",
    scope: "/",
    // standalone: ブラウザのバーを出さず、アプリ単体の画面で起動する
    display: "standalone",
    // 起動中のスプラッシュ画面の背景と、アプリ上端の色（ライトモードのヘッダー色）
    background_color: "#f1f4fb",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // 端末が丸や角丸に切り抜いても欠けないよう、余白つきで作った画像
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
