"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirectWithError } from "@/lib/redirect";
import { STAGES, MAX_BANNED_STAGES } from "@/lib/data/stages";
import { CHARACTERS } from "@/lib/data/characters";

export async function saveSettings(formData: FormData) {
  const back = "/settings";
  const displayName = String(formData.get("displayName") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const main = [...new Set(formData.getAll("main").map(String).filter(Boolean))];
  const banned = [...new Set(formData.getAll("banned").map(String))];

  const stages: readonly string[] = STAGES;
  const chars: readonly string[] = CHARACTERS;
  if (displayName.length < 1 || displayName.length > 20) redirectWithError(back, "表示名は1〜20文字にしてください");
  if (bio.length > 500) redirectWithError(back, "自己紹介は500文字以内にしてください");
  if (main.length > 3 || main.some((c) => !chars.includes(c))) redirectWithError(back, "メインキャラは3人までです");
  if (banned.length > MAX_BANNED_STAGES || banned.some((s) => !stages.includes(s))) {
    redirectWithError(back, `拒否ステージは${MAX_BANNED_STAGES}つまでです`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, bio, main_characters: main, banned_stages: banned })
    .eq("id", user!.id);
  if (error) redirectWithError(back, "保存に失敗しました");

  revalidatePath("/", "layout");
  redirect("/settings?saved=1");
}
