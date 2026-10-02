"use server";

import { getUserId } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedPushEndpoint, isPushConfigured, isValidSubscriptionKeys } from "@/lib/push-config";
import { removeSubscription } from "@/lib/push";

// プッシュ通知の購読の登録・解除（画面のボタンから呼ばれる）。
// 購読の表（push_subscriptions）はブラウザから直接さわれないので、サーバーでログイン中の本人のIDを確かめてから、service role で読み書きする。
// ここで扱うのは「この端末の購読」だけ。通知の宛先や本文をクライアントから受け取って送る処理は無い（送信は push.ts を、サーバーの処理からだけ呼ぶ）。

type Result = { ok: true } | { ok: false; error: string };

const NOT_LOGGED_IN = "ログインが切れています。ログインし直してください";

/**
 * この端末の購読を、ログイン中のユーザーのものとして保存する。
 * endpoint は端末ごとに一意。すでにある（別のアカウントで登録された）場合は、持ち主を今のユーザーに付け替える。
 */
export async function savePushSubscription(input: { endpoint: string; p256dh: string; auth: string }): Promise<Result> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: NOT_LOGGED_IN };
  if (!isPushConfigured()) return { ok: false, error: "通知の準備がまだできていません" };

  const endpoint = typeof input?.endpoint === "string" ? input.endpoint : "";
  const p256dh = typeof input?.p256dh === "string" ? input.p256dh : "";
  const auth = typeof input?.auth === "string" ? input.auth : "";
  if (!isAllowedPushEndpoint(endpoint) || !isValidSubscriptionKeys(p256dh, auth)) {
    return { ok: false, error: "この端末（ブラウザ）の通知は登録できませんでした" };
  }

  try {
    const { error } = await createAdminClient()
      .from("push_subscriptions")
      .upsert({ user_id: userId, endpoint, p256dh, auth }, { onConflict: "endpoint" });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e) {
    console.error("[push] 購読の保存に失敗しました:", e);
    return { ok: false, error: "通知を登録できませんでした。しばらくしてからもう一度お試しください" };
  }
}

/** この端末の購読を消す（通知をオフにするとき・ログアウトするとき） */
export async function removePushSubscription(endpoint: string): Promise<Result> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: NOT_LOGGED_IN };
  if (typeof endpoint !== "string" || endpoint.length === 0 || endpoint.length > 2048) {
    return { ok: false, error: "この端末の通知を解除できませんでした" };
  }
  try {
    await removeSubscription(endpoint);
    return { ok: true };
  } catch (e) {
    console.error("[push] 購読の削除に失敗しました:", e);
    return { ok: false, error: "通知を解除できませんでした。しばらくしてからもう一度お試しください" };
  }
}

/**
 * この端末の購読が、今ログインしているユーザーのものとして登録されているか。
 * （別のアカウントで有効にした端末や、サーバー側で消えた購読を、画面に「オン」と出さないため）
 * 自分の分についての true / false だけを返す。他人の情報は返さない。
 */
export async function hasMyPushSubscription(endpoint: string): Promise<boolean> {
  const userId = await getUserId();
  if (!userId || typeof endpoint !== "string" || endpoint.length === 0 || endpoint.length > 2048) return false;
  try {
    const { data, error } = await createAdminClient()
      .from("push_subscriptions")
      .select("id")
      .eq("endpoint", endpoint)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data !== null;
  } catch (e) {
    console.error("[push] 購読の確認に失敗しました:", e);
    return false;
  }
}
