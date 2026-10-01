"use client";

import "./globals.css";

// ヘッダーを含む全体でエラーが起きたときの最後の受け皿（通常の error.tsx では受けられない場合）。
// 全体を置き換えるので、<html> と <body> を自前で持つ。
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ja">
      <body>
        <div role="alert" className="mx-auto max-w-md space-y-4 px-4 py-20 text-center">
          <p className="text-5xl" aria-hidden>⚠️</p>
          <h1 className="text-xl font-bold">うまく表示できませんでした</h1>
          <p className="text-sm text-mute">通信が不安定なときなどに起きることがあります。もう一度お試しください。</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" className="btn btn-primary" onClick={() => reset()}>
              もう一度読み込む
            </button>
            {/* 全体のエラーでは通常のリンクだと状態が残るので、ページごと読み込み直す */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="btn">ランキングに戻る</a>
          </div>
        </div>
      </body>
    </html>
  );
}
