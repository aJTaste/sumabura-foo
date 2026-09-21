"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirectWithError } from "@/lib/redirect";

// 投稿・削除は管理者だけ（DB の権限設定で拒否される）
export async function postAnnouncement(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (title.length < 1 || title.length > 100) redirectWithError("/news", "タイトルは1〜100文字にしてください");
  if (body.length > 2000) redirectWithError("/news", "本文は2000文字以内にしてください");

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({ title, body });
  if (error) redirectWithError("/news", "投稿できませんでした（管理者のみ投稿できます）");

  revalidatePath("/", "layout");
  redirect("/news");
}

export async function deleteAnnouncement(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", String(formData.get("id")))
    .select("id");
  if (error || !data?.length) redirectWithError("/news", "削除できませんでした（管理者のみ削除できます）");

  revalidatePath("/", "layout");
  redirect("/news");
}
