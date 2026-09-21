"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 画面が見えている間、数秒おきにサーバーの最新状態を読み直す（相手が選んだ・入力した、を反映するため）
export default function AutoRefresh({ seconds = 4 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
