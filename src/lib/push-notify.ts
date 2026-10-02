// 「どの場面で、誰に、何を通知するか」をまとめたもの（サーバー専用）。
// 送信そのものは push.ts。ここでは宛先と文言を、サーバーが確かな情報（成功した操作の結果・DB の値）から決める。
//
// 使い方: 操作（RPC・挿入）が成功したあとに queue〜 を呼ぶ。
//   - 通知は after() で、ユーザーへの応答を返したあとに送る（応答は遅れない）
//   - 通知の準備や送信が失敗しても、呼び出し元の操作の結果（リダイレクトなど）には影響しない
//   - 自分自身には送らない
import { after } from "next/server";
import { APP_SHORT_NAME } from "@/lib/app-config";
import { CHALLENGE_TTL_MS } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPushConfigured } from "@/lib/push-config";
import { sendPush, sendPushToAllExcept, type PushPayload } from "@/lib/push";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 通知の本文は短く。長い名前やタイトルは、途中で切る
function clip(text: string, max: number): string {
  const chars = [...text];
  return chars.length > max ? `${chars.slice(0, max - 1).join("")}…` : text;
}

// ---- 通知の中身（宛先を含まない。テストしやすいよう、文言づくりだけを切り出している） ----

/** 対戦に指名されたとき。matched が true なら、相手もこちらを選んでいて対戦が成立している */
export function challengePayload(fromUserId: string, fromName: string | null, matched: boolean): PushPayload {
  const name = clip(fromName ?? "友達", 20);
  const minutes = Math.round(CHALLENGE_TTL_MS / 60000);
  return {
    title: APP_SHORT_NAME,
    body: matched
      ? `${name}さんとの対戦が成立しました`
      : `${name}さんがあなたを対戦相手に選びました。${minutes}分以内に選び返すと対戦が始まります`,
    url: "/battle",
    // 同じ相手からの指名は同じ tag。選び直しを連打されても、通知は1つに置き換わる
    tag: `challenge-${fromUserId}`,
  };
}

export function announcementPayload(announcementId: string, title: string): PushPayload {
  return { title: APP_SHORT_NAME, body: clip(title, 100), url: "/news", tag: `announcement-${announcementId}` };
}

export function tournamentCreatedPayload(tournamentId: string, title: string): PushPayload {
  return {
    title: APP_SHORT_NAME,
    body: `新しい大会「${clip(title, 40)}」の参加受付が始まりました`,
    url: `/tournaments/${tournamentId}`,
    tag: `tournament-${tournamentId}`,
  };
}

export function bracketCreatedPayload(tournamentId: string, title: string): PushPayload {
  return {
    title: APP_SHORT_NAME,
    body: `大会「${clip(title, 40)}」のトーナメント表ができました`,
    url: `/tournaments/${tournamentId}`,
    tag: `bracket-${tournamentId}`,
  };
}

// ---- 送信（宛先を決めて、push.ts に渡す） ----

async function displayNameOf(userId: string): Promise<string | null> {
  const { data } = await createAdminClient().from("profiles").select("display_name").eq("id", userId).maybeSingle();
  return (data?.display_name as string | undefined) ?? null;
}

async function notifyOpponentSelected(fromUserId: string, targetUserId: string, matched: boolean) {
  if (fromUserId === targetUserId) return;
  const name = await displayNameOf(fromUserId);
  await sendPush([targetUserId], challengePayload(fromUserId, name, matched), {
    // 指名の有効期間（CHALLENGE_TTL_MS）を過ぎた通知は、届かなくてよい
    ttlSeconds: Math.round(CHALLENGE_TTL_MS / 1000),
    urgency: "high",
  });
}

async function notifyTournamentBracket(authorId: string, tournamentId: string) {
  const admin = createAdminClient();
  const [tournament, entries] = await Promise.all([
    admin.from("tournaments").select("title").eq("id", tournamentId).maybeSingle(),
    admin.from("tournament_entries").select("user_id").eq("tournament_id", tournamentId),
  ]);
  const title = tournament.data?.title as string | undefined;
  if (!title || !entries.data) return;
  const participants = (entries.data as { user_id: string }[]).map((e) => e.user_id).filter((id) => id !== authorId);
  await sendPush(participants, bracketCreatedPayload(tournamentId, title));
}

// ---- 操作が成功したあとに呼ぶ入口 ----

// after() の登録も、失敗しても操作の結果に影響させない
function defer(label: string, task: () => Promise<void>) {
  if (!isPushConfigured()) return; // 設定が無ければ何もしない
  try {
    after(async () => {
      try {
        await task();
      } catch (e) {
        console.error(`[push] ${label}の通知に失敗しました:`, e);
      }
    });
  } catch (e) {
    console.error(`[push] ${label}の通知を登録できませんでした:`, e);
  }
}

/**
 * select_opponent が成功したあと、指名された相手へ通知する。
 * rpcResult は RPC の戻り値（対戦が成立したときは match の id、まだなら null）。
 */
export function queueOpponentSelected(fromUserId: string | null, targetUserId: string, rpcResult: unknown) {
  if (!fromUserId || !UUID.test(targetUserId)) return;
  const matched = typeof rpcResult === "string" && rpcResult.length > 0;
  defer("対戦の指名", () => notifyOpponentSelected(fromUserId, targetUserId, matched));
}

/** お知らせを投稿したあと、投稿者以外の全員へ通知する（本文はお知らせのタイトル） */
export function queueAnnouncementPosted(authorId: string | null, announcementId: string, title: string) {
  if (!authorId) return;
  defer("お知らせ", () => sendPushToAllExcept(authorId, announcementPayload(announcementId, title)));
}

/** 大会を作成したあと、作成者以外の全員へ通知する */
export function queueTournamentCreated(authorId: string | null, tournamentId: string, title: string) {
  if (!authorId) return;
  defer("大会の作成", () => sendPushToAllExcept(authorId, tournamentCreatedPayload(tournamentId, title)));
}

/** トーナメント表を作成したあと、その大会の参加者（作成者を除く）へ通知する */
export function queueBracketCreated(authorId: string | null, tournamentId: string) {
  if (!authorId || !UUID.test(tournamentId)) return;
  defer("トーナメント表", () => notifyTournamentBracket(authorId, tournamentId));
}
