// 端末・表示モードの判定（ブラウザ側でだけ使う）

// すでにアプリとして起動しているか（ホーム画面から開いた状態）
export function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// iPhone / iPad か（iPadOS は Mac と名乗るので、タッチ対応かどうかも見る）
export function isIos() {
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}
