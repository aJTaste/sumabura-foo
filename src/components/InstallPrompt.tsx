"use client";

import { useEffect, useState } from "react";

// ブラウザが「インストールできます」と知らせてくるイベント（Chrome / Edge / Android。iPhone のSafariには無い）
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "install-prompt-dismissed-at";
const DISMISS_DAYS = 14;

// すでにアプリとして起動しているか（ホーム画面から開いた状態）
function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// iPhone / iPad か（iPadOS は Mac と名乗るので、タッチ対応かどうかも見る）
function isIos() {
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

// 画面の上に出す、アプリのインストール案内。
// - Android / パソコン（Chrome・Edge）: 「インストール」ボタンでインストール画面を開く
// - iPhone / iPad: ボタンはブラウザから呼べないので、「ホーム画面に追加」の手順を見せる
// - すでにアプリとして開いているとき・閉じてから14日以内は出さない
export default function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true); // 判定が済むまでは出さない（表示のちらつきを防ぐ）
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    // イベントは、バナーを出さない場合でも受け取っておく
    // （受け取って止めないと、ブラウザが自前の案内を勝手に出すことがある）
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    const onInstalled = () => {
      setEvent(null);
      setHidden(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    setIos(isIos());
    setHidden(isStandalone() || recentlyDismissed());

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden || (!event && !ios)) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // 保存できなくても、このページを開いている間は閉じられる
    }
    setHidden(true);
  }

  async function install() {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    // 一度使ったイベントは再利用できない。インストールされれば appinstalled で消える
    setEvent(null);
  }

  return (
    <aside aria-label="アプリのインストール" className="panel mb-4">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={40} height={40} className="size-10 shrink-0 rounded-lg" />
        <div className="min-w-0">
          <p className="text-sm font-bold">アプリとして使えます</p>
          <p className="mt-0.5 text-sm leading-relaxed text-mute">
            ホーム画面に追加すると、ブラウザを開かずにすぐ起動できます。
          </p>
        </div>
      </div>

      {ios && !event && showSteps && (
        <ol className="mt-3 list-decimal space-y-1 pl-9 text-sm leading-relaxed">
          <li>Safari でこのページを開く</li>
          <li>共有ボタン（四角から矢印が出ているマーク）をタップ</li>
          <li>「ホーム画面に追加」を選ぶ</li>
          <li>右上の「追加」をタップ</li>
        </ol>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={dismiss} className="btn">
          あとで
        </button>
        {event ? (
          <button type="button" onClick={install} className="btn btn-primary">
            インストール
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowSteps((v) => !v)}
            aria-expanded={showSteps}
            className="btn btn-primary"
          >
            {showSteps ? "手順を閉じる" : "追加のしかた"}
          </button>
        )}
      </div>
    </aside>
  );
}
