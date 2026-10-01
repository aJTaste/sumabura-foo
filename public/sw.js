// Service Worker。アプリとしてインストールするために必要です。
//
// ページやデータはキャッシュしません（ログイン状態や対戦の最新状態がずれてしまうため）。
// 通信できないときに画面を開こうとした場合だけ、オフラインの案内（/offline.html）を出します。
// 画面の読み込み以外の通信（対戦の自動更新・ボタンの送信など）には関与しません。

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
