"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { safeBack } from "@/lib/redirect";

// 「確認した」を押したら、次にログインするまでルール画面を出さない。
// ログイン・ログアウト時にこの Cookie は削除されるので、ログインのたびの表示は変わらない。
// 有効期限を付けているのは、アプリ（PWA）を閉じて開き直したときに「ブラウザを閉じた」扱いで
// Cookie が消え、ログイン中なのにルール画面が何度も出るのを防ぐため。
export async function acceptRules(formData: FormData) {
  (await cookies()).set("rules_ok", "1", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 400, // ログイン用 Cookie（Supabase の既定）と同じ400日
    secure: process.env.NODE_ENV === "production",
  });
  redirect(safeBack(formData.get("next"), "/"));
}
