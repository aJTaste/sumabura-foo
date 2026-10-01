"use client";

import { startTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// 画面の表示中にエラーが起きたときの表示。
// アプリとして開いていると、ブラウザの「再読み込み」や「戻る」が使えないことがあるので、
// この画面の中から必ず元の画面へ戻れるようにしている。
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto max-w-md space-y-4 py-10 text-center">
      <p className="text-5xl" aria-hidden>⚠️</p>
      <h1 className="text-xl font-bold">うまく表示できませんでした</h1>
      <p className="text-sm text-mute">通信が不安定なときなどに起きることがあります。もう一度お試しください。</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            // サーバー側のデータも取り直してから、表示をやり直す
            startTransition(() => {
              router.refresh();
              reset();
            })
          }
        >
          もう一度読み込む
        </button>
        <Link href="/" className="btn">ランキングに戻る</Link>
      </div>
    </div>
  );
}
