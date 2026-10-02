// プッシュ通知の送信（サーバー専用）。
// Node ランタイムでだけ動かす（web-push は Node の機能を使う）。middleware（Edge）やブラウザ側のコードからは読み込まないこと。
//
// - 設定（VAPID の鍵）が無いときは、何もしない（アプリは普通に動く）
// - 何があっても例外を投げない（通知の失敗で、対戦やお知らせの操作を失敗させない）
// - 失効した購読（404 / 410）は消す。1件の失敗で他の送信を止めない
import * as webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVapidConfig } from "@/lib/push-config";

export type PushPayload = {
  title: string;
  body: string;
  /** タップしたときに開くページ（同じサイト内のパス。例: "/battle"） */
  url: string;
  /** 同じ tag の通知は、積み重ならずに置き換わる */
  tag?: string;
};

export type PushOptions = {
  /** 端末に届けられなかったときに、プッシュサービスが保管しておく秒数（過ぎたら捨てられる） */
  ttlSeconds?: number;
  /** high にすると、スマホが省電力で眠っていてもすぐ届けようとする */
  urgency?: "very-low" | "low" | "normal" | "high";
};

type SubscriptionRow = { id: string; endpoint: string; p256dh: string; auth: string };

const DEFAULT_TTL_SECONDS = 24 * 60 * 60;
const SEND_TIMEOUT_MS = 8000;

/** プッシュサービスが「この購読はもう無い」と答えたか（404 Not Found / 410 Gone） */
export function isSubscriptionGone(error: unknown): boolean {
  const status = (error as { statusCode?: unknown } | null)?.statusCode;
  return status === 404 || status === 410;
}

type RowLoader = (admin: ReturnType<typeof createAdminClient>) => PromiseLike<{
  data: SubscriptionRow[] | null;
  error: { message: string } | null;
}>;

async function send(load: RowLoader, payload: PushPayload, options: PushOptions): Promise<void> {
  try {
    const vapid = getVapidConfig();
    if (!vapid) return; // 設定が無ければ何もしない
    // VAPID の設定は、送信のたびにここで行う（import しただけで環境変数が必要にならない）
    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

    const admin = createAdminClient();
    const { data: rows, error } = await load(admin);
    if (error) {
      console.error("[push] 購読の取得に失敗しました:", error.message);
      return;
    }
    if (!rows || rows.length === 0) return;

    const body = JSON.stringify(payload);
    const results = await Promise.all(
      rows.map(async (row): Promise<"ok" | "gone" | "failed"> => {
        try {
          await webpush.sendNotification(
            { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
            body,
            {
              TTL: options.ttlSeconds ?? DEFAULT_TTL_SECONDS,
              urgency: options.urgency ?? "normal",
              timeout: SEND_TIMEOUT_MS,
            }
          );
          return "ok";
        } catch (e) {
          if (isSubscriptionGone(e)) return "gone";
          // endpoint や鍵はログに出さない
          console.error("[push] 送信に失敗しました:", (e as { statusCode?: number })?.statusCode ?? (e as Error)?.message);
          return "failed";
        }
      })
    );

    // 失効した購読を消す（端末側で通知をオフにした・アプリを消した、など）
    const goneIds = rows.filter((_, i) => results[i] === "gone").map((row) => row.id);
    if (goneIds.length > 0) {
      const { error: deleteError } = await admin.from("push_subscriptions").delete().in("id", goneIds);
      if (deleteError) console.error("[push] 失効した購読の削除に失敗しました:", deleteError.message);
    }
  } catch (e) {
    console.error("[push] 通知の処理に失敗しました:", e);
  }
}

const COLUMNS = "id, endpoint, p256dh, auth";

/** 指定したユーザー全員の、すべての端末へ送る */
export async function sendPush(userIds: string[], payload: PushPayload, options: PushOptions = {}): Promise<void> {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return;
  await send((admin) => admin.from("push_subscriptions").select(COLUMNS).in("user_id", ids), payload, options);
}

/** 指定したユーザー以外の、通知をオンにしている全員へ送る（お知らせ・大会の作成など） */
export async function sendPushToAllExcept(
  exceptUserId: string,
  payload: PushPayload,
  options: PushOptions = {}
): Promise<void> {
  await send((admin) => admin.from("push_subscriptions").select(COLUMNS).neq("user_id", exceptUserId), payload, options);
}

/**
 * 端末（endpoint）の購読を消す。通知をオフにしたときと、ログアウトのときに使う。
 * endpoint はその端末だけが知っている値なので、持ち主が誰であっても、端末から申告されたものは消してよい
 * （同じ端末で別のアカウントに切り替えたとき、前のユーザー宛の通知を確実に止めるため）。
 */
export async function removeSubscription(endpoint: string): Promise<void> {
  const { error } = await createAdminClient().from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw new Error(error.message);
}
