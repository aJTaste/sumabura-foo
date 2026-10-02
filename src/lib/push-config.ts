// プッシュ通知の設定まわり（環境変数の読み取りと、送り先URLの確認）。
// web-push には依存しない小さなモジュールなので、画面（サーバーコンポーネント）からも使える。
// ブラウザ側（クライアントコンポーネント）からは読み込まないこと。

export type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

// VAPID の鍵の長さ（URLセーフな base64 文字列）。公開鍵は 65 バイト = 87 文字、秘密鍵は 32 バイト = 43 文字
const PUBLIC_KEY_PATTERN = /^[A-Za-z0-9_-]{87}$/;
const PRIVATE_KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/**
 * 通知に必要な設定が揃っていれば返す。ひとつでも足りない・形が違うときは null。
 * null のとき、通知まわりは何もしない（アプリの他の部分には影響しない）。
 *
 * ※ NEXT_PUBLIC_ で始まる値はビルド時に埋め込まれる。登録・変更したあとは、再デプロイが必要。
 */
export function getVapidConfig(): VapidConfig | null {
  const publicKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim();
  const privateKey = (process.env.VAPID_PRIVATE_KEY ?? "").trim();
  const subject = (process.env.VAPID_SUBJECT ?? "").trim();
  if (!PUBLIC_KEY_PATTERN.test(publicKey)) return null;
  if (!PRIVATE_KEY_PATTERN.test(privateKey)) return null;
  // 連絡先は mailto: か https の URL
  if (!/^mailto:.+@.+/.test(subject) && !/^https:\/\/.+/.test(subject)) return null;
  return { publicKey, privateKey, subject };
}

/** 通知を使える状態か（鍵が揃っていて、サーバー用の DB キーもある） */
export function isPushConfigured(): boolean {
  return getVapidConfig() !== null && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// 通知の送り先として受け付けるサーバー（各ブラウザの「プッシュサービス」）。
// 利用者から届いた endpoint にサーバーが通信するので、関係ない宛先へ通信させないために絞っている。
//   Chrome・Edge以外のChromium系・Samsung Internet など: fcm.googleapis.com
//   Firefox: *.push.services.mozilla.com
//   Edge（Windows）: *.notify.windows.com
//   Safari（iPhone・Mac）: *.push.apple.com
// 新しいブラウザの通知が登録できないときは、ここに追加する。
const PUSH_SERVICE_HOSTS = [
  "fcm.googleapis.com",
  "push.services.mozilla.com",
  "notify.windows.com",
  "push.apple.com",
];

/** endpoint が、https で、既知のプッシュサービスのものか */
export function isAllowedPushEndpoint(endpoint: string): boolean {
  if (endpoint.length > 2048) return false;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  return PUSH_SERVICE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

// URLセーフな base64（購読の鍵に使われる文字だけ）
const BASE64URL = /^[A-Za-z0-9_-]+$/;

/** ブラウザから届いた購読情報の形を確かめる（p256dh は 65 バイト、auth は 16 バイトが普通） */
export function isValidSubscriptionKeys(p256dh: string, auth: string): boolean {
  return (
    BASE64URL.test(p256dh) &&
    p256dh.length >= 80 &&
    p256dh.length <= 100 &&
    BASE64URL.test(auth) &&
    auth.length >= 16 &&
    auth.length <= 32
  );
}
