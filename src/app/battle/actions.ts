"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/auth";
import { redirectWithError } from "@/lib/redirect";
import { queueOpponentSelected } from "@/lib/push-notify";

const BACK = "/battle";

async function finish(error: { message: string } | null): Promise<never> {
  if (error) redirectWithError(BACK, error.message);
  revalidatePath("/", "layout");
  redirect(BACK);
}

// 対戦相手を選ぶ（相手もこちらを選んでいれば対戦が始まる）
export async function selectOpponent(formData: FormData) {
  const supabase = await createClient();
  const me = await getUserId();
  const target = String(formData.get("target"));
  const { data, error } = await supabase.rpc("select_opponent", { p_target: target });
  // 成功したときだけ、指名された相手へ通知する（応答を返したあとに送る。失敗しても結果は変わらない）
  if (!error) queueOpponentSelected(me, target, data);
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
