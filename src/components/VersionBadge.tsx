"use client";

import { useRef } from "react";
import { LATEST_RELEASE } from "@/lib/version";

// "2026-10-01" → "2026年10月1日"
function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return y && m && d ? `${y}年${m}月${d}日` : date;
}

// 現在のバージョンを小さなボタンで表示し、タップ（クリック）すると最新バージョンの更新内容を出す。
// <dialog> を使っているので、Esc キー・背景のタップ・フォーカスの閉じ込めが標準で働く。
export default function VersionBadge() {
  const ref = useRef<HTMLDialogElement>(null);
  const { version, date, items } = LATEST_RELEASE;

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        aria-haspopup="dialog"
        aria-label={`バージョン ${version}。タップして更新内容を見る`}
        // before: は、見た目より少し広くタップできるようにするための透明な当たり判定
        className="num relative mt-0.5 rounded-full border border-line px-1.5 py-px text-[10px] font-semibold leading-snug text-mute transition before:absolute before:-inset-x-3 before:-inset-y-1.5 hover:border-accent hover:text-accent"
      >
        v{version}
      </button>

      <dialog
        ref={ref}
        aria-labelledby="version-dialog-title"
        // 背景（dialog 自身）をタップしたら閉じる。中身は内側の div が受けるので、ここには届かない
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        // m-auto は、Tailwind の初期化で消えてしまう dialog の中央寄せを戻すために必要
        className="m-auto w-[min(24rem,calc(100vw-2rem))] overscroll-contain rounded-2xl border border-line bg-panel p-0 text-ink shadow-card backdrop:bg-black/50"
      >
        <div className="p-5">
          <h2 id="version-dialog-title" className="text-lg font-bold">
            アップデート内容
          </h2>
          <p className="num mt-0.5 text-sm text-mute">
            v{version}・{formatDate(date)}
          </p>
          <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <button type="button" onClick={() => ref.current?.close()} className="btn btn-primary mt-5 w-full">
            閉じる
          </button>
        </div>
      </dialog>
    </>
  );
}
