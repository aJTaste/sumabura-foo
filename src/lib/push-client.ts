// プッシュ通知の、ブラウザ側の処理（この端末の購読・解除）。ブラウザからだけ使う。
// 購読の保存・削除はサーバーアクション（users/push-actions.ts）が行う。
import { hasMyPushSubscription, removePushSubscription, savePushSubscription } from "@/app/users/push-actions";

/** この環境で、プッシュ通知の部品がそろっているか */
export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// 一定時間で待つのをやめる（Service Worker が登録されていないと、ready はいつまでも終わらないため）
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function getRegistration(ms = 8000) {
  return withTimeout(navigator.serviceWorker.ready, ms);
}

// URLセーフな base64 の公開鍵を、購読に渡せるバイト列にする
function keyToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function sameKey(buffer: ArrayBuffer | null, bytes: Uint8Array): boolean {
  if (!buffer) return true; // 調べられないときは、そのまま使う
  const a = new Uint8Array(buffer);
  return a.length === bytes.length && a.every((v, i) => v === bytes[i]);
}

export type PushState = "off" | "on" | "denied" | "no-sw";

/** この端末の、いまの状態（サーバーに、今のユーザーの購読として登録されているかまで確かめる） */
export async function readPushState(): Promise<PushState> {
  if (Notification.permission === "denied") return "denied";
  let registration: ServiceWorkerRegistration;
  try {
    registration = await getRegistration();
  } catch {
    return "no-sw";
  }
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return "off";
  return (await hasMyPushSubscription(subscription.endpoint)) ? "on" : "off";
}

export type EnableResult = { status: "on" } | { status: "denied" } | { status: "error"; message: string };

/**
 * この端末で通知をオンにする。ボタンを押した直後（ユーザー操作の中）に呼ぶこと。
 * 先頭で許可を求めるので、これより前に await を入れない。
 */
export async function enablePush(publicKey: string): Promise<EnableResult> {
  // iPhone は、ユーザー操作の中でしか許可の確認を出せない
  const permission = await Notification.requestPermission();
  if (permission === "denied") return { status: "denied" };
  if (permission !== "granted") {
    return { status: "error", message: "通知が許可されませんでした。もう一度ボタンを押して、「許可」を選んでください" };
  }

  let created = false;
  let subscription: PushSubscription | null = null;
  try {
    const registration = await getRegistration();
    subscription = await registration.pushManager.getSubscription();
    const key = keyToBytes(publicKey);

    // サーバーの鍵を作り直したあとは、古い鍵で作った購読を捨てて作り直す
    if (subscription && !sameKey(subscription.options.applicationServerKey, key)) {
      await subscription.unsubscribe();
      subscription = null;
    }
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      created = true;
    }

    const json = subscription.toJSON();
    const endpoint = json.endpoint;
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;
    if (!endpoint || !p256dh || !auth) throw new Error("incomplete subscription");

    const result = await savePushSubscription({ endpoint, p256dh, auth });
    if (!result.ok) {
      // サーバーに登録できなかったので、端末だけ購読が残らないように戻す
      if (created) await subscription.unsubscribe().catch(() => undefined);
      return { status: "error", message: result.error };
    }
    return { status: "on" };
  } catch (e) {
    if (created && subscription) await subscription.unsubscribe().catch(() => undefined);
    const timeout = e instanceof Error && e.message === "timeout";
    return {
      status: "error",
      message: timeout
        ? "アプリの準備ができていません。ページを開き直してから、もう一度お試しください"
        : "通知をオンにできませんでした。しばらくしてからもう一度お試しください",
    };
  }
}

/** この端末の通知をオフにする（サーバーの購読を消してから、端末側の購読も解除する） */
export async function disablePush(): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const registration = await getRegistration();
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const result = await removePushSubscription(subscription.endpoint);
      if (!result.ok) return { ok: false, message: result.error };
      await subscription.unsubscribe();
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "通知をオフにできませんでした。しばらくしてからもう一度お試しください" };
  }
}

/**
 * ログアウトの前に、この端末の購読を手放す。
 * 同じ端末で次にログインする人（別のアカウント）へ、前のユーザー宛の通知が届き続けないようにするため。
 * 失敗しても、ログアウトは止めない（待つのは数秒まで）。
 */
export async function releaseThisDevicePush(): Promise<void> {
  try {
    if (!isPushSupported()) return;
    const registration = await withTimeout(
      navigator.serviceWorker.getRegistration().then((r) => r ?? Promise.reject(new Error("none"))),
      2000
    );
    const subscription = await withTimeout(registration.pushManager.getSubscription(), 2000);
    if (!subscription) return;
    // ログインしているうちに、サーバー側の購読を消す
    await withTimeout(removePushSubscription(subscription.endpoint), 4000).catch(() => undefined);
    // 端末側の購読も解除する（サーバーの削除に失敗しても、こちらを解除すれば届かなくなる）
    await withTimeout(subscription.unsubscribe(), 2000).catch(() => undefined);
  } catch {
    // 何もしない
  }
}
