"use client";

import { useCallback, useEffect, useState } from "react";
import IosInstallSteps from "@/components/IosInstallSteps";
import { isIos, isStandalone } from "@/lib/device";
import { disablePush, enablePush, isPushSupported, readPushState } from "@/lib/push-client";

// 画面の状態
//   checking     … 確認中
//   unconfigured … サーバーに通知の鍵が未設定（ボタンは出さない）
//   dev          … 開発用の画面（Service Worker が動かない）
//   ios-install  … iPhone で、ホーム画面に追加していない（通知はホーム画面のアプリからしか使えない）
//   unsupported  … このブラウザ・端末では使えない
//   denied       … ブラウザ側でブロックされている
//   no-sw        … Service Worker の準備ができていない
//   off / on     … この端末で、通知がオフ / オン
type State = "checking" | "unconfigured" | "dev" | "ios-install" | "unsupported" | "denied" | "no-sw" | "off" | "on";

const Spinner = () => (
  <span aria-hidden className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
);

// プロフィール（自分の欄）に置く、この端末の通知のオン/オフ。
// 許可を求めるのは、ボタンを押したときだけ（ページを開いただけでは求めない）。オン/オフは端末ごと。
export default function PushSettings({ publicKey, configured }: { publicKey: string; configured: boolean }) {
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evaluate = useCallback(async () => {
    if (!configured) return setState("unconfigured");
    // npm run dev では Service Worker を登録しないので、通知は使えない
    if (process.env.NODE_ENV !== "production") return setState("dev");
    // iPhone は、ホーム画面に追加したアプリからでないと通知が使えない（Safari のタブでは機能自体が無い）
    if (isIos() && !isStandalone()) return setState("ios-install");
    if (!isPushSupported()) return setState("unsupported");
    setState(await readPushState());
  }, [configured]);

  useEffect(() => {
    void evaluate();
  }, [evaluate]);

  // ブロックされていて、端末の設定を直して戻ってきたとき（ページを開き直さなくても）状態を取り直す
  useEffect(() => {
    if (state !== "denied") return;
    const onVisible = () => {
      if (document.visibilityState === "visible" && Notification.permission !== "denied") void evaluate();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [state, evaluate]);

  async function turnOn() {
    setBusy(true);
    setError(null);
    // enablePush の先頭で許可を求める（ボタンを押した直後のユーザー操作の中）
    const result = await enablePush(publicKey);
    setBusy(false);
    if (result.status === "on") setState("on");
    else if (result.status === "denied") setState("denied");
    else setError(result.message);
  }

  async function turnOff() {
    setBusy(true);
    setError(null);
    const result = await disablePush();
    setBusy(false);
    if (result.ok) setState("off");
    else setError(result.message);
  }

  return (
    <section className="panel" aria-labelledby="push-heading">
      <h2 id="push-heading" className="text-lg font-bold">
        通知
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-mute">
        アプリを開いていなくても、対戦相手に選ばれたときやお知らせが届いたときに、スマホに知らせます。
        オン/オフは端末ごとの設定です。
      </p>

      <div className="mt-3 space-y-3 text-sm leading-relaxed" aria-live="polite">
        {state === "checking" && <p className="text-mute">確認しています…</p>}

        {state === "unconfigured" && <p className="text-mute">通知はまだ準備中です。</p>}

        {state === "dev" && (
          <p className="text-mute">
            開発用の画面（npm run dev）では通知を使えません。確認は、本番ビルド（npm run build → npm run start）か、デプロイ後のサイトで行ってください。
          </p>
        )}

        {state === "ios-install" && (
          <>
            <p>
              iPhone では、<b>ホーム画面に追加したアプリ</b>から開いたときだけ、通知が使えます（iOS 16.4 以降）。
            </p>
            <IosInstallSteps className="" />
            <p className="text-mute">追加できたら、ホーム画面のアイコンから開き直して、このページでオンにしてください。</p>
          </>
        )}

        {state === "unsupported" && (
          <p className="text-mute">
            このブラウザ・端末では通知を使えません。Chrome や Safari など、ふだん使っているブラウザで開いてみてください（iPhone は iOS 16.4 以降が必要です）。
          </p>
        )}

        {state === "no-sw" && (
          <p className="text-mute">アプリの準備ができていません。ページを開き直してから、もう一度お試しください。</p>
        )}

        {state === "denied" && (
          <>
            <p>この端末では、通知がブロックされています。端末の設定で通知を「許可」にしてから、このページに戻ってください。</p>
            <ul className="list-disc space-y-1 pl-5 text-mute">
              <li>Android（Chrome）: アドレスバーの左のアイコン →「権限」→「通知」をオン</li>
              <li>Android（ホーム画面のアプリ）: アイコンを長押し →「アプリ情報」→「通知」をオン</li>
              <li>iPhone: 設定 →「通知」→ このアプリ →「通知を許可」をオン</li>
            </ul>
          </>
        )}

        {state === "off" && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-mute">この端末では、通知がオフです。</p>
            <button type="button" onClick={turnOn} disabled={busy} aria-busy={busy} className="btn btn-primary shrink-0">
              {busy && <Spinner />}
              通知をオンにする
            </button>
          </div>
        )}

        {state === "on" && (
          <div className="flex items-center justify-between gap-3">
            <p>この端末では、通知がオンです。</p>
            <button type="button" onClick={turnOff} disabled={busy} aria-busy={busy} className="btn shrink-0">
              {busy && <Spinner />}
              オフにする
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="text-lose">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
