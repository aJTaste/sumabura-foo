import { createClient } from "@supabase/supabase-js";

// サーバー専用（service role。DB の権限設定を飛び越えるので、ブラウザには絶対に渡さない）。
// 使うのは次の場面だけ:
//   - ユーザー登録（招待コード検証後）
//   - プッシュ通知の購読（push_subscriptions）の読み書きと、通知の送信（lib/push.ts・users/push-actions.ts）
//     この表はブラウザからは一切さわれないので、サーバーが本人確認をしたうえでここから読み書きする
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
