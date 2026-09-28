"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirectWithError } from "@/lib/redirect";
import { challengeCutoff } from "@/lib/types";

const BACK = "/battle";

async function finish(error: { message: string } | null): Promise<never> {
  if (error) redirectWithError(BACK, error.message);
  revalidatePath("/", "layout");
  redirect(BACK);
}

// 対戦相手を選ぶ（相手もこちらを選んでいれば対戦が始まる）
export async function selectOpponent(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("select_opponent", { p_target: String(formData.get("target")) });
  return finish(error);
}

export async function clearOpponent() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("clear_opponent");
  return finish(error);
}

// 結果の入力（何度でも入力し直せる）
export async function submitResult(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_result", {
    p_match: String(formData.get("matchId")),
    p_result: String(formData.get("result")),
  });
  return finish(error);
}

// 対戦の中止（双方が押したときだけ中止される）
export async function setCancel(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_cancel", {
    p_match: String(formData.get("matchId")),
    p_on: formData.get("on") === "1",
  });
  return finish(error);
}

// 対戦画面のポーリング用: 状態が変わったかどうかだけを軽量に判定する
export async function getBattleSignal(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "logout";
  const meId = user.id;

  const { data: active } = await supabase
    .from("matches")
    .select("id, status, a_report, b_report")
    .in("status", ["pending", "disputed"])
    .or(`player_a.eq.${meId},player_b.eq.${meId}`)
    .limit(1);
  const m = (active ?? [])[0];
  if (m) return `match:${m.id}:${m.status}:${m.a_report}:${m.b_report}`;

  const [{ data: challenges }, { data: busyRows }] = await Promise.all([
    supabase.from("challenges").select("from_user, to_user").gt("created_at", challengeCutoff()),
    supabase.from("matches").select("player_a, player_b").in("status", ["pending", "disputed"]),
  ]);
  const relevant = (challenges ?? [])
    .filter((c) => c.from_user === meId || c.to_user === meId)
    .map((c) => `${c.from_user}>${c.to_user}`)
    .sort();
  const busy = (busyRows ?? []).flatMap((r) => [r.player_a as string, r.player_b as string]).sort();
  return `idle:${relevant.join(",")}:${busy.join(",")}`;
}
