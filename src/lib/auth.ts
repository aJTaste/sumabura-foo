import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// React の cache() で、同じリクエストの中では何度呼んでも処理は1回だけ。
// レイアウトとページが同じ値を欲しがっても、Supabase への問い合わせは重複しない。

export const getSupabase = cache(async () => createClient());

/**
 * ログイン中のユーザーID。
 * getClaims() は JWT の署名をサーバー側で検証するだけ（Supabase が非対称の署名キーなら通信なし）。
 * getUser() のように毎回 Auth サーバーへ問い合わせる必要がない。
 */
export const getUserId = cache(async (): Promise<string | null> => {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
});

export type Me = {
  id: string;
  username: string;
  display_name: string;
  is_admin: boolean;
  first_character: string | null;
};

/** ログイン中の自分のプロフィール（レイアウト・各ページで共有） */
export const getMe = cache(async (): Promise<Me | null> => {
  const id = await getUserId();
  if (!id) return null;
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, is_admin, first_character")
    .eq("id", id)
    .maybeSingle();
  return data;
});
