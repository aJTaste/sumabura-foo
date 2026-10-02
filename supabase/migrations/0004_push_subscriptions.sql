-- 0004: プッシュ通知（Web Push）— 端末ごとの購読情報
--  ・通知の送り先（endpoint）と、通知を暗号化するための鍵を、端末（ブラウザ）ごとに保存するテーブルを追加します
--  ・このテーブルは、ブラウザからは読み書きできません（誰の分も）。
--    endpoint と鍵を知られると、本人になりすまして通知を送れてしまうためです。
--    読み書きはすべてサーバー（service role）が行います（ログイン中の本人のIDを、サーバーが確かめてから）。
-- 0003 のあとに、SQL Editor に丸ごと貼り付けて実行してください。

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,  -- 通知の宛先（アカウントが消えれば購読も消える）
  -- 端末ごとの送り先URL。同じ端末で別のアカウントに切り替えたときは、この行の持ち主（user_id）だけを付け替える
  endpoint text not null unique check (char_length(endpoint) <= 2048),
  p256dh text not null check (char_length(p256dh) <= 200),   -- 暗号化用の公開鍵
  auth text not null check (char_length(auth) <= 100),       -- 暗号化用の認証シークレット
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

-- RLS を有効にして、ポリシーは1つも作らない + 権限も渡さない
--  → anon / authenticated（ブラウザから）は、読むことも書くこともできない
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
-- サーバー（service role）だけが使う。RLS は service role には効かない。念のため権限も明示しておく
grant select, insert, update, delete on public.push_subscriptions to service_role;
