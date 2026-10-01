"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// 画面が見えている間、数秒おきに状態だけ軽く確認し、変化があった時だけ再読み込みする。
// 確認は通常の fetch（GET）で行う。Server Action で行うと、ボタン操作や画面遷移が
// 確認の完了待ちの列に並んでしまい、操作の反応が遅くなることがあるため。
export default function AutoRefresh({ seconds = 4 }: { seconds?: number }) {
  const router = useRouter();
  const lastSignal = useRef<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    let stopped = false;

    const check = async () => {
      // 非表示中はやらない。前回の確認がまだ終わっていないときも重ねない
      if (document.visibilityState !== "visible" || inFlight.current) return;
      inFlight.current = true;
      try {
        const res = await fetch("/api/battle-signal", { cache: "no-store" });
        let signal: string | null = null;
        if (res.status === 401) signal = "logout"; // ログイン切れ → 再読み込みでログイン画面へ
        else if (res.ok) signal = ((await res.json()) as { signal: string }).signal;
        if (stopped || signal === null) return;
        if (lastSignal.current !== null && lastSignal.current !== signal) router.refresh();
        lastSignal.current = signal;
      } catch {
        // 一時的な通信エラーは無視し、次回のチェックに任せる
      } finally {
        inFlight.current = false;
      }
    };

    check(); // 開いた直後に1回確認して、比べる基準を早めに取る
    const id = setInterval(check, seconds * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") check(); // タブに戻ったらすぐ確認
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, seconds]);

  return null;
}
