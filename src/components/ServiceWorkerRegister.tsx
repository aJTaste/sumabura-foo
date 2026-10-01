"use client";

import { useEffect } from "react";

// Service Worker（public/sw.js）を登録する。画面には何も出さない。
// 開発中（npm run dev）は登録しない。動作確認は npm run build → npm run start で行う。
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // 登録できなくても、サイトは今まで通り使える（インストールだけができなくなる）
        });
    };

    // 画面の表示を邪魔しないよう、読み込みが終わってから登録する
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
