"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirectWithError, safeBack } from "@/lib/redirect";
import { STAGES } from "@/lib/data/stages";
import { CHARACTERS } from "@/lib/data/characters";

type GameInput = {
  winner: "me" | "opponent" | "";
  stage: string;
  myCharacter: string;
  opponentCharacter: string;
};

export async function reportMatch(input: { opponentId: string; games: GameInput[] }) {
  const stages: readonly string[] = STAGES;
  const chars: readonly string[] = CHARACTERS;
  for (const g of input.games) {
    if (!stages.includes(g.stage)) return { error: "ステージが不正です" };
    if (g.myCharacter && !chars.includes(g.myCharacter)) return { error: "キャラが不正です" };
    if (g.opponentCharacter && !chars.includes(g.opponentCharacter)) return { error: "キャラが不正です" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("report_match", {
    p_opponent: input.opponentId,
    p_games: input.games.map((g) => ({
      winner: g.winner,
      stage: g.stage,
      my_character: g.myCharacter,
      opponent_character: g.opponentCharacter,
    })),
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/matches");
}

// 相手の承認 / 保留 / 報告者の取り消し
export async function respondMatch(formData: FormData) {
  const back = safeBack(formData.get("back"), "/matches");
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_match", {
    p_match: String(formData.get("matchId")),
    p_action: String(formData.get("action")),
  });
  if (error) redirectWithError(back, error.message);
  revalidatePath("/", "layout");
  redirect(back);
}

// 管理者の裁定
export async function resolveMatch(formData: FormData) {
  const back = safeBack(formData.get("back"), "/admin");
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_match", {
    p_match: String(formData.get("matchId")),
    p_action: String(formData.get("action")),
  });
  if (error) redirectWithError(back, error.message);
  revalidatePath("/", "layout");
  redirect(back);
}
