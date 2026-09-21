"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirectWithError } from "@/lib/redirect";

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
