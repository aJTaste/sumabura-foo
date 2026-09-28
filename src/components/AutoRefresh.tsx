"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getBattleSignal } from "@/app/battle/actions";

// 画面が見えている間、数秒おきに状態だけ軽く確認し、変化があった時だけ再読み込みする
export default function AutoRefresh({ seconds = 4 }: { seconds?: number }) {
  const router = useRouter();
  const lastSignal = useRef<string | null>(null);

  useEffect(() => {
    const id = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const signal = await getBattleSignal();
        if (lastSignal.current !== null && lastSignal.current !== signal) {
          router.refresh();
        }
        lastSignal.current = signal;
      } catch {
        // 一時的な通信エラーは無視し、次回のチェックに任せる
      }
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);

  return null;
}
