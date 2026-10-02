"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/auth";
import { redirectWithError } from "@/lib/redirect";
import { queueAnnouncementPosted } from "@/lib/push-notify";

// 投稿・削除は管理者だけ（DB の権限設定で拒否される）
export async function postAnnouncement(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (title.length < 1 || title.length > 100) redirectWithError("/news", "タイトルは1〜100文字にしてください");
  if (body.length > 2000) redirectWithError("/news", "本文は2000文字以内にしてください");

  const supabase = await createClient();
  const me = await getUserId();
  const { data, error } = await supabase.from("announcements").insert({ title, body }).select("id").single();
  if (error || !data) redirectWithError("/news", "投稿できませんでした（管理者のみ投稿できます）");

  // 投稿できたので、投稿者以外の全員へ通知する（応答を返したあとに送る）
  queueAnnouncementPosted(me, data.id, title);

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
