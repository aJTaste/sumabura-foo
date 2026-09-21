"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirectWithError } from "@/lib/redirect";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// フォームの hidden "tid"（大会ID）から戻り先を決める
function backOf(formData: FormData): string {
  const tid = String(formData.get("tid") ?? "");
  return UUID.test(tid) ? `/tournaments/${tid}` : "/tournaments";
}

const friendly = (msg: string) =>
  /row-level security|permission denied/i.test(msg) ? "この操作は管理者だけができます" : msg;

async function finish(back: string, error: { message: string } | null): Promise<never> {
  if (error) redirectWithError(back, friendly(error.message));
  revalidatePath("/", "layout");
  redirect(back);
}

// ---- 管理者 ----
export async function createTournament(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const startsRaw = String(formData.get("startsAt") ?? "").trim();
  const back = "/tournaments";

  if (title.length < 1 || title.length > 60) redirectWithError(back, "大会名は1〜60文字にしてください");
  if (description.length > 1000) redirectWithError(back, "説明は1000文字以内にしてください");

  let startsAt: string | null = null;
  if (startsRaw) {
    const d = new Date(`${startsRaw}+09:00`); // 入力は日本時間として扱う
    if (Number.isNaN(d.getTime())) redirectWithError(back, "開催日時が正しくありません");
    startsAt = d.toISOString();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournaments")
    .insert({ title, description, starts_at: startsAt })
    .select("id")
    .single();
  if (error || !data) redirectWithError(back, friendly(error?.message ?? "作成できませんでした"));

  revalidatePath("/", "layout");
  redirect(`/tournaments/${data.id}`);
}

export async function createBracket(formData: FormData) {
  const supabase = await createClient();
  const seeding = String(formData.get("seeding")) === "random" ? "random" : "rating";
  const { error } = await supabase.rpc("create_bracket", {
    p_tournament: String(formData.get("tid")),
    p_seeding: seeding,
  });
  return finish(backOf(formData), error);
}

export async function cancelTournament(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournaments")
    .update({ status: "cancelled" })
    .eq("id", String(formData.get("tid")))
    .in("status", ["open", "running"])
    .select("id");
  return finish(backOf(formData), error ?? (data?.length ? null : { message: "この操作は管理者だけができます" }));
}

export async function removeEntry(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_entry", {
    p_tournament: String(formData.get("tid")),
    p_user: String(formData.get("userId")),
  });
  return finish(backOf(formData), error);
}

// 勝者を指定して決着させる（保留の裁定・不戦勝など）
export async function resolveTournamentMatch(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_tournament_match", {
    p_match: String(formData.get("matchId")),
    p_winner: String(formData.get("winner")),
  });
  return finish(backOf(formData), error);
}

// ---- 参加者 ----
export async function enterTournament(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("enter_tournament", { p_tournament: String(formData.get("tid")) });
  return finish(backOf(formData), error);
}

export async function leaveTournament(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_tournament", { p_tournament: String(formData.get("tid")) });
  return finish(backOf(formData), error);
}

// 大会の試合結果（勝った/負けた）。双方が入力して一致すれば決着、食い違えば保留。
export async function submitTournamentResult(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_tournament_result", {
    p_match: String(formData.get("matchId")),
    p_result: String(formData.get("result")),
  });
  return finish(backOf(formData), error);
}
