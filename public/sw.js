// Service Worker。アプリとしてインストールするために必要です。
//
// ページやデータはキャッシュしません（ログイン状態や対戦の最新状態がずれてしまうため）。
// 通信できないときに画面を開こうとした場合だけ、オフラインの案内（/offline.html）を出します。
// 画面の読み込み以外の通信（対戦の自動更新・ボタンの送信など）には関与しません。
//
// プッシュ通知（push / notificationclick）も、ここで受け取ります。

const CACHE = "offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // 画面の移動（ページの読み込み）だけを扱う
  if (request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error())
  );
});

// ---- プッシュ通知 ----

const NOTIFICATION_ICON = "/icons/icon-192.png";
// 通知の中身を読めなかったときの、汎用の文言（アプリ名は app-config.ts にあり、ここからは読めないので入れない）
const FALLBACK_TITLE = "新しい通知";
const FALLBACK_BODY = "アプリを開いて確認してください";

// 通知をタップしたときに開くページ。同じサイト内の相対パスだけ許可し、それ以外は "/" にする
function safeUrl(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }
  try {
    const url = new URL(value, self.location.origin);
    if (url.origin !== self.location.origin) return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}

// 通知を受け取ったら、必ず通知を表示する。
// アプリが前面に出ているときも省略しない（iPhone の Safari は、通知を出さない「サイレントプッシュ」を認めず、
// 続くと購読を取り消すため）。中身を読めなくても、汎用の文言で出す。
self.addEventListener("push", (event) => {
  let data = null;
  try {
    data = event.data ? event.data.json() : null;
  } catch {
    data = null; // JSON ではなかった
  }
  if (!data || typeof data !== "object") data = {};

  const title = typeof data.title === "string" && data.title ? data.title : FALLBACK_TITLE;
  const options = {
    body: typeof data.body === "string" && data.body ? data.body : FALLBACK_BODY,
    icon: NOTIFICATION_ICON,
    data: { url: safeUrl(data.url) },
  };
  // 同じ tag の通知は積み重ならず、置き換わる
  if (typeof data.tag === "string" && data.tag) options.tag = data.tag;

  event.waitUntil(self.registration.showNotification(title, options));
});

// 通知をタップしたら、アプリを開く。すでに開いていれば、そのウィンドウを前面に出して目的のページへ移る
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = safeUrl(event.notification.data && event.notification.data.url);

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        let sameSite = false;
        try {
          sameSite = new URL(client.url).origin === self.location.origin;
        } catch {
          sameSite = false;
        }
        if (!sameSite) continue;
        try {
          const focused = await client.focus();
          if (focused && "navigate" in focused) await focused.navigate(target);
          return;
        } catch {
          // 前面に出せなかった・移動できなかったときは、新しく開く
          break;
        }
      }
      await self.clients.openWindow(target);
    })()
  );
});
