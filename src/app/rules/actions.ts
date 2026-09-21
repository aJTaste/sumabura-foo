"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { safeBack } from "@/lib/redirect";

// 「確認した」を押したら、ブラウザを閉じるまで（次にログインするまで）ルール画面を出さない
export async function acceptRules(formData: FormData) {
  (await cookies()).set("rules_ok", "1", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  redirect(safeBack(formData.get("next"), "/"));
}
