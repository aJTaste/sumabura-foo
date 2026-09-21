"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirectWithError } from "@/lib/redirect";
import { STAGES, MAX_BANNED_STAGES, MAX_ALT_CHARACTERS } from "@/lib/data/stages";
import { CHARACTERS } from "@/lib/data/characters";

export async function saveProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("username").eq("id", user!.id).single();
  const back = `/users/${me!.username}`;

  const displayName = String(formData.get("displayName") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const first = String(formData.get("first") ?? "");
  const alt = [...new Set(formData.getAll("alt").map(String))];
  const banned = [...new Set(formData.getAll("banned").map(String))];

  const stages: readonly string[] = STAGES;
  const chars: readonly string[] = CHARACTERS;
  if (displayName.length < 1 || displayName.length > 20) redirectWithError(back, "表示名は1〜20文字にしてください");
  if (bio.length > 500) redirectWithError(back, "自己紹介は500文字以内にしてください");
  if (first && !chars.includes(first)) redirectWithError(back, "1戦目のキャラが不正です");
  if (alt.length > MAX_ALT_CHARACTERS || alt.some((c) => !chars.includes(c))) {
    redirectWithError(back, `変更する場合のキャラは${MAX_ALT_CHARACTERS}体までです`);
  }
  if (banned.length > MAX_BANNED_STAGES || banned.some((s) => !stages.includes(s))) {
    redirectWithError(back, `拒否ステージは${MAX_BANNED_STAGES}つまでです`);
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      bio,
      first_character: first || null,
      alt_characters: alt,
      banned_stages: banned,
    })
    .eq("id", user!.id);
  if (error) redirectWithError(back, "保存に失敗しました");

  revalidatePath("/", "layout");
  redirect(`${back}?saved=1`);
}

// プロフィールから、その人を対戦相手として選ぶ
export async function chooseFromProfile(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("select_opponent", { p_target: String(formData.get("target")) });
  if (error) redirectWithError("/battle", error.message);
  revalidatePath("/", "layout");
  redirect("/battle");
}
