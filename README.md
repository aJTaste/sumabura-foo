# スマブラ レートランキング

身内向けのスマブラSPレーティングサイト。Next.js (App Router) + Supabase。

## セットアップ

1. Supabase でプロジェクトを作成
2. SQL Editor に `supabase/migrations/0001_init.sql` を丸ごと貼り付けて実行
3. Supabase の Authentication > Sign In / Providers で **「Allow new users to sign up」をオフ**
   （登録は合言葉つきの画面からだけ許可するため。オンのままだと合言葉を回避できます）
4. `.env.local.example` を `.env.local` にコピーして値を入れる
5. `npm install && npm run dev`
6. 自分のアカウントを登録したあと、SQL Editor で管理者にする:
   `update public.profiles set is_admin = true where username = 'あなたのユーザー名';`

Vercel にデプロイするときは、`.env.local` と同じ4つの環境変数を Vercel に設定します。

## 仕組み

- ログイン: ユーザー名 + パスワード（内部で `ユーザー名@smash.example.com` のメールに変換）
- 結果入力: 報告者が入力 → 相手が「承認」で確定（レート反映）／「保留」で管理者へ
- レート: Elo（初期1500、K=32）。計算は DB 関数 `finalize_match` だけが行い、ブラウザからは書き換え不可
- 拒否ステージ: 自分と相手の拒否ステージを合わせたものが、報告フォームで選べなくなる
- ステージ・キャラ一覧: `src/lib/data/` を編集
