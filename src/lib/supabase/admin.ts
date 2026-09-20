import { createClient } from "@supabase/supabase-js";

// サーバー専用。ユーザー登録（招待コード検証後）にだけ使う。
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
