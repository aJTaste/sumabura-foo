"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirectWithError } from "@/lib/redirect";

// 管理者の裁定（use_a / use_b / void）。管理者でなければ DB 側で拒否される。
export async function resolveMatch(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_match", {
    p_match: String(formData.get("matchId")),
    p_action: String(formData.get("action")),
  });
  if (error) redirectWithError("/admin", error.message);
  revalidatePath("/", "layout");
  redirect("/admin");
}
