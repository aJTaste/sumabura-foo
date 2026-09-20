"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirectWithError } from "@/lib/redirect";

// ユーザー名を内部用のメールアドレスに変換（友達はメールを持たなくてよい）
const toEmail = (username: string) => `${username}@smash.example.com`;

export async function login(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: toEmail(username), password });
  if (error) redirectWithError("/login", "ユーザー名かパスワードが違います");
  redirect("/");
}

export async function register(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim() || username;
  const password = String(formData.get("password") ?? "");
  const invite = String(formData.get("invite") ?? "");
  const back = "/login";

  if (!process.env.INVITE_CODE || invite !== process.env.INVITE_CODE) {
    redirectWithError(back, "合言葉が違います");
  }
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    redirectWithError(back, "ユーザー名は半角英数字とアンダースコアで3〜20文字にしてください");
  }
  if (displayName.length > 20) redirectWithError(back, "表示名は20文字以内にしてください");
  if (password.length < 8) redirectWithError(back, "パスワードは8文字以上にしてください");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: toEmail(username),
    password,
    email_confirm: true,
    user_metadata: { username, display_name: displayName },
  });
  if (error) {
    const taken = /already|registered|exists|duplicate/i.test(error.message);
    redirectWithError(back, taken ? "そのユーザー名はすでに使われています" : "登録に失敗しました。もう一度お試しください");
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: toEmail(username), password });
  if (signInError) redirectWithError(back, "登録できました。ログインしてください");
  redirect("/");
}
